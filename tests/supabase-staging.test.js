const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function assertFile(file) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`${file} should exist`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assertFile('supabase/functions/student_auth/index.ts');
assertFile('supabase/functions/csv_import/index.ts');
assertFile('supabase/functions/guardian_access/index.ts');
assertFile('supabase/seed.staging.sql');
assertFile('docs/supabase-staging-checklist.md');
assertFile('supabase/migrations/202606160001_live_beta_feature_tables.sql');

const studentAuth = read('supabase/functions/student_auth/index.ts');
assert(/Deno\.serve/.test(studentAuth), 'student_auth should expose a Supabase Edge Function handler');
assert(/SUPABASE_SERVICE_ROLE_KEY/.test(studentAuth), 'student_auth should use service role only inside the Edge Function');
assert(/dry_run/.test(studentAuth), 'student_auth should support dry-run live-style checks');
assert(/school_id/.test(studentAuth) && /barcode/.test(studentAuth), 'student_auth should scope lookup by school and barcode');
assert(/Access-Control-Allow-Origin/.test(studentAuth), 'student_auth should include CORS headers');
assert(!/localStorage/.test(studentAuth), 'student_auth must not depend on browser storage');

const csvImport = read('supabase/functions/csv_import/index.ts');
assert(/Deno\.serve/.test(csvImport), 'csv_import should expose a Supabase Edge Function handler');
assert(/SUPABASE_SERVICE_ROLE_KEY/.test(csvImport), 'csv_import should use service role only inside the Edge Function');
assert(/dry_run/.test(csvImport), 'csv_import should support dry-run validation');
assert(/parseCsv/.test(csvImport), 'csv_import should parse uploaded roster CSV text');
assert(/skipped_details/.test(csvImport), 'csv_import should report skipped duplicate or invalid rows');
assert(/upsert/.test(csvImport), 'csv_import should upsert valid staging students');
assert(!/localStorage/.test(csvImport), 'csv_import must not depend on browser storage');

const guardianAccess = read('supabase/functions/guardian_access/index.ts');
assert(/Deno\.serve/.test(guardianAccess), 'guardian_access should expose a Supabase Edge Function handler');
assert(/SUPABASE_SERVICE_ROLE_KEY/.test(guardianAccess), 'guardian_access should use service role only inside the Edge Function');
assert(/school_id/.test(guardianAccess) && /code/.test(guardianAccess), 'guardian_access should scope lookup by school and guardian code');
assert(/guardian_links/.test(guardianAccess), 'guardian_access should validate guardian link records');
assert(/scan_audit_logs/.test(guardianAccess), 'guardian_access should write access audit records');
assert(/Access-Control-Allow-Origin/.test(guardianAccess), 'guardian_access should include CORS headers');
assert(!/localStorage/.test(guardianAccess), 'guardian_access must not depend on browser storage');

const seed = read('supabase/seed.staging.sql');
assert(/Gwynne Park Run Club Staging/.test(seed), 'staging seed should create a fake school');
assert(/STAGING1/.test(seed) && /STAGING2/.test(seed), 'staging seed should create fake student barcodes');
assert(/FAKE DATA ONLY/.test(seed), 'staging seed should clearly mark fake data');
assert(!/James Smith|Emily Chen|Sarah Johnson/.test(seed), 'staging seed should not copy app demo student names');

const liveBetaMigration = read('supabase/migrations/202606160001_live_beta_feature_tables.sql');
[
  'athletics_team_selections',
  'athletics_results',
  'cross_country_courses',
  'coach_notes',
  'student_notifications',
  'staff_invites'
].forEach((table) => {
  assert(new RegExp(`create table if not exists public\\.${table}`).test(liveBetaMigration), `${table} should have a live beta table`);
  assert(new RegExp(`alter table public\\.${table} enable row level security`).test(liveBetaMigration), `${table} should enable RLS`);
});
[
  'set_athletics_consent_status',
  'save_athletics_team_selection',
  'record_athletics_result',
  'save_cross_country_course',
  'save_coach_note',
  'create_student_notification'
].forEach((fn) => {
  assert(new RegExp(`create or replace function public\\.${fn}`).test(liveBetaMigration), `${fn} RPC should exist`);
});
assert(/staff can manage athletics team selections/.test(liveBetaMigration), 'athletics team selections should be staff managed');
assert(/staff can manage athletics results/.test(liveBetaMigration), 'athletics results should be staff managed');
assert(/staff can manage coach notes/.test(liveBetaMigration), 'coach notes should be staff managed');
assert(/staff can manage student notifications/.test(liveBetaMigration), 'student notifications should be staff managed');
assert(/user_has_school_role\(school_id, array\['owner','admin','coach'\]\)/.test(liveBetaMigration), 'live beta policies should use school-scoped staff roles');
assert(/create index if not exists idx_athletics_team_selections_school_event/.test(liveBetaMigration), 'athletics team selections should index school and event');
assert(/create index if not exists idx_athletics_results_school_event/.test(liveBetaMigration), 'athletics results should index school and event');
assert(/create index if not exists idx_student_notifications_student/.test(liveBetaMigration), 'student notifications should index student lookups');

const runbook = read('docs/backend-sync-runbook.md');
assert(/supabase db push/.test(runbook), 'runbook should include migration command');
assert(/supabase db reset/.test(runbook), 'runbook should include local reset command');
assert(/supabase functions deploy student_auth/.test(runbook), 'runbook should include student_auth deployment command');
assert(/supabase functions deploy csv_import/.test(runbook), 'runbook should include csv_import deployment command');
assert(/supabase functions deploy guardian_access/.test(runbook), 'runbook should include guardian_access deployment command');
assert(/fake staging data/i.test(runbook), 'runbook should warn to use fake staging data');
assert(/staff_invites/.test(runbook), 'runbook should mention staff invite readiness');
assert(/athletics_team_selections/.test(runbook), 'runbook should mention athletics team live tables');

const packageJson = JSON.parse(read('package.json'));
assert(packageJson.scripts['test:supabase-staging'] === 'node tests/supabase-staging.test.js', 'package should expose a Supabase staging test script');
assert(packageJson.scripts.test.includes('tests/supabase-staging.test.js'), 'npm test should include Supabase staging checks');

console.log('supabase staging checks passed');
