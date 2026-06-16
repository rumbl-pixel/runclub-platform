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
    if (url.includes('/functions/v1/guardian_access')) {
      return Promise.resolve(response(200, { ok: true, access_type: 'guardian', student: { id: 'student-1', name: 'Staging Student', year: 'Year 5', cls: '5A', laps: 8, minutes: 0 } }));
    }
    if (url.includes('/rest/v1/rpc/record_manual_adjustment')) {
      return Promise.resolve(response(200, [{ adjustment_id: 'adj-live-1', entries_created: 2 }]));
    }
    if (url.includes('/rest/v1/rpc/record_scan_undo')) {
      return Promise.resolve(response(200, [{ lap_entry_id: 'lap-live-1', outcome: 'undone', undone: true }]));
    }
    if (url.includes('/rest/v1/rpc/record_activity_credit')) {
      return Promise.resolve(response(200, [{ activity_credit_id: 'activity-live-1', km_credit: 1.5 }]));
    }
    if (url.includes('/rest/v1/rpc/issue_guardian_link')) {
      return Promise.resolve(response(200, [{
        guardian_link_id: 'guardian-live-1',
        student_id: 'student-1',
        code: 'GP-STAGING1-A1B2C3D4E5',
        status: 'active',
        expires_at: '2027-06-10T00:00:00.000Z'
      }]));
    }
    if (url.includes('/rest/v1/rpc/set_guardian_link_status')) {
      return Promise.resolve(response(200, [{ guardian_link_id: 'guardian-live-1', status: 'revoked' }]));
    }
    if (url.includes('/rest/v1/rpc/create_training_assignment')) {
      return Promise.resolve(response(200, [{ assignment_id: 'training-live-1', assigned_count: 2 }]));
    }
    if (url.includes('/rest/v1/rpc/record_training_event')) {
      return Promise.resolve(response(200, [{ event_id: 'training-event-live-1', event_type: 'opened' }]));
    }
    if (url.includes('/rest/v1/rpc/set_athletics_consent_status')) {
      return Promise.resolve(response(200, [{ student_id: 'student-1', consent_status: 'approved' }]));
    }
    if (url.includes('/rest/v1/rpc/save_athletics_team_selection')) {
      return Promise.resolve(response(200, [{ event_id: 'junior-50m', selected_count: 2 }]));
    }
    if (url.includes('/rest/v1/rpc/record_athletics_result')) {
      return Promise.resolve(response(200, [{ result_id: 'athletics-result-live-1', personal_best: true }]));
    }
    if (url.includes('/rest/v1/rpc/save_cross_country_course')) {
      return Promise.resolve(response(200, [{ course_id: 'course-live-1', name: 'Junior Loop' }]));
    }
    if (url.includes('/rest/v1/rpc/save_coach_note')) {
      return Promise.resolve(response(200, [{ coach_note_id: 'coach-note-live-1' }]));
    }
    if (url.includes('/rest/v1/rpc/create_student_notification')) {
      return Promise.resolve(response(200, [{ notification_id: 'notification-live-1' }]));
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

  const guardianAccess = await backend.backendDataAccess.verifyGuardianAccess('GP-STAGING1-A1B2C3D4E5');
  assert(guardianAccess.ok === true, 'guardian access should resolve through the backend adapter');
  assert(guardianAccess.data.student.id === 'student-1', 'guardian access should return the linked student');
  const guardianAccessCall = calls.find((call) => call.url.includes('/functions/v1/guardian_access'));
  assert(guardianAccessCall, 'guardian access should call the guardian_access Edge Function');
  assert(JSON.parse(guardianAccessCall.options.body).code === 'GP-STAGING1-A1B2C3D4E5', 'guardian access should submit the guardian code');

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

  await backend.backendDataAccess.recordActivityCredit({
    student_id: 'student-1',
    barcode: 'STAGING1',
    activity_type: 'Teacher verified training',
    minutes: 30,
    km_credit: 1.5,
    date: '2026-06-10',
    staff: 'coach@example.test',
    metadata: { source_screen: 'admin-dashboard' }
  });
  const activityCreditCall = calls.find((call) => call.url.includes('/rest/v1/rpc/record_activity_credit'));
  assert(activityCreditCall, 'activity credit should write through a Supabase RPC');
  const activityCreditBody = JSON.parse(activityCreditCall.options.body);
  assert(activityCreditBody.p_school_id === 'school-live-style', 'activity credit should include school scope');
  assert(activityCreditBody.p_student_id === 'student-1', 'activity credit should target the student');
  assert(activityCreditBody.p_minutes === 30, 'activity credit should include minutes');
  assert(activityCreditBody.p_km_credit === 1.5, 'activity credit should include converted kilometre credit');

  await backend.backendDataAccess.issueGuardianLink({
    id: 'student-1',
    barcode: 'STAGING1',
    name: 'Staging Student',
    year: 'Year 5',
    cls: '5A'
  });
  const guardianIssueCall = calls.find((call) => call.url.includes('/rest/v1/rpc/issue_guardian_link'));
  assert(guardianIssueCall, 'guardian link issue should write through a Supabase RPC');
  const guardianIssueBody = JSON.parse(guardianIssueCall.options.body);
  assert(guardianIssueBody.p_school_id === 'school-live-style', 'guardian link issue should include school scope');
  assert(guardianIssueBody.p_student_id === 'student-1', 'guardian link issue should target the student');
  assert(guardianIssueBody.p_barcode === 'STAGING1', 'guardian link issue should include barcode fallback');

  await backend.backendDataAccess.setGuardianLinkStatus({ student_id: 'student-1', code: 'GP-STAGING1-A1B2C3D4E5', status: 'revoked' });
  const guardianStatusCall = calls.find((call) => call.url.includes('/rest/v1/rpc/set_guardian_link_status'));
  assert(guardianStatusCall, 'guardian link status should write through a Supabase RPC');
  const guardianStatusBody = JSON.parse(guardianStatusCall.options.body);
  assert(guardianStatusBody.p_school_id === 'school-live-style', 'guardian link status should include school scope');
  assert(guardianStatusBody.p_status === 'revoked', 'guardian link status should persist revoke/restore state');

  await backend.backendDataAccess.createTrainingAssignment({
    title: 'Stride practice',
    url: 'https://example.test/stride',
    notes: 'Open and review before next run club.',
    due_date: '2026-06-20',
    assigned_student_ids: ['student-1', 'student-2'],
    created_by: 'coach@example.test'
  });
  const trainingCall = calls.find((call) => call.url.includes('/rest/v1/rpc/create_training_assignment'));
  assert(trainingCall, 'training assignment should write through a Supabase RPC');
  const trainingBody = JSON.parse(trainingCall.options.body);
  assert(trainingBody.p_school_id === 'school-live-style', 'training assignment should include school scope');
  assert(trainingBody.p_title === 'Stride practice', 'training assignment should include title');
  assert(trainingBody.p_assigned_student_ids.length === 2, 'training assignment should include assigned students');
  assert(trainingBody.p_url === 'https://example.test/stride', 'training assignment should include the URL');

  await backend.backendDataAccess.recordTrainingEvent({
    assignment_id: 'training-live-1',
    student_id: 'student-1',
    event_type: 'opened',
    title: 'Stride practice',
    metadata: { source_screen: 'student-profile' }
  });
  const trainingEventCall = calls.find((call) => call.url.includes('/rest/v1/rpc/record_training_event'));
  assert(trainingEventCall, 'training event should write through a Supabase RPC');
  const trainingEventBody = JSON.parse(trainingEventCall.options.body);
  assert(trainingEventBody.p_school_id === 'school-live-style', 'training event should include school scope');
  assert(trainingEventBody.p_assignment_id === 'training-live-1', 'training event should include assignment id');
  assert(trainingEventBody.p_student_id === 'student-1', 'training event should include student id');
  assert(trainingEventBody.p_event_type === 'opened', 'training event should include opened/reviewed type');

  await backend.backendDataAccess.deleteStudent({ id: 'student-2', barcode: 'STAGING2' });
  const deleteCall = calls.find((call) => call.url.includes('/rest/v1/students') && call.options.method === 'PATCH');
  assert(deleteCall, 'student delete should soft-delete through Supabase');
  assert(deleteCall.url.includes('school_id=eq.school-live-style'), 'student delete should be school scoped');
  assert(deleteCall.url.includes('barcode=eq.STAGING2'), 'student delete should target the student barcode');
  assert(JSON.parse(deleteCall.options.body).active === false, 'student delete should mark active false rather than removing history');

  await backend.backendDataAccess.setAthleticsConsentStatus({
    student_id: 'student-1',
    barcode: 'STAGING1',
    status: 'approved',
    metadata: { source_screen: 'sports-tab' }
  });
  const athleticsConsentCall = calls.find((call) => call.url.includes('/rest/v1/rpc/set_athletics_consent_status'));
  assert(athleticsConsentCall, 'athletics consent should write through a Supabase RPC');
  const athleticsConsentBody = JSON.parse(athleticsConsentCall.options.body);
  assert(athleticsConsentBody.p_school_id === 'school-live-style', 'athletics consent should include school scope');
  assert(athleticsConsentBody.p_student_id === 'student-1', 'athletics consent should target the student');
  assert(athleticsConsentBody.p_status === 'approved', 'athletics consent should include approved/pending/declined status');

  await backend.backendDataAccess.saveAthleticsTeamSelection({
    event_id: 'junior-50m',
    student_ids: ['student-1', 'student-2'],
    metadata: { division: 'Junior' }
  });
  const athleticsTeamCall = calls.find((call) => call.url.includes('/rest/v1/rpc/save_athletics_team_selection'));
  assert(athleticsTeamCall, 'athletics team selection should write through a Supabase RPC');
  const athleticsTeamBody = JSON.parse(athleticsTeamCall.options.body);
  assert(athleticsTeamBody.p_school_id === 'school-live-style', 'athletics team selection should include school scope');
  assert(athleticsTeamBody.p_event_id === 'junior-50m', 'athletics team selection should include the event id');
  assert(athleticsTeamBody.p_student_ids.length === 2, 'athletics team selection should include selected students');

  await backend.backendDataAccess.recordAthleticsResult({
    student_id: 'student-1',
    event_id: 'junior-50m',
    event_name: 'Junior 50m',
    event_category: 'sprint',
    result_value: '9.82',
    result_number: 9.82,
    measure: 'time',
    house: 'Blue',
    place: '1',
    points: 10,
    personal_best: true,
    date: '2026-06-16'
  });
  const athleticsResultCall = calls.find((call) => call.url.includes('/rest/v1/rpc/record_athletics_result'));
  assert(athleticsResultCall, 'athletics result should write through a Supabase RPC');
  const athleticsResultBody = JSON.parse(athleticsResultCall.options.body);
  assert(athleticsResultBody.p_school_id === 'school-live-style', 'athletics result should include school scope');
  assert(athleticsResultBody.p_student_id === 'student-1', 'athletics result should target the student');
  assert(athleticsResultBody.p_event_id === 'junior-50m', 'athletics result should include event id');
  assert(athleticsResultBody.p_result_number === 9.82, 'athletics result should include numeric PB/scoring value');

  await backend.backendDataAccess.saveCrossCountryCourse({
    id: 'course-live-1',
    name: 'Junior Loop',
    distance_m: 1200,
    division: 'Junior',
    active: true
  });
  const crossCountryCourseCall = calls.find((call) => call.url.includes('/rest/v1/rpc/save_cross_country_course'));
  assert(crossCountryCourseCall, 'cross country course should write through a Supabase RPC');
  const crossCountryBody = JSON.parse(crossCountryCourseCall.options.body);
  assert(crossCountryBody.p_school_id === 'school-live-style', 'cross country course should include school scope');
  assert(crossCountryBody.p_name === 'Junior Loop', 'cross country course should include course name');
  assert(crossCountryBody.p_distance_m === 1200, 'cross country course should include metres');

  await backend.backendDataAccess.saveCoachNote({
    tool: 'needs-attention',
    scope: 'student-1',
    note: 'Check in before next run.',
    staff: 'coach@example.test',
    metadata: { source_screen: 'coach-tools' }
  });
  const coachNoteCall = calls.find((call) => call.url.includes('/rest/v1/rpc/save_coach_note'));
  assert(coachNoteCall, 'coach note should write through a Supabase RPC');
  const coachNoteBody = JSON.parse(coachNoteCall.options.body);
  assert(coachNoteBody.p_school_id === 'school-live-style', 'coach note should include school scope');
  assert(coachNoteBody.p_tool === 'needs-attention', 'coach note should include the coach tool');
  assert(coachNoteBody.p_note === 'Check in before next run.', 'coach note should include note text');

  await backend.backendDataAccess.createStudentNotification({
    student_id: 'student-1',
    title: 'Close to award',
    message: 'Only 2 laps to go.',
    notification_type: 'close-award',
    metadata: { source_screen: 'coach-tools' }
  });
  const studentNotificationCall = calls.find((call) => call.url.includes('/rest/v1/rpc/create_student_notification'));
  assert(studentNotificationCall, 'student notification should write through a Supabase RPC');
  const studentNotificationBody = JSON.parse(studentNotificationCall.options.body);
  assert(studentNotificationBody.p_school_id === 'school-live-style', 'student notification should include school scope');
  assert(studentNotificationBody.p_student_id === 'student-1', 'student notification should target the student');
  assert(studentNotificationBody.p_notification_type === 'close-award', 'student notification should include notification type');

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
