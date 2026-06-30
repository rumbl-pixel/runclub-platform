// Parent portal: read-only progress view.
(function () {
  'use strict';

  var Scan = window.RunClubScan;
  var Goals = window.RunClubGoals;
  var GUARDIAN_LINKS_KEY = 'rc_guardian_links';
  var GUARDIAN_ACCESS_LOG_KEY = 'rc_guardian_access_log';
  var TRAINING_KEY = 'rc_training';
  var TRAINING_CLICKS_KEY = 'rc_training_clicks';
  var TRAINING_COMPLETIONS_KEY = 'rc_training_completions';
  var MEDICAL_NOTES_KEY = 'rc_medical_notes';
  var currentStudent = null;
  var currentAccess = null;
  var MILESTONE_LABELS = { 5: 'First 5 Laps', 10: '10 Lap Club', 25: 'Quarter Century', 50: 'Half Century', 100: 'Century Club', 200: 'Double Century', 500: 'Elite Runner' };

  function schedulePrintWindow(printWin) {
    var trigger = function () {
      setTimeout(function () {
        try { printWin.focus(); printWin.print(); } catch (error) {}
      }, 120);
    };
    if (printWin.document.readyState === 'complete') { trigger(); }
    else { printWin.addEventListener('load', trigger, { once: true }); }
  }

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function guardianLinks() {
    return load(GUARDIAN_LINKS_KEY, []);
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch];
    });
  }

  function isGuardianLinkUsable(link) {
    if (!link) { return { ok: false, reason: 'Missing link' }; }
    if (link.status === 'revoked') { return { ok: false, reason: 'Guardian code has been revoked' }; }
    if (link.expires_at && new Date(link.expires_at) < new Date()) { return { ok: false, reason: 'Guardian code has expired' }; }
    return { ok: true, reason: 'Active guardian link' };
  }

  function recordGuardianAccess(entry) {
    var rows = load(GUARDIAN_ACCESS_LOG_KEY, []);
    rows.push(Object.assign({ time: new Date().toISOString() }, entry));
    save(GUARDIAN_ACCESS_LOG_KEY, rows.slice(-500));
  }

  function findLinkedStudent(code) {
    var c = String(code || '').trim().toUpperCase();
    var link = guardianLinks().find(function (row) {
      return String(row.code || '').toUpperCase() === c;
    });
    if (!link) { return null; }
    var usable = isGuardianLinkUsable(link);
    if (!usable.ok) {
      recordGuardianAccess({ access_type: 'guardian', result: 'denied', reason: usable.reason, code_suffix: c.slice(-4), student_name: link.student_name || '' });
      return { denied: true, reason: usable.reason };
    }
    var student = Scan.getStudents().find(function (s) { return s.id === link.student_id; });
    if (!student) { return null; }
    return { student: student, link: link };
  }

  function findStudent(code) {
    var c = String(code || '').trim().toUpperCase();
    if (c === 'DEMO') {
      var demo = Scan.getStudents()[0] || null;
      return demo ? { student: demo, link: null, accessType: 'demo' } : null;
    }
    var linked = findLinkedStudent(c);
    if (linked && linked.denied) {
      return linked;
    }
    if (linked) {
      linked.accessType = 'guardian';
      return linked;
    }
    var student = Scan.getStudents().find(function (s) {
      return s.id.toUpperCase() === c || (s.barcode && s.barcode.toUpperCase() === c);
    });
    return student ? { student: student, link: null, accessType: 'barcode' } : null;
  }

  function liveParentAccessGuard() {
    var backend = window.RunClubBackend;
    var readiness = window.RunClubBackend && window.RunClubBackend.backendReadiness ? window.RunClubBackend.backendReadiness() : { liveDataMode: false, realDataAllowed: false };
    if (!readiness.liveDataMode) { return { ok: true, live: false }; }
    if (backend && backend.requiresLiveBackend) {
      var guard = backend.requiresLiveBackend();
      if (guard.ok) { return { ok: true, live: true }; }
      return { ok: false, live: true, message: 'Parent access blocked until the live backend is ready.' };
    }
    return { ok: false, live: true, message: 'Parent access blocked until the live backend is ready.' };
  }

  function verifyGuardianAccessWithBackend(code) {
    var guard = liveParentAccessGuard();
    if (!guard.ok) {
      return Promise.resolve({ denied: true, reason: guard.message || 'Parent access blocked until the live backend is ready.' });
    }
    if (guard.live) {
      return window.RunClubBackend.backendDataAccess.verifyGuardianAccess(code).then(function (result) {
        if (!result.ok || !result.data || !result.data.student) {
          return { denied: true, reason: 'Guardian code not recognised or no longer active' };
        }
        return { student: result.data.student, link: null, accessType: 'guardian' };
      });
    }
    return Promise.resolve(findStudent(code));
  }

  function renderLinkSummary(access) {
    var el = document.getElementById('parent-link-summary');
    if (!el) { return; }
    var copy = access.accessType === 'guardian'
      ? 'Linked with a guardian code issued by the school.'
      : access.accessType === 'demo'
        ? 'Viewing a demo child profile.'
        : 'Viewing with a child barcode/student code.';
    el.innerHTML = '<h2>Linked Access</h2><p style="color:#555;font-size:0.9rem;margin-bottom:0;">' + copy + '</p>';
  }

  function renderStats(student) {
    var km = Scan.lapsToKm(student.laps).toFixed(2);
    var totalKm = Scan.totalKm(student).toFixed(2);
    document.getElementById('parent-athlete-name').textContent = student.name;
    document.getElementById('parent-athlete-stats').innerHTML =
      '<div class="stat-box"><div class="stat-value">' + student.laps + '</div><div class="stat-label">Laps</div></div>' +
      '<div class="stat-box"><div class="stat-value">' + km + '</div><div class="stat-label">Track km</div></div>' +
      '<div class="stat-box"><div class="stat-value">' + totalKm + '</div><div class="stat-label">Total km</div></div>' +
      '<div class="stat-box"><div class="stat-value">' + student.cls + '</div><div class="stat-label">Class</div></div>';
  }

  function nextMilestone(student) {
    return Scan.MILESTONES.find(function (m) { return student.laps < m; }) || null;
  }

  function studentRank(student) {
    var roster = Scan.getStudents().slice().sort(function (a, b) { return Scan.totalKm(b) - Scan.totalKm(a); });
    return roster.findIndex(function (s) { return s.id === student.id; }) + 1;
  }

  function renderParentProgressSummary(student) {
    var next = nextMilestone(student);
    var toGo = next ? Math.max(0, next - student.laps) : 0;
    var summary = [
      '<div class="progress-summary-grid">',
      '<div class="stat-box"><div class="stat-value">#' + studentRank(student) + '</div><div class="stat-label">School rank</div></div>',
      '<div class="stat-box"><div class="stat-value">' + (next || 'Top') + '</div><div class="stat-label">Next milestone</div></div>',
      '<div class="stat-box"><div class="stat-value">' + (next ? toGo : 0) + '</div><div class="stat-label">Laps to go</div></div>',
      '<div class="stat-box"><div class="stat-value">' + Scan.totalKm(student).toFixed(2) + '</div><div class="stat-label">Total km</div></div>',
      '</div>'
    ].join('');
    document.getElementById('parent-progress-summary').innerHTML = summary;
  }

  function renderParentRecentProgress(student) {
    var rows = load(Scan.KEYS.scanAudit, []).filter(function (row) {
      return row.student_id === student.id && (row.success || row.undo);
    }).slice().reverse().slice(0, 8);
    var el = document.getElementById('parent-recent-progress');
    if (!rows.length) {
      el.innerHTML = '<p style="color:#888;font-size:0.85rem;">No recent scan history is available yet.</p>';
      return;
    }
    el.innerHTML = '<h3 style="margin-bottom:0.5rem;">Recent Progress</h3><table class="progress-history-table"><thead><tr><th>Date</th><th>Type</th><th>Detail</th></tr></thead><tbody>' +
      rows.map(function (row) {
        return '<tr><td>' + new Date(row.time).toLocaleDateString() + '</td><td>' + (row.undo ? 'Undo' : 'Lap scan') + '</td><td>' + (row.undo ? 'Adjusted by school' : 'Logged at run club') + '</td></tr>';
      }).join('') +
      '</tbody></table>';
  }

  function renderAwards(student) {
    document.getElementById('parent-awards').innerHTML = awardCardsHtml(awardDisplayRows(student));
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

  function awardCardsHtml(rows) {
    if (!rows.length) {
      return '<p style="color:#888;font-size:0.85rem;">No awards yet. The first milestone is 5 laps.</p>';
    }
    return '<div class="award-card-grid">' + rows.map(function (row) {
      return '<div class="award-card award-card--' + escapeHtml(row.status) + '">' +
        '<div class="award-card-icon">' + (row.status === 'earned' ? '&#127942;' : '&#11088;') + '</div>' +
        '<div><strong>' + escapeHtml(row.title) + '</strong><p>' + escapeHtml(row.detail) + '</p>' +
        '<div class="award-card-bar"><span style="width:' + row.progress + '%"></span></div></div>' +
        '</div>';
    }).join('') + '</div>';
  }

  function printParentCertificate() {
    if (!currentStudent) { return; }
    var earned = Scan.MILESTONES.filter(function (m) { return currentStudent.laps >= m; });
    var awardCopy = earned.length
      ? earned.map(function (m) { return '<span class="badge">&#127942; ' + (MILESTONE_LABELS[m] || (m + ' laps')) + '</span>'; }).join('')
      : '<p>Keep running toward the first 5 lap milestone.</p>';
    var win = window.open('', '_blank');
    if (!win) { return; }
    var html = '<html><head><title>' + escapeHtml(currentStudent.name) + ' Award Certificate</title><style>body{font-family:Arial,sans-serif;padding:2rem;color:#102a43;background:#f6f8fb;}.certificate-preview{border:5px solid #003880;box-shadow:inset 0 0 0 8px #c99722;background:#fff;padding:2.5rem;text-align:center;min-height:70vh;display:flex;flex-direction:column;align-items:center;justify-content:center;}h1{color:#003880;font-size:2.4rem;margin:0 0 0.5rem;}h2{font-size:2rem;margin:0.4rem 0;color:#0b1f38;}.badge{display:inline-block;padding:0.35rem 0.8rem;border-radius:999px;background:#fff8e1;border:1px solid #c99722;margin:0.25rem;font-size:0.95rem;}@media print{@page{margin:1cm;}body{background:#fff;print-color-adjust:exact;-webkit-print-color-adjust:exact;}}</style></head><body>';
    html += '<div class="certificate-preview"><h1>Corso</h1><p>Award Certificate</p><h2>' + escapeHtml(currentStudent.name) + '</h2><p>' + escapeHtml(currentStudent.year) + ' / Class ' + escapeHtml(currentStudent.cls) + '</p><p>Total laps: <strong>' + currentStudent.laps + '</strong> (' + Scan.lapsToKm(currentStudent.laps).toFixed(2) + ' km)</p><div>' + awardCopy + '</div><p style="margin-top:1.5rem;color:#64748b;">Keep building momentum.</p></div>';
    html += '</body></html>';
    win.document.write(html);
    win.document.close();
    schedulePrintWindow(win);
  }

  function goalRow(goal) {
    var p = Goals.progress(currentStudent.id, goal);
    var info = Goals.metricInfo(goal.metric);
    var owner = goal.owner === 'coach' ? 'Coach' : 'Student';
    var current = p.current == null ? 'No result yet' : p.current + ' ' + goal.unit;
    var progressLabel = info.kind === 'cumulative' ? 'Since set' : 'Best';
    var status = p.met ? '<span class="award-badge">Achieved</span>' : '';
    return '<div class="goal-item">' +
      '<div class="goal-head"><strong>' + goal.title + '</strong> <span style="color:#888;font-size:0.78rem;">' + owner + '</span> ' + status + '</div>' +
      '<div class="goal-meta">Target: ' + goal.target + ' ' + goal.unit + ' · ' + progressLabel + ': ' + current + '</div>' +
      '<div class="goal-bar"><div class="goal-bar-fill" style="width:' + p.percent + '%"></div></div>' +
      '</div>';
  }

  function renderGoals(student) {
    var goals = Goals.goalsFor(student.id).filter(function (goal) { return Goals.isMetricVisible(goal.metric); });
    document.getElementById('parent-goals').innerHTML = goals.length
      ? goals.map(goalRow).join('')
      : '<p style="color:#888;font-size:0.85rem;">No goals have been set yet.</p>';
  }

  function trainingAssignmentsFor(student) {
    return load(TRAINING_KEY, []).filter(function (task) {
      return (task.assigned_student_ids || task.student_ids || []).indexOf(student.id) !== -1;
    });
  }

  function trainingOpened(task, student) {
    return load(TRAINING_CLICKS_KEY, []).filter(function (click) {
      return click.assignment_id === task.id && click.student_id === student.id;
    }).sort(function (a, b) { return String(b.opened_at || '').localeCompare(String(a.opened_at || '')); })[0] || null;
  }

  function trainingCompletionFor(task, student) {
    return load(TRAINING_COMPLETIONS_KEY, []).filter(function (row) {
      return row.assignment_id === task.id && row.student_id === student.id;
    }).sort(function (a, b) { return String(b.completed_at || '').localeCompare(String(a.completed_at || '')); })[0] || null;
  }

  function renderParentTraining(student) {
    var el = document.getElementById('parent-training-view');
    var tasks = trainingAssignmentsFor(student);
    if (!tasks.length) {
      el.innerHTML = '<p style="color:#888;font-size:0.85rem;">No training has been assigned yet.</p>';
      return;
    }
    el.innerHTML = tasks.slice().reverse().map(function (task) {
      var opened = trainingOpened(task, student);
      var completed = trainingCompletionFor(task, student);
      return '<div class="training-card">' +
        '<div class="training-card-head"><strong>' + task.title + '</strong>' + (completed ? '<span class="award-badge">Reviewed</span>' : opened ? '<span class="award-badge">Opened</span>' : '<span class="training-status-pill">New</span>') + '</div>' +
        '<p>' + (task.notes || 'Review this teacher-assigned training task.') + '</p>' +
        '<div class="training-meta">' + (task.due_date ? 'Due ' + task.due_date : 'No due date') + (opened ? ' · Opened ' + new Date(opened.opened_at).toLocaleDateString() : '') + (completed ? ' · Reviewed ' + new Date(completed.completed_at).toLocaleDateString() : '') + '</div>' +
        '</div>';
    }).join('');
  }

  function medicalNotesFor(student) {
    var rows = load(MEDICAL_NOTES_KEY, {});
    return rows && student ? rows[student.id] || null : null;
  }

  function medicalLine(label, value) {
    return value ? '<div class="medical-note-row"><strong>' + escapeHtml(label) + '</strong><span>' + escapeHtml(value) + '</span></div>' : '';
  }

  function renderParentMedical(student) {
    var el = document.getElementById('parent-medical-summary');
    if (!el || !student) { return; }
    var notes = medicalNotesFor(student);
    if (!notes || !Object.keys(notes).some(function (key) { return !!notes[key]; })) {
      el.innerHTML = '<p style="color:#888;font-size:0.85rem;">No run club medical safety notes are currently recorded for this child.</p>';
      return;
    }
    el.innerHTML = '<div class="medical-note-list">' +
      medicalLine('Asthma', notes.asthma) +
      medicalLine('Anaphylaxis / allergies', notes.anaphylaxis) +
      medicalLine('Medication carried', notes.medication) +
      medicalLine('Emergency action note', notes.emergency_note) +
      '<div class="medical-note-row"><strong>School health plan</strong><span>' + (notes.health_plan_supplied ? 'Parent supplied to school' : 'Not marked as supplied') + '</span></div>' +
      medicalLine('Last reviewed', notes.reviewed_at) +
      '</div><p class="medical-note-disclaimer">For run club safety reference only. Follow official school health care plans in emergencies.</p>';
  }

  function render(student) {
    currentStudent = student;
    renderLinkSummary(currentAccess || { accessType: 'barcode' });
    renderStats(student);
    renderParentProgressSummary(student);
    renderParentRecentProgress(student);
    renderAwards(student);
    renderGoals(student);
    renderParentTraining(student);
    renderParentMedical(student);
    document.getElementById('parent-result').hidden = false;
  }

  document.getElementById('parent-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var errorEl = document.getElementById('parent-error');
    errorEl.textContent = '';
    var rawCode = document.getElementById('parent-code').value;
    verifyGuardianAccessWithBackend(rawCode).then(function (access) {
      if (!access || access.denied) {
        errorEl.textContent = access && access.reason ? access.reason + '. Ask the school for a new code.' : 'Code not recognised. Check the barcode card or ask the school.';
        if (!access) {
          recordGuardianAccess({ access_type: 'unknown', result: 'denied', reason: 'Code not recognised', code_suffix: rawCode.slice(-4).toUpperCase() });
        }
        return;
      }
      currentAccess = access;
      recordGuardianAccess({ access_type: access.accessType, result: 'allowed', reason: 'Progress viewed', student_id: access.student.id, student_name: access.student.name });
      render(access.student);
    });
  });

  document.getElementById('print-parent-certificate-btn').addEventListener('click', printParentCertificate);

})();
