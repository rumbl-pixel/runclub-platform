# Supabase Staging Checklist

Use fake staging data only until Priority 0 is complete.

## 1. Create Staging Project

Install the Supabase CLI before running the local commands below. Create a Supabase project for staging, then apply the migrations:

```bash
npm install
npm run supabase:start
```

For hosted staging, create a Supabase project for staging, then apply the migrations:

```bash
supabase link --project-ref your-staging-project-ref
supabase db push
```

For local Supabase testing:

```bash
supabase start
supabase db reset
npm run supabase:lint
```

## 2. Seed Fake Data

Apply the staging seed after migrations through the Supabase SQL editor, or with `psql` connected to the staging database:

```bash
psql "$SUPABASE_DB_URL" -f supabase/seed.staging.sql
```

The staging school id is:

```text
10000000-0000-4000-8000-000000000001
```

## 3. Deploy Edge Functions

Deploy the browser-facing function routes:

```bash
supabase functions deploy student_auth
supabase functions deploy csv_import
```

Set required server-side secrets for Edge Functions in Supabase:

```bash
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Service-role keys belong only in Supabase Edge Function secrets, never in `config.js` or static files.

## 4. Run Live-Style Check

From this repo, run:

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your-public-anon-key \
RUN_CLUB_SCHOOL_ID=10000000-0000-4000-8000-000000000001 \
RUN_CLUB_STUDENT_CHECK_CODE=STAGING1 \
npm run check:supabase-live-style
```

Expected result:

```json
{
  "ok": true
}
```

## 5. RLS Sanity Checks

Before connecting real screens to staging:

- anon REST reads should fail or return no private school data unless allowed by policy
- staff-authenticated reads should return only the staging school
- `student_auth` should return only the barcode-matched staging student
- `csv_import` should validate rows in `dry_run` before upserting

Do not enter real student data until Priority 0 is complete.
