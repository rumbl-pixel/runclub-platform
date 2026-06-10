const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function createLocalStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    }
  };
}

function createBackend(fetchImpl, endpoints = {}, configOverrides = {}) {
  const window = {
    RUN_CLUB_CONFIG: Object.assign({
      demoMode: false,
      syncEnabled: true,
      liveDataMode: false,
      schoolId: 'school-live-style',
      supabaseUrl: 'https://example.supabase.co/',
      supabaseAnonKey: 'anon-live-style',
      endpoints
    }, configOverrides),
    localStorage: createLocalStorage(),
    fetch: fetchImpl
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'backend.js'), 'utf8'), { window });
  return window.RunClubBackend;
}

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: () => Promise.resolve(body == null ? '' : JSON.stringify(body))
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

(async () => {
  const calls = [];
  const backend = createBackend((url, options) => {
    calls.push({ url, options });
    if (url.includes('/rest/v1/students')) {
      return Promise.resolve(response(200, [{
        id: 'student-1',
        barcode: 'STAGING1',
        first_name: 'Staging',
        last_name: 'Student',
        year_group: 5,
        class_name: '5A',
        lap_count: 8
      }]));
    }
    if (url.includes('/rest/v1/run_sessions') && options.method === 'POST') {
      return Promise.resolve(response(200, [{ id: 'session-live-1' }]));
    }
    if (url.includes('/rest/v1/run_sessions') && options.method === 'PATCH') {
      return Promise.resolve(response(200, [{ id: 'session-live-1', finished_at: '2026-06-10T10:00:00.000Z' }]));
    }
    if (url.includes('/functions/v1/student_auth')) {
      return Promise.resolve(response(200, { ok: true, student_id: 'student-1', dry_run: true }));
    }
    if (url.includes('/rest/v1/rpc/record_manual_adjustment')) {
      return Promise.resolve(response(200, [{ adjustment_id: 'adj-live-1', entries_created: 2 }]));
    }
    if (url.includes('/rest/v1/rpc/record_scan_undo')) {
      return Promise.resolve(response(200, [{ lap_entry_id: 'lap-live-1', outcome: 'undone', undone: true }]));
    }
    return Promise.resolve(response(404, { error: 'missing route' }));
  });

  assert(typeof backend.callEdgeFunction === 'function', 'backend should expose callEdgeFunction for Supabase Edge Functions');
  assert(typeof backend.liveStyleSupabaseCheck === 'function', 'backend should expose a live-style Supabase check');
  assert(typeof backend.backendReadiness === 'function', 'backend should expose backendReadiness for the Priority 0 go-live gate');
  assert(typeof backend.requiresLiveBackend === 'function', 'backend should expose requiresLiveBackend before real student data is used');
  const readiness = backend.backendReadiness();
  assert(readiness.ready === true, 'backend readiness should pass when sync, school scope, URL, and anon key are present');
  assert(readiness.mode === 'backend-ready', 'backend readiness should report backend-ready mode when configured');
  assert(Array.isArray(readiness.blockers) && readiness.blockers.length === 0, 'configured backend readiness should not report blockers');

  const edge = await backend.callEdgeFunction('student_auth', { code: 'DEMO-CHECK' });
  assert(edge.ok === true, 'edge function call should resolve successful responses');
  assert(edge.data.student_id === 'student-1', 'edge function call should parse response data');
  assert(calls[0].url === 'https://example.supabase.co/functions/v1/student_auth', 'edge function should use Supabase functions URL by default');
  assert(calls[0].options.method === 'POST', 'edge function should POST JSON payloads');
  assert(calls[0].options.headers.apikey === 'anon-live-style', 'edge function should use anon key header');
  assert(calls[0].options.headers.Authorization === 'Bearer anon-live-style', 'edge function should use bearer anon auth');
  assert(calls[0].options.headers['X-School-Id'] === 'school-live-style', 'edge function should send school scope header');
  assert(JSON.parse(calls[0].options.body).school_id === 'school-live-style', 'edge payload should include school id');

  const check = await backend.liveStyleSupabaseCheck({ studentCode: 'DEMO-CHECK' });
  assert(check.ok === true, 'live-style check should pass when REST and Edge Function probes pass');
  assert(check.rest.ok === true && check.rest.count === 1, 'live-style check should verify Supabase REST student access');
  assert(check.edge.ok === true, 'live-style check should verify Supabase Edge Function access');
  assert(calls.some((call) => call.url.includes('/rest/v1/students')), 'live-style check should call Supabase REST');
  assert(calls.some((call) => call.url.includes('/functions/v1/student_auth')), 'live-style check should call a Supabase Edge Function');

  await backend.backendDataAccess.upsertStudent({
    id: 'student-2',
    barcode: 'STAGING2',
    first: 'Backend',
    last: 'Runner',
    name: 'Backend Runner',
    year: 'Year 5',
    cls: '5B',
    house: 'Gold',
    team: 'Blue',
    pseudonym: 'Runner 2',
    consent_status: 'pending',
    hide_public_name: true,
    share_certificates_publicly: false
  });
  const upsertCall = calls.find((call) => call.url.includes('/rest/v1/students') && call.options.method === 'POST');
  assert(upsertCall, 'student upsert should write to Supabase students');
  assert(upsertCall.url.includes('on_conflict=school_id,barcode'), 'student upsert should be conflict-safe by school and barcode');
  assert(upsertCall.options.headers.Prefer.includes('resolution=merge-duplicates'), 'student upsert should merge duplicate student rows');
  const upsertBody = JSON.parse(upsertCall.options.body);
  assert(upsertBody.school_id === 'school-live-style', 'student upsert should include school scope');
  assert(upsertBody.barcode === 'STAGING2', 'student upsert should include barcode');
  assert(upsertBody.first_name === 'Backend' && upsertBody.last_name === 'Runner', 'student upsert should include student names');
  assert(upsertBody.pseudonym === 'Runner 2', 'student upsert should include privacy pseudonym');
  assert(upsertBody.hide_public_name === true, 'student upsert should include public-name privacy flag');

  await backend.backendDataAccess.upsertStudentsBatch([
    {
      id: 'student-3',
      barcode: 'STAGING3',
      first: 'Batch',
      last: 'Runner',
      name: 'Batch Runner',
      year: 'Year 6',
      cls: '6A'
    },
    {
      id: 'student-4',
      barcode: 'STAGING4',
      first: 'Roster',
      last: 'Import',
      name: 'Roster Import',
      year: 'Year 4',
      cls: '4B'
    }
  ]);
  const batchCall = calls.find((call) => call.url.includes('/rest/v1/students') && call.options.method === 'POST' && Array.isArray(JSON.parse(call.options.body)));
  assert(batchCall, 'student batch import should write multiple students to Supabase');
  assert(batchCall.url.includes('on_conflict=school_id,barcode'), 'student batch import should be conflict-safe by school and barcode');
  const batchBody = JSON.parse(batchCall.options.body);
  assert(batchBody.length === 2, 'student batch import should send all valid imported students');
  assert(batchBody.every((row) => row.school_id === 'school-live-style'), 'student batch import should scope every row to the school');
  assert(batchBody[0].barcode === 'STAGING3' && batchBody[1].barcode === 'STAGING4', 'student batch import should preserve imported barcodes');

  await backend.backendDataAccess.recordManualAdjustment({
    student_id: 'student-1',
    barcode: 'STAGING1',
    delta_laps: 2,
    reason: 'Teacher correction',
    staff: 'coach@example.test',
    lap_distance_km: 0.25,
    metadata: { source_screen: 'admin-dashboard' }
  });
  const adjustmentCall = calls.find((call) => call.url.includes('/rest/v1/rpc/record_manual_adjustment'));
  assert(adjustmentCall, 'manual adjustment should write through a Supabase RPC');
  const adjustmentBody = JSON.parse(adjustmentCall.options.body);
  assert(adjustmentBody.p_school_id === 'school-live-style', 'manual adjustment should include school scope');
  assert(adjustmentBody.p_student_id === 'student-1', 'manual adjustment should target the student');
  assert(adjustmentBody.p_delta_laps === 2, 'manual adjustment should include positive or negative lap delta');
  assert(adjustmentBody.p_reason === 'Teacher correction', 'manual adjustment should include a reason');

  await backend.backendDataAccess.createRunSession({
    session_type: 'Before School Run',
    notes: 'Oval session',
    lap_distance_km: 0.25
  });
  const createSessionCall = calls.find((call) => call.url.includes('/rest/v1/run_sessions') && call.options.method === 'POST');
  assert(createSessionCall, 'run session start should write to Supabase');
  assert(createSessionCall.options.headers.Prefer.includes('return=representation'), 'run session start should return the backend session id');
  const createSessionBody = JSON.parse(createSessionCall.options.body);
  assert(createSessionBody.school_id === 'school-live-style', 'run session start should include school scope');
  assert(createSessionBody.session_type === 'Before School Run', 'run session start should include session type');
  assert(createSessionBody.lap_distance_km === 0.25, 'run session start should include lap distance');

  await backend.backendDataAccess.finishRunSession({ id: 'session-live-1', finished_at: '2026-06-10T10:00:00.000Z' });
  const finishSessionCall = calls.find((call) => call.url.includes('/rest/v1/run_sessions') && call.options.method === 'PATCH');
  assert(finishSessionCall, 'run session finish should patch Supabase');
  assert(finishSessionCall.url.includes('school_id=eq.school-live-style'), 'run session finish should be school scoped');
  assert(finishSessionCall.url.includes('id=eq.session-live-1'), 'run session finish should target the backend session id');
  assert(JSON.parse(finishSessionCall.options.body).finished_at === '2026-06-10T10:00:00.000Z', 'run session finish should write the finish timestamp');

  await backend.backendDataAccess.recordScanUndo({
    idempotency_key: 'scan-STAGING1-123',
    barcode: 'STAGING1',
    reason: 'Undo last scan',
    source: 'admin-dashboard',
    metadata: { scanner_id: 'Admin dashboard' }
  });
  const undoScanCall = calls.find((call) => call.url.includes('/rest/v1/rpc/record_scan_undo'));
  assert(undoScanCall, 'scan undo should write through a Supabase RPC');
  const undoScanBody = JSON.parse(undoScanCall.options.body);
  assert(undoScanBody.p_school_id === 'school-live-style', 'scan undo should include school scope');
  assert(undoScanBody.p_idempotency_key === 'scan-STAGING1-123', 'scan undo should target the original scan idempotency key');
  assert(undoScanBody.p_barcode === 'STAGING1', 'scan undo should include the barcode for audit');
  assert(undoScanBody.p_reason === 'Undo last scan', 'scan undo should include an audit reason');

  await backend.backendDataAccess.deleteStudent({ id: 'student-2', barcode: 'STAGING2' });
  const deleteCall = calls.find((call) => call.url.includes('/rest/v1/students') && call.options.method === 'PATCH');
  assert(deleteCall, 'student delete should soft-delete through Supabase');
  assert(deleteCall.url.includes('school_id=eq.school-live-style'), 'student delete should be school scoped');
  assert(deleteCall.url.includes('barcode=eq.STAGING2'), 'student delete should target the student barcode');
  assert(JSON.parse(deleteCall.options.body).active === false, 'student delete should mark active false rather than removing history');

  const customCalls = [];
  const customBackend = createBackend((url, options) => {
    customCalls.push({ url, options });
    return Promise.resolve(response(200, { ok: true }));
  }, { studentAuth: 'https://functions.example.test/student_auth' });
  await customBackend.callEdgeFunction('studentAuth', { code: 'CUSTOM' });
  assert(customCalls[0].url === 'https://functions.example.test/student_auth', 'edge function should honour configured endpoint aliases');

  const demoBackend = createBackend(() => Promise.resolve(response(500, {})), {}, {
    demoMode: true,
    syncEnabled: false,
    liveDataMode: false,
    schoolId: '',
    supabaseUrl: '',
    supabaseAnonKey: ''
  });
  const demoReadiness = demoBackend.backendReadiness();
  assert(demoReadiness.ready === false, 'backend readiness should block demo/local storage mode');
  assert(demoReadiness.mode === 'demo-local-storage', 'backend readiness should name demo local storage mode');
  assert(demoReadiness.blockers.includes('demo-mode-enabled'), 'backend readiness should list demo mode as a blocker');
  assert(demoReadiness.blockers.includes('sync-disabled'), 'backend readiness should list disabled sync as a blocker');
  assert(demoReadiness.realDataAllowed === false, 'backend readiness should not allow real student data in demo mode');
  assert(demoBackend.requiresLiveBackend().ok === false, 'requiresLiveBackend should fail when backend is not configured');
  assert(/Do not enter real student data/.test(demoBackend.requiresLiveBackend().message), 'requiresLiveBackend should give a plain privacy warning');

  console.log('backend live-style checks passed');
})();
