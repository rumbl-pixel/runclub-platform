# Corso Handover Summary

Last updated: 2026-06-24

## Product Snapshot

Corso is a school run club and athletics platform for tracking student participation, laps, awards, goals, training, interschool athletics, cross country, and parent/student visibility. The original school-specific build was for Gwynne Park Run Club, but the product direction is now broader: Corso can be adapted for multiple schools while keeping data private and school-scoped.

Core positioning:

- No ads.
- Privacy-first.
- Staff/coaches manage data.
- Students see only their own profile.
- Parents see only their own linked child or children.
- Schools see only their own students.
- Demo/local mode remains safe for testing; real student data must wait for live backend, school approval, auth, and privacy review.

## Repository And Runtime

Repo:

- GitHub repo: `rumbl-pixel/runclub-platform`
- Local workspace: `C:\Users\jerem\Documents\Codex\runclub-platform`
- Current local URL: `http://127.0.0.1:8080`

Run locally:

```powershell
cd C:\Users\jerem\Documents\Codex\runclub-platform
python -m http.server 8080
```

Key files:

- `index.html` - public/home dashboard
- `about.html` - About Corso page with Jeremy's founder/running/privacy introduction
- `admin.html` - admin login
- `admin-dashboard.html` - main admin console
- `admin-dashboard.js` - main admin feature logic
- `student.html` - student login
- `student-profile.html` / `student.js` - student profile
- `parent.html` / `parent.js` - parent portal
- `kiosk.html` / `kiosk.js` / `kiosk.css` - scanner kiosk
- `leaderboard.html` / `leaderboard.js` - public leaderboard
- `interschool-team.html` / `interschool-team.js` - legacy/supplementary interschool team page
- `styles.css` - main styling/theme/motion
- `theme.js` - theme/dark mode support
- `service-worker.js` - PWA cache list/version
- `config.js` - public demo config only
- `backend.js` - backend/live-style adapter
- `FEATURES.md` - priority roadmap source of truth
- `docs/roadmap-progress.md` - progress summary
- `docs/access-model-decision.md` - locked access model
- `docs/backend-stack-decision.md` - backend decision notes
- `docs/backend-sync-runbook.md` - backend/sync notes
- `CLAUDE_HANDOVER.md` - concise second-agent start-here brief
- `docs/beta-tester-checklist.md` - simple demo-review checklist for testers

## Current Technical Shape

This is still primarily a static vanilla HTML/CSS/JS app with local-first demo storage and guarded Supabase/live-style paths.

Important architecture notes:

- No framework build step is required.
- Most admin logic currently lives in `admin-dashboard.js`; it is large and should eventually be split into modules.
- Demo data is stored in `localStorage`.
- Backend readiness gates exist to prevent local-only writes when live data mode is enabled before the backend is ready.
- Supabase is the selected backend direction.
- Real student data should not be entered until live auth, RLS, school scoping, guardian access and privacy review are complete.

Useful test commands:

```powershell
node tests/portal-smoke.test.js
node tests/goals-baseline.test.js
node --check admin-dashboard.js
```

Additional scripts exist for backend/live-style checks:

```powershell
node tests/backend-live-style.test.js
node tests/scanning-live-mode.test.js
node tests/supabase-staging.test.js
node scripts/staging-readiness-check.js
```

## Branding And Design Direction

Current app name:

- Corso

Logo:

- `assets/corso-logo.png`
- User supplied/generated Corso logo with “Every Lap Counts”.

Design direction:

- Obsidian/glass navy base.
- White trimming.
- Small pale gold accents.
- Dark/light mode toggle.
- Floating/pop-out navigation rather than a giant mobile header.
- Avoid clashing hover states on non-buttons.
- Buttons only should have meaningful hover treatment; informational cards should not feel clickable unless they are.

Recent design work:

