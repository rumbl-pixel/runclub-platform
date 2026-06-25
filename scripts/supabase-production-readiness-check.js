const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function commandCheck(label, command, args) {
  try {
    const output = execFileSync(command, args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
    return { label, ok: true, detail: output.split(/\r?\n/)[0] || 'available' };
  } catch (error) {
    const message = [error.stderr, error.stdout, error.message].filter(Boolean).join(' ').trim();
    return { label, ok: false, detail: firstLine(message) || 'not available' };
  }
}

function firstLine(value) {
  return String(value || '').split(/\r?\n/).find(Boolean) || '';
}

function envCheck(name, options = {}) {
  const value = process.env[name];
  let ok = Boolean(value);
  if (ok && options.pattern) {
    ok = options.pattern.test(value);
  }
  return {
    label: name,
    ok,
    detail: ok ? 'set' : (options.hint || 'missing')
  };
}

function fileCheck(file) {
  const full = path.join(root, file);
  return { label: file, ok: fs.existsSync(full), detail: fs.existsSync(full) ? 'present' : 'missing' };
}

function print(check) {
  console.log(`${check.ok ? 'OK ' : 'NO '} ${check.label}: ${check.detail}`);
}

const checks = [
  commandCheck('Supabase CLI', process.execPath, [path.join(root, 'node_modules', 'supabase', 'dist', 'supabase.js'), '--version']),
  commandCheck('Supabase login', process.execPath, [path.join(root, 'node_modules', 'supabase', 'dist', 'supabase.js'), 'projects', 'list']),
  fileCheck('supabase/config.toml'),
  fileCheck('docs/supabase-production-runbook.md'),
  fileCheck('scripts/provision-supabase-school.js'),
  envCheck('SUPABASE_ACCESS_TOKEN', { hint: 'optional if `supabase login` has been completed' }),
  envCheck('SUPABASE_URL', { pattern: /^https:\/\/.+\.supabase\.co$/, hint: 'example: https://project-ref.supabase.co' }),
  envCheck('SUPABASE_ANON_KEY'),
  envCheck('SUPABASE_SERVICE_ROLE_KEY', { hint: 'server-side only; never paste into config.js' }),
  envCheck('CORSO_SITE_CODE', { pattern: /^\d{4}$/, hint: '4 digits, e.g. 1001' }),
  envCheck('CORSO_SCHOOL_NAME'),
  envCheck('CORSO_COACH_USERNAME'),
  envCheck('CORSO_COACH_PASSWORD')
];

console.log('Corso Supabase production readiness');
console.log('No secret values are printed by this check.\n');
checks.forEach(print);

const blockers = checks.filter((check) => !check.ok && check.label !== 'SUPABASE_ACCESS_TOKEN');
if (blockers.length) {
  console.log('\nNext fixes:');
  blockers.forEach((check) => {
    if (check.label === 'Supabase login') {
      console.log('- Run `npx supabase login`, or set SUPABASE_ACCESS_TOKEN before creating/linking a cloud project.');
    } else if (check.label === 'SUPABASE_SERVICE_ROLE_KEY') {
      console.log('- Add SUPABASE_SERVICE_ROLE_KEY only to your local shell or Supabase Edge Function secrets.');
    } else if (check.label === 'SUPABASE_URL' || check.label === 'SUPABASE_ANON_KEY') {
      console.log(`- Copy ${check.label} from the Supabase project API settings.`);
    } else {
      console.log(`- Set ${check.label}.`);
    }
  });
  process.exitCode = 1;
}
