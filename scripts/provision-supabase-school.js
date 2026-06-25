const crypto = require('crypto');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function optionalEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function normalizeUsername(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, '');
}

function authEmailFor(username, domain) {
  const safeUsername = normalizeUsername(username);
  const safeDomain = String(domain || '').toLowerCase().trim().replace(/^@+/, '');
  if (!safeUsername || !safeDomain) {
    throw new Error('Coach username and auth username domain are required.');
  }
  return `${safeUsername}@${safeDomain}`;
}

function randomRequestId() {
  return crypto.randomBytes(8).toString('hex');
}

function headers(key, extra = {}) {
  return Object.assign({
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  }, extra);
}

async function parseResponse(response, label) {
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = body && (body.msg || body.message || body.error_description || body.error);
    throw new Error(`${label} failed: ${message || response.statusText}`);
  }
  return body;
}

async function upsertRepresentation(baseUrl, serviceKey, table, conflict, payload) {
  const url = `${baseUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(conflict)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: headers(serviceKey, { Prefer: 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify(payload)
  });
  const rows = await parseResponse(response, table);
  return Array.isArray(rows) ? rows[0] : rows;
}

async function createAuthUser(baseUrl, serviceKey, email, password, metadata) {
  const response = await fetch(`${baseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: headers(serviceKey),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata
    })
  });
  try {
    const body = await parseResponse(response, 'create auth user');
    return body.user || body;
  } catch (error) {
    const existingId = optionalEnv('CORSO_COACH_AUTH_USER_ID');
    if (/already|registered|exists|duplicate/i.test(error.message) && existingId) {
      return { id: existingId, email };
    }
    throw error;
  }
}

async function main() {
  const supabaseUrl = requireEnv('SUPABASE_URL').replace(/\/+$/, '');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const schoolName = requireEnv('CORSO_SCHOOL_NAME');
  const siteCode = requireEnv('CORSO_SITE_CODE');
  const username = normalizeUsername(requireEnv('CORSO_COACH_USERNAME'));
  const password = requireEnv('CORSO_COACH_PASSWORD');
  const authDomain = optionalEnv('CORSO_AUTH_USERNAME_DOMAIN', 'corso.local');
  const displayName = optionalEnv('CORSO_COACH_DISPLAY_NAME', username);
  const schoolSlug = slugify(optionalEnv('CORSO_SCHOOL_SLUG', schoolName));
  const dryRun = optionalEnv('CORSO_DRY_RUN') === '1';

  if (!/^\d{4}$/.test(siteCode)) {
    throw new Error('CORSO_SITE_CODE must be exactly 4 digits.');
  }
  if (password.length < 8) {
    throw new Error('CORSO_COACH_PASSWORD should be at least 8 characters.');
  }
  if (!schoolSlug) {
    throw new Error('Could not create a school slug from CORSO_SCHOOL_NAME.');
  }

  const authEmail = authEmailFor(username, authDomain);
  const requestId = randomRequestId();

  console.log('Corso Supabase school provisioning');
  console.log(`Request: ${requestId}`);
  console.log(`School: ${schoolName}`);
  console.log(`Site code: ${siteCode}`);
  console.log(`Coach username: ${username}`);
  console.log(`Internal auth email: ${authEmail}`);
  console.log('Password: supplied but not printed\n');

  if (dryRun) {
    console.log('Dry run only. No Supabase writes were made.');
    return;
  }

  const school = await upsertRepresentation(supabaseUrl, serviceKey, 'schools', 'slug', {
    name: schoolName,
    slug: schoolSlug
  });

  const authUser = await createAuthUser(supabaseUrl, serviceKey, authEmail, password, {
    corso_username: username,
    corso_site_code: siteCode,
    corso_school_id: school.id,
    role: 'coach'
  });

  await upsertRepresentation(supabaseUrl, serviceKey, 'app_users', 'id', {
    id: authUser.id,
    display_name: displayName
  });

  await upsertRepresentation(supabaseUrl, serviceKey, 'school_users', 'school_id,user_id,role', {
    school_id: school.id,
    user_id: authUser.id,
    role: 'coach'
  });

  await upsertRepresentation(supabaseUrl, serviceKey, 'staff_invites', 'school_id,email,role', {
    school_id: school.id,
    email: authEmail,
    role: 'coach',
    status: 'accepted',
    metadata: {
      source: 'scripts/provision-supabase-school.js',
      request_id: requestId,
      site_code: siteCode,
      username
    }
  });

  console.log('Provisioning complete.');
  console.log('Public config values to add to config.js only when moving this school into live mode:');
  console.log(JSON.stringify({
    demoMode: false,
    syncEnabled: true,
    liveDataMode: false,
    schoolId: school.id,
    siteCode,
    schoolSites: {
      [siteCode]: school.id
    },
    authUsernameDomain: authDomain,
    supabaseUrl,
    supabaseAnonKey: 'copy-public-anon-key-here'
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
