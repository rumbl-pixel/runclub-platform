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
assertFile('backend.js');
assertFile('parent.html');
assertFile('parent.js');
assertFile('leaderboard.html');
assertFile('manifest.webmanifest');
assertFile('service-worker.js');
assertFile('pwa.js');
assertFile('assets/app-icon-192.png');
assertFile('assets/app-icon-512.png');

const brandFiles = [
  'index.html',
  'admin.html',
  'admin-dashboard.html',
  'student.html',
  'student-profile.html',
  'leaderboard.html',
  'parent.html',
  'privacy-policy.html',
  'kiosk.html',
  'README.md',
  'FEATURES.md',
  '_config.yml'
];
for (const file of brandFiles) {
  const contents = read(file);
  assert(/Gwynne Park Run Club/.test(contents), `${file} should use the Gwynne Park Run Club brand`);
  assert(!/Run Club Connect/.test(contents), `${file} should not use the old Run Club Connect brand`);
  assert(!/runclubconnect/i.test(contents), `${file} should not use old runclubconnect contact details`);
}

const pwaPages = [
  'index.html',
  'admin.html',
  'admin-dashboard.html',
  'student.html',
  'student-profile.html',
  'leaderboard.html',
  'parent.html',
  'privacy-policy.html',
  'kiosk.html'
];
for (const file of pwaPages) {
  const contents = read(file);
  assert(/rel="manifest" href="manifest\.webmanifest"/.test(contents), `${file} should link the web app manifest`);
  assert(/name="theme-color" content="#0c5aa8"/.test(contents), `${file} should set the PWA theme color`);
  assert(/rel="apple-touch-icon" href="assets\/app-icon-192\.png"/.test(contents), `${file} should include an Apple touch icon`);
  assert(/<script src="pwa\.js"><\/script>/.test(contents), `${file} should register PWA behavior`);
}

const manifest = JSON.parse(read('manifest.webmanifest'));
assert(manifest.name === 'Gwynne Park Run Club', 'manifest should use the app name');
assert(manifest.short_name === 'GP Run Club', 'manifest should use a short install name');
assert(manifest.display === 'standalone', 'manifest should be installable as a standalone app');
assert(manifest.start_url === './index.html', 'manifest should start at the home page');
assert(Array.isArray(manifest.icons) && manifest.icons.some((icon) => icon.sizes === '192x192'), 'manifest should include a 192px icon');
assert(manifest.icons.some((icon) => icon.sizes === '512x512'), 'manifest should include a 512px icon');

const pwaJs = read('pwa.js');
assert(/serviceWorker/.test(pwaJs) && /service-worker\.js/.test(pwaJs), 'pwa.js should register the service worker');

const serviceWorker = read('service-worker.js');
assert(/CACHE_NAME/.test(serviceWorker), 'service worker should define a cache name');
assert(/CORE_ASSETS/.test(serviceWorker), 'service worker should cache the core app shell');
assert(/manifest\.webmanifest/.test(serviceWorker), 'service worker should cache the manifest');
assert(/app-icon-192\.png/.test(serviceWorker) && /app-icon-512\.png/.test(serviceWorker), 'service worker should cache app icons');

const config = read('config.js');
assert(/demoMode:\s*true/.test(config), 'config.js should enable safe demo mode');
assert(!/SUPABASE_SERVICE|service_role|secret/i.test(config), 'config.js should not contain private service secrets');
assert(/schoolId/.test(config), 'config.js should expose a public school id placeholder for backend scoping');
assert(/syncEnabled/.test(config), 'config.js should expose a backend sync feature flag');

const backendJs = read('backend.js');
assert(/RunClubBackend/.test(backendJs), 'backend adapter should expose RunClubBackend');
assert(/isConfigured/.test(backendJs), 'backend adapter should detect whether Supabase is configured');
assert(/backendDataAccess/.test(backendJs), 'backend adapter should centralise roster/session/report data access');
assert(/enqueueMutation/.test(backendJs), 'backend adapter should queue mutations for offline sync');
assert(/syncOfflineQueue/.test(backendJs), 'backend adapter should sync queued mutations');
assert(/idempotency_key/.test(backendJs), 'backend adapter should include idempotency keys for scan writes');
assert(/conflict/.test(backendJs), 'backend adapter should classify sync conflicts');
assert(/migrationPayloadFromLocalStorage/.test(backendJs), 'backend adapter should export demo data migration payloads');
assert(/backupExportPayload/.test(backendJs), 'backend adapter should build backup/export payloads');
assert(!/service_role|SUPABASE_SERVICE/i.test(backendJs), 'backend adapter should not include private service secrets');

