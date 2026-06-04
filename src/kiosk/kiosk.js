// src/kiosk/kiosk.js
// Tablet-optimized self-scan kiosk. Uses the shared RunClubScan module so lap
// logging behaves identically to the admin dashboard scanner.
//
// Design goals (locked-down kid/volunteer-friendly station):
//  - One job: scan a card to log a lap.
//  - Hidden input always refocused so Bluetooth (HID) scanners "just beep & go".
//  - Big high-contrast green/red feedback with name + lap number.
//  - Auto-reset to "Ready to scan" after a couple of seconds.
//  - Idle attract state after inactivity.
//  - PIN-gated exit so students can't wander off the kiosk.
(function () {
  'use strict';

  function getAdminSession() {
    try { return JSON.parse(localStorage.getItem('runClubAdminSession')); }
    catch (e) { return null; }
  }

  if (!getAdminSession()) {
    window.location.href = 'admin.html';
    return;
  }

  var Scan = window.RunClubScan;
  var input = document.getElementById('kiosk-scan-input');
  var banner = document.getElementById('kiosk-banner');
  var bannerTitle = document.getElementById('kiosk-banner-title');
  var bannerSub = document.getElementById('kiosk-banner-sub');
  var sessionLabel = document.getElementById('kiosk-session');
  var lastScanLabel = document.getElementById('kiosk-last-scan');
  var lapCountLabel = document.getElementById('kiosk-lap-count');
  var undoBtn = document.getElementById('kiosk-undo');

  var EXIT_PIN = '1234'; // teacher PIN to leave kiosk (change before go-live)
  var PRAISE_MESSAGES = [
    'Great pace',
    'Strong running',
    'Keep moving',
    'Brilliant effort',
    'Nice lap',
    'You are building momentum'
  ];
  var sessionLaps = 0;
  var lastResult = null;
  var resetTimer = null;
  var idleTimer = null;

  sessionLabel.textContent = 'Session: Run Club — ' + new Date().toISOString().slice(0, 10);

  function setBanner(state, title, sub) {
    banner.className = 'kiosk-banner kiosk-banner--' + state;
    bannerTitle.textContent = title;
    bannerSub.textContent = sub || '';
  }

  function ready() {
    setBanner('ready', 'Ready to scan', 'Hold your barcode under the scanner');
  }

  function attract() {
    setBanner('attract', 'Tap to start', 'Scan your card to log a lap');
  }

  function scheduleReset() {
    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(ready, 2500);
  }

  function scheduleIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(attract, 45000);
  }

  function handleScan(value) {
    var res = Scan.logLap(value);
    if (res.success) {
      lastResult = res;
      sessionLaps += 1;
      var s = res.student;
      var praise = PRAISE_MESSAGES[sessionLaps % PRAISE_MESSAGES.length];
      var sub = praise + ' • Lap ' + s.laps + ' • ' + s.km.toFixed(2) + ' km';
      if (res.milestone) { sub += ' • 🏅 ' + res.milestone + ' milestone!'; }
      setBanner('success', '✓ Lap logged for ' + s.name, sub);
      lastScanLabel.textContent = 'Last: ' + s.name + ' at ' + new Date().toLocaleTimeString();
      lapCountLabel.textContent = 'Laps this session: ' + sessionLaps;
      undoBtn.hidden = false;
    } else {
      lastResult = null;
      setBanner('error', '! ' + (res.error || 'Scan error'), 'Please try again or see a teacher');
    }
    scheduleReset();
    scheduleIdle();
  }

  // Undo last lap (in case of a wrong card scan).
  undoBtn.addEventListener('click', function () {
    if (!lastResult || !lastResult.student) { return; }
    if (!confirm('Undo last lap for ' + lastResult.student.name + '?')) { return; }
    var students = Scan.getStudents();
    var st = students.find(function (x) { return x.id === lastResult.student.id; });
    if (st && st.laps > 0) {
      st.laps -= 1;
      Scan.saveStudents(students);
      sessionLaps = Math.max(0, sessionLaps - 1);
      lapCountLabel.textContent = 'Laps this session: ' + sessionLaps;
    }
    lastResult = null;
    undoBtn.hidden = true;
    ready();
    input.focus();
  });

  // PIN-gated exit back to the home page.
  document.getElementById('kiosk-exit').addEventListener('click', function () {
    var pin = prompt('Enter teacher PIN to exit kiosk:');
    if (pin === EXIT_PIN) { window.location.href = 'index.html'; }
    else if (pin !== null) { alert('Incorrect PIN.'); input.focus(); }
  });

  // Keep the hidden input focused so hardware scanners always land here.
  document.addEventListener('click', function () { input.focus(); });
  window.addEventListener('focus', function () { input.focus(); });

  Scan.bindScannerInput(input, handleScan, { debounceMs: 120, autoRefocus: true });

  ready();
  scheduleIdle();
})();
