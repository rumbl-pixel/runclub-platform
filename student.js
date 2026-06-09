// student.js
// Student portal: login + profile + awards + goals (self-set & coach-assigned).
// Local-first: uses the shared RunClubScan roster so student IDs and laps match
// the admin dashboard and kiosk. Goals come from RunClubGoals.
(function () {
  'use strict';

  var Scan = window.RunClubScan;
  var Goals = window.RunClubGoals;
  var STUDENT_SESSION_KEY = 'runClubStudentSession';
  var TRAINING_KEY = 'rc_training';
  var TRAINING_CLICKS_KEY = 'rc_training_clicks';
  var SCAN_AUDIT_KEY = 'rc_scan_audit';

  var MILESTONE_LABELS = { 5: 'First 5 Laps', 10: '10 Lap Club', 25: 'Quarter Century', 50: 'Half Century', 100: 'Century Club', 200: 'Double Century', 500: 'Elite Runner' };
  var MEDAL_TIERS = [
    { name: 'Platinum', km: 42.2, color: '#8b5cf6' },
    { name: 'Gold', km: 20, color: '#d97706' },
    { name: 'Silver', km: 10, color: '#64748b' },
    { name: 'Bronze', km: 5, color: '#b45309' },
    { name: 'Starter', km: 0, color: '#0c5aa8' }
  ];

  var currentStudent = null;

  function getStudentSession() {
    try {
      return JSON.parse(localStorage.getItem(STUDENT_SESSION_KEY));
    } catch (_) {
      return null;
    }
  }

  function saveStudentSession(student) {
    localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify({
      code: student.barcode || student.id,
      student_id: student.id,
      saved_at: new Date().toISOString()
    }));
  }

  function clearStudentSession() {
    localStorage.removeItem(STUDENT_SESSION_KEY);
  }

  function loadLocal(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function saveLocal(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function sessionStudent() {
    var session = getStudentSession();
    if (!session || !session.code) { return null; }
    return findStudent(session.code);
  }

  // --- Login: look up the code against the shared roster ---
  function findStudent(code) {
    var c = String(code || '').trim().toUpperCase();
    if (c === 'DEMO') {
      return Scan.getStudents()[0] || null;
    }
    return Scan.getStudents().find(function (s) {
      return s.id.toUpperCase() === c || (s.barcode && s.barcode.toUpperCase() === c);
    });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch];
    });
  }

  function barcodeBarsHtml(code) {
    var patterns = {
      '0':'nnnwwnwnn','1':'wnnwnnnnw','2':'nnwwnnnnw','3':'wnwwnnnnn','4':'nnnwwnnnw',
      '5':'wnnwwnnnn','6':'nnwwwnnnn','7':'nnnwnnwnw','8':'wnnwnnwnn','9':'nnwwnnwnn',
      'A':'wnnnnwnnw','B':'nnwnnwnnw','C':'wnwnnwnnn','D':'nnnnwwnnw','E':'wnnnwwnnn',
      'F':'nnwnwwnnn','G':'nnnnnwwnw','H':'wnnnnwwnn','I':'nnwnnwwnn','J':'nnnnwwwnn',
      'K':'wnnnnnnww','L':'nnwnnnnww','M':'wnwnnnnwn','N':'nnnnwnnww','O':'wnnnwnnwn',
      'P':'nnwnwnnwn','Q':'nnnnnnwww','R':'wnnnnnwwn','S':'nnwnnnwwn','T':'nnnnwnwwn',
      'U':'wwnnnnnnw','V':'nwwnnnnnw','W':'wwwnnnnnn','X':'nwnnwnnnw','Y':'wwnnwnnnn',
      'Z':'nwwnwnnnn','-':'nwnnnnwnw','.':'wwnnnnwnn',' ':'nwwnnnwnn','*':'nwnnwnwnn'
    };
    var clean = String(code || '').toUpperCase().replace(/[^A-Z0-9 .-]/g, '');
    var encoded = '*' + clean + '*';
    var bars = '';
    for (var i = 0; i < encoded.length; i++) {
      var pattern = patterns[encoded.charAt(i)] || patterns['0'];
      for (var j = 0; j < pattern.length; j++) {
        var width = pattern.charAt(j) === 'w' ? 4 : 1.6;
        var color = j % 2 === 0 ? '#0b1f38' : 'transparent';
        bars += '<span style="width:' + width + 'px;background:' + color + ';"></span>';
      }
      bars += '<span style="width:1.6px;background:transparent;"></span>';
    }
    return '<div class="barcode-bars" aria-label="Barcode ' + escapeHtml(clean) + '">' + bars + '</div>';
  }

  function qrCodeHtml(code) {
    if (typeof qrcode !== 'function') {
      return '<div class="qr-code-fallback">' + escapeHtml(code) + '</div>';
    }
    var qr = qrcode(0, 'M');
    qr.addData(String(code || ''));
    qr.make();
    return '<div class="qr-code" aria-label="QR code ' + escapeHtml(code) + '">' + qr.createSvgTag(3, 1) + '</div>';
  }

  function barcodeCardHtml(student) {
    var code = student.barcode || student.id;
    return '<div class="barcode-card-preview">' +
      '<div class="barcode-card-school">Gwynne Park Run Club</div>' +
      '<strong class="barcode-card-name">' + escapeHtml(student.name) + '</strong>' +
      '<div class="barcode-card-meta">' + escapeHtml(student.year) + ' / ' + escapeHtml(student.cls) + '</div>' +
      '<div class="barcode-qr-row">' + barcodeBarsHtml(code) + qrCodeHtml(code) + '</div>' +
      '<div class="barcode-code">' + escapeHtml(code) + '</div>' +
      '</div>';
  }

  function printStudentBarcodeCard(student) {
    var win = window.open('', '_blank');
    if (!win) { return; }
    var code = student.barcode || student.id;
    var html = '<html><head><title>' + escapeHtml(student.name) + ' Barcode Card</title>' +
      '<style>@page{size:85.6mm 53.98mm;margin:0;}*{box-sizing:border-box;}body{margin:0;width:85.6mm;height:53.98mm;font-family:Arial,sans-serif;color:#102a43;}.barcode-card-print{width:85.6mm;height:53.98mm;border:0.35mm solid #0c5aa8;padding:4mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:1.2mm;}.barcode-card-school{font-size:3mm;font-weight:700;color:#0c5aa8;text-transform:uppercase;}.barcode-card-name{font-size:4.8mm;line-height:1.1;}.barcode-card-meta{font-size:2.9mm;color:#52616b;}.barcode-qr-row{display:flex;align-items:center;justify-content:center;gap:3mm;width:100%;}.barcode-bars{height:13mm;display:flex;align-items:stretch;justify-content:center;gap:0.45mm;width:54mm;margin-top:1mm;}.barcode-bars span{display:block;background:#0b1f38;height:100%;}.qr-code svg{display:block;width:18mm;height:18mm;}.qr-code-fallback{border:0.3mm solid #0b1f38;padding:2mm;font-size:2.2mm;}.barcode-code{font-family:Consolas,monospace;font-size:4.2mm;font-weight:700;letter-spacing:0.45mm;color:#0b1f38;}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}</style>' +
      '</head><body><div class="barcode-card-print">' +
      '<div class="barcode-card-school">Gwynne Park Run Club</div>' +
      '<strong class="barcode-card-name">' + escapeHtml(student.name) + '</strong>' +
      '<div class="barcode-card-meta">' + escapeHtml(student.year) + ' / ' + escapeHtml(student.cls) + '</div>' +
      '<div class="barcode-qr-row">' + barcodeBarsHtml(code) + qrCodeHtml(code) + '</div>' +
      '<div class="barcode-code">' + escapeHtml(code) + '</div>' +
      '</div></body></html>';
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  function renderStudentBarcode(student) {
    document.getElementById('student-barcode-display').innerHTML = barcodeCardHtml(student);
    document.getElementById('print-student-barcode-btn').onclick = function () {
      printStudentBarcodeCard(student);
    };
  }

  function renderAthlete(s) {
    var km = Scan.lapsToKm(s.laps).toFixed(2);
    document.getElementById('athlete-name').textContent = s.name;

    // Compute simple ranks from the roster.
    var roster = Scan.getStudents().slice().sort(function (a, b) { return b.laps - a.laps; });
    var schoolRank = roster.findIndex(function (x) { return x.id === s.id; }) + 1;
    var classmates = roster.filter(function (x) { return x.cls === s.cls; });
    var classRank = classmates.findIndex(function (x) { return x.id === s.id; }) + 1;

    document.getElementById('athlete-stats').innerHTML =
      '<div class="stat-box"><div class="stat-value">' + s.laps + '</div><div class="stat-label">Laps</div></div>' +
      '<div class="stat-box"><div class="stat-value">' + km + '</div><div class="stat-label">Km</div></div>' +
      '<div class="stat-box"><div class="stat-value">#' + schoolRank + '</div><div class="stat-label">School rank</div></div>' +
      '<div class="stat-box"><div class="stat-value">#' + classRank + '</div><div class="stat-label">Class rank</div></div>';

    var earned = Scan.MILESTONES.filter(function (m) { return s.laps >= m; });
    var awardsEl = document.getElementById('athlete-awards');
    awardsEl.innerHTML = earned.length
      ? earned.map(function (m) { return '<span class="award-badge">🏆 ' + (MILESTONE_LABELS[m] || (m + ' laps')) + '</span>'; }).join('')
      : '<p style="color:#888;font-size:0.85rem;">Keep running to earn your first award at 5 laps!</p>';

    document.getElementById('result-card').hidden = false;
    renderStudentBarcode(s);
    renderMedalProgress(s);
    renderGoals();
    renderStudentTimeline();
    renderTraining();
  }

  function trainingAssignmentsFor(studentId) {
    return loadLocal(TRAINING_KEY, []).filter(function (task) {
      return Array.isArray(task.assigned_student_ids) && task.assigned_student_ids.indexOf(studentId) !== -1;
    });
  }

  function recordTrainingClick(task) {
    var clicks = loadLocal(TRAINING_CLICKS_KEY, []);
    clicks.push({
      assignment_id: task.id,
      student_id: currentStudent.id,
      student_name: currentStudent.name,
      title: task.title,
      opened_at: new Date().toISOString()
    });
    saveLocal(TRAINING_CLICKS_KEY, clicks);
  }

  function trainingOpened(taskId) {
    return loadLocal(TRAINING_CLICKS_KEY, []).filter(function (click) {
      return click.assignment_id === taskId && click.student_id === currentStudent.id;
    }).sort(function (a, b) {
      return String(b.opened_at).localeCompare(String(a.opened_at));
    })[0] || null;
  }

  function renderTraining() {
    var listEl = document.getElementById('student-training-list');
    if (!listEl || !currentStudent) { return; }
    var tasks = trainingAssignmentsFor(currentStudent.id);
    if (!tasks.length) {
      listEl.innerHTML = '<p style="color:#888;font-size:0.85rem;">No training has been assigned yet.</p>';
      return;
    }
    listEl.innerHTML = tasks.slice().reverse().map(function (task) {
      var opened = trainingOpened(task.id);
      return '<div class="training-card">' +
        '<div class="training-card-head"><strong>' + escapeHtml(task.title) + '</strong>' +
        (opened ? '<span class="award-badge">Opened</span>' : '<span class="training-status-pill">New</span>') + '</div>' +
        '<p>' + escapeHtml(task.notes || 'Review this training task before your next run club session.') + '</p>' +
        '<div class="training-meta">' + (task.due_date ? 'Due ' + escapeHtml(task.due_date) : 'No due date') + (opened ? ' · Opened ' + new Date(opened.opened_at).toLocaleDateString() : '') + '</div>' +
        '<a class="btn-primary training-open-link" href="' + escapeHtml(task.url) + '" target="_blank" rel="noopener" data-training-id="' + escapeHtml(task.id) + '">Open training</a>' +
      '</div>';
    }).join('');
    document.querySelectorAll('.training-open-link').forEach(function (link) {
      link.addEventListener('click', function () {
        var task = tasks.find(function (item) { return item.id === link.dataset.trainingId; });
        if (task) { recordTrainingClick(task); }
      });
    });
  }

  function timelineKind(type) {
    return {
      scan: 'Lap scan',
      award: 'Award milestone',
      goal: 'Goal',
      training: 'Training assigned',
      training_opened: 'Training opened'
    }[type] || type;
  }

  function studentTimelineRows(student) {
    var rows = [];
    loadLocal(SCAN_AUDIT_KEY, []).forEach(function (row) {
      if (row.student_id === student.id && (row.success || row.undo)) {
        rows.push({
          date: row.time || new Date().toISOString(),
          type: row.undo ? 'scan' : 'scan',
          title: row.undo ? 'Lap adjusted by school' : 'Lap logged at run club',
          detail: row.undo ? 'A scan was corrected by staff.' : 'One lap was added to your total.',
          value: row.undo ? '-1 lap' : '+1 lap'
        });
      }
    });
    Scan.MILESTONES.filter(function (m) { return student.laps >= m; }).forEach(function (m) {
      rows.push({
        date: new Date().toISOString(),
        type: 'award',
        title: MILESTONE_LABELS[m] || (m + ' laps'),
        detail: 'Milestone currently earned.',
        value: m + ' laps'
      });
    });
    Goals.goalsFor(student.id).filter(function (goal) { return Goals.isMetricVisible(goal.metric); }).forEach(function (goal) {
      var progress = Goals.progress(student.id, goal);
      rows.push({
        date: goal.created_at || goal.created || new Date().toISOString(),
        type: 'goal',
        title: goal.title,
        detail: (goal.owner === 'coach' ? 'Coach goal' : 'Personal goal') + (progress.met ? ' achieved.' : ' in progress.'),
        value: progress.percent + '%'
      });
    });
    trainingAssignmentsFor(student.id).forEach(function (task) {
      rows.push({
        date: task.created_at || task.created || task.due_date || new Date().toISOString(),
        type: 'training',
        title: task.title,
        detail: task.due_date ? 'Due ' + task.due_date : 'Teacher-assigned training.',
        value: trainingOpened(task.id) ? 'Opened' : 'New'
      });
    });
    loadLocal(TRAINING_CLICKS_KEY, []).forEach(function (click) {
      if (click.student_id === student.id) {
        rows.push({
          date: click.opened_at || new Date().toISOString(),
          type: 'training_opened',
          title: click.title || 'Training opened',
          detail: 'You opened this training link.',
          value: 'Opened'
        });
      }
    });
    return rows.sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
  }

  function renderStudentTimeline() {
    var summaryEl = document.getElementById('student-timeline-summary');
    var listEl = document.getElementById('student-timeline-list');
    if (!summaryEl || !listEl || !currentStudent) { return; }
    var rows = studentTimelineRows(currentStudent);
    var scanCount = rows.filter(function (row) { return row.type === 'scan'; }).length;
    var awardCount = rows.filter(function (row) { return row.type === 'award'; }).length;
    var trainingCount = rows.filter(function (row) { return row.type === 'training' || row.type === 'training_opened'; }).length;
    summaryEl.innerHTML = '<div class="progress-summary-grid">' +
      '<div class="stat-box"><div class="stat-value">' + rows.length + '</div><div class="stat-label">Timeline events</div></div>' +
      '<div class="stat-box"><div class="stat-value">' + scanCount + '</div><div class="stat-label">Run events</div></div>' +
      '<div class="stat-box"><div class="stat-value">' + awardCount + '</div><div class="stat-label">Milestones</div></div>' +
      '<div class="stat-box"><div class="stat-value">' + trainingCount + '</div><div class="stat-label">Training</div></div>' +
      '</div>';
    if (!rows.length) {
      listEl.innerHTML = '<p style="color:#888;font-size:0.85rem;">No timeline events yet. Your run club progress will appear here after sessions and teacher-assigned tasks.</p>';
      return;
    }
    listEl.innerHTML = '<div class="student-timeline">' + rows.slice(0, 40).map(function (row) {
      return '<div class="timeline-item timeline-item--' + escapeHtml(row.type) + '">' +
        '<div class="timeline-date">' + new Date(row.date).toLocaleDateString() + '</div>' +
        '<div class="timeline-body"><strong>' + escapeHtml(row.title) + '</strong><span>' + escapeHtml(timelineKind(row.type)) + ' · ' + escapeHtml(row.value) + '</span><p>' + escapeHtml(row.detail) + '</p></div>' +
        '</div>';
    }).join('') + '</div>';
  }

  function wireStudentTabs() {
    document.querySelectorAll('[data-student-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('[data-student-tab]').forEach(function (tab) { tab.classList.remove('active'); });
        document.querySelectorAll('.student-tab-panel').forEach(function (panel) { panel.classList.remove('active'); });
        btn.classList.add('active');
        var panel = document.getElementById('tab-student-' + btn.dataset.studentTab);
        if (panel) { panel.classList.add('active'); }
      });
    });
  }

  function renderMedalProgress(student) {
    var km = Scan.totalKm(student);
    var current = MEDAL_TIERS.find(function (tier) { return km >= tier.km; }) || MEDAL_TIERS[MEDAL_TIERS.length - 1];
    var next = MEDAL_TIERS.slice().reverse().find(function (tier) { return tier.km > km; });
    var percent = next ? Math.min(100, Math.round((km / next.km) * 100)) : 100;
    var nextCopy = next
      ? (next.name + ' at ' + next.km + ' km')
      : 'Top medal reached';
    document.getElementById('medal-progress').innerHTML =
      '<div class="goal-head"><strong style="color:' + current.color + ';">' + current.name + '</strong></div>' +
      '<div class="goal-meta">' + km.toFixed(2) + ' km total · Next: ' + nextCopy + '</div>' +
      '<div class="goal-bar"><div class="goal-bar-fill" style="width:' + percent + '%;background:' + current.color + ';"></div></div>';
  }

  // --- Goals rendering ---
  function goalRow(g, editable) {
    var p = Goals.progress(currentStudent.id, g);
    var info = Goals.metricInfo(g.metric);
    var currentTxt = p.current == null ? '—' : p.current + ' ' + g.unit;
    var progressLabel = info.kind === 'cumulative' ? 'Since set' : 'Best';
    var lock = editable ? '' : '<span title="Set by your coach" style="margin-left:6px;">🔒</span>';
    var status = p.met ? '<span class="award-badge">✓ Achieved</span>' : '';
    var deadline = g.deadline ? '<span style="color:#888;font-size:0.78rem;">by ' + g.deadline + '</span>' : '';

    var actions = '';
    if (editable) {
      actions = '<button class="link-btn" data-act="del" data-id="' + g.id + '">Delete</button>';
    }
    // PB metrics let you log a result (student can log own; coach goals are read-only here).
    var logBtn = (!info.auto && editable)
      ? '<button class="link-btn" data-act="log" data-id="' + g.id + '">Log result</button>' : '';

    return '<div class="goal-item">' +
      '<div class="goal-head"><strong>' + g.title + '</strong> ' + lock + ' ' + status + '</div>' +
      '<div class="goal-meta">Target: ' + g.target + ' ' + g.unit + ' · ' + progressLabel + ': ' + currentTxt + ' ' + deadline + '</div>' +
      '<div class="goal-bar"><div class="goal-bar-fill" style="width:' + p.percent + '%"></div></div>' +
      '<div class="goal-actions">' + logBtn + ' ' + actions + '</div>' +
      '</div>';
  }

  function renderGoals() {
    var all = Goals.goalsFor(currentStudent.id).filter(function (g) { return Goals.isMetricVisible(g.metric); });
    var mine = all.filter(function (g) { return g.owner === 'student'; });
    var coach = all.filter(function (g) { return g.owner === 'coach'; });

    document.getElementById('my-goals-list').innerHTML = mine.length
      ? mine.map(function (g) { return goalRow(g, true); }).join('')
      : '<p style="color:#888;font-size:0.85rem;">No personal goals yet. Tap “+ Add goal” to set one.</p>';

    document.getElementById('coach-goals-list').innerHTML = coach.length
      ? coach.map(function (g) { return goalRow(g, false); }).join('')
      : '<p style="color:#888;font-size:0.85rem;">Your coach hasn’t set you a goal yet.</p>';

    bindGoalActions();
  }

  function bindGoalActions() {
    document.querySelectorAll('#my-goals-list [data-act]').forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.dataset.id;
        if (btn.dataset.act === 'del') {
          if (confirm('Delete this goal?')) { Goals.deleteGoal(currentStudent.id, id); renderGoals(); }
        } else if (btn.dataset.act === 'log') {
          var v = prompt('Log your result (number only):');
          if (v !== null && v.trim() && !isNaN(Number(v))) { Goals.logResult(currentStudent.id, id, v); renderGoals(); }
        }
        renderStudentTimeline();
      };
    });
  }

  // --- Add-goal form (the "+" button) ---
  function buildMetricOptions() {
    return Goals.visibleMetrics().map(function (metric) {
      return '<option value="' + metric.key + '">' + metric.label + ' (' + metric.unit + ')</option>';
    }).join('');
  }

  function wireAddGoal() {
    document.getElementById('metric').innerHTML = buildMetricOptions();
    var panel = document.getElementById('add-goal-panel');
    document.getElementById('add-goal-btn').addEventListener('click', function () {
      panel.hidden = !panel.hidden;
    });
    document.getElementById('add-goal-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var metric = document.getElementById('metric').value;
      var target = document.getElementById('goal-target').value;
      var deadline = document.getElementById('goal-deadline').value;
      var title = document.getElementById('goal-title').value;
      if (!target || isNaN(Number(target))) { return; }
      Goals.addGoal(currentStudent.id, 'student', { metric: metric, target: target, deadline: deadline, title: title });
      e.target.reset();
      panel.hidden = true;
      renderGoals();
      renderStudentTimeline();
    });
  }

  function handleLogin(e) {
    e.preventDefault();
    var code = document.getElementById('code').value.trim().toUpperCase();
    if (!code) { return; }
    var student = findStudent(code);
    if (!student) {
      alert('Code not recognised. Check your barcode card or ask your teacher.');
      return;
    }
    saveStudentSession(student);
    window.location.href = 'student-profile.html';
  }

  // --- Init ---
  var studentForm = document.getElementById('student-form');
  var resultCard = document.getElementById('result-card');

  if (studentForm) {
    if (sessionStudent()) {
      window.location.href = 'student-profile.html';
      return;
    }
    studentForm.addEventListener('submit', handleLogin);
  }

  if (resultCard) {
    var student = sessionStudent();
    if (!student) {
      window.location.href = 'student.html';
      return;
    }
    currentStudent = student;
    wireStudentTabs();
    renderAthlete(student);
    wireAddGoal();

    var logoutBtn = document.getElementById('student-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        clearStudentSession();
        window.location.href = 'student.html';
      });
    }
  }
})();