- Removed the expanding/shrinking header concept because it felt janky.
- Site now keeps a compact header/menu model.
- Added dark/light mode toggle at the top.
- Added small gold tint back through the site.
- Fixed multiple dark-mode contrast issues, especially links, badges, scanner inputs, awards, and athletics pills.
- Polished dashboard tiles/cards and removed unwanted hover highlights on informational tiles.

Recent QA and roadmap work:

- About page added on 2026-06-24 with Jeremy's first-person introduction, privacy stance, and beta-safe positioning.
- Beta Share Mode added on 2026-06-24 as a compact site-wide demo warning. It appears on shared demo pages and stays hidden from the locked kiosk surface.
- Current transfer point commit history includes the beta-readiness sweep and About page work. The next handover target is a second-agent review, not a broad rewrite.
- Stage 1 general browser QA is complete except for browser-native print/download/confirmation actions that Jeremy will click manually at the very end.
- Stage 2 portal/workflow QA is complete for admin login, student login, parent read-only view, kiosk exit, student training checklist, Programming catalogue, and Mini Coach program generation.
- Stage 3 Sports/Interschool QA is complete: Sports opens as one command centre, Interschool Athletics Mode works, Cross Country show/hide works, consent checklist is compact and centred, event popups stay in viewport on phone/iPad widths, and team summaries show student, year, class, division, events, PBs, and consent.
- Sports division rules were browser-verified: Junior 50m excludes senior students, Intermediate 75m shows Year 3-4 only, Senior 100m shows Year 5-6 only, and the results form uses the same eligibility filtering.
- Athletics results are source-verified to write to the athletics results store, not Run Club lap totals.
- Stage 4 Privacy/Data Readiness is complete at the current demo-app level: `config.js` stays demo/local by default, private/service-role key scans are clean, no roster/CSV private data files are present, parent view is read-only, admin/kiosk remain session-gated in source, medical notes are not exposed to leaderboard/kiosk, and live-mode write guards remain wired across sensitive local-write paths.
- Privacy policy wording was updated on 2026-06-18 to remove old predictable-code language and describe student access as a school-issued barcode, QR code, or backend-generated non-guessable code.
- Stage 7 is locked: Claude/second-agent first job should be a code review and bug/risk audit, not an immediate rewrite. The review should produce file-referenced findings and a proposed modularisation plan for `admin-dashboard.js`.
- Stage 8 is complete: the Claude/second-agent prompt now includes product summary, privacy rules, file paths, local run command, test commands, exact first task, and guardrails against real student data, destructive git changes, and large rewrites before review discussion.
- A standalone first-review handoff brief now exists at `docs/claude-first-review-brief.md`.
- Two-PC sync helpers now exist at `scripts/sync-start.ps1` and `scripts/sync-finish.ps1`, with the guide at `docs/sync-between-pcs.md`.
- Optional staging readiness check was run on 2026-06-18. Code-side checks are present, but local staging needs Jeremy/setup action: Docker Desktop Linux engine running plus `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `RUN_CLUB_SCHOOL_ID`.
- Deep audit pass on 2026-06-18:
  - checked JavaScript syntax across all non-`node_modules` JS files
  - ran the full npm test suite and build
  - checked deployable HTML/service-worker references and duplicate IDs
  - scanned for TODO/FIXME/debugger/eval/obvious secret patterns
  - browser-checked public routes, admin tabs, kiosk, desktop width, and phone width for console errors, missing images, and horizontal overflow
  - confirmed `admin-dashboard.html?tab=sports` activates the Sports panel
  - fixed the kiosk build-source mismatch by keeping `src/kiosk/kiosk.html` root-ready for the build pipeline and rebuilding the deployable `kiosk.html`
  - fixed `src/backend/backend.js` as the backend source of truth so builds keep live-ready Sports/Coach Tools methods: athletics consent, team selection, athletics results, Cross Country courses, coach notes, and student notifications
  - fixed `src/scanning/scanning.js` as the scanner source of truth so Interschool/Athletics/Cross Country/training scans are attendance-only and do not add Run Club laps
  - confirmed Sports modals are centred and viewport-safe on desktop and phone widths; Senior 100m filters to Year 5/6 students only
  - removed untracked `.tmp-*.png` QA screenshot artifacts from the repo root

## Privacy And Access Model

Locked decisions:

- Coaches/staff are invite-only.
- Students do not need passwords.
- Student access is by non-guessable code/barcode/QR, not simple public usernames.
- Friendly labels like `JSmith` may be shown, but access tokens must be generated and non-guessable.
- Parents search by child name only as a discovery step, then must confirm with a guardian link/code before seeing full details.
- Parents can only see their own linked child or children.
- Students can only see their own information.
- Schools can only see their own students.
- Kiosk/scanner is admin/staff only.
- Students cannot self-report activity.
- Medical notes are staff/guardian safety notes only, hidden from public leaderboards/kiosk/general browsing.

Privacy-related completed work:

- Privacy policy page exists.
- Backend readiness/live data guard exists.
- Local-only roster/scan/session/training/medical writes are blocked when live mode is enabled before backend readiness.
- Medical safety section exists for student profiles/admin/guardian-safe access.
- Audit/logging concepts exist for scans/imports/adjustments/exports.
- Demo mode warning remains important.
- Education compliance readiness notes now live in `docs/education-compliance-readiness.md`, with WA Department of Education, OAIC, and ST4S-style review references.
- Admin Help now includes an Education Compliance Readiness card and the launch checklist now includes parent collection notice, online-service/acceptable-use review, ST4S-style provider evidence, breach response, and retention schedule checks.
- Compliance now follows a vendor posture: automated technical checks are separate from school sign-off items, and status wording says "Technically ready for school sign-off" rather than claiming the school is automatically compliant.
- Compliance now includes a School Admin Signup & Use Attestation sheet that records the authorised school contact, site code, review date, Corso policy acknowledgement, parent notice acknowledgement, authorised-data acknowledgement, staff-access acknowledgement, and retention/incident pathway acknowledgement. The saved sheet repopulates after refresh and can be exported as part of the evidence trail.

## Completed Core Features

Admin:

- Admin login and dashboard.
- Admin tabs for Scanner, Students, Sports, Training, Leaderboard, Activity, Events, Awards, Programming, Reports, School Settings, Coach Tools, Import, Help.
- Add/edit/delete students.
- Generate barcodes and student ID cards.
- Student names in admin Students tab link into student profile in admin view.
- Admin stays in admin mode when viewing student profiles.
- CSV import path and Compass CSV import placeholder/direction.
- Reports and exports.
- School settings tab for app/school name, colour/theme, logo upload and branding.
- Support widget changed from Buy Me a Coffee to Ko-fi overlay, positioned smaller/right.

Scanner/Kiosk:

- Admin scanner and kiosk scanner.
- Kiosk restricted behind admin login.
- Camera scanning support path for phone/iPad browser when no Bluetooth scanner is available.
- Bluetooth scanners work as keyboard input.
- Duplicate scan protection.
- Start/finish sessions.
- Undo/review last scan.
- Kiosk exit returns home.
- Scanner colour/contrast fixes.

Students:

- Student login redirects to separate profile page.
- Login button hides once logged in.
- Student stays logged in if returning to dashboard.
- Student profile includes laps, distance, awards, goals, barcode, timeline and training.
- Timeline now focuses on attended run club days and laps, not warm-up/training items.
- Student training tasks are shown as a to-do list.
- Training items can include links to exercise resources.
- Student awards/badges section exists.
- Medical tab exists where appropriate.

Parents:

- Parent portal is read-only.
- Parent can view child progress/awards.
- Parent can print child award certificates.
- Parent dashboard moved toward two-column layout.
- Student self-reported/home activity removed.

Leaderboards:

- Whole-school leaderboard.
- Division leaderboards:
  - Senior: Years 5-6
  - Intermediate: Years 3-4
  - Junior: Years 1-2
- Year group leaderboards.
- Layout clipping fixes applied.

Awards:

- Automatic milestone awards.
- Custom award/challenge creation.
- Award/certificate print paths.
- Admin award tab dark-mode colour fixes.
- Badge styles improved for bronze/silver/gold/starter.
- Award pills can open printable certificate/PDF-style browser view.

Events:

- Calendar added.
- WA school holiday awareness requested and implemented in Events direction.
- Challenges created in Awards can surface in Events calendar.
- Smaller calendar surfaces requested for parent/student dashboards.

Training:

- Admin can assign training to specific students.
- Students can view assigned training and mark checklist items complete.
- Admin can see if links were opened/reviewed.
- Workout builder library created.
- Mobility warm-up library includes drills such as ankling, A-skips, B-skips and related athletics warm-up items.
- Warm-up mobility exercises are editable/selectable by checkbox.
- Workout builder and training assignment flow were partially combined to reduce double handling.

Programming:

- Resources tab renamed to Programming.
- Programming tab contains a large athletics/PE lesson catalogue.
- Session plans are editable.
- Plans are broken into:
  - Starters
  - Sessions
  - Cool-downs
- Activities can be dragged between sections.
- Each section has target minutes and coach notes.
- Each activity has an include checkbox and compact minute pill.
- Activity legs expand with:
  - How to run it
  - Coaching cues
  - Safety notes
  - Progressions
  - Source/resource links
- Programming catalogue expanded to 21 plans, including:
  - Run Club Session Plan
  - Interschool Athletics Rotation
  - Cross Country Preparation
  - Speed Tune-Up
  - Middle-Distance Builder
  - Field Event Circuit
  - Barcode And Device Setup
  - Run, Jump, Throw Fundamentals
  - Sprint Mechanics 50m, 75m, 100m
  - Straight-Line Baton Relay
  - Middle Distance Pacing 100m, 200m, 400m
  - Long Jump Primary Progression
  - Vortex Throw Technique
  - Carnival Ball Games Rotation
  - Cross Country Skills And Course Confidence
  - Athletics Station Circuit
  - Inclusive Athletics Adaptations
  - Athletics PB And Assessment Trials
  - Game Sense Athletics
  - Wet Weather Athletics Classroom/Gym
  - Upper Primary 6-Lesson Athletics Unit

External source/resource families referenced:

- WA Curriculum HPE
- World Athletics Kids Athletics
- Sport Australia Playing for Life
- ASC Sport Lesson Plans
- Australian Curriculum HPE
- SPARK PE sample lessons
- Track/field PE station ideas

## Mini Coach Current State

Mini Coach lives in the Programming tab as a floating bottom-left assistant widget.

Current behaviour:

- Opens upward above the bottom-left button.
- Shows current selected lesson.
- Shows “Current read”.
- Shows smart suggestions.
- Shows quick help chips.
- Shows lesson pairing chips.
- Has a local chat-style input.
- Can generate a program from a typed goal.
- Works locally/offline from the built-in Programming catalogue.
- Does not call an external AI service.
- Does not send data anywhere.

Quick help chips:

- Build program
- Safety check
- Differentiate
- Equipment
- Assessment
- Wet weather

Current Mini Coach capabilities:

- Suggests what lesson pairs well with the current lesson.
- Answers common questions about:
  - sprints
  - jumps
  - throws/Vortex
  - safety
  - warm-ups
  - timing/cutting a lesson down
  - curriculum/resource links
  - differentiation
  - equipment/setup
  - assessment/PB tracking
  - wet-weather backups
- Generates a week-by-week draft program from a goal such as:

```text
Make me a 4 week program for Year 5 and 6 students to prepare for 100m sprints and relay carnival
```

Generated program flow:

- Detects goal tags such as sprint, relay, cross country, pacing, long jump, Vortex throw, ball games, inclusive, PB/trials, wet weather.
- Detects week count if included.
- Scores the Programming catalogue against the goal.
- Builds a session sequence.
- Shows a generated program preview.
- Offers:
  - Apply first session
  - Copy summary

Important caveat:

- Mini Coach is a local rule/catalogue assistant, not a real AI model yet.
- It should be framed as a staff planning helper.
- Do not present it as medical, professional sports science, or autonomous decision-making advice.
- Before real use, its language should be reviewed by staff/school leadership.

Future Mini Coach ideas:

- Ask for class size, year group, time available, equipment available and space type before generating programs.
- Generate printable teacher cards.
- Generate student cue cards.
- Generate risk assessment checklists.
- Generate differentiated versions of the same lesson.
- Generate parent-safe summaries.
- Suggest “next best lesson” based on previous attendance/PB/training data.
- Suggest realistic individual training goals from lap history and PBs after privacy review.
- Add true AI only after privacy, school approval, API key management and data-handling rules are settled.

## Sports / Interschool Athletics

Sports tab was created to move Athletics/Cross Country out of the Students tab.

Current Sports direction:

- Interschool Athletics Mode toggle/pill.
- Cross Country Courses toggle/pill.
- Team checklist.
- Event teams.
- Results.
- PBs.
- House points.
- Team list summary.

Interschool Athletics refinements completed:

- Consent moved away from general student list.
- Consent checklist moved to a popup modal.
- Consent statuses:
  - blank/base
  - pending
  - approved
  - declined
- Team list summary includes selected students, division, year, class, consent status.
- Event selection popups show eligible students by division.
- Junior/Intermediate/Senior restrictions were repeatedly tightened:
  - Year 1-2 Junior
  - Year 3-4 Intermediate
  - Year 5-6 Senior
- Junior 50m should only show Junior students.
- Intermediate 75m should only show Intermediate students.
- Senior 100m should only show Senior students.
- Middle distance:
  - Junior 100m
  - Intermediate 200m
  - Senior 400m
- Ball games:
  - Tunnel Ball
  - Leader Ball
  - Pass Ball
  - Dropdown/year division separation requested.
- Relay:
  - Baton Relay only.
- Jumps:
  - Long Jump only.
  - High Jump and Triple Jump removed.
- Throws:
  - Vortex Throw only.
- Interschool training/attendance does not affect Run Club lap totals.

Known area to keep reviewing:

- Sports/Interschool Athletics has had many iterative changes. If another developer takes over, they should do a full click-through on every event popup and division filter.

## Backend / Supabase / Live Readiness

Backend direction:

- Supabase selected.
- Local/live-style adapter and staging checks exist.
- Real production still requires configured environment, project, auth, RLS and school approval.

Completed backend-style work:

- Backend readiness gate.
- Live-data guard.
- Roster upsert/soft-delete helpers.
- CSV/Compass import batch-upsert path.
- Idempotent scan RPC direction.
- Scan undo backend path.
- Run session create/finish path.
- Manual adjustment and activity ledger/RPC path.
- Guardian link issue/revoke/restore path.
- Parent guardian access verification through edge-function direction.
- Training assignment/event backend paths.
- Medical safety notes guarded backend paths.

Still required before real launch:

- Real Supabase project configured.
- Environment variables reviewed.
- Auth roles and invite flow implemented/tested.
- School-scoped row-level security reviewed.
- Parent/guardian linking tested with real school approval.
- Backup/export and deletion workflow reviewed.
- No real student data until the above is done.

## Deployment / Sharing

Current local URL:

- `http://127.0.0.1:8080/index.html`

