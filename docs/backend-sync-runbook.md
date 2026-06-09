# Backend Sync Runbook

Priority 3 moves the platform from single-browser demo storage toward Supabase-backed cross-device use. The browser still defaults to safe demo mode until real Supabase credentials, staff authentication, and Priority 0 launch controls are ready.

## localStorage Cutover

The app now loads `backend.js`, which exposes `window.RunClubBackend`.

- `config.js` keeps demo mode on by default.
- Production sync requires `syncEnabled: true`, a Supabase project URL, an anon key, and a `schoolId`.
- Existing screens can keep reading local demo data while the backend adapter queues scan mutations and provides async Supabase data access.
- No private database keys or elevated server credentials belong in browser-delivered files.

Cutover order:

1. Apply all Supabase migrations.
2. Create the school row and staff users.
3. Confirm RLS policies against staff accounts.
4. Add browser-safe public config values.
5. Enable `syncEnabled`.
6. Migrate demo roster and historical records.
7. Keep demo access disabled before real student data is entered.

Staging setup starts with fake data:

```bash
supabase link --project-ref your-staging-project-ref
supabase db push
supabase db reset
```

Deploy the first Edge Functions:

```bash
supabase functions deploy student_auth
supabase functions deploy csv_import
```

Seed only fake staging data from `supabase/seed.staging.sql`. See `docs/supabase-staging-checklist.md` before connecting the UI to staging.

## Scan Sync And Conflicts

Every successful local scan now receives an `idempotency_key` and is queued through `RunClubBackend.enqueueMutation`.

- Direct scans and offline batches can share the same mutation pipeline.
- The Supabase `record_lap_scan` function enforces one lap per `(school_id, idempotency_key)`.
- Duplicate idempotency attempts are recorded as `conflict` outcomes in audit metadata.
- Network failures remain queued locally until a later sync attempt.

## Backend Reports

The second migration adds report-ready views:

- `leaderboard_totals`
- `student_progress_summary`

These mirror current local reports and give the app a backend-powered path for leaderboards, student progress, inactive-student review, and admin insights.

## Live-Style Supabase Checks

The repo now has two backend checks:

- `npm test` runs a fake Supabase contract test so Edge Function and REST request shapes stay stable without needing a real project.
- `npm run check:supabase-live-style` runs the same adapter against a staging Supabase project when local environment values are present.

Required local environment values for staging:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
RUN_CLUB_SCHOOL_ID=your-school-uuid
```

Optional values:

```bash
SUPABASE_STUDENT_AUTH_URL=https://your-project.supabase.co/functions/v1/student_auth
RUN_CLUB_STUDENT_CHECK_CODE=DEMO-CHECK
RUN_CLUB_EDGE_FUNCTION=student_auth
```

The live-style check verifies:

- public anon-auth REST access to the school-scoped `students` table
- anon-auth Edge Function access through `student_auth` or another configured function
- browser-safe headers only, with no service-role credentials

Keep staging data fake until Priority 0 is complete. Do not paste service-role keys into `config.js`, environment variables used by this browser check, or any static asset.

## Backup/Export Jobs

The `backup_exports` table tracks manual or scheduled backup/export jobs.

Recommended production flow:

1. Staff requests an export from the admin portal.
2. A server-side job gathers school-scoped rows only.
3. The job writes a protected file to private storage.
4. `backup_exports.status`, `storage_path`, `row_counts`, and timestamps are updated.
5. Download access is staff-only and expires.

Browser-only export remains useful for demo mode, but production backups should run server-side.

## Demo Data Migration

`RunClubBackend.migrationPayloadFromLocalStorage()` packages browser demo data for migration.

The payload includes:

- roster
- scan audit
- sessions
- goals
- training assignments and link events
- manual adjustments

The `demo_data_imports` table records received payloads, validation status, import status, and conflict count. Real imports should be reviewed before writing to production student records.

## Production Notes

Priority 3 provides the bridge. Priority 0 is still the live-data gate:

- real staff auth
- role permissions
- school-scoped access
- removal of universal `DEMO`
- consent, retention, deletion, and incident processes
