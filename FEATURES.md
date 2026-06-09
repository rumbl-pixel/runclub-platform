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
- Priority 5: 4 / 10 complete. Status: In Progress.
- Priority 6: 0 / 8 complete. Status: Planned.
- Priority 7: 0 / 10 complete. Status: Planned.
- Priority 8: 0 / 8 complete. Status: Parked.

## Current Focus

- Current lane: Priority 5 - Parent And Student Experience.
- Recommended next item: 5.5 Milestone notifications.
- Privacy note: Priority 0 stays visible as the go-live gate and must be completed before real student data is entered.

## Priority 0 - Live Privacy And Security Gate

Status: Go-Live Gate. Complete before using real student data.

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

Status: In Progress.

Training And At-Home Tasks now has a local-first skeleton in place. Before launch, this lane needs privacy-reviewed backend storage, clearer guardian visibility, and careful language so assigned at-home training remains teacher-directed rather than student self-reported activity.

- [x] ~~5.1 Parent account linking.~~
- [x] ~~5.2 Stronger guardian access controls.~~
- [x] ~~5.3 Parent view for child progress, awards, and goals.~~
- [x] ~~5.4 Student progress timeline.~~
- [ ] 5.5 Milestone notifications.
- [ ] 5.6 Challenge notifications.
- [ ] 5.7 Student progress PDFs per term.
- [ ] 5.8 Improved award and certificate display.
- [ ] 5.9 Student-friendly goal reflection without self-reported activity logging.
- [ ] 5.10 Complete assigned at-home training tasks with admin assignment, student viewing, and link click visibility.

## Priority 6 - Competitions And Challenges

Status: Planned.

- [ ] 6.1 House competitions.
- [ ] 6.2 Class competitions.
- [ ] 6.3 Year-level competitions.
- [ ] 6.4 Club-wide challenges.
- [ ] 6.5 Team and house leaderboards.
- [ ] 6.6 Custom challenge rules.
- [ ] 6.7 Challenge progress tracking.
- [ ] 6.8 Challenge award/certificate tie-ins.

## Priority 7 - Sports Carnival And Cross Country

Status: Planned.

- [ ] 7.1 Sports Carnival module.
- [ ] 7.2 Cross Country module.
- [ ] 7.3 PB tracking.
- [ ] 7.4 Sprint time results.
- [ ] 7.5 Distance event time results.
- [ ] 7.6 Jump, throw, and length results.
- [ ] 7.7 Field-event attempt tracking.
- [ ] 7.8 Age champion scoring.
- [ ] 7.9 House points.
- [ ] 7.10 Carnival and cross country exports.

## Priority 8 - Polish, Help, And Long-Term Enhancements

Status: Parked.

- [ ] 8.1 Cleaner mobile and tablet layouts.
- [ ] 8.2 Admin help/setup notes inside the app.
- [ ] 8.3 Program resources and lesson-plan section.
- [ ] 8.4 Granular privacy controls such as pseudonyms and consent flags.
- [ ] 8.5 Custom milestone thresholds.
- [ ] 8.6 Multi-school reporting.
- [ ] 8.7 Theme and branding settings.
- [ ] 8.8 Accessibility audit and improvements.
