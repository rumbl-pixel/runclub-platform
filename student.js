// student.js
(function () {

  function getConfig() {
    if (!window.RUN_CLUB_CONFIG) {
      throw new Error('Missing config.js. Make sure config.js is loaded before student.js.');
    }
    return window.RUN_CLUB_CONFIG;
  }

  function fakeStudentLogin(code) {
    return {
      success: true,
      first_login: false,
      demo_mode: true,
      session: {
        access_token: 'demo-access-token',
        refresh_token: 'demo-refresh-token',
        expires_at: Date.now() + 3600 * 1000
      },
      athlete: {
        id: 'demo-athlete-1',
        first_name: 'Demo',
        last_name: 'Student',
        year_group: 'Year 5',
        class_id: '5B',
        total_laps: 12,
        school_rank: 8,
        class_rank: 2,
        school_size: 120,
        class_size: 24
      },
      message: 'Demo sign-in succeeded for code ' + code + '.'
    };
  }

  function renderAthlete(athlete) {
    var el = document.getElementById('athlete-display');
    if (!el) return;
    var km = (athlete.total_laps * 0.25).toFixed(2);
    el.innerHTML =
      '<p><strong>' + athlete.first_name + ' ' + athlete.last_name + '</strong> &middot; ' + athlete.year_group + '</p>' +
      '<ul style="padding:0;list-style:none;margin:0.5rem 0 0;">' +
      '<li>&#127939; Total laps: <strong>' + athlete.total_laps + '</strong> (' + km + ' km)</li>' +
      '<li>&#127942; School rank: <strong>' + athlete.school_rank + '</strong> of ' + athlete.school_size + '</li>' +
      '<li>&#127942; Class rank: <strong>' + athlete.class_rank + '</strong> of ' + athlete.class_size + '</li>' +
      '</ul>';
    document.getElementById('result-card').hidden = false;
  }

  function showRaw(payload) {
    var el = document.getElementById('result');
    el.hidden = false;
    el.textContent = JSON.stringify(payload, null, 2);
  }

  async function handleStudentLogin(event) {
    event.preventDefault();

    var form      = event.currentTarget;
    var codeInput = form.querySelector('#code');
    var submitBtn = form.querySelector('#submit-btn');

    var code = codeInput.value.trim().toUpperCase();
    if (!code) return;

    var config = getConfig();

    if (!config.endpoints || !config.endpoints.studentAuth || config.demoMode) {
      var fake = fakeStudentLogin(code);
      renderAthlete(fake.athlete);
      return;
    }

    submitBtn.disabled = true;

    try {
      var response = await fetch(config.endpoints.studentAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code })
      });
      var data = await response.json();
      if (data.success && data.athlete) {
        renderAthlete(data.athlete);
      } else {
        showRaw(data);
      }
    } catch (err) {
      showRaw({ success: false, error: err.message || 'Request failed' });
    } finally {
      submitBtn.disabled = false;
    }
  }

  var form = document.querySelector('#student-form');
  if (form) form.addEventListener('submit', handleStudentLogin);

})();
