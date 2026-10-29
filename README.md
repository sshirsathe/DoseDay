# DoseDay
Contributors:
Shruti Shirsathe
Diane Nguyen
Marin Perez
Sasha Batoukova

## Demo
- Open `index.html`. On step 1, upload a photo of a discharge sheet or click **Use sample photo**.
- The sample photo (synthetic data) lives at `samples/sample-discharge-photo.jpg`. **Use sample photo** loads it automatically when the page is served over http (e.g. GitHub Pages or `python -m http.server`). If you open the file straight from disk, click **Upload photo** and pick that file instead.
- Photos are read in the browser with Tesseract.js (loaded from a CDN, so you need internet access). The text it finds goes into the text box so you can fix mistakes before extracting.

## Google Tasks setup (for the "Add all to Google Tasks" button)
The button signs the user in with Google and adds one checkable task per dose per day to a new "Medicines" list. It needs a Google OAuth client ID:
1. Go to https://console.cloud.google.com and create a project.
2. **APIs & Services → Library**: enable the **Google Tasks API**.
3. **Google Auth Platform** (OAuth consent screen): set it up as **External**, add an app name and support email. Under **Audience**, add the Google accounts you'll demo with as **test users**. Only those accounts can sign in while the app is in testing mode.
4. **Credentials → Create credentials → OAuth client ID → Web application**. Under **Authorized JavaScript origins**, add `http://localhost:8000` and your GitHub Pages origin (e.g. `https://sshirsathe.github.io`).
5. Copy the client ID into `GOOGLE_CLIENT_ID` near the bottom of `index.html`. The ID isn't a secret, so it's fine to commit.

Google Tasks only stores a due date (no time) and the API can't create repeating tasks, so the time is part of each task's title (e.g. "8:00 AM · Amoxicillin 500 mg").

## Convex backend (Google Tasks sync, live family view, calendar feed)
**Add to my calendar** saves the plan to Convex, and Convex creates one task per dose in the patient's Google Tasks (they show up in Google Calendar too). When the patient checks a task off, Convex notices within about 20 seconds and the family link (`?c=…`) updates live: "✓ Taken at 8:04 AM".

Code lives in `convex/`:
- `schema.ts`: `plans` (patient token, read-only caregiver token, Google list + access) and `doses` (one row per dose per day, status pending/taken/missed, matching Google task id).
- `google.ts`: `addToCalendar` swaps the sign-in code for Google access and creates the tasks; `syncAll` (cron) and `syncNow` (the family page's **Check now**) read checked-off tasks back.
- `plans.ts`: `create` saves a plan; `forCaregiver` is the live query behind the family page; `markMissed` flags doses over an hour late.
- `crons.ts`: Google sync every 20 seconds, missed-dose check every 5 minutes.
- `http.ts`: subscribable calendar at `https://<deployment>.convex.site/feeds/<token>.ics`. Taken doses show a ✓.

Setup:
1. `npm install` (Convex is pinned to 1.31.0 because newer CLIs need Node 20.12+).
2. `npx convex dev`: log in, pick the project, and leave it running. It pushes the functions and writes `CONVEX_URL` to `.env.local`. Copy that URL into `CONVEX_URL` in `index.html` (it's public, so it's fine to commit).
3. Give the backend the Google client secret (from Google Cloud → Clients → your web client). It stays on the server, never in the page or repo:
   `npx convex env set GOOGLE_CLIENT_SECRET "..."`

While the Google app is in testing mode, Google access granted this way expires after 7 days. For the family link to open on another device, the page has to be hosted (e.g. GitHub Pages), not on localhost.