Sharing before launch:

- Localhost is only visible on this machine.
- For review with others before production, use a temporary private preview or static host with demo data only.
- Supabase is not the normal host for static frontends; use a frontend host such as GitHub Pages, Netlify, Vercel, Cloudflare Pages or similar.
- Supabase is for backend/database/auth/functions.

Domain notes:

- User asked about `corso.org`; domain purchase/ownership is separate from hosting.
- Free domains are limited and not recommended for a school/private product.
- `.edu.au` is controlled and usually only available to eligible education entities, not automatically free.

## Known Current Issues / Watchouts

1. `admin-dashboard.js` is very large.
   - Future refactor should split it into modules:
     - scanner
     - students
     - sports
     - programming
     - training
     - awards
     - events
     - reports
     - miniCoach
     - storage/backend

2. Many files are modified in the working tree.
   - Do not revert unrelated changes.
   - Use focused commits when ready.

3. The in-app browser had trouble with automated text entry into Mini Coach chat.
   - Manual typing in normal browser should work.
   - Browser plugin reported virtual clipboard unavailable during automation.

4. Live launch is not recommended with real data until:
   - auth
   - RLS
   - backend readiness
   - privacy review
   - guardian access flow
   - school approval
   are complete.

5. Sports/Interschool division filtering should receive extra QA after any edits.

