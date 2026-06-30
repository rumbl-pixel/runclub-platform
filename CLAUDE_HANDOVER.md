# Claude Start Here - Corso Launch Proof Handover

Last updated: 2026-06-30

This handover is the current source of truth for the next Claude/Codex agent. Do not restart the design, product direction, or feature set. The active stage is launch proof and security hardening before any real student data is imported.

## Immediate Instruction

Start by preserving the current work. Do not begin a broad redesign, rewrite, or new feature sprint.

Current priority:

1. Keep the public/browser build demo locked until Jeremy explicitly approves live mode.
2. Keep real student data blocked until production Auth, RLS, school isolation, parent linking, and local/demo lockout have been proven and signed off.
3. Continue security-first setup, manual QA, and deployment readiness.
4. If changing code, use small scoped changes and verify with tests.
5. After every user-facing response, show the July 20 readiness checklist at the end.

Required checklist format:

- ~~Supabase production configured~~
- ~~Auth enabled and verified~~
- ~~RLS policies verified~~
- ~~School/site isolation proven~~
- ~~Parent linking proven~~
- ~~Demo/local lockout before real student data~~
- Real student data import approved only after above proof

## Product Snapshot

Corso is a privacy-first school run club and athletics platform. It supports staff-led lap scanning, rosters, awards, student goals, events, training tasks, interschool athletics, cross country, reports, parent visibility, student visibility, and school compliance evidence.

Product principles:

- No ads.
- No student emails.
- No student self-reporting of activity.
- Staff/coaches manage activity records.
- Students can see only their own profile.
- Parents can see only linked child/children.
- Schools can see only their own students.
- Kiosk/scanner surfaces are staff/admin controlled.
- Medical and safety notes must not appear on public leaderboards or kiosk surfaces.
- Service-role keys and private credentials must never reach browser-delivered files.

The original school-specific build was for Gwynne Park Run Club, but Corso is now a multi-school platform direction with strict school/site isolation.

## Repo And Runtime

- GitHub repo: `rumbl-pixel/runclub-platform`
- Local workspace: `C:\Users\jerem\Documents\Codex\runclub-platform`
- Hosted demo beta: `https://corso-platform.pages.dev/`
- Typical local URL: `http://127.0.0.1:8080`

Run locally:

```powershell
cd C:\Users\jerem\Documents\Codex\runclub-platform
python -m http.server 8080
```

Important files:

- `index.html` - public portal/home.
- `about.html` - About Corso.
- `privacy-policy.html` - privacy policy.
- `admin.html` - admin login.
- `admin-dashboard.html` - main admin console.
- `admin-dashboard.js` - main admin feature logic; large file, avoid broad refactor unless asked.
- `student.html` and `student-profile.html` - student access and profile shell.
- `student.js` - student profile and award print logic.
- `parent.html` and `parent.js` - guardian portal and award print logic.
- `kiosk.html`, `kiosk.js`, `kiosk.css` - scanning kiosk.
- `leaderboard.html`, `leaderboard.js` - public leaderboard.
- `interschool-team.html`, `interschool-team.js` - supplementary interschool team page.
- `styles.css` - global styling/theme/layout.
- `theme.js` - theme toggle, dynamic avatar initials, school chip label.
- `backend.js` - backend/live-style adapter.
- `config.js` - public browser config. Must stay public-safe.
- `supabase/migrations` - Supabase schema/RLS/RPC migrations.
- `supabase/functions` - Supabase Edge Functions.
- `scripts/supabase-production-readiness-check.js` - production safety check.
- `scripts/provision-supabase-school.js` - school/coach provisioning helper.
- `docs/supabase-production-runbook.md` - production runbook.
- `docs/handover-summary.md` and `docs/roadmap-progress.md` - older but useful historical context.

## Current High-Level State

Core tracked product priorities are functionally complete. The active lane is no longer feature expansion; it is launch proof:

- Supabase production setup.
- Staff Auth.
- RLS proof.
- School/site isolation.
- Parent/guardian linking.
- Demo/local lockout before real student data.
- Manual device/browser print checks.
- School approval and parent communication before import.

Do not import real student data yet. The final checklist item remains intentionally incomplete until Jeremy explicitly approves a real data import after proof review.

## Supabase Production State

Supabase is configured and proven against the live project.

Project:

- Name: `Corso`
- Project ref: `bwsjugqwcxyisvfeuwqq`
- Region: Southeast Asia (Singapore)
- First provisioned school: `Gwynne Park Primary School`
- Site code: `1001`
- School id: `c013a13d-644a-40a9-b553-80c46e5389fe`
- Coach username: `coach01`
- Coach auth email: `coach01@corso.local`

