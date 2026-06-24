# Corso Beta Readiness Sweep

Date: 2026-06-24

## Summary

Corso passed the current local beta-readiness sweep at demo/local level. No blocking JavaScript errors, blank routes, or document-level horizontal overflow were found in the sampled desktop, iPad, and phone checks.

This sweep does not approve live real-student use. Keep demo/local mode until school approval, production Supabase/Auth, RLS, and live readiness checks are complete.

## Automated Checks

Passed:

```powershell
npm test
node --check admin-dashboard.js
node --check admin.js
node --check backend.js
node --check theme.js
node --check student.js
node --check parent.js
node --check kiosk.js
node --check scanning.js
git status -sb
```

`npm test` covered:

- portal smoke checks
- goals baseline checks
- backend live-style checks
- scanning live-mode checks
- Supabase staging checks
- two-PC sync workflow checks

## Desktop Routes Checked

All sampled desktop routes loaded meaningful content, had no relevant console errors/warnings, and had no document-level horizontal overflow:

- `/index.html`
- `/admin.html`
- `/admin-dashboard.html?tab=scanner`
- `/admin-dashboard.html?tab=students`
- `/admin-dashboard.html?tab=coach-hub`
- `/admin-dashboard.html?tab=events`
- `/admin-dashboard.html?tab=awards`
- `/admin-dashboard.html?tab=school-admin`
- `/admin-dashboard.html?tab=compliance`
- `/student-profile.html?student=STUDENT1`
- `/parent.html`
- `/kiosk.html`
- `/leaderboard.html`
- `/privacy-policy.html`

## Interactions Checked

Passed:

- Demo staff login using `DEMO` reaches `admin-dashboard.html`.
- Coach Hub opens and displays the Sports/Training/Programming/Insights workspace.
- Coach Tools `Close To Award` modal opens, stays inside the viewport, and shows the staff-reviewed safe next-step summary.
- Compliance deep link opens the School Admin workspace and selects the Compliance internal tab.
- School Admin Compliance area contains the School Admin Signup & Use Attestation sheet with six attestation controls and export button.
- Kiosk `Exit kiosk` returns to `index.html`.
- Student Profile `Training` tab opens and shows the training area.
- Home page menu button expands with no overflow.

## Responsive Checks

Sampled:

- iPad-sized viewport: `820 x 1180`
- phone-sized viewport: `390 x 844`

Routes sampled:

- home
- admin scanner
- Coach Hub
- Sports
- Programming
- Compliance
- Student Profile
- Parent Portal
- Kiosk
- Leaderboard

Result:

- No document-level horizontal overflow found.
- No console errors/warnings found in sampled responsive routes.
- Sports team table and Compliance data map are wider than the phone viewport by design, but both sit inside horizontal scroll wrappers rather than breaking the page.
- Ko-fi floating support iframe sits near the right edge on some pages, but did not create document-level overflow in the sampled checks.

## Current Non-Blockers / Watch Items

- Some admin tables require horizontal scrolling on phones. This is acceptable for beta admin use, but a future polish pass could turn the Sports team summary and Compliance data map into stacked mobile cards.
- Ko-fi floating widget is present on local routes and should be rechecked on a hosted beta URL.
- Camera permission scanning must still be tested manually on a real phone/tablet browser.
- Bluetooth/HID scanner hardware must still be tested manually.
- Print/download flows must still be checked manually in Firefox/Chrome.
- Live Supabase/Auth/RLS configuration is intentionally not treated as ready for real student data yet.

## Human Final Checks Before Sharing Beta

- Open the hosted or shared beta URL on a real phone.
- Test camera scanner permission.
- Test a real Bluetooth/HID barcode scanner.
- Print a student barcode card.
- Print a certificate.
- Confirm no real student data appears in demo screenshots or public routes.
- Confirm school/admin understands this is demo/beta until production auth and backend approval are complete.
