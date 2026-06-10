# Gwynne Park Run Club - Progress Checklist

Last updated: 2026-06-10

This is the quick-read roadmap. `FEATURES.md` remains the full source of truth.

## Overall Progress

- [ ] Priority 0 - Live Privacy And Security Gate: 0 / 10 complete. Go-Live Gate.
- [x] Priority 1 - Operational MVP: 14 / 14 complete. Done.
- [x] Priority 2 - Next Build: 8 / 8 complete. Done.
- [x] Priority 3 - Backend And Cross-Device Sync: 10 / 10 complete. Done.
- [x] Priority 4 - Reporting And Admin Power Tools: 10 / 10 complete. Done.
- [x] Priority 5 - Parent And Student Experience: 10 / 10 complete. Done.
- [x] Priority 6 - Competitions And Challenges: 8 / 8 complete. Done.
- [x] Priority 7 - Interschool Athletics And Cross Country: 11 / 11 complete. Done.
- [x] Priority 8 - Polish, Help, And Long-Term Enhancements: 9 / 9 complete. Done.

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
- [x] 5.5 Milestone notifications completed for admin scans, with local notification history.
- [x] 5.6 Challenge notifications completed for admin-created challenges, with local notification history.
- [x] 5.7 Student progress PDFs per term completed through a print-ready student profile report.
- [x] 5.8 Improved award and certificate display completed with award cards, next-milestone progress, and school-themed certificates.
- [x] 5.9 Student-friendly goal reflection completed with non-scoring notes that do not add activity.
- [x] 5.10 Assigned at-home training workflow completed with admin assignment, student viewing, link-open tracking, reviewed status, and parent/admin visibility.
- [x] 6.1 House competitions started with optional student houses and public house totals.
- [x] 6.2 Class competitions started with public class totals by distance.
- [x] 6.3 Year-level competitions started with public year-group totals by distance.
- [x] 6.4 Club-wide challenges started with public progress cards for admin-created challenges.
- [x] 6.5 Team and house leaderboards started with optional team groups and public team totals.
- [x] 6.6 Custom challenge rules completed with structured metric, target, scope, and rule type fields.
- [x] 6.7 Challenge progress tracking completed with admin progress cards for active challenges.
- [x] 6.8 Challenge award/certificate tie-ins completed with award-ready rows for completed challenges.
- [x] 7.1 Interschool Athletics Mode module completed with Australian primary carnival event defaults.
- [x] 7.2 Cross Country module completed with admin course setup for year/division distances and route notes.
- [x] 7.3 PB tracking completed with per-student event bests and new-PB detection.
- [x] 7.4 Sprint time results completed for 50m, 75m, 100m, and 200m events.
- [x] 7.5 Distance event time results completed for 400m, 800m, and cross country timing.
- [x] 7.6 Jump, throw, and length results completed for jump and throw event values.
- [x] 7.7 Field-event attempt tracking completed with three attempt fields per result.
- [x] 7.8 Age champion scoring completed with year-group points summaries.
- [x] 7.9 House points completed with simple place-based house totals.
- [x] 7.10 Carnival and cross country exports completed with CSV report buttons.
- [x] 7.11 drag-and-drop training library completed with a quick workout builder for admin assignments.
- [x] 8.1 Cleaner mobile and tablet layouts completed with stronger phone, iPad, and laptop responsive rules.
- [x] 8.2 Admin help/setup notes completed with in-app quick start, device setup, workflow, and privacy gate notes.
- [x] 8.3 Program resources and lesson-plan section completed with printable run club, athletics, cross country, safety, and device setup resource cards.
- [x] 8.4 Granular privacy controls completed with admin pseudonyms, consent status, public-name hiding, certificate-sharing flags, and privacy-aware leaderboard names.
- [x] 8.5 Custom milestone thresholds completed with admin save/reset controls for lap awards.
- [x] 8.6 Multi-school reporting completed with school-filtered summaries and CSV export.
- [x] 8.7 Theme and branding settings completed with local title, blue, and gold controls.
- [x] 8.8 Accessibility audit and improvements completed with skip links, main landmarks, tab ARIA state, and visible keyboard focus.
- [x] 8.9 Authorised Compass class-list sync completed as a CSV import pathway with template and authorisation notes.
- [x] Priority 0.1 backend cutover started with a visible backend readiness gate, live roster write guard, live scanner write guard, live scan-undo guard, live CSV/Compass import guard, live run-session guard, live manual-adjustment guard, Supabase student upsert, Supabase student batch import, Supabase student soft-delete, direct `record_lap_scan` calls, direct `record_scan_undo` calls, Supabase run session create/finish calls, a manual adjustment ledger/RPC, and student privacy fields migration.
- [x] Signup/access model locked: invite-only staff/coaches, passwordless student barcode/QR/code access, parent child-name search plus guardian code/link confirmation. See `docs/access-model-decision.md`.

## Go-Live Gate

Do not enter real student data until Priority 0 is complete.

- [ ] 0.1 Replace local demo storage with a real backend.
  - In progress: roster add/edit/delete, CSV/Compass roster imports, scanner lap writes/undos, run sessions, and manual lap adjustments can now route through Supabase when live data mode is enabled and backend readiness passes.
- [ ] 0.2 Add real staff/admin authentication.
  - Locked decision: staff and coaches are invite-only through school-scoped Supabase Auth.
- [ ] 0.3 Add role-based permissions for admin, coach, parent, and student views.
  - Locked decision: parents get child-linked read-only access; students get own-profile-only passwordless access.
- [ ] 0.4 Add school-scoped data isolation.
- [ ] 0.5 Remove universal public `DEMO` access before launch.
- [ ] 0.6 Use non-guessable student and parent access tokens.
  - Locked decision: no predictable student username as the only credential; use generated barcode, QR, access code, or guardian link token.
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
- [x] Priority 6: house/class/year competitions and challenge progress.
- [x] Priority 7: Interschool Athletics and Cross Country modules.
- [x] Priority 8: mobile polish, help notes, privacy controls, branding settings, accessibility audit, and authorised Compass class-list sync.
