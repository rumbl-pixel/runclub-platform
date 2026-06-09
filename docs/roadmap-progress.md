# Gwynne Park Run Club - Progress Checklist

Last updated: 2026-06-09

This is the quick-read roadmap. `FEATURES.md` remains the full source of truth.

## Overall Progress

- [ ] Priority 0 - Live Privacy And Security Gate: 0 / 10 complete. Go-Live Gate.
- [x] Priority 1 - Operational MVP: 14 / 14 complete. Done.
- [x] Priority 2 - Next Build: 8 / 8 complete. Done.
- [x] Priority 3 - Backend And Cross-Device Sync: 10 / 10 complete. Done.
- [x] Priority 4 - Reporting And Admin Power Tools: 10 / 10 complete. Done.
- [ ] Priority 5 - Parent And Student Experience: 4 / 10 complete. In Progress.
- [ ] Priority 6 - Competitions And Challenges: 0 / 8 complete. Planned.
- [ ] Priority 7 - Sports Carnival And Cross Country: 0 / 10 complete. Planned.
- [ ] Priority 8 - Polish, Help, And Long-Term Enhancements: 0 / 8 complete. Parked.

## Current Focus

- [x] 3.1 Backend stack decision completed: Supabase Postgres/Auth/RLS/Edge Functions.
- [x] 3.2 Initial production schema completed with RLS enabled on student/school data tables.
- [x] Priority 3 backend adapter, idempotent scan sync, report views, backup/export tracking, and demo migration path completed.
- [x] 5.1 Parent account linking completed with local guardian link codes.
- [x] 5.2 Stronger guardian access controls completed with revoke/restore, expiry, and access logs.
- [x] 5.3 Parent progress view completed with progress summary, recent scans, awards, goals, and assigned training visibility.
- [x] 5.4 Student progress timeline completed with read-only scan, award, goal, and training events.
- [x] Supabase fake-backend staging is running locally with fake data and Edge Function checks.
- [x] Screen rollout started: Leaderboard now tries fake-backend data first and falls back to local demo data.

## Go-Live Gate

Do not enter real student data until Priority 0 is complete.

- [ ] 0.1 Replace local demo storage with a real backend.
- [ ] 0.2 Add real staff/admin authentication.
- [ ] 0.3 Add role-based permissions for admin, coach, parent, and student views.
- [ ] 0.4 Add school-scoped data isolation.
- [ ] 0.5 Remove universal public `DEMO` access before launch.
- [ ] 0.6 Use non-guessable student and parent access tokens.
- [ ] 0.7 Add consent, retention, export, and deletion controls for student data.
- [ ] 0.8 Add audit logs for imports, scans, edits, exports, deletions, and manual adjustments.
- [ ] 0.9 Complete privacy policy, incident plan, admin onboarding notes, and backup/export process.
- [ ] 0.10 Run final security review and live deployment checklist.

## Completed Foundation

- [x] Manual student add, edit, delete.
- [x] CSV roster import with duplicate and invalid row feedback.
- [x] Student barcode and local QR ID cards.
- [x] Admin run sessions.
- [x] Admin and kiosk lap scanning.
- [x] Undo/review last scan.
- [x] Duplicate scan protection.
- [x] Whole-school, division, year, and class leaderboards.
- [x] Student profile with laps, distance, awards, goals, and ID card.
- [x] Parent read-only portal and printable certificates.
- [x] Admin exports and scan audit previews.
- [x] PWA installable shell for phones and iPads.
- [x] Offline scan queue and retry states.
- [x] Scanner device names, lap length, session type, and duplicate cooldown settings.
- [x] Richer reports, progress history, onboarding wizard, and school theme.
- [x] Training skeleton: admin assignment, student Training tab, and link-open visibility.
- [x] Fake-backend local Supabase loop with staging seed, `student_auth`, `csv_import`, and schema lint.

## Priority 3 Checklist

- [x] ~~3.1 Choose backend stack and deployment target.~~
- [x] ~~3.2 Create database schema for schools, users, school users, groups, students, laps, sessions, awards, challenges, devices, and audit logs.~~
- [x] ~~3.3 Replace `localStorage` roster reads/writes with backend data access.~~
- [x] ~~3.4 Replace lap/session storage with backend writes and server timestamps.~~
- [x] ~~3.5 Add idempotency keys for scan requests.~~
- [x] ~~3.6 Add sync for offline scan queue.~~
- [x] ~~3.7 Add conflict handling for duplicate or delayed offline scans.~~
- [x] ~~3.8 Add backend-powered leaderboards and reports.~~
- [x] ~~3.9 Add backup/export jobs.~~
- [x] ~~3.10 Add migration path from current demo data to real school setup.~~

## Priority 4 Checklist

- [x] ~~4.1 Class, year, division, and school summary dashboards.~~
- [x] ~~4.2 Per-student full history view.~~
- [x] ~~4.3 Term progress reports.~~
- [x] ~~4.4 Printable class reports.~~
- [x] ~~4.5 Printable award packs.~~
- [x] ~~4.6 Certificate batch export.~~
- [x] ~~4.7 Session attendance and participation summaries.~~
- [x] ~~4.8 Manual adjustment ledger with reason notes.~~
- [x] ~~4.9 Import/export templates for common school admin workflows.~~
- [x] ~~4.10 Admin analytics for participation, progress, and inactive students.~~

## Planned Later

- [ ] Priority 5: milestone/challenge notifications, PDFs, award display polish, student reflection, completed backend-backed Training workflow.
- [ ] Priority 6: house/class/year competitions and challenge progress.
- [ ] Priority 7: Sports Carnival and Cross Country modules.
- [ ] Priority 8: mobile polish, help notes, privacy controls, branding settings, accessibility audit.
