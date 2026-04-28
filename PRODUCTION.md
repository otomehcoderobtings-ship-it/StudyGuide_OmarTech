# Production upgrade path

This build is intentionally made for **GitHub Pages** and runs fully in the browser.

## Current demo hardening

This version keeps the GitHub Pages-only architecture, but it now includes better demo hardening:

- salted local password hashes instead of plain-text demo passwords
- v3/v4/v5-to-v6 local storage migration
- duplicate upload protection
- fair XP accounting
- review cleanup after correct retries
- accessibility and reduced-motion polish
- frontend-only theme preferences, daily goal, streak, lesson search, lesson filters, backups, bookmarks, due-review controls, accuracy tracking, and study-time tracking

## Good for

- portfolio demos
- sharing a working prototype
- testing UX and lesson flow
- local demo auth

## Not enough for production

For a real app, add:

- real authentication (Supabase Auth, Clerk, Auth.js, Firebase Auth)
- database storage
- server-side file processing
- OCR workers for scanned PDFs
- secure AI API calls from a backend
- user workspaces synced across devices

## Recommended stack

- **Frontend:** Next.js or React + Vite
- **Backend:** Supabase / Node API / Vercel Functions / Cloud Run
- **Database:** Postgres
- **Storage:** Supabase Storage / S3
- **Auth:** Supabase Auth or Clerk
- **AI:** backend-only API routes

## Suggested next backend features

1. Real account system
2. Saved courses per user
3. Better lesson generation with AI
4. Better quiz distractors
5. Better review scheduling and adaptive spaced repetition synced to a backend
6. OCR pipeline for image PDFs
7. Classroom / exam modes



## Latest frontend-only additions

- Drag-and-drop uploads
- Full local workspace backup import/export
- Lesson bookmarks
- Configurable lesson cap and unlock-all option
- Accuracy, study-time, and due-review stats
- Review due filter and mastered-review cleanup
- Richer block management controls
- Keyboard shortcuts for quiz flow
- PWA manifest and service-worker cache

These are still local-browser features. Production should persist them server-side and validate imports on the backend.
