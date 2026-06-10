(function () {
  'use strict';

  var STORAGE_KEY = 'gp_run_club_theme';
  var root = document.documentElement;
  var savedTheme = localStorage.getItem(STORAGE_KEY);
  var activeTheme = savedTheme === 'dark' ? 'dark' : 'light';

  function applyTheme(theme) {
    activeTheme = theme === 'dark' ? 'dark' : 'light';
    root.setAttribute('data-theme', activeTheme);
    localStorage.setItem(STORAGE_KEY, activeTheme);
    updateToggle();
  }

  function updateToggle() {
    var toggle = document.querySelector('[data-theme-toggle]');
    if (!toggle) { return; }
    var isDark = activeTheme === 'dark';
    toggle.setAttribute('aria-pressed', String(isDark));
    toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.querySelector('[data-theme-toggle-thumb]').textContent = isDark ? 'Dark' : 'Light';
  }

  root.setAttribute('data-theme', activeTheme);

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.classList.contains('page-kiosk')) { return; }

    var headerInner = document.querySelector('.site-header .header-inner');
    if (!headerInner || document.querySelector('[data-theme-toggle]')) { return; }

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'theme-toggle';
    toggle.setAttribute('data-theme-toggle', '');
    toggle.innerHTML = '<span class="theme-toggle-track"><span data-theme-toggle-thumb class="theme-toggle-thumb">Light</span></span>';
    toggle.addEventListener('click', function () {
      applyTheme(activeTheme === 'dark' ? 'light' : 'dark');
    });

    headerInner.appendChild(toggle);
    updateToggle();
  });
})();
