// src/scanning/scanning.js
// Shared barcode-scanning + lap-logging logic for the Run Club platform.
// Used by both the admin dashboard scanner and the tablet kiosk so behaviour
// stays identical everywhere. Bluetooth scanners in HID/keyboard mode "type"
// the barcode into a focused input and (usually) send Enter; this module
// also auto-submits after a short debounce so Enter is optional.
//
// Exposes a single global: window.RunClubScan
(function (global) {
  'use strict';

  // --- Storage keys (shared across all portals) ---
  var KEYS = {
    students: 'rc_students',
    activity: 'rc_activity',
    sessions: 'rc_sessions',
    events: 'rc_events',
    challenges: 'rc_challenges',
    timedRuns: 'rc_timed',
    scanAudit: 'rc_scan_audit',
    programSettings: 'rc_program_settings'
  };

  function load(key, def) {
    try { var r = localStorage.getItem(key); return r ? JSON.parse(r) : def; }
    catch (e) { return def; }
  }
  function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  // --- Default demo roster (StrideTrack-style) ---
  function defaultStudents() {
    return [
      { id: 'STUDENT1', barcode: 'STUDENT1', first: 'James', last: 'Smith', name: 'James Smith', year: 'Year 5', cls: '5B', laps: 12, minutes: 0, events: [] },
      { id: 'STUDENT2', barcode: 'STUDENT2', first: 'Sarah', last: 'Johnson', name: 'Sarah Johnson', year: 'Year 5', cls: '5B', laps: 18, minutes: 0, events: [] },
      { id: 'STUDENT3', barcode: 'STUDENT3', first: 'Tom', last: 'VanDenberghe', name: 'Tom VanDenberghe', year: 'Year 6', cls: '6A', laps: 7, minutes: 0, events: [] },
      { id: 'STUDENT4', barcode: 'STUDENT4', first: 'Emily', last: 'Chen', name: 'Emily Chen', year: 'Year 6', cls: '6A', laps: 25, minutes: 0, events: [] },
      { id: 'STUDENT5', barcode: 'STUDENT5', first: 'Liam', last: "O'Brien", name: "Liam O'Brien", year: 'Year 4', cls: '4C', laps: 9, minutes: 0, events: [] },
      { id: 'STUDENT6', barcode: 'STUDENT6', first: 'Aisha', last: 'Patel', name: 'Aisha Patel', year: 'Year 4', cls: '4C', laps: 31, minutes: 0, events: [] },
      { id: 'STUDENT7', barcode: 'STUDENT7', first: 'Noah', last: 'Williams', name: 'Noah Williams', year: 'Year 3', cls: '3A', laps: 5, minutes: 0, events: [] },
      { id: 'STUDENT8', barcode: 'STUDENT8', first: 'Zoe', last: 'Nguyen', name: 'Zoe Nguyen', year: 'Year 3', cls: '3A', laps: 44, minutes: 0, events: [] }
    ];
  }

  function getStudents() { return load(KEYS.students, defaultStudents()); }
  function saveStudents(s) { save(KEYS.students, s); }

  // --- Conversions ---
  function defaultProgramSettings() {
    return {
      schoolName: 'Gwynne Park Schools',
      lapDistanceKm: 0.25,
      defaultSessionType: 'Run Club',
      activeYears: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6'],
      classNames: ['1A', '2A', '3A', '4C', '5B', '6A'],
      awardThresholds: MILESTONES
    };
  }

  function cleanAwardThresholds(value) {
    var thresholds = Array.isArray(value) ? value : String(value || '').split(',');
    thresholds = thresholds.map(function (item) { return Number(item); })
      .filter(function (item) { return isFinite(item) && item > 0; })
      .map(function (item) { return Math.round(item); })
      .sort(function (a, b) { return a - b; });
    return thresholds.length ? Array.from(new Set(thresholds)) : MILESTONES;
  }

  function programSettings() {
    var settings = load(KEYS.programSettings, defaultProgramSettings());
    var lapDistanceKm = Number(settings.lapDistanceKm);
    if (!isFinite(lapDistanceKm) || lapDistanceKm <= 0) { lapDistanceKm = 0.25; }
    return Object.assign(defaultProgramSettings(), settings, {
      lapDistanceKm: lapDistanceKm,
      awardThresholds: cleanAwardThresholds(settings.awardThresholds)
    });
  }
  function lapDistanceKm() { return programSettings().lapDistanceKm; }
  function lapsToKm(laps) { return laps * lapDistanceKm(); }
  function minutesToKm(min) { return (min || 0) / 20; } // Marathon Kids: 20 min = 1 km
  function totalKm(s) { return lapsToKm(s.laps) + minutesToKm(s.minutes); }

  // --- Awards (milestone thresholds shared everywhere) ---
  var MILESTONES = [5, 10, 25, 50, 100, 200, 500];
  function milestoneThresholds() { return programSettings().awardThresholds; }
  function awardsFor(laps) {
    return milestoneThresholds().filter(function (m) { return laps >= m; })
      .map(function (m) { return m + ' laps'; });
  }
  // Returns a milestone label if THIS lap just crossed a threshold, else null.
  function milestoneJustReached(laps) {
    return milestoneThresholds().indexOf(laps) !== -1 ? (laps + ' laps') : null;
  }

  // --- Core: log a lap from a scanned barcode ---
  // Returns a result object describing what happened (success/error + details).
  function scanAudit() { return load(KEYS.scanAudit, []); }

  function saveScanAudit(rows) { save(KEYS.scanAudit, rows); }

  function auditScan(entry) {
    var rows = scanAudit();
    rows.push(Object.assign({
      id: 'audit-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      time: new Date().toISOString()
    }, entry));
    saveScanAudit(rows.slice(-1000));
  }

  function idempotencyKey(barcode, options) {
    options = options || {};
    if (options.idempotency_key || options.idempotencyKey) {
      return options.idempotency_key || options.idempotencyKey;
    }
    var sessionId = options.session_id || options.sessionId || 'no-session';
    var scannerId = options.scanner_id || options.scannerId || 'unknown-scanner';
    var bucket = options.timeBucket || Math.floor(Date.now() / 1000);
    if (global.RunClubBackend && global.RunClubBackend.makeIdempotencyKey) {
      return global.RunClubBackend.makeIdempotencyKey([barcode, sessionId, scannerId, bucket]);
    }
    return ['scan', barcode, sessionId, scannerId, bucket].join('-').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  }

  function isRapidDuplicate(barcode, options) {
    options = options || {};
    var duplicateWindowMs = options.duplicateWindowMs == null ? 2500 : options.duplicateWindowMs;
    if (!duplicateWindowMs) { return false; }
    var rows = scanAudit();
    var last = rows.slice().reverse().find(function (row) {
      return row.barcode === barcode && row.success === true;
    });
    if (!last || !last.time) { return false; }
    return (Date.now() - new Date(last.time).getTime()) < duplicateWindowMs;
  }

  function logLap(rawBarcode, options) {
    options = options || {};
    var barcode = String(rawBarcode || '').trim().toUpperCase();
    if (!barcode) { return { success: false, error: 'Empty scan' }; }

    var scannerId = options.scanner_id || options.scannerId || 'unknown-scanner';
    var scanTime = new Date().toISOString();
    var idem = idempotencyKey(barcode, options);

    if (isRapidDuplicate(barcode, options)) {
      auditScan({ barcode: barcode, scanner_id: scannerId, source: options.source || 'scanner', success: false, duplicate: true, error: 'Duplicate scan ignored', idempotency_key: idem });
      return { success: false, duplicate: true, error: 'Duplicate scan ignored: wait a moment before scanning the same card again', barcode: barcode };
    }

    var students = getStudents();
    var student = students.find(function (s) {
      return s.barcode === barcode || s.id === barcode;
    });

    if (!student) {
      auditScan({ barcode: barcode, scanner_id: scannerId, source: options.source || 'scanner', success: false, error: 'Code not recognised', idempotency_key: idem });
      return { success: false, error: 'Code not recognised: ' + barcode, barcode: barcode };
    }

    student.laps += 1;
    saveStudents(students);
    auditScan({ barcode: barcode, scanner_id: scannerId, source: options.source || 'scanner', success: true, duplicate: false, student_id: student.id, student_name: student.name, laps_after: student.laps, idempotency_key: idem, time: scanTime });

    if (global.RunClubBackend && global.RunClubBackend.enqueueMutation) {
      global.RunClubBackend.enqueueMutation('lap_entries', {
        school_id: global.RunClubBackend.config().schoolId || 'demo-school',
        student_id: student.id,
        session_id: options.session_id || options.sessionId || null,
        barcode: barcode,
        scanner_id: scannerId,
        source: options.source || 'scanner',
        scanned_at: scanTime,
        lap_distance_km: lapDistanceKm(),
        idempotency_key: idem
      }, { table: 'lap_entries', idempotency_key: idem });
    }

    return {
      success: true,
      message: 'Lap logged',
      barcode: barcode,
      student: {
        id: student.id,
        name: student.name,
        year: student.year,
        cls: student.cls,
        laps: student.laps,
        km: lapsToKm(student.laps)
      },
      idempotency_key: idem,
      milestone: milestoneJustReached(student.laps)
    };
  }

  // --- Reusable input binding for scanner fields ---
  // Wires Enter + debounced auto-submit + auto-refocus to any text input,
  // calling onScan(value) for each completed scan. Returns an unbind fn.
  function bindScannerInput(inputEl, onScan, opts) {
    opts = opts || {};
    var debounceMs = opts.debounceMs != null ? opts.debounceMs : 120;
    var autoRefocus = opts.autoRefocus !== false;
    var timer = null;

    function fire() {
      var v = inputEl.value;
      inputEl.value = '';
      if (autoRefocus) { inputEl.focus(); }
      if (v && v.trim()) { onScan(v); }
    }
    function onKey(e) { if (e.key === 'Enter') { e.preventDefault(); if (timer) clearTimeout(timer); fire(); } }
    function onInput() { if (timer) clearTimeout(timer); timer = setTimeout(function () { timer = null; fire(); }, debounceMs); }

    inputEl.addEventListener('keydown', onKey);
    inputEl.addEventListener('input', onInput);
    if (autoRefocus) { inputEl.focus(); }

    return function unbind() {
      inputEl.removeEventListener('keydown', onKey);
      inputEl.removeEventListener('input', onInput);
    };
  }

  global.RunClubScan = {
    KEYS: KEYS,
    load: load,
    save: save,
    defaultStudents: defaultStudents,
    getStudents: getStudents,
    saveStudents: saveStudents,
    lapsToKm: lapsToKm,
    minutesToKm: minutesToKm,
    totalKm: totalKm,
    programSettings: programSettings,
    lapDistanceKm: lapDistanceKm,
    milestoneThresholds: milestoneThresholds,
    MILESTONES: MILESTONES,
    awardsFor: awardsFor,
    milestoneJustReached: milestoneJustReached,
    scanAudit: scanAudit,
    saveScanAudit: saveScanAudit,
    auditScan: auditScan,
    idempotencyKey: idempotencyKey,
    logLap: logLap,
    bindScannerInput: bindScannerInput
  };
})(window);