const adminHtml = read('admin.html');
const adminEmailInput = adminHtml.match(/<input[^>]*id="admin-email"[^>]*>/) || adminHtml.match(/<input[^>]*type="text"[^>]*admin-email[^>]*>/);
assert(adminEmailInput && /type="text"/.test(adminEmailInput[0]), 'admin login should accept DEMO without email validation');
assert(/DEMO/.test(adminHtml), 'admin login should show a DEMO hint');

const adminJs = read('admin.js');
assert(/DEMO/.test(adminJs), 'admin login should handle DEMO bypass');

const studentHtml = read('student.html');
assert(/DEMO/.test(studentHtml), 'student login should show a DEMO hint');
assert(!/Log Home Activity|self-report-form|sr-type|sr-minutes/.test(studentHtml), 'student portal should not include home activity logging');
assert(/student-profile\.html/.test(studentHtml), 'student login should hand signed-in students to the profile page');
assert(!/id="submit-btn"[^>]*hidden/.test(studentHtml), 'student login page should keep the sign-in button available before login');

const studentProfileHtml = read('student-profile.html');
assert(!/id="student-form"|id="submit-btn"/.test(studentProfileHtml), 'student profile page should not show the login form or sign-in button');
assert(/medal-progress/.test(studentProfileHtml), 'student profile page should show read-only medal progress');
assert(/student-barcode-card/.test(studentProfileHtml), 'student profile page should show the student barcode card area');
assert(/print-student-barcode-btn/.test(studentProfileHtml), 'student profile page should let students print a credit-card-sized barcode card');
assert(/assets\/qrcode-generator\.js/.test(studentProfileHtml), 'student profile should load the local QR generator');
assert(/student-profile-tabs/.test(studentProfileHtml), 'student profile should expose profile tabs');
assert(/tab-student-training/.test(studentProfileHtml), 'student profile should include a Training tab');
assert(/student-training-list/.test(studentProfileHtml), 'student profile should render assigned training tasks');
assert(/data-student-tab="timeline"/.test(studentProfileHtml), 'student profile should include a Timeline tab');
assert(/student-timeline-summary/.test(studentProfileHtml), 'student profile should include timeline summary cards');
assert(/student-timeline-list/.test(studentProfileHtml), 'student profile should include a progress timeline list');

const studentJs = read('student.js');
assert(/DEMO/.test(studentJs), 'student login should handle DEMO bypass');
assert(!/self-report-form|rc_selfreports|wireSelfReport/.test(studentJs), 'student portal should not submit home activity logs');
assert(/MEDAL_TIERS/.test(studentJs), 'student portal should calculate medal progress');
assert(/renderStudentBarcode/.test(studentJs), 'student portal should render the signed-in student barcode');
assert(/printStudentBarcodeCard/.test(studentJs), 'student portal should print individual student barcode cards');
assert(/qrCodeHtml/.test(studentJs), 'student portal should render real QR codes on student cards');
assert(/runClubStudentSession/.test(studentJs), 'student portal should persist student login sessions');
assert(/student-profile\.html/.test(studentJs), 'student login should redirect to the separate profile page');
assert(/rc_training/.test(studentJs), 'student portal should read assigned training tasks');
assert(/rc_training_clicks/.test(studentJs), 'student portal should track training link clicks');
assert(/studentTimelineRows/.test(studentJs), 'student portal should build progress timeline rows');
assert(/renderStudentTimeline/.test(studentJs), 'student portal should render the progress timeline');
assert(/timelineKind/.test(studentJs), 'student portal should label timeline event types');
assert(/recordTrainingClick/.test(studentJs), 'student portal should record when a student opens assigned training');
assert(/student\.js\?v=10/.test(studentProfileHtml) && /student\.js\?v=10/.test(studentHtml), 'student pages should request the current training-aware student script');

const homeHtml = read('index.html');
assert(!/href="kiosk\.html"|Scanner kiosk/.test(homeHtml), 'public home page should not link directly to the admin-only kiosk');
assert(/href="leaderboard\.html"/.test(homeHtml), 'home page should link to the public leaderboard page');
assert(homeHtml.indexOf('Admin login</a>') > homeHtml.indexOf('Parent portal</a>'), 'home nav should place admin login at the far right');
assert(!/class="hero-buttons"/.test(homeHtml), 'home page should not show duplicate hero login buttons');
assert(homeHtml.indexOf('<strong>Admin Portal</strong>') > homeHtml.indexOf('<strong>Privacy Policy</strong>'), 'portal grid should place Admin Portal at the far-right/end position');

