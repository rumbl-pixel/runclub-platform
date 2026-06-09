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
assertFile('supabase/seed.staging.sql');
assertFile('docs/supabase-staging-checklist.md');

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

const seed = read('supabase/seed.staging.sql');
assert(/Gwynne Park Run Club Staging/.test(seed), 'staging seed should create a fake school');
assert(/STAGING1/.test(seed) && /STAGING2/.test(seed), 'staging seed should create fake student barcodes');
assert(/FAKE DATA ONLY/.test(seed), 'staging seed should clearly mark fake data');
assert(!/James Smith|Emily Chen|Sarah Johnson/.test(seed), 'staging seed should not copy app demo student names');

const runbook = read('docs/backend-sync-runbook.md');
assert(/supabase db push/.test(runbook), 'runbook should include migration command');
assert(/supabase db reset/.test(runbook), 'runbook should include local reset command');
assert(/supabase functions deploy student_auth/.test(runbook), 'runbook should include student_auth deployment command');
assert(/supabase functions deploy csv_import/.test(runbook), 'runbook should include csv_import deployment command');
assert(/fake staging data/i.test(runbook), 'runbook should warn to use fake staging data');

const packageJson = JSON.parse(read('package.json'));
assert(packageJson.scripts['test:supabase-staging'] === 'node tests/supabase-staging.test.js', 'package should expose a Supabase staging test script');
assert(packageJson.scripts.test.includes('tests/supabase-staging.test.js'), 'npm test should include Supabase staging checks');

console.log('supabase staging checks passed');
