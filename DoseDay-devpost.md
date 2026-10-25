## Inspiration
Leaving the hospital is supposed to be the good part. But it's also when patients are suddenly on their own, managing new medicines on a page full of shorthand like `BID`, `q6h`, and `PRN`, often while tired, in pain, or recovering from surgery.

The numbers show how often this goes wrong:
- **About 1 in 5 patients** has an adverse event within weeks of leaving the hospital, and **two-thirds of those events involve medications** (Forster et al., *Annals of Internal Medicine*, 2003).
- **78% of ER patients didn't understand at least one part of their discharge instructions**, such as how to care for themselves at home or which warning signs mean they should come back (Engel et al., *Annals of Emergency Medicine*, 2009). Many didn't realize they had misunderstood.
- Not taking medicine as prescribed is estimated to be linked to **about 125,000 deaths a year** and **$100–289 billion** in U.S. health care costs.

Discharge papers are written for clinicians. We wanted to turn them into something a patient, and the family helping them, can actually follow: **what to take, how much, when, and until when.**

## What it does
**DoseDay** turns a photo of a discharge paper into medicine reminders on your phone, and lets your family see that you're on track.

1. **Add your discharge paper.** Take a photo or paste the text. The photo is read right in the browser, so it never leaves your device.
2. **Check each medicine, one at a time.** For each medicine, we show the dose, how often, and for how long, next to a crop of *that exact line from your own photo*, and ask: **"Does this match your paper?"** You can confirm it, fix it, or leave it off.
3. **Answer a few simple questions,** such as when you wake up, eat, and go to bed. We only ask about the times your medicines actually need, so there's no settings page.
4. **Add it to your calendar in one tap.** DoseDay creates one checkable reminder per dose in Google Tasks, which also shows up in Google Calendar. For Apple Calendar or Outlook, you can subscribe to a calendar link or download a calendar file.
5. **Share with family.** A caregiver gets a read-only family link. When the patient checks off a dose, it appears on the family page within seconds ("✓ Taken at 8:04 AM"). Any dose more than an hour late is flagged as **missed**, so family knows when to check in.

## Designed for safety
In health care, a confident wrong answer is worse than no answer. So DoseDay is built to **show its work and refuse to guess**:
- **Nothing is scheduled until the patient confirms it.** Every medicine is checked against the original line from the photo.
- **We flag uncertainty instead of hiding it.** Each medicine gets a confidence score. Lines that were hard to read, missing a frequency, or missing a duration are called out in plain language.
- **Some medicines stay off the calendar on purpose:**
  - **As-needed medicines** (like Tylenol "as needed for pain") don't get recurring reminders, because you only take them when you need them.
  - **Tapering doses** (like a steroid that drops from 30 mg to 20 mg to 10 mg) aren't scheduled. We tell the patient to ask their pharmacist for a day-by-day plan rather than risk getting it wrong.
  - **Medicines with no end date** are scheduled for a period the patient chooses, with a note to ask their pharmacist how long to keep going.
- **It's reminders, not medical advice.** It never changes a dose, and every screen says to follow your doctor's and pharmacist's instructions.

## Example: one discharge paper, start to finish
Our sample discharge sheet (synthetic data) lists five medicines, which is typical for an older patient going home:

| On the paper | What DoseDay does |
|---|---|
| Amoxicillin 500 mg PO BID with food x 10 days | Twice a day, at breakfast and dinner, for 10 days: **20 reminders** |
| Metformin 500 mg PO daily with dinner | Once a day at dinner. No end date, so it's flagged to confirm with the pharmacist |
| Lisinopril 10 mg PO once daily | Once a day at breakfast. No end date, so it's flagged too |
| Acetaminophen 325 mg PO every 6 hours as needed for pain | Listed separately as **as needed**, with no recurring reminders |
| Prednisone taper: 30 mg, then 20 mg, then 10 mg | **Not scheduled.** The patient is told to get a day-by-day plan from their pharmacist |

Because the patient's meal times decide the reminder times, metformin and the evening amoxicillin dose land together at dinner. That means one reminder moment, not two.