const kioskJs = read('kiosk.js');
assert(/runClubAdminSession/.test(kioskJs), 'kiosk should require an admin session');
assert(/admin\.html/.test(kioskJs), 'kiosk should redirect unauthenticated users to admin login');
assert(/PRAISE_MESSAGES/.test(kioskJs), 'kiosk should rotate playful praise messages after scans');
assert(/index\.html/.test(kioskJs) && !/Enter teacher PIN/.test(kioskJs), 'kiosk exit should return to home without a PIN prompt');
assert(/getUserMedia/.test(kioskJs) && /BarcodeDetector/.test(kioskJs), 'kiosk should support camera barcode scanning when available');
assert(/camera-scan-btn/.test(read('kiosk.html')), 'kiosk should expose a tap-to-start camera scanning button');

const scanningJs = read('scanning.js');
assert(/scanAudit/.test(scanningJs), 'shared scanning should write a basic scan audit trail');
assert(/duplicateWindowMs/.test(scanningJs), 'shared scanning should protect against rapid duplicate scans');
assert(/scanner_id/.test(scanningJs), 'scan audit entries should record who or what scanned');
assert(/idempotencyKey/.test(scanningJs), 'shared scanning should generate idempotency keys for lap writes');
assert(/RunClubBackend\.enqueueMutation/.test(scanningJs), 'shared scanning should queue backend lap writes');