Important: the coach password was generated internally during proof work and was not printed. Before human login testing, reset/set a password for `coach01@corso.local` in the Supabase Dashboard UI.

Production migrations:

- Remote and local migrations are aligned through `202606300001_guardian_link_rpc_qualification.sql`.
- That newest migration fixes ambiguous column references in guardian RPCs by fully qualifying table aliases.

Edge Functions deployed:

- `student_auth`
- `guardian_access`
- `csv_import`

Edge Function secrets:

- Supabase CLI blocks custom secrets starting with `SUPABASE_`.
- Functions now support `CORSO_SUPABASE_URL` and `CORSO_SUPABASE_SERVICE_ROLE_KEY`, with fallback to the platform-provided names.
- Do not print, commit, or expose service-role keys.

## Live Security Proof Completed

Fake proof data was created and then cleaned up.

Verified:

- Coach Auth works.
- RLS exposes only the coach's school.
- Anonymous student table reads are blocked.
- Guardian access returns only the linked child.
- Wrong-school guardian access is denied.
- `csv_import` rejects requests without a valid staff bearer token.
- Visible student barcode proof showed only the own-school fake student.

Fake proof cleanup completed:

- Guardian links matching `GP-SECURITY1-*`.
- Scan audit rows for `SECURITY1` and `SECURITY2`.
- Fake students `SECURITY1` and `SECURITY2`.
- Fake isolation school slug `corso-isolation-test-school`.

## Browser Config Lockout

`config.js` intentionally remains demo locked:

```js
demoMode: true
syncEnabled: false
liveDataMode: false
```

This is correct. Do not enable live mode or sync for the public browser build unless Jeremy explicitly approves it. Even after live backend proof, real student data import remains blocked until the final readiness item is approved.

## Security Workflow Warning

Microsoft Defender flagged the Codex computer-use helper during this work:

- Detection: `Trojan:Win32/ClickFix.DE!MTB`
- Root cause assessment: Defender matched command-line/transcript content passed to `codex-computer-use.exe`, likely because prior messages included user instructions about manually pasting PowerShell/environment commands.
- Defender status after checks: threat inactive.
- The exact local helper executable was removed:
  `C:\Users\jerem\AppData\Local\OpenAI\Codex\runtimes\cua_node\1b23c930bdf84ed6\bin\node_modules\@oai\sky\bin\windows\codex-computer-use.exe`
- No other `codex-computer-use.exe` copies were found under `C:\Users\jerem\AppData\Local\OpenAI\Codex`.
- A targeted Defender scan of that runtime folder completed.

Rules for the next agent:

- Do not use the computer-use helper in this thread.
- Do not ask Jeremy to paste long PowerShell commands for secrets or environment variables.
- Prefer running safe local verification commands yourself.
- Never print tokens, passwords, anon/service-role keys beyond public-safe config values.
- If user action is required for secrets, prefer GUI-first steps such as Supabase Dashboard instructions.
- Do not suggest Defender exclusions for the Codex runtime.

## Recent UI/UX Work Completed

Do not redo this from scratch. The user asked for a site-wide visual sweep, contrast fixes, clearer icons, logo changes, and print checks.

Completed:

- Logo recolored from orange to the platform blue.
- Logo background made transparent in `assets/corso-logo.png`.
- Logo click-to-dashboard restored on `admin-dashboard.html` and `interschool-team.html`.
- Theme/contrast toggle moved directly underneath the logo via `theme.js` and CSS.
- Favicon links added across pages.
- Whole-site contrast and clipping fixes in `styles.css`.
- Ko-fi/support widget overflow fixed.
- Coach quick action tiles now use dark text/icons by default and blue on hover.
- Home `command-primary` button text forced to white, including `-webkit-text-fill-color`.
- Portal grid icons replaced with larger labeled badges so the sections are clearer.
- Home top-right `CB` avatar now derives initials from the logged-in admin session.
- Home school chip is no longer a pointless button; it reflects the configured school/run club name.
- Index stylesheet cache version was bumped.

Award/print loading issue:

- Print stuck-loading path was fixed by adding `schedulePrintWindow` handling in:
  - `admin-dashboard.js`
  - `student.js`
  - `parent.js`

Remaining manual print proof:

- A human should still click through real browser print/download flows for award certificates and barcode cards on the final device/browser set.

## CSV Import Security Hardening

`supabase/functions/csv_import/index.ts` was hardened:

- Extracts bearer token from the `Authorization` header.
- Validates `school_id` UUID shape.
- Calls `supabase.auth.getUser(token)`.
- Allows active platform admins.
- Otherwise requires `school_users.role = coach` for the requested `school_id`.
- Rejects missing or invalid staff tokens.
- Rejects access to an unauthorized school.

