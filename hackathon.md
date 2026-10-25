Create hackathon.md in the root of this repo for the Cal Hacks 13.0 Best Use of Convex prize. Use only evidence from this codebase and its git history. Never include secrets, API keys, env values, emails, or phone numbers.

Start with this header in this order:

# Hackathon log

- **Project:** product name
- **Event:** Cal Hacks 13.0
- **What it does:** one factual sentence
- **Live app:** public URL, or not deployed
- **Repo:** public GitHub URL
- **Frontend:** Codex Sites, Convex static hosting, Vercel, Netlify, Other, or not deployed
- **Convex deployment:** public *.convex.cloud URL, or not deployed
- **Components:** @convex-dev packages registered with app.use in convex/convex.config.ts, or none
- **Convex features:** only what the code shows (schema, indexes, queries, mutations, actions, HTTP actions, crons, scheduled functions, file storage, full text search, vector search, realtime useQuery, paginated queries)
- **Auth:** Convex Auth, WorkOS, Clerk, Other, or none
- **AI models:** model ids found in code, or none
- **Started:** first commit time, UTC ISO 8601
- **Last updated:** latest commit time, UTC ISO 8601

Next add "## How we use Convex" with 3 to 6 bullets. Each bullet names a user facing feature, the Convex feature behind it, and the file that proves it (for example convex/schema.ts). Say which screens update live without a refresh.

Then add "## Log" with one short dated entry per meaningful commit, oldest first, each with the short SHA and the main files touched.

Keep the file under 4,000 characters. Do not claim any feature, component, or deployment you cannot point to in code.

Last, add a 5 line "How we use Convex" section near the top of README.md that links to hackathon.md.
