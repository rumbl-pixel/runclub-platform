(function () {
  'use strict';

  var ATHLETICS_RESULTS_KEY = 'rc_athletics_results';

  var EVENT_OPTIONS = [
    { id: 'junior-50m', name: 'Junior 50m', group: 'Sprints', years: 'Junior', measure: 'time' },
    { id: 'intermediate-75m', name: 'Intermediate 75m', group: 'Sprints', years: 'Intermediate', measure: 'time' },
    { id: 'senior-100m', name: 'Senior 100m', group: 'Sprints', years: 'Senior', measure: 'time' },
    { id: 'junior-100m', name: 'Junior 100m', group: 'Middle Distance', years: 'Junior', measure: 'time' },
    { id: 'intermediate-200m', name: 'Intermediate 200m', group: 'Middle Distance', years: 'Intermediate', measure: 'time' },
    { id: 'senior-400m', name: 'Senior 400m', group: 'Middle Distance', years: 'Senior', measure: 'time' },
    { id: 'tunnel-ball', name: 'Tunnel Ball', group: 'Ball Games', years: 'All', measure: 'team-time' },
    { id: 'leader-ball', name: 'Leader Ball', group: 'Ball Games', years: 'All', measure: 'team-time' },
    { id: 'pass-ball', name: 'Pass Ball', group: 'Ball Games', years: 'All', measure: 'team-time' },
    { id: 'baton-relay', name: 'Baton Relay', group: 'Relays', years: 'All', measure: 'team-time' },
    { id: 'long-jump', name: 'Long Jump', group: 'Jumps', years: 'All', measure: 'distance' },
    { id: 'vortex-throw', name: 'Vortex Throw', group: 'Throws', years: 'All', measure: 'distance' }
  ];

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function yearNumber(student) {
    return Number(String(student.year || '').replace(/\D/g, '')) || 0;
  }

  function studentConsent(student) {
    return String(student.consent_status || 'pending').toLowerCase();
  }

  function eventForId(id) {
    return EVENT_OPTIONS.find(function (event) { return event.id === id; }) || EVENT_OPTIONS[0];
  }

  function eventMatchesStudent(event, student) {
    var year = yearNumber(student);
    var band = String(event.years || '').toLowerCase();
    if (band.indexOf('all') >= 0 || band.indexOf('modified') >= 0) { return true; }
    if (band.indexOf('junior') >= 0 && year >= 1 && year <= 2) { return true; }
    if (band.indexOf('intermediate') >= 0 && year >= 3 && year <= 4) { return true; }
    if (band.indexOf('senior') >= 0 && year >= 5 && year <= 6) { return true; }
    if (band.indexOf('selected') >= 0 && year >= 5) { return true; }
    return false;
  }

  function resultMatchesEvent(result, event) {
    return result.event_id === event.id || String(result.event_name || '').toLowerCase() === event.name.toLowerCase();
  }

  function resultDisplay(result) {
    if (result.measure === 'time') { return escapeHtml(result.result_value) + ' sec'; }
    if (result.measure === 'distance') { return escapeHtml(result.result_value) + ' m'; }
    return escapeHtml(result.result_value || '');
  }

  function table(rows, emptyText) {
    if (!rows.length) {
      return '<p style="color:#888;font-size:0.85rem;">' + escapeHtml(emptyText) + '</p>';
    }
    return '<table class="progress-history-table"><thead><tr><th>Student</th><th>Year</th><th>Class</th><th>Consent</th><th>Result</th></tr></thead><tbody>' +
      rows.map(function (row) {
        return '<tr><td><a href="student-profile.html?student=' + encodeURIComponent(row.student.id) + '&view=admin">' + escapeHtml(row.student.name) + '</a></td><td>' + escapeHtml(row.student.year) + '</td><td>' + escapeHtml(row.student.cls) + '</td><td>' + escapeHtml(studentConsent(row.student)) + '</td><td>' + escapeHtml(row.result || '-') + '</td></tr>';
      }).join('') +
      '</tbody></table>';
  }

  function render() {
    var params = new URLSearchParams(window.location.search);
    var event = eventForId(params.get('event') || 'sprint-100');
    var students = window.RunClubScan && window.RunClubScan.getStudents ? window.RunClubScan.getStudents() : load('rc_students', []);
    var results = load(ATHLETICS_RESULTS_KEY, []).filter(function (result) { return resultMatchesEvent(result, event); });
    var resultByStudent = {};
    results.forEach(function (result) {
      resultByStudent[result.student_id] = resultDisplay(result);
    });

    var eligible = students.filter(function (student) {
      return eventMatchesStudent(event, student);
    });
    var competing = eligible.filter(function (student) {
      return studentConsent(student) === 'granted' || resultByStudent[student.id];
    }).map(function (student) {
      return { student: student, result: resultByStudent[student.id] || '' };
    });
    var followUp = eligible.filter(function (student) {
      return studentConsent(student) !== 'granted' && !resultByStudent[student.id];
    }).map(function (student) {
      return { student: student, result: 'Needs consent follow-up' };
    });

    document.getElementById('team-event-title').textContent = event.name;
    document.getElementById('team-event-summary').textContent = event.group + ' - ' + event.years + ' - ' + event.measure;
    document.getElementById('team-event-stats').innerHTML =
      '<div><strong>' + competing.length + '</strong><span>Competing / eligible</span></div>' +
      '<div><strong>' + followUp.length + '</strong><span>Follow ups</span></div>' +
      '<div><strong>' + results.length + '</strong><span>Results recorded</span></div>' +
      '<div><strong>' + escapeHtml(event.group) + '</strong><span>Sporting leg</span></div>';
    document.getElementById('team-student-list').innerHTML = table(competing, 'No approved students or recorded results for this event yet.');
    document.getElementById('team-follow-up-list').innerHTML = table(followUp, 'No follow-up needed for this event.');
    document.getElementById('team-results-list').innerHTML = results.length
      ? '<table class="progress-history-table"><thead><tr><th>Date</th><th>Student</th><th>Result</th><th>Place</th><th>PB</th></tr></thead><tbody>' +
        results.map(function (result) {
          return '<tr><td>' + escapeHtml(result.date || '') + '</td><td>' + escapeHtml(result.student_name || '') + '</td><td>' + resultDisplay(result) + '</td><td>' + escapeHtml(result.place || '-') + '</td><td>' + (result.personal_best ? 'Yes' : '-') + '</td></tr>';
        }).join('') +
        '</tbody></table>'
      : '<p style="color:#888;font-size:0.85rem;">No results recorded for this event yet.</p>';
  }

  render();
})();
