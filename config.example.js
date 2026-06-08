// config.example.js
// Copy this to config.js and fill in your values.
// config.js is git-ignored so your secrets stay local.

window.RUN_CLUB_CONFIG = {
  // Your Supabase project URL
  // Example: "https://abcxyz.supabase.co"
  supabaseUrl: "https://your-project.supabase.co",

  // Set true to run the UI with fake local data while backend is unfinished.
  demoMode: true,

  // Set true only after Supabase URL, anon key, schoolId, and RLS policies are ready.
  syncEnabled: false,

  // Public school UUID from the Supabase schools table.
  schoolId: "",

  // Your Supabase anon/public key (safe to expose in browser)
  supabaseAnonKey: "",

  endpoints: {
    // Your deployed student_auth Edge Function URL
    studentAuth: "https://your-project.supabase.co/functions/v1/student_auth",
    // Your deployed csv_import Edge Function URL
    csvImport: "https://your-project.supabase.co/functions/v1/csv_import",
  },
};