6. Kiosk/scanner should be tested on:
   - laptop with keyboard input
   - Bluetooth scanner
   - phone camera
   - iPad camera

## Recent Work Completed Immediately Before This Handover

Most recent work focused on the Programming tab and Mini Coach:

- Renamed Resources tab to Programming while keeping internal `resources` tab id for compatibility.
- Added editable Programming/session planner.
- Added drag/drop activity legs across Starters, Sessions, Cool-downs.
- Added section target minutes and coach notes.
- Added compact time pills and fixed spinner arrow behaviour.
- Expanded athletics/PE catalogue to 21 session plans.
- Added expandable lesson legs with practical breakdowns.
- Added source/curriculum links.
- Moved Mini Coach from inline resource block to bottom-left floating widget.
- Made Mini Coach open upward so the chat input stays visible.
- Added adaptive local suggestions based on selected activities and timing.
- Added local chat answers from the built-in catalogue.
- Added program generation from a staff goal.
- Polished Mini Coach into cleaner grouped panels.
- Added quick-action chips for common staff tasks.
- Added `docs/claude-transition-plan.md` as the flow chart and checklist for preparing a Claude Code / second-agent handover by 2026-07-07.
- Added `docs/claude-first-review-brief.md` as the copy-paste first task for Claude Code or another second reviewer.
- Added simple GitHub-based two-PC workflow scripts and documentation so Jeremy can move between computers by running one start script and one finish script.
- Began Stage 1 stabilisation for the Claude transition plan:
  - ran the core smoke/backend/syntax checks
  - fixed phone clipping in Student Profile admin tools
  - changed public leaderboard tables to stacked mobile cards below 480px
  - normalised all HTML pages to `styles.css?v=108`
  - bumped the service worker cache to `gwynne-park-run-club-v147`
  - fixed the Mini Coach dark-mode button override
  - clicked through all Admin tabs from the real UI controls
  - verified key desktop and phone modal positioning for Student Edit, Sports, and Coach Tools
  - verified Mini Coach chat response through the visible Ask button
  - verified School Settings quick apply feedback and Training select-all behaviour
  - fixed Add Student so creating a student no longer auto-opens the barcode print window
  - verified deeper workflows: add student, edit modal, coach goals, training assignment save, calendar event creation, custom awards, challenges, scanner session/duplicate handling, student training completion, admin/student/parent login paths, kiosk exit, Programming catalogue, and Mini Coach program generation
