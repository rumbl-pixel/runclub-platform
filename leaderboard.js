// Public leaderboard views for whole school, divisions, and year groups.
(function () {
  'use strict';

  var Scan = window.RunClubScan;
  var Backend = window.RunClubBackend;
  var DIVISIONS = [
    { id: 'senior', years: ['Year 5', 'Year 6'] },
    { id: 'intermediate', years: ['Year 3', 'Year 4'] },
    { id: 'junior', years: ['Year 1', 'Year 2'] }
  ];
  var YEAR_GROUPS = ['Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6'];

  function byDistance(a, b) {
    return totalKm(b) - totalKm(a);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c];
    });
  }

  function cleanYear(value) {
    var text = String(value == null ? '' : value).trim();
    return /^Year\s+/i.test(text) ? text.replace(/^year/i, 'Year') : 'Year ' + text;
  }

  function totalKm(student) {
    if (student.total_km != null) { return Number(student.total_km) || 0; }
    if (student.km != null) { return Number(student.km) || 0; }
    return Scan.totalKm(student);
  }

  function totalLaps(student) {
    return Number(student.total_laps != null ? student.total_laps : student.laps) || 0;
  }

  function normalizeLeaderboardRow(row) {
    return {
      id: row.student_id || row.id || row.barcode,
      barcode: row.barcode || row.student_id || row.id,
      name: row.student_name || row.name || row.preferred_name || 'Student',
      year: cleanYear(row.year_group || row.year),
      cls: row.class_name || row.cls || '',
      laps: totalLaps(row),
      total_km: totalKm(row)
    };
  }

  function renderBackendStatus(message) {
    var el = document.getElementById('leaderboard-backend-status');
    if (el) { el.textContent = message || ''; }
  }

  function renderTable(targetId, students) {
    var target = document.getElementById(targetId);
    var sorted = students.slice().sort(byDistance);
    if (!sorted.length) {
      target.innerHTML = '<p style="color:#888;font-size:0.85rem;">No runners yet.</p>';
      return;
    }
    var rows = sorted.map(function (student, index) {
      return '<tr>' +
        '<td class="leaderboard-rank">#' + (index + 1) + '</td>' +
        '<td>' + escapeHtml(student.name) + '</td>' +
        '<td>' + escapeHtml(student.year) + '</td>' +
        '<td>' + escapeHtml(student.cls) + '</td>' +
        '<td>' + totalLaps(student) + '</td>' +
        '<td>' + totalKm(student).toFixed(2) + ' km</td>' +
      '</tr>';
    }).join('');
    target.innerHTML =
      '<table class="leaderboard-table">' +
        '<thead><tr><th>Rank</th><th>Student</th><th>Year</th><th>Class</th><th>Laps</th><th>Distance</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>';
  }

  function renderTotalLeaderboard(students) {
    renderTable('total-leaderboard', students);
  }

  function renderDivisions(students) {
    DIVISIONS.forEach(function (division) {
      renderTable('division-' + division.id, students.filter(function (student) {
        return division.years.indexOf(student.year) !== -1;
      }));
    });
  }

  function renderYearGroups(students) {
    YEAR_GROUPS.forEach(function (year) {
      renderTable('year-' + year.split(' ')[1], students.filter(function (student) {
        return student.year === year;
      }));
    });
  }

  function renderAll(students) {
    renderTotalLeaderboard(students);
    renderDivisions(students);
    renderYearGroups(students);
  }

  function localStudents() {
    return Scan.getStudents().map(normalizeLeaderboardRow);
  }

  function loadLeaderboardStudents() {
    if (Backend && Backend.isConfigured && Backend.isConfigured() && Backend.backendDataAccess && Backend.backendDataAccess.leaderboardTotals) {
      renderBackendStatus('Checking fake backend leaderboard...');
      return Backend.backendDataAccess.leaderboardTotals().then(function (result) {
        var rows = Array.isArray(result) ? result : (result && result.data);
        rows = Array.isArray(rows) ? rows.map(normalizeLeaderboardRow) : [];
        if (rows.length) {
          renderBackendStatus('Showing fake backend leaderboard data.');
          return rows;
        }
        renderBackendStatus('Fake backend is connected, but public RLS returned no leaderboard rows. Showing local demo data.');
        return localStudents();
      }).catch(function () {
        renderBackendStatus('Fake backend unavailable. Showing local demo data.');
        return localStudents();
      });
    }
    renderBackendStatus('Showing local demo leaderboard data.');
    return Promise.resolve(localStudents());
  }

  loadLeaderboardStudents().then(renderAll);
})();
