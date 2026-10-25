// Mirror a plan into the patient's Google Tasks, then watch it: when the patient checks a task off
// (in Google Tasks or Google Calendar), the matching dose becomes "taken" and the family view updates.
import { v } from "convex/values";
import { action, ActionCtx, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

const GOOGLE_CLIENT_ID = "504394908885-5k0n1rkge6o2dm23rc82b7t967rbghot.apps.googleusercontent.com";
const TASKS_API = "https://tasks.googleapis.com/tasks/v1";

type TokenResponse = { access_token: string; expires_in: number; refresh_token?: string };
type GoogleTask = { id: string; status: "needsAction" | "completed"; completed?: string };

// Exchange an auth code or refresh token. The client secret lives only in Convex env vars.
async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET is not set (npx convex env set GOOGLE_CLIENT_SECRET ...)");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, client_secret: secret, ...params }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Google sign-in failed: ${json.error ?? res.status}`);
  return json;
}

async function tasksApi(accessToken: string, path: string, body?: unknown) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(TASKS_API + path, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    throw new Error(`Google Tasks error ${res.status}`);
  }
}

function fmtTime(hhmm: string) {
  const [h, mi] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(mi).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// ---------- Internal data access (actions can't touch the database directly) ----------
export const planByToken = internalQuery({
  args: { token: v.string() },
  handler: (ctx, { token }) => ctx.db.query("plans").withIndex("by_token", (q) => q.eq("token", token)).unique(),
});

export const planByCareToken = internalQuery({
  args: { careToken: v.string() },
  handler: (ctx, { careToken }) => ctx.db.query("plans").withIndex("by_care_token", (q) => q.eq("careToken", careToken)).unique(),
});

export const dosesForPlan = internalQuery({
  args: { planId: v.id("plans") },
  handler: (ctx, { planId }) => ctx.db.query("doses").withIndex("by_plan_due", (q) => q.eq("planId", planId)).collect(),
});

// Plans linked to Google whose last dose was less than a day ago
export const plansToSync = internalQuery({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return (await ctx.db.query("plans").collect()).filter((p) => p.google && (p.endAt ?? 0) > cutoff);
  },
});

export const saveGoogle = internalMutation({
  args: {
    planId: v.id("plans"),
    google: v.object({
      listId: v.string(),
      refreshToken: v.optional(v.string()),
      accessToken: v.string(),
      accessExpiresAt: v.number(),
      lastSyncAt: v.optional(v.number()),
    }),
  },
  handler: (ctx, { planId, google }) => ctx.db.patch(planId, { google }),
});

export const setTaskId = internalMutation({
  args: { doseId: v.id("doses"), taskId: v.string() },
  handler: (ctx, { doseId, taskId }) => ctx.db.patch(doseId, { googleTaskId: taskId }),
});

// Apply what Google says: completed tasks -> taken (at the time they were checked off), unchecked -> pending
export const applyTaskStatuses = internalMutation({
  args: {
    planId: v.id("plans"),
    syncedAt: v.number(),
    tasks: v.array(v.object({ id: v.string(), completedAt: v.union(v.number(), v.null()) })),
  },
  handler: async (ctx, { planId, syncedAt, tasks }) => {
    const plan = await ctx.db.get(planId);
    if (!plan?.google) return;
    const doses = await ctx.db.query("doses").withIndex("by_plan_due", (q) => q.eq("planId", planId)).collect();
    const byTask = new Map(doses.filter((d) => d.googleTaskId).map((d) => [d.googleTaskId!, d]));
    for (const t of tasks) {
      const d = byTask.get(t.id);
      if (!d) continue;
      if (t.completedAt !== null && (d.status !== "taken" || d.takenAt !== t.completedAt)) {
        await ctx.db.patch(d._id, { status: "taken", takenAt: t.completedAt });
      } else if (t.completedAt === null && d.status === "taken") {
        await ctx.db.patch(d._id, { status: d.dueAt < Date.now() - 60 * 60 * 1000 ? "missed" : "pending", takenAt: undefined });
      }
    }
    await ctx.db.patch(planId, { google: { ...plan.google, lastSyncAt: syncedAt } });
  },
});

