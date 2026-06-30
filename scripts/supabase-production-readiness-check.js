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

function fileText(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function publicConfigCheck() {
  const text = fileText('config.js');
  const liveOverride = process.env.CORSO_ALLOW_LIVE_CONFIG === 'YES';
  const demoLocked = /demoMode:\s*true/.test(text)
    && /syncEnabled:\s*false/.test(text)
    && /liveDataMode:\s*false/.test(text)
    && /supabaseUrl:\s*['"]{2}/.test(text)
    && /supabaseAnonKey:\s*['"]{2}/.test(text);

  return {
    label: 'config.js demo lockout',
    ok: liveOverride || demoLocked,
    detail: demoLocked
      ? 'demo/local safe'
      : (liveOverride ? 'override accepted via CORSO_ALLOW_LIVE_CONFIG=YES' : 'not demo locked')
  };
}

function browserSecretScan() {
  const browserFiles = [
    'config.js',
    'backend.js',
    'admin.js',
    'admin-dashboard.js',
    'student.js',
    'parent.js',
    'leaderboard.js',
    'kiosk.js',
    'scanning.js',
    'theme.js',
    'service-worker.js',
    'index.html',
    'admin.html',
    'admin-dashboard.html',
    'student.html',
    'student-profile.html',
    'parent.html',
    'leaderboard.html',
    'kiosk.html',
    'privacy-policy.html',
    'about.html'
  ];
  const secretPattern = /SUPABASE_SERVICE_ROLE_KEY|service_role[_-]?key|eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/;
  const flagged = browserFiles.filter((file) => fs.existsSync(path.join(root, file)) && secretPattern.test(fileText(file)));
  return {
    label: 'browser service-role scan',
    ok: flagged.length === 0,
    detail: flagged.length ? flagged.join(', ') : 'no service-role key markers in browser files'
  };
}

function edgeServiceRoleGuardScan() {
  const functionDir = path.join(root, 'supabase', 'functions');
  if (!fs.existsSync(functionDir)) {
    return { label: 'Edge service-role guard scan', ok: false, detail: 'supabase/functions missing' };
  }
  const failures = [];
  for (const dirent of fs.readdirSync(functionDir, { withFileTypes: true })) {
    if (!dirent.isDirectory()) { continue; }
    const file = path.join(functionDir, dirent.name, 'index.ts');
    if (!fs.existsSync(file)) { continue; }
    const text = fs.readFileSync(file, 'utf8');
    if (!/SUPABASE_SERVICE_ROLE_KEY/.test(text)) { continue; }
    const writesPrivateData = /\.(insert|upsert|update|delete)\s*\(/.test(text) || /\.from\("students"\)/.test(text);
    const isPublicLookup = dirent.name === 'student_auth' || dirent.name === 'guardian_access';
    const hasBearerAuth = /auth\.getUser\(token\)/.test(text) && /bearerToken/.test(text);
    if (writesPrivateData && !isPublicLookup && !hasBearerAuth) {
      failures.push(dirent.name);
    }
  }
  return {
    label: 'Edge service-role guard scan',
    ok: failures.length === 0,
    detail: failures.length ? failures.join(', ') : 'service-role write functions require staff bearer auth or are approved public lookups'
  };
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
  publicConfigCheck(),
  browserSecretScan(),
  edgeServiceRoleGuardScan(),
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
    } else if (check.label === 'config.js demo lockout') {
      console.log('- Keep config.js in demo/local lockout before real student data, or set CORSO_ALLOW_LIVE_CONFIG=YES only for an approved launch proof check.');
    } else if (check.label === 'browser service-role scan') {
      console.log('- Remove service-role credentials from browser-delivered files; use only local shell variables or Supabase secrets.');
    } else {
      console.log(`- Set ${check.label}.`);
    }
  });
  process.exitCode = 1;
}
