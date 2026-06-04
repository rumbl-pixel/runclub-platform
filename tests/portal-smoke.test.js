const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertFile(file) {
  assert(fs.existsSync(path.join(root, file)), `${file} should exist`);
}

assertFile('config.js');
assertFile('parent.html');
assertFile('parent.js');

const config = read('config.js');
assert(/demoMode:\s*true/.test(config), 'config.js should enable safe demo mode');
assert(!/SUPABASE_SERVICE|service_role|secret/i.test(config), 'config.js should not contain private service secrets');

const adminHtml = read('admin.html');
const adminEmailInput = adminHtml.match(/<input[^>]*id="admin-email"[^>]*>/) || adminHtml.match(/<input[^>]*type="text"[^>]*admin-email[^>]*>/);
assert(adminEmailInput && /type="text"/.test(adminEmailInput[0]), 'admin login should accept DEMO without email validation');
assert(/DEMO/.test(adminHtml), 'admin login should show a DEMO hint');

const adminJs = read('admin.js');
assert(/DEMO/.test(adminJs), 'admin login should handle DEMO bypass');

const studentHtml = read('student.html');
assert(/DEMO/.test(studentHtml), 'student login should show a DEMO hint');
assert(!/Log Home Activity|self-report-form|sr-type|sr-minutes/.test(studentHtml), 'student portal should not include home activity logging');
assert(/medal-progress/.test(studentHtml), 'student portal should show read-only medal progress');

const studentJs = read('student.js');
assert(/DEMO/.test(studentJs), 'student login should handle DEMO bypass');
assert(!/self-report-form|rc_selfreports|wireSelfReport/.test(studentJs), 'student portal should not submit home activity logs');
assert(/MEDAL_TIERS/.test(studentJs), 'student portal should calculate medal progress');

const homeHtml = read('index.html');
assert(!/href="kiosk\.html"|Scanner kiosk/.test(homeHtml), 'public home page should not link directly to the admin-only kiosk');

const kioskJs = read('kiosk.js');
assert(/runClubAdminSession/.test(kioskJs), 'kiosk should require an admin session');
assert(/admin\.html/.test(kioskJs), 'kiosk should redirect unauthenticated users to admin login');
assert(/PRAISE_MESSAGES/.test(kioskJs), 'kiosk should rotate playful praise messages after scans');

const adminDashboardHtml = read('admin-dashboard.html');
assert(/offline-queue-card/.test(adminDashboardHtml), 'admin dashboard should include an offline scan queue panel');
assert(/lb-medal-filter/.test(adminDashboardHtml), 'admin leaderboard should include a medal tier filter');
assert(/print-leaderboard-btn/.test(adminDashboardHtml), 'admin leaderboard should include a print poster button');
assert(/medal-rules/.test(adminDashboardHtml), 'admin awards area should show medal tier rules');
assert(/certificates-list/.test(adminDashboardHtml), 'admin awards area should include a certificates list');

const adminDashboardJs = read('admin-dashboard.js');
assert(/MEDAL_TIERS/.test(adminDashboardJs), 'admin dashboard should calculate medal tiers');
assert(/renderOfflineQueue/.test(adminDashboardJs), 'admin dashboard should render offline queue batches');
assert(/printLeaderboardPoster/.test(adminDashboardJs), 'admin dashboard should print leaderboard posters');
assert(/renderCertificates/.test(adminDashboardJs), 'admin dashboard should render certificate readiness');

const parentHtml = read('parent.html');
assert(/id="parent-form"/.test(parentHtml), 'parent portal should expose a login form');
assert(/DEMO/.test(parentHtml), 'parent portal should show a DEMO hint');
assert(/parent\.js/.test(parentHtml), 'parent portal should load parent.js');
assert(!/Log Home Activity|Home Activity|parent-activity-form/.test(parentHtml), 'parent portal should not include home activity logging');

const parentJs = read('parent.js');
assert(/DEMO/.test(parentJs), 'parent portal should handle DEMO bypass');
assert(/RunClubScan/.test(parentJs), 'parent portal should use shared scanning roster data');
assert(/RunClubGoals/.test(parentJs), 'parent portal should use shared goals data');
assert(!/parent-activity-form|rc_selfreports/.test(parentJs), 'parent portal should not submit home activity logs');

console.log('portal smoke checks passed');
