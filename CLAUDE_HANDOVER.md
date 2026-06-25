# Claude Start Here - Corso

Last updated: 2026-06-25

## What Corso Is

Corso is a privacy-first school run club and athletics platform. It helps staff track laps, attendance, awards, student goals, training tasks, interschool athletics teams, cross country, programming sessions, reports, parent/student visibility, and school compliance readiness.

The product is currently a beta/demo static web app with local-first data and Supabase/live-style paths started. It must not be treated as production-ready for real student data yet.

## Current Repo

- GitHub: `rumbl-pixel/runclub-platform`
- Local path: `C:\Users\jerem\Documents\Codex\runclub-platform`
- Local URL: `http://127.0.0.1:8080`
- Hosted demo beta: `https://corso-platform.pages.dev/`
- Run locally:

```powershell
cd C:\Users\jerem\Documents\Codex\runclub-platform
python -m http.server 8080
```

## What Has Been Built

- Public home page, About page, Privacy Policy, beta demo banner, homepage beta explainer, Ko-fi support widget.
- Admin login and Admin Dashboard.
- School-scoped staff/site-code login model skeleton.
- Student login and student profile.
- Parent read-only portal.
- Scanner and kiosk scanner.
- Students roster management, barcodes, CSV import, guardian demo links.
- Leaderboards by whole school, division, and year group.
- Awards, certificates, custom awards, challenges, badges.
- Events calendar with school-holiday/challenge surfaces.
- Coach Hub combining Sports, Training, Programming, and Insights.
- Sports/Interschool Athletics command centre with consent, event teams, team list summary, results, PBs, house points, and Cross Country toggle.
- Training assignment flow with student checklist completion.
- Programming/session builder with athletics PE catalogue, drag/drop lesson legs, editable timings, and Mini Coach planning widget.
- Compliance workspace with vendor posture, signup/use attestation, evidence exports, parent notice, breach log, and launch readiness checks.
- School Settings for school name, logo, colour override, reset to Corso defaults.
- Beta Testing Toolkit in Admin Help with demo snapshot export, confirmed demo reset, first-time admin guide, feature status badges, page health labels, and tester checklist link.
- Cloudflare Pages hosted demo beta:
  - `wrangler.toml`
  - `_headers`
  - `docs/cloudflare-pages-deploy.md`
  - `scripts/build-cloudflare-pages.js`
  - npm scripts `cloudflare:check`, `deploy:cloudflare`, and `deploy:cloudflare:preview`
  - Cloudflare Pages project: `corso-platform`
  - URL: `https://corso-platform.pages.dev/`
- Supabase production setup helpers:
  - `docs/supabase-production-runbook.md`
  - `scripts/supabase-production-readiness-check.js`
  - `scripts/provision-supabase-school.js`
  - npm scripts `check:supabase-production` and `provision:supabase-school`
  - Production helper creates/updates a school, creates an assigned coach username in Supabase Auth, adds the school-scoped `coach` role, and records `staff_invites`.
- Backend adapter and live-style tests for future Supabase work.
- Claude transition plan, first-review brief, and beta-readiness sweep docs.
- Beta prep completion report at `docs/beta-prep-completion-report.md`.

## What Must Not Be Broken

- Privacy-first model:
  - No ads.
  - No student emails.
  - No student self-reporting activity.
  - Students see only their own profile.
  - Parents see only their own linked child/children.
  - Schools see only their own students.
  - Kiosk/scanner is staff/admin only.
- Demo/local mode must stay safe by default.
- Do not enter or seed real student data.
- Do not put service-role keys, private API keys, or school credentials in browser-delivered files.
- Keep `config.js` public-safe.
- Keep dark/light mode readable.
- Preserve existing deep links where practical, especially:
  - `?tab=sports`
  - `?tab=training`
  - `?tab=resources`
  - `?tab=school-settings`
  - `?tab=help`
- Sports/Interschool rules:
  - Junior events show Year 1-2 only.
  - Intermediate events show Year 3-4 only.
  - Senior events show Year 5-6 only.
  - Interschool training/attendance must not add Run Club laps.

## Privacy Rules

Real student data is blocked until all of these are finished:

- Production Supabase project configured.
- Staff Auth/invite flow implemented.
- Row-level security proven by tests.
- School/site scoping proven.
- Parent/guardian linking proven.
- Audit logs and breach process proven.
- Retention/deletion process chosen.
- School approval and parent communication completed.

## Known Skeleton Or Demo-Only Areas

- Supabase Auth is not fully live.
- Supabase production project is not created/linked in this repo yet because it requires Jeremy's Supabase access token, org ID, and database password.
- Supabase coach provisioning flow is implemented as a CLI helper, but has not been run against a real production project yet.
- RLS policies need final implementation and proof.
- School/site-code login is currently a demo/local model.
- Parent guardian access is demo/local until backend tokens are live.
- Mini Coach is rule-based/local. It is not production AI advice.
- Compass import is CSV/template direction only, not live Compass API integration.
- Compliance workspace supports evidence and sign-off posture, but does not make a school automatically compliant.
- App Store/native app packaging is later.

## Feature Status Table

| Area | Status | Notes |
| --- | --- | --- |
| Home/About/Privacy | Done | About page and beta safety messaging exist. |
| Beta testing toolkit | Done | Export demo snapshot, reset demo data, checklist, feedback, and status labels exist. |
| Admin dashboard shell | Done | Large file; future modularisation recommended. |
| Coach Hub | Done | Groups Sports, Training, Programming, and Insights. |
| Students roster | Done | Demo/local with backend paths started. |
| Scanner/kiosk | Needs manual test | Source checks pass; real phone/iPad/scanner checks still needed. |
| Student profile | Done | Includes timeline, awards, training checklist, barcode, medical. |
| Parent portal | Needs manual test | Read-only model exists; guardian backend flow still needed. |
| Leaderboards | Done | Whole school, divisions, year groups. |
| Awards/certificates | Needs manual test | Browser print/PDF flows need human click-through. |
| Events calendar | Done | Challenge and holiday surfaces exist. |
| Sports/Interschool | Needs manual test | Many features exist; high-risk area after edits. |
| Training assignment | Done | Student checklist completion exists. |
| Programming | Done | Lesson catalogue, drag/drop planner, Mini Coach helper. |
| Mini Coach | Skeleton | Useful local assistant, not production AI. |
| Compliance workspace | Skeleton | Vendor posture and evidence tools exist; school sign-off still external. |
| Supabase backend | Needs backend | Adapter/tests and production setup helpers exist; real project creation/linking still requires Supabase credentials. |
| Auth/RLS | Needs backend | Coach invite provisioning helper exists; RLS proof must be done before real student data. |
| Native app/App Store | Later | PWA first. |

## Next Build Order

1. Freeze feature expansion except small beta safety/guidance wins.
2. Complete real-device beta checks: phone camera, iPad camera, Bluetooth scanner, print/download confirmations.
3. Run a second-agent code review focused on bugs, privacy risks, and `admin-dashboard.js` modularisation.
4. Fix review findings before major refactor.
5. Build production Supabase Auth/RLS in a separate hardening pass.
6. Only after school approval and backend proof, consider real student data.

## Test Commands

```powershell
npm test
node --check admin-dashboard.js
node --check theme.js
npm run check:supabase-production
git diff --check
```

## Claude First Task

Start with a review, not a rewrite. Report file-referenced bugs, privacy risks, brittle flows, and missing tests. Then propose a modularisation plan for `admin-dashboard.js`. Do not refactor the whole app before discussing the review findings with Jeremy.
