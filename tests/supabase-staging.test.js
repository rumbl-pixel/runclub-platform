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
assertFile('docs/staging-coach-staff.sql');
assertFile('docs/platform-admin-grant.sql');
assertFile('docs/supabase-production-runbook.md');
assertFile('scripts/staging-readiness-check.js');
assertFile('scripts/supabase-production-readiness-check.js');
assertFile('scripts/provision-supabase-school.js');
assertFile('supabase/migrations/202606160001_live_beta_feature_tables.sql');
assertFile('supabase/migrations/202606180001_platform_admin_school_coach_access.sql');
assertFile('supabase/migrations/202606300001_guardian_link_rpc_qualification.sql');

const studentAuth = read('supabase/functions/student_auth/index.ts');
assert(/Deno\.serve/.test(studentAuth), 'student_auth should expose a Supabase Edge Function handler');
assert(/SUPABASE_SERVICE_ROLE_KEY/.test(studentAuth), 'student_auth should use service role only inside the Edge Function');
assert(/CORSO_SUPABASE_SERVICE_ROLE_KEY/.test(studentAuth), 'student_auth should support Supabase-safe Corso secret names');
assert(/dry_run/.test(studentAuth), 'student_auth should support dry-run live-style checks');
assert(/school_id/.test(studentAuth) && /barcode/.test(studentAuth), 'student_auth should scope lookup by school and barcode');
assert(/Access-Control-Allow-Origin/.test(studentAuth), 'student_auth should include CORS headers');
assert(!/localStorage/.test(studentAuth), 'student_auth must not depend on browser storage');

const csvImport = read('supabase/functions/csv_import/index.ts');
assert(/Deno\.serve/.test(csvImport), 'csv_import should expose a Supabase Edge Function handler');
assert(/SUPABASE_SERVICE_ROLE_KEY/.test(csvImport), 'csv_import should use service role only inside the Edge Function');
assert(/CORSO_SUPABASE_SERVICE_ROLE_KEY/.test(csvImport), 'csv_import should support Supabase-safe Corso secret names');
assert(/bearerToken/.test(csvImport) && /auth\.getUser\(token\)/.test(csvImport), 'csv_import should verify a Supabase Auth bearer token before handling roster data');
assert(/platform_admins/.test(csvImport), 'csv_import should allow explicit platform admin access after token verification');
assert(/school_users/.test(csvImport) && /\.eq\("role", "coach"\)/.test(csvImport), 'csv_import should require a coach role for the requested school');
assert(/isUuid/.test(csvImport) && /invalid_school_id/.test(csvImport), 'csv_import should reject malformed school ids before roster handling');
assert(/missing_staff_token/.test(csvImport) && /not_authorised_for_school/.test(csvImport), 'csv_import should fail closed for unauthorised roster imports');
assert(/dry_run/.test(csvImport), 'csv_import should support dry-run validation');
assert(/parseCsv/.test(csvImport), 'csv_import should parse uploaded roster CSV text');
assert(/skipped_details/.test(csvImport), 'csv_import should report skipped duplicate or invalid rows');
assert(/upsert/.test(csvImport), 'csv_import should upsert valid staging students');
assert(!/localStorage/.test(csvImport), 'csv_import must not depend on browser storage');

const guardianAccess = read('supabase/functions/guardian_access/index.ts');
assert(/Deno\.serve/.test(guardianAccess), 'guardian_access should expose a Supabase Edge Function handler');
assert(/SUPABASE_SERVICE_ROLE_KEY/.test(guardianAccess), 'guardian_access should use service role only inside the Edge Function');
assert(/CORSO_SUPABASE_SERVICE_ROLE_KEY/.test(guardianAccess), 'guardian_access should support Supabase-safe Corso secret names');
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

const stagingChecklist = read('docs/supabase-staging-checklist.md');
assert(/role `coach`/.test(stagingChecklist), 'staging checklist should use a coach role for the test staff account');
assert(/docs\/staging-coach-staff\.sql/.test(stagingChecklist), 'staging checklist should point to the coach staff SQL template');
assert(/docs\/platform-admin-grant\.sql/.test(stagingChecklist), 'staging checklist should point to the platform admin SQL template');
assert(!/as `owner`/.test(stagingChecklist), 'staging checklist should not tell the user to use owner for the test account');

const coachStaffSql = read('docs/staging-coach-staff.sql');
assert(/'coach'/.test(coachStaffSql), 'coach staff SQL should insert the staging staff role as coach');
assert(/school_users/.test(coachStaffSql), 'coach staff SQL should create a school_users row');
assert(/app_users/.test(coachStaffSql), 'coach staff SQL should create an app_users row');

const platformAdminGrantSql = read('docs/platform-admin-grant.sql');
assert(/platform_admins/.test(platformAdminGrantSql), 'platform admin SQL should create a platform_admins grant');
assert(/'platform_admin'/.test(platformAdminGrantSql), 'platform admin SQL should use the platform_admin role');

