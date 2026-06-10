# Gwynne Park Run Club - Roadmap

Inspired by Marathon Kids Connect and StrideTrack. This file is the source of truth for feature progress.

Workflow rules live in `docs/roadmap-workflow.md`.
Quick progress view lives in `docs/roadmap-progress.md`.

## Progress Snapshot

- Priority 0: 0 / 10 complete. Status: Go-Live Gate.
- Priority 1: 14 / 14 complete. Status: Done.
- Priority 2: 8 / 8 complete. Status: Done.
- Priority 3: 10 / 10 complete. Status: Done.
- Priority 4: 10 / 10 complete. Status: Done.
- Priority 5: 10 / 10 complete. Status: Done.
- Priority 6: 8 / 8 complete. Status: Done.
- Priority 7: 11 / 11 complete. Status: Done.
- Priority 8: 9 / 9 complete. Status: Done.

## Current Focus

- Current lane: Priority 0 - Live Privacy And Security Gate.
- Recommended next item: 0.1 Replace local demo storage with a real backend.
- Privacy note: Priority 0 stays visible as the go-live gate and must be completed before real student data is entered.
- Backend pilot: local Supabase fake backend is running; Leaderboard is the first screen wired to try backend data and fall back to local demo data.
- 0.1 progress: admin roster add/edit/delete now has live backend upsert/soft-delete helpers, CSV and Compass roster imports can batch-upsert through Supabase, scanner lap writes can call the idempotent Supabase `record_lap_scan` RPC, scan undo can mark backend lap entries as undone through Supabase, run sessions can create/finish through Supabase, manual adjustments have a Supabase ledger/RPC path, and roster/scan/undo/import/session/adjustment local-only writes are blocked when live data mode is enabled before the backend is ready.
- Access model locked: staff/coaches are invite-only; students are passwordless by barcode/QR/non-guessable code; parents search by child name but must confirm with a guardian link/code before seeing a full profile. See `docs/access-model-decision.md`.

## Priority 0 - Live Privacy And Security Gate

Status: Go-Live Gate. Complete before using real student data.

- [ ] 0.1 Replace local demo storage with a real backend.
  - In progress: backend readiness gate, live-data guard, student roster upsert, student roster soft-delete, live scan write guard, direct `record_lap_scan` RPC calls, privacy roster fields migration, and cache-busted live scripts are in place.
- [ ] 0.2 Add real staff/admin authentication.
  - Locked decision: staff and coaches are invite-only through school-scoped Supabase Auth, not public self-signup.
- [ ] 0.3 Add role-based permissions for admin, coach, parent, and student views.
  - Locked decision: parent access is child-linked and read-only; student access is own-profile-only and passwordless.
- [ ] 0.4 Add school-scoped data isolation.
- [ ] 0.5 Remove universal public `DEMO` access before launch.
- [ ] 0.6 Use non-guessable student and parent access tokens.
  - Locked decision: friendly handles like `JSmith` can be labels, but actual student/parent access must use generated non-guessable barcode, QR, or guardian tokens.
- [ ] 0.7 Add consent, retention, export, and deletion controls for student data.
- [ ] 0.8 Add audit logs for imports, scans, edits, exports, deletions, and manual adjustments.
- [ ] 0.9 Complete privacy policy, incident plan, admin onboarding notes, and backup/export process.
- [ ] 0.10 Run final security review and live deployment checklist.

## Priority 1 - Operational MVP

Status: Done. Keep stable unless a bug is found.

- [x] ~~1.1 Admin can manually add, edit, and delete students.~~
- [x] ~~1.2 Admin can import roster CSVs with duplicate/invalid row feedback.~~
- [x] ~~1.3 Student ID cards include printable barcodes and local QR codes.~~
- [x] ~~1.4 Admin can start and finish run sessions.~~
- [x] ~~1.5 Admin and kiosk can log laps quickly from barcode input.~~
- [x] ~~1.6 Admin and kiosk can undo/review the last scan.~~
- [x] ~~1.7 Rapid duplicate scan protection is in shared scan logging.~~
- [x] ~~1.8 Whole-school leaderboard page is available.~~
- [x] ~~1.9 Leaderboards include division, year, and class views.~~
- [x] ~~1.10 Student profile shows laps, distance, awards, goals, and ID card.~~
- [x] ~~1.11 Parent portal is read-only and can print child award certificates.~~
- [x] ~~1.12 Admin reports export leaderboard, activity, JSON, and scan audit CSVs.~~
- [x] ~~1.13 Award/certificate readiness is visible in admin.~~
- [x] ~~1.14 Basic scan audit trail records scanner, student, time, and result.~~

## Priority 2 - Next Build

Status: Done. Keep stable unless a bug is found.

