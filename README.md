# Run Club Connect

A Marathon Kids-style school run club platform built with plain HTML/JS and Supabase Edge Functions.

## Pages

- `index.html` – Home / setup checklist
- `admin.html` – Admin login
- `admin-dashboard.html` – Admin console (students, scanner, leaderboards, activity, reports)
- `student.html` – Student login by code
- `privacy-policy.html` – Privacy policy

## Config

Copy `config.js` and set:

```js
window.RUN_CLUB_CONFIG = {
  supabaseUrl: "https://your-project.supabase.co",
  demoMode: true, // set false when backend is ready
  supabaseAnonKey: "",
  endpoints: {
    studentAuth: "https://your-project.supabase.co/functions/v1/student_auth",
    csvImport: "https://your-project.supabase.co/functions/v1/csv_import",
  },
};
```

## Running locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/index.html`

## Tech stack

- Plain HTML / CSS / Vanilla JS (no build step needed)
- Supabase for auth + Edge Functions
- LocalStorage for demo/offline data

## Lovable / Next.js migration

This static scaffold is designed to be imported into Lovable or Cursor to generate a full Next.js + Supabase app. All flows and endpoints are pre-defined in `config.js`.
