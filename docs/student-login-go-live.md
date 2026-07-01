# Student Login Go-Live Plan

Scaffold for turning on per-student username + password login. Do this **only** when you are ready to move a school off demo mode. Until then the demo lock stays on and no real student data is entered.

This plan assumes the production Supabase project already exists and the repo is linked (see [supabase-production-runbook.md](supabase-production-runbook.md) sections 1–2). If it does not, do that runbook first, then come back here.

## What ships in this change

- New columns `students.username` + `students.user_id`, unique per school, plus read-only student RLS policies (migration `supabase/migrations/202607010001_student_login_accounts.sql`).
- `csv_import` Edge Function now creates a Supabase Auth login for each imported student, returns the plaintext password **once** in the response, and never stores it in plaintext.
- Student login page takes a username + password (barcode is now lap-tracking only).

## Design guardrails (do not "fix" these)

- Students are deliberately **not** added to `school_users` — that table's policies would leak every classmate. Student access is keyed on `students.user_id` and is **SELECT-only**.
- Passwords are generated server-side, shown once, handed out on a login card. There is no plaintext password store to look up later — if a card is lost, reset it (step 6).
- Synthetic login email domain is `CORSO_STUDENT_AUTH_DOMAIN` (default `students.corso.local`). These addresses are never emailed.

---

## 1. Apply the migration → verify

```powershell
cd C:\Users\jerem\Documents\Codex\runclub-platform
npx supabase db push
```

**Verify:** the `students` table shows `username` and `user_id` columns, and the unique indexes `uq_students_school_username` / `uq_students_user_id` exist. Check in the Supabase dashboard → Database → Tables → `students`, or run the app's readiness check (step 8).

## 2. Deploy the updated import function → verify

```powershell
npx supabase functions deploy csv_import
```

**Verify:** Supabase dashboard → Edge Functions → `csv_import` shows a fresh "Last deployed" timestamp.

## 3. Set the student auth domain secret → verify

```powershell
npx supabase secrets set CORSO_STUDENT_AUTH_DOMAIN=students.corso.local
```

**Verify:** `npx supabase secrets list` shows `CORSO_STUDENT_AUTH_DOMAIN` present (value is not printed — that is expected). The service-role + URL secrets from the production runbook (section 3) must already be set, or the function returns `missing_server_config`.

## 4. Rehearse with a fake roster (dry run first) → verify

Use a throwaway CSV of made-up students. **Dry run does not write anything** — it just validates.

- In the admin dashboard (staff logged in), open the CSV import and run the **dry-run/preview** first.

**Verify:** the preview reports the expected `valid_count` and any `skipped_details`, and **no** students appear in the roster yet.

## 5. Real import of the fake roster → verify credentials come back once

Run the non-dry-run import for the same fake CSV.

**Verify:**
- Response includes `credentials_created` > 0 and a `credentials` array with `username` + `password` per student.
- Those credentials are shown to you **once** — capture them now (print/download the login cards). They are not retrievable later.
- Re-running the same import does **not** create duplicate logins (rows with `user_id` are skipped).
- `credential_errors` is empty.

## 6. Test a real student login end-to-end → verify

- Open the student portal, sign in with one generated `username` + `password`.

**Verify:**
- Login succeeds and lands on that student's profile.
- The student sees **only their own** laps/awards/goals — no classmates.
- A wrong password is rejected.
- (Lost card) Re-issuing: reset that student's password via Supabase Auth (dashboard → Authentication → Users → the student's `@students.corso.local` user → reset), or re-run import after clearing that row's `user_id`. Confirm the new password works and the old one does not.

## 7. Clean up the rehearsal → verify

Delete the fake students and their Auth users so no test data lingers.

**Verify:** roster is empty of the fake names and their `@students.corso.local` Auth users are gone.

## 8. Flip the school live → verify

Only after steps 1–7 pass, follow [supabase-production-runbook.md](supabase-production-runbook.md) section 5 to update `config.js` / Cloudflare public config, keeping the demo lock discipline. For student login you also need the `csvImport` endpoint wired (already listed in that runbook's config block) and `CORSO_STUDENT_AUTH_DOMAIN` consistent between the secret and any client-side username domain.

```powershell
npm run check:supabase-production
npm run check:supabase-live-style
npm test
```

**Verify:** readiness checks pass, including the browser + Edge service-role scans (no service-role key in browser-delivered files), and `npm test` is green.

---

## Rollback

- The migration is additive (new nullable columns + new SELECT policies). If you need to back out before going live, students simply have no login; existing coach/parent flows are unaffected.
- Do **not** drop `students.user_id` while any Auth users are linked — unlink first, or you orphan the login accounts.

## Definition of done

A coach can import a roster, hand each student a login card, and each student can sign in and see only their own profile — with no service-role key exposed and all readiness checks green.