const adminDashboardHtml = read('admin-dashboard.html');
assert(/assets\/gwynne-park-logo\.png/.test(adminDashboardHtml), 'admin dashboard should use the official Gwynne Park logo image');
const dashboardBrandLink = adminDashboardHtml.match(/<a[^>]*brand-home-link[^>]*>/);
assert(dashboardBrandLink && /href="index\.html"/.test(dashboardBrandLink[0]), 'admin dashboard logo/banner should link back to the home page');
assert(/offline-queue-card/.test(adminDashboardHtml), 'admin dashboard should include an offline scan queue panel');
assert(/scanner-settings-card/.test(adminDashboardHtml), 'admin dashboard should include scanner settings');
assert(/duplicate-cooldown-seconds/.test(adminDashboardHtml), 'admin scanner settings should expose duplicate cooldown seconds');
assert(/scanner-device-name/.test(adminDashboardHtml), 'admin scanner settings should register a device name');
assert(/scanner-device-location/.test(adminDashboardHtml), 'admin scanner settings should register a device location');
assert(/lap-distance-metres/.test(adminDashboardHtml), 'admin scanner settings should configure lap distance');
assert(/default-session-type/.test(adminDashboardHtml), 'admin scanner settings should configure a default session type');
assert(/session-type/.test(adminDashboardHtml) && /session-notes/.test(adminDashboardHtml), 'admin scanner should collect session type and notes');
assert(/undo-admin-scan-btn/.test(adminDashboardHtml), 'admin scanner should include an undo last scan button');
assert(/lb-medal-filter/.test(adminDashboardHtml), 'admin leaderboard should include a medal tier filter');
assert(/print-leaderboard-btn/.test(adminDashboardHtml), 'admin leaderboard should include a print poster button');
assert(/medal-rules/.test(adminDashboardHtml), 'admin awards area should show medal tier rules');
assert(/certificates-list/.test(adminDashboardHtml), 'admin awards area should include a certificates list');
assert(/sports-carnival-mode/.test(adminDashboardHtml), 'admin dashboard should include a Sports Carnival Mode checkbox');
assert(/add-student-form/.test(adminDashboardHtml), 'admin students area should include a manual add-student form');
assert(/generate-student-barcode-btn/.test(adminDashboardHtml), 'admin students area should include a generate barcode button');
assert(/new-student-first/.test(adminDashboardHtml) && /new-student-last/.test(adminDashboardHtml), 'admin add-student form should collect student names');
assert(/student-editor-modal/.test(adminDashboardHtml), 'admin students area should include an edit-student modal');
assert(/edit-student-form/.test(adminDashboardHtml), 'admin students area should include an edit-student form');
assert(/guardian-link-list/.test(adminDashboardHtml), 'admin students area should include guardian link management');
assert(/generate-guardian-links-btn/.test(adminDashboardHtml), 'admin students area should generate guardian link codes');
assert(/guardian-access-log/.test(adminDashboardHtml), 'admin students area should include a guardian access log');
assert(/student-progress-card/.test(adminDashboardHtml), 'admin students area should include progress history');
assert(/progress-student/.test(adminDashboardHtml) && /progress-term/.test(adminDashboardHtml), 'student progress history should include student and term filters');
assert(/export-progress-csv-btn/.test(adminDashboardHtml), 'student progress history should export CSV');
assert(/barcode-confirmation/.test(adminDashboardHtml), 'admin add-student flow should show an inline barcode confirmation area');
assert(/Print Barcode \/ QR ID Cards/.test(adminDashboardHtml), 'admin dashboard should print barcode and QR ID cards');
assert(/assets\/qrcode-generator\.js/.test(adminDashboardHtml), 'admin dashboard should load the local QR generator');
assert(!/Student Self-Reported Activity|self-report-queue/.test(adminDashboardHtml), 'admin activity tab should not include student self-reported activity');
assert(/custom-award-name/.test(adminDashboardHtml), 'admin awards area should include custom award creation');
assert(/import-summary/.test(adminDashboardHtml), 'admin import area should show a readable CSV import summary');
assert(/audit-trail-list/.test(adminDashboardHtml), 'admin reports area should include a scan audit trail preview');
assert(/Export scan audit/.test(adminDashboardHtml), 'admin reports area should export scan audit rows');
assert(/report-summary-panels/.test(adminDashboardHtml), 'admin reports should include summary panels');
assert(/export-class-summary-csv-btn/.test(adminDashboardHtml), 'admin reports should export class summaries');
assert(/export-medal-summary-csv-btn/.test(adminDashboardHtml), 'admin reports should export medal summaries');
assert(/export-certificate-csv-btn/.test(adminDashboardHtml), 'admin reports should export certificate readiness');
assert(/summary-dashboard-panels/.test(adminDashboardHtml), 'admin reports should include class, year, division, and school dashboards');
assert(/full-history-student/.test(adminDashboardHtml) && /full-history-list/.test(adminDashboardHtml), 'admin reports should include a per-student full history view');
assert(/export-term-progress-csv-btn/.test(adminDashboardHtml) && /print-term-progress-btn/.test(adminDashboardHtml), 'admin reports should include term progress export and print actions');
assert(/class-report-select/.test(adminDashboardHtml) && /print-class-report-btn/.test(adminDashboardHtml), 'admin reports should include printable class reports');
assert(/print-award-pack-btn/.test(adminDashboardHtml), 'admin reports should print award packs');
assert(/export-certificate-batch-csv-btn/.test(adminDashboardHtml), 'admin reports should export certificate batches');
assert(/attendance-summary-list/.test(adminDashboardHtml), 'admin reports should include session attendance summaries');
assert(/adjustment-form/.test(adminDashboardHtml) && /adjustment-reason/.test(adminDashboardHtml), 'admin reports should include a manual adjustment ledger');
assert(/download-admin-templates-btn/.test(adminDashboardHtml), 'admin reports should export common workflow templates');
assert(/admin-analytics-panels/.test(adminDashboardHtml), 'admin reports should include participation and inactive student analytics');
assert(/onboarding-wizard-card/.test(adminDashboardHtml), 'admin reports should include onboarding wizard');
assert(/onboarding-school-name/.test(adminDashboardHtml), 'onboarding wizard should collect school name');
assert(/onboarding-year-groups/.test(adminDashboardHtml), 'onboarding wizard should collect year groups');
assert(/onboarding-classes/.test(adminDashboardHtml), 'onboarding wizard should collect classes');
assert(/onboarding-award-thresholds/.test(adminDashboardHtml), 'onboarding wizard should collect award thresholds');
assert(/data-tab="training"/.test(adminDashboardHtml), 'admin dashboard should include a Training tab');
assert(/training-title/.test(adminDashboardHtml), 'admin training form should collect a task title');
assert(/training-url/.test(adminDashboardHtml), 'admin training form should collect a training link');
assert(/training-student-list/.test(adminDashboardHtml), 'admin training form should assign tasks to selected students');
assert(/training-status-list/.test(adminDashboardHtml), 'admin training tab should show assignment click status');
assert(/admin-dashboard\.js\?v=7/.test(adminDashboardHtml), 'admin dashboard should request the current reporting-aware dashboard script');
assert(/backend\.js\?v=8/.test(adminDashboardHtml), 'admin dashboard should load the backend adapter before app scripts');

