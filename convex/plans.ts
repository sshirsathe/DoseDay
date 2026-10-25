import { v } from "convex/values";
import { internalMutation, mutation, query, QueryCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

const MAX_DOSES = 2000;

// Save a plan from the browser. Tokens are 128-bit random hex strings made client-side.
export const create = mutation({
  args: {
    token: v.string(),
    careToken: v.string(),
    startDate: v.string(),
    tz: v.string(),
    leadMinutes: v.number(),
    notScheduled: v.array(v.object({ name: v.string(), reason: v.string() })),
    doses: v.array(
      v.object({
        date: v.string(),
        hhmm: v.string(),
        slot: v.string(),
        name: v.string(),
        dose: v.string(),
        withFood: v.boolean(),
        note: v.string(),
        dueAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { doses, ...plan }) => {
    if (!/^[0-9a-f]{32}$/.test(plan.token) || !/^[0-9a-f]{32}$/.test(plan.careToken)) throw new Error("Bad token");
    if (!doses.length || doses.length > MAX_DOSES) throw new Error("Bad number of doses");
    const planId = await ctx.db.insert("plans", { ...plan, endAt: Math.max(...doses.map((d) => d.dueAt)) });
    for (const d of doses) await ctx.db.insert("doses", { ...d, planId, status: "pending" });
    return planId;
  },
});

async function planWithDoses(ctx: QueryCtx, plan: Doc<"plans"> | null) {
  if (!plan) return null;
  const doses = await ctx.db
    .query("doses")
    .withIndex("by_plan_due", (q) => q.eq("planId", plan._id))
    .collect();
  return {
    startDate: plan.startDate,
    tz: plan.tz,
    notScheduled: plan.notScheduled,
    lastSyncAt: plan.google?.lastSyncAt ?? null,
    doses: doses.map(({ googleTaskId, ...d }) => ({ ...d, inCalendar: !!googleTaskId })),
  };
}

// Live, read-only query for the caregiver page
export const forCaregiver = query({
  args: { careToken: v.string() },
  handler: async (ctx, { careToken }) =>
    planWithDoses(ctx, await ctx.db.query("plans").withIndex("by_care_token", (q) => q.eq("careToken", careToken)).unique()),
});

// Live progress while the patient's tasks are being created
export const calendarProgress = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const plan = await ctx.db.query("plans").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (!plan) return null;
    const doses = await ctx.db.query("doses").withIndex("by_plan_due", (q) => q.eq("planId", plan._id)).collect();
    return { added: doses.filter((d) => d.googleTaskId).length, total: doses.length };
  },
});

// Run by the cron: doses more than an hour overdue and not checked off become "missed".
// A missed dose still turns "taken" if it is checked off later.
export const markMissed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const overdue = await ctx.db
      .query("doses")
      .withIndex("by_status_due", (q) => q.eq("status", "pending").lt("dueAt", Date.now() - 60 * 60 * 1000))
      .take(500);
    for (const d of overdue) await ctx.db.patch(d._id, { status: "missed" });
  },
});

// Used by the calendar feed HTTP endpoint
export const feedData = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const plan = await ctx.db.query("plans").withIndex("by_token", (q) => q.eq("token", token)).unique();
    const data = await planWithDoses(ctx, plan);
    return data && plan ? { ...data, leadMinutes: plan.leadMinutes } : null;
  },
});
