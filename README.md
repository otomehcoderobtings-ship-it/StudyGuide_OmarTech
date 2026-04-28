# OmarTech Learn

A **GitHub Pages-ready**, Duolingo-style study app that turns uploaded files into a small course with **a fixed number of lessons**.

## What changed in this version

This version was rebuilt to match your latest requests:

- **Less laggy UI** (lighter layout, less visual overhead)
- **Hearts removed** completely
- **Icon + color style updated** to match the uploaded OmarTech artwork
- **Begin flow added**:
  1. upload material
  2. clean it
  3. press **Begin**
  4. see the **amount of lessons**
  5. start lessons one by one
- **Lesson flow updated**:
  - first the app **teaches**
  - then you press **Got it**
  - then you answer the quiz
- **Login / Sign up** added
- **Logout in Settings** added
- **Cleaner improved** to throw away:
  - name / student name
  - title / titel
  - author / teacher / class / course / date
  - page / slide numbers
  - headers / footers
  - file name junk like `.pdf`, `.docx`, `.pptx`
  - short title-page / cover-page junk

## Upgrade applied in this build


### Extra upgrade added in this pass

- Drag-and-drop upload zone for PDFs, DOCX, PPTX, TXT, and Markdown files.
- Full JSON backup export and restore import for a whole workspace.
- New dashboard stats: accuracy, due review count, and total study time.
- File removal controls that also clean related blocks, lessons, progress, and review items.
- Study-block controls: duplicate, move up/down, delete, split, retitle, keep/ignore.
- Lesson bookmarks and a Bookmarked course filter.
- Optional unlocked lesson mode and configurable lesson cap in Settings.
- Due-now review filter, mastered-review cleanup, review miss counters, and due labels.
- Lesson attempt history with per-lesson accuracy chips.
- Timed attempts and total study-time tracking.
- Keyboard shortcuts during quizzes: 1–4, T/F, Enter, and Esc.
- Cleaner improvements for repeated headers, page numbers, email-like cover-page junk, OCR hyphenation, soft hyphens, and common file artifacts.
- Safer DOCX parser guard and oversized import protection.
- Installable PWA metadata and service-worker caching for repeat visits.

### New upgrade added in this pass

- Theme preferences in Settings: Dark, Light, or Auto.
- Custom daily XP goal with a Today goal stat.
- Study streak tracking when XP is earned.
- Course search for title, summary, source, and key points.
- Course filters for All, Ready, Done, and Review lessons.
- Weak-point lessons are highlighted inside the course grid.
- Progress export now includes streak, today XP, and daily goal.

### Previous upgrade set

- Demo passwords are now saved as salted hashes instead of plain text.
- Existing `omarTechLearn.v3`, `v4`, and `v5` browser data migrates into the new `v6` storage key.
- XP is now awarded only once per lesson, so completed lessons cannot be farmed for points.
- Weak-point review cards are cleared automatically after the lesson is answered correctly.
- Long study blocks are split into smaller lesson chunks, with the generated lesson cap controlled in Settings.
- Quiz generation now prefers cloze-style multiple choice questions and better false statements.
- Duplicate file uploads are skipped, and empty/low-value pasted content is rejected.
- Typed answers can be submitted with Enter and accept close normalized matches.
- Accessibility polish: explicit labels, autocomplete hints, status live region, focus styles, reduced-motion support.
- Safer runtime fallbacks for dialogs, random IDs, and local storage errors.

## Features

- Upload: `PDF`, `DOCX`, `PPTX`, `TXT`, `MD`
- In-browser parsing only (safe for GitHub Pages)
- Editable preview blocks
- Toggle Keep / Ignore
- Split and retitle blocks
- Auto-built lessons
- Multiple quiz formats:
  - multiple choice
  - true / false
  - typed answer
- XP, daily goal, streak, accuracy, study time, and progress tracking
- Weak-point review list, due-now filter, bookmarks, and course filters
- Local browser auth for demo purposes
- Theme settings: dark, light, or auto
- Lesson search and course filters
- Export and import full workspace backups as JSON
- Installable PWA support with local app caching

## File structure

```text
omartech-learn-flat-github/
├── index.html
├── styles.css
├── app.js
├── README.md
├── PRODUCTION.md
├── CHANGELOG.md
├── manifest.webmanifest
├── sw.js
├── .gitignore
├── .nojekyll
├── icon.png
├── favicon.png
└── hero.png
```

## Deploy on GitHub Pages

1. Create a new GitHub repository.
2. Upload all files from this folder.
3. Commit and push.
4. In GitHub go to **Settings → Pages**.
5. Under **Build and deployment** choose:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` (root)
6. Save.
7. Wait a minute and open the Pages URL.

## How to use

1. Sign up or log in.
2. Upload a file or paste text.
3. Review, split, duplicate, move, delete, keep, or ignore the cleaned blocks.
4. Optionally adjust lesson cap or unlock mode in **Settings**.
5. Press **Begin**.
6. Go to the **Course** tab.
7. You will see the **number of lessons** and per-lesson status.
8. Start a lesson.
9. Read the teaching screen.
10. Press **Got it**.
11. Answer the quiz.
12. Review weak points in the **Review** tab and export/import backups as needed.

## Notes

- This is a **frontend demo**.
- Login/signup, theme preference, streak, daily goal, and progress are stored in `localStorage`; demo passwords use salted hashes.
- It is fine for demos and GitHub Pages.
- For real users, use a backend with real auth and database storage.


## Flat upload version

All files are in one root folder now. No `assets/` folder is required. Upload each file directly into the GitHub repo root.
