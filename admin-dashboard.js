// admin-dashboard.js
// Local-first admin dashboard. All data lives in localStorage in demo mode.

(function () {

  // ── Auth gate ──────────────────────────────────────────────
  function getSession() {
    try {
      var raw = window.localStorage.getItem('runClubAdminSession');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  var session = getSession();
  if (!session) {
    window.location.href = 'admin.html';
    return;
  }

  var labelEl = document.getElementById('session-label');
  if (labelEl) labelEl.textContent = 'Logged in as ' + session.email + ' (' + session.mode + ' mode)';

  document.getElementById('logout-btn').addEventListener('click', function () {
    window.localStorage.removeItem('runClubAdminSession');
    window.location.href = 'admin.html';
  });

  // ── Demo students ──────────────────────────────────────────
  var STORAGE_STUDENTS = 'runclub_students';
  var STORAGE_ACTIVITY = 'runclub_activity';
  var STORAGE_SESSIONS = 'runclub_sessions';

  function defaultStudents() {
    return [
      { id: 'STUDENT1', name: 'James Smith',         year: 'Year 5', class: '5B', laps: 12 },
      { id: 'STUDENT2', name: 'Sarah Johnson',        year: 'Year 5', class: '5B', laps: 18 },
      { id: 'STUDENT3', name: 'Tom VanDenberghe',     year: 'Year 6', class: '6A', laps: 7  },
      { id: 'STUDENT4', name: 'Emily Chen',           year: 'Year 6', class: '6A', laps: 25 },
      { id: 'STUDENT5', name: 'Liam O\'Brien',        year: 'Year 4', class: '4C', laps: 9  },
    ];
  }

  function getStudents() {
    try {
      var raw = window.localStorage.getItem(STORAGE_STUDENTS);
      return raw ? JSON.parse(raw) : defaultStudents();
    } catch (e) { return defaultStudents(); }
  }

  function saveStudents(students) {
    window.localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(students));
  }

  function getActivityLogs() {
    try {
      var raw = window.localStorage.getItem(STORAGE_ACTIVITY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function saveActivityLogs(logs) {
    window.localStorage.setItem(STORAGE_ACTIVITY, JSON.stringify(logs));
  }

  // ── Helpers ────────────────────────────────────────────────
  function showResult(el, payload) {
    el.hidden = false;
    el.textContent = JSON.stringify(payload, null, 2);
  }

  function lapsTokm(laps) { return laps * 0.25; }

  function toCsv(rows, cols) {
    var lines = [cols.join(',')];
    rows.forEach(function (r) {
      lines.push(cols.map(function (c) { return JSON.stringify(r[c] != null ? r[c] : ''); }).join(','));
    });
    return lines.join('\n');
  }

  function downloadJson(filename, data) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
  }

  function downloadCsv(filename, data) {
    var blob = new Blob([data], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
  }

  // ── Student list ───────────────────────────────────────────
  var listEl = document.getElementById('student-list');

  function renderStudents() {
    var students = getStudents();
    listEl.innerHTML = '';
    students.forEach(function (s) {
      var li = document.createElement('li');
      li.textContent = s.name + ' (' + s.id + ') – ' + s.year + ', ' + s.class + ' – ' + s.laps + ' laps (' + lapsTokm(s.laps).toFixed(2) + ' km)';
      listEl.appendChild(li);
    });
  }

  renderStudents();

  // ── Scanner ────────────────────────────────────────────────
  var scanInput = document.getElementById('scan-input');
  var scanBtn   = document.getElementById('scan-btn');
  var scanResultEl = document.getElementById('scan-result');

  function handleScan() {
    var barcode = scanInput.value.trim().toUpperCase();
    if (!barcode) return;

    var students = getStudents();
    var student = students.find(function (s) { return s.id === barcode; });

    if (!student) {
      showResult(scanResultEl, { success: false, error: 'Unknown barcode: ' + barcode });
    } else {
      student.laps += 1;
      saveStudents(students);
      showResult(scanResultEl, {
        success: true,
        message: 'Lap logged',
        student: { id: student.id, name: student.name, total_laps: student.laps }
      });
      renderStudents();
      renderLeaderboard();
      renderAwards();
    }

    scanInput.value = '';
    scanInput.focus();
  }

  scanBtn.addEventListener('click', handleScan);
  scanInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); handleScan(); }
  });

  // Auto-submit after 120ms idle (for Bluetooth scanners)
  var autoTimer = null;
  scanInput.addEventListener('input', function () {
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = setTimeout(function () { autoTimer = null; handleScan(); }, 120);
  });

  // ── Leaderboard ────────────────────────────────────────────
  var leaderboardEl = document.getElementById('leaderboard-output');

  function renderLeaderboard() {
    var sorted = getStudents().slice().sort(function (a, b) { return b.laps - a.laps; });
    var ranked = sorted.map(function (s, i) {
      return { rank: i + 1, name: s.name, year: s.year, class: s.class, laps: s.laps, km: lapsTokm(s.laps).toFixed(2) };
    });
    showResult(leaderboardEl, ranked);
  }

  renderLeaderboard();

  // ── Activity log ───────────────────────────────────────────
  var activityStudentEl = document.getElementById('activity-student');
  var activityTypeEl    = document.getElementById('activity-type');
  var activityMinsEl    = document.getElementById('activity-minutes');
  var activityResultEl  = document.getElementById('activity-result');
  var activityLogList   = document.getElementById('activity-log-list');

  function populateStudentSelect() {
    activityStudentEl.innerHTML = '';
    getStudents().forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name + ' (' + s.year + ')';
      activityStudentEl.appendChild(opt);
    });
  }

  populateStudentSelect();

  function renderActivityLog() {
    var logs = getActivityLogs();
    if (!logs.length) { activityLogList.innerHTML = '<p style="color:#888;font-size:0.85rem;">No activity logged yet.</p>'; return; }
    var html = '<ul style="padding:0;list-style:none;margin:0;">';
    logs.slice(-10).reverse().forEach(function (l) {
      html += '<li style="padding:0.4rem 0;border-bottom:1px solid #f0f0f0;font-size:0.85rem;">' +
        l.student_name + ' – ' + l.activity_type + ' – ' + l.minutes + ' min – ' + l.date + '</li>';
    });
    html += '</ul>';
    activityLogList.innerHTML = html;
  }

  renderActivityLog();

  document.getElementById('log-activity-btn').addEventListener('click', function () {
    var studentId = activityStudentEl.value;
    var student   = getStudents().find(function (s) { return s.id === studentId; });
    var type      = activityTypeEl.value.trim() || 'General';
    var minutes   = Number(activityMinsEl.value || '0');

    if (!student || minutes <= 0) {
      showResult(activityResultEl, { success: false, error: 'Choose a student and enter valid minutes.' });
      return;
    }

    var logs = getActivityLogs();
    logs.push({
      id: 'activity-' + Date.now(),
      student_id: studentId,
      student_name: student.name,
      activity_type: type,
      minutes: minutes,
      date: new Date().toISOString().slice(0, 10)
    });
    saveActivityLogs(logs);
    showResult(activityResultEl, { success: true, message: 'Activity logged.', student: student.name, minutes: minutes });
    renderActivityLog();
    activityMinsEl.value = '';
  });

  // ── Reports & awards ───────────────────────────────────────
  var reportsResultEl = document.getElementById('reports-result');
  var awardsListEl    = document.getElementById('awards-list');

  var MILESTONES = [5, 10, 25, 50, 100, 200];

  function renderAwards() {
    var students = getStudents();
    var html = '';
    students.forEach(function (s) {
      var earned = MILESTONES.filter(function (m) { return s.laps >= m; });
      if (earned.length) {
        html += '<p style="margin:0.25rem 0;font-size:0.85rem;">&#127942; <strong>' + s.name + '</strong>: ' +
          earned.map(function (m) { return m + ' laps'; }).join(', ') + '</p>';
      }
    });
    awardsListEl.innerHTML = html || '<p style="color:#888;font-size:0.85rem;">No milestone awards yet. Start scanning!</p>';
  }

  renderAwards();

  document.getElementById('export-report-json-btn').addEventListener('click', function () {
    var payload = {
      exported_at: new Date().toISOString(),
      students: getStudents(),
      activity_logs: getActivityLogs()
    };
    downloadJson('runclub-report.json', payload);
    showResult(reportsResultEl, { success: true, message: 'Exported runclub-report.json' });
  });

  document.getElementById('export-report-csv-btn').addEventListener('click', function () {
    var sorted = getStudents().slice().sort(function (a, b) { return b.laps - a.laps; });
    var ranked = sorted.map(function (s, i) {
      return { rank: i + 1, name: s.name, year: s.year, class: s.class, laps: s.laps, km: lapsTokm(s.laps).toFixed(2) };
    });
    downloadCsv('leaderboard.csv', toCsv(ranked, ['rank', 'name', 'year', 'class', 'laps', 'km']));
    showResult(reportsResultEl, { success: true, message: 'Exported leaderboard.csv' });
  });

  document.getElementById('generate-awards-btn').addEventListener('click', function () {
    renderAwards();
    showResult(reportsResultEl, { success: true, message: 'Award cards refreshed from current lap totals.' });
  });

})();