Readiness checker now includes an Edge service-role guard scan to flag service-role Edge Function writes without staff bearer auth, except approved public lookup functions:

- `student_auth`
- `guardian_access`

## Verification Completed

Latest verification passed:

```powershell
npm test
node --check scripts\supabase-production-readiness-check.js
git diff --check
npm run build:cloudflare
supabase migration list --linked
```

Notes:

- `npm test` passed all current tests, including portal smoke, goals baseline, backend live-style, scanning live-mode, Supabase staging, and sync workflow.
- `git diff --check` passed with only line-ending warnings.
- Cloudflare Pages bundle built successfully into `dist-pages`.
- Supabase migration list showed local and remote aligned through `202606300001`.

## Current Git Working Tree

There are uncommitted changes from the UI sweep and Supabase hardening. Do not revert them unless Jeremy explicitly asks.

Modified:

- `about.html`
- `admin-dashboard.html`
- `admin-dashboard.js`
- `admin.html`
- `assets/corso-logo.png`
- `docs/supabase-production-runbook.md`
- `index.html`
- `interschool-team.html`
- `kiosk.html`
- `leaderboard.html`
- `parent.html`
- `parent.js`
- `privacy-policy.html`
- `scripts/supabase-production-readiness-check.js`
- `student-profile.html`
- `student.html`
- `student.js`
- `styles.css`
- `supabase/functions/csv_import/index.ts`
- `supabase/functions/guardian_access/index.ts`
- `supabase/functions/student_auth/index.ts`
- `tests/portal-smoke.test.js`
- `tests/supabase-staging.test.js`
- `theme.js`

Untracked:

- `supabase/migrations/202606300001_guardian_link_rpc_qualification.sql`

Before committing or deploying, review the diff and keep the commit message focused on launch proof/security/UI polish.

## What Must Not Be Broken

- Public browser files must not include service-role keys or private credentials.
- `config.js` must remain public-safe.
- Demo/local lockout must remain in place until explicit approval.
- Do not seed or import real student data.
- Do not expose medical notes on leaderboard/kiosk/public surfaces.
- Do not allow students to self-report activity.
- Do not make scanner/kiosk publicly usable without staff/admin context.
- Do not break deep links:
  - `?tab=sports`
  - `?tab=training`
  - `?tab=resources`
  - `?tab=school-settings`
  - `?tab=help`
- Do not let interschool athletics or cross-country scans add Run Club laps.
- Preserve Sports/Interschool eligibility:
  - Junior events: Years 1-2 only.
  - Intermediate events: Years 3-4 only.
  - Senior events: Years 5-6 only.

## Manual QA Still Worth Doing

The code proof is strong, but final launch proof still needs real device/browser checks:

- Real phone camera scan.
- Real iPad camera scan.
- Bluetooth scanner input.
- Barcode card print/download proof.
- Award certificate print/download proof.
- Fake roster import rehearsal through the real UI.
- Coach login test after Supabase Dashboard password reset.
- Cloudflare deployment check if moving beyond local build.

## Next Sensible Work

Recommended next sequence:

1. Review the current diff and make sure no accidental files or secret values are present.
2. Commit the launch-proof/security/UI changes if Jeremy wants a checkpoint.
3. Reset/set the password for `coach01@corso.local` in Supabase Dashboard.
4. Perform human login proof as `coach01`.
5. Run the real-device scanning and print/download checks.
6. Prepare live public config only after Jeremy approves moving from demo lock to controlled live trial.
7. Keep real student data import blocked until Jeremy explicitly approves the final checklist item.

## Useful Commands

Safe local checks:

```powershell
cd C:\Users\jerem\Documents\Codex\runclub-platform
npm test
node --check scripts\supabase-production-readiness-check.js
git diff --check
npm run build:cloudflare
```

Supabase checks, without printing secrets:

```powershell
cd C:\Users\jerem\Documents\Codex\runclub-platform
npx supabase migration list --linked
```

If a token is needed, first check whether it exists without printing it. Prefer in-process environment bridging rather than asking Jeremy to paste commands.

## Older Docs To Read For Context

Read these after this handover if more history is needed:

- `docs/handover-summary.md`
- `docs/roadmap-progress.md`
- `docs/supabase-production-runbook.md`
- `docs/access-model-decision.md`
- `docs/backend-stack-decision.md`
- `docs/education-compliance-readiness.md`
- `docs/claude-first-review-brief.md`

Some older docs may still describe Supabase/Auth/RLS as pending. This handover is newer and supersedes those older statements where they conflict.

## Final Reminder

The platform is now past the broad build stage and into proof, security, and controlled launch. Be conservative. Protect student privacy first, avoid broad visual redesigns, keep browser config demo locked, and do not import real student data until Jeremy explicitly approves the last readiness gate.
