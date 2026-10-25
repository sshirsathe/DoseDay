import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("mark missed doses", { minutes: 5 }, internal.plans.markMissed, {});
// Google Tasks can't notify us, so check linked plans for checked-off tasks
crons.interval("sync google tasks", { seconds: 20 }, internal.google.syncAll, {});

export default crons;