- Completed Stage 3 Sports/Interschool QA:
  - verified the Sports tab command-centre layout
  - verified event popups at desktop, iPad, and phone widths
  - verified Junior, Intermediate, and Senior event eligibility filters
  - verified Ball Games division dropdown behaviour
  - verified consent checklist status options and save flow
  - verified Cross Country show/hide behaviour
  - verified Team List Summary fields
- Completed Stage 4 privacy/data readiness review:
  - updated privacy policy student-code wording
  - confirmed demo/local config defaults
  - checked for private browser-delivered credentials
  - confirmed parent view is read-only
  - confirmed medical notes are not exposed to public leaderboard or kiosk
  - confirmed backend readiness guards remain wired across sensitive write paths
- Completed Stage 5 automated checks with portal, goals, backend/live-style, scanner live-mode, Supabase staging, syntax, and diff whitespace checks passing.
- Tightened School Settings branding defaults:
  - Corso now has explicit default platform colour constants for school blue and uniform gold.
  - School colour changes only persist when a coach applies/saves them.
  - Reset to Corso defaults now clears the custom school override from local storage instead of saving another override object.
  - The shared theme script and admin dashboard colour tokens stay aligned so custom colours apply site-wide.
- Condensed the Admin Dashboard navigation:
  - Sports, Training, Programming, and Coach Tools now live inside one top-level Coach Hub.
  - Coach Hub has internal Sports, Training, Programming, and Insights pills.
  - Existing deep links such as `?tab=sports`, `?tab=training`, `?tab=resources`, and `?tab=future-intelligence` still open the correct Coach Hub section.
  - Phone Coach Hub summary tiles now condense into a two-column layout so the hub intro is shorter and easier to scan.
  - Reports, School Settings, Import, and Help now live inside one top-level School Admin workspace.
  - School Admin has internal Reports, Settings, Import, and Help pills.
  - Existing deep links such as `?tab=reports`, `?tab=school-settings`, `?tab=import`, and `?tab=help` still open the correct School Admin section.
  - The top admin menu is now reduced to eight daily-level areas: Scanner, Students, Coach Hub, Leaderboard, Activity, Events, Awards, and School Admin.

