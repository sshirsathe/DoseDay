# calhacks2026
Project repo (Shruti, Diane, Marin, Sasha)

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