## How we built it
- **Frontend:** a single-page web app in HTML, CSS, and vanilla JavaScript, designed for older users from the start: large text, high contrast, big buttons, and only one question or medicine on the screen at a time.
- **Reading the photo:** [Tesseract.js](https://tesseract.projectnaptha.com/) runs OCR in the browser, so the image never leaves the device. We keep each line's bounding box so the review screen can show the exact part of the photo each medicine came from, and we warn the user when a line was hard to read.
- **Understanding the prescription:** a rule-based parser turns pharmacy shorthand into a schedule. For example, `BID` becomes twice a day, `q8h` becomes every 8 hours, `qHS` becomes bedtime, and `x 10 days` becomes an end date. Each medicine gets a confidence score, and anything ambiguous is flagged for the user to check. We chose rules for the prototype because they are predictable and easy to test.
- **Backend ([Convex](https://convex.dev)):**
  - **Saved plans:** one database row per dose per day, each with a status: *pending*, *taken*, or *missed*.
  - **Google Tasks sync:** Convex signs in to Google on the patient's behalf and creates the tasks. Because Google Tasks can't notify us when something changes, Convex checks every 20 seconds for doses that were checked off.
  - **Live family view:** the family page uses a Convex live query, so it updates the moment a dose is marked taken, with no refreshing.
  - **Scheduled jobs:** a job runs every 5 minutes and marks doses more than an hour overdue as missed. If the dose is checked off later, it switches back to taken.
  - **Calendar feed:** an HTTP endpoint serves a subscribable `.ics` calendar where taken doses get a ✓ and reminders stay only on doses not yet taken.
  - **Security:** the Google client secret and access tokens stay on the server and are never sent to the browser. Plans are reached only through random 128-bit links, and the family link is read-only.
- **Calendar format:** the downloadable file follows the iCalendar standard (RFC 5545), with daily recurring events, reminder alarms, stable IDs so updates don't create duplicates, and times converted from the patient's time zone, including daylight saving time. That way Google, Apple, and Outlook all read it the same way. For a full course, the number of reminders is `N = Σ (d_m × n_m)`, where `d_m` is doses per day and `n_m` is the number of days for medicine `m`. In the example above, amoxicillin alone is 2 × 10 = 20 reminders.

## Impact
**Who it helps**
- **Patients**, especially older adults and anyone juggling several new medicines, get a plan in plain language, in an app they already use.
- **Caregivers**, often an adult child who lives somewhere else, can see whether doses are being taken without calling to check every day.
- **Care teams** could hand patients a paper that turns into reminders automatically, with no new system to install.

**Why our approach matters**
- **It starts from the paper patients already have.** Most pill reminder apps make you type in every medicine yourself, which is the hard part when you're exhausted and the paper is full of shorthand.
- **It meets people where they are.** Reminders go into Google Calendar, Apple Calendar, or Outlook, so there's no new app to learn.
- **It closes the loop.** A reminder alone doesn't tell anyone whether the dose was taken. The family view and missed-dose flags turn a missed dose into a phone call from family on the same day.

**How we'd measure it**
DoseDay already records whether each dose was taken, taken late, or missed. In a real pilot, we would look at:
- the share of doses taken on time in the first 30 days after discharge,
- how often patients correct the parsed medicines, as a measure of accuracy,
- and, over time, return visits and readmissions related to medications.

## Challenges we ran into
**Making the calendar update itself.** At first we produced a static `.ics` file, so the patient would have to re-download it every time something changed. That wasn't practical for a schedule that changes as doses get taken. We tried hosting a calendar link through a static site on Render, but without a real backend we couldn't serve a file that updates. Moving to Convex solved this: it stores the plan, serves a live calendar feed, syncs with Google Tasks every 20 seconds, flags missed doses, and pushes each change to the family page instantly.

**Google Tasks limits.** Google Tasks only stores a due date, not a time, and its API can't create repeating tasks. We worked around this by creating one task per dose and putting the time in each task's title (for example, "8:00 AM · Amoxicillin 500 mg").

**Deciding what *not* to schedule.** Tapering doses and as-needed medicines don't fit neatly into a daily calendar. Instead of guessing, we chose to explain clearly why they're left off and who to ask.

### Exploring a voice check-in with Cartesia
We wanted patients to be able to *talk* to the app: a short spoken check-in asking, "Did you take your 8 AM amoxicillin? Has anything felt off since you got home?" Their answers would become a summary for their doctor. We planned to use Cartesia's Sonic model for the voice and Ink for speech-to-text.

We didn't end up building it, for two reasons:
- **Our app had nowhere safe to keep API keys.** At the time, it was a single static web page, so any key in it would be public. Adding voice meant first standing up a backend just to hold the keys, which was a bigger change than we had planned for.
- **Access took longer than expected.** We couldn't get sponsor credits in time, and a university account policy blocked one of us from creating the account the voice conversation would need.

Now that we have a Convex backend that keeps secrets on the server, the first problem is solved, and voice check-ins are high on our list.

## Accomplishments that we're proud of
- **A full loop from paper to phone to family:** a photo of a discharge paper becomes checkable reminders in Google Calendar, and a caregiver sees each dose marked taken within seconds.
- **A review step patients can trust.** Showing the exact line from their own photo next to each medicine makes it easy to catch mistakes.
- **Honest handling of the hard cases.** Tapering, as-needed, and open-ended medicines are flagged with clear explanations instead of guesses.
- **Accessible from the start:** large text, one decision per screen, and plain words instead of medical shorthand.
- **Privacy by design:** the photo never leaves the device, and the Google secrets never reach the browser.

## What we learned
- **Healthcare safety is about the human in the loop.** The most important feature isn't the parsing. It's making it easy for a patient to check the parsing.
- **Saying "we don't know" is a feature.** Flagging uncertainty builds more trust than a confident guess.
- **Real-world APIs have real-world limits.** Working around Google Tasks taught us to design around the tools people already use, instead of asking them to switch.
- **Fewer questions is better design.** Asking only for the times a patient's medicines need made the app faster and less intimidating.

## What's next for DoseDay
- **Smarter extraction:** use a large language model that returns structured data, so DoseDay can read messier, longer, or handwritten discharge papers, while keeping the patient's review step.
- **Tapering schedules:** generate day-by-day plans for doses that change over time, with a pharmacist confirmation step.
- **Voice check-ins:** the Cartesia check-in described above, with a summary the patient can share with their doctor.
- **Text and push reminders,** plus alerts to family when a dose is missed.
- **Refill reminders** based on the quantity dispensed.
- **A real mobile app** and support for more languages.
- **A pilot with a clinic or discharge nurses** to measure on-time doses in the first 30 days at home.

## Built with
HTML · CSS · JavaScript · Tesseract.js · Convex · TypeScript · Google Tasks API · Google OAuth · iCalendar (RFC 5545) · GitHub Pages
