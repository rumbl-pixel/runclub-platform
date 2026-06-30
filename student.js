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
  var TRAINING_COMPLETIONS_KEY = 'rc_training_completions';
  var SCAN_AUDIT_KEY = 'rc_scan_audit';
  var GOAL_REFLECTIONS_KEY = 'rc_goal_reflections';
  var MEDICAL_NOTES_KEY = 'rc_medical_notes';
  var STUDENT_NOTIFICATIONS_KEY = 'rc_student_notifications';

  var MILESTONE_LABELS = { 5: 'First 5 Laps', 10: '10 Lap Club', 25: 'Quarter Century', 50: 'Half Century', 100: 'Century Club', 200: 'Double Century', 500: 'Elite Runner' };
  var MEDAL_TIERS = [
    { name: 'Platinum', km: 42.2, color: '#8b5cf6' },
    { name: 'Gold', km: 20, color: '#d97706' },
    { name: 'Silver', km: 10, color: '#64748b' },
    { name: 'Bronze', km: 5, color: '#b45309' },
    { name: 'Starter', km: 0, color: '#0c5aa8' }
  ];

  var currentStudent = null;

  function schedulePrintWindow(printWin) {
    var trigger = function () {
      setTimeout(function () {
        try { printWin.focus(); printWin.print(); } catch (error) {}
      }, 120);
    };
    if (printWin.document.readyState === 'complete') { trigger(); }
    else { printWin.addEventListener('load', trigger, { once: true }); }
  }

  function getStudentSession() {
    try {
      return JSON.parse(localStorage.getItem(STUDENT_SESSION_KEY));
    } catch (_) {
      return null;
    }
  }

  function getAdminSession() {
    try {
      return JSON.parse(localStorage.getItem('runClubAdminSession'));
    } catch (_) {
      return null;
    }
  }

  function queryParams() {
    return new URLSearchParams(window.location.search);
  }

  function isAdminProfileView() {
    var params = queryParams();
    return params.get('view') === 'admin' && !!getAdminSession();
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

  function renderStudentNotifications(student) {
    var el = document.getElementById('student-notifications');
    if (!el) { return; }
    var rows = loadLocal(STUDENT_NOTIFICATIONS_KEY, []).filter(function (row) {
      return row.student_id === student.id;
    }).slice().reverse().slice(0, 4);
    if (!rows.length) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }
    el.hidden = false;
    el.innerHTML = '<div class="student-notification-head"><strong>Coach reminders</strong><span>New notes from your run club team</span></div>' +
      rows.map(function (row) {
        return '<div class="student-notification-card"><strong>' + escapeHtml(row.title || 'Coach reminder') + '</strong><p>' + escapeHtml(row.message || '') + '</p><small>' + new Date(row.created_at).toLocaleDateString() + '</small></div>';
      }).join('');
  }

  function sessionStudent() {
    var session = getStudentSession();
    if (!session || !session.code) { return null; }
    return findStudent(session.code);
  }

  function studentFromQuery() {
    var params = queryParams();
    var code = params.get('student') || params.get('studentId') || params.get('barcode');
    if (!code) { return null; }
    return findStudent(code);
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

  function escapeAttr(value) {
    return escapeHtml(value).replace(/"/g, '&quot;');
  }

  function isExternalTrainingUrl(value) {
    return /^https?:\/\//i.test(String(value || '').trim());
  }

  function parseTrainingExerciseResources(notes) {
    return String(notes || '').split(/\n|;/).map(function (line) {
      var text = line.trim();
      var markdown = text.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/i);
      if (markdown) {
        return { label: markdown[1].trim(), url: markdown[2].trim() };
      }
      var pipe = text.match(/^(.+?)\s*\|\s*(https?:\/\/\S+)$/i);
      if (pipe) {
        return { label: pipe[1].trim(), url: pipe[2].trim() };
      }
      return text ? { label: text, url: '' } : null;
    }).filter(Boolean);
  }

  function trainingNotesHtml(task) {
    var resources = parseTrainingExerciseResources(task.notes);
    if (!resources.length) {
      return '<p>' + escapeHtml(task.notes || 'Review this training task before your next run club session.') + '</p>';
    }
    return '<ul class="training-exercise-list">' + resources.map(function (resource) {
      var label = escapeHtml(resource.label);
      return '<li>' + (resource.url
        ? '<a class="training-exercise-link" href="' + escapeAttr(resource.url) + '" target="_blank" rel="noopener" data-training-id="' + escapeAttr(task.id) + '">' + label + '</a>'
        : '<span>' + label + '</span>') + '</li>';
    }).join('') + '</ul>';
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
      '<div class="barcode-card-school">Corso</div>' +
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
      '<div class="barcode-card-school">Corso</div>' +
      '<strong class="barcode-card-name">' + escapeHtml(student.name) + '</strong>' +
      '<div class="barcode-card-meta">' + escapeHtml(student.year) + ' / ' + escapeHtml(student.cls) + '</div>' +
      '<div class="barcode-qr-row">' + barcodeBarsHtml(code) + qrCodeHtml(code) + '</div>' +
      '<div class="barcode-code">' + escapeHtml(code) + '</div>' +
      '</div></body></html>';
    win.document.write(html);
    win.document.close();
    schedulePrintWindow(win);
  }

  function renderStudentBarcode(student) {
    document.getElementById('student-barcode-display').innerHTML = barcodeCardHtml(student);
    document.getElementById('print-student-barcode-btn').onclick = function () {
      printStudentBarcodeCard(student);
    };
  }

  function medicalNotesFor(student) {
    var rows = loadLocal(MEDICAL_NOTES_KEY, {});
    return rows && student ? rows[student.id] || null : null;
  }

  function medicalLine(label, value) {
    return value ? '<div class="medical-note-row"><strong>' + escapeHtml(label) + '</strong><span>' + escapeHtml(value) + '</span></div>' : '';
  }

  function renderStudentMedical(student) {
    var el = document.getElementById('student-medical-summary');
    if (!el || !student) { return; }
    var notes = medicalNotesFor(student);
    if (!notes || !Object.keys(notes).some(function (key) { return !!notes[key]; })) {
      el.innerHTML = '<p style="color:#888;font-size:0.85rem;">No run club medical safety notes are currently recorded. Ask a parent or teacher if this needs updating.</p>';
      return;
    }
    var html = '<div class="medical-note-list">' +
      medicalLine('Asthma', notes.asthma) +
      medicalLine('Anaphylaxis / allergies', notes.anaphylaxis) +
      medicalLine('Medication carried', notes.medication) +
      medicalLine('Emergency action note', notes.emergency_note) +
      '<div class="medical-note-row"><strong>School health plan</strong><span>' + (notes.health_plan_supplied ? 'Parent supplied to school' : 'Not marked as supplied') + '</span></div>' +
      medicalLine('Last reviewed', notes.reviewed_at) +
      '</div><p class="medical-note-disclaimer">For run club safety reference only. Staff should follow official school health care plans in emergencies.</p>';
    el.innerHTML = html;
  }

  function renderAdminProfileTools(student) {
    var tools = document.getElementById('admin-profile-tools');
    if (!tools || !student) { return; }
    if (!isAdminProfileView()) {
      tools.hidden = true;
      return;
    }
    var studentCode = encodeURIComponent(student.id || student.barcode);
    var backLink = document.getElementById('admin-profile-back-link');
    var trainingLink = document.getElementById('admin-profile-training-link');
    if (backLink) { backLink.href = 'admin-dashboard.html?tab=students&student=' + studentCode; }
    if (trainingLink) { trainingLink.href = 'admin-dashboard.html?tab=training&student=' + studentCode; }
    tools.hidden = false;
  }

  function currentTermLabel() {
    var now = new Date();
    var month = now.getMonth();
    var term = month < 3 ? 'Term 1' : month < 6 ? 'Term 2' : month < 9 ? 'Term 3' : 'Term 4';
    return term + ' ' + now.getFullYear();
  }

  function studentTermReportRows(student) {
    var rows = studentTimelineRows(student);
    var goals = Goals.goalsFor(student.id).filter(function (goal) {
      return Goals.isMetricVisible(goal.metric);
    });
    var openedTraining = trainingAssignmentsFor(student.id).filter(function (task) {
      return trainingOpened(task.id);
    }).length;
    var earned = Scan.MILESTONES.filter(function (m) { return student.laps >= m; });
    return {
      term: currentTermLabel(),
      laps: student.laps || 0,
      distance: Scan.totalKm(student).toFixed(2) + ' km',
      awards: earned.map(function (m) { return MILESTONE_LABELS[m] || (m + ' laps'); }),
      goals: goals.map(function (goal) {
        var progress = Goals.progress(student.id, goal);
        return {
          title: goal.title,
          owner: goal.owner === 'coach' ? 'Coach' : 'Student',
          progress: progress.percent + '%',
          status: progress.met ? 'Achieved' : 'In progress'
        };
      }),
      training: {
        assigned: trainingAssignmentsFor(student.id).length,
        opened: openedTraining
      },
      timeline: rows.slice(0, 12)
    };
  }

  function printStudentTermReport(student) {
    var report = studentTermReportRows(student);
    var win = window.open('', '_blank');
    if (!win) { return; }
    var awardRows = report.awards.length
      ? report.awards.map(function (award) { return '<li>' + escapeHtml(award) + '</li>'; }).join('')
      : '<li>No awards earned yet.</li>';
    var goalRows = report.goals.length
      ? report.goals.map(function (goal) {
        return '<tr><td>' + escapeHtml(goal.title) + '</td><td>' + escapeHtml(goal.owner) + '</td><td>' + escapeHtml(goal.progress) + '</td><td>' + escapeHtml(goal.status) + '</td></tr>';
      }).join('')
      : '<tr><td colspan="4">No active goals yet.</td></tr>';
    var timelineRows = report.timeline.length
      ? report.timeline.map(function (row) {
        return '<tr><td>' + new Date(row.date).toLocaleDateString() + '</td><td>' + escapeHtml(timelineKind(row.type)) + '</td><td>' + escapeHtml(row.title) + '</td><td>' + escapeHtml(row.value) + '</td></tr>';
      }).join('')
      : '<tr><td colspan="4">No progress events yet.</td></tr>';
    var html = '<html><head><title>' + escapeHtml(student.name) + ' Term Progress Report</title>' +
      '<style>@page{size:A4;margin:14mm;}*{box-sizing:border-box;}body{font-family:Arial,sans-serif;color:#102a43;margin:0;}header{border-bottom:3px solid #003880;padding-bottom:8mm;margin-bottom:8mm;}h1{color:#003880;margin:0 0 2mm;font-size:24pt;}h2{color:#003880;margin:8mm 0 3mm;font-size:14pt;}.meta{color:#4b5563;font-size:10pt;}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin:6mm 0;}.box{border:1px solid #d9e2ec;border-left:4px solid #c99722;padding:4mm;border-radius:2mm;}.value{font-size:18pt;font-weight:700;color:#003880;}.label{text-transform:uppercase;font-size:8pt;color:#64748b;}table{width:100%;border-collapse:collapse;font-size:9.5pt;}th{background:#eef4fb;color:#0b1f38;text-align:left;}th,td{border-bottom:1px solid #d9e2ec;padding:2.5mm;}ul{margin-top:0;}footer{margin-top:10mm;color:#64748b;font-size:8pt;}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}</style>' +
      '</head><body><header><h1>Corso</h1><div class="meta">' + escapeHtml(report.term) + ' progress report for ' + escapeHtml(student.name) + ' - ' + escapeHtml(student.year) + ' / ' + escapeHtml(student.cls) + '</div></header>' +
      '<section class="summary"><div class="box"><div class="value">' + report.laps + '</div><div class="label">Laps</div></div><div class="box"><div class="value">' + escapeHtml(report.distance) + '</div><div class="label">Distance</div></div><div class="box"><div class="value">' + report.training.opened + ' / ' + report.training.assigned + '</div><div class="label">Training Opened</div></div></section>' +
      '<h2>Awards</h2><ul>' + awardRows + '</ul>' +
      '<h2>Goals</h2><table><thead><tr><th>Goal</th><th>Set By</th><th>Progress</th><th>Status</th></tr></thead><tbody>' + goalRows + '</tbody></table>' +
      '<h2>Recent Progress</h2><table><thead><tr><th>Date</th><th>Type</th><th>Event</th><th>Value</th></tr></thead><tbody>' + timelineRows + '</tbody></table>' +
      '<footer>Generated from local Corso demo data. Use the browser print dialog to save this report as a PDF.</footer>' +
      '</body></html>';
    win.document.write(html);
    win.document.close();
    schedulePrintWindow(win);
  }

  function wireStudentTermReport(student) {
    var btn = document.getElementById('print-student-term-report-btn');
    if (!btn) { return; }
    btn.onclick = function () {
      printStudentTermReport(student);
    };
  }

  function awardDisplayRows(student) {
    var earned = Scan.MILESTONES.filter(function (m) { return student.laps >= m; });
    var next = Scan.MILESTONES.find(function (m) { return student.laps < m; });
    var rows = earned.map(function (m) {
      return {
        status: 'earned',
        title: MILESTONE_LABELS[m] || (m + ' laps'),
        detail: m + ' laps completed',
        progress: 100
      };
    });
    if (next) {
      rows.push({
        status: 'next',
        title: MILESTONE_LABELS[next] || (next + ' laps'),
        detail: Math.max(0, next - student.laps) + ' laps to go',
        progress: Math.min(100, Math.round((student.laps / next) * 100))
      });
    }
    return rows;
  }

  function collectedBadgeRows(student) {
    return Scan.MILESTONES.filter(function (m) { return student.laps >= m; }).map(function (m) {
      return {
        title: MILESTONE_LABELS[m] || (m + ' laps'),
        laps: m,
        detail: m + ' lap badge'
      };
    });
  }

  function collectedBadgesHtml(rows) {
    if (!rows.length) {
      return '<div class="collected-badge-empty"><strong>No badges collected yet</strong><span>Your first badge unlocks at 5 laps.</span></div>';
    }
    return '<div class="collected-badge-shelf" aria-label="Collected award badges">' + rows.map(function (row) {
      return '<div class="collected-badge" title="' + escapeHtml(row.detail) + '">' +
        '<span class="collected-badge-icon">&#127942;</span>' +
        '<strong>' + escapeHtml(row.title) + '</strong>' +
        '<small>' + row.laps + ' laps</small>' +
      '</div>';
    }).join('') + '</div>';
  }

  function awardCardsHtml(rows) {
    if (!rows.length) {
      return '<p style="color:#888;font-size:0.85rem;">Keep running to earn your first award at 5 laps!</p>';
    }
    return '<div class="award-card-grid">' + rows.map(function (row) {
      return '<div class="award-card award-card--' + escapeHtml(row.status) + '">' +
        '<div class="award-card-icon">' + (row.status === 'earned' ? '&#127942;' : '&#11088;') + '</div>' +
        '<div><strong>' + escapeHtml(row.title) + '</strong><p>' + escapeHtml(row.detail) + '</p>' +
        '<div class="award-card-bar"><span style="width:' + row.progress + '%"></span></div></div>' +
        '</div>';
    }).join('') + '</div>';
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

    var awardsEl = document.getElementById('athlete-awards');
    var collectedBadgesEl = document.getElementById('collected-badges');
    if (collectedBadgesEl) {
      collectedBadgesEl.innerHTML = collectedBadgesHtml(collectedBadgeRows(s));
    }
    awardsEl.innerHTML = awardCardsHtml(awardDisplayRows(s));

    document.getElementById('result-card').hidden = false;
    renderStudentNotifications(s);
    renderStudentBarcode(s);
    wireStudentTermReport(s);
    renderMedalProgress(s);
    renderGoals();
    renderGoalReflections();
    renderStudentTimeline();
    renderTraining();
    renderStudentMedical(s);
    renderAdminProfileTools(s);
  }

  function trainingAssignmentsFor(studentId) {
    return loadLocal(TRAINING_KEY, []).filter(function (task) {
      return Array.isArray(task.assigned_student_ids) && task.assigned_student_ids.indexOf(studentId) !== -1;
    });
  }

  function liveStudentDataGuard() {
    var backend = window.RunClubBackend;
    var readiness = window.RunClubBackend && window.RunClubBackend.backendReadiness ? window.RunClubBackend.backendReadiness() : { liveDataMode: false, realDataAllowed: false };
    if (!readiness.liveDataMode) { return { ok: true, live: false }; }
    if (backend && backend.requiresLiveBackend) {
      var guard = backend.requiresLiveBackend();
      if (guard.ok) { return { ok: true, live: true }; }
      return { ok: false, live: true, message: 'Local training event blocked until the live backend is ready.' };
    }
    return { ok: false, live: true, message: 'Local training event blocked until the live backend is ready.' };
  }

  function recordTrainingEventWithBackend(task, eventType) {
    var guard = liveStudentDataGuard();
    if (!guard.ok) { return Promise.resolve({ ok: false, blocked: true, error: guard.message || 'Local training event blocked.' }); }
    if (guard.live && window.RunClubBackend && window.RunClubBackend.backendDataAccess && window.RunClubBackend.backendDataAccess.recordTrainingEvent) {
      return window.RunClubBackend.backendDataAccess.recordTrainingEvent({
        assignment_id: task.backend_id || task.id,
        student_id: currentStudent.id,
        event_type: eventType,
        title: task.title,
        metadata: { source_screen: 'student-profile', student_name: currentStudent.name }
      });
    }
    return Promise.resolve({ ok: true, local: true });
  }

  function recordTrainingClick(task) {
    return recordTrainingEventWithBackend(task, 'opened').then(function (result) {
      if (!result.ok) { return result; }
      var clicks = loadLocal(TRAINING_CLICKS_KEY, []);
      clicks.push({
        assignment_id: task.id,
        student_id: currentStudent.id,
        student_name: currentStudent.name,
        title: task.title,
        opened_at: new Date().toISOString()
      });
      saveLocal(TRAINING_CLICKS_KEY, clicks);
      return result;
    });
  }

  function trainingOpened(taskId) {
    return loadLocal(TRAINING_CLICKS_KEY, []).filter(function (click) {
      return click.assignment_id === taskId && click.student_id === currentStudent.id;
    }).sort(function (a, b) {
      return String(b.opened_at).localeCompare(String(a.opened_at));
    })[0] || null;
  }

  function trainingCompletionFor(taskId) {
    return loadLocal(TRAINING_COMPLETIONS_KEY, []).filter(function (row) {
      return row.assignment_id === taskId && row.student_id === currentStudent.id;
    }).sort(function (a, b) {
      return String(b.completed_at || '').localeCompare(String(a.completed_at || ''));
    })[0] || null;
  }

  function recordTrainingCompletion(task) {
    return recordTrainingEventWithBackend(task, 'completed').then(function (result) {
      if (!result.ok) { return result; }
      var rows = loadLocal(TRAINING_COMPLETIONS_KEY, []);
      if (rows.some(function (row) { return row.assignment_id === task.id && row.student_id === currentStudent.id; })) {
        return result;
      }
      rows.push({
        assignment_id: task.id,
        student_id: currentStudent.id,
        student_name: currentStudent.name,
        title: task.title,
        completed_at: new Date().toISOString()
      });
      saveLocal(TRAINING_COMPLETIONS_KEY, rows.slice(-500));
      return result;
    });
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
      var completed = trainingCompletionFor(task.id);
      var externalUrl = isExternalTrainingUrl(task.url);
      return '<div class="training-card training-checklist-card' + (completed ? ' training-checklist-card--complete' : '') + '">' +
        '<label class="training-checklist-row">' +
          '<input class="training-complete-check" type="checkbox" data-training-id="' + escapeAttr(task.id) + '"' + (completed ? ' checked disabled' : '') + ' />' +
          '<span class="training-checklist-copy"><span class="training-card-head"><strong>' + escapeHtml(task.title) + '</strong>' +
          (completed ? '<span class="award-badge">Completed</span>' : opened ? '<span class="award-badge">Opened</span>' : '<span class="training-status-pill">New</span>') + '</span></span>' +
        '</label>' +
        trainingNotesHtml(task) +
        '<div class="training-meta">' + (task.due_date ? 'Due ' + escapeHtml(task.due_date) : 'No due date') + (opened ? ' · Opened ' + new Date(opened.opened_at).toLocaleDateString() : '') + (completed ? ' · Completed ' + new Date(completed.completed_at).toLocaleDateString() : '') + '</div>' +
        '<div class="training-actions">' + (externalUrl ? '<a class="btn-primary training-open-link" href="' + escapeAttr(task.url) + '" target="_blank" rel="noopener" data-training-id="' + escapeAttr(task.id) + '">Open training</a>' : '') + '</div>' +
      '</div>';
    }).join('');
    document.querySelectorAll('.training-open-link, .training-exercise-link').forEach(function (link) {
      link.addEventListener('click', function () {
        var task = tasks.find(function (item) { return item.id === link.dataset.trainingId; });
        if (task) { recordTrainingClick(task); }
      });
    });
    document.querySelectorAll('.training-complete-check').forEach(function (checkbox) {
      checkbox.addEventListener('change', function () {
        var task = tasks.find(function (item) { return item.id === checkbox.dataset.trainingId; });
        if (task) {
          checkbox.disabled = true;
          recordTrainingCompletion(task).then(function (result) {
            if (!result.ok) {
              checkbox.checked = false;
              checkbox.disabled = false;
              return;
            }
            renderTraining();
            renderStudentTimeline();
          });
        }
      });
    });
  }

  function timelineKind(type) {
    return {
      attendance: 'Run club attendance'
    }[type] || type;
  }

  function studentTimelineRows(student) {
    var attendanceByDay = {};
    loadLocal(SCAN_AUDIT_KEY, []).forEach(function (row) {
      if (row.student_id === student.id && row.success && !row.attendance_only) {
        var isoDate = row.time || new Date().toISOString();
        var dayKey = isoDate.slice(0, 10);
        if (!attendanceByDay[dayKey]) {
          attendanceByDay[dayKey] = {
            date: isoDate,
            laps: 0
          };
        }
        attendanceByDay[dayKey].laps += row.undo ? -1 : 1;
      }
    });

    return Object.keys(attendanceByDay).map(function (dayKey) {
      var day = attendanceByDay[dayKey];
      var laps = Math.max(0, day.laps);
      return {
        date: day.date,
        type: 'attendance',
        title: 'Attended run club',
        detail: 'Run club attendance recorded by the school scanner.',
        value: laps + ' ' + (laps === 1 ? 'lap' : 'laps'),
        laps: laps
      };
    }).filter(function (row) {
      return row.laps > 0;
    }).sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
  }

  function renderStudentTimeline() {
    var summaryEl = document.getElementById('student-timeline-summary');
    var listEl = document.getElementById('student-timeline-list');
    if (!summaryEl || !listEl || !currentStudent) { return; }
    var rows = studentTimelineRows(currentStudent);
    var totalLaps = rows.reduce(function (sum, row) { return sum + row.laps; }, 0);
    var totalKm = Scan.lapsToKm ? Scan.lapsToKm(totalLaps) : totalLaps * 0.25;
    summaryEl.innerHTML = '<div class="progress-summary-grid">' +
      '<div class="stat-box"><div class="stat-value">' + rows.length + '</div><div class="stat-label">Days attended</div></div>' +
      '<div class="stat-box"><div class="stat-value">' + totalLaps + '</div><div class="stat-label">Timeline laps</div></div>' +
      '<div class="stat-box"><div class="stat-value">' + totalKm.toFixed(2) + '</div><div class="stat-label">Timeline km</div></div>' +
      '</div>';
    if (!rows.length) {
      listEl.innerHTML = '<p style="color:#888;font-size:0.85rem;">No run club attendance has been recorded yet. Days attended and laps completed will appear here after school-run sessions.</p>';
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
        renderGoalReflections();
        renderStudentTimeline();
      };
    });
  }

  function studentGoalReflectionRows() {
    return loadLocal(GOAL_REFLECTIONS_KEY, []).filter(function (reflection) {
      return reflection.student_id === currentStudent.id;
    }).sort(function (a, b) {
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
  }

  function activeGoalOptions() {
    return Goals.goalsFor(currentStudent.id).filter(function (goal) {
      return Goals.isMetricVisible(goal.metric);
    });
  }

  function renderGoalReflectionOptions(goals) {
    var select = document.getElementById('goal-reflection-goal');
    if (!select) { return; }
    if (!goals.length) {
      select.innerHTML = '<option value="">No goals yet</option>';
      select.disabled = true;
      return;
    }
    select.disabled = false;
    select.innerHTML = goals.map(function (goal) {
      return '<option value="' + escapeHtml(goal.id) + '">' + escapeHtml(goal.title) + '</option>';
    }).join('');
  }

  function recordGoalReflection(goalId, feeling, note) {
    var goals = activeGoalOptions();
    var goal = goals.find(function (item) { return item.id === goalId; });
    if (!goal) { return false; }
    var rows = loadLocal(GOAL_REFLECTIONS_KEY, []);
    rows.push({
      id: 'reflection-' + Date.now(),
      student_id: currentStudent.id,
      student_name: currentStudent.name,
      goal_id: goal.id,
      goal_title: goal.title,
      feeling: feeling,
      note: String(note || '').trim(),
      created_at: new Date().toISOString()
    });
    saveLocal(GOAL_REFLECTIONS_KEY, rows.slice(-300));
    return true;
  }

  function renderGoalReflections() {
    var listEl = document.getElementById('goal-reflection-list');
    if (!listEl || !currentStudent) { return; }
    var goals = activeGoalOptions();
    renderGoalReflectionOptions(goals);
    var rows = studentGoalReflectionRows();
    if (!rows.length) {
      listEl.innerHTML = '<p style="color:#888;font-size:0.85rem;margin-top:0.75rem;">No reflections yet. These notes do not add laps or activity.</p>';
      return;
    }
    listEl.innerHTML = '<div class="reflection-list">' + rows.slice(0, 6).map(function (row) {
      return '<div class="reflection-item"><strong>' + escapeHtml(row.goal_title) + '</strong>' +
        '<span>' + escapeHtml(row.feeling) + ' · ' + new Date(row.created_at).toLocaleDateString() + '</span>' +
        (row.note ? '<p>' + escapeHtml(row.note) + '</p>' : '') +
        '</div>';
    }).join('') + '</div>';
  }

  function wireGoalReflection() {
    var form = document.getElementById('goal-reflection-form');
    if (!form) { return; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var goalId = document.getElementById('goal-reflection-goal').value;
      var feeling = document.getElementById('goal-reflection-feeling').value;
      var note = document.getElementById('goal-reflection-note').value;
      if (recordGoalReflection(goalId, feeling, note)) {
        document.getElementById('goal-reflection-note').value = '';
        renderGoalReflections();
        renderStudentTimeline();
      }
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
      renderGoalReflections();
      renderStudentTimeline();
    });
  }

  // Authenticate a student by username + password against the roster.
  // Barcodes are NOT accepted here - they are for lap scanning only.
  function authenticateStudent(username, password) {
    var u = String(username || '').trim();
    if (u.toUpperCase() === 'DEMO') {
      return Scan.getStudents()[0] || null;
    }
    var key = u.toLowerCase();
    return Scan.getStudents().find(function (s) {
      return s.username && String(s.username).toLowerCase() === key &&
        s.password && String(s.password) === String(password);
    }) || null;
  }

  function handleLogin(e) {
    e.preventDefault();
    var usernameEl = document.getElementById('student-username');
    var passwordEl = document.getElementById('student-password');
    var username = usernameEl ? usernameEl.value.trim() : '';
    var password = passwordEl ? passwordEl.value : '';
    if (!username) { return; }
    var student = authenticateStudent(username, password);
    if (!student) {
      alert('Username or password not recognised. Check your login card or ask your teacher.');
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
    var adminView = isAdminProfileView();
    var student = studentFromQuery() || sessionStudent();
    if (!student) {
      window.location.href = 'student.html';
      return;
    }
    if (!adminView) { saveStudentSession(student); }
    currentStudent = student;
    wireStudentTabs();
    renderAthlete(student);
    wireAddGoal();
    wireGoalReflection();

    var logoutBtn = document.getElementById('student-logout-btn');
    if (logoutBtn) {
      if (adminView) { logoutBtn.textContent = 'Log out admin'; }
      logoutBtn.addEventListener('click', function () {
        if (isAdminProfileView()) {
          localStorage.removeItem('runClubAdminSession');
          window.location.href = 'admin.html';
          return;
        }
        clearStudentSession();
        window.location.href = 'student.html';
      });
    }
  }
})();
