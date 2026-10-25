import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
function fold(line: string) {
  let out = line.slice(0, 75);
  for (let i = 75; i < line.length; i += 74) out += "\r\n " + line.slice(i, i + 74);
  return out;
}

// Subscribable calendar feed: GET /feeds/<token>.ics
// One event per dose; taken doses get a check mark so the calendar reflects progress on refresh.
http.route({
  pathPrefix: "/feeds/",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const token = new URL(req.url).pathname.replace(/^\/feeds\//, "").replace(/\.ics$/, "");
    const data = await ctx.runQuery(api.plans.feedData, { token });
    if (!data) return new Response("Not found", { status: 404 });
    const now = stamp(Date.now());
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AfterCare Prototype//Medication Schedule//EN", "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH", "X-WR-CALNAME:Medication Schedule", "X-PUBLISHED-TTL:PT1H", "REFRESH-INTERVAL;VALUE=DURATION:PT1H"];
    for (const d of data.doses) {
      const mark = d.status === "taken" ? "✓ " : "";
      lines.push("BEGIN:VEVENT", `UID:${d._id}@aftercare-calendar`, `DTSTAMP:${now}`, `DTSTART:${stamp(d.dueAt)}`, `DTEND:${stamp(d.dueAt + 5 * 60000)}`,
        `SUMMARY:${icsEscape(`${mark}Take ${d.name} ${d.dose}`)}`, `DESCRIPTION:${icsEscape(d.note)}`, "CATEGORIES:MEDICATION");
      if (d.status === "pending") lines.push("BEGIN:VALARM", `TRIGGER:-PT${data.leadMinutes}M`, "ACTION:DISPLAY", `DESCRIPTION:${icsEscape("Time for " + d.name)}`, "END:VALARM");
      lines.push("END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    return new Response(lines.map(fold).join("\r\n") + "\r\n", {
      headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-cache" },
    });
  }),
});

export default http;
