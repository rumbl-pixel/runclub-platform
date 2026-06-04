// admin.js
(function () {
  var cfg = window.RUN_CLUB_CONFIG || {};
  var form = document.getElementById('admin-login-form');
  var errorEl = document.getElementById('admin-error');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorEl.textContent = '';

    var email = document.getElementById('admin-email').value;
    var password = document.getElementById('admin-password').value;

    // Demo mode: skip real auth, store session, go to dashboard.
    if (cfg.demoMode !== false) {
      window.localStorage.setItem(
        'runClubAdminSession',
        JSON.stringify({ email: email, mode: 'demo', access_token: 'demo-token' })
      );
      window.location.href = 'admin-dashboard.html';
      return;
    }

    // TODO: replace with real Supabase auth call when demoMode is false.
    errorEl.textContent = 'Live auth not wired yet. Set demoMode: true in config.js to test.';
  });
})();