Current relevant asset versions:

- HTML pages load `styles.css?v=120`
- HTML pages load `theme.js?v=15`
- `admin.html` loads `admin.js?v=5`
- `admin-dashboard.html` loads `admin-dashboard.js?v=86`
- `service-worker.js` cache is `gwynne-park-run-club-v168`

## Current Transfer Point - 2026-06-24

Corso is ready for a structured Claude/second-agent handover after one more beta-safety feature pass. The important point is that the platform is feature-rich but still beta/demo only.

Recently completed:

- Added `about.html`.
- Linked About Us from the home portal grid and shared footers.
- Added About page to PWA cache and smoke checks.
- Added `CLAUDE_HANDOVER.md`.
- Added `docs/beta-tester-checklist.md`.
- Added Beta Share Mode banner and documented fine-tune/add/dilute candidates in `docs/beta-readiness-sweep.md`.
- Added lightweight beta-prep helpers:
  - Admin demo data safety banner.
  - Help tab Beta Testing Toolkit.
  - Export demo snapshot button.
  - Reset demo data button with confirmation.
  - First-Time Admin Guide.
  - Feature Status badges.
  - Page Health labels.
  - Page-aware Send Feedback footer links.
  - Homepage "What This Is / What This Is Not Yet" beta explanation.
  - Print-friendly About/Privacy styling.
