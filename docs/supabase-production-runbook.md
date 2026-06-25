# Supabase Production Runbook

Use this only when preparing a real school deployment. Until school approval, parent communication, RLS proof, and roster rehearsals are complete, keep the public site in demo mode and do not enter real student data.

## What This Completes

- Creates a hosted Supabase project for Corso production.
- Applies the existing Corso schema and RLS migrations.
- Deploys the browser-facing Edge Functions.
- Creates a school record.
- Creates an invite-only coach account with an assigned username and 4-digit Site code.
- Adds the coach to only that school's `school_users` row.
- Records the invite in `staff_invites`.

## Required Decisions

- Production project name: recommended `corso-production`.
- Region: recommended `ap-southeast-2` for Western Australia.
- Instance size: start with `nano` or `micro` for beta.
- Site code: 4 digits per school, for example `1001`.
- Coach username: assigned username, for example `coach01`.
- Auth username domain: default `corso.local`.

## 1. Log In To Supabase CLI

Create a Supabase access token in the Supabase dashboard, then run:

```powershell
cd C:\Users\jerem\Documents\Codex\runclub-platform
npx supabase login
```

Or set it for the current terminal session:

```powershell
$env:SUPABASE_ACCESS_TOKEN='paste-access-token-here'
```

Do not commit this token.

## 2. Create The Production Project

List your organizations:

```powershell
npx supabase orgs list
```

Create the project:

```powershell
npx supabase projects create corso-production --org-id YOUR_ORG_ID --db-password "use-a-long-unique-password" --region ap-southeast-2 --size nano
```

When Supabase returns the project ref, link the repo:

```powershell
npx supabase link --project-ref YOUR_PROJECT_REF
```

## 3. Apply Migrations

```powershell
npx supabase db push
```

Then deploy Edge Functions:

```powershell
npx supabase functions deploy student_auth
npx supabase functions deploy csv_import
npx supabase functions deploy guardian_access
```

Set Edge Function secrets:

```powershell
npx supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Service-role keys belong only in local shell variables or Supabase secrets. Never add them to `config.js`, Cloudflare public variables, GitHub, or browser files.

## 4. Provision The First School Coach

Copy the public anon key and service-role key from Supabase project settings. Set local environment variables:

```powershell
$env:SUPABASE_URL='https://YOUR_PROJECT_REF.supabase.co'
$env:SUPABASE_ANON_KEY='YOUR_PUBLIC_ANON_KEY'
$env:SUPABASE_SERVICE_ROLE_KEY='YOUR_SERVICE_ROLE_KEY'
$env:CORSO_SCHOOL_NAME='Gwynne Park Primary School'
$env:CORSO_SITE_CODE='1001'
$env:CORSO_COACH_USERNAME='coach01'
$env:CORSO_COACH_PASSWORD='use-a-long-temporary-password'
$env:CORSO_COACH_DISPLAY_NAME='Run Club Coach'
```

Check readiness without printing secret values:

```powershell
npm run check:supabase-production
```

Provision the school and first coach:

```powershell
npm run provision:supabase-school
```

The script prints only public config values and does not print the password.

If the Auth user already exists, set:

```powershell
$env:CORSO_COACH_AUTH_USER_ID='existing-auth-user-uuid'
```

then run the provision command again.

## 5. Enable The Site For This School

Only after backend proof, put public values into `config.js` or Cloudflare Pages public environment/build config:

```js
window.RUN_CLUB_CONFIG = {
  demoMode: false,
  betaShareMode: true,
  syncEnabled: true,
  liveDataMode: false,
  schoolId: "SCHOOL_UUID",
  siteCode: "1001",
  schoolSites: {
    "1001": "SCHOOL_UUID"
  },
  authUsernameDomain: "corso.local",
  supabaseUrl: "https://YOUR_PROJECT_REF.supabase.co",
  supabaseAnonKey: "PUBLIC_ANON_KEY",
  endpoints: {
    studentAuth: "https://YOUR_PROJECT_REF.supabase.co/functions/v1/student_auth",
    csvImport: "https://YOUR_PROJECT_REF.supabase.co/functions/v1/csv_import"
  }
};
```

Keep `liveDataMode: false` until all July 20 readiness checks are complete.

## 6. Required Proof Before Real Student Data

- Coach logs in with Site code plus assigned username.
- Coach can see only their school.
- Coach cannot see another school's rows.
- Platform admin remains separate and owner-only.
- Anonymous REST reads do not expose private student data.
- `student_auth` returns only the matched student for the configured school.
- `csv_import` dry run validates a fake roster before writing.
- Guardian access is child-only and audited.
- No service-role key exists in browser-delivered files.

## 7. Useful Commands

```powershell
npm run check:supabase-production
npm run provision:supabase-school
npm run check:supabase-live-style
npm test
```