const adminDashboardJs = read('admin-dashboard.js');
assert(/MEDAL_TIERS/.test(adminDashboardJs), 'admin dashboard should calculate medal tiers');
assert(/renderOfflineQueue/.test(adminDashboardJs), 'admin dashboard should render offline queue batches');
assert(/scannerSettings/.test(adminDashboardJs), 'admin dashboard should persist scanner settings');
assert(/programSettings/.test(adminDashboardJs), 'admin dashboard should persist program settings');
assert(/scannerId/.test(adminDashboardJs), 'admin dashboard should use registered device names in scan audit rows');
assert(/deviceName/.test(adminDashboardJs) && /deviceLocation/.test(adminDashboardJs), 'admin scanner settings should store device metadata');
assert(/lapDistanceKm/.test(adminDashboardJs), 'admin dashboard should use configurable lap distance');
assert(/defaultSessionType/.test(adminDashboardJs), 'admin dashboard should store default session type');
assert(/schoolName/.test(adminDashboardJs), 'admin dashboard should store school name');
assert(/activeYears/.test(adminDashboardJs), 'admin dashboard should store active year groups');
assert(/classNames/.test(adminDashboardJs), 'admin dashboard should store class names');
assert(/awardThresholds/.test(adminDashboardJs), 'admin dashboard should store award thresholds');
assert(/saveProgramSettings/.test(adminDashboardJs), 'admin dashboard should save shared program settings');
assert(/session_type/.test(adminDashboardJs), 'session scans should include session type metadata');
assert(/duplicateWindowMs\(\)/.test(adminDashboardJs), 'admin scanner should use configured duplicate cooldown');
assert(/offlineBatchStatus/.test(adminDashboardJs), 'offline queue should calculate batch sync status');
assert(/retryOfflineBatch/.test(adminDashboardJs), 'offline queue should retry failed scans');
assert(/clearSyncedOfflineBatch/.test(adminDashboardJs), 'offline queue should clear synced batches');
assert(/downloadOfflineBatch/.test(adminDashboardJs), 'offline queue should export batch CSVs');
assert(/source:'offline-queue'/.test(adminDashboardJs), 'offline queue sync should use shared scan logging source');
assert(/printLeaderboardPoster/.test(adminDashboardJs), 'admin dashboard should print leaderboard posters');
assert(/renderCertificates/.test(adminDashboardJs), 'admin dashboard should render certificate readiness');
assert(/setSportsCarnivalMode/.test(adminDashboardJs), 'admin dashboard should persist Sports Carnival Mode setting');
assert(/generateBarcodeId/.test(adminDashboardJs), 'admin dashboard should generate unique student barcode IDs');
assert(/printStudentBarcodeCard/.test(adminDashboardJs), 'admin dashboard should print individual student barcode cards');
assert(/qrCodeHtml/.test(adminDashboardJs), 'admin dashboard should render real QR codes on student cards');
assert(/openStudentEditor/.test(adminDashboardJs), 'admin dashboard should let admins edit student details');
assert(/deleteStudent/.test(adminDashboardJs), 'admin dashboard should let admins remove students');
assert(/GUARDIAN_LINKS_KEY/.test(adminDashboardJs), 'admin dashboard should store guardian link records');
assert(/generateGuardianLinkCode/.test(adminDashboardJs), 'admin dashboard should generate guardian link codes');
assert(/renderGuardianLinks/.test(adminDashboardJs), 'admin dashboard should render guardian link records');
assert(/expires_at/.test(adminDashboardJs), 'guardian link records should include expiry');
assert(/setGuardianLinkStatus/.test(adminDashboardJs), 'admin dashboard should revoke and restore guardian links');
assert(/renderGuardianAccessLog/.test(adminDashboardJs), 'admin dashboard should render guardian access logs');
assert(/Edit/.test(adminDashboardJs) && /Remove/.test(adminDashboardJs), 'student list should expose edit and remove actions');
assert(/renderBarcodeConfirmation/.test(adminDashboardJs), 'admin add-student flow should render a compact barcode confirmation');
assert(/createCustomAward/.test(adminDashboardJs), 'admin dashboard should create custom awards');
assert(/parseCsvLine/.test(adminDashboardJs), 'admin dashboard should parse quoted CSV roster rows');
assert(/rosterDuplicateKey/.test(adminDashboardJs), 'admin dashboard should detect duplicate roster rows consistently');
assert(/skipped_details/.test(adminDashboardJs), 'admin dashboard should report duplicate and invalid CSV rows');
assert(/RunClubScan\.logLap/.test(adminDashboardJs), 'admin scanner should use shared scan logging');
assert(/duplicate/.test(adminDashboardJs), 'admin scanner should surface duplicate scan protection');
assert(/renderAuditTrail/.test(adminDashboardJs), 'admin dashboard should render scan audit trail rows');
assert(/groupedSummary/.test(adminDashboardJs), 'admin dashboard should build grouped report summaries');
assert(/medalSummaryRows/.test(adminDashboardJs), 'admin dashboard should build medal summary rows');
assert(/certificateRows/.test(adminDashboardJs), 'admin dashboard should build certificate readiness rows');
assert(/renderReportSummaries/.test(adminDashboardJs), 'admin dashboard should render richer report summary panels');
assert(/studentProgressRows/.test(adminDashboardJs), 'admin dashboard should build per-student progress rows');
assert(/renderStudentProgress/.test(adminDashboardJs), 'admin dashboard should render per-student progress history');
assert(/exportStudentProgressCsv/.test(adminDashboardJs), 'admin dashboard should export per-student progress CSV');
assert(/renderSummaryDashboards/.test(adminDashboardJs), 'admin dashboard should render Priority 4 summary dashboards');
assert(/fullStudentHistoryRows/.test(adminDashboardJs), 'admin dashboard should build full student history rows');
assert(/exportTermProgressCsv/.test(adminDashboardJs), 'admin dashboard should export term progress reports');
assert(/printClassReport/.test(adminDashboardJs), 'admin dashboard should print class reports');
assert(/printAwardPack/.test(adminDashboardJs), 'admin dashboard should print award packs');
assert(/certificateBatchRows/.test(adminDashboardJs), 'admin dashboard should build certificate batch rows');
assert(/sessionAttendanceRows/.test(adminDashboardJs), 'admin dashboard should build session attendance summaries');
assert(/createManualAdjustment/.test(adminDashboardJs), 'admin dashboard should create reasoned manual adjustments');
assert(/downloadAdminTemplates/.test(adminDashboardJs), 'admin dashboard should download admin workflow templates');
assert(/renderAdminAnalytics/.test(adminDashboardJs), 'admin dashboard should render participation and inactive student analytics');
assert(/renderOnboarding/.test(adminDashboardJs), 'admin dashboard should render onboarding setup summary');
assert(/export-audit-csv-btn/.test(adminDashboardHtml), 'admin reports should include scan audit CSV export');
assert(/undoLastAdminScan/.test(adminDashboardJs), 'admin scanner should undo the last scan when needed');
assert(/rc_training/.test(adminDashboardJs), 'admin dashboard should store training assignments');
assert(/rc_training_clicks/.test(adminDashboardJs), 'admin dashboard should read student training click status');
assert(/createTrainingAssignment/.test(adminDashboardJs), 'admin dashboard should create training assignments');
assert(/renderTrainingStatus/.test(adminDashboardJs), 'admin dashboard should render training status');