const platformAdminMigration = read('supabase/migrations/202606180001_platform_admin_school_coach_access.sql');
const guardianLinkQualificationMigration = read('supabase/migrations/202606300001_guardian_link_rpc_qualification.sql');
assert(/create table if not exists public\.platform_admins/.test(platformAdminMigration), 'platform admin migration should create platform_admins');
assert(/create or replace function public\.is_platform_admin/.test(platformAdminMigration), 'platform admin migration should create the platform admin helper');
assert(/public\.is_platform_admin\(\)/.test(platformAdminMigration), 'school role helper should include platform admin override');
assert(/update public\.school_users[\s\S]+set role = 'coach'[\s\S]+where role in \('owner','admin'\)/.test(platformAdminMigration), 'migration should convert old school owner/admin rows to coach');
assert(/check \(role in \('coach','parent','student'\)\)/.test(platformAdminMigration), 'school users should be constrained to coach, parent, or student roles');
assert(/check \(role = 'coach'\)/.test(platformAdminMigration), 'staff invites should be constrained to coach invites');
assert(/from public\.guardian_links gl/.test(guardianLinkQualificationMigration), 'guardian link RPC fix should alias guardian_links to avoid return-column ambiguity');
assert(/gl\.student_id = resolved_student\.id/.test(guardianLinkQualificationMigration), 'guardian link RPC fix should qualify student_id references');
assert(/return query select inserted\.id, inserted\.student_id/.test(guardianLinkQualificationMigration), 'guardian link RPC should still return the issued link id and student id');

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
assert(packageJson.scripts['check:staging-readiness'] === 'node scripts/staging-readiness-check.js', 'package should expose a staging readiness check script');
assert(packageJson.scripts['check:supabase-production'] === 'node scripts/supabase-production-readiness-check.js', 'package should expose a Supabase production readiness check script');
assert(packageJson.scripts['provision:supabase-school'] === 'node scripts/provision-supabase-school.js', 'package should expose a school coach provisioning script');
assert(packageJson.scripts.test.includes('tests/supabase-staging.test.js'), 'npm test should include Supabase staging checks');

const readinessCheck = read('scripts/staging-readiness-check.js');
assert(/SUPABASE_URL/.test(readinessCheck), 'staging readiness check should inspect Supabase URL env');
assert(/SUPABASE_ANON_KEY/.test(readinessCheck), 'staging readiness check should inspect Supabase anon key env');
assert(/RUN_CLUB_SCHOOL_ID/.test(readinessCheck), 'staging readiness check should inspect school id env');
assert(/docker info/.test(readinessCheck), 'staging readiness check should inspect Docker availability');
assert(/supabase --version/.test(readinessCheck), 'staging readiness check should inspect Supabase CLI availability');

const productionRunbook = read('docs/supabase-production-runbook.md');
assert(/projects create corso-production/.test(productionRunbook), 'production runbook should document Supabase project creation');
assert(/ap-southeast-2/.test(productionRunbook), 'production runbook should recommend an Australian region');
assert(/npm run provision:supabase-school/.test(productionRunbook), 'production runbook should include the provisioning command');
assert(/Site code/.test(productionRunbook) && /assigned username/.test(productionRunbook), 'production runbook should preserve the site-code username login model');
assert(/Never add them to `config\.js`/.test(productionRunbook), 'production runbook should keep service-role keys out of browser config');
assert(/CORSO_SUPABASE_SERVICE_ROLE_KEY/.test(productionRunbook), 'production runbook should document Supabase-safe Corso Edge Function secret names');
assert(/csv_import` rejects requests without a valid staff bearer token/.test(productionRunbook), 'production runbook should require staff auth for roster import Edge Function use');

const productionReadinessCheck = read('scripts/supabase-production-readiness-check.js');
assert(/SUPABASE_SERVICE_ROLE_KEY/.test(productionReadinessCheck), 'production readiness check should require the service role only as an env var');
assert(/CORSO_SITE_CODE/.test(productionReadinessCheck), 'production readiness check should validate site code input');
assert(/CORSO_COACH_USERNAME/.test(productionReadinessCheck), 'production readiness check should validate coach username input');
assert(/No secret values are printed/.test(productionReadinessCheck), 'production readiness check should state that secrets are not printed');
assert(/config\.js demo lockout/.test(productionReadinessCheck), 'production readiness check should verify config.js remains demo locked before real data');
assert(/browser service-role scan/.test(productionReadinessCheck), 'production readiness check should scan browser-delivered files for service-role secrets');
assert(/Edge service-role guard scan/.test(productionReadinessCheck), 'production readiness check should flag unsafe service-role Edge Function write paths');
assert(/CORSO_ALLOW_LIVE_CONFIG/.test(productionReadinessCheck), 'production readiness check should require an explicit override before accepting a live browser config');

const provisionSchool = read('scripts/provision-supabase-school.js');
assert(/auth\/v1\/admin\/users/.test(provisionSchool), 'provisioning script should create Supabase Auth users through the admin API');
assert(/school_users/.test(provisionSchool), 'provisioning script should create a school_users row');
assert(/staff_invites/.test(provisionSchool), 'provisioning script should write a staff_invites audit row');
assert(/role:\s*'coach'/.test(provisionSchool), 'provisioning script should force school staff to coach role');
assert(/Password: supplied but not printed/.test(provisionSchool), 'provisioning script should not print staff passwords');
assert(!/console\.log\(.*CORSO_COACH_PASSWORD/.test(provisionSchool), 'provisioning script must not log coach passwords');

console.log('supabase staging checks passed');
