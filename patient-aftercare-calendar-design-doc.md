# Design Doc: Patient After-Care Support Calendar

> **How to use this doc:** Fill in every field marked `[SPECIFY]`. Anything left as `[TBD]` is a decision the build team still needs to make. When you're ready, upload this file to Claude and ask it to build from the spec. Keep the field names as written so Claude can map them to code.

---

## 1. Project Metadata

| Field | Value |
|---|---|
| Project name | Patient After-Care Support Calendar |
| Event | Cal Hacks |
| Team members | [SPECIFY: names and roles] |
| Build window | [SPECIFY: start and end time] |
| Demo date/time | [October 25th] |
| Target platform | [SPECIFY: web app] |
| Primary language / stack | [Python + FastAPI backend, with a React (Vite) frontend in TypeScript] |
| Repo URL | [https://github.com/sshirsathe/calhacks2026] |

---

## 2. Problem Statement

After discharge, patients often have one or more prescriptions with different dosages, schedules, and durations. Keeping track of which medication to take, how much, when, and for how long is hard, especially when the patient is recovering, managing multiple medications, or has limited support at home. Missed or incorrect doses can lead to readmission or harm.

**Core question the product answers:** "What do I need to take, how much, when, and until when?"

---

## 3. Goals

- **G1:** Accept a prescription document as input and extract medication details accurately.
- **G2:** Convert extracted details into a schedule of time blocks and reminders.
- **G3:** Export the schedule as an `.ics` file that imports into standard phone calendars (iOS, Android, Google Calendar, Outlook).
- **G4:** Make the output readable and trustworthy for a non-clinical user (patient or caregiver).

**Success metric for the hackathon:** [SPECIFY: e.g., "Given 3 sample prescriptions, the app produces a valid .ics file with correct doses and times for all 3 in under 60 seconds."]

---

## 4. Non-Goals (Hackathon Scope)

- Not a medical device. Does not give clinical advice or change doses.
- No real patient data. Use synthetic or sample prescriptions only.
- No provider-side integration (EHR, pharmacy systems).
- [SPECIFY any other exclusions]

---

## 5. Target Users

| User type | Description | Key need |
|---|---|---|
| Patient | Recently discharged, managing their own meds | Simple, clear schedule on their phone |
| Caregiver | Family member helping manage meds | Shareable calendar, clear dosing |
| [SPECIFY] | [SPECIFY] | [SPECIFY] |

---

## 6. User Flow

1. **Upload:** User uploads a prescription (PDF, image, or pasted text). Input types: [SPECIFY].
2. **Review extraction:** App shows extracted fields in an editable table. User confirms or corrects.
3. **Set preferences:** User sets wake time, meal times, reminder lead time, and time zone. Fields: see Section 9.
4. **Generate schedule:** App builds time blocks and reminders.
5. **Preview:** User sees a calendar or list preview.
6. **Download:** User downloads the `.ics` file (and optionally a printable summary).

[SPECIFY any changes or additional steps]

---

## 7. Input Specification

### 7.1 Accepted Input Formats

| Format | Supported in MVP? | Notes |
|---|---|---|
| Text paste | [SPECIFY Y/N] | |
| PDF (text-based) | [SPECIFY Y/N] | |
| PDF (scanned) | [SPECIFY Y/N] | Requires OCR |
| Image (JPG/PNG) | [SPECIFY Y/N] | Requires OCR |
| Discharge summary | [SPECIFY Y/N] | Longer, may contain multiple meds |

### 7.2 Sample Documents

- Sample 1: [SPECIFY: e.g., single antibiotic, 7-day course]
- Sample 2: [SPECIFY: e.g., multi-med list with 3 prescriptions]
- Sample 3: [SPECIFY: e.g., tapering dose, PRN medication]

---

## 8. Extraction Schema

Each medication extracted from the document becomes one record with these fields.

| Field name | Type | Required? | Description | Example |
|---|---|---|---|---|
| `medication_name` | string | Yes | Generic or brand name | `amoxicillin` |
| `strength` | string | Yes | Strength per unit | `500 mg` |
| `dose_amount` | number | Yes | Amount taken per dose | `1` |
| `dose_unit` | string | Yes | Unit of dose | `tablet`, `mL` |
| `route` | enum | Yes | How it is taken | `oral`, `topical`, `injection`, `inhaled` |
| `frequency_text` | string | Yes | Original wording | `twice daily with food` |
| `frequency_per_day` | integer | Yes | Normalized times per day | `2` |
| `scheduled_times` | list of time | No | Fixed times if stated | `["08:00", "20:00"]` |
| `with_food` | enum | No | `with`, `without`, `either`, `unspecified` | `with` |
| `as_needed` | boolean | Yes | Is this PRN? | `false` |
| `prn_reason` | string | No | Only if PRN | `for pain` |
| `start_date` | date | No | Default: discharge date | `2026-10-23` |
| `duration_days` | integer | No | Length of course | `7` |
| `end_date` | date | No | Computed or stated | `2026-10-29` |
| `total_quantity` | number | No | Pills dispensed | `14` |
| `refills_remaining` | integer | No | | `0` |
| `special_instructions` | string | No | e.g., "take on empty stomach" | |
| `prescriber` | string | No | | |
| `warnings` | list of string | No | Stated warnings | |
| `source_snippet` | string | Yes | Exact text from the document this came from | |
| `confidence` | float 0–1 | Yes | Extraction confidence | `0.92` |

[SPECIFY any fields to add or remove]

### 8.1 Extraction Rules

- **Never invent a value.** If a required field is missing, set it to `null` and flag it for review.
- **Keep the source snippet** for every record so the user can verify.
- **Flag low confidence:** Any record with `confidence` below [SPECIFY threshold, e.g., 0.8] is highlighted in the review step.
- **Frequency normalization:** Map common phrases to `frequency_per_day` and suggested times. Example mapping:

| Phrase | frequency_per_day | Default times |
|---|---|---|
| once daily / q24h / every day | 1 | 09:00 |
| twice daily / BID / q12h | 2 | 08:00, 20:00 |
| three times daily / TID / q8h | 3 | 08:00, 14:00, 20:00 |
| four times daily / QID / q6h | 4 | 06:00, 12:00, 18:00, 00:00 |
| every X hours | 24 / X | [SPECIFY] |
| as needed / PRN | — | No scheduled blocks |

[SPECIFY any additional mappings]

---

## 9. Schedule and Preferences

| Preference | Field name | Default | Notes |
|---|---|---|---|
| Wake time | `wake_time` | 07:00 | |
| Bedtime | `bed_time` | 22:00 | |
| Breakfast time | `meal_breakfast` | 08:00 | Used for "with food" |
| Lunch time | `meal_lunch` | 12:30 | |
| Dinner time | `meal_dinner` | 18:30 | |
| Time zone | `timezone` | America/Los_Angeles | |
| Reminder lead time | `reminder_minutes_before` | 10 | [SPECIFY options] |
| Snooze allowed | `snooze_enabled` | [SPECIFY] | |

### 9.1 Scheduling Logic

- Each dose becomes a **time block** of [SPECIFY duration, e.g., 5 minutes] with a title such as `Amoxicillin 500 mg: 1 tablet`.
- If `with_food` is `with`, align the dose to the nearest meal time (within [SPECIFY window, e.g., 30 minutes]).
- If the dose is a fixed time, use the stated time.
- The course runs from `start_date` for `duration_days`. Stop generating events after `end_date`.
- If `duration_days` is missing, mark the medication as **ongoing** and generate events for [SPECIFY, e.g., 14 days] with a note to confirm with the provider.
- PRN medications do not create recurring events. They appear in a separate "as needed" section of the summary.
- **Conflict handling:** If two doses are within [SPECIFY minutes] and must be separated, shift one and note it in the event description.

[SPECIFY additional rules, such as tapering schedules]

---

## 10. ICS Output Specification

- **Format:** iCalendar (RFC 5545), file extension `.ics`, MIME type `text/calendar`.
- **Calendar name (`X-WR-CALNAME`):** [SPECIFY, e.g., "Medication Schedule"].
- **Time zone:** Use `VTIMEZONE` for [SPECIFY timezone] or use UTC with converted times.
- **One `VEVENT` per dose occurrence**, or one `VEVENT` per medication with an `RRULE`. Choose one: [SPECIFY].
- **Each `VEVENT` must include:**
  - `UID`: stable, unique (e.g., `{medication_id}-{date}-{time}@aftercare-calendar`)
  - `DTSTART` / `DTEND`
  - `SUMMARY`: medication name, dose, and route (e.g., `Amoxicillin 500 mg, 1 tablet (oral)`)
  - `DESCRIPTION`: instructions, with food guidance, source-snippet reference, and "not medical advice" note
  - `VALARM`: reminder set to `reminder_minutes_before` before start
  - `CATEGORIES`: `MEDICATION`
- **Recurrence:** `RRULE` with `FREQ=DAILY` and `COUNT` or `UNTIL` matching the course length.
- **Discontinuation:** A `VEVENT` for the final dose day can be marked with `STATUS:CONFIRMED`. [SPECIFY]
- **Validation:** Output must pass an RFC 5545 validator. [SPECIFY tool, e.g., icalendar Python package or online validator]

### 10.1 Example `VEVENT`

```
BEGIN:VEVENT
UID:amox-20261023-0800@aftercare-calendar
DTSTART;TZID=America/Los_Angeles:20261023T080000
DTEND;TZID=America/Los_Angeles:20261023T080500
RRULE:FREQ=DAILY;COUNT=7
SUMMARY:Amoxicillin 500 mg, 1 tablet (oral)
DESCRIPTION:Take with food. Finish the full course.\nSource: "amoxicillin 500 mg PO BID x 7 days"\nNot medical advice. Confirm with your provider or pharmacist.
CATEGORIES:MEDICATION
BEGIN:VALARM
TRIGGER:-PT10M
ACTION:DISPLAY
DESCRIPTION:Time for amoxicillin
END:VALARM
END:VEVENT
```

---

## 11. Architecture

```
[Upload] → [Text extraction (PDF/OCR)] → [LLM extraction into schema]
        → [Validation + confidence flags] → [Review UI]
        → [Schedule generator] → [ICS builder] → [Download]
```

| Component | Responsibility | Tech choice |
|---|---|---|
| Frontend | Upload, review, preferences, download | [SPECIFY] |
| Backend API | Orchestration, extraction, ICS generation | [SPECIFY] |
| Text extraction | PDF text, OCR for scans | [SPECIFY: e.g., pypdf, Tesseract, cloud OCR] |
| Extraction model | Structured extraction into Section 8 schema | [SPECIFY: e.g., Claude API with JSON output] |
| ICS builder | Generates `.ics` | [SPECIFY: e.g., `ics` package, hand-built string] |
| Storage | Temporary session storage | [SPECIFY] |

### 11.1 Extraction Prompt Requirements

- Return JSON matching the Section 8 schema exactly.
- Do not infer missing values. Return `null`.
- Quote the `source_snippet` verbatim.
- Output one object per medication.

---

## 12. Privacy and Safety

- **Data:** Prescription data is sensitive. For the hackathon, use synthetic data only. [SPECIFY storage policy: e.g., no persistence beyond session.]
- **Compliance:** This is a prototype and not HIPAA-compliant. State this on the product's landing screen.
- **Disclaimer (show on every output):** "This calendar is generated from your prescription document and is for reminder purposes only. It is not medical advice. Always follow your provider's and pharmacist's instructions."
- **Escalation:** If the document contains a dose outside [SPECIFY typical range] or conflicting instructions, display a warning and do not generate events until the user confirms.
- **Emergency language:** Do not generate content that suggests stopping or changing medication without a provider.

---

## 13. Edge Cases

| Case | Expected behavior |
|---|---|
| Illegible or partial document | Extract what's readable, flag missing fields |
| Multiple medications at the same time | Create separate events, group under one day view |
| PRN medication | Excluded from recurring events, listed separately |
| No duration stated | Mark ongoing, confirm with provider |
| Dose change mid-course | [SPECIFY: create two segments or flag] |
| Non-English document | [SPECIFY: out of scope or supported] |
| Duplicate medications | Flag for review |
| Document is not a prescription | Reject with message |

---

## 14. Acceptance Criteria

- [ ] Uploading each sample document returns extracted records matching the Section 8 schema.
- [ ] Every extracted record includes a `source_snippet` and `confidence`.
- [ ] Low-confidence and missing-required-field records are flagged in the review UI.
- [ ] Generated `.ics` file imports without errors into [SPECIFY: Apple Calendar / Google Calendar].
- [ ] Reminders fire at the configured lead time.
- [ ] Disclaimer appears on the preview and download screens.
- [ ] PRN medications do not create recurring events.
- [ ] End-to-end run completes in under [SPECIFY] seconds for a 3-medication document.

---

## 15. Demo Plan

1. Show the problem: a sample discharge document with three medications.
2. Upload it and show the extraction review, including a flagged low-confidence item.
3. Set preferences and generate the schedule.
4. Download the `.ics` and import it live into a phone calendar.
5. Show a reminder firing.

**Demo owner:** [SPECIFY]
**Backup plan if live extraction fails:** [SPECIFY: pre-recorded run or cached output]

---

## 16. Milestones (Hackathon Timeline)

| Time block | Milestone | Owner |
|---|---|---|
| Hour 0–2 | Finalize spec, set up repo, sample documents | [SPECIFY] |
| Hour 2–6 | Extraction pipeline working on sample docs | [SPECIFY] |
| Hour 6–10 | Review UI and schedule generation | [SPECIFY] |
| Hour 10–14 | ICS builder and validation | [SPECIFY] |
| Hour 14–18 | Polish, disclaimers, edge cases | [SPECIFY] |
| Final hour | Demo rehearsal | [SPECIFY] |

---

## 17. Open Questions

1. [SPECIFY]
2. [SPECIFY]
3. [SPECIFY]

---

## 18. Changelog

| Date | Change | Author |
|---|---|---|
| 2026-10-23 | Initial draft | [SPECIFY] |