assert(/programSettings/.test(scanningJs), 'shared scanning should expose program settings');
assert(/lapDistanceKm/.test(scanningJs), 'shared scanning should use configurable lap distance');
assert(/milestoneThresholds/.test(scanningJs), 'shared scanning should expose configurable milestone thresholds');

const adminGoalsJs = read('admin-goals.js');
assert(/assign-selected-students/.test(adminGoalsJs), 'admin goals modal should assign a goal to selected students');
assert(/clearAllGoals/.test(adminGoalsJs), 'admin goals modal should clear goals from the main goal view');
assert(/type="button" id="ag-close"/.test(adminGoalsJs), 'admin goals close button should not accidentally submit the form');
assert(/\.ag-overlay\[hidden\]\s*\{\s*display\s*:\s*none/.test(read('styles.css')), 'admin goals modal hidden state should override flex display');
assert(!/🏃|&#127939;/.test(adminDashboardHtml), 'admin dashboard should not show the running person symbol');

const parentHtml = read('parent.html');
assert(/id="parent-form"/.test(parentHtml), 'parent portal should expose a login form');
assert(/DEMO/.test(parentHtml), 'parent portal should show a DEMO hint');
assert(/parent\.js/.test(parentHtml), 'parent portal should load parent.js');
assert(!/Log Home Activity|Home Activity|parent-activity-form/.test(parentHtml), 'parent portal should not include home activity logging');
assert(/print-parent-certificate-btn/.test(parentHtml), 'parent portal should let parents print child award certificates');
assert(/guardian-link-code/.test(parentHtml), 'parent portal should explain guardian link codes');
assert(/parent-link-summary/.test(parentHtml), 'parent portal should show parent link status after access');
assert(/parent-progress-summary/.test(parentHtml), 'parent portal should include a child progress summary');
assert(/parent-recent-progress/.test(parentHtml), 'parent portal should include recent child progress rows');
assert(/parent-training-view/.test(parentHtml), 'parent portal should include assigned training visibility');

const parentJs = read('parent.js');
assert(/DEMO/.test(parentJs), 'parent portal should handle DEMO bypass');
assert(/RunClubScan/.test(parentJs), 'parent portal should use shared scanning roster data');
assert(/RunClubGoals/.test(parentJs), 'parent portal should use shared goals data');
assert(!/parent-activity-form|rc_selfreports/.test(parentJs), 'parent portal should not submit home activity logs');
assert(/printParentCertificate/.test(parentJs), 'parent portal should print child award certificates');
assert(/GUARDIAN_LINKS_KEY/.test(parentJs), 'parent portal should read guardian link records');
assert(/findLinkedStudent/.test(parentJs), 'parent portal should resolve guardian link codes');
assert(/GUARDIAN_ACCESS_LOG_KEY/.test(parentJs), 'parent portal should write guardian access logs');
assert(/isGuardianLinkUsable/.test(parentJs), 'parent portal should reject inactive or expired guardian links');
assert(/recordGuardianAccess/.test(parentJs), 'parent portal should record guardian access attempts');
assert(/renderParentProgressSummary/.test(parentJs), 'parent portal should render richer progress summary');
assert(/renderParentRecentProgress/.test(parentJs), 'parent portal should render recent progress rows');
assert(/renderParentTraining/.test(parentJs), 'parent portal should render assigned training visibility');

const leaderboardHtml = read('leaderboard.html');
assert(/Total Leaderboard/.test(leaderboardHtml), 'leaderboard page should include a whole-school total leaderboard');
assert(/Senior/.test(leaderboardHtml) && /Year 5 \+ 6/.test(leaderboardHtml), 'leaderboard page should include Senior division');
assert(/Intermediate/.test(leaderboardHtml) && /Year 3 \+ 4/.test(leaderboardHtml), 'leaderboard page should include Intermediate division');
assert(/Junior/.test(leaderboardHtml) && /Year 1 \+ 2/.test(leaderboardHtml), 'leaderboard page should include Junior division');
assert(/Year 2/.test(leaderboardHtml) && /Year 3/.test(leaderboardHtml) && /Year 4/.test(leaderboardHtml) && /Year 5/.test(leaderboardHtml) && /Year 6/.test(leaderboardHtml), 'leaderboard page should include Year 2 through Year 6 views');
assert(/leaderboard\.js/.test(leaderboardHtml), 'leaderboard page should load leaderboard.js');

const leaderboardJs = read('leaderboard.js');
assert(/renderTotalLeaderboard/.test(leaderboardJs), 'leaderboard script should render total leaderboard');
assert(/DIVISIONS/.test(leaderboardJs), 'leaderboard script should define division groups');
assert(/YEAR_GROUPS/.test(leaderboardJs), 'leaderboard script should define year group views');

const styles = read('styles.css');
assert(/--school-blue:\s*#003880/.test(styles), 'site theme should use the Gwynne Park school blue token');
assert(/--uniform-gold:\s*#c99722/.test(styles), 'site theme should use the uniform gold accent token');
assert(/leaderboard-grid[\s\S]*minmax\(min\(100%,\s*520px\),\s*1fr\)/.test(styles), 'leaderboard grid should use wide responsive columns to prevent table clipping');
assert(/leaderboard-grid\s*>\s*div[\s\S]*overflow-x:\s*auto/.test(styles), 'leaderboard sections should handle table overflow inside each panel');
assert(/leaderboard-table[\s\S]*min-width:\s*500px/.test(styles), 'leaderboard tables should keep readable column widths');
assert(/#student-progress-history,[\s\S]*#leaderboard-table,[\s\S]*#certificates-list,[\s\S]*#audit-trail-list[\s\S]*overflow-x:\s*auto/.test(styles), 'admin table containers should prevent column clipping');
assert(/offline-scan-table[\s\S]*min-width:\s*560px/.test(styles), 'offline scan tables should keep readable column widths');
assert(/@media \(max-width: 480px\)[\s\S]*offline-scan-table[\s\S]*min-width:\s*0/.test(styles), 'offline scan tables should compact on narrow mobile screens');
assert(/report-mini table[\s\S]*min-width:\s*420px/.test(styles), 'report summary tables should keep readable column widths');
assert(/styles\.css\?v=10/.test(leaderboardHtml), 'leaderboard page should request the current unclipped stylesheet version');
assert(/gwynne-park-run-club-v10/.test(serviceWorker), 'service worker cache should be bumped for the backend sync update');
assert(/backend\.js/.test(serviceWorker), 'service worker should cache the backend adapter');

const features = read('FEATURES.md');
assert(/Training And At-Home Tasks/.test(features), 'roadmap should include the training workflow lane');
assert(/assigned at-home training/.test(features), 'roadmap should include assigned at-home training tasks');
assert(/link click visibility/.test(features), 'roadmap should include training link click visibility');
assert(/docs\/roadmap-progress\.md/.test(features), 'roadmap should link to the quick progress checklist');
assert(/Priority 3: 10 \/ 10 complete\. Status: Done/.test(features), 'roadmap should show backend integration completed');
assert(/Priority 4: 10 \/ 10 complete\. Status: Done/.test(features), 'roadmap should show Priority 4 completed');
assert(/Priority 5: 4 \/ 10 complete\. Status: In Progress/.test(features), 'roadmap should show Priority 5 progress');
assert(/~~3\.1 Choose backend stack and deployment target\.~~/.test(features), 'roadmap should mark backend stack decision complete');
assert(/~~3\.2 Create database schema/.test(features), 'roadmap should mark initial backend schema complete');
assert(/~~3\.10 Add migration path/.test(features), 'roadmap should mark demo data migration complete');
assert(/~~4\.10 Admin analytics/.test(features), 'roadmap should mark Priority 4 analytics complete');
assert(/~~5\.1 Parent account linking/.test(features), 'roadmap should mark parent account linking complete');
assert(/~~5\.2 Stronger guardian access controls/.test(features), 'roadmap should mark guardian access controls complete');
assert(/~~5\.3 Parent view for child progress/.test(features), 'roadmap should mark parent progress view complete');
assert(/~~5\.4 Student progress timeline/.test(features), 'roadmap should mark student progress timeline complete');

const backendDecision = read('docs/backend-stack-decision.md');
assert(/Use Supabase as the production backend/.test(backendDecision), 'backend decision should choose Supabase');
assert(/Postgres Row Level Security/.test(backendDecision), 'backend decision should require RLS');
assert(/training_assignments/.test(backendDecision), 'backend decision should include training tables in the next schema step');

assertFile('docs/roadmap-progress.md');
const roadmapProgress = read('docs/roadmap-progress.md');
assert(/Priority 3 - Backend And Cross-Device Sync: 10 \/ 10 complete\. Done/.test(roadmapProgress), 'quick roadmap should show Priority 3 done');
assert(/Priority 4 - Reporting And Admin Power Tools: 10 \/ 10 complete\. Done/.test(roadmapProgress), 'quick roadmap should show Priority 4 done');
assert(/Priority 5 - Parent And Student Experience: 4 \/ 10 complete\. In Progress/.test(roadmapProgress), 'quick roadmap should show Priority 5 progress');
assert(/Training skeleton/.test(roadmapProgress), 'quick roadmap should mention the completed Training skeleton');

assertFile('supabase/migrations/202606080001_initial_schema.sql');
assertFile('supabase/migrations/202606080002_priority3_sync_jobs.sql');
const initialSchema = read('supabase/migrations/202606080001_initial_schema.sql');
const syncSchema = read('supabase/migrations/202606080002_priority3_sync_jobs.sql');
[
  'schools',
  'school_users',
  'students',
  'run_sessions',
  'lap_entries',
  'scan_audit_logs',
  'training_assignments',
  'training_assignment_students',
  'training_link_events'
].forEach((table) => {
  assert(new RegExp(`create table if not exists public\\.${table}`).test(initialSchema), `initial backend schema should create ${table}`);
  assert(new RegExp(`alter table public\\.${table} enable row level security`).test(initialSchema), `${table} should enable row level security`);
});
[
  'record_lap_scan',
  'leaderboard_totals',
  'student_progress_summary',
  'backup_exports',
  'demo_data_imports'
].forEach((artifact) => {
  assert(new RegExp(artifact).test(syncSchema), `priority 3 sync migration should include ${artifact}`);
});
assert(/idempotency_key/.test(syncSchema), 'priority 3 sync migration should enforce idempotent scan writes');
assert(/conflict/.test(syncSchema), 'priority 3 sync migration should record conflict outcomes');
assertFile('docs/backend-sync-runbook.md');
const backendRunbook = read('docs/backend-sync-runbook.md');
assert(/localStorage cutover/i.test(backendRunbook), 'backend runbook should explain localStorage cutover');
assert(/backup\/export/i.test(backendRunbook), 'backend runbook should explain backup/export jobs');
assert(/demo data migration/i.test(backendRunbook), 'backend runbook should explain demo data migration');

console.log('portal smoke checks passed');