// ---------- Google access ----------
async function accessTokenFor(ctx: ActionCtx, plan: Doc<"plans">) {
  const g = plan.google!;
  if (g.accessExpiresAt > Date.now() + 60_000) return g.accessToken;
  if (!g.refreshToken) throw new Error("Google access expired and there is no refresh token; add the plan to the calendar again");
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: g.refreshToken });
  await ctx.runMutation(internal.google.saveGoogle, {
    planId: plan._id,
    google: { ...g, accessToken: t.access_token, accessExpiresAt: Date.now() + t.expires_in * 1000 },
  });
  return t.access_token;
}

async function syncPlan(ctx: ActionCtx, plan: Doc<"plans">) {
  const g = plan.google;
  if (!g) return;
  const accessToken = await accessTokenFor(ctx, plan);
  const syncedAt = Date.now();
  const tasks: GoogleTask[] = [];
  let pageToken: string | undefined;
  do {
    const q = new URLSearchParams({ showCompleted: "true", showHidden: "true", maxResults: "100" });
    // Only tasks changed since the last sync (with a margin for clock differences)
    if (g.lastSyncAt) q.set("updatedMin", new Date(g.lastSyncAt - 5 * 60_000).toISOString());
    if (pageToken) q.set("pageToken", pageToken);
    const page = await tasksApi(accessToken, `/lists/${g.listId}/tasks?${q}`);
    tasks.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  await ctx.runMutation(internal.google.applyTaskStatuses, {
    planId: plan._id,
    syncedAt,
    tasks: tasks.map((t) => ({ id: t.id, completedAt: t.status === "completed" && t.completed ? Date.parse(t.completed) : null })),
  });
}

// ---------- Public entry points ----------
// The patient signed in: exchange the code, create a "Medicines" list and one task per dose.
export const addToCalendar = action({
  args: { token: v.string(), code: v.string() },
  handler: async (ctx, { token, code }) => {
    const plan = await ctx.runQuery(internal.google.planByToken, { token });
    if (!plan) throw new Error("Plan not found");
    // "postmessage" is the redirect URI Google uses for the pop-up code flow
    const t = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: "postmessage" });
    const start = new Date(plan.startDate + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    const list = await tasksApi(t.access_token, "/users/@me/lists", { title: `Medicines (from ${start})` });
    await ctx.runMutation(internal.google.saveGoogle, {
      planId: plan._id,
      google: { listId: list.id, refreshToken: t.refresh_token, accessToken: t.access_token, accessExpiresAt: Date.now() + t.expires_in * 1000 },
    });
    const doses = await ctx.runQuery(internal.google.dosesForPlan, { planId: plan._id });
    // New tasks go to the top of the list, so add the latest first to keep the list in time order
    for (const d of [...doses].reverse()) {
      const task = await tasksApi(t.access_token, `/lists/${list.id}/tasks`, {
        title: `${fmtTime(d.hhmm)} · ${d.name} ${d.dose}${d.withFood ? " (with food)" : ""}`,
        notes: d.note,
        due: `${d.date}T00:00:00.000Z`,
      });
      await ctx.runMutation(internal.google.setTaskId, { doseId: d._id, taskId: task.id });
    }
    return { listTitle: list.title as string, count: doses.length };
  },
});

// "Check now" on the family view
export const syncNow = action({
  args: { careToken: v.string() },
  handler: async (ctx, { careToken }) => {
    const plan = await ctx.runQuery(internal.google.planByCareToken, { careToken });
    if (!plan?.google) return;
    if (plan.google.lastSyncAt && plan.google.lastSyncAt > Date.now() - 3000) return; // avoid hammering Google
    await syncPlan(ctx, plan);
  },
});

// Cron: check every linked plan for newly checked-off tasks
export const syncAll = internalAction({
  args: {},
  handler: async (ctx) => {
    const plans = await ctx.runQuery(internal.google.plansToSync, {});
    for (const plan of plans) {
      try {
        await syncPlan(ctx, plan);
      } catch (err) {
        console.error(`Sync failed for plan ${plan._id}:`, err);
      }
    }
  },
});
