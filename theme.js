(function () {
  'use strict';

  var STORAGE_KEY = 'gp_run_club_theme';
  var BRANDING_KEY = 'rc_theme_settings';
  var DEFAULT_RUN_CLUB_NAME = 'School Run Club';
  var DEFAULT_LOGO = 'assets/corso-logo.png';
  var root = document.documentElement;
  var savedTheme = localStorage.getItem(STORAGE_KEY);
  var activeTheme = savedTheme === 'dark' ? 'dark' : 'light';

  function brandingSettings() {
    try {
      var saved = JSON.parse(localStorage.getItem(BRANDING_KEY) || '{}');
      return {
        appTitle: String(saved.appTitle || DEFAULT_RUN_CLUB_NAME).trim() || DEFAULT_RUN_CLUB_NAME
      };
    } catch (error) {
      return { appTitle: DEFAULT_RUN_CLUB_NAME };
    }
  }

  function programSettings() {
    try {
      return JSON.parse(localStorage.getItem('rc_program_settings') || '{}') || {};
    } catch (error) {
      return {};
    }
  }

  function adminSession() {
    try {
      return JSON.parse(localStorage.getItem('runClubAdminSession') || '{}') || {};
    } catch (error) {
      return {};
    }
  }

  function currentSchoolName() {
    var program = programSettings();
    var settings = brandingSettings();
    var cfg = window.RUN_CLUB_CONFIG || {};
    return String(program.schoolName || program.school_name || cfg.schoolName || settings.appTitle || DEFAULT_RUN_CLUB_NAME).trim() || DEFAULT_RUN_CLUB_NAME;
  }

  function coachInitials() {
    var session = adminSession();
    var raw = String(session.display_name || session.name || session.username || session.email || '').trim();
    if (!raw || raw === '{}') { return 'CO'; }
    if (raw.indexOf('@') !== -1) { raw = raw.split('@')[0]; }
    var parts = raw.replace(/[_\-.]+/g, ' ').split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    var compact = raw.replace(/[^a-z0-9]/gi, '').toUpperCase();
    return (compact.slice(0, 2) || 'CO');
  }

  function replaceTextNode(parent, value) {
    var textNode = Array.prototype.find.call(parent.childNodes, function (node) {
      return node.nodeType === 3 && node.textContent.trim();
    });
    if (textNode) {
      textNode.textContent = value;
    } else {
      parent.appendChild(document.createTextNode(value));
    }
  }

  function applyBrandingSettings() {
    document.querySelectorAll('.brand h1').forEach(function (el) {
      el.textContent = 'Corso';
    });
    document.querySelectorAll('.brand-logo, .kiosk-brand-logo').forEach(function (img) {
      img.src = DEFAULT_LOGO;
      img.alt = 'Corso';
    });
    document.querySelectorAll('.school-switcher').forEach(function (el) {
      el.textContent = currentSchoolName();
      el.setAttribute('aria-label', 'Current school: ' + currentSchoolName());
    });
    document.querySelectorAll('.coach-avatar').forEach(function (el) {
      var initials = coachInitials();
      el.textContent = initials;
      el.setAttribute('aria-label', initials === 'CO' ? 'Coach account' : 'Signed in as ' + initials);
    });
    document.querySelectorAll('.kiosk-brand').forEach(function (el) {
      replaceTextNode(el, 'Corso');
    });
  }

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
    toggle.querySelector('[data-theme-toggle-thumb]').textContent = isDark ? '☾' : '☀';
  }

  function renderBetaShareBanner() {
    var cfg = window.RUN_CLUB_CONFIG || {};
    var betaEnabled = cfg.betaShareMode !== false && (cfg.betaShareMode || cfg.demoMode !== false);
    if (!betaEnabled || document.querySelector('[data-beta-share-banner]')) { return; }
    var header = document.querySelector('.site-header');
    if (!header) { return; }
    var banner = document.createElement('div');
    banner.className = 'beta-share-banner';
    banner.setAttribute('data-beta-share-banner', '');
    banner.innerHTML = '<span class="beta-share-banner__status">Beta demo</span><span>' + (cfg.betaShareMessage || 'No real student data. Production use needs school approval and backend readiness.') + '</span>';
    header.insertAdjacentElement('afterend', banner);
  }

  function updateFeedbackLinks() {
    var page = (document.title || 'Corso page').replace(/\s+/g, ' ').trim();
    var path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.feature-suggestion-btn').forEach(function (link) {
      var subject = encodeURIComponent('Corso feedback - ' + page);
      var body = encodeURIComponent('Page: ' + path + '\nDevice/browser:\nWhat felt confusing or broken:\nSuggested improvement:\n');
      link.setAttribute('href', 'mailto:support@gwynneparkrunclub.com.au?subject=' + subject + '&body=' + body);
      if (/Feature Suggestion/i.test(link.textContent || '')) {
        link.textContent = 'Send Feedback';
      }
    });
  }

  root.setAttribute('data-theme', activeTheme);

  document.addEventListener('DOMContentLoaded', function () {
    applyBrandingSettings();
    updateFeedbackLinks();
    if (document.body.classList.contains('page-kiosk')) { return; }
    renderBetaShareBanner();

    var header = document.querySelector('.site-header');
    var headerInner = document.querySelector('.site-header .header-inner');
    if (!header || !headerInner) { return; }

    if (!document.querySelector('[data-theme-toggle]')) {
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'theme-toggle';
      toggle.setAttribute('data-theme-toggle', '');
      toggle.innerHTML = '<span class="theme-toggle-track"><span data-theme-toggle-thumb class="theme-toggle-thumb">☀</span></span>';
      toggle.addEventListener('click', function () {
        applyTheme(activeTheme === 'dark' ? 'light' : 'dark');
      });
      var brand = headerInner.querySelector('.brand');
      if (brand) {
        brand.appendChild(toggle);
      } else {
        headerInner.appendChild(toggle);
      }
    }

    if (!document.querySelector('[data-mobile-menu-toggle]')) {
      var menuToggle = document.createElement('button');
      menuToggle.type = 'button';
      menuToggle.className = 'mobile-menu-toggle';
      menuToggle.setAttribute('data-mobile-menu-toggle', '');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open menu');
      menuToggle.innerHTML = '<span></span><span></span><span></span>';
      menuToggle.addEventListener('click', function () {
        var open = !document.body.classList.contains('mobile-nav-open');
        document.body.classList.toggle('mobile-nav-open', open);
        menuToggle.setAttribute('aria-expanded', String(open));
        menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
      headerInner.appendChild(menuToggle);
    }

    document.body.classList.add('mobile-header-compact');
    updateToggle();
  });
})();
