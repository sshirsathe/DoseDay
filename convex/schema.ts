import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // One saved medicine plan. The patient token is private to the patient's browser (and the
  // calendar feed); the care token is a read-only link for family members.
  plans: defineTable({
    token: v.string(),
    careToken: v.string(),
    startDate: v.string(), // YYYY-MM-DD
    tz: v.string(),
    leadMinutes: v.number(),
    notScheduled: v.array(v.object({ name: v.string(), reason: v.string() })),
    endAt: v.optional(v.number()), // due time of the last dose; syncing stops a day after
    // The patient's Google Tasks list that mirrors this plan. Never returned to the browser.
    google: v.optional(
      v.object({
        listId: v.string(),
        refreshToken: v.optional(v.string()),
        accessToken: v.string(),
        accessExpiresAt: v.number(),
        lastSyncAt: v.optional(v.number()),
      }),
    ),
  })
    .index("by_token", ["token"])
    .index("by_care_token", ["careToken"]),

  // One row per dose per day
  doses: defineTable({
    planId: v.id("plans"),
    date: v.string(), // YYYY-MM-DD in the patient's time zone
    hhmm: v.string(), // local time, e.g. "08:00"
    slot: v.string(), // bfast, dinner, ...
    name: v.string(),
    dose: v.string(),
    withFood: v.boolean(),
    note: v.string(),
    dueAt: v.number(), // ms since epoch (UTC)
    status: v.union(v.literal("pending"), v.literal("taken"), v.literal("missed")),
    takenAt: v.optional(v.number()),
    googleTaskId: v.optional(v.string()), // the matching task in the patient's Google Tasks
  })
    .index("by_plan_due", ["planId", "dueAt"])
    .index("by_status_due", ["status", "dueAt"]),
});
