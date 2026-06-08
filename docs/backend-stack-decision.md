# Backend Stack Decision

Decision date: 2026-06-08

## Decision

Use Supabase as the production backend for Gwynne Park Run Club:

- Database: Supabase Postgres.
- Auth: Supabase Auth for staff/admin accounts first, then parent and student access models.
- Authorization: Postgres Row Level Security on every school-data table before real student data is entered.
- Server-side workflows: Supabase Edge Functions for sensitive actions such as CSV import, student/parent access token exchange, scan writes that need validation, and future reports that should not trust browser-only calculations.
- Local development: Supabase CLI migrations and local project tooling.
- Frontend deployment: keep the current static HTML/CSS/JS app deployable as a static site while Priority 3 replaces localStorage with backend access. A later Next.js/Lovable migration remains optional, not required for the backend cutover.

## Why This Fits

The current app is already structured around a safe public `config.js`, Supabase endpoint placeholders, and local-first storage. Supabase lets us replace localStorage in slices without rebuilding the whole frontend at once.

This is also the best fit for the privacy direction:

- Postgres gives us relational records for schools, users, students, sessions, scans, awards, goals, training tasks, and audit logs.
- Row Level Security keeps school data scoped at the database layer, not only in JavaScript.
- Auth JWTs can carry user identity into RLS-backed database requests.
- Edge Functions give us a safer place for service-role work and validation that must not run in the browser.

## Deployment Target

For Priority 3, target:

- Supabase hosted project for database, auth, RLS policies, storage if needed later, and Edge Functions.
- Static frontend hosted from the existing repo while the app remains vanilla HTML/CSS/JS.
- Environment values:
  - Public browser-safe values stay in `config.js` or a generated config.
  - Private service-role keys never go into browser-delivered files.
  - Local-only overrides stay in `config.local.js`, which is already gitignored.

## Guardrails

- No real student roster should be entered until Priority 0 is complete.
- Every table containing school, student, parent, scan, training, goal, award, or audit data must have RLS enabled before browser access.
- Service-role keys are allowed only in server/Edge Function environments.
- Demo mode stays available until the backend flow is working, then Priority 0 removes universal `DEMO` access before launch.
- Offline scanning must use idempotency keys before writing to production tables.

## Next Priority 3 Step

Proceed to 3.2: create the database schema for schools, users, school users, groups, students, laps, sessions, awards, challenges, devices, and audit logs. Include the new training tables in that schema:

- `training_assignments`
- `training_assignment_students`
- `training_link_events`

## References

- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase CLI local development: https://supabase.com/docs/guides/local-development/cli/getting-started
