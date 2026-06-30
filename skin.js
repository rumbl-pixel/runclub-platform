/* Skin switcher (preview)
   Lets you compare the Classic look against the shadcn skin live on
   any page. State is read from the ?skin= query param (which also
   persists) or from localStorage, then applied to <html data-skin>.
   Inert unless a skin is selected, so Classic stays the default. */
(function () {
  var STORAGE_KEY = 'corsoSkin';
  var root = document.documentElement;

  function currentSkin() {
    try {
      var params = new URLSearchParams(window.location.search);
      var q = params.get('skin');
      if (q === 'shadcn' || q === 'classic' || q === 'off') {
        var resolved = q === 'shadcn' ? 'shadcn' : '';
        localStorage.setItem(STORAGE_KEY, resolved);
        return resolved;
      }
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function applySkin(skin) {
    if (skin === 'shadcn') {
      root.setAttribute('data-skin', 'shadcn');
    } else {
      root.removeAttribute('data-skin');
    }
  }

  // Apply as early as possible to minimise flash.
  applySkin(currentSkin());

  function setSkin(skin) {
    try { localStorage.setItem(STORAGE_KEY, skin || ''); } catch (e) {}
    applySkin(skin);
    updateToggle();
  }

  var toggleEl = null;
  function updateToggle() {
    if (!toggleEl) { return; }
    var isShadcn = root.getAttribute('data-skin') === 'shadcn';
    toggleEl.textContent = isShadcn ? 'Theme: shadcn' : 'Theme: Classic';
    toggleEl.setAttribute('aria-pressed', isShadcn ? 'true' : 'false');
  }

  function mountToggle() {
    if (document.querySelector('.skin-toggle')) { return; }
    toggleEl = document.createElement('button');
    toggleEl.type = 'button';
    toggleEl.className = 'skin-toggle';
    toggleEl.title = 'Switch between the Classic and shadcn looks';
    toggleEl.addEventListener('click', function () {
      var isShadcn = root.getAttribute('data-skin') === 'shadcn';
      setSkin(isShadcn ? '' : 'shadcn');
    });
    document.body.appendChild(toggleEl);
    updateToggle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountToggle);
  } else {
    mountToggle();
  }
})();