- [x] ~~2.1 PWA/installable scanning shell for phones and iPads.~~
- [x] ~~2.2 Better offline scan queue interface and retry states.~~
- [x] ~~2.3 Configurable duplicate scan cooldown in admin settings.~~
- [x] ~~2.4 Registered scanner/tablet device names for audit logs.~~
- [x] ~~2.5 Track/session setup options, including lap length and session type.~~
- [x] ~~2.6 Richer class, division, medal, and certificate reports.~~
- [x] ~~2.7 Per-student progress history and term summary view.~~
- [x] ~~2.8 Onboarding wizard for school, track length, years, classes, and award thresholds.~~

## Priority 3 - Backend And Cross-Device Sync

Status: Done. This is the bridge from demo/local use to real multi-device operation. Production still requires Priority 0 before real student data is entered.

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

## Priority 4 - Reporting And Admin Power Tools

Status: Done. Keep stable unless a bug is found.

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

## Priority 5 - Parent And Student Experience

Status: Done.

Training And At-Home Tasks now has a local-first skeleton in place. Before launch, this lane needs privacy-reviewed backend storage, clearer guardian visibility, and careful language so assigned at-home training remains teacher-directed rather than student self-reported activity.

Completed so far in this lane:

- [x] Parent linking, guardian controls, parent progress view, and student progress timeline.
- [x] Local Supabase fake-backend staging setup for safe testing before real student data.
- [x] First fake-backend screen connection started with the public Leaderboard.
- [x] Milestone notifications are shown and stored when admin scans cross an award threshold.
- [x] Challenge notifications are stored and shown when admins create new challenges.
- [x] Student profiles can print a term progress report for browser PDF export.
- [x] Student and parent award panels now use clearer award cards with next-milestone progress, and parent certificates use the school theme.
- [x] Student goal reflections are available as non-scoring notes, separate from any activity logging.
- [x] Assigned at-home training now supports admin assignment, student viewing, link-open tracking, reviewed status, and parent/admin visibility.

- [x] ~~5.1 Parent account linking.~~
- [x] ~~5.2 Stronger guardian access controls.~~
- [x] ~~5.3 Parent view for child progress, awards, and goals.~~
- [x] ~~5.4 Student progress timeline.~~
- [x] ~~5.5 Milestone notifications.~~
- [x] ~~5.6 Challenge notifications.~~
- [x] ~~5.7 Student progress PDFs per term.~~
- [x] ~~5.8 Improved award and certificate display.~~
- [x] ~~5.9 Student-friendly goal reflection without self-reported activity logging.~~
- [x] ~~5.10 Complete assigned at-home training tasks with admin assignment, student viewing, and link click visibility.~~

## Priority 6 - Competitions And Challenges

Status: Done.

- [x] ~~6.1 House competitions.~~
- [x] ~~6.2 Class competitions.~~
- [x] ~~6.3 Year-level competitions.~~
- [x] ~~6.4 Club-wide challenges.~~
- [x] ~~6.5 Team and house leaderboards.~~
- [x] ~~6.6 Custom challenge rules.~~
- [x] ~~6.7 Challenge progress tracking.~~
- [x] ~~6.8 Challenge award/certificate tie-ins.~~

## Priority 7 - Interschool Athletics And Cross Country

Status: Done.

- [x] ~~7.1 Interschool Athletics Mode module.~~
- [x] ~~7.2 Cross Country module.~~
- [x] ~~7.3 PB tracking.~~
- [x] ~~7.4 Sprint time results.~~
- [x] ~~7.5 Distance event time results.~~
- [x] ~~7.6 Jump, throw, and length results.~~
- [x] ~~7.7 Field-event attempt tracking.~~
- [x] ~~7.8 Age champion scoring.~~
- [x] ~~7.9 House points.~~
- [x] ~~7.10 Carnival and cross country exports.~~
- [x] ~~7.11 drag-and-drop training library for quick workout building.~~

## Priority 8 - Polish, Help, And Long-Term Enhancements

Status: Done.

- [x] ~~8.1 Cleaner mobile and tablet layouts.~~
- [x] ~~8.2 Admin help/setup notes inside the app.~~
- [x] ~~8.3 Program resources and lesson-plan section.~~
- [x] ~~8.4 Granular privacy controls such as pseudonyms and consent flags.~~
- [x] ~~8.5 Custom milestone thresholds.~~
- [x] ~~8.6 Multi-school reporting.~~
- [x] ~~8.7 Theme and branding settings.~~
- [x] ~~8.8 Accessibility audit and improvements.~~
- [x] ~~8.9 Authorised Compass class-list sync, starting with Compass CSV import and only moving to API sync if school/department approval and credentials are provided.~~
