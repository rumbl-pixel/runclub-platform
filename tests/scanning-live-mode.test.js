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

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: () => Promise.resolve(body == null ? '' : JSON.stringify(body))
  };
}

function createRuntime(configOverrides, fetchImpl) {
  const localStorage = createLocalStorage();
  const window = {
    RUN_CLUB_CONFIG: Object.assign({
      demoMode: false,
      syncEnabled: true,
      liveDataMode: true,
      schoolId: 'school-live-style',
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-live-style',
      endpoints: {}
    }, configOverrides || {}),
    localStorage,
    fetch: fetchImpl || (() => Promise.resolve(response(200, {})))
  };
  const context = { window, localStorage, console };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'backend.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'scanning.js'), 'utf8'), context);
  return window;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

(async () => {
  const blockedWindow = createRuntime({
    syncEnabled: false,
    schoolId: '',
    supabaseUrl: '',
    supabaseAnonKey: ''
  });
  const blockedStudentBefore = blockedWindow.RunClubScan.getStudents().find((student) => student.id === 'STUDENT1');
  const blocked = blockedWindow.RunClubScan.logLap('STUDENT1', { duplicateWindowMs: 0, source: 'live-test' });
  const blockedStudentAfter = blockedWindow.RunClubScan.getStudents().find((student) => student.id === 'STUDENT1');
  assert(blocked.success === false, 'live mode should block scans when backend readiness fails');
  assert(/Local scan write blocked/.test(blocked.error), 'blocked scan should explain the live backend requirement');
  assert(blockedStudentAfter.laps === blockedStudentBefore.laps, 'blocked live scan should not change local laps');

  const calls = [];
  const readyWindow = createRuntime({}, (url, options) => {
    calls.push({ url, options });
    if (url.includes('/rest/v1/rpc/record_lap_scan')) {
      return Promise.resolve(response(200, [{ lap_entry_id: 'lap-1', outcome: 'logged', conflict: false }]));
    }
    return Promise.resolve(response(200, {}));
  });
  const result = readyWindow.RunClubScan.logLap('STUDENT1', {
    duplicateWindowMs: 0,
    source: 'admin-dashboard',
    scanner_id: 'Oval iPad',
    session_id: 'session-live-1'
  });
  assert(result.success === true, 'ready live mode should accept the scan');
  assert(result.backend_status === 'live-write-started', 'ready live mode should start a backend scan write');
  const rpcCall = calls.find((call) => call.url.includes('/rest/v1/rpc/record_lap_scan'));
  assert(rpcCall, 'ready live scan should call the Supabase record_lap_scan RPC');
  const rpcBody = JSON.parse(rpcCall.options.body);
  assert(rpcBody.p_school_id === 'school-live-style', 'RPC scan should include school scope');
  assert(rpcBody.p_barcode === 'STUDENT1', 'RPC scan should include scanned barcode');
  assert(rpcBody.p_source === 'admin-dashboard', 'RPC scan should include scan source');
  assert(rpcBody.p_idempotency_key === result.idempotency_key, 'RPC scan should use the generated idempotency key');

  const attendanceCalls = [];
  const attendanceWindow = createRuntime({}, (url, options) => {
    attendanceCalls.push({ url, options });
    return Promise.resolve(response(200, {}));
  });
  const attendanceStudentBefore = attendanceWindow.RunClubScan.getStudents().find((student) => student.id === 'STUDENT1');
  const attendanceOnly = attendanceWindow.RunClubScan.logLap('STUDENT1', {
    duplicateWindowMs: 0,
    source: 'admin-dashboard',
    scanner_id: 'Oval iPad',
    session_id: 'session-athletics-1',
    session_type: 'Interschool Athletics Training'
  });
  const attendanceStudentAfter = attendanceWindow.RunClubScan.getStudents().find((student) => student.id === 'STUDENT1');
  assert(attendanceOnly.success === true, 'interschool training scans should still record attendance');
  assert(attendanceOnly.attendance_only === true, 'interschool training scans should be marked attendance-only');
  assert(attendanceOnly.backend_status === 'attendance-only', 'interschool training scans should not write lap entries');
  assert(attendanceStudentAfter.laps === attendanceStudentBefore.laps, 'interschool training scans should not change Run Club lap totals');
  assert(!attendanceCalls.some((call) => call.url.includes('/rest/v1/rpc/record_lap_scan')), 'attendance-only scans should not call the lap scan RPC');

  console.log('scanning live-mode checks passed');
})();