- Added `docs/beta-prep-completion-report.md` after a browser/automated beta prep sweep on 2026-06-25.
- Desktop browser sweep passed for home, about, privacy, student, parent, leaderboard, kiosk, and key admin deep links.
- Phone-width browser sweep passed for home, about, student profile, admin help, sports, programming, and kiosk.
- Remaining beta items are external/manual: real phone/iPad camera scan, Bluetooth scanner, browser-native print/download confirmations, hosted demo deployment, Supabase production/Auth/RLS, and school approval.

Still demo/local-only:

- Browser/localStorage student, scan, training, guardian, compliance, and school settings data.
- Demo admin/site-code login.
- Parent guardian access links.
- Mini Coach recommendations.
- Compliance sign-off workflow.
- Compass import.

Live blockers:

- Supabase Auth is not fully live.
- Row-level security needs final implementation and proof.
- School/site scoping needs production proof.
- No real student data should be entered.
- Demo/localStorage areas still exist.
- School approval, parent communication, retention/deletion decisions, and breach-response pathways must be confirmed.

Feature status summary:

| Feature area | Status | Notes |
| --- | --- | --- |
| Home/About/Privacy | Done | About page, Privacy Policy, beta banner, and support widget exist. |
| Admin dashboard | Done | Works as a static demo; `admin-dashboard.js` needs future modularisation. |
| School/site login | Skeleton | Username/site-code model exists; production Auth still required. |
| Students roster | Done | Demo/local with backend adapter paths started. |
| Scanner/kiosk | Needs manual test | Code checks pass; test real phone/iPad/scanner before beta. |
| Student profile | Done | Includes timeline, awards, training checklist, barcode, medical. |
| Parent portal | Needs backend | Read-only demo exists; production guardian linking still required. |
| Coach Hub | Done | Sports, Training, Programming, and Insights grouped. |
| Sports/Interschool | Needs manual test | Feature-rich and high-value; always re-test division filters after edits. |
| Training assignment | Done | Student to-do checklist exists. |
| Programming/Mini Coach | Skeleton | Useful rule-based planning assistant; not production AI. |
| Awards/certificates | Needs manual test | Print/PDF flows need browser click-through. |
| Compliance workspace | Skeleton | Evidence/posture tools exist; cannot automatically certify a school. |
| Supabase backend | Needs backend | Adapter and tests exist; production project/auth/RLS not complete. |
| Native app/App Store | Later | PWA/beta first. |

Priority 9 update:

- Shared smart-coach insight engine now calculates needs-attention students, close-to-award runners, unopened training, PB markers, class trends, celebration candidates, and next-best admin actions from existing local data.
- Coach Tools cards now pull counts and modal rows from that one engine instead of separate duplicated list logic.
- Coach Tools modals now include status, category, and follow-up-date controls for staff notes.
- Insight rows now support Note, Follow up, and Resolve actions with local workflow state stored under `rc_coach_followups`.
- Mini Coach-style modal summaries now explain the current row count, resolved items, and outstanding follow-ups before staff decide what to do next.
- Coach Tools modal summaries now include safe staff-reviewed next steps for needs attention, close-to-award, unopened training, PBs, class trends, and celebration candidates.
- Mini Coach remains staff-reviewed and rule-based at this stage; no autonomous production AI advice should be treated as live.

## Suggested Next Steps

Highest-value next work:

1. Run Claude/second-agent first job: code review and bug/risk audit.
2. Discuss the review before allowing a large `admin-dashboard.js` refactor.
3. Decide whether to freeze feature-building and move into beta hardening.
4. Finish Supabase live configuration only when school/privacy requirements are settled.
5. Create a controlled demo deployment with demo data only.
6. Run the beta QA checklist on laptop, phone, iPad and scanner workflows.
7. Jeremy completes the final manual browser/school sign-off list near launch.

## Suggested Claude Code / Second-Agent Handover Point

Detailed transition checklist:

- `docs/claude-transition-plan.md`

A second code agent such as Claude Code would be useful for:

- large code review
- modular refactor
- Supabase/RLS security review
- bug sweep
- pre-beta hardening
- app packaging research

Recommended timing:

- Keep fast UX/product iteration in this Codex thread.
- Bring in a second agent when the goal changes from “keep shaping features” to “clean, harden, modularise and prepare for real users”.
- Current target date for that decision point is 2026-07-07.

## Verification Commands Last Used

```powershell
npm test
node --check admin-dashboard.js
git diff --check
```

These passed after the Priority 9 Coach Tools workflow-state pass.
