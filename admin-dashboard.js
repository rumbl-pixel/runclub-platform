// admin-dashboard.js
// Full local-first admin dashboard inspired by Marathon Kids + StrideTrack
(function () {

  // --- Auth gate ---
  function getSession() {
    try { return JSON.parse(localStorage.getItem('runClubAdminSession')); } catch { return null; }
  }
  var session = getSession();
  if (!session) { window.location.href = 'admin.html'; return; }
  document.getElementById('session-label').textContent = 'Logged in as ' + session.email + ' (' + session.mode + ' mode)';
  document.getElementById('logout-btn').addEventListener('click', function () {
    localStorage.removeItem('runClubAdminSession');
    window.location.href = 'admin.html';
  });

  // --- Storage keys ---
  var K = { students:'rc_students', activity:'rc_activity', sessions:'rc_sessions', events:'rc_events', challenges:'rc_challenges', timedRuns:'rc_timed', customAwards:'rc_custom_awards', scanAudit:'rc_scan_audit', scannerSettings:'rc_scanner_settings', offlineQueue:'rc_offline_queue', programSettings:'rc_program_settings', training:'rc_training', trainingClicks:'rc_training_clicks', trainingCompletions:'rc_training_completions', adjustments:'rc_adjustments' };
  var GUARDIAN_LINKS_KEY = 'rc_guardian_links';
  var GUARDIAN_ACCESS_LOG_KEY = 'rc_guardian_access_log';
  var MEDICAL_NOTES_KEY = 'rc_medical_notes';
  var MILESTONE_NOTIFICATIONS_KEY = 'rc_milestone_notifications';
  var CHALLENGE_NOTIFICATIONS_KEY = 'rc_challenge_notifications';
  var COACH_NOTES_KEY = 'rc_coach_notes';
  var STUDENT_NOTIFICATIONS_KEY = 'rc_student_notifications';
  var CROSS_COUNTRY_COURSES_KEY = 'rc_cross_country_courses';
  var ATHLETICS_RESULTS_KEY = 'rc_athletics_results';
  var ATHLETICS_TEAM_SELECTIONS_KEY = 'rc_athletics_team_selections';
  var ATHLETICS_CONSENT_SELECTIONS_KEY = 'rc_athletics_consent_selections';
  var CROSS_COUNTRY_VISIBLE_KEY = 'rc_cross_country_visible';
  var BUILDER_WORKOUTS_KEY = 'rc_builder_workouts';
  var THEME_SETTINGS_KEY = 'rc_theme_settings';

  var ATHLETICS_EVENT_OPTIONS = [
    {id:'xc',name:'Cross Country',category:'cross-country',measure:'time',points:true},
    {id:'junior-50m',name:'Junior 50m',category:'sprint',measure:'time',points:true,division:'Junior'},
    {id:'intermediate-75m',name:'Intermediate 75m',category:'sprint',measure:'time',points:true,division:'Intermediate'},
    {id:'senior-100m',name:'Senior 100m',category:'sprint',measure:'time',points:true,division:'Senior'},
    {id:'junior-100m',name:'Junior 100m',category:'distance',measure:'time',points:true,division:'Junior'},
    {id:'intermediate-200m',name:'Intermediate 200m',category:'distance',measure:'time',points:true,division:'Intermediate'},
    {id:'senior-400m',name:'Senior 400m',category:'distance',measure:'time',points:true,division:'Senior'},
    {id:'long-jump',name:'Long Jump',category:'jump',measure:'distance',points:true},
    {id:'vortex-throw',name:'Vortex Throw',category:'throw',measure:'distance',points:true},
    {id:'tunnel-ball',name:'Tunnel Ball',category:'ball-game',measure:'points',points:true},
    {id:'leader-ball',name:'Leader Ball',category:'ball-game',measure:'points',points:true},
    {id:'pass-ball',name:'Pass Ball',category:'ball-game',measure:'points',points:true},
    {id:'baton-relay',name:'Baton Relay',category:'relay',measure:'time',points:true}
  ];

  var TRAINING_LIBRARY_COMPONENTS = [
    {id:'warmup-mobility',title:'Mobility Warm-up',minutes:5,focus:'Prep',detail:'Ankles, hips, shoulders, gentle skipping'},
    {id:'sprint-starts',title:'Sprint Starts',minutes:8,focus:'Sprints',detail:'3-point starts, reaction cue, 6 x 10m'},
    {id:'stride-outs',title:'Stride Outs',minutes:8,focus:'Middle distance',detail:'6 x relaxed 60m build-ups'},
    {id:'tempo-loop',title:'Tempo Loop',minutes:12,focus:'Cross country',detail:'Steady loop, talk-test pace'},
    {id:'hill-drives',title:'Hill Drives',minutes:10,focus:'Power',detail:'Short controlled hill efforts'},
    {id:'jump-popups',title:'Jump Pop-ups',minutes:8,focus:'Jumps',detail:'Landing shapes and take-off rhythm'},
    {id:'throw-steps',title:'Throw Steps',minutes:8,focus:'Throws',detail:'Safe stance, step-through, release target'},
    {id:'cooldown-reflect',title:'Cooldown Reflection',minutes:5,focus:'Recovery',detail:'Walk, stretch, one goal note'}
  ];

  function load(key, def) { try { var r=localStorage.getItem(key); return r?JSON.parse(r):def; } catch{return def;} }
  function save(key,val) { localStorage.setItem(key,JSON.stringify(val)); }
  function scannerSettings(){ var settings=load(K.scannerSettings,{duplicateCooldownSeconds:3,deviceName:'Admin dashboard',deviceLocation:'School'}); var seconds=Number(settings.duplicateCooldownSeconds); if(!isFinite(seconds)||seconds<0){seconds=3;} return {duplicateCooldownSeconds:Math.min(120,seconds),deviceName:String(settings.deviceName||'Admin dashboard'),deviceLocation:String(settings.deviceLocation||'School')}; }
  function cleanList(value, fallback){ var list=Array.isArray(value)?value:String(value||'').split(','); list=list.map(function(item){return String(item).trim();}).filter(Boolean); return list.length?Array.from(new Set(list)):fallback; }
  function cleanThresholds(value){ var list=Array.isArray(value)?value:String(value||'').split(','); list=list.map(function(item){return Number(item);}).filter(function(item){return isFinite(item)&&item>0;}).map(function(item){return Math.round(item);}).sort(function(a,b){return a-b;}); return list.length?Array.from(new Set(list)):[5,10,25,50,100,200,500]; }
  function programSettings(){ var settings=window.RunClubScan&&window.RunClubScan.programSettings?window.RunClubScan.programSettings():load(K.programSettings,{schoolName:'Gwynne Park Schools',lapDistanceKm:0.25,defaultSessionType:'Run Club',activeYears:['Year 1','Year 2','Year 3','Year 4','Year 5','Year 6'],classNames:['1A','2A','3A','4C','5B','6A'],awardThresholds:[5,10,25,50,100,200,500]}); var lapDistanceKm=Number(settings.lapDistanceKm); if(!isFinite(lapDistanceKm)||lapDistanceKm<=0){lapDistanceKm=0.25;} return {schoolName:String(settings.schoolName||'Gwynne Park Schools'),lapDistanceKm:lapDistanceKm,defaultSessionType:String(settings.defaultSessionType||'Run Club'),activeYears:cleanList(settings.activeYears,['Year 1','Year 2','Year 3','Year 4','Year 5','Year 6']),classNames:cleanList(settings.classNames,['1A','2A','3A','4C','5B','6A']),awardThresholds:cleanThresholds(settings.awardThresholds)}; }
  function saveProgramSettings(partial){ save(K.programSettings,Object.assign({},programSettings(),partial)); }
  function themeSettings(){ return Object.assign({appTitle:'Gwynne Park Run Club',schoolBlue:'#003880',uniformGold:'#c99722'},load(THEME_SETTINGS_KEY,{})); }
  function applyThemeSettings(){
    var settings=themeSettings();
    document.documentElement.style.setProperty('--school-blue',settings.schoolBlue);
    document.documentElement.style.setProperty('--uniform-gold',settings.uniformGold);
    document.querySelectorAll('.brand h1').forEach(function(el){el.textContent=settings.appTitle;});
  }
  function duplicateWindowMs(){ return scannerSettings().duplicateCooldownSeconds*1000; }
  function scannerId(){ var settings=scannerSettings(); return settings.deviceName+(settings.deviceLocation?' - '+settings.deviceLocation:''); }

  // --- Default demo students (StrideTrack-style, with more data) ---
  function defaultStudents() {
    return [
      {id:'STUDENT1',barcode:'STUDENT1',first:'James',last:'Smith',name:'James Smith',year:'Year 5',cls:'5B',laps:12,minutes:0,events:[]},
      {id:'STUDENT2',barcode:'STUDENT2',first:'Sarah',last:'Johnson',name:'Sarah Johnson',year:'Year 5',cls:'5B',laps:18,minutes:0,events:[]},
      {id:'STUDENT3',barcode:'STUDENT3',first:'Tom',last:'VanDenberghe',name:'Tom VanDenberghe',year:'Year 6',cls:'6A',laps:7,minutes:0,events:[]},
      {id:'STUDENT4',barcode:'STUDENT4',first:'Emily',last:'Chen',name:'Emily Chen',year:'Year 6',cls:'6A',laps:25,minutes:0,events:[]},
      {id:'STUDENT5',barcode:'STUDENT5',first:'Liam',last:"O'Brien",name:"Liam O'Brien",year:'Year 4',cls:'4C',laps:9,minutes:0,events:[]},
      {id:'STUDENT6',barcode:'STUDENT6',first:'Aisha',last:'Patel',name:'Aisha Patel',year:'Year 4',cls:'4C',laps:31,minutes:0,events:[]},
      {id:'STUDENT7',barcode:'STUDENT7',first:'Noah',last:'Williams',name:'Noah Williams',year:'Year 3',cls:'3A',laps:5,minutes:0,events:[]},
      {id:'STUDENT8',barcode:'STUDENT8',first:'Zoe',last:'Nguyen',name:'Zoe Nguyen',year:'Year 3',cls:'3A',laps:44,minutes:0,events:[]},
    ];
  }

  function getStudents() { return load(K.students, defaultStudents()); }
  function saveStudents(s) { save(K.students,s); }
  function liveRosterGuard(){
    var backend=window.RunClubBackend;
    var readiness=backend&&backend.backendReadiness?backend.backendReadiness():{liveDataMode:false,realDataAllowed:false};
    if(!readiness.liveDataMode){return {ok:true,live:false};}
    if(backend&&backend.requiresLiveBackend){
      var guard=backend.requiresLiveBackend();
      if(guard.ok){return {ok:true,live:true};}
      return {ok:false,live:true,message:guard.message||'Local roster save blocked until the live backend is ready.'};
    }
    return {ok:false,live:true,message:'Local roster save blocked until the live backend adapter is available.'};
  }
  function saveStudentsWithBackend(students, changedStudent){
    var guard=liveRosterGuard();
    if(!guard.ok){return Promise.resolve({ok:false,blocked:true,error:guard.message||'Local roster save blocked.'});}
    if(guard.live&&changedStudent&&window.RunClubBackend&&window.RunClubBackend.backendDataAccess){
      return window.RunClubBackend.backendDataAccess.upsertStudent(changedStudent).then(function(result){
        if(!result.ok){return result;}
        saveStudents(students);
        return result;
      });
    }
    saveStudents(students);
    return Promise.resolve({ok:true,local:true});
  }
  function deleteStudentWithBackend(students, student){
    var guard=liveRosterGuard();
    if(!guard.ok){return Promise.resolve({ok:false,blocked:true,error:guard.message||'Local roster save blocked.'});}
    if(guard.live&&student&&window.RunClubBackend&&window.RunClubBackend.backendDataAccess){
      return window.RunClubBackend.backendDataAccess.deleteStudent(student).then(function(result){
        if(!result.ok){return result;}
        saveStudents(students);
        return result;
      });
    }
    saveStudents(students);
    return Promise.resolve({ok:true,local:true});
  }
  function importStudentsWithBackend(students, importedStudents){
    var guard=liveRosterGuard();
    if(!guard.ok){return Promise.resolve({ok:false,blocked:true,error:guard.message||'Local roster import blocked.'});}
    if(guard.live&&window.RunClubBackend&&window.RunClubBackend.backendDataAccess&&window.RunClubBackend.backendDataAccess.upsertStudentsBatch){
      return window.RunClubBackend.backendDataAccess.upsertStudentsBatch(importedStudents||[]).then(function(result){
        if(!result.ok){return result;}
        saveStudents(students);
        return result;
      });
    }
    saveStudents(students);
    return Promise.resolve({ok:true,local:true});
  }
  function isUuid(value){
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value||'');
  }
  function saveManualAdjustmentWithBackend(students, student, record){
    var guard=liveRosterGuard();
    if(!guard.ok){return Promise.resolve({ok:false,blocked:true,error:guard.message||'Local manual adjustment blocked.'});}
    if(guard.live&&window.RunClubBackend&&window.RunClubBackend.backendDataAccess&&window.RunClubBackend.backendDataAccess.recordManualAdjustment){
      return window.RunClubBackend.backendDataAccess.recordManualAdjustment({
        student_id:isUuid(student.id)?student.id:null,
        barcode:student.barcode||student.id,
        delta_laps:record.delta_laps,
        reason:record.reason,
        staff:record.staff,
        lap_distance_km:programSettings().lapDistanceKm,
        metadata:{source_screen:'admin-dashboard',local_record_id:record.id,laps_after:record.laps_after}
      }).then(function(result){
        if(!result.ok){return result;}
        saveStudents(students);
        return result;
      });
    }
    saveStudents(students);
    return Promise.resolve({ok:true,local:true});
  }
  function runLiveFeatureWrite(methodName,payload,localApply,errorMessage){
    var guard=liveRosterGuard();
    if(!guard.ok){return Promise.resolve({ok:false,blocked:true,error:guard.message||errorMessage||'Local feature save blocked.'});}
    var access=window.RunClubBackend&&window.RunClubBackend.backendDataAccess;
    if(guard.live&&access&&typeof access[methodName]==='function'){
      return access[methodName](payload).then(function(result){
        if(!result.ok){return result;}
        if(localApply){localApply(result);}
        return result;
      });
    }
    if(localApply){localApply({ok:true,local:true});}
    return Promise.resolve({ok:true,local:true});
  }
  function lapsTokm(l) { return l*programSettings().lapDistanceKm; }
  function minutesToKm(m) { return m/20; } // Marathon Kids: 20 min = 1 km
  function totalKm(s) { return lapsTokm(s.laps)+minutesToKm(s.minutes||0); }

  var MEDAL_TIERS=[
    {name:'Platinum',km:42.2,color:'#8b5cf6'},
    {name:'Gold',km:20,color:'#d97706'},
    {name:'Silver',km:10,color:'#64748b'},
    {name:'Bronze',km:5,color:'#b45309'},
    {name:'Starter',km:0,color:'#0c5aa8'}
  ];
  var CERTIFICATE_MILESTONES=[
    {name:'5km',km:5},
    {name:'10km',km:10},
    {name:'Half Marathon',km:21.1},
    {name:'Marathon',km:42.2}
  ];

  function medalFor(student) {
    var km=totalKm(student);
    return MEDAL_TIERS.find(function(t){return km>=t.km;}) || MEDAL_TIERS[MEDAL_TIERS.length-1];
  }

  function medalBadge(student) {
    var medal=medalFor(student);
    return '<span class="award-badge medal-badge medal-badge--'+medal.name.toLowerCase()+'">'+medal.name+'</span>';
  }

  // --- Helpers ---
  function showResult(el,payload) { el.hidden=false; el.textContent=JSON.stringify(payload,null,2); }

  function openAdminModalAt(overlay, trigger){
    if(!overlay){return;}
    var top=48;
    if(trigger&&trigger.getBoundingClientRect){
      var rect=trigger.getBoundingClientRect();
      var maxTop=Math.max(16, window.innerHeight-180);
      top=Math.min(Math.max(16, rect.top-24), maxTop);
    }
    overlay.style.setProperty('--modal-top', top+'px');
    overlay.hidden=false;
    overlay.scrollTop=0;
    var modal=overlay.querySelector('.student-editor-modal');
    if(modal){modal.scrollTop=0;}
    window.requestAnimationFrame(function(){
      overlay.scrollTop=0;
      if(modal){modal.scrollTop=0;}
    });
    document.body.classList.add('admin-modal-open');
  }

  function closeAdminModal(overlay){
    if(overlay){overlay.hidden=true;}
    if(!document.querySelector('.student-editor-overlay:not([hidden])')){
      document.body.classList.remove('admin-modal-open');
    }
  }

  function recordMilestoneNotification(student, milestone, source) {
    var rows = load(MILESTONE_NOTIFICATIONS_KEY, []);
    var record = {
      id: 'milestone-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      student_id: student.id,
      student_name: student.name,
      barcode: student.barcode || student.id,
      milestone: milestone,
      laps: student.laps,
      km: student.km,
      source: source || 'admin-dashboard',
      created_at: new Date().toISOString()
    };
    rows.push(record);
    save(MILESTONE_NOTIFICATIONS_KEY, rows.slice(-500));
    return record;
  }

  function renderMilestoneNotification(record) {
    var el = document.getElementById('milestone-notification');
    if (!el) { return; }
    if (!record) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }
    el.hidden = false;
    el.innerHTML = '<strong>Milestone reached: ' + escapeHtml(record.student_name) + '</strong>' +
      '<span>' + escapeHtml(record.milestone) + ' • ' + record.laps + ' total laps • ' + Number(record.km || 0).toFixed(2) + ' km</span>' +
      '<p>Print or celebrate this from the Awards section when ready.</p>';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch];
    });
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
      '<div class="barcode-card-school">Gwynne Park Run Club</div>' +
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
      '<div class="barcode-card-school">Gwynne Park Run Club</div>' +
      '<strong class="barcode-card-name">' + escapeHtml(student.name) + '</strong>' +
      '<div class="barcode-card-meta">' + escapeHtml(student.year) + ' / ' + escapeHtml(student.cls) + '</div>' +
      '<div class="barcode-qr-row">' + barcodeBarsHtml(code) + qrCodeHtml(code) + '</div>' +
      '<div class="barcode-code">' + escapeHtml(code) + '</div>' +
      '</div></body></html>';
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  function generateBarcodeId(first, last, students) {
    var stem = (String(last || '').slice(0, 5) + String(first || '').slice(0, 1)).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!stem) { stem = 'STUDENT'; }
    var used = {};
    students.forEach(function (s) {
      used[String(s.id || '').toUpperCase()] = true;
      used[String(s.barcode || '').toUpperCase()] = true;
    });
    var n = 1;
    var candidate = stem + String(n).padStart(2, '0');
    while (used[candidate]) {
      n += 1;
      candidate = stem + String(n).padStart(2, '0');
    }
    return candidate;
  }

  function dlJson(filename,data) {
    var b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    var u=URL.createObjectURL(b); var a=document.createElement('a');
    a.href=u; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u);
  }

  function dlCsv(filename,rows,cols) {
    var lines=[cols.join(',')];
    rows.forEach(function(r){ lines.push(cols.map(function(c){ return JSON.stringify(r[c]!=null?r[c]:''); }).join(',')); });
    var b=new Blob([lines.join('\n')],{type:'text/csv'});
    var u=URL.createObjectURL(b); var a=document.createElement('a');
    a.href=u; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u);
  }

  // --- TABS ---
  var tabBtns = document.querySelectorAll('.tab-btn');
  var tabPanels = document.querySelectorAll('.tab-panel');
  function activateAdminTab(tabName) {
    var btn = Array.from(tabBtns).find(function(candidate) { return candidate.dataset.tab === tabName; });
    var panel = document.getElementById('tab-' + tabName);
    if (!btn || !panel) { return false; }
    tabBtns.forEach(function(b){b.classList.remove('active');b.setAttribute('aria-selected','false');});
    tabPanels.forEach(function(p){p.classList.remove('active');});
    btn.classList.add('active');
    btn.setAttribute('aria-selected','true');
    panel.classList.add('active');
    return true;
  }
  tabBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      activateAdminTab(btn.dataset.tab);
    });
  });
  var adminUrlParams = new URLSearchParams(window.location.search);
  var requestedAdminTab = adminUrlParams.get('tab');
  if (requestedAdminTab) { activateAdminTab(requestedAdminTab); }
  applyThemeSettings();

  // === SCANNER ===
  var scanInput=document.getElementById('scan-input');
  var scanBtn=document.getElementById('scan-btn');
  var undoAdminScanBtn=document.getElementById('undo-admin-scan-btn');
  var scanResultEl=document.getElementById('scan-result');
  var sessionStateEl=document.getElementById('session-state');
  var sessionLogEl=document.getElementById('session-log');
  var sessionTypeEl=document.getElementById('session-type');
  var sessionNotesEl=document.getElementById('session-notes');
  var scannerDeviceNameInput=document.getElementById('scanner-device-name');
  var scannerDeviceLocationInput=document.getElementById('scanner-device-location');
  var duplicateCooldownInput=document.getElementById('duplicate-cooldown-seconds');
  var lapDistanceInput=document.getElementById('lap-distance-metres');
  var defaultSessionTypeInput=document.getElementById('default-session-type');
  var scannerSettingsResultEl=document.getElementById('scanner-settings-result');
  var currentSession=null;
  var sessionScans=[];
  var lastAdminScan=null;

  function renderScannerSettings(){
    var scanner=scannerSettings();
    var program=programSettings();
    scannerDeviceNameInput.value=scanner.deviceName;
    scannerDeviceLocationInput.value=scanner.deviceLocation;
    duplicateCooldownInput.value=scanner.duplicateCooldownSeconds;
    lapDistanceInput.value=Math.round(program.lapDistanceKm*1000);
    defaultSessionTypeInput.value=program.defaultSessionType;
    sessionTypeEl.value=program.defaultSessionType;
  }

  document.getElementById('save-scanner-settings-btn').addEventListener('click',function(){
    var seconds=Number(duplicateCooldownInput.value);
    if(!isFinite(seconds)||seconds<0){seconds=3;}
    seconds=Math.min(120,Math.round(seconds));
    var metres=Number(lapDistanceInput.value);
    if(!isFinite(metres)||metres<=0){metres=250;}
    metres=Math.min(2000,Math.max(10,Math.round(metres)));
    var deviceName=scannerDeviceNameInput.value.trim()||'Admin dashboard';
    var deviceLocation=scannerDeviceLocationInput.value.trim()||'School';
    var defaultSessionType=defaultSessionTypeInput.value||'Run Club';
    save(K.scannerSettings,{duplicateCooldownSeconds:seconds,deviceName:deviceName,deviceLocation:deviceLocation});
    saveProgramSettings({lapDistanceKm:metres/1000,defaultSessionType:defaultSessionType});
    duplicateCooldownInput.value=seconds;
    lapDistanceInput.value=metres;
    sessionTypeEl.value=defaultSessionType;
    showResult(scannerSettingsResultEl,{success:true,message:'Scanner and track settings saved.',duplicate_cooldown_seconds:seconds,device_name:deviceName,device_location:deviceLocation,lap_distance_metres:metres,default_session_type:defaultSessionType});
    renderLeaderboard(); renderMedals(); renderCertificates(); renderSchoolSummary(); renderReportSummaries(); renderStudentProgress(); renderOnboarding();
  });
  renderScannerSettings();

  function startRunSessionWithBackend(session){
    var guard=liveRosterGuard();
    if(!guard.ok){return Promise.resolve({ok:false,blocked:true,error:guard.message||'Local run session blocked.'});}
    if(guard.live&&window.RunClubBackend&&window.RunClubBackend.backendDataAccess&&window.RunClubBackend.backendDataAccess.createRunSession){
      return window.RunClubBackend.backendDataAccess.createRunSession({
        session_type:session.type,
        notes:session.notes,
        lap_distance_km:session.lap_distance_km
      }).then(function(result){
        if(!result.ok){return result;}
        var row=Array.isArray(result.data)?result.data[0]:result.data;
        if(row&&row.id){session.id=row.id;session.backend_id=row.id;}
        return result;
      });
    }
    return Promise.resolve({ok:true,local:true});
  }

  function finishRunSessionWithBackend(session){
    var guard=liveRosterGuard();
    if(!guard.ok){return Promise.resolve({ok:false,blocked:true,error:guard.message||'Local run session blocked.'});}
    if(guard.live&&window.RunClubBackend&&window.RunClubBackend.backendDataAccess&&window.RunClubBackend.backendDataAccess.finishRunSession){
      return window.RunClubBackend.backendDataAccess.finishRunSession({
        id:session.backend_id||session.id,
        finished_at:session.finished_at
      });
    }
    return Promise.resolve({ok:true,local:true});
  }

  function undoScanWithBackend(scan){
    var guard=liveRosterGuard();
    if(!guard.ok){return Promise.resolve({ok:false,blocked:true,error:guard.message||'Local scan undo blocked.'});}
    if(guard.live&&window.RunClubBackend&&window.RunClubBackend.backendDataAccess&&window.RunClubBackend.backendDataAccess.recordScanUndo){
      return window.RunClubBackend.backendDataAccess.recordScanUndo({
        idempotency_key:scan.idempotency_key,
        barcode:scan.barcode,
        reason:'Undo last scan',
        source:'admin-dashboard',
        metadata:{scanner_id:scannerId(),student_id:scan.student_id,student_name:scan.name}
      });
    }
    return Promise.resolve({ok:true,local:true});
  }

  document.getElementById('start-session-btn').addEventListener('click', function(){
    var session={id:'session-'+Date.now(),date:new Date().toISOString().slice(0,10),type:sessionTypeEl.value||programSettings().defaultSessionType,notes:sessionNotesEl.value.trim(),device:scannerId(),lap_distance_km:programSettings().lapDistanceKm,scans:[]};
    startRunSessionWithBackend(session).then(function(result){
      if(!result.ok){showResult(scanResultEl,{success:false,error:result.error||result.reason||'Local run session blocked.'});return;}
      currentSession=session;
    sessionScans=[];
    sessionStateEl.className='session-state session-state--open';
    sessionStateEl.textContent='Session OPEN - '+currentSession.type+' - '+currentSession.date+' - '+currentSession.device;
    scanInput.focus();
    });
  });

  document.getElementById('finish-session-btn').addEventListener('click', function(){
    if(!currentSession){return;}
    currentSession.scans=sessionScans;
    currentSession.finished_at=new Date().toISOString();
    finishRunSessionWithBackend(currentSession).then(function(result){
      if(!result.ok){showResult(scanResultEl,{success:false,error:result.error||result.reason||'Local run session blocked.'});return;}
      var sessions=load(K.sessions,[]);
      sessions.push(currentSession);
      save(K.sessions,sessions);
      sessionStateEl.className='session-state session-state--closed';
      sessionStateEl.textContent='Session closed – '+sessionScans.length+' scans saved.';
      currentSession=null; sessionScans=[];
      renderSessionLog([]);
    });
  });

  var autoTimer=null;
  function handleScan(){
    var barcode=scanInput.value.trim().toUpperCase();
    if(!barcode)return;
    var activeSessionType=currentSession?currentSession.type:sessionTypeEl.value;
    var result=window.RunClubScan.logLap(barcode,{source:'admin-dashboard',scanner_id:scannerId(),session_id:currentSession?(currentSession.backend_id||currentSession.id):null,session_type:activeSessionType,duplicateWindowMs:duplicateWindowMs()});
    if(!result.success){
      showResult(scanResultEl,{success:false,duplicate:result.duplicate===true,error:result.error||'Scan error'});
    } else {
      var scan={barcode:barcode,name:result.student.name,laps:result.student.laps,time:new Date().toISOString(),scanner_id:scannerId(),session_type:activeSessionType,idempotency_key:result.idempotency_key,attendance_only:result.attendance_only===true};
      sessionScans.push(scan);
      if(result.attendance_only){
        lastAdminScan=null;
        undoAdminScanBtn.hidden=true;
      } else {
        lastAdminScan={student_id:result.student.id,name:result.student.name,barcode:barcode,idempotency_key:result.idempotency_key};
        undoAdminScanBtn.hidden=false;
      }
      if(result.milestone){
        renderMilestoneNotification(recordMilestoneNotification(result.student,result.milestone,'admin-dashboard'));
      } else {
        renderMilestoneNotification(null);
      }
      showResult(scanResultEl,{success:true,message:result.attendance_only?'Attendance recorded - Run Club laps unchanged':'Lap logged ✓',milestone:result.milestone||null,student:{id:result.student.id,name:result.student.name,total_laps:result.student.laps,km:result.student.km.toFixed(2)}});
      renderSessionLog(sessionScans);
      renderStudentList();
      renderLeaderboard();
      renderAwards();
      renderMedals();
      renderCertificates();
      renderSchoolSummary();
      renderReportSummaries();
      renderAuditTrail();
    }
    scanInput.value=''; scanInput.focus();
  }

  function undoLastAdminScan(){
    if(!lastAdminScan){return;}
    if(!confirm('Undo last scan for '+lastAdminScan.name+'?')){scanInput.focus();return;}
    var students=getStudents();
    var student=students.find(function(s){return s.id===lastAdminScan.student_id;});
    if(student&&student.laps>0){
      undoScanWithBackend(lastAdminScan).then(function(result){
        if(!result.ok){showResult(scanResultEl,{success:false,error:result.error||result.reason||'Local scan undo blocked.'});return;}
        student.laps-=1;
        saveStudents(students);
        sessionScans=sessionScans.filter(function(scan,index){return index!==sessionScans.length-1;});
        if(window.RunClubScan&&window.RunClubScan.auditScan){
          window.RunClubScan.auditScan({barcode:lastAdminScan.barcode,scanner_id:scannerId(),source:'admin-dashboard',success:true,undo:true,student_id:student.id,student_name:student.name,laps_after:student.laps,idempotency_key:lastAdminScan.idempotency_key});
        }
        renderSessionLog(sessionScans);
        renderStudentList(); renderLeaderboard(); renderAwards(); renderMedals(); renderCertificates(); renderSchoolSummary(); renderReportSummaries(); renderAuditTrail();
        showResult(scanResultEl,{success:true,message:'Last scan undone.',student:{id:student.id,name:student.name,total_laps:student.laps}});
        lastAdminScan=null;
        undoAdminScanBtn.hidden=true;
        scanInput.focus();
      });
      return;
    }
    lastAdminScan=null;
    undoAdminScanBtn.hidden=true;
    scanInput.focus();
  }

  scanBtn.addEventListener('click',handleScan);
  undoAdminScanBtn.addEventListener('click',undoLastAdminScan);
  scanInput.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();handleScan();}});
  scanInput.addEventListener('input',function(){
    if(autoTimer)clearTimeout(autoTimer);
    autoTimer=setTimeout(function(){autoTimer=null;handleScan();},120);
  });

  function renderSessionLog(scans){
    if(!scans.length){sessionLogEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No scans yet this session.</p>';return;}
    var html='<p style="font-size:0.82rem;color:#555;">'+scans.length+' scan(s) this session:</p><ul style="padding:0;list-style:none;margin:0;">';
    scans.slice().reverse().slice(0,20).forEach(function(s){
      html+='<li style="padding:0.3rem 0;border-bottom:1px solid #f0f0f0;font-size:0.82rem;">'+s.name+' – '+(s.attendance_only?'attendance only':'lap #'+s.laps)+' – <span style="color:#888;">'+s.time.slice(11,19)+'</span></li>';
    });
    html+='</ul>';
    sessionLogEl.innerHTML=html;
  }
  renderSessionLog([]);

  // === OFFLINE QUEUE ===
  var offlineQueueEl=document.getElementById('offline-queue-list');

  function defaultOfflineQueue(){
    return [{
      id:'demo-offline-1',
      device:'Kiosk device A',
      lastUpdated:new Date().toISOString(),
      scans:[
        {barcode:'STUDENT1',time:new Date().toISOString()},
        {barcode:'STUDENT2',time:new Date().toISOString()},
        {barcode:'STUDENT4',time:new Date().toISOString()}
      ]
    }];
  }

  function offlineBatchStatus(batch){
    var scans=batch.scans||[];
    if(!scans.length){return {label:'Needs review',className:'needs-review'};}
    var synced=scans.filter(function(scan){return scan.status==='logged'||scan.status==='duplicate';}).length;
    var failed=scans.filter(function(scan){return scan.status==='failed'||scan.status==='unknown'||scan.status==='error';}).length;
    if(synced===scans.length){return {label:'Synced',className:'synced'};}
    if(failed>0&&synced>0){return {label:'Partially synced',className:'partial'};}
    if(failed>0){return {label:'Needs review',className:'needs-review'};}
    return {label:'Waiting',className:'waiting'};
  }

  function offlineScanResultText(scan){
    if(scan.status==='logged'){return 'Logged';}
    if(scan.status==='duplicate'){return 'Duplicate ignored';}
    if(scan.status==='unknown'){return 'Unknown barcode';}
    if(scan.status==='error'||scan.status==='failed'){return 'Error';}
    return 'Waiting';
  }

  function escapeAttr(value){ return escapeHtml(value).replace(/"/g,'&quot;'); }

  function renderOfflineQueue(){
    var batches=load(K.offlineQueue, defaultOfflineQueue());
    if(!batches.length){offlineQueueEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No offline kiosk batches waiting to sync.</p>';return;}
    offlineQueueEl.innerHTML=batches.map(function(batch){
      var status=offlineBatchStatus(batch);
      var scans=batch.scans||[];
      var failedCount=scans.filter(function(scan){return scan.status==='failed'||scan.status==='unknown'||scan.status==='error';}).length;
      return '<div class="offline-batch offline-batch--'+status.className+'">'+
        '<div class="offline-batch-head"><div><strong>'+escapeHtml(batch.device||'Offline kiosk')+'</strong><br>'+
        '<span>'+scans.length+' scans • Last updated '+new Date(batch.lastUpdated||Date.now()).toLocaleTimeString()+'</span></div>'+
        '<span class="offline-status offline-status--'+status.className+'">'+status.label+'</span></div>'+
        '<details style="margin-top:0.5rem;" open><summary>Review batch</summary>'+
        '<table class="offline-scan-table"><thead><tr><th>Barcode</th><th>Time</th><th>Status</th><th>Message</th></tr></thead><tbody>'+
        scans.map(function(scan){return '<tr><td>'+escapeHtml(scan.barcode||'')+'</td><td>'+new Date(scan.time||Date.now()).toLocaleTimeString()+'</td><td>'+offlineScanResultText(scan)+'</td><td>'+escapeHtml(scan.message||'')+'</td></tr>';}).join('')+
        '</tbody></table>'+
        '</details>'+
        '<div class="offline-actions">'+
          '<button type="button" class="secondary sync-offline-batch" data-batch="'+escapeAttr(batch.id)+'">Sync batch</button>'+
          '<button type="button" class="secondary retry-offline-batch" data-batch="'+escapeAttr(batch.id)+'" '+(failedCount?'':'disabled')+'>Retry failed scans</button>'+
          '<button type="button" class="secondary download-offline-batch" data-batch="'+escapeAttr(batch.id)+'">Download batch CSV</button>'+
          '<button type="button" class="secondary clear-offline-batch" data-batch="'+escapeAttr(batch.id)+'" '+(status.label==='Synced'?'':'disabled')+'>Clear synced batch</button>'+
        '</div>'+
      '</div>';
    }).join('');
    document.querySelectorAll('.sync-offline-batch').forEach(function(btn){
      btn.onclick=function(){ syncOfflineBatch(btn.dataset.batch); };
    });
    document.querySelectorAll('.retry-offline-batch').forEach(function(btn){
      btn.onclick=function(){ retryOfflineBatch(btn.dataset.batch); };
    });
    document.querySelectorAll('.download-offline-batch').forEach(function(btn){
      btn.onclick=function(){ downloadOfflineBatch(btn.dataset.batch); };
    });
    document.querySelectorAll('.clear-offline-batch').forEach(function(btn){
      btn.onclick=function(){ clearSyncedOfflineBatch(btn.dataset.batch); };
    });
  }

  function syncOfflineBatch(batchId, retryOnly){
    var batches=load(K.offlineQueue, defaultOfflineQueue());
    var batch=batches.find(function(b){return b.id===batchId;});
    if(!batch){return;}
    batch.scans=(batch.scans||[]).map(function(scan){
      if(retryOnly&&!(scan.status==='failed'||scan.status==='unknown'||scan.status==='error')){return scan;}
      var barcode=String(scan.barcode||'').toUpperCase();
      var result=window.RunClubScan.logLap(barcode,{source:'offline-queue',scanner_id:batch.device||scannerId(),duplicateWindowMs:duplicateWindowMs()});
      scan.synced_at=new Date().toISOString();
      if(result.success){
        scan.status='logged';
        scan.student_id=result.student.id;
        scan.student_name=result.student.name;
        scan.laps_after=result.student.laps;
        scan.message='Lap logged';
      } else if(result.duplicate){
        scan.status='duplicate';
        scan.message=result.error||'Duplicate ignored';
      } else if(/not recognised/i.test(result.error||'')){
        scan.status='unknown';
        scan.message=result.error;
      } else {
        scan.status='failed';
        scan.message=result.error||'Scan error';
      }
      return scan;
    });
    batch.lastUpdated=new Date().toISOString();
    save(K.offlineQueue,batches);
    renderOfflineQueue(); renderStudentList(); renderLeaderboard(); renderAwards(); renderMedals(); renderCertificates(); renderSchoolSummary(); renderAuditTrail();
  }

  function retryOfflineBatch(batchId){ syncOfflineBatch(batchId,true); }

  function clearSyncedOfflineBatch(batchId){
    var batches=load(K.offlineQueue, defaultOfflineQueue());
    var batch=batches.find(function(b){return b.id===batchId;});
    if(!batch||offlineBatchStatus(batch).label!=='Synced'){return;}
    save(K.offlineQueue,batches.filter(function(b){return b.id!==batchId;}));
    renderOfflineQueue();
  }

  function downloadOfflineBatch(batchId){
    var batches=load(K.offlineQueue, defaultOfflineQueue());
    var batch=batches.find(function(b){return b.id===batchId;});
    if(!batch){return;}
    var rows=(batch.scans||[]).map(function(scan){return {batch_id:batch.id,device:batch.device,barcode:scan.barcode,time:scan.time,status:scan.status||'waiting',message:scan.message||'',student_id:scan.student_id||'',student_name:scan.student_name||'',synced_at:scan.synced_at||''};});
    dlCsv('offline-batch-'+batch.id+'.csv',rows,['batch_id','device','barcode','time','status','message','student_id','student_name','synced_at']);
  }
  renderOfflineQueue();

  document.getElementById('download-session-btn').addEventListener('click',function(){
    var data={scans:sessionScans,session:currentSession,past:load(K.sessions,[])};
    dlJson('session-'+new Date().toISOString().slice(0,10)+'.json',data);
  });
  document.getElementById('export-session-csv-btn').addEventListener('click',function(){
    if(!sessionScans.length)return;
    dlCsv('session-laps.csv',sessionScans,['time','barcode','name','laps']);
  });

  // TIMED RUNS
  var timedStudentEl=document.getElementById('timed-student');
  var timedStateEl=document.getElementById('timed-state');
  var timedResultsEl=document.getElementById('timed-results');
  var timedStart=null;

  function populateTimedStudents(){
    timedStudentEl.innerHTML='';
    getStudents().forEach(function(s){
      var o=document.createElement('option'); o.value=s.id; o.textContent=s.name+' ('+s.year+')'; timedStudentEl.appendChild(o);
    });
  }
  populateTimedStudents();

  document.getElementById('start-timed-btn').addEventListener('click',function(){
    timedStart=Date.now(); timedStateEl.textContent='Timer running… Press Stop to save.';
  });
  document.getElementById('stop-timed-btn').addEventListener('click',function(){
    if(!timedStart){timedStateEl.textContent='No timer running.';return;}
    var elapsed=Math.round((Date.now()-timedStart)/1000);
    timedStart=null;
    var studentId=timedStudentEl.value;
    var student=getStudents().find(function(s){return s.id===studentId;});
    var run={id:'timed-'+Date.now(),student_id:studentId,student_name:student?student.name:studentId,elapsed_seconds:elapsed,event:'Timed Mile',date:new Date().toISOString().slice(0,10)};
    var runs=load(K.timedRuns,[]); runs.push(run); save(K.timedRuns,runs);
    timedStateEl.textContent='Saved: '+(student?student.name:studentId)+' – '+elapsed+'s ('+(elapsed/60).toFixed(2)+' min)';
    renderTimedResults();
  });

  function renderTimedResults(){
    var runs=load(K.timedRuns,[]);
    if(!runs.length){timedResultsEl.innerHTML='';return;}
    var html='<ul style="padding:0;list-style:none;margin:0;">';
    runs.slice().reverse().slice(0,10).forEach(function(r){
      html+='<li style="padding:0.3rem 0;border-bottom:1px solid #f0f0f0;font-size:0.82rem;">'+r.student_name+' – '+r.event+' – '+r.elapsed_seconds+'s ('+( r.elapsed_seconds/60).toFixed(2)+' min) – '+r.date+'</li>';
    });
    html+='</ul>';
    timedResultsEl.innerHTML=html;
  }
  renderTimedResults();

  // === STUDENTS ===
  var studentListEl=document.getElementById('student-list');
  var studentSearchEl=document.getElementById('student-search');
  var addStudentFormEl=document.getElementById('add-student-form');
  var addStudentResultEl=document.getElementById('add-student-result');
  var barcodeConfirmationEl=document.getElementById('barcode-confirmation');
  var studentEditorModalEl=document.getElementById('student-editor-modal');
  var editStudentFormEl=document.getElementById('edit-student-form');
  var editStudentIdEl=document.getElementById('edit-student-id');
  var editStudentFirstEl=document.getElementById('edit-student-first');
  var editStudentLastEl=document.getElementById('edit-student-last');
  var editStudentYearEl=document.getElementById('edit-student-year');
  var editStudentClassEl=document.getElementById('edit-student-class');
  var editStudentHouseEl=document.getElementById('edit-student-house');
  var editStudentTeamEl=document.getElementById('edit-student-team');
  var editStudentPseudonymEl=document.getElementById('edit-student-pseudonym');
  var editStudentHidePublicNameEl=document.getElementById('edit-student-hide-public-name');
  var editStudentShareCertificatesEl=document.getElementById('edit-student-share-certificates');
  var editStudentMedicalAsthmaEl=document.getElementById('edit-student-medical-asthma');
  var editStudentMedicalAnaphylaxisEl=document.getElementById('edit-student-medical-anaphylaxis');
  var editStudentMedicalMedicationEl=document.getElementById('edit-student-medical-medication');
  var editStudentMedicalEmergencyNoteEl=document.getElementById('edit-student-medical-emergency-note');
  var editStudentMedicalHealthPlanEl=document.getElementById('edit-student-medical-health-plan');
  var editStudentMedicalReviewedEl=document.getElementById('edit-student-medical-reviewed');
  var progressStudentEl=document.getElementById('progress-student');
  var progressTermEl=document.getElementById('progress-term');
  var studentProgressSummaryEl=document.getElementById('student-progress-summary');
  var studentProgressHistoryEl=document.getElementById('student-progress-history');
  var guardianLinkListEl=document.getElementById('guardian-link-list');
  var guardianAccessLogEl=document.getElementById('guardian-access-log');
  var generateGuardianLinksBtn=document.getElementById('generate-guardian-links-btn');

  function refreshStudentViews(){
    renderStudentList();
    renderGuardianLinks();
    renderGuardianAccessLog();
    populateProgressStudents();
    populateTrainingStudents();
    populateLbFilters();
    renderLeaderboard();
    populateActivityStudents();
    populateTimedStudents();
    populateAthleticsResultStudents();
    renderMedals();
    renderCertificates();
    renderSchoolSummary();
    renderReportSummaries();
    renderSummaryDashboards();
    renderAdminAnalytics();
    renderMultiSchoolReports();
    populateFullHistoryStudents();
    populateClassReportSelect();
    populateAdjustmentStudents();
    renderFullStudentHistory();
    renderAttendanceSummary();
    renderAdjustmentLedger();
    renderStudentProgress();
    renderTrainingStatus();
    renderPBTracking();
    renderAgeChampionScoring();
    renderHousePoints();
    renderAthleticsConsentSummary();
    renderInterschoolAthleticsEvents();
    renderChallengeProgress();
    renderChallengeAwards();
  }

  function renderBarcodeConfirmation(student){
    barcodeConfirmationEl.hidden=false;
    barcodeConfirmationEl.innerHTML=
      '<div><strong>Barcode generated</strong><br><span>'+escapeHtml(student.name)+' • '+escapeHtml(student.barcode||student.id)+'</span></div>'+
      barcodeCardHtml(student);
  }

  function studentProfileUrl(student){
    return 'student-profile.html?student=' + encodeURIComponent(student.barcode || student.id) + '&view=admin&from=admin';
  }

  function privacyDisplayName(student){
    if(!student){return 'Student';}
    var pseudonym=String(student.pseudonym||student.preferred_name||'').trim();
    if(pseudonym){return pseudonym;}
    if(student.hide_public_name||student.consent_status==='declined'){
      return 'Runner ' + String(student.barcode||student.id||'').slice(-4);
    }
    return student.name;
  }

  function studentConsentStatus(student){
    var status=String(student.consent_status||'pending').toLowerCase();
    if(status==='granted'){return 'Consent granted';}
    if(status==='declined'){return 'Consent declined';}
    return 'Consent pending';
  }

  function medicalNotes(){ return load(MEDICAL_NOTES_KEY,{}); }
  function medicalNotesFor(studentId){ return medicalNotes()[studentId] || {}; }
  function saveMedicalNotes(studentId, notes){
    var rows=medicalNotes();
    var clean={
      asthma:String(notes.asthma||'').trim(),
      anaphylaxis:String(notes.anaphylaxis||'').trim(),
      medication:String(notes.medication||'').trim(),
      emergency_note:String(notes.emergency_note||'').trim(),
      health_plan_supplied:!!notes.health_plan_supplied,
      reviewed_at:String(notes.reviewed_at||'').trim(),
      updated_at:new Date().toISOString()
    };
    var hasText=clean.asthma||clean.anaphylaxis||clean.medication||clean.emergency_note||clean.reviewed_at||clean.health_plan_supplied;
    if(hasText){ rows[studentId]=clean; } else { delete rows[studentId]; }
    save(MEDICAL_NOTES_KEY,rows);
  }

  function saveMedicalNotesWithBackend(student, notes){
    var guard=liveRosterGuard();
    if(!guard.ok){return Promise.resolve({ok:false,blocked:true,error:guard.message||'Local medical notes blocked.'});}
    if(guard.live&&student&&window.RunClubBackend&&window.RunClubBackend.backendDataAccess&&window.RunClubBackend.backendDataAccess.setStudentMedicalNotes){
      return window.RunClubBackend.backendDataAccess.setStudentMedicalNotes(Object.assign({},notes,{
        student_id:isUuid(student.id)?student.id:null,
        barcode:student.barcode||student.id,
        metadata:{source_screen:'admin-dashboard',student_name:student.name}
      }));
    }
    return Promise.resolve({ok:true,local:true});
  }

  function deleteMedicalNotes(studentId){
    var rows=medicalNotes();
    if(rows[studentId]){ delete rows[studentId]; save(MEDICAL_NOTES_KEY,rows); }
  }

  function renderStudentList(){
    var students=getStudents();
    var q=(studentSearchEl.value||'').toLowerCase();
    if(q) students=students.filter(function(s){return (s.name+s.id+s.year+s.cls+(s.house||'')+(s.team||'')).toLowerCase().includes(q);});
    studentListEl.innerHTML='';
    students.forEach(function(s){
      var li=document.createElement('li');
      li.style.display='flex'; li.style.justifyContent='space-between'; li.style.alignItems='center'; li.style.gap='8px';
      var label=document.createElement('span');
      var profileLink=document.createElement('a');
      profileLink.className='student-name-link';
      profileLink.href=studentProfileUrl(s);
      profileLink.textContent=s.name;
      label.appendChild(profileLink);
      label.appendChild(document.createTextNode(' ('+s.barcode+') – '+s.year+', '+s.cls+(s.house?' • '+s.house:'')+(s.team?' • Team '+s.team:'')+' – '+s.laps+' laps / '+lapsTokm(s.laps).toFixed(2)+' km'));
      var goalsBtn=document.createElement('button');
      goalsBtn.textContent='🎯 Goals';
      goalsBtn.className='link-btn';
      goalsBtn.addEventListener('click',function(){ if(window.AdminGoals){ window.AdminGoals.open(s); } });
      var barcodeBtn=document.createElement('button');
      barcodeBtn.textContent='Barcode';
      barcodeBtn.className='link-btn';
      barcodeBtn.addEventListener('click',function(){ printStudentBarcodeCard(s); });
      var editBtn=document.createElement('button');
      editBtn.textContent='Edit';
      editBtn.className='link-btn';
      editBtn.addEventListener('click',function(e){ openStudentEditor(s.id,e.currentTarget); });
      var removeBtn=document.createElement('button');
      removeBtn.textContent='Remove';
      removeBtn.className='link-btn danger-link';
      removeBtn.addEventListener('click',function(){ deleteStudent(s.id); });
      var actions=document.createElement('span');
      actions.className='student-list-actions';
      actions.appendChild(barcodeBtn);
      actions.appendChild(editBtn);
      actions.appendChild(goalsBtn);
      actions.appendChild(removeBtn);
      li.appendChild(label); li.appendChild(actions);
      studentListEl.appendChild(li);
    });
  }
  renderStudentList();
  studentSearchEl.addEventListener('input',renderStudentList);

  function guardianLinks(){ return load(GUARDIAN_LINKS_KEY,[]); }
  function saveGuardianLinks(rows){ save(GUARDIAN_LINKS_KEY,rows); }
  function guardianAccessLogs(){ return load(GUARDIAN_ACCESS_LOG_KEY,[]); }
  function guardianExpiryDate(){
    var d=new Date();
    d.setFullYear(d.getFullYear()+1);
    return d.toISOString();
  }

  function generateGuardianLinkCode(student){
    var seed=(student.id||student.barcode||student.name||'student').replace(/[^a-z0-9]/gi,'').slice(0,8).toUpperCase();
    var random=Math.floor(100000+Math.random()*900000);
    return 'GP-' + seed + '-' + random;
  }

  function guardianLinkFromBackendRow(student,row){
    row=Array.isArray(row)?row[0]:row;
    return {
      student_id:student.id,
      student_name:student.name,
      year:student.year,
      class_name:student.cls,
      code:(row&&row.code)||generateGuardianLinkCode(student),
      status:(row&&row.status)||'active',
      expires_at:(row&&row.expires_at)||guardianExpiryDate(),
      created_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    };
  }

  function saveGuardianLinkWithBackend(student){
    var guard=liveRosterGuard();
    if(!guard.ok){return Promise.resolve({ok:false,blocked:true,error:guard.message||'Local guardian link blocked.'});}
    if(guard.live&&window.RunClubBackend&&window.RunClubBackend.backendDataAccess&&window.RunClubBackend.backendDataAccess.issueGuardianLink){
      return window.RunClubBackend.backendDataAccess.issueGuardianLink(student).then(function(result){
        if(!result.ok){return result;}
        return Object.assign({},result,{guardian_link:guardianLinkFromBackendRow(student,result.data)});
      });
    }
    return Promise.resolve({ok:true,local:true,guardian_link:guardianLinkFromBackendRow(student,null)});
  }

  function setGuardianLinkStatusWithBackend(row,status){
    var guard=liveRosterGuard();
    if(!guard.ok){return Promise.resolve({ok:false,blocked:true,error:guard.message||'Local guardian link blocked.'});}
    if(guard.live&&window.RunClubBackend&&window.RunClubBackend.backendDataAccess&&window.RunClubBackend.backendDataAccess.setGuardianLinkStatus){
      return window.RunClubBackend.backendDataAccess.setGuardianLinkStatus({
        student_id:isUuid(row.student_id)?row.student_id:null,
        code:row.code,
        status:status
      });
    }
    return Promise.resolve({ok:true,local:true});
  }

  function upsertGuardianLink(student){
    saveGuardianLinkWithBackend(student).then(function(result){
      if(!result.ok){showResult(addStudentResultEl,{success:false,error:result.error||result.reason||'Local guardian link blocked.'});return;}
      var rows=guardianLinks();
      var existing=rows.find(function(row){return row.student_id===student.id;});
      var link=result.guardian_link||guardianLinkFromBackendRow(student,null);
      if(existing){
        Object.assign(existing,link,{created_at:existing.created_at||link.created_at});
      } else {
        rows.push(link);
      }
      saveGuardianLinks(rows);
      renderGuardianLinks();
      showResult(addStudentResultEl,{success:true,message:'Guardian link issued.',student:student.name,code:link.code});
    });
  }

  function generateMissingGuardianLinks(){
    var rows=guardianLinks();
    var has={};
    rows.forEach(function(row){has[row.student_id]=true;});
    var missing=getStudents().filter(function(student){return !has[student.id];});
    Promise.all(missing.map(saveGuardianLinkWithBackend)).then(function(results){
      var blocked=results.find(function(result){return !result.ok;});
      if(blocked){showResult(addStudentResultEl,{success:false,error:blocked.error||blocked.reason||'Local guardian link blocked.'});return;}
      results.forEach(function(result,index){
        rows.push(result.guardian_link||guardianLinkFromBackendRow(missing[index],null));
      });
      saveGuardianLinks(rows);
      renderGuardianLinks();
      showResult(addStudentResultEl,{success:true,message:'Guardian links generated.',count:missing.length});
    });
  }

  function setGuardianLinkStatus(studentId,status){
    var rows=guardianLinks();
    var target=rows.find(function(row){return row.student_id===studentId;});
    if(!target){return;}
    setGuardianLinkStatusWithBackend(target,status).then(function(result){
      if(!result.ok){showResult(addStudentResultEl,{success:false,error:result.error||result.reason||'Local guardian link blocked.'});return;}
      rows.forEach(function(row){
        if(row.student_id===studentId){
          row.status=status;
          row.updated_at=new Date().toISOString();
        }
      });
      saveGuardianLinks(rows);
      renderGuardianLinks();
      showResult(addStudentResultEl,{success:true,message:'Guardian link '+(status==='revoked'?'revoked.':'restored.'),student:target.student_name});
    });
  }

  function guardianLinkStatus(row){
    if(row.status==='revoked'){return 'Revoked';}
    if(row.expires_at&&new Date(row.expires_at)<new Date()){return 'Expired';}
    return 'Active';
  }

  function renderGuardianLinks(){
    if(!guardianLinkListEl){return;}
    var students=getStudents();
    var rows=guardianLinks().filter(function(row){return students.some(function(student){return student.id===row.student_id;});});
    if(rows.length!==guardianLinks().length){saveGuardianLinks(rows);}
    if(!rows.length){
      guardianLinkListEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No guardian links generated yet.</p>';
      return;
    }
    guardianLinkListEl.innerHTML='<table class="progress-history-table"><thead><tr><th>Student</th><th>Year</th><th>Class</th><th>Guardian code</th><th>Status</th><th>Expires</th><th>Action</th></tr></thead><tbody>'+
      rows.map(function(row){
        var status=guardianLinkStatus(row);
        var statusAction=status==='Revoked'?'Restore':'Revoke';
        return '<tr><td>'+escapeHtml(row.student_name)+'</td><td>'+escapeHtml(row.year)+'</td><td>'+escapeHtml(row.class_name)+'</td><td><code>'+escapeHtml(row.code)+'</code></td><td>'+escapeHtml(status)+'</td><td>'+(row.expires_at?new Date(row.expires_at).toLocaleDateString():'')+'</td><td><button type="button" class="link-btn reissue-guardian-link" data-student="'+escapeAttr(row.student_id)+'">Reissue</button> <button type="button" class="link-btn toggle-guardian-link" data-status="'+(status==='Revoked'?'active':'revoked')+'" data-student="'+escapeAttr(row.student_id)+'">'+statusAction+'</button></td></tr>';
      }).join('')+'</tbody></table>';
    document.querySelectorAll('.reissue-guardian-link').forEach(function(btn){
      btn.addEventListener('click',function(){
        var student=getStudents().find(function(s){return s.id===btn.dataset.student;});
        if(student){upsertGuardianLink(student);}
      });
    });
    document.querySelectorAll('.toggle-guardian-link').forEach(function(btn){
      btn.addEventListener('click',function(){ setGuardianLinkStatus(btn.dataset.student,btn.dataset.status); });
    });
  }

  function renderGuardianAccessLog(){
    if(!guardianAccessLogEl){return;}
    var rows=guardianAccessLogs().slice().reverse().slice(0,12);
    if(!rows.length){
      guardianAccessLogEl.innerHTML='<h3 style="margin-bottom:0.5rem;">Guardian Access Log</h3><p style="color:#888;font-size:0.85rem;">No parent portal access attempts yet.</p>';
      return;
    }
    guardianAccessLogEl.innerHTML='<h3 style="margin-bottom:0.5rem;">Guardian Access Log</h3><table class="progress-history-table"><thead><tr><th>Time</th><th>Student</th><th>Code type</th><th>Result</th><th>Reason</th></tr></thead><tbody>'+
      rows.map(function(row){return '<tr><td>'+new Date(row.time).toLocaleString()+'</td><td>'+escapeHtml(row.student_name||'')+'</td><td>'+escapeHtml(row.access_type||'')+'</td><td>'+escapeHtml(row.result||'')+'</td><td>'+escapeHtml(row.reason||'')+'</td></tr>';}).join('')+
      '</tbody></table>';
  }

  if(generateGuardianLinksBtn){
    generateGuardianLinksBtn.addEventListener('click',generateMissingGuardianLinks);
  }
  renderGuardianLinks();
  renderGuardianAccessLog();

  function populateProgressStudents(){
    var selected=progressStudentEl.value;
    progressStudentEl.innerHTML='';
    getStudents().forEach(function(s){
      var o=document.createElement('option');o.value=s.id;o.textContent=s.name+' ('+s.year+', '+s.cls+')';progressStudentEl.appendChild(o);
    });
    if(selected&&getStudents().some(function(s){return s.id===selected;})){progressStudentEl.value=selected;}
  }

  function termRange(term){
    var year=new Date().getFullYear();
    var ranges={
      term1:[new Date(year,1,1),new Date(year,3,30,23,59,59)],
      term2:[new Date(year,3,1),new Date(year,6,15,23,59,59)],
      term3:[new Date(year,6,1),new Date(year,8,30,23,59,59)],
      term4:[new Date(year,9,1),new Date(year,11,31,23,59,59)]
    };
    return ranges[term]||null;
  }

  function inSelectedTerm(dateValue){
    var range=termRange(progressTermEl.value);
    if(!range){return true;}
    var date=new Date(dateValue);
    return date>=range[0]&&date<=range[1];
  }

  function studentProgressRows(studentId){
    var student=getStudents().find(function(s){return s.id===studentId;});
    if(!student){return [];}
    var rows=[];
    load(K.scanAudit,[]).forEach(function(row){
      if(row.student_id===studentId&&row.success&&!row.undo&&!row.attendance_only&&inSelectedTerm(row.time)){
        rows.push({date:row.time,type:'Lap scan',detail:row.source||'scanner',amount:'1 lap',km:+programSettings().lapDistanceKm.toFixed(2),status:'Logged'});
      }
      if(row.student_id===studentId&&row.undo&&inSelectedTerm(row.time)){
        rows.push({date:row.time,type:'Undo',detail:row.source||'scanner',amount:'-1 lap',km:-programSettings().lapDistanceKm,status:'Adjusted'});
      }
    });
    load(K.activity,[]).forEach(function(row){
      if(row.student_id===studentId&&inSelectedTerm(row.date)){
        rows.push({date:row.date,type:'Activity',detail:row.activity_type||'Activity',amount:(row.minutes||0)+' min',km:+minutesToKm(Number(row.minutes||0)).toFixed(2),status:'Logged'});
      }
    });
    load(K.timedRuns,[]).forEach(function(row){
      if(row.student_id===studentId&&inSelectedTerm(row.date||row.time||row.created)){
        rows.push({date:row.date||row.time||row.created,type:'Timed run',detail:row.event||'Timed lap',amount:row.seconds?row.seconds+' sec':'Time saved',km:0,status:'Recorded'});
      }
    });
    return rows.sort(function(a,b){return new Date(b.date)-new Date(a.date);});
  }

  function renderStudentProgress(){
    var studentId=progressStudentEl.value || (getStudents()[0]&&getStudents()[0].id);
    var student=getStudents().find(function(s){return s.id===studentId;});
    if(!student){studentProgressSummaryEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No student selected.</p>';studentProgressHistoryEl.innerHTML='';return;}
    progressStudentEl.value=student.id;
    var rows=studentProgressRows(student.id);
    var scanLaps=rows.filter(function(r){return r.type==='Lap scan';}).length-rows.filter(function(r){return r.type==='Undo';}).length;
    var periodKm=rows.reduce(function(total,row){return total+Number(row.km||0);},0);
    var certificates=certificatesFor(student);
    studentProgressSummaryEl.innerHTML='<div class="progress-summary-grid">'+
      '<div class="stat-box"><div class="stat-value">'+student.laps+'</div><div class="stat-label">Lifetime laps</div></div>'+
      '<div class="stat-box"><div class="stat-value">'+totalKm(student).toFixed(2)+'</div><div class="stat-label">Lifetime km</div></div>'+
      '<div class="stat-box"><div class="stat-value">'+scanLaps+'</div><div class="stat-label">Selected period laps</div></div>'+
      '<div class="stat-box"><div class="stat-value">'+periodKm.toFixed(2)+'</div><div class="stat-label">Selected period km</div></div>'+
      '<div class="stat-box"><div class="stat-value">'+certificates.length+'</div><div class="stat-label">Certificates ready</div></div>'+
      '</div>';
    if(!rows.length){studentProgressHistoryEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No progress records match this filter yet.</p>';return;}
    studentProgressHistoryEl.innerHTML='<table class="progress-history-table"><thead><tr><th>Date</th><th>Type</th><th>Detail</th><th>Amount</th><th>Km</th><th>Status</th></tr></thead><tbody>'+
      rows.slice(0,40).map(function(row){return '<tr><td>'+new Date(row.date).toLocaleDateString()+'</td><td>'+escapeHtml(row.type)+'</td><td>'+escapeHtml(row.detail)+'</td><td>'+escapeHtml(row.amount)+'</td><td>'+Number(row.km||0).toFixed(2)+'</td><td>'+escapeHtml(row.status)+'</td></tr>';}).join('')+
      '</tbody></table>';
  }

  function exportStudentProgressCsv(){
    var studentId=progressStudentEl.value;
    var student=getStudents().find(function(s){return s.id===studentId;});
    if(!student){return;}
    var rows=studentProgressRows(student.id).map(function(row){return {student:student.name,year:student.year,class:student.cls,date:row.date,type:row.type,detail:row.detail,amount:row.amount,km:row.km,status:row.status};});
    dlCsv('student-progress-'+student.id+'.csv',rows,['student','year','class','date','type','detail','amount','km','status']);
  }

  populateProgressStudents();
  renderStudentProgress();
  progressStudentEl.addEventListener('change',renderStudentProgress);
  progressTermEl.addEventListener('change',renderStudentProgress);
  document.getElementById('refresh-progress-btn').addEventListener('click',function(){
    if(!confirm('Refresh Student Progress History now? This rebuilds the visible progress history for the selected student.')){return;}
    renderStudentProgress();
  });
  document.getElementById('export-progress-csv-btn').addEventListener('click',exportStudentProgressCsv);

  // === TRAINING ===
  var trainingFormEl=document.getElementById('training-form');
  var trainingTitleEl=document.getElementById('training-title');
  var trainingUrlEl=document.getElementById('training-url');
  var trainingDueDateEl=document.getElementById('training-due-date');
  var trainingNotesEl=document.getElementById('training-notes');
  var trainingStudentListEl=document.getElementById('training-student-list');
  var trainingResultEl=document.getElementById('training-result');
  var trainingStatusListEl=document.getElementById('training-status-list');
  var trainingLibraryListEl=document.getElementById('training-library-list');
  var workoutBuilderDropzoneEl=document.getElementById('workout-builder-dropzone');
  var workoutBuilderTitleEl=document.getElementById('workout-builder-title');
  var workoutBuilderUrlEl=document.getElementById('workout-builder-url');
  var builderWorkout=[];

  function trainingAssignments(){ return load(K.training,[]); }
  function trainingClicks(){ return load(K.trainingClicks,[]); }
  function trainingCompletions(){ return load(K.trainingCompletions,[]); }
  function builderWorkouts(){ return load(BUILDER_WORKOUTS_KEY,[]); }

  function normalizeTrainingUrl(url){
    var value=String(url||'').trim();
    if(!value){return '';}
    if(!/^https?:\/\//i.test(value)){value='https://'+value;}
    return value;
  }

  function populateTrainingStudents(){
    if(!trainingStudentListEl){return;}
    var requestedStudent=(new URLSearchParams(window.location.search)).get('student')||'';
    trainingStudentListEl.innerHTML=getStudents().map(function(s){
      var selected=requestedStudent&&(String(s.id)===requestedStudent||String(s.barcode||'')===requestedStudent);
      return '<label class="ag-student-option"><input type="checkbox" class="training-student-check" value="'+escapeAttr(s.id)+'" '+(selected?'checked':'')+' /> '+escapeHtml(s.name)+' <span>'+escapeHtml(s.year)+' / '+escapeHtml(s.cls)+'</span></label>';
    }).join('');
  }

  function selectedTrainingStudents(){
    return Array.from(document.querySelectorAll('.training-student-check:checked')).map(function(input){return input.value;});
  }

  function saveTrainingAssignmentWithBackend(assignment){
    var guard=liveRosterGuard();
    if(!guard.ok){return Promise.resolve({ok:false,blocked:true,error:guard.message||'Local training assignment blocked.'});}
    if(guard.live&&window.RunClubBackend&&window.RunClubBackend.backendDataAccess&&window.RunClubBackend.backendDataAccess.createTrainingAssignment){
      return window.RunClubBackend.backendDataAccess.createTrainingAssignment(Object.assign({},assignment,{
        assigned_student_ids:(assignment.assigned_student_ids||[]).filter(isUuid),
        metadata:{source_screen:'admin-dashboard',local_assignment_id:assignment.id}
      })).then(function(result){
        if(!result.ok){return result;}
        var row=Array.isArray(result.data)?result.data[0]:result.data;
        if(row&&row.assignment_id){assignment.id=row.assignment_id;assignment.backend_id=row.assignment_id;}
        return result;
      });
    }
    return Promise.resolve({ok:true,local:true});
  }

  function createTrainingAssignment(e){
    e.preventDefault();
    var assigned=selectedTrainingStudents();
    if(!assigned.length){showResult(trainingResultEl,{success:false,error:'Select at least one student.'});return;}
    var url=normalizeTrainingUrl(trainingUrlEl.value);
    if(!url){showResult(trainingResultEl,{success:false,error:'Add a training link.'});return;}
    var assignment={
      id:'training-'+Date.now(),
      title:trainingTitleEl.value.trim(),
      url:url,
      due_date:trainingDueDateEl.value,
      notes:trainingNotesEl.value.trim(),
      assigned_student_ids:assigned,
      created_at:new Date().toISOString(),
      created_by:session.email
    };
    saveTrainingAssignmentWithBackend(assignment).then(function(result){
      if(!result.ok){showResult(trainingResultEl,{success:false,error:result.error||result.reason||'Local training assignment blocked.'});return;}
      var assignments=trainingAssignments();
      assignments.push(assignment);
      save(K.training,assignments);
      trainingFormEl.reset();
      populateTrainingStudents();
      showResult(trainingResultEl,{success:true,message:'Training assigned.',assigned_students:assigned.length,title:assignment.title});
      renderTrainingStatus();
    });
  }

  function trainingClickFor(assignmentId,studentId){
    return trainingClicks().filter(function(click){return click.assignment_id===assignmentId&&click.student_id===studentId;}).sort(function(a,b){return String(b.opened_at).localeCompare(String(a.opened_at));})[0]||null;
  }

  function trainingCompletionFor(assignmentId,studentId){
    return trainingCompletions().filter(function(row){return row.assignment_id===assignmentId&&row.student_id===studentId;}).sort(function(a,b){return String(b.completed_at).localeCompare(String(a.completed_at));})[0]||null;
  }

  function renderTrainingStatus(){
    if(!trainingStatusListEl){return;}
    var assignments=trainingAssignments();
    var students=getStudents();
    if(!assignments.length){trainingStatusListEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No training assigned yet.</p>';return;}
    trainingStatusListEl.innerHTML=assignments.slice().reverse().map(function(task){
      var rows=(task.assigned_student_ids||[]).map(function(studentId){
        var student=students.find(function(s){return s.id===studentId;});
        var click=trainingClickFor(task.id,studentId);
        var completion=trainingCompletionFor(task.id,studentId);
        return '<tr><td>'+escapeHtml(student?student.name:studentId)+'</td><td>'+escapeHtml(student?student.year:'')+'</td><td>'+escapeHtml(student?student.cls:'')+'</td><td>'+(completion?'Reviewed':click?'Opened':'Not opened')+'</td><td>'+escapeHtml(click?new Date(click.opened_at).toLocaleString():'')+'</td><td>'+escapeHtml(completion?new Date(completion.completed_at).toLocaleString():'')+'</td></tr>';
      }).join('');
      return '<div class="training-assignment">'+
        '<div class="training-assignment-head"><div><strong>'+escapeHtml(task.title)+'</strong><br><span>'+escapeHtml(task.notes||'No notes')+'</span></div><a href="'+escapeAttr(task.url)+'" target="_blank" rel="noopener">Open task</a></div>'+
        '<div class="training-meta">'+(task.due_date?'Due '+escapeHtml(task.due_date)+' • ':'')+(task.assigned_student_ids||[]).length+' student(s)</div>'+
        '<table class="training-status-table"><thead><tr><th>Student</th><th>Year</th><th>Class</th><th>Status</th><th>Last opened</th><th>Reviewed</th></tr></thead><tbody>'+rows+'</tbody></table>'+
      '</div>';
    }).join('');
  }

  function renderWorkoutBuilderDropzone(){
    if(!workoutBuilderDropzoneEl){return;}
    if(!builderWorkout.length){
      workoutBuilderDropzoneEl.innerHTML='<p style="color:#888;font-size:0.85rem;">Drag drills here or click a drill to add it.</p>';
      return;
    }
    var total=builderWorkout.reduce(function(sum,item){return sum+Number(item.minutes||0);},0);
    workoutBuilderDropzoneEl.innerHTML='<ol class="workout-builder-list">'+builderWorkout.map(function(item,index){
      return '<li><strong>'+escapeHtml(item.title)+'</strong> <span>'+item.minutes+' min - '+escapeHtml(item.focus)+'</span><button type="button" class="link-btn remove-builder-drill" data-index="'+index+'">Remove</button></li>';
    }).join('')+'</ol><p class="training-meta">Total: '+total+' minutes</p>';
    document.querySelectorAll('.remove-builder-drill').forEach(function(btn){
      btn.addEventListener('click',function(){
        builderWorkout.splice(Number(btn.dataset.index),1);
        renderWorkoutBuilderDropzone();
      });
    });
  }

  function addBuilderComponent(componentId){
    var item=TRAINING_LIBRARY_COMPONENTS.find(function(component){return component.id===componentId;});
    if(!item){return;}
    builderWorkout.push(Object.assign({},item));
    renderWorkoutBuilderDropzone();
  }

  function renderTrainingLibraryBuilder(){
    if(!trainingLibraryListEl||!workoutBuilderDropzoneEl){return;}
    trainingLibraryListEl.innerHTML=TRAINING_LIBRARY_COMPONENTS.map(function(item){
      return '<button type="button" class="training-library-chip" draggable="true" data-component-id="'+escapeAttr(item.id)+'">'+
        '<strong>'+escapeHtml(item.title)+'</strong><span>'+item.minutes+' min - '+escapeHtml(item.focus)+'</span><small>'+escapeHtml(item.detail)+'</small></button>';
    }).join('');
    document.querySelectorAll('.training-library-chip').forEach(function(chip){
      chip.addEventListener('click',function(){addBuilderComponent(chip.dataset.componentId);});
      chip.addEventListener('dragstart',function(e){e.dataTransfer.setData('text/plain',chip.dataset.componentId);});
    });
    workoutBuilderDropzoneEl.addEventListener('dragover',function(e){e.preventDefault();});
    workoutBuilderDropzoneEl.addEventListener('drop',function(e){e.preventDefault();addBuilderComponent(e.dataTransfer.getData('text/plain'));});
    renderWorkoutBuilderDropzone();
  }

  function createTrainingAssignmentFromBuilder(){
    if(!builderWorkout.length){showResult(trainingResultEl,{success:false,error:'Add at least one drill to the workout builder.'});return;}
    var title=workoutBuilderTitleEl.value.trim()||builderWorkout.map(function(item){return item.title;}).slice(0,2).join(' + ');
    var total=builderWorkout.reduce(function(sum,item){return sum+Number(item.minutes||0);},0);
    var planText=builderWorkout.map(function(item,index){return (index+1)+'. '+item.title+' ('+item.minutes+' min): '+item.detail;}).join(' | ');
    trainingTitleEl.value=title;
    trainingUrlEl.value=workoutBuilderUrlEl.value.trim()||'in-app://training-builder/'+Date.now();
    trainingNotesEl.value=total+' min plan: '+planText;
    var saved=builderWorkouts();
    saved.push({id:'builder-workout-'+Date.now(),title:title,total_minutes:total,components:builderWorkout.slice(),created_at:new Date().toISOString(),created_by:session.email});
    save(BUILDER_WORKOUTS_KEY,saved);
    showResult(trainingResultEl,{success:true,message:'Workout copied into the assignment form. Select students, then assign training.',title:title,total_minutes:total});
  }

  if(trainingFormEl){
    trainingFormEl.addEventListener('submit',createTrainingAssignment);
    document.getElementById('select-all-training-students').addEventListener('click',function(){
      document.querySelectorAll('.training-student-check').forEach(function(input){input.checked=true;});
    });
    populateTrainingStudents();
    renderTrainingStatus();
    renderTrainingLibraryBuilder();
    document.getElementById('assign-builder-workout-btn').addEventListener('click',createTrainingAssignmentFromBuilder);
  }

  var printProgramResourcesBtn=document.getElementById('print-program-resources-btn');
  if(printProgramResourcesBtn){
    printProgramResourcesBtn.addEventListener('click',printProgramResources);
  }

  function openStudentEditor(studentId,trigger){
    var student=getStudents().find(function(s){return s.id===studentId;});
    if(!student){return;}
    editStudentIdEl.value=student.id;
    editStudentFirstEl.value=student.first||'';
    editStudentLastEl.value=student.last||'';
    editStudentYearEl.value=student.year||'Year 1';
    editStudentClassEl.value=student.cls||'';
    editStudentHouseEl.value=student.house||'';
    editStudentTeamEl.value=student.team||'';
    editStudentPseudonymEl.value=student.pseudonym||student.preferred_name||'';
    editStudentHidePublicNameEl.checked=!!student.hide_public_name;
    editStudentShareCertificatesEl.checked=!!student.share_certificates_publicly;
    var medical=medicalNotesFor(student.id);
    editStudentMedicalAsthmaEl.value=medical.asthma||'';
    editStudentMedicalAnaphylaxisEl.value=medical.anaphylaxis||'';
    editStudentMedicalMedicationEl.value=medical.medication||'';
    editStudentMedicalEmergencyNoteEl.value=medical.emergency_note||'';
    editStudentMedicalHealthPlanEl.checked=!!medical.health_plan_supplied;
    editStudentMedicalReviewedEl.value=medical.reviewed_at||'';
    openAdminModalAt(studentEditorModalEl,trigger);
    editStudentFirstEl.focus();
  }

  function closeStudentEditor(){
    closeAdminModal(studentEditorModalEl);
    editStudentFormEl.reset();
  }

  function deleteStudent(studentId){
    var students=getStudents();
    var student=students.find(function(s){return s.id===studentId;});
    if(!student){return;}
    if(!confirm('Remove '+student.name+' from the roster? Their past exported reports will not be changed.')){return;}
    var remaining=students.filter(function(s){return s.id!==studentId;});
    deleteStudentWithBackend(remaining,student).then(function(result){
      if(!result.ok){showResult(addStudentResultEl,{success:false,error:result.error||result.reason||'Local roster save blocked.'});return;}
      try {
        var allGoals=JSON.parse(localStorage.getItem('rc_goals')||'{}');
        delete allGoals[studentId];
        localStorage.setItem('rc_goals',JSON.stringify(allGoals));
      } catch(e) {}
      deleteMedicalNotes(studentId);
      refreshStudentViews();
      showResult(addStudentResultEl,{success:true,message:'Student removed.',student:{name:student.name,barcode:student.barcode}});
    });
  }

  editStudentFormEl.addEventListener('submit',function(e){
    e.preventDefault();
    var studentId=editStudentIdEl.value;
    var first=editStudentFirstEl.value.trim();
    var last=editStudentLastEl.value.trim();
    var year=editStudentYearEl.value;
    var cls=editStudentClassEl.value.trim().toUpperCase();
    var house=editStudentHouseEl.value.trim();
    var team=editStudentTeamEl.value.trim();
    var pseudonym=editStudentPseudonymEl.value.trim();
    var hidePublicName=editStudentHidePublicNameEl.checked;
    var shareCertificatesPublicly=editStudentShareCertificatesEl.checked;
    var medicalNotesPayload={
      asthma:editStudentMedicalAsthmaEl.value,
      anaphylaxis:editStudentMedicalAnaphylaxisEl.value,
      medication:editStudentMedicalMedicationEl.value,
      emergency_note:editStudentMedicalEmergencyNoteEl.value,
      health_plan_supplied:editStudentMedicalHealthPlanEl.checked,
      reviewed_at:editStudentMedicalReviewedEl.value
    };
    if(!studentId||!first||!last||!year||!cls){return;}
    var students=getStudents();
    var updated=null;
    students=students.map(function(s){
      if(s.id!==studentId){return s;}
      updated=Object.assign({},s,{first:first,last:last,name:first+' '+last,year:year,cls:cls,house:house,team:team,pseudonym:pseudonym,preferred_name:pseudonym,hide_public_name:hidePublicName,share_certificates_publicly:shareCertificatesPublicly});
      return updated;
    });
    saveStudentsWithBackend(students,updated).then(function(result){
      if(!result.ok){showResult(addStudentResultEl,{success:false,error:result.error||result.reason||'Local roster save blocked.'});return;}
      saveMedicalNotesWithBackend(updated,medicalNotesPayload).then(function(medicalResult){
        if(!medicalResult.ok){showResult(addStudentResultEl,{success:false,error:medicalResult.error||medicalResult.reason||'Local medical notes blocked.'});return;}
        closeStudentEditor();
        saveMedicalNotes(studentId,medicalNotesPayload);
        refreshStudentViews();
        if(updated){showResult(addStudentResultEl,{success:true,message:'Student updated.',student:{name:updated.name,year:updated.year,cls:updated.cls,barcode:updated.barcode}});}
      });
    });
  });

  document.getElementById('close-student-editor-btn').addEventListener('click',closeStudentEditor);
  document.getElementById('cancel-student-edit-btn').addEventListener('click',closeStudentEditor);
  studentEditorModalEl.addEventListener('click',function(e){
    if(e.target===studentEditorModalEl){closeStudentEditor();}
  });

  addStudentFormEl.addEventListener('submit',function(e){
    e.preventDefault();
    var first=document.getElementById('new-student-first').value.trim();
    var last=document.getElementById('new-student-last').value.trim();
    var year=document.getElementById('new-student-year').value;
    var cls=document.getElementById('new-student-class').value.trim().toUpperCase();
    var house=document.getElementById('new-student-house').value.trim();
    var team=document.getElementById('new-student-team').value.trim();
    if(!first||!last||!year||!cls){showResult(addStudentResultEl,{success:false,error:'Enter first name, last name, year and class.'});return;}
    var students=getStudents();
    var id=generateBarcodeId(first,last,students);
    var student={id:id,barcode:id,first:first,last:last,name:first+' '+last,year:year,cls:cls,house:house,team:team,pseudonym:'',preferred_name:'',consent_status:'pending',hide_public_name:false,share_certificates_publicly:false,laps:0,minutes:0,events:[]};
    students.push(student);
    saveStudentsWithBackend(students,student).then(function(result){
      if(!result.ok){showResult(addStudentResultEl,{success:false,error:result.error||result.reason||'Local roster save blocked.'});return;}
      addStudentFormEl.reset();
      refreshStudentViews();
      addStudentResultEl.hidden=true;
      renderBarcodeConfirmation(student);
      printStudentBarcodeCard(student);
    });
  });

  var interschoolAthleticsModeEl=document.getElementById('interschool-athletics-mode');
  var athleticsModeShellEl=document.getElementById('athletics-mode-shell');
  var athleticsModePanelEl=document.getElementById('athletics-mode-panel');
  var athleticsModeStateEl=document.getElementById('athletics-mode-state');
  var interschoolAthleticsEventsEl=document.getElementById('interschool-athletics-events');
  var athleticsConsentSummaryEl=document.getElementById('athletics-consent-summary');
  var athleticsConsentModalEl=document.getElementById('athletics-consent-modal');
  var athleticsConsentListEl=document.getElementById('athletics-consent-list');
  var athleticsEventModalEl=document.getElementById('athletics-event-modal');
  var athleticsEventModalTitleEl=document.getElementById('athletics-event-modal-title');
  var athleticsEventModalSubtitleEl=document.getElementById('athletics-event-modal-subtitle');
  var athleticsTeamSearchEl=document.getElementById('athletics-team-search');
  var athleticsTeamSummaryEl=document.getElementById('athletics-team-summary');
  var athleticsEventModalStatusEl=document.getElementById('athletics-event-modal-status');
  var athleticsTeamStudentListEl=document.getElementById('athletics-team-student-list');
  var athleticsTeamResultEl=document.getElementById('athletics-team-result');
  var sportsChecklistSummaryEl=document.getElementById('sports-checklist-summary');
  var sportsEventsSummaryEl=document.getElementById('sports-events-summary');
  var sportsResultsSummaryEl=document.getElementById('sports-results-summary');
  var sportsPbSummaryEl=document.getElementById('sports-pb-summary');
  var sportsHouseSummaryEl=document.getElementById('sports-house-summary');
  var sportsXcSummaryEl=document.getElementById('sports-xc-summary');
  var currentAthleticsTeamEvent=null;
  var crossCountryCourseFormEl=document.getElementById('cross-country-course-form');
  var crossCountryCourseNameEl=document.getElementById('cross-country-course-name');
  var crossCountryYearEl=document.getElementById('cross-country-year');
  var crossCountryDistanceEl=document.getElementById('cross-country-distance');
  var crossCountryNotesEl=document.getElementById('cross-country-notes');
  var crossCountryResultEl=document.getElementById('cross-country-result');
  var crossCountryCourseListEl=document.getElementById('cross-country-course-list');

  function renderInterschoolAthleticsEvents(){
    if(!interschoolAthleticsEventsEl){return;}
    var events=window.RunClubGoals.INTERSCHOOL_ATHLETICS_EVENTS||[];
    var groups={};
    events.forEach(function(event){
      if(!groups[event.group]){groups[event.group]=[];}
      groups[event.group].push(event);
    });
    interschoolAthleticsEventsEl.innerHTML=Object.keys(groups).map(function(group){
      return '<div class="athletics-event-group"><strong>'+escapeHtml(group)+'</strong><div>'+groups[group].map(function(event){
        var eventId=athleticsEventIdForName(event.name);
        var selected=athleticsSelectedCountForEvent(eventId,event);
        return '<button type="button" class="athletics-event-chip" data-athletics-event="'+escapeAttr(eventId)+'">'+escapeHtml(event.name)+' <small>'+escapeHtml(event.years)+' · '+selected+' selected</small></button>';
      }).join('')+'</div></div>';
    }).join('');
    Array.prototype.forEach.call(interschoolAthleticsEventsEl.querySelectorAll('[data-athletics-event]'),function(btn){
      btn.addEventListener('click',function(e){openAthleticsTeamModal(btn.dataset.athleticsEvent,e.currentTarget);});
    });
  }

  function athleticsEventIdForName(name){
    var normal=String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    var mapped={
      'junior-50m':'junior-50m',
      'intermediate-75m':'intermediate-75m',
      'senior-100m':'senior-100m',
      'junior-100m':'junior-100m',
      'intermediate-200m':'intermediate-200m',
      'senior-400m':'senior-400m',
      'vortex-throw':'vortex-throw'
    };
    return mapped[normal]||normal;
  }

  function athleticsTeamSelections(){
    var rows=load(ATHLETICS_TEAM_SELECTIONS_KEY,{});
    return rows&&typeof rows==='object'&&!Array.isArray(rows)?rows:{};
  }

  function saveAthleticsTeamSelections(rows){
    save(ATHLETICS_TEAM_SELECTIONS_KEY,rows);
  }

  function athleticsConsentSelections(){
    var rows=load(ATHLETICS_CONSENT_SELECTIONS_KEY,[]);
    return Array.isArray(rows)?rows:[];
  }

  function saveAthleticsConsentSelections(rows){
    save(ATHLETICS_CONSENT_SELECTIONS_KEY,Array.from(new Set(rows)));
  }

  function athleticsSelectedCountForEvent(eventId,event){
    var selections=athleticsTeamSelections();
    if(isBallGameEvent(event)){
      return ['Junior','Intermediate','Senior'].reduce(function(total,division){
        var rows=selections[athleticsTeamSelectionKey(eventId,division)]||[];
        return total+(Array.isArray(rows)?rows.length:0);
      },0);
    }
    var rows=selections[eventId]||[];
    return Array.isArray(rows)?rows.length:0;
  }

  function consentStatusForStudent(student){
    return String(student&&student.consent_status||'').toLowerCase();
  }

  function consentLabel(status){
    status=String(status||'').toLowerCase();
    if(status==='granted'){return 'Approved';}
    if(status==='declined'){return 'Declined';}
    if(status==='pending'){return 'Pending';}
    return 'Blank';
  }

  function consentBadgeClass(status){
    status=String(status||'').toLowerCase();
    if(status==='granted'){return 'privacy-badge privacy-badge--granted';}
    if(status==='declined'){return 'privacy-badge privacy-badge--declined';}
    return 'privacy-badge';
  }

  function athleticsTeamListRows(){
    var selections=athleticsTeamSelections();
    var students=getStudents();
    var studentMap={};
    students.forEach(function(student){studentMap[student.id]=student;});
    var leaders=eventBestRows();
    var rows=[];
    Object.keys(selections).forEach(function(key){
      var detail=eventFromSelectionKey(key);
      var event=detail.event;
      if(!event){return;}
      (Array.isArray(selections[key])?selections[key]:[]).forEach(function(studentId){
        var student=studentMap[studentId];
        if(!student){return;}
        var pb=studentPbForEvent(studentId,event.id);
        rows.push({
          student:student,
          event:event,
          division:detail.division||divisionForStudent(student),
          pb:pb,
          leader:leaders[event.id]&&leaders[event.id].student_id===studentId,
          consent_status:consentStatusForStudent(student)
        });
      });
    });
    return rows.sort(function(a,b){
      return String(a.division||'').localeCompare(String(b.division||''))||
        String(a.student.year||'').localeCompare(String(b.student.year||''))||
        String(a.student.cls||'').localeCompare(String(b.student.cls||''))||
        String(a.student.name||'').localeCompare(String(b.student.name||''))||
        String(a.event.name||'').localeCompare(String(b.event.name||''));
    });
  }

  function athleticsTeamCsvRows(){
    return athleticsTeamListRows().map(function(row){
      return {
        student:row.student.name,
        year:row.student.year,
        class:row.student.cls,
        division:row.division,
        event:row.event.name,
        pb:row.pb?resultDisplay(row.pb):'',
        leading:row.leader?'yes':'no',
        consent:consentLabel(row.consent_status)
      };
    });
  }

  function refreshSportsCommandSummary(){
    var students=getStudents();
    var consentCounts={granted:0,pending:0,declined:0,blank:0};
    students.forEach(function(student){
      var status=consentStatusForStudent(student);
      if(status==='granted'){consentCounts.granted+=1;}
      else if(status==='declined'){consentCounts.declined+=1;}
      else if(status==='pending'){consentCounts.pending+=1;}
      else {consentCounts.blank+=1;}
    });
    var teamRows=athleticsTeamListRows();
    var athleteIds={};
    teamRows.forEach(function(row){athleteIds[row.student.id]=true;});
    var results=athleticsResults();
    var pbCount=results.filter(function(row){return row.personal_best;}).length;
    var housePoints=results.reduce(function(total,row){return total+Number(row.points||0);},0);
    var xcCourses=crossCountryCourses();
    if(sportsChecklistSummaryEl){sportsChecklistSummaryEl.textContent=consentCounts.granted+' approved';}
    if(sportsEventsSummaryEl){sportsEventsSummaryEl.textContent=Object.keys(athleteIds).length+' athletes';}
    if(sportsResultsSummaryEl){sportsResultsSummaryEl.textContent=results.length+' saved';}
    if(sportsPbSummaryEl){sportsPbSummaryEl.textContent=pbCount+' PBs';}
    if(sportsHouseSummaryEl){sportsHouseSummaryEl.textContent=housePoints+' pts';}
    if(sportsXcSummaryEl){sportsXcSummaryEl.textContent=(isCrossCountryVisible()?'Shown':'Hidden')+' · '+xcCourses.length+' courses';}
  }

  function athleticsGoalEventById(eventId){
    var events=window.RunClubGoals.INTERSCHOOL_ATHLETICS_EVENTS||[];
    return events.find(function(event){return athleticsEventIdForName(event.name)===eventId;})||null;
  }

  function yearNumber(student){
    var match=String(student.year||'').match(/\d+/);
    return match?Number(match[0]):0;
  }

  function divisionForStudent(student){
    var year=yearNumber(student);
    if(year<=2){return 'Junior';}
    if(year<=4){return 'Intermediate';}
    return 'Senior';
  }

  function divisionsForEvent(event){
    if(event&&event.division){return [event.division];}
    var years=String(event&&event.years||'All');
    if(/Junior/i.test(years)&&!/Intermediate|Senior/i.test(years)){return ['Junior'];}
    if(/Intermediate/i.test(years)&&!/Junior|Senior/i.test(years)){return ['Intermediate'];}
    if(/Senior/i.test(years)&&!/Junior|Intermediate/i.test(years)){return ['Senior'];}
    return ['Junior','Intermediate','Senior'];
  }

  function athleticsEventDivisionById(eventId){
    var event=athleticsEventById(eventId);
    return event&&event.division?event.division:'';
  }

  function isBallGameEvent(event){
    return event&&event.group==='Ball Games';
  }

  function selectedDivisionForCurrentEvent(){
    if(!currentAthleticsTeamEvent){return '';}
    if(isBallGameEvent(currentAthleticsTeamEvent)){
      return document.getElementById('athletics-division-filter').value||'Junior';
    }
    var divisions=divisionsForEvent(currentAthleticsTeamEvent);
    return divisions.length===1?divisions[0]:'';
  }

  function athleticsTeamSelectionKey(eventId,division){
    var goalEvent=athleticsGoalEventById(eventId);
    if(isBallGameEvent(goalEvent||currentAthleticsTeamEvent)){
      return eventId+'-'+String(division||'Junior').toLowerCase();
    }
    return eventId;
  }

  function studentEligibleForAthleticsEvent(student,event,division){
    var studentDivision=divisionForStudent(student);
    var requiredDivision=division||athleticsEventDivisionById(event&&event.id);
    if(requiredDivision){return studentDivision===requiredDivision;}
    return divisionsForEvent(event).indexOf(studentDivision)!==-1;
  }

  function athleticsStudentSearchText(student){
    return [student.name,student.id,student.year,student.cls,student.house,student.team,student.pseudonym].join(' ').toLowerCase();
  }

  function selectedAthleticsTeamIds(eventId){
    var event=currentAthleticsTeamEvent||athleticsGoalEventById(eventId);
    var division=event&&isBallGameEvent(event)?selectedDivisionForCurrentEvent():'';
    var selectionKey=athleticsTeamSelectionKey(eventId,division);
    var rows=athleticsTeamSelections()[selectionKey]||[];
    if(!Array.isArray(rows)){return [];}
    var eligible={};
    getStudents().filter(function(student){
      return studentEligibleForAthleticsEvent(student,event,division);
    }).forEach(function(student){eligible[student.id]=true;});
    return rows.filter(function(studentId){return eligible[studentId];});
  }

  function renderAthleticsTeamModal(){
    if(!currentAthleticsTeamEvent||!athleticsTeamStudentListEl){return;}
    var event=currentAthleticsTeamEvent;
    var q=(athleticsTeamSearchEl&&athleticsTeamSearchEl.value||'').toLowerCase().trim();
    var division=selectedDivisionForCurrentEvent();
    var selected=selectedAthleticsTeamIds(event.id);
    var selectedMap={};
    selected.forEach(function(id){selectedMap[id]=true;});
    var eligible=getStudents().filter(function(student){
      return studentEligibleForAthleticsEvent(student,event,division);
    });
    var filtered=eligible.filter(function(student){
      return !q||athleticsStudentSearchText(student).includes(q);
    }).sort(function(a,b){
      return String(a.year||'').localeCompare(String(b.year||''))||String(a.cls||'').localeCompare(String(b.cls||''))||String(a.name||'').localeCompare(String(b.name||''));
    });
    if(athleticsTeamSummaryEl){
      var approvedShown=filtered.filter(function(student){return consentStatusForStudent(student)==='granted';}).length;
      athleticsTeamSummaryEl.innerHTML=
        '<span>'+selected.length+' selected</span>'+
        '<span>'+eligible.length+' eligible</span>'+
        '<span>'+filtered.length+' shown</span>'+
        '<span>'+approvedShown+' consent approved</span>';
    }
    if(athleticsEventModalStatusEl){
      var selectedStudents=eligible.filter(function(student){return selectedMap[student.id];});
      athleticsEventModalStatusEl.innerHTML=
        '<strong>'+escapeHtml(event.name)+'</strong>'+
        '<span>'+escapeHtml(division||'All divisions')+'</span>'+
        '<span>'+selectedStudents.length+' in this team</span>'+
        '<span>'+selectedStudents.filter(function(student){return consentStatusForStudent(student)==='granted';}).length+' approved</span>';
    }
    if(!eligible.length){
      athleticsTeamStudentListEl.innerHTML='<p class="empty-note">No students match this event division yet.</p>';
      return;
    }
    if(!filtered.length){
      athleticsTeamStudentListEl.innerHTML='<p class="empty-note">No eligible students match that search.</p>';
      return;
    }
    athleticsTeamStudentListEl.innerHTML=filtered.map(function(student){
      var checked=selectedMap[student.id]?' checked':'';
      var consentStatus=consentStatusForStudent(student);
      var pb=studentPbForEvent(student.id,event.id);
      var meta=[student.year,student.cls,divisionForStudent(student),student.house||student.team||'No house/team'].filter(Boolean).join(' · ');
      return '<label class="athletics-team-student-option">'+
        '<input type="checkbox" class="athletics-team-student-check" value="'+escapeAttr(student.id)+'"'+checked+' />'+
        '<span><strong>'+escapeHtml(student.name)+'</strong><small>'+escapeHtml(meta)+'</small></span>'+
        '<span class="athletics-team-row-meta">'+
          '<em class="'+consentBadgeClass(consentStatus)+'">'+consentLabel(consentStatus)+'</em>'+
          '<small>'+(pb?'PB '+escapeHtml(resultDisplay(pb)):'No PB yet')+'</small>'+
        '</span>'+
      '</label>';
    }).join('');
  }

  function openAthleticsTeamModal(eventId,trigger){
    var goalEvent=athleticsGoalEventById(eventId);
    currentAthleticsTeamEvent={
      id:eventId,
      name:goalEvent?goalEvent.name:athleticsEventById(eventId).name,
      group:goalEvent?goalEvent.group:athleticsEventById(eventId).category,
      years:goalEvent?goalEvent.years:'All',
      division:athleticsEventDivisionById(eventId)
    };
    var divisionLabel=document.getElementById('athletics-division-filter-label');
    var divisionSelect=document.getElementById('athletics-division-filter');
    if(divisionLabel&&divisionSelect){
      divisionLabel.hidden=!isBallGameEvent(currentAthleticsTeamEvent);
      if(!divisionSelect.value){divisionSelect.value='Junior';}
    }
    if(athleticsEventModalTitleEl){athleticsEventModalTitleEl.textContent=currentAthleticsTeamEvent.name+' Team';}
    if(athleticsEventModalSubtitleEl){athleticsEventModalSubtitleEl.textContent=currentAthleticsTeamEvent.group+' · Eligible: '+currentAthleticsTeamEvent.years+' · Showing eligible students only.';}
    if(athleticsTeamSearchEl){athleticsTeamSearchEl.value='';}
    if(athleticsTeamResultEl){athleticsTeamResultEl.hidden=true;}
    renderAthleticsTeamModal();
    openAdminModalAt(athleticsEventModalEl,trigger);
    if(athleticsTeamSearchEl){athleticsTeamSearchEl.focus();}
  }

  function closeAthleticsTeamModal(){
    closeAdminModal(athleticsEventModalEl);
    currentAthleticsTeamEvent=null;
  }

  function saveCurrentAthleticsTeam(){
    if(!currentAthleticsTeamEvent){return;}
    var rows=athleticsTeamSelections();
    var selected=Array.prototype.map.call(document.querySelectorAll('.athletics-team-student-check:checked'),function(input){return input.value;});
    var key=athleticsTeamSelectionKey(currentAthleticsTeamEvent.id,selectedDivisionForCurrentEvent());
    runLiveFeatureWrite('saveAthleticsTeamSelection',{
      event_id:key,
      student_ids:selected.filter(isUuid),
      metadata:{source_screen:'sports-tab',event_id:currentAthleticsTeamEvent.id,division:selectedDivisionForCurrentEvent(),local_student_ids:selected}
    },function(){
      rows[key]=selected;
      saveAthleticsTeamSelections(rows);
    },'Local athletics team selection blocked.').then(function(result){
      if(!result.ok){showResult(athleticsTeamResultEl,{success:false,error:result.error||result.reason||'Team save failed.'});return;}
      showResult(athleticsTeamResultEl,{success:true,message:'Team saved. The summary list has been updated.',event:currentAthleticsTeamEvent.name,selected_students:selected.length,backend:result.local?'local':'synced'});
      renderInterschoolAthleticsEvents();
      renderAthleticsTeamOverview();
      refreshSportsCommandSummary();
      renderAthleticsTeamModal();
    });
  }

  function eventFromSelectionKey(key){
    var eventId=String(key||'').replace(/-(junior|intermediate|senior)$/,'');
    var event=athleticsGoalEventById(eventId)||athleticsEventById(eventId);
    var divisionMatch=String(key||'').match(/-(junior|intermediate|senior)$/);
    return {event:event,division:divisionMatch?divisionMatch[1].replace(/^./,function(c){return c.toUpperCase();}):''};
  }

  function eventBestRows(){
    var leaders={};
    athleticsResults().forEach(function(row){
      var event=athleticsEventById(row.event_id);
      if(!leaders[row.event_id]||isBetterResult(row.result_number,leaders[row.event_id].result_number,event.measure)){
        leaders[row.event_id]=row;
      }
    });
    return leaders;
  }

  function studentPbForEvent(studentId,eventId){
    return bestResultFor(studentId,eventId);
  }

  function renderAthleticsTeamOverview(){
    var overview=document.getElementById('athletics-team-overview');
    if(!overview){return;}
    var byStudent={};
    athleticsTeamListRows().forEach(function(row){
      var id=row.student.id;
      if(!byStudent[id]){byStudent[id]={student:row.student,division:row.division,events:[],pbs:[],leaders:0,consent_status:row.consent_status};}
      byStudent[id].events.push({event:row.event,division:row.division,leader:row.leader});
      byStudent[id].pbs.push(row.pb?row.event.name+': '+resultDisplay(row.pb):row.event.name+': No PB');
      if(row.leader){byStudent[id].leaders+=1;}
    });
    var rows=Object.keys(byStudent).map(function(id){return byStudent[id];}).sort(function(a,b){
      return String(a.division||'').localeCompare(String(b.division||''))||
        String(a.student.year||'').localeCompare(String(b.student.year||''))||
        String(a.student.cls||'').localeCompare(String(b.student.cls||''))||
        String(a.student.name||'').localeCompare(String(b.student.name||''));
    });
    if(!rows.length){
      overview.innerHTML='<p class="empty-note">No interschool team selections saved yet. Open the consent checklist or an event below and tick students into their team.</p>';
      return;
    }
    overview.innerHTML='<div class="sports-team-table-wrap"><table class="progress-history-table sports-team-table">'+
      '<thead><tr><th>Student</th><th>Year</th><th>Class</th><th>Division</th><th>Events</th><th>PBs</th><th>Consent</th></tr></thead><tbody>'+
      rows.map(function(row){
        var status=row.consent_status;
        return '<tr>'+
          '<td><strong>'+escapeHtml(row.student.name)+'</strong>'+(row.leaders?'<span class="sports-leading-note">'+row.leaders+' leading</span>':'')+'</td>'+
          '<td>'+escapeHtml(row.student.year||'')+'</td>'+
          '<td>'+escapeHtml(row.student.cls||'')+'</td>'+
          '<td>'+escapeHtml(row.division||divisionForStudent(row.student))+'</td>'+
          '<td><div class="athletics-team-event-tags">'+row.events.map(function(item){
            var label=item.event.name+(item.division&&item.division!==row.division?' · '+item.division:'');
            return '<span class="'+(item.leader?'athletics-team-event-tag athletics-team-event-tag--leader':'athletics-team-event-tag')+'">'+escapeHtml(label)+'</span>';
          }).join('')+'</div></td>'+
          '<td>'+row.pbs.map(function(label){return '<small class="sports-pb-line">'+escapeHtml(label)+'</small>';}).join('')+'</td>'+
          '<td><span class="'+consentBadgeClass(status)+'">'+consentLabel(status)+'</span></td>'+
        '</tr>';
      }).join('')+'</tbody></table></div>';
  }

  function renderAthleticsConsentSummary(){
    if(!athleticsConsentSummaryEl){return;}
    var students=getStudents();
    var counts={granted:0,pending:0,declined:0};
    students.forEach(function(student){
      var status=String(student.consent_status||'pending').toLowerCase();
      if(status==='granted'){counts.granted+=1;}
      else if(status==='declined'){counts.declined+=1;}
      else {counts.pending+=1;}
    });
    var followUp=students.filter(function(student){
      return String(student.consent_status||'pending').toLowerCase()!=='granted';
    });
    athleticsConsentSummaryEl.innerHTML=
      '<div class="athletics-consent-head">'+
        '<div><strong>Team Checklist</strong><span>Consent is tracked once for the interschool team, then shown beside every event selection.</span></div>'+
        '<button type="button" id="open-athletics-consent-modal-btn" class="secondary athletics-consent-open-btn">Manage consent</button>'+
      '</div>'+
      '<div class="athletics-consent-counts">'+
        '<span class="privacy-badge privacy-badge--granted">Athletics consent: '+counts.granted+' approved</span>'+
        '<span class="privacy-badge">Not returned: '+(counts.pending+counts.declined)+'</span>'+
        '<span class="privacy-badge privacy-badge--declined">Declined: '+counts.declined+'</span>'+
      '</div>'+
      (followUp.length?'<p>Follow up: '+followUp.slice(0,6).map(function(student){return escapeHtml(student.name);}).join(', ')+'</p>':'<p>All listed students have athletics consent ticked.</p>');
    var openBtn=document.getElementById('open-athletics-consent-modal-btn');
    if(openBtn){openBtn.addEventListener('click',function(e){openAthleticsConsentModal(e.currentTarget);});}
    refreshSportsCommandSummary();
  }

  function renderAthleticsConsentList(){
    if(!athleticsConsentListEl){return;}
    var selectedMap={};
    athleticsConsentSelections().forEach(function(id){selectedMap[id]=true;});
    var students=getStudents().slice().sort(function(a,b){
      return String(a.year||'').localeCompare(String(b.year||''))||String(a.cls||'').localeCompare(String(b.cls||''))||String(a.name||'').localeCompare(String(b.name||''));
    });
    athleticsConsentListEl.innerHTML=students.map(function(student){
      var status=String(student.consent_status||'').toLowerCase();
      var meta=[student.id,student.year,student.cls,divisionForStudent(student)].filter(Boolean).join(' · ');
      return '<label class="athletics-consent-option">'+
        '<input type="checkbox" class="athletics-consent-select-check" data-student-id="'+escapeAttr(student.id)+'"'+(selectedMap[student.id]?' checked':'')+' />'+
        '<span><strong>'+escapeHtml(student.name)+'</strong><small>'+escapeHtml(meta)+'</small></span>'+
        '<select class="athletics-consent-status-select athletics-consent-status-select--'+escapeAttr(status||'blank')+'" data-student-id="'+escapeAttr(student.id)+'" aria-label="Athletics consent status for '+escapeAttr(student.name)+'">'+
          '<option value=""'+(!status?' selected':'')+'></option>'+
          '<option value="pending"'+(status==='pending'?' selected':'')+'>Pending</option>'+
          '<option value="granted"'+(status==='granted'?' selected':'')+'>Approved</option>'+
          '<option value="declined"'+(status==='declined'?' selected':'')+'>Declined</option>'+
        '</select>'+
      '</label>';
    }).join('');
    Array.prototype.forEach.call(athleticsConsentListEl.querySelectorAll('.athletics-consent-status-select'),function(select){
      select.addEventListener('change',function(){
        select.className='athletics-consent-status-select athletics-consent-status-select--'+(select.value||'blank');
      });
    });
  }

  function openAthleticsConsentModal(trigger){
    renderAthleticsConsentList();
    openAdminModalAt(athleticsConsentModalEl,trigger);
  }

  function closeAthleticsConsentModal(){
    closeAdminModal(athleticsConsentModalEl);
  }

  function saveAthleticsConsentChecklist(){
    var selected=Array.prototype.map.call(document.querySelectorAll('.athletics-consent-select-check:checked'),function(input){return input.dataset.studentId;});
    var statuses={};
    Array.prototype.forEach.call(document.querySelectorAll('.athletics-consent-status-select'),function(input){statuses[input.dataset.studentId]=input.value;});
    var students=getStudents().map(function(student){
      if(!Object.prototype.hasOwnProperty.call(statuses,student.id)){return student;}
      return Object.assign({},student,{consent_status:statuses[student.id]});
    });
    var changed=getStudents().filter(function(student){return Object.prototype.hasOwnProperty.call(statuses,student.id);});
    var guard=liveRosterGuard();
    if(!guard.ok){showResult(athleticsTeamResultEl,{success:false,error:guard.message||'Local athletics consent blocked.'});return;}
    var access=window.RunClubBackend&&window.RunClubBackend.backendDataAccess;
    var writes=(guard.live&&access&&access.setAthleticsConsentStatus)?changed.map(function(student){
      return access.setAthleticsConsentStatus({
        student_id:isUuid(student.id)?student.id:null,
        barcode:student.barcode||student.id,
        status:statuses[student.id]||'pending',
        metadata:{source_screen:'sports-tab'}
      });
    }):[Promise.resolve({ok:true,local:true})];
    Promise.all(writes).then(function(results){
      var failed=results.find(function(result){return !result.ok;});
      if(failed){showResult(athleticsTeamResultEl,{success:false,error:failed.error||failed.reason||'Consent save failed.'});return;}
      saveStudents(students);
      saveAthleticsConsentSelections(selected);
      renderAthleticsConsentSummary();
      renderAthleticsConsentList();
      renderAthleticsTeamOverview();
      refreshSportsCommandSummary();
      closeAthleticsConsentModal();
      showResult(athleticsTeamResultEl,{success:true,message:'Athletics consent checklist saved.',students:changed.length,backend:guard.live?'synced':'local'});
    });
  }

  function setStudentAthleticsConsent(studentId,granted){
    var updated=null;
    var students=getStudents().map(function(student){
      if(student.id!==studentId){return student;}
      updated=Object.assign({},student,{consent_status:granted?'granted':'pending'});
      return updated;
    });
    runLiveFeatureWrite('setAthleticsConsentStatus',{
      student_id:updated&&isUuid(updated.id)?updated.id:null,
      barcode:updated&&(updated.barcode||updated.id),
      status:updated?updated.consent_status:'pending',
      metadata:{source_screen:'sports-tab'}
    },function(){
      saveStudents(students);
    },'Local athletics consent blocked.').then(function(result){
      if(!result.ok){showResult(athleticsTeamResultEl,{success:false,error:result.error||result.reason||'Consent save failed.'});return;}
      renderAthleticsConsentSummary();
      renderAthleticsConsentList();
      renderAthleticsTeamOverview();
      refreshSportsCommandSummary();
    });
  }

  interschoolAthleticsModeEl.checked=window.RunClubGoals.isInterschoolAthleticsMode();
  function renderAthleticsModeState(){
    var enabled=!!interschoolAthleticsModeEl.checked;
    if(athleticsModeShellEl){athleticsModeShellEl.classList.toggle('athletics-mode-shell--active',enabled);}
    if(athleticsModePanelEl){athleticsModePanelEl.hidden=!enabled;}
    if(athleticsModeStateEl){athleticsModeStateEl.textContent=enabled?'On - Team planner open':'Off - Run Club goals only';}
    if(enabled){
      renderInterschoolAthleticsEvents();
      renderAthleticsConsentSummary();
      renderAthleticsTeamOverview();
      refreshSportsCommandSummary();
    }
  }
  interschoolAthleticsModeEl.addEventListener('change',function(){
    window.RunClubGoals.setInterschoolAthleticsMode(interschoolAthleticsModeEl.checked);
    renderAthleticsModeState();
  });
  if(athleticsTeamSearchEl){
    athleticsTeamSearchEl.addEventListener('input',renderAthleticsTeamModal);
  }
  var athleticsDivisionFilterEl=document.getElementById('athletics-division-filter');
  if(athleticsDivisionFilterEl){
    athleticsDivisionFilterEl.addEventListener('change',renderAthleticsTeamModal);
  }
  var toggleAthleticsTeamOverviewBtn=document.getElementById('toggle-athletics-team-overview-btn');
  if(toggleAthleticsTeamOverviewBtn){
    toggleAthleticsTeamOverviewBtn.addEventListener('click',function(){
      var overview=document.getElementById('athletics-team-overview');
      if(!overview){return;}
      overview.hidden=!overview.hidden;
      toggleAthleticsTeamOverviewBtn.textContent=overview.hidden?'Show team list':'Hide team list';
      if(!overview.hidden){renderAthleticsTeamOverview();}
    });
  }
  var openSportsConsentBtn=document.getElementById('open-sports-consent-btn');
  if(openSportsConsentBtn){
    openSportsConsentBtn.addEventListener('click',function(e){openAthleticsConsentModal(e.currentTarget);});
  }
  function exportAthleticsTeamListCsv(){
    dlCsv('interschool-team-list-'+new Date().toISOString().slice(0,10)+'.csv',athleticsTeamCsvRows(),['student','year','class','division','event','pb','leading','consent']);
    showResult(athleticsTeamResultEl,{success:true,message:'Team list CSV exported.'});
  }
  function printAthleticsTeamList(){
    var rows=athleticsTeamCsvRows();
    if(!rows.length){showResult(athleticsTeamResultEl,{success:false,error:'No team selections to print yet.'});return;}
    printWindow('Interschool Team List','<h1>Gwynne Park Run Club - Interschool Team List</h1>'+reportRowsTable(rows,[{key:'student',label:'Student'},{key:'year',label:'Year'},{key:'class',label:'Class'},{key:'division',label:'Division'},{key:'event',label:'Event'},{key:'pb',label:'PB'},{key:'consent',label:'Consent'}]));
  }
  var exportAthleticsTeamListBtn=document.getElementById('export-athletics-team-list-btn');
  if(exportAthleticsTeamListBtn){exportAthleticsTeamListBtn.addEventListener('click',exportAthleticsTeamListCsv);}
  var printAthleticsTeamListBtn=document.getElementById('print-athletics-team-list-btn');
  if(printAthleticsTeamListBtn){printAthleticsTeamListBtn.addEventListener('click',printAthleticsTeamList);}
  document.getElementById('close-athletics-event-modal-btn').addEventListener('click',closeAthleticsTeamModal);
  document.getElementById('cancel-athletics-team-btn').addEventListener('click',closeAthleticsTeamModal);
  document.getElementById('save-athletics-team-btn').addEventListener('click',saveCurrentAthleticsTeam);
  athleticsEventModalEl.addEventListener('click',function(e){
    if(e.target===athleticsEventModalEl){closeAthleticsTeamModal();}
  });
  document.getElementById('close-athletics-consent-modal-btn').addEventListener('click',closeAthleticsConsentModal);
  document.getElementById('cancel-athletics-consent-modal-btn').addEventListener('click',closeAthleticsConsentModal);
  document.getElementById('save-athletics-consent-list-btn').addEventListener('click',saveAthleticsConsentChecklist);
  athleticsConsentModalEl.addEventListener('click',function(e){
    if(e.target===athleticsConsentModalEl){closeAthleticsConsentModal();}
  });
  renderInterschoolAthleticsEvents();
  renderAthleticsConsentSummary();
  renderAthleticsTeamOverview();
  renderAthleticsModeState();

  function crossCountryCourses(){
    return load(CROSS_COUNTRY_COURSES_KEY,[]);
  }

  function isCrossCountryVisible(){
    return load(CROSS_COUNTRY_VISIBLE_KEY,false)===true;
  }

  function setCrossCountryVisible(enabled){
    save(CROSS_COUNTRY_VISIBLE_KEY,enabled===true);
  }

  function renderCrossCountryVisibility(){
    var toggle=document.getElementById('cross-country-visible-toggle');
    var panel=document.getElementById('cross-country-course-panel');
    var state=document.getElementById('cross-country-visible-state');
    var visible=isCrossCountryVisible();
    if(toggle){toggle.checked=visible;}
    if(panel){panel.hidden=!visible;}
    if(state){state.textContent=visible?'Shown':'Hidden';}
  }

  function saveCrossCountryCourses(courses){
    save(CROSS_COUNTRY_COURSES_KEY,courses);
  }

  function deleteCrossCountryCourse(courseId){
    var course=crossCountryCourses().find(function(row){return row.id===courseId;});
    if(!course){return;}
    if(!confirm('Remove '+course.name+' from Cross Country courses?')){return;}
    saveCrossCountryCourses(crossCountryCourses().filter(function(row){return row.id!==courseId;}));
    showResult(crossCountryResultEl,{success:true,message:'Cross Country course removed.',course:course.name});
    renderCrossCountryCourses();
    refreshSportsCommandSummary();
  }

  function renderCrossCountryCourses(){
    if(!crossCountryCourseListEl){return;}
    var courses=crossCountryCourses();
    if(!courses.length){
      crossCountryCourseListEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No Cross Country courses saved yet.</p>';
      return;
    }
    crossCountryCourseListEl.innerHTML=courses.slice().reverse().map(function(course){
      return '<div class="training-card">'+
        '<div class="training-card-head"><strong>'+escapeHtml(course.name)+'</strong><span class="training-status-pill">'+Number(course.distance_m).toLocaleString()+' m</span></div>'+
        '<p>'+escapeHtml(course.year_group)+' course'+(course.notes?' - '+escapeHtml(course.notes):'')+'</p>'+
        '<div class="training-actions"><button type="button" class="secondary delete-cross-country-course" data-course-id="'+escapeAttr(course.id)+'">Delete</button></div>'+
      '</div>';
    }).join('');
    document.querySelectorAll('.delete-cross-country-course').forEach(function(btn){
      btn.addEventListener('click',function(){deleteCrossCountryCourse(btn.dataset.courseId);});
    });
  }

  function createCrossCountryCourse(e){
    e.preventDefault();
    var name=crossCountryCourseNameEl.value.trim();
    var distance=Number(crossCountryDistanceEl.value);
    if(!name||!isFinite(distance)||distance<=0){
      showResult(crossCountryResultEl,{success:false,error:'Enter a course name and valid distance.'});
      return;
    }
    var course={
      id:'cross-country-'+Date.now(),
      name:name,
      year_group:crossCountryYearEl.value||'Whole school',
      distance_m:Math.round(distance),
      notes:crossCountryNotesEl.value.trim(),
      created_at:new Date().toISOString(),
      created_by:session.email
    };
    var courses=crossCountryCourses();
    runLiveFeatureWrite('saveCrossCountryCourse',{
      id:course.id,
      name:course.name,
      distance_m:course.distance_m,
      division:course.year_group,
      active:true,
      metadata:{source_screen:'sports-tab',notes:course.notes}
    },function(){
      courses.push(course);
      saveCrossCountryCourses(courses);
    },'Local Cross Country course blocked.').then(function(result){
      if(!result.ok){showResult(crossCountryResultEl,{success:false,error:result.error||result.reason||'Cross Country course save failed.'});return;}
      crossCountryCourseFormEl.reset();
      showResult(crossCountryResultEl,{success:true,message:'Cross Country course saved.',course:course,backend:result.local?'local':'synced'});
      renderCrossCountryCourses();
      refreshSportsCommandSummary();
    });
  }

  if(crossCountryCourseFormEl){
    var crossCountryVisibleToggleEl=document.getElementById('cross-country-visible-toggle');
    if(crossCountryVisibleToggleEl){
      crossCountryVisibleToggleEl.addEventListener('change',function(){
        setCrossCountryVisible(crossCountryVisibleToggleEl.checked);
        renderCrossCountryVisibility();
        refreshSportsCommandSummary();
      });
    }
    crossCountryCourseFormEl.addEventListener('submit',createCrossCountryCourse);
    renderCrossCountryVisibility();
    renderCrossCountryCourses();
  }

  var athleticsResultFormEl=document.getElementById('athletics-result-form');
  var athleticsResultStudentEl=document.getElementById('athletics-result-student');
  var athleticsEventSelectEl=document.getElementById('athletics-event-select');
  var athleticsResultValueEl=document.getElementById('athletics-result-value');
  var athleticsResultHouseEl=document.getElementById('athletics-result-house');
  var athleticsResultPlaceEl=document.getElementById('athletics-result-place');
  var fieldAttempt1El=document.getElementById('field-attempt-1');
  var fieldAttempt2El=document.getElementById('field-attempt-2');
  var fieldAttempt3El=document.getElementById('field-attempt-3');
  var athleticsResultOutputEl=document.getElementById('athletics-result-output');
  var pbSummaryListEl=document.getElementById('pb-summary-list');
  var ageChampionListEl=document.getElementById('age-champion-list');
  var housePointsListEl=document.getElementById('house-points-list');

  function athleticsResults(){ return load(ATHLETICS_RESULTS_KEY,[]); }
  function saveAthleticsResults(rows){ save(ATHLETICS_RESULTS_KEY,rows); }
  function athleticsEventById(eventId){ return ATHLETICS_EVENT_OPTIONS.find(function(event){return event.id===eventId;})||ATHLETICS_EVENT_OPTIONS[0]; }

  function resultNumber(value){
    var raw=String(value||'').trim();
    if(raw.indexOf(':')>-1){
      var parts=raw.split(':').map(function(part){return Number(part);});
      if(parts.length===2&&isFinite(parts[0])&&isFinite(parts[1])){return parts[0]*60+parts[1];}
      if(parts.length===3&&isFinite(parts[0])&&isFinite(parts[1])&&isFinite(parts[2])){return parts[0]*3600+parts[1]*60+parts[2];}
    }
    var numeric=Number(raw.replace(/[^\d.-]/g,''));
    return isFinite(numeric)?numeric:null;
  }

  function resultDisplay(row){
    if(row.measure==='time'){return row.result_value+' sec';}
    if(row.measure==='distance'){return row.result_value+' m';}
    return row.result_value+' pts';
  }

  function isBetterResult(a,b,measure){
    if(!b){return true;}
    if(measure==='time'){return Number(a)<Number(b);}
    return Number(a)>Number(b);
  }

  function bestResultFor(studentId,eventId,excludeId){
    var event=athleticsEventById(eventId);
    var rows=athleticsResults().filter(function(row){return row.student_id===studentId&&row.event_id===eventId&&row.id!==excludeId;});
    return rows.reduce(function(best,row){
      return isBetterResult(row.result_number,best?best.result_number:null,event.measure)?row:best;
    },null);
  }

  function isPersonalBest(result){
    var previous=bestResultFor(result.student_id,result.event_id,result.id);
    return isBetterResult(result.result_number,previous?previous.result_number:null,result.measure);
  }

  function housePointsForPlace(place){
    return ({1:10,2:8,3:6,4:4,5:2,6:1})[Number(place)]||0;
  }

  function populateAthleticsResultStudents(){
    if(!athleticsResultStudentEl){return;}
    var selected=athleticsResultStudentEl.value;
    var event=athleticsEventById(athleticsEventSelectEl&&athleticsEventSelectEl.value);
    var eligible=getStudents().filter(function(student){return studentEligibleForAthleticsEvent(student,event,'');});
    athleticsResultStudentEl.innerHTML='';
    eligible.forEach(function(s){
      var o=document.createElement('option');o.value=s.id;o.textContent=s.name+' ('+s.year+', '+s.cls+')';athleticsResultStudentEl.appendChild(o);
    });
    if(selected&&eligible.some(function(s){return s.id===selected;})){athleticsResultStudentEl.value=selected;}
  }

  function populateAthleticsEvents(){
    if(!athleticsEventSelectEl){return;}
    athleticsEventSelectEl.innerHTML=ATHLETICS_EVENT_OPTIONS.map(function(event){
      return '<option value="'+escapeAttr(event.id)+'">'+escapeHtml(event.name)+' - '+escapeHtml(event.category)+'</option>';
    }).join('');
  }

  function createAthleticsResult(e){
    e.preventDefault();
    var student=getStudents().find(function(s){return s.id===athleticsResultStudentEl.value;});
    var event=athleticsEventById(athleticsEventSelectEl.value);
    var numeric=resultNumber(athleticsResultValueEl.value);
    if(!student||numeric==null){showResult(athleticsResultOutputEl,{success:false,error:'Choose a student and enter a valid result.'});return;}
    if(!studentEligibleForAthleticsEvent(student,event,'')){showResult(athleticsResultOutputEl,{success:false,error:student.name+' is not eligible for '+event.name+'. Choose a student from the correct division.'});return;}
    var attempts=[fieldAttempt1El.value,fieldAttempt2El.value,fieldAttempt3El.value].map(function(value){return String(value||'').trim();}).filter(Boolean);
    var row={
      id:'athletics-result-'+Date.now(),
      student_id:student.id,
      student_name:student.name,
      year:student.year,
      class_name:student.cls,
      house:athleticsResultHouseEl.value.trim()||student.house||student.team||'Unassigned',
      event_id:event.id,
      event_name:event.name,
      event_category:event.category,
      measure:event.measure,
      result_value:athleticsResultValueEl.value.trim(),
      result_number:numeric,
      attempts:attempts,
      place:athleticsResultPlaceEl.value,
      points:housePointsForPlace(athleticsResultPlaceEl.value),
      date:new Date().toISOString().slice(0,10),
      created_at:new Date().toISOString(),
      created_by:session.email
    };
    row.personal_best=isPersonalBest(row);
    var rows=athleticsResults();
    runLiveFeatureWrite('recordAthleticsResult',{
      student_id:isUuid(student.id)?student.id:null,
      event_id:row.event_id,
      event_name:row.event_name,
      event_category:row.event_category,
      measure:row.measure,
      result_value:row.result_value,
      result_number:row.result_number,
      house:row.house,
      place:row.place,
      points:row.points,
      personal_best:row.personal_best,
      date:row.date,
      metadata:{source_screen:'sports-tab',attempts:attempts,local_student_id:student.id,barcode:student.barcode||student.id}
    },function(){
      rows.push(row);
      saveAthleticsResults(rows);
    },'Local athletics result blocked.').then(function(result){
      if(!result.ok){showResult(athleticsResultOutputEl,{success:false,error:result.error||result.reason||'Result save failed.'});return;}
      showResult(athleticsResultOutputEl,{success:true,message:row.personal_best?'Result saved - new PB.':'Result saved.',result:row,backend:result.local?'local':'synced'});
      athleticsResultFormEl.reset();
      populateAthleticsEvents();
      renderPBTracking();
      renderAgeChampionScoring();
      renderHousePoints();
      renderAthleticsTeamOverview();
      refreshSportsCommandSummary();
    });
  }

  function renderPBTracking(){
    if(!pbSummaryListEl){return;}
    var rows=athleticsResults().filter(function(row){return row.personal_best;}).slice().reverse().slice(0,12);
    if(!rows.length){pbSummaryListEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No PBs recorded yet.</p>';return;}
    pbSummaryListEl.innerHTML='<table class="progress-history-table"><thead><tr><th>Student</th><th>Event</th><th>PB</th></tr></thead><tbody>'+
      rows.map(function(row){return '<tr><td>'+escapeHtml(row.student_name)+'</td><td>'+escapeHtml(row.event_name)+'</td><td>'+escapeHtml(resultDisplay(row))+'</td></tr>';}).join('')+
      '</tbody></table>';
  }

  function renderAgeChampionScoring(){
    if(!ageChampionListEl){return;}
    var scores={};
    athleticsResults().forEach(function(row){
      var key=row.year+'|'+row.student_id;
      if(!scores[key]){scores[key]={year:row.year,student:row.student_name,points:0,pbs:0};}
      scores[key].points+=Number(row.points||0);
      if(row.personal_best){scores[key].pbs+=1;}
    });
    var rows=Object.keys(scores).map(function(key){return scores[key];}).sort(function(a,b){return b.points-a.points||b.pbs-a.pbs;}).slice(0,12);
    if(!rows.length){ageChampionListEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No scoring results yet.</p>';return;}
    ageChampionListEl.innerHTML='<table class="progress-history-table"><thead><tr><th>Year</th><th>Student</th><th>Points</th><th>PBs</th></tr></thead><tbody>'+
      rows.map(function(row){return '<tr><td>'+escapeHtml(row.year)+'</td><td>'+escapeHtml(row.student)+'</td><td>'+row.points+'</td><td>'+row.pbs+'</td></tr>';}).join('')+
      '</tbody></table>';
  }

  function renderHousePoints(){
    if(!housePointsListEl){return;}
    var points={};
    athleticsResults().forEach(function(row){points[row.house]=(points[row.house]||0)+Number(row.points||0);});
    var rows=Object.keys(points).map(function(house){return {house:house,points:points[house]};}).sort(function(a,b){return b.points-a.points;});
    if(!rows.length){housePointsListEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No house points recorded yet.</p>';return;}
    housePointsListEl.innerHTML='<table class="progress-history-table"><thead><tr><th>House</th><th>Points</th></tr></thead><tbody>'+
      rows.map(function(row){return '<tr><td>'+escapeHtml(row.house)+'</td><td>'+row.points+'</td></tr>';}).join('')+
      '</tbody></table>';
  }

  if(athleticsResultFormEl){
    populateAthleticsEvents();
    populateAthleticsResultStudents();
    if(athleticsEventSelectEl){athleticsEventSelectEl.addEventListener('change',populateAthleticsResultStudents);}
    athleticsResultFormEl.addEventListener('submit',createAthleticsResult);
    renderPBTracking();
    renderAgeChampionScoring();
    renderHousePoints();
  }

  // === LEADERBOARD ===
  var lbYearEl=document.getElementById('lb-year-filter');
  var lbClassEl=document.getElementById('lb-class-filter');
  var lbMedalEl=document.getElementById('lb-medal-filter');
  var lbTableEl=document.getElementById('leaderboard-table');

  function populateLbFilters(){
    var students=getStudents();
    var years=[...new Set(students.map(function(s){return s.year;}))].sort();
    var classes=[...new Set(students.map(function(s){return s.cls;}))].sort();
    lbYearEl.innerHTML='<option value="">All years</option>';
    years.forEach(function(y){var o=document.createElement('option');o.value=y;o.textContent=y;lbYearEl.appendChild(o);});
    lbClassEl.innerHTML='<option value="">All classes</option>';
    classes.forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;lbClassEl.appendChild(o);});
    lbMedalEl.innerHTML='<option value="">All medals</option>';
    MEDAL_TIERS.forEach(function(m){var o=document.createElement('option');o.value=m.name;o.textContent=m.name;lbMedalEl.appendChild(o);});
  }
  populateLbFilters();

  function renderLeaderboard(){
    var students=getStudents();
    var year=lbYearEl.value; var cls=lbClassEl.value; var medal=lbMedalEl.value;
    if(year) students=students.filter(function(s){return s.year===year;});
    if(cls) students=students.filter(function(s){return s.cls===cls;});
    if(medal) students=students.filter(function(s){return medalFor(s).name===medal;});
    var sorted=students.slice().sort(function(a,b){return totalKm(b)-totalKm(a);});
    if(!sorted.length){lbTableEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No students match filter.</p>';return;}
    var html='<table style="width:100%;border-collapse:collapse;font-size:0.85rem;">';
    html+='<thead><tr style="background:#f4f6fb;"><th style="padding:0.4rem 0.5rem;text-align:left;">Rank</th><th>Name</th><th>Year</th><th>Class</th><th>Laps</th><th>Km</th><th>Medal</th></tr></thead><tbody>';
    sorted.forEach(function(s,i){
      html+='<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:0.4rem 0.5rem;">'+( i+1)+'</td><td>'+s.name+'</td><td>'+s.year+'</td><td>'+s.cls+'</td><td>'+s.laps+'</td><td>'+totalKm(s).toFixed(2)+'</td><td>'+medalBadge(s)+'</td></tr>';
    });
    html+='</tbody></table>';
    lbTableEl.innerHTML=html;
  }
  renderLeaderboard();
  lbYearEl.addEventListener('change',renderLeaderboard);
  lbClassEl.addEventListener('change',renderLeaderboard);
  lbMedalEl.addEventListener('change',renderLeaderboard);

  function printLeaderboardPoster(){
    var sorted=getStudents().slice().sort(function(a,b){return totalKm(b)-totalKm(a);}).slice(0,20);
    var win=window.open('','_blank');
    var html='<html><head><title>Run Club Leaderboard Poster</title><style>body{font-family:Arial,sans-serif;padding:2rem;color:#111827;} h1{text-align:center;color:#0c5aa8;font-size:2.4rem;} table{width:100%;border-collapse:collapse;font-size:1.4rem;} th,td{padding:0.7rem;border-bottom:2px solid #e5e7eb;text-align:left;} .rank{font-weight:800;color:#0c5aa8;} @media print{@page{margin:1cm;}}</style></head><body>';
    html+='<h1>Run Club Leaderboard</h1><table><thead><tr><th>Rank</th><th>Student</th><th>Class</th><th>Distance</th><th>Medal</th></tr></thead><tbody>';
    sorted.forEach(function(s,i){html+='<tr><td class="rank">#'+(i+1)+'</td><td>'+s.name+'</td><td>'+s.cls+'</td><td>'+totalKm(s).toFixed(2)+' km</td><td>'+medalFor(s).name+'</td></tr>';});
    html+='</tbody></table></body></html>';
    win.document.write(html); win.document.close(); win.print();
  }
  document.getElementById('print-leaderboard-btn').addEventListener('click',printLeaderboardPoster);

  // === ACTIVITY ===
  var actStudentEl=document.getElementById('activity-student');
  var actTypeEl=document.getElementById('activity-type');
  var actMinsEl=document.getElementById('activity-minutes');
  var actResultEl=document.getElementById('activity-result');
  var actLogListEl=document.getElementById('activity-log-list');

  function populateActivityStudents(){
    actStudentEl.innerHTML='';
    getStudents().forEach(function(s){
      var o=document.createElement('option');o.value=s.id;o.textContent=s.name+' ('+s.year+')';actStudentEl.appendChild(o);
    });
  }
  populateActivityStudents();

  function renderActivityLog(){
    var logs=load(K.activity,[]);
    if(!logs.length){actLogListEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No activity logged yet.</p>';return;}
    var html='<ul style="padding:0;list-style:none;margin:0;">';
    logs.slice().reverse().slice(0,20).forEach(function(l){
      html+='<li style="padding:0.4rem 0;border-bottom:1px solid #f0f0f0;font-size:0.82rem;">'+l.student_name+' – '+l.activity_type+' – '+l.minutes+' min ('+(minutesToKm(l.minutes)).toFixed(2)+' km) – '+l.date+'</li>';
    });
    html+='</ul>';
    actLogListEl.innerHTML=html;
  }
  renderActivityLog();

  function saveActivityCreditWithBackend(student, record){
    var guard=liveRosterGuard();
    if(!guard.ok){return Promise.resolve({ok:false,blocked:true,error:guard.message||'Local activity credit blocked.'});}
    if(guard.live&&window.RunClubBackend&&window.RunClubBackend.backendDataAccess&&window.RunClubBackend.backendDataAccess.recordActivityCredit){
      return window.RunClubBackend.backendDataAccess.recordActivityCredit({
        student_id:isUuid(student.id)?student.id:null,
        barcode:student.barcode||student.id,
        activity_type:record.activity_type,
        minutes:record.minutes,
        km_credit:Number(record.km||0),
        date:record.date,
        staff:session.email||'admin',
        metadata:{source_screen:'admin-dashboard',local_record_id:record.id,student_name:student.name}
      });
    }
    return Promise.resolve({ok:true,local:true});
  }

  document.getElementById('log-activity-btn').addEventListener('click',function(){
    var studentId=actStudentEl.value;
    var student=getStudents().find(function(s){return s.id===studentId;});
    var type=actTypeEl.value.trim()||'General';
    var mins=Number(actMinsEl.value||'0');
    if(!student||mins<=0){showResult(actResultEl,{success:false,error:'Choose a student and enter valid minutes.'});return;}
    var logs=load(K.activity,[]);
    var record={id:'act-'+Date.now(),student_id:studentId,student_name:student.name,activity_type:type,minutes:mins,km:minutesToKm(mins).toFixed(2),date:new Date().toISOString().slice(0,10)};
    saveActivityCreditWithBackend(student,record).then(function(result){
      if(!result.ok){showResult(actResultEl,{success:false,error:result.error||result.reason||'Local activity credit blocked.'});return;}
      logs.push(record);
      save(K.activity,logs);
      // Also add to student minutes
      var students=getStudents();
      var st=students.find(function(s){return s.id===studentId;});
      if(st){st.minutes=(st.minutes||0)+mins; saveStudents(students);}
      showResult(actResultEl,{success:true,message:'Activity logged.',student:student.name,minutes:mins,km_credit:minutesToKm(mins).toFixed(2)});
      renderActivityLog(); renderLeaderboard(); renderMedals(); renderCertificates(); renderSchoolSummary(); renderReportSummaries();
      actMinsEl.value='';
    });
  });

  // === EVENTS ===
  var eventResultEl=document.getElementById('event-result');
  var eventsListEl=document.getElementById('events-list');

  function renderEvents(){
    var events=load(K.events,[]);
    if(!events.length){eventsListEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No events created yet.</p>';return;}
    var html='<ul style="padding:0;list-style:none;margin:0;">';
    events.slice().reverse().forEach(function(e){
      html+='<li style="padding:0.4rem 0;border-bottom:1px solid #f0f0f0;font-size:0.85rem;"><strong>'+e.name+'</strong> – '+e.type+' – '+e.date+'</li>';
    });
    html+='</ul>';
    eventsListEl.innerHTML=html;
  }
  renderEvents();

  document.getElementById('create-event-btn').addEventListener('click',function(){
    var name=document.getElementById('event-name').value.trim();
    var type=document.getElementById('event-type').value;
    var date=document.getElementById('event-date').value||new Date().toISOString().slice(0,10);
    if(!name){showResult(eventResultEl,{success:false,error:'Enter an event name.'});return;}
    var events=load(K.events,[]);
    events.push({id:'event-'+Date.now(),name:name,type:type,date:date});
    save(K.events,events);
    showResult(eventResultEl,{success:true,message:'Event created: '+name});
    renderEvents();
    document.getElementById('event-name').value='';
  });

  // === AWARDS ===
  var awardsDisplayEl=document.getElementById('awards-display');
  var medalRulesEl=document.getElementById('medal-rules');
  var medalSummaryEl=document.getElementById('medal-summary');
  var certificatesListEl=document.getElementById('certificates-list');
  var customAwardsListEl=document.getElementById('custom-awards-list');
  var customMilestoneFormEl=document.getElementById('custom-milestone-form');
  var customMilestoneThresholdsEl=document.getElementById('custom-milestone-thresholds');
  var customMilestoneResultEl=document.getElementById('custom-milestone-result');
  var customMilestonePreviewEl=document.getElementById('custom-milestone-preview');
  function milestoneThresholds(){ return programSettings().awardThresholds; }
  var MILESTONE_LABELS={5:'First 5 Laps',10:'10 Lap Club',25:'Quarter Century',50:'Half Century',100:'Century Club',200:'Double Century',500:'Elite Runner'};
  function milestoneLabel(laps){ return MILESTONE_LABELS[laps]||laps+' Lap Club'; }

  function renderCustomMilestones(){
    var thresholds=milestoneThresholds();
    customMilestoneThresholdsEl.value=thresholds.join(', ');
    customMilestonePreviewEl.innerHTML='<div class="setup-summary-grid">'+thresholds.map(function(value){
      return '<div><strong>'+value+'</strong><span>'+escapeHtml(milestoneLabel(value))+'</span></div>';
    }).join('')+'</div>';
  }

  function saveCustomMilestones(e){
    if(e){e.preventDefault();}
    var thresholds=cleanThresholds(customMilestoneThresholdsEl.value);
    saveProgramSettings({awardThresholds:thresholds});
    renderCustomMilestones();
    renderOnboarding();
    renderAwards();
    showResult(customMilestoneResultEl,{success:true,message:'Custom milestone thresholds saved.',thresholds:thresholds});
  }

  function resetCustomMilestones(){
    saveProgramSettings({awardThresholds:[5,10,25,50,100,200,500]});
    renderCustomMilestones();
    renderOnboarding();
    renderAwards();
    showResult(customMilestoneResultEl,{success:true,message:'Milestone thresholds reset to defaults.'});
  }

  function renderAwards(){
    var students=getStudents();
    var html='';
    students.forEach(function(s){
      var earned=milestoneThresholds().filter(function(m){return s.laps>=m;});
      if(earned.length){
        html+='<div style="margin-bottom:0.75rem;padding:0.75rem;border-radius:0.5rem;background:#fff8e1;border:1px solid #f59e0b;">';
        html+='<strong>'+s.name+'</strong> ('+s.year+', '+s.cls+')<br>';
        earned.forEach(function(m){
          html+='<span class="award-badge">&#127942; '+milestoneLabel(m)+'</span>';
        });
        html+='</div>';
      }
    });
    awardsDisplayEl.innerHTML=html||'<p style="color:#888;font-size:0.85rem;">No milestone awards yet. Start scanning!</p>';
  }
  renderAwards();
  renderCustomMilestones();
  customMilestoneFormEl.addEventListener('submit',saveCustomMilestones);
  document.getElementById('reset-custom-milestones-btn').addEventListener('click',resetCustomMilestones);

  function renderMedals(){
    medalRulesEl.innerHTML=MEDAL_TIERS.filter(function(t){return t.name!=='Starter';}).map(function(t){
      return '<span class="award-badge medal-badge medal-badge--'+t.name.toLowerCase()+'">'+t.name+' • '+t.km+' km</span>';
    }).join('');
    var counts={};
    MEDAL_TIERS.forEach(function(t){counts[t.name]=0;});
    getStudents().forEach(function(s){counts[medalFor(s).name]+=1;});
    medalSummaryEl.innerHTML='<div style="display:flex;gap:0.75rem;flex-wrap:wrap;">'+MEDAL_TIERS.map(function(t){
      return '<div class="stat-box medal-summary-box medal-summary-box--'+t.name.toLowerCase()+'"><div class="stat-value">'+counts[t.name]+'</div><div class="stat-label">'+t.name+'</div></div>';
    }).join('')+'</div>';
  }
  renderMedals();

  function certificatesFor(student){
    var km=totalKm(student);
    return CERTIFICATE_MILESTONES.filter(function(m){return km>=m.km;});
  }

  function renderCertificates(){
    var rows=[];
    getStudents().forEach(function(s){
      certificatesFor(s).forEach(function(c){rows.push({student:s,milestone:c});});
    });
    if(!rows.length){certificatesListEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No certificates ready yet.</p>';return;}
    certificatesListEl.innerHTML='<table style="width:100%;border-collapse:collapse;font-size:0.85rem;"><thead><tr style="background:#f4f6fb;"><th style="text-align:left;padding:0.45rem;">Student</th><th>Class</th><th>Milestone</th><th>Status</th></tr></thead><tbody>'+
      rows.map(function(r){return '<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:0.45rem;">'+r.student.name+'</td><td>'+r.student.cls+'</td><td>'+r.milestone.name+'</td><td>Ready to print</td></tr>';}).join('')+
      '</tbody></table>';
  }
  renderCertificates();

  function renderCustomAwards(){
    var awards=load(K.customAwards,[]);
    if(!awards.length){customAwardsListEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No custom awards yet.</p>';return;}
    customAwardsListEl.innerHTML='<ul style="padding:0;list-style:none;margin:0;">'+awards.map(function(a){
      return '<li style="padding:0.5rem 0;border-bottom:1px solid #f0f0f0;font-size:0.88rem;"><strong>'+escapeHtml(a.name)+'</strong><br><span style="color:#555;">'+escapeHtml(a.criteria)+'</span></li>';
    }).join('')+'</ul>';
  }

  function createCustomAward(){
    var name=document.getElementById('custom-award-name').value.trim();
    var criteria=document.getElementById('custom-award-criteria').value.trim();
    if(!name){return;}
    var awards=load(K.customAwards,[]);
    awards.push({id:'award-'+Date.now(),name:name,criteria:criteria||'Coach selected',created:new Date().toISOString().slice(0,10)});
    save(K.customAwards,awards);
    document.getElementById('custom-award-name').value='';
    document.getElementById('custom-award-criteria').value='';
    renderCustomAwards();
  }

  renderCustomAwards();
  document.getElementById('create-custom-award-btn').addEventListener('click',createCustomAward);

  document.getElementById('refresh-awards-btn').addEventListener('click',renderAwards);
  document.getElementById('print-certificates-btn').addEventListener('click',function(){
    var students=getStudents();
    var win=window.open('','_blank');
    var html='<html><head><title>Award Certificates</title><style>body{font-family:sans-serif;padding:2rem;} .cert{border:3px solid gold;padding:2rem;margin:1rem 0;text-align:center;page-break-after:always;} h2{color:#0c5aa8;} .badge{display:inline-block;padding:0.3rem 0.8rem;border-radius:999px;background:#fff8e1;border:1px solid #f59e0b;margin:0.2rem;font-size:0.9rem;}</style></head><body>';
    students.forEach(function(s){
      var earned=milestoneThresholds().filter(function(m){return s.laps>=m;});
      if(earned.length){
        html+='<div class="cert"><h2>&#127942; Run Club Achievement Certificate</h2><h3>'+s.name+'</h3><p>'+s.year+' – Class '+s.cls+'</p><p>Total laps: <strong>'+s.laps+'</strong> ('+lapsTokm(s.laps).toFixed(2)+' km)</p>';
        earned.forEach(function(m){html+='<span class="badge">&#127942; '+milestoneLabel(m)+'</span>';});
        html+='<p style="margin-top:1rem;color:#888;font-size:0.8rem;">Gwynne Park Run Club • 2026</p></div>';
      }
    });
    html+='</body></html>';
    win.document.write(html); win.document.close(); win.print();
  });

  // CHALLENGES
  var challengeResultEl=document.getElementById('challenge-result');
  var challengesListEl=document.getElementById('challenges-list');
  var challengeNotificationListEl=document.getElementById('challenge-notification-list');
  var challengeProgressSummaryEl=document.getElementById('challenge-progress-summary');
  var challengeAwardListEl=document.getElementById('challenge-award-list');

  function challengeRuleFromForm(){
    var target=Number(document.getElementById('challenge-target').value);
    return {
      rule_type:document.getElementById('challenge-rule-type').value,
      metric:document.getElementById('challenge-metric').value,
      target:isFinite(target)&&target>0?target:null,
      scope:document.getElementById('challenge-scope').value
    };
  }

  function challengeRuleLabel(challenge){
    var ruleType=challenge.rule_type||'total';
    var metric=challenge.metric||'laps';
    var target=challenge.target||'open';
    var scope=challenge.scope||'school';
    var ruleCopy=ruleType==='per-student'?'per student':ruleType==='top-group'?'top group wins':'total target';
    return ruleCopy+' • '+target+' '+metric+' • '+scope;
  }

  function challengeProgressRows(){
    var students=getStudents();
    var schoolLaps=students.reduce(function(sum,s){return sum+(s.laps||0);},0);
    var schoolKm=students.reduce(function(sum,s){return sum+totalKm(s);},0);
    return load(K.challenges,[]).map(function(challenge){
      var goalMatch=String(challenge.goal||'').match(/(\d+(?:\.\d+)?)/);
      var target=Number(challenge.target)||(goalMatch?Number(goalMatch[1]):0);
      var metric=challenge.metric||(/km/i.test(challenge.goal||'')?'km':'laps');
      var current=metric==='km'?schoolKm:schoolLaps;
      var percent=target?Math.min(100,Math.round((current/target)*100)):0;
      return {name:challenge.name,goal:challenge.goal,metric:metric,current:current,target:target,percent:percent,rule:challengeRuleLabel(challenge)};
    });
  }

  function renderChallengeProgress(){
    if(!challengeProgressSummaryEl){return;}
    var rows=challengeProgressRows();
    if(!rows.length){challengeProgressSummaryEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No challenge progress to show yet.</p>';return;}
    challengeProgressSummaryEl.innerHTML='<h3 style="margin-bottom:0.5rem;">Challenge Progress</h3><div class="challenge-progress-list">'+rows.map(function(row){
      var current=row.metric==='km'?row.current.toFixed(2)+' km':Math.round(row.current)+' laps';
      var target=row.target?(row.metric==='km'?row.target+' km':row.target+' laps'):escapeHtml(row.goal);
      return '<div class="challenge-progress-card"><div class="challenge-progress-head"><strong>'+escapeHtml(row.name)+'</strong><span>'+row.percent+'%</span></div><div class="training-meta">'+current+' of '+target+' • '+escapeHtml(row.rule)+'</div><div class="goal-bar"><div class="goal-bar-fill" style="width:'+row.percent+'%"></div></div></div>';
    }).join('')+'</div>';
  }

  function challengeAwardRows(){
    return challengeProgressRows().filter(function(row){return row.percent>=100;}).map(function(row){
      return {challenge:row.name,award:'Challenge Complete',status:'Ready to celebrate',progress:row.percent+'%'};
    });
  }

  function renderChallengeAwards(){
    if(!challengeAwardListEl){return;}
    var rows=challengeAwardRows();
    if(!rows.length){challengeAwardListEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No challenge awards ready yet.</p>';return;}
    challengeAwardListEl.innerHTML='<h3 style="margin-bottom:0.5rem;">Challenge Awards Ready</h3><table class="training-status-table"><thead><tr><th>Challenge</th><th>Award</th><th>Status</th><th>Progress</th></tr></thead><tbody>'+rows.map(function(row){
      return '<tr><td>'+escapeHtml(row.challenge)+'</td><td>'+escapeHtml(row.award)+'</td><td>'+escapeHtml(row.status)+'</td><td>'+escapeHtml(row.progress)+'</td></tr>';
    }).join('')+'</tbody></table>';
  }

  function recordChallengeNotification(challenge){
    var rows=load(CHALLENGE_NOTIFICATIONS_KEY,[]);
    var record={id:'challenge-note-'+Date.now(),challenge_id:challenge.id,title:challenge.name,goal:challenge.goal,message:'New challenge ready to share: '+challenge.name,created_at:new Date().toISOString()};
    rows.push(record);
    save(CHALLENGE_NOTIFICATIONS_KEY,rows.slice(-200));
    return record;
  }

  function renderChallengeNotifications(){
    var rows=load(CHALLENGE_NOTIFICATIONS_KEY,[]).slice().reverse().slice(0,5);
    if(!challengeNotificationListEl){return;}
    if(!rows.length){challengeNotificationListEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No challenge notifications yet.</p>';return;}
    challengeNotificationListEl.innerHTML=rows.map(function(row){
      return '<div class="notification-item"><strong>'+escapeHtml(row.title)+'</strong><span>'+escapeHtml(row.goal)+' • '+new Date(row.created_at).toLocaleDateString()+'</span><p>'+escapeHtml(row.message)+'</p></div>';
    }).join('');
  }

  function renderChallenges(){
    var challenges=load(K.challenges,[]);
    if(!challenges.length){challengesListEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No challenges yet.</p>';return;}
    var html='<ul style="padding:0;list-style:none;margin:0;">';
    challenges.forEach(function(c){
      html+='<li style="padding:0.4rem 0;border-bottom:1px solid #f0f0f0;font-size:0.85rem;"><strong>'+escapeHtml(c.name)+'</strong> – Goal: '+escapeHtml(c.goal)+'<br><span style="color:#64748b;">Rule: '+escapeHtml(challengeRuleLabel(c))+'</span></li>';
    });
    html+='</ul>';
    challengesListEl.innerHTML=html;
  }
  renderChallenges();
  renderChallengeNotifications();
  renderChallengeProgress();
  renderChallengeAwards();

  document.getElementById('create-challenge-btn').addEventListener('click',function(){
    var name=document.getElementById('challenge-name').value.trim();
    var goal=document.getElementById('challenge-goal').value.trim();
    var rule=challengeRuleFromForm();
    if(!name||!goal){showResult(challengeResultEl,{success:false,error:'Enter name and goal.'});return;}
    var challenges=load(K.challenges,[]);
    var challenge=Object.assign({id:'ch-'+Date.now(),name:name,goal:goal,created:new Date().toISOString().slice(0,10)},rule);
    challenges.push(challenge);
    save(K.challenges,challenges);
    var notification=recordChallengeNotification(challenge);
    showResult(challengeResultEl,{success:true,message:'Challenge created: '+name,notification:notification.message});
    renderChallenges();
    renderChallengeNotifications();
    renderChallengeProgress();
    renderChallengeAwards();
    document.getElementById('challenge-name').value=''; document.getElementById('challenge-goal').value='';
  });

  // === REPORTS ===
  var reportsResultEl=document.getElementById('reports-result');
  var schoolSummaryEl=document.getElementById('school-summary');
  var auditTrailListEl=document.getElementById('audit-trail-list');
  var reportSummaryPanelsEl=document.getElementById('report-summary-panels');
  var summaryDashboardPanelsEl=document.getElementById('summary-dashboard-panels');
  var adminAnalyticsPanelsEl=document.getElementById('admin-analytics-panels');
  var fullHistoryStudentEl=document.getElementById('full-history-student');
  var fullHistoryListEl=document.getElementById('full-history-list');
  var termReportTermEl=document.getElementById('term-report-term');
  var classReportSelectEl=document.getElementById('class-report-select');
  var attendanceSummaryListEl=document.getElementById('attendance-summary-list');
  var adjustmentFormEl=document.getElementById('adjustment-form');
  var adjustmentStudentEl=document.getElementById('adjustment-student');
  var adjustmentResultEl=document.getElementById('adjustment-result');
  var adjustmentLedgerListEl=document.getElementById('adjustment-ledger-list');
  var onboardingFormEl=document.getElementById('onboarding-form');
  var onboardingSchoolNameEl=document.getElementById('onboarding-school-name');
  var onboardingLapDistanceEl=document.getElementById('onboarding-lap-distance-metres');
  var onboardingSessionTypeEl=document.getElementById('onboarding-session-type');
  var onboardingYearGroupsEl=document.getElementById('onboarding-year-groups');
  var onboardingClassesEl=document.getElementById('onboarding-classes');
  var onboardingAwardThresholdsEl=document.getElementById('onboarding-award-thresholds');
  var onboardingResultEl=document.getElementById('onboarding-result');
  var onboardingSummaryEl=document.getElementById('onboarding-summary');
  var multiSchoolFilterEl=document.getElementById('multi-school-filter');
  var multiSchoolSummaryListEl=document.getElementById('multi-school-summary-list');
  var brandingFormEl=document.getElementById('branding-settings-form');
  var brandingAppTitleEl=document.getElementById('branding-app-title');
  var brandingSchoolBlueEl=document.getElementById('branding-school-blue');
  var brandingUniformGoldEl=document.getElementById('branding-uniform-gold');
  var brandingResultEl=document.getElementById('branding-settings-result');
  var backendReadinessSummaryEl=document.getElementById('backend-readiness-summary');
  var backendReadinessBlockersEl=document.getElementById('backend-readiness-blockers');
  var launchReadinessChecklistEl=document.getElementById('launch-readiness-checklist');
  var printLaunchReadinessBtn=document.getElementById('print-launch-readiness-btn');

  function renderOnboarding(){
    var settings=programSettings();
    onboardingSchoolNameEl.value=settings.schoolName;
    onboardingLapDistanceEl.value=Math.round(settings.lapDistanceKm*1000);
    onboardingSessionTypeEl.value=settings.defaultSessionType;
    onboardingYearGroupsEl.value=settings.activeYears.join(', ');
    onboardingClassesEl.value=settings.classNames.join(', ');
    onboardingAwardThresholdsEl.value=settings.awardThresholds.join(', ');
    onboardingSummaryEl.innerHTML='<div class="setup-summary-grid">'+
      '<div><strong>'+escapeHtml(settings.schoolName)+'</strong><span>School</span></div>'+
      '<div><strong>'+Math.round(settings.lapDistanceKm*1000)+'m</strong><span>Lap distance</span></div>'+
      '<div><strong>'+escapeHtml(settings.defaultSessionType)+'</strong><span>Default session</span></div>'+
      '<div><strong>'+settings.activeYears.length+'</strong><span>Year groups</span></div>'+
      '<div><strong>'+settings.classNames.length+'</strong><span>Classes</span></div>'+
      '<div><strong>'+settings.awardThresholds.join(', ')+'</strong><span>Award laps</span></div>'+
      '</div>';
  }

  onboardingFormEl.addEventListener('submit',function(e){
    e.preventDefault();
    var metres=Number(onboardingLapDistanceEl.value);
    if(!isFinite(metres)||metres<=0){metres=250;}
    metres=Math.min(2000,Math.max(10,Math.round(metres)));
    var settings={
      schoolName:onboardingSchoolNameEl.value.trim()||'Gwynne Park Schools',
      lapDistanceKm:metres/1000,
      defaultSessionType:onboardingSessionTypeEl.value||'Run Club',
      activeYears:cleanList(onboardingYearGroupsEl.value,['Year 1','Year 2','Year 3','Year 4','Year 5','Year 6']),
      classNames:cleanList(onboardingClassesEl.value,['1A','2A','3A','4C','5B','6A']),
      awardThresholds:cleanThresholds(onboardingAwardThresholdsEl.value)
    };
    saveProgramSettings(settings);
    renderScannerSettings();
    renderOnboarding();
    refreshStudentViews();
    renderAwards();
    showResult(onboardingResultEl,{success:true,message:'Onboarding setup saved.',settings:settings});
  });

  function schoolNameForStudent(student){
    return String(student.school||student.school_name||programSettings().schoolName||'Gwynne Park Schools').trim()||'Gwynne Park Schools';
  }

  function multiSchoolSummaryRows(){
    var groups={};
    getStudents().forEach(function(student){
      var school=schoolNameForStudent(student);
      if(!groups[school]){groups[school]={school:school,students:0,laps:0,km:0,classes:{}};}
      groups[school].students+=1;
      groups[school].laps+=student.laps||0;
      groups[school].km+=totalKm(student);
      groups[school].classes[student.cls||'Unassigned']=true;
    });
    return Object.keys(groups).sort().map(function(key){
      var row=groups[key];
      return {school:row.school,students:row.students,classes:Object.keys(row.classes).length,laps:row.laps,km:+row.km.toFixed(2)};
    });
  }

  function populateMultiSchoolFilter(){
    var selected=multiSchoolFilterEl.value;
    var schools=multiSchoolSummaryRows().map(function(row){return row.school;});
    multiSchoolFilterEl.innerHTML='<option value="">All schools</option>'+schools.map(function(school){return '<option value="'+escapeAttr(school)+'">'+escapeHtml(school)+'</option>';}).join('');
    if(schools.indexOf(selected)!==-1){multiSchoolFilterEl.value=selected;}
  }

  function renderMultiSchoolReports(){
    populateMultiSchoolFilter();
    var rows=multiSchoolSummaryRows();
    if(multiSchoolFilterEl.value){rows=rows.filter(function(row){return row.school===multiSchoolFilterEl.value;});}
    multiSchoolSummaryListEl.innerHTML=miniReportTable('School Scope Summary',rows,[{key:'school',label:'School'},{key:'students',label:'Students'},{key:'classes',label:'Classes'},{key:'laps',label:'Laps'},{key:'km',label:'Km'}]);
  }

  function exportMultiSchoolCsv(){
    dlCsv('multi-school-summary-'+new Date().toISOString().slice(0,10)+'.csv',multiSchoolSummaryRows(),['school','students','classes','laps','km']);
    showResult(reportsResultEl,{success:true,message:'Multi-school summary CSV exported.'});
  }

  function renderBrandingSettings(){
    var settings=themeSettings();
    brandingAppTitleEl.value=settings.appTitle;
    brandingSchoolBlueEl.value=settings.schoolBlue;
    brandingUniformGoldEl.value=settings.uniformGold;
  }

  function saveBrandingSettings(e){
    e.preventDefault();
    var settings={appTitle:brandingAppTitleEl.value.trim()||'Gwynne Park Run Club',schoolBlue:brandingSchoolBlueEl.value||'#003880',uniformGold:brandingUniformGoldEl.value||'#c99722'};
    save(THEME_SETTINGS_KEY,settings);
    applyThemeSettings();
    renderBrandingSettings();
    showResult(brandingResultEl,{success:true,message:'Theme and branding settings saved.',settings:settings});
  }

  function resetBrandingSettings(){
    save(THEME_SETTINGS_KEY,{appTitle:'Gwynne Park Run Club',schoolBlue:'#003880',uniformGold:'#c99722'});
    applyThemeSettings();
    renderBrandingSettings();
    showResult(brandingResultEl,{success:true,message:'Theme and branding reset to school defaults.'});
  }

  function backendBlockerLabel(blocker){
    var labels={
      'demo-mode-enabled':'Demo mode is still enabled.',
      'sync-disabled':'Backend sync is switched off.',
      'missing-school-id':'School scope ID has not been set.',
      'missing-supabase-url':'Supabase project URL has not been set.',
      'missing-supabase-anon-key':'Supabase anon key has not been set.'
    };
    return labels[blocker]||blocker;
  }

  function publicConfig(){
    return window.RUN_CLUB_CONFIG||{};
  }

  function launchReadinessItems(readiness){
    var config=publicConfig();
    return [
      {state:config.demoMode===false?'ready':'blocked',label:'Demo mode disabled',detail:'Turn off demoMode before entering real student records.'},
      {state:config.syncEnabled===true?'ready':'blocked',label:'Backend sync enabled',detail:'syncEnabled must be true for cross-device live use.'},
      {state:config.liveDataMode===true?'ready':'blocked',label:'Live data mode enabled',detail:'liveDataMode should only be enabled after school approval and backend review.'},
      {state:config.schoolId?'ready':'blocked',label:'School scope ID set',detail:'schoolId keeps records scoped to the correct school.'},
      {state:config.supabaseUrl?'ready':'blocked',label:'Supabase project URL set',detail:'Use the public project URL only. Never paste service-role secrets here.'},
      {state:config.supabaseAnonKey?'ready':'blocked',label:'Supabase anon key set',detail:'Use the public anon key and rely on RLS/Edge Functions for protection.'},
      {state:readiness&&readiness.ready?'ready':'blocked',label:'Backend adapter can reach storage',detail:'REST and required Edge Function checks must pass before live use.'},
      {state:'review',label:'School approval recorded',detail:'Confirm leadership approval, parent communication, and school privacy expectations outside the browser.'},
      {state:'review',label:'Staff invite accounts prepared',detail:'Create invite-only owner/admin/coach accounts in Supabase Auth. Avoid public staff signup.'},
      {state:'review',label:'RLS and role policies reviewed',detail:'Confirm school-scoped RLS policies and Edge Function secrets in the Supabase dashboard.'},
      {state:'review',label:'Demo data cleared or exported',detail:'Export testing data, then clear demo rosters before entering real students.'},
      {state:'review',label:'Parent/student access boundaries checked',detail:'Parents see only linked children. Students see only their own profile. Schools see only their own students.'}
    ];
  }

  function renderLaunchReadiness(readiness){
    if(!launchReadinessChecklistEl){return;}
    var items=launchReadinessItems(readiness);
    launchReadinessChecklistEl.innerHTML=items.map(function(item){
      var label=item.state==='ready'?'Ready':item.state==='blocked'?'Blocked':'Manual review';
      return '<article class="launch-readiness-item launch-readiness-item--'+escapeAttr(item.state)+'">'+
        '<span class="launch-readiness-status">'+escapeHtml(label)+'</span>'+
        '<div><strong>'+escapeHtml(item.label)+'</strong><p>'+escapeHtml(item.detail)+'</p></div>'+
      '</article>';
    }).join('');
  }

  function printLaunchReadiness(){
    var readiness=window.RunClubBackend&&window.RunClubBackend.backendReadiness?window.RunClubBackend.backendReadiness():{ready:false,realDataAllowed:false,mode:'backend-adapter-missing'};
    var rows=launchReadinessItems(readiness).map(function(item){
      return {status:item.state==='ready'?'Ready':item.state==='blocked'?'Blocked':'Manual review',item:item.label,detail:item.detail};
    });
    printWindow('Launch Readiness Checklist','<h1>Gwynne Park Run Club - Launch Readiness Checklist</h1>'+reportRowsTable(rows,[{key:'status',label:'Status'},{key:'item',label:'Item'},{key:'detail',label:'Detail'}]));
  }

  function renderBackendReadiness(){
    if(!backendReadinessSummaryEl||!backendReadinessBlockersEl){return;}
    var readiness=window.RunClubBackend&&window.RunClubBackend.backendReadiness?window.RunClubBackend.backendReadiness():{ready:false,realDataAllowed:false,mode:'backend-adapter-missing',blockers:['backend-adapter-missing']};
    var guard=window.RunClubBackend&&window.RunClubBackend.requiresLiveBackend?window.RunClubBackend.requiresLiveBackend():{ok:false,message:'Do not enter real student data until Priority 0 is complete.'};
    var statusClass=readiness.realDataAllowed?'backend-readiness-ready':'backend-readiness-blocked';
    var label=readiness.realDataAllowed?'Ready for live student data':'Blocked - demo/local storage only';
    backendReadinessSummaryEl.className='backend-readiness-summary '+statusClass;
    backendReadinessSummaryEl.innerHTML='<strong>'+escapeHtml(label)+'</strong><span>'+escapeHtml(readiness.mode||'unknown')+'</span><p>'+escapeHtml(guard.message)+'</p>';
    var blockers=readiness.blockers&&readiness.blockers.length?readiness.blockers:['live-data-mode-disabled'];
    backendReadinessBlockersEl.innerHTML=blockers.map(function(blocker){return '<li>'+escapeHtml(backendBlockerLabel(blocker))+'</li>';}).join('');
    renderLaunchReadiness(readiness);
  }

  function groupedSummary(groupField){
    var groups={};
    getStudents().forEach(function(s){
      var key=s[groupField]||'Unassigned';
      if(!groups[key]){groups[key]={group:key,students:0,laps:0,km:0,certificates:0};}
      groups[key].students+=1;
      groups[key].laps+=s.laps||0;
      groups[key].km+=totalKm(s);
      groups[key].certificates+=certificatesFor(s).length;
    });
    return Object.keys(groups).sort().map(function(key){
      var row=groups[key];
      row.km=+row.km.toFixed(2);
      return row;
    });
  }

  function medalSummaryRows(){
    var counts={};
    MEDAL_TIERS.forEach(function(t){counts[t.name]={medal:t.name,students:0,minimum_km:t.km};});
    getStudents().forEach(function(s){counts[medalFor(s).name].students+=1;});
    return MEDAL_TIERS.map(function(t){return counts[t.name];});
  }

  function certificateRows(){
    var rows=[];
    getStudents().forEach(function(s){
      certificatesFor(s).forEach(function(c){rows.push({student:s.name,year:s.year,class:s.cls,milestone:c.name,km:c.km,total_km:+totalKm(s).toFixed(2)});});
    });
    return rows;
  }

  function renderReportSummaries(){
    var classRows=groupedSummary('cls');
    var yearRows=groupedSummary('year');
    var medalRows=medalSummaryRows();
    var certRows=certificateRows();
    function miniTable(title,rows,cols){
      if(!rows.length){return '<div class="report-mini"><h3>'+title+'</h3><p style="color:#888;font-size:0.85rem;">No rows yet.</p></div>';}
      return '<div class="report-mini"><h3>'+title+'</h3><table><thead><tr>'+cols.map(function(c){return '<th>'+c.label+'</th>';}).join('')+'</tr></thead><tbody>'+
        rows.slice(0,8).map(function(row){return '<tr>'+cols.map(function(c){return '<td>'+escapeHtml(row[c.key])+'</td>';}).join('')+'</tr>';}).join('')+
        '</tbody></table></div>';
    }
    reportSummaryPanelsEl.innerHTML=
      miniTable('Class Summary',classRows,[{key:'group',label:'Class'},{key:'students',label:'Students'},{key:'laps',label:'Laps'},{key:'km',label:'Km'}])+
      miniTable('Year Summary',yearRows,[{key:'group',label:'Year'},{key:'students',label:'Students'},{key:'laps',label:'Laps'},{key:'km',label:'Km'}])+
      miniTable('Medal Summary',medalRows,[{key:'medal',label:'Medal'},{key:'students',label:'Students'},{key:'minimum_km',label:'Min km'}])+
      miniTable('Certificate Readiness',certRows,[{key:'student',label:'Student'},{key:'class',label:'Class'},{key:'milestone',label:'Milestone'},{key:'total_km',label:'Total km'}]);
  }

  function divisionForYear(year){
    var n=Number(String(year||'').replace(/\D/g,''));
    if(n>=5){return 'Senior';}
    if(n>=3){return 'Intermediate';}
    if(n>=1){return 'Junior';}
    return 'Unassigned';
  }

  function miniReportTable(title,rows,cols){
    if(!rows.length){return '<div class="report-mini"><h3>'+escapeHtml(title)+'</h3><p style="color:#888;font-size:0.85rem;">No rows yet.</p></div>';}
    return '<div class="report-mini"><h3>'+escapeHtml(title)+'</h3><table><thead><tr>'+cols.map(function(c){return '<th>'+escapeHtml(c.label)+'</th>';}).join('')+'</tr></thead><tbody>'+
      rows.map(function(row){return '<tr>'+cols.map(function(c){return '<td>'+escapeHtml(row[c.key])+'</td>';}).join('')+'</tr>';}).join('')+
      '</tbody></table></div>';
  }

  function summaryRowsFor(kind){
    if(kind==='school'){
      var students=getStudents();
      return [{
        group:'Whole school',
        students:students.length,
        active:students.filter(function(s){return (s.laps||0)>0;}).length,
        laps:students.reduce(function(total,s){return total+(s.laps||0);},0),
        km:+students.reduce(function(total,s){return total+totalKm(s);},0).toFixed(2)
      }];
    }
    if(kind==='division'){
      var divisions={};
      getStudents().forEach(function(s){
        var key=divisionForYear(s.year);
        if(!divisions[key]){divisions[key]={group:key,students:0,active:0,laps:0,km:0};}
        divisions[key].students+=1;
        if((s.laps||0)>0){divisions[key].active+=1;}
        divisions[key].laps+=s.laps||0;
        divisions[key].km+=totalKm(s);
      });
      return ['Junior','Intermediate','Senior','Unassigned'].filter(function(key){return divisions[key];}).map(function(key){
        divisions[key].km=+divisions[key].km.toFixed(2);
        return divisions[key];
      });
    }
    var source=kind==='class'?groupedSummary('cls'):groupedSummary('year');
    return source.map(function(row){return {group:row.group,students:row.students,active:getStudents().filter(function(s){return (kind==='class'?s.cls:s.year)===row.group&&(s.laps||0)>0;}).length,laps:row.laps,km:row.km};});
  }

  function renderSummaryDashboards(){
    summaryDashboardPanelsEl.innerHTML=
      miniReportTable('School Dashboard',summaryRowsFor('school'),[{key:'group',label:'Scope'},{key:'students',label:'Students'},{key:'active',label:'Active'},{key:'laps',label:'Laps'},{key:'km',label:'Km'}])+
      miniReportTable('Division Dashboard',summaryRowsFor('division'),[{key:'group',label:'Division'},{key:'students',label:'Students'},{key:'active',label:'Active'},{key:'laps',label:'Laps'},{key:'km',label:'Km'}])+
      miniReportTable('Year Dashboard',summaryRowsFor('year'),[{key:'group',label:'Year'},{key:'students',label:'Students'},{key:'active',label:'Active'},{key:'laps',label:'Laps'},{key:'km',label:'Km'}])+
      miniReportTable('Class Dashboard',summaryRowsFor('class'),[{key:'group',label:'Class'},{key:'students',label:'Students'},{key:'active',label:'Active'},{key:'laps',label:'Laps'},{key:'km',label:'Km'}]);
  }

  function inTermValue(dateValue,term){
    var range=termRange(term);
    if(!range){return true;}
    var date=new Date(dateValue);
    return date>=range[0]&&date<=range[1];
  }

  function termLabel(term){
    return ({term1:'Term 1',term2:'Term 2',term3:'Term 3',term4:'Term 4'}[term])||'All dates';
  }

  function termProgressRows(term){
    return getStudents().map(function(s){
      var scans=load(K.scanAudit,[]).filter(function(row){return row.student_id===s.id&&row.success&&!row.undo&&inTermValue(row.time,term);}).length;
      var undos=load(K.scanAudit,[]).filter(function(row){return row.student_id===s.id&&row.undo&&inTermValue(row.time,term);}).length;
      var activities=load(K.activity,[]).filter(function(row){return row.student_id===s.id&&inTermValue(row.date,term);});
      var activityKm=activities.reduce(function(total,row){return total+minutesToKm(Number(row.minutes||0));},0);
      var periodLaps=scans-undos;
      return {student:s.name,year:s.year,class:s.cls,division:divisionForYear(s.year),period_laps:periodLaps,period_km:+(periodLaps*programSettings().lapDistanceKm+activityKm).toFixed(2),lifetime_laps:s.laps||0,lifetime_km:+totalKm(s).toFixed(2),certificates:certificatesFor(s).length};
    }).sort(function(a,b){return b.period_km-a.period_km || b.lifetime_km-a.lifetime_km || a.student.localeCompare(b.student);});
  }

  function fullStudentHistoryRows(studentId){
    var student=getStudents().find(function(s){return s.id===studentId;});
    if(!student){return [];}
    var rows=studentProgressRows(studentId).map(function(row){return {date:row.date,type:row.type,detail:row.detail,amount:row.amount,status:row.status};});
    certificatesFor(student).forEach(function(c){rows.push({date:new Date().toISOString(),type:'Certificate ready',detail:c.name,amount:c.km+' km',status:'Ready'});});
    if(window.RunClubGoals){
      window.RunClubGoals.goalsFor(studentId).forEach(function(g){rows.push({date:g.created_at||g.created||new Date().toISOString(),type:'Goal',detail:g.title||g.metric,amount:g.target+' '+(g.unit||''),status:g.owner||'goal'});});
    }
    load(K.training,[]).forEach(function(task){
      if((task.student_ids||[]).indexOf(studentId)>=0){rows.push({date:task.created_at||task.created||task.due_date||new Date().toISOString(),type:'Training assigned',detail:task.title,amount:task.due_date||'',status:'Assigned'});}
    });
    load(K.trainingClicks,[]).forEach(function(click){
      if(click.student_id===studentId){rows.push({date:click.time||click.clicked_at||new Date().toISOString(),type:'Training link opened',detail:click.title||click.url||'Training link',amount:'',status:'Opened'});}
    });
    load(K.adjustments,[]).forEach(function(adj){
      if(adj.student_id===studentId){rows.push({date:adj.time,type:'Manual adjustment',detail:adj.reason,amount:(adj.delta_laps>0?'+':'')+adj.delta_laps+' laps',status:adj.staff||'Admin'});}
    });
    return rows.sort(function(a,b){return new Date(b.date)-new Date(a.date);});
  }

  function populateFullHistoryStudents(){
    var selected=fullHistoryStudentEl.value;
    fullHistoryStudentEl.innerHTML='';
    getStudents().forEach(function(s){
      var o=document.createElement('option');o.value=s.id;o.textContent=s.name+' ('+s.year+', '+s.cls+')';fullHistoryStudentEl.appendChild(o);
    });
    if(selected&&getStudents().some(function(s){return s.id===selected;})){fullHistoryStudentEl.value=selected;}
  }

  function renderFullStudentHistory(){
    var studentId=fullHistoryStudentEl.value || (getStudents()[0]&&getStudents()[0].id);
    if(!studentId){fullHistoryListEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No students yet.</p>';return;}
    fullHistoryStudentEl.value=studentId;
    var rows=fullStudentHistoryRows(studentId);
    if(!rows.length){fullHistoryListEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No history rows yet.</p>';return;}
    fullHistoryListEl.innerHTML='<table class="progress-history-table"><thead><tr><th>Date</th><th>Type</th><th>Detail</th><th>Amount</th><th>Status</th></tr></thead><tbody>'+
      rows.slice(0,80).map(function(row){return '<tr><td>'+new Date(row.date).toLocaleDateString()+'</td><td>'+escapeHtml(row.type)+'</td><td>'+escapeHtml(row.detail)+'</td><td>'+escapeHtml(row.amount)+'</td><td>'+escapeHtml(row.status)+'</td></tr>';}).join('')+
      '</tbody></table>';
  }

  function exportFullStudentHistoryCsv(){
    var student=getStudents().find(function(s){return s.id===fullHistoryStudentEl.value;});
    if(!student){return;}
    var rows=fullStudentHistoryRows(student.id).map(function(row){return {student:student.name,year:student.year,class:student.cls,date:row.date,type:row.type,detail:row.detail,amount:row.amount,status:row.status};});
    dlCsv('student-full-history-'+student.id+'.csv',rows,['student','year','class','date','type','detail','amount','status']);
    showResult(reportsResultEl,{success:true,message:'Student full history CSV exported.'});
  }

  function populateClassReportSelect(){
    var selected=classReportSelectEl.value;
    classReportSelectEl.innerHTML='';
    cleanList(getStudents().map(function(s){return s.cls;}),[]).sort().forEach(function(cls){
      var o=document.createElement('option');o.value=cls;o.textContent=cls;classReportSelectEl.appendChild(o);
    });
    if(selected&&Array.prototype.some.call(classReportSelectEl.options,function(o){return o.value===selected;})){classReportSelectEl.value=selected;}
  }

  function printWindow(title,body){
    var win=window.open('','_blank');
    if(!win){return;}
    win.document.write('<html><head><title>'+escapeHtml(title)+'</title><style>body{font-family:Arial,sans-serif;color:#102a43;padding:20px;}h1{color:#003880;}table{width:100%;border-collapse:collapse;font-size:12px;}th,td{border-bottom:1px solid #d9e2ec;text-align:left;padding:7px;}th{background:#f4f7fb;}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}</style></head><body>'+body+'</body></html>');
    win.document.close(); win.focus(); win.print();
  }

  function printProgramResources(){
    var hub=document.getElementById('program-resource-hub');
    var lessons=document.getElementById('lesson-plan-section');
    if(!hub||!lessons){return;}
    var hubClone=hub.cloneNode(true);
    var lessonsClone=lessons.cloneNode(true);
    var printButton=hubClone.querySelector('#print-program-resources-btn');
    if(printButton){printButton.remove();}
    printWindow('Program Resources','<h1>Gwynne Park Run Club - Program Resources</h1>'+hubClone.innerHTML+lessonsClone.innerHTML);
  }

  function reportRowsTable(rows,cols){
    return '<table><thead><tr>'+cols.map(function(c){return '<th>'+escapeHtml(c.label)+'</th>';}).join('')+'</tr></thead><tbody>'+
      rows.map(function(row){return '<tr>'+cols.map(function(c){return '<td>'+escapeHtml(row[c.key])+'</td>';}).join('')+'</tr>';}).join('')+
      '</tbody></table>';
  }

  function exportTermProgressCsv(){
    var rows=termProgressRows(termReportTermEl.value);
    dlCsv('term-progress-'+termReportTermEl.value+'.csv',rows,['student','year','class','division','period_laps','period_km','lifetime_laps','lifetime_km','certificates']);
    showResult(reportsResultEl,{success:true,message:'Term progress CSV exported.'});
  }

  function printTermProgress(){
    var rows=termProgressRows(termReportTermEl.value);
    printWindow('Term Progress Report','<h1>Gwynne Park Run Club - '+escapeHtml(termLabel(termReportTermEl.value))+'</h1>'+reportRowsTable(rows,[{key:'student',label:'Student'},{key:'year',label:'Year'},{key:'class',label:'Class'},{key:'period_laps',label:'Term laps'},{key:'period_km',label:'Term km'},{key:'lifetime_km',label:'Total km'}]));
  }

  function printClassReport(){
    var cls=classReportSelectEl.value;
    var rows=termProgressRows(termReportTermEl.value).filter(function(row){return row.class===cls;});
    printWindow('Class Report '+cls,'<h1>Gwynne Park Run Club - '+escapeHtml(cls)+' '+escapeHtml(termLabel(termReportTermEl.value))+'</h1>'+reportRowsTable(rows,[{key:'student',label:'Student'},{key:'year',label:'Year'},{key:'period_laps',label:'Term laps'},{key:'period_km',label:'Term km'},{key:'lifetime_laps',label:'Total laps'},{key:'lifetime_km',label:'Total km'},{key:'certificates',label:'Certificates'}]));
  }

  function certificateBatchRows(){
    return certificateRows().map(function(row,index){return Object.assign({batch_rank:index+1,printed:'No'},row);});
  }

  function printAwardPack(){
    var rows=certificateBatchRows();
    printWindow('Award Pack','<h1>Gwynne Park Run Club - Award Pack</h1>'+reportRowsTable(rows,[{key:'batch_rank',label:'#'},{key:'student',label:'Student'},{key:'year',label:'Year'},{key:'class',label:'Class'},{key:'milestone',label:'Award'},{key:'total_km',label:'Total km'}]));
  }

  function sessionAttendanceRows(){
    var students=getStudents();
    var audit=load(K.scanAudit,[]).filter(function(row){return row.success&&!row.undo&&!row.attendance_only;});
    var sessions=load(K.sessions,[]);
    var rows=sessions.map(function(session){
      var started=session.start||session.started_at||session.date||session.created||new Date().toISOString();
      var ended=session.end||session.ended_at||started;
      var scans=audit.filter(function(row){var t=new Date(row.time);return t>=new Date(started)&&t<=new Date(ended);});
      var unique={};
      scans.forEach(function(row){unique[row.student_id]=true;});
      return {date:new Date(started).toLocaleDateString(),session:session.type||session.name||programSettings().defaultSessionType,students:Object.keys(unique).length,scans:scans.length,participation:students.length?Math.round(Object.keys(unique).length/students.length*100)+'%':'0%'};
    });
    if(!rows.length&&audit.length){
      var uniqueAll={};
      audit.forEach(function(row){uniqueAll[row.student_id]=true;});
      rows.push({date:'All scan history',session:'All sessions',students:Object.keys(uniqueAll).length,scans:audit.length,participation:students.length?Math.round(Object.keys(uniqueAll).length/students.length*100)+'%':'0%'});
    }
    return rows;
  }

  function renderAttendanceSummary(){
    attendanceSummaryListEl.innerHTML=miniReportTable('Session Attendance',sessionAttendanceRows(),[{key:'date',label:'Date'},{key:'session',label:'Session'},{key:'students',label:'Students'},{key:'scans',label:'Scans'},{key:'participation',label:'Participation'}]);
  }

  function athleticsExportRows(filterCategory){
    return athleticsResults().filter(function(row){return !filterCategory||row.event_category===filterCategory;}).map(function(row){
      return {
        date:row.date,
        student:row.student_name,
        year:row.year,
        class:row.class_name,
        house:row.house,
        event:row.event_name,
        category:row.event_category,
        result:resultDisplay(row),
        place:row.place||'',
        points:row.points||0,
        personal_best:row.personal_best?'yes':'no',
        attempts:(row.attempts||[]).join(' | ')
      };
    });
  }

  function exportCarnivalResultsCsv(){
    dlCsv('carnival-results-'+new Date().toISOString().slice(0,10)+'.csv',athleticsExportRows(null),['date','student','year','class','house','event','category','result','place','points','personal_best','attempts']);
    showResult(reportsResultEl,{success:true,message:'Carnival results CSV exported.'});
  }

  function exportCrossCountryCsv(){
    dlCsv('cross-country-results-'+new Date().toISOString().slice(0,10)+'.csv',athleticsExportRows('cross-country'),['date','student','year','class','house','event','category','result','place','points','personal_best','attempts']);
    showResult(reportsResultEl,{success:true,message:'Cross country results CSV exported.'});
  }

  function populateAdjustmentStudents(){
    var selected=adjustmentStudentEl.value;
    adjustmentStudentEl.innerHTML='';
    getStudents().forEach(function(s){
      var o=document.createElement('option');o.value=s.id;o.textContent=s.name+' ('+s.year+', '+s.cls+')';adjustmentStudentEl.appendChild(o);
    });
    if(selected&&getStudents().some(function(s){return s.id===selected;})){adjustmentStudentEl.value=selected;}
  }

  function createManualAdjustment(e){
    e.preventDefault();
    var studentId=adjustmentStudentEl.value;
    var reason=document.getElementById('adjustment-reason').value.trim();
    var amount=Math.max(1,Math.round(Number(document.getElementById('adjustment-laps').value)||1));
    var type=document.getElementById('adjustment-type').value;
    if(!reason){showResult(adjustmentResultEl,{success:false,error:'Reason note is required.'});return;}
    var students=getStudents();
    var student=students.find(function(s){return s.id===studentId;});
    if(!student){showResult(adjustmentResultEl,{success:false,error:'Student not found.'});return;}
    var delta=type==='remove'?-amount:amount;
    student.laps=Math.max(0,(student.laps||0)+delta);
    var rows=load(K.adjustments,[]);
    var record={id:'adj-'+Date.now(),time:new Date().toISOString(),student_id:student.id,student_name:student.name,delta_laps:delta,reason:reason,staff:session.email||'admin',laps_after:student.laps};
    saveManualAdjustmentWithBackend(students,student,record).then(function(result){
      if(!result.ok){showResult(adjustmentResultEl,{success:false,error:result.error||result.reason||'Local manual adjustment blocked.'});return;}
      rows.push(record);
      save(K.adjustments,rows);
      document.getElementById('adjustment-reason').value='';
      showResult(adjustmentResultEl,{success:true,message:'Manual adjustment saved.',record:record});
      refreshStudentViews();
    });
  }

  function renderAdjustmentLedger(){
    var rows=load(K.adjustments,[]).slice().reverse();
    if(!rows.length){adjustmentLedgerListEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No manual adjustments yet.</p>';return;}
    adjustmentLedgerListEl.innerHTML=miniReportTable('Recent Adjustments',rows.slice(0,20).map(function(row){return {time:new Date(row.time).toLocaleString(),student:row.student_name,delta:(row.delta_laps>0?'+':'')+row.delta_laps,reason:row.reason,staff:row.staff,laps_after:row.laps_after};}),[{key:'time',label:'Time'},{key:'student',label:'Student'},{key:'delta',label:'Laps'},{key:'reason',label:'Reason'},{key:'staff',label:'Staff'},{key:'laps_after',label:'After'}]);
  }

  function downloadAdminTemplates(){
    var text=[
      'ROSTER IMPORT',
      'firstname,lastname,yeargroup,classname',
      'James,Smith,Year 5,5B',
      '',
      'MANUAL ADJUSTMENTS',
      'student_id,student_name,delta_laps,reason',
      'STUDENT1,James Smith,1,Missed successful scan',
      '',
      'TRAINING ASSIGNMENTS',
      'title,url,due_date,notes,student_ids',
      'Easy running drills,https://example.com,2026-07-01,Teacher assigned practice,STUDENT1|STUDENT2',
      '',
      'EVENT LOGS',
      'date,event_name,student_id,laps,notes',
      '2026-07-01,Friday Run Club,STUDENT1,4,'
    ].join('\n');
    var b=new Blob([text],{type:'text/plain'});
    var u=URL.createObjectURL(b); var a=document.createElement('a');
    a.href=u; a.download='runclub-admin-workflow-templates.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u);
    showResult(reportsResultEl,{success:true,message:'Admin workflow templates downloaded.'});
  }

  function renderAdminAnalytics(){
    var students=getStudents();
    var active=students.filter(function(s){return (s.laps||0)>0;});
    var inactive=students.filter(function(s){return !(s.laps||0);});
    var classRows=groupedSummary('cls').sort(function(a,b){return b.km-a.km;});
    var certificates=certificateRows();
    adminAnalyticsPanelsEl.innerHTML='<div class="setup-summary-grid">'+
      '<div><strong>'+Math.round((active.length/(students.length||1))*100)+'%</strong><span>Participation</span></div>'+
      '<div><strong>'+inactive.length+'</strong><span>Inactive students</span></div>'+
      '<div><strong>'+((students.reduce(function(t,s){return t+(s.laps||0);},0)/(students.length||1)).toFixed(1))+'</strong><span>Avg laps/student</span></div>'+
      '<div><strong>'+escapeHtml(classRows[0]?classRows[0].group:'None')+'</strong><span>Top class</span></div>'+
      '<div><strong>'+certificates.length+'</strong><span>Certificates ready</span></div>'+
      '</div>';
  }

  function nextCertificateFor(student){
    var km=totalKm(student);
    return CERTIFICATE_MILESTONES.find(function(m){return km<m.km;}) || null;
  }

  var coachToolModalEl=document.getElementById('coach-tool-modal');
  var coachToolTitleEl=document.getElementById('coach-tool-modal-title');
  var coachToolSubtitleEl=document.getElementById('coach-tool-modal-subtitle');
  var coachToolAiCopyEl=document.getElementById('coach-tool-ai-copy');
  var coachToolActionsEl=document.getElementById('coach-tool-actions');
  var coachToolListEl=document.getElementById('coach-tool-list');
  var coachToolNoteFormEl=document.getElementById('coach-tool-note-form');
  var coachToolNoteScopeEl=document.getElementById('coach-tool-note-scope');
  var coachToolNoteTextEl=document.getElementById('coach-tool-note-text');
  var coachToolResultEl=document.getElementById('coach-tool-result');
  var coachNoteListEl=document.getElementById('coach-note-list');
  var activeCoachTool='needs-attention';

  function coachNotes(){return load(COACH_NOTES_KEY,[]);}
  function saveCoachNotes(rows){save(COACH_NOTES_KEY,rows.slice(-400));}
  function studentNotifications(){return load(STUDENT_NOTIFICATIONS_KEY,[]);}
  function saveStudentNotifications(rows){save(STUDENT_NOTIFICATIONS_KEY,rows.slice(-500));}

  function saveCoachNote(scope,note){
    var text=String(note||'').trim();
    if(!text){return null;}
    var row={id:'coach-note-'+Date.now(),tool:activeCoachTool,scope:scope||activeCoachTool,note:text,created_at:new Date().toISOString(),staff:session.email||'coach'};
    var rows=coachNotes(); rows.push(row); saveCoachNotes(rows); return row;
  }

  function saveCoachNoteWithBackend(scope,note){
    var text=String(note||'').trim();
    if(!text){return Promise.resolve({ok:false,validation:true,error:'Type a note before saving.'});}
    var row={id:'coach-note-'+Date.now(),tool:activeCoachTool,scope:scope||activeCoachTool,note:text,created_at:new Date().toISOString(),staff:session.email||'coach'};
    return runLiveFeatureWrite('saveCoachNote',{
      tool:row.tool,
      scope:row.scope,
      note:row.note,
      staff:row.staff,
      metadata:{source_screen:'coach-tools',local_note_id:row.id}
    },function(){
      var rows=coachNotes();
      rows.push(row);
      saveCoachNotes(rows);
    },'Local coach note blocked.').then(function(result){
      return Object.assign({},result,{coach_note:row});
    });
  }

  function pushStudentNotification(student,type,title,message,meta){
    var rows=studentNotifications();
    rows.push({id:'student-note-'+Date.now()+'-'+Math.floor(Math.random()*1000),student_id:student.id,type:type,title:title,message:message,meta:meta||{},created_at:new Date().toISOString(),read:false});
    saveStudentNotifications(rows);
  }

  function pushStudentNotificationWithBackend(student,type,title,message,meta){
    var row={id:'student-note-'+Date.now()+'-'+Math.floor(Math.random()*1000),student_id:student.id,type:type,title:title,message:message,meta:meta||{},created_at:new Date().toISOString(),read:false};
    return runLiveFeatureWrite('createStudentNotification',{
      student_id:isUuid(student.id)?student.id:null,
      notification_type:type,
      title:title,
      message:message,
      metadata:Object.assign({source_screen:'coach-tools',local_notification_id:row.id,local_student_id:student.id,barcode:student.barcode||student.id},meta||{})
    },function(){
      var rows=studentNotifications();
      rows.push(row);
      saveStudentNotifications(rows);
    },'Local student notification blocked.').then(function(result){
      return Object.assign({},result,{student_notification:row});
    });
  }

  function closeAwardRows(limit){
    return getStudents().map(function(s){
      var next=nextCertificateFor(s);
      if(!next){return null;}
      var kmLeft=Math.max(0,next.km-totalKm(s));
      var lapsLeft=Math.ceil(kmLeft/(programSettings().lapDistanceKm||0.25));
      return {student:s,next:next,lapsLeft:lapsLeft,kmLeft:kmLeft};
    }).filter(function(row){return row&&row.lapsLeft<=8;}).sort(function(a,b){return a.lapsLeft-b.lapsLeft;}).slice(0,limit||999);
  }

  function trainingNotOpenedRows(limit){
    var students=getStudents();
    var clicks=load(K.trainingClicks,[]);
    var rows=[];
    load(K.training,[]).forEach(function(task){
      (task.student_ids||[]).forEach(function(studentId){
        if(clicks.some(function(click){return click.training_id===task.id&&click.student_id===studentId;})){return;}
        var student=students.find(function(s){return s.id===studentId;});
        if(student){rows.push({student:student,task:task});}
      });
    });
    return rows.slice(0,limit||999);
  }

  function needsAttentionRows(limit){
    var unopenedMap={};
    trainingNotOpenedRows().forEach(function(row){unopenedMap[row.student.id]=(unopenedMap[row.student.id]||0)+1;});
    return getStudents().map(function(s){
      var reasons=[];
      if(!(s.laps||0)){reasons.push('No laps recorded yet');}
      if((s.laps||0)>0&&(s.laps||0)<5){reasons.push('Still below first 5-lap badge');}
      if(unopenedMap[s.id]){reasons.push(unopenedMap[s.id]+' training task'+(unopenedMap[s.id]===1?'':'s')+' not opened');}
      return reasons.length?{student:s,reasons:reasons}:null;
    }).filter(Boolean).slice(0,limit||999);
  }

  function personalBestRows(limit){
    return athleticsResults().filter(function(row){return row.personal_best;}).slice().reverse().slice(0,limit||999);
  }

  function classTrendRows(limit){
    return groupedSummary('cls').sort(function(a,b){return b.km-a.km;}).slice(0,limit||999);
  }

  function celebrationRows(limit){
    var rows=[];
    certificateRows().slice(0,8).forEach(function(row){rows.push({title:row.milestone,detail:row.student+' - '+row.class+' - '+row.total_km+' km'});});
    personalBestRows(8).forEach(function(row){rows.push({title:'PB: '+row.event_name,detail:row.student_name+' - '+resultDisplay(row)});});
    return rows.slice(0,limit||999);
  }

  function coachToolConfig(tool){
    var configs={
      'needs-attention':{title:'Needs Attention',subtitle:'Flagged students and practical staff follow-up.',ai:'Later Mini Coach can explain likely causes and suggest a simple next action.'},
      'close-award':{title:'Close To Award',subtitle:'Students within 8 laps of the next milestone.',ai:'Later Mini Coach can suggest encouragement wording and realistic next-session targets.'},
      'training-not-opened':{title:'Training Not Opened',subtitle:'Assigned tasks students have not opened yet.',ai:'Later Mini Coach can group reminders by class and suggest parent-safe wording.'},
      'personal-bests':{title:'Personal Bests',subtitle:'Recent PB markers from athletics and carnival results.',ai:'Later Mini Coach can suggest safe next PB targets after staff review.'},
      'class-trends':{title:'Class Trends',subtitle:'Class-level participation and progress snapshot.',ai:'Later Mini Coach can identify the next best class action.'},
      'celebration-wall':{title:'Celebration Wall',subtitle:'Candidate achievements for staff-moderated celebration.',ai:'Later Mini Coach can draft celebration blurbs without exposing private details.'}
    };
    return configs[tool]||configs['needs-attention'];
  }

  function coachToolRows(tool){
    if(tool==='needs-attention'){return needsAttentionRows();}
    if(tool==='close-award'){return closeAwardRows();}
    if(tool==='training-not-opened'){return trainingNotOpenedRows();}
    if(tool==='personal-bests'){return personalBestRows();}
    if(tool==='class-trends'){return classTrendRows();}
    if(tool==='celebration-wall'){return celebrationRows();}
    return [];
  }

  function coachToolRowHtml(tool,row){
    if(tool==='needs-attention'){
      return '<article class="coach-tool-row"><div><strong>'+escapeHtml(row.student.name)+'</strong><span>'+escapeHtml(row.student.year+' / '+row.student.cls)+'</span><p>'+row.reasons.map(escapeHtml).join(' | ')+'</p></div><button type="button" class="secondary coach-note-target" data-scope="'+escapeAttr(row.student.id)+'">Note</button></article>';
    }
    if(tool==='close-award'){
      return '<article class="coach-tool-row"><div><strong>'+escapeHtml(row.student.name)+'</strong><span>'+row.lapsLeft+' lap'+(row.lapsLeft===1?'':'s')+' to '+escapeHtml(row.next.name)+'</span><p>'+row.student.laps+' laps currently recorded.</p></div><button type="button" class="secondary coach-notify-award" data-student="'+escapeAttr(row.student.id)+'">Notify</button></article>';
    }
    if(tool==='training-not-opened'){
      return '<article class="coach-tool-row"><div><strong>'+escapeHtml(row.student.name)+'</strong><span>'+escapeHtml(row.task.title)+'</span><p>Due '+escapeHtml(row.task.due_date||'not set')+' - '+escapeHtml(row.student.cls)+'</p></div><button type="button" class="secondary coach-note-target" data-scope="'+escapeAttr(row.student.id)+'">Note</button></article>';
    }
    if(tool==='personal-bests'){
      return '<article class="coach-tool-row"><div><strong>'+escapeHtml(row.student_name)+'</strong><span>'+escapeHtml(row.event_name)+' - '+escapeHtml(resultDisplay(row))+'</span><p>'+new Date(row.date).toLocaleDateString()+'</p></div><button type="button" class="secondary coach-note-target" data-scope="'+escapeAttr(row.student_id)+'">Note</button></article>';
    }
    if(tool==='class-trends'){
      return '<article class="coach-tool-row"><div><strong>'+escapeHtml(row.group)+'</strong><span>'+row.students+' students - '+row.laps+' laps - '+row.km+' km</span><p>'+row.certificates+' certificates ready.</p></div><button type="button" class="secondary coach-note-target" data-scope="class:'+escapeAttr(row.group)+'">Note</button></article>';
    }
    return '<article class="coach-tool-row"><div><strong>'+escapeHtml(row.title)+'</strong><span>'+escapeHtml(row.detail)+'</span><p>Staff review before sharing.</p></div><button type="button" class="secondary coach-note-target" data-scope="'+escapeAttr(row.title)+'">Note</button></article>';
  }

  function renderCoachNotes(){
    if(!coachNoteListEl){return;}
    var rows=coachNotes().slice().reverse().slice(0,8);
    coachNoteListEl.innerHTML=rows.length?rows.map(function(row){
      return '<div class="coach-note-item"><strong>'+escapeHtml(row.scope)+'</strong><span>'+escapeHtml(row.tool)+' - '+new Date(row.created_at).toLocaleString()+'</span><p>'+escapeHtml(row.note)+'</p></div>';
    }).join(''):'<p class="muted-copy">No coach notes saved yet.</p>';
  }

  function renderCoachToolModal(tool){
    activeCoachTool=tool;
    var config=coachToolConfig(tool);
    var rows=coachToolRows(tool);
    coachToolTitleEl.textContent=config.title;
    coachToolSubtitleEl.textContent=config.subtitle;
    coachToolAiCopyEl.textContent=config.ai;
    coachToolNoteScopeEl.value=tool;
    coachToolNoteTextEl.value='';
    coachToolResultEl.hidden=true;
    coachToolActionsEl.innerHTML=tool==='close-award'&&rows.length?'<button type="button" class="secondary" id="notify-all-close-awards-btn">Notify all close-to-award students</button>':'';
    coachToolListEl.innerHTML=rows.length?rows.map(function(row){return coachToolRowHtml(tool,row);}).join(''):'<p class="empty-note">Nothing to review here yet.</p>';
    Array.prototype.forEach.call(coachToolListEl.querySelectorAll('.coach-note-target'),function(btn){
      btn.addEventListener('click',function(){coachToolNoteScopeEl.value=btn.dataset.scope;coachToolNoteTextEl.focus();});
    });
    Array.prototype.forEach.call(coachToolListEl.querySelectorAll('.coach-notify-award'),function(btn){
      btn.addEventListener('click',function(){notifyCloseAwardStudent(btn.dataset.student);});
    });
    var notifyAll=document.getElementById('notify-all-close-awards-btn');
    if(notifyAll){notifyAll.addEventListener('click',function(){closeAwardRows().forEach(function(row){notifyCloseAwardStudent(row.student.id,true);});showResult(coachToolResultEl,{success:true,message:'Close-to-award notifications queued.',students:closeAwardRows().length});});}
    openAdminModalAt(coachToolModalEl,renderCoachToolModal.trigger);
  }

  function notifyCloseAwardStudent(studentId,quiet){
    var row=closeAwardRows().find(function(item){return item.student.id===studentId;});
    if(!row){return;}
    pushStudentNotificationWithBackend(row.student,'close-award','Close to your next award','You are '+row.lapsLeft+' lap'+(row.lapsLeft===1?'':'s')+' from '+row.next.name+'.',{laps_left:row.lapsLeft,award:row.next.name}).then(function(result){
      if(!result.ok){showResult(coachToolResultEl,{success:false,error:result.error||result.reason||'Notification failed.'});return;}
      if(!quiet){showResult(coachToolResultEl,{success:true,message:'Student notification queued.',student:row.student.name,award:row.next.name,backend:result.local?'local':'synced'});}
    });
  }

  function closeCoachToolModal(){closeAdminModal(coachToolModalEl);}

  function renderFutureIntelligenceSkeleton(){
    var target=document.getElementById('future-intelligence-skeleton');
    if(!target){return;}
    var cards=[
      {tool:'mini-coach',label:'Mini Coach AI',title:'Smart Suggestions',body:'Skeleton only: future assistant can review timelines, goals, PBs, and training history.',foot:'Bookmark: staff-reviewed advice only.'},
      {tool:'needs-attention',label:'Needs Attention',title:needsAttentionRows().length+' flagged',body:'Open flagged students with practical follow-up reasons.',foot:'Click to review and add notes.'},
      {tool:'close-award',label:'Close To Award',title:closeAwardRows().length+' runners nearby',body:'Review students within 8 laps of the next milestone.',foot:'Click to notify student profiles.'},
      {tool:'training-not-opened',label:'Training Not Opened',title:trainingNotOpenedRows().length+' pending views',body:'See assigned tasks that have not been opened.',foot:'Click for reminder notes.'},
      {tool:'personal-bests',label:'Personal Bests',title:personalBestRows().length+' PB markers',body:'Review recent PBs across athletics and carnival results.',foot:'Click for celebration or next-step notes.'},
      {tool:'class-trends',label:'Class Trends',title:(classTrendRows(1)[0]&&classTrendRows(1)[0].group)||'No class yet',body:'Compare participation, progress, and award readiness by class.',foot:'Click for class-level notes.'},
      {tool:'celebration-wall',label:'Celebration Wall',title:'Review candidates',body:'Moderated list of awards and PBs worth celebrating.',foot:'Click to prepare staff-reviewed shout-outs.',wide:true}
    ];
    target.innerHTML=cards.map(function(card){
      var content='<span>'+escapeHtml(card.label)+'</span><h3>'+escapeHtml(card.title)+'</h3><p>'+escapeHtml(card.body)+'</p><small>'+escapeHtml(card.foot)+'</small>';
      if(card.tool==='mini-coach'){return '<article class="future-skeleton-card">'+content+'</article>';}
      return '<button type="button" class="future-skeleton-card coach-tool-card '+(card.wide?'future-skeleton-card--wide':'')+'" data-coach-tool="'+escapeAttr(card.tool)+'">'+content+'</button>';
    }).join('');
    Array.prototype.forEach.call(target.querySelectorAll('[data-coach-tool]'),function(card){
      card.addEventListener('click',function(e){renderCoachToolModal.trigger=e.currentTarget;renderCoachToolModal(card.dataset.coachTool);renderCoachToolModal.trigger=null;});
    });
    renderCoachNotes();
  }

  if(coachToolModalEl){
    document.getElementById('close-coach-tool-modal-btn').addEventListener('click',closeCoachToolModal);
    coachToolModalEl.addEventListener('click',function(e){if(e.target===coachToolModalEl){closeCoachToolModal();}});
  }
  if(coachToolNoteFormEl){
    coachToolNoteFormEl.addEventListener('submit',function(e){
      e.preventDefault();
      saveCoachNoteWithBackend(coachToolNoteScopeEl.value,coachToolNoteTextEl.value).then(function(result){
        if(!result.ok){showResult(coachToolResultEl,{success:false,error:result.error||result.reason||'Coach note failed.'});return;}
        var row=result.coach_note;
        coachToolNoteTextEl.value='';
        renderCoachNotes();
        showResult(coachToolResultEl,{success:true,message:'Coach note saved.',scope:row.scope,backend:result.local?'local':'synced'});
      });
    });
  }

  function renderAuditTrail(){
    var rows=(window.RunClubScan&&window.RunClubScan.scanAudit?window.RunClubScan.scanAudit():load(K.scanAudit,[])).slice().reverse().slice(0,12);
    if(!rows.length){auditTrailListEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No scan audit rows yet.</p>';return;}
    auditTrailListEl.innerHTML='<table style="width:100%;border-collapse:collapse;font-size:0.82rem;"><thead><tr style="background:#f4f6fb;"><th style="text-align:left;padding:0.4rem;">Time</th><th>Student</th><th>Barcode</th><th>Scanner</th><th>Status</th></tr></thead><tbody>'+
      rows.map(function(row){
        return '<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:0.4rem;">'+new Date(row.time).toLocaleString()+'</td><td>'+escapeHtml(row.student_name||'')+'</td><td>'+escapeHtml(row.barcode||'')+'</td><td>'+escapeHtml(row.scanner_id||'')+'</td><td>'+(row.undo?'Undo':(row.success?'Logged':(row.duplicate?'Duplicate':'Error')))+'</td></tr>';
      }).join('')+'</tbody></table>';
  }
  renderAuditTrail();

  function renderSchoolSummary(){
    var students=getStudents();
    var totalLaps=students.reduce(function(a,s){return a+s.laps;},0);
    var totalKmAll=students.reduce(function(a,s){return a+totalKm(s);},0);
    var marathonEq=(totalKmAll/42.195).toFixed(2);
    var participants=students.filter(function(s){return s.laps>0;}).length;
    schoolSummaryEl.innerHTML=
      '<div style="display:flex;gap:1rem;flex-wrap:wrap;">'+
      '<div class="stat-box"><div class="stat-value">'+totalLaps+'</div><div class="stat-label">Total laps</div></div>'+
      '<div class="stat-box"><div class="stat-value">'+totalKmAll.toFixed(1)+'</div><div class="stat-label">Total km</div></div>'+
      '<div class="stat-box"><div class="stat-value">'+marathonEq+'</div><div class="stat-label">Marathon equivalents</div></div>'+
      '<div class="stat-box"><div class="stat-value">'+participants+'</div><div class="stat-label">Active runners</div></div>'+
      '<div class="stat-box"><div class="stat-value">'+students.length+'</div><div class="stat-label">Total enrolled</div></div>'+
      '</div>';
  }
  renderSchoolSummary();
  renderReportSummaries();
  renderSummaryDashboards();
  renderAdminAnalytics();
  renderFutureIntelligenceSkeleton();
  renderMultiSchoolReports();
  renderBrandingSettings();
  renderBackendReadiness();
  populateFullHistoryStudents();
  populateClassReportSelect();
  populateAdjustmentStudents();
  renderFullStudentHistory();
  renderAttendanceSummary();
  renderAdjustmentLedger();
  renderOnboarding();

  document.getElementById('export-report-json-btn').addEventListener('click',function(){
    dlJson('runclub-report-'+new Date().toISOString().slice(0,10)+'.json',{
      exported_at:new Date().toISOString(),
      students:getStudents(),
      activity_logs:load(K.activity,[]),
      events:load(K.events,[]),
      challenges:load(K.challenges,[]),
      timed_runs:load(K.timedRuns,[]),
      athletics_results:athleticsResults(),
      cross_country_courses:crossCountryCourses(),
      builder_workouts:builderWorkouts(),
      sessions:load(K.sessions,[]),
      scan_audit:load(K.scanAudit,[]),
      scanner_settings:scannerSettings(),
      program_settings:programSettings(),
      summaries:{classes:groupedSummary('cls'),years:groupedSummary('year'),medals:medalSummaryRows(),certificates:certificateRows()}
    });
    showResult(reportsResultEl,{success:true,message:'Full JSON report exported.'});
  });

  document.getElementById('export-report-csv-btn').addEventListener('click',function(){
    var sorted=getStudents().slice().sort(function(a,b){return b.laps-a.laps;});
    var ranked=sorted.map(function(s,i){return{rank:i+1,name:s.name,year:s.year,class:s.cls,laps:s.laps,km:lapsTokm(s.laps).toFixed(2),total_km:totalKm(s).toFixed(2)};});
    dlCsv('leaderboard-'+new Date().toISOString().slice(0,10)+'.csv',ranked,['rank','name','year','class','laps','km','total_km']);
    showResult(reportsResultEl,{success:true,message:'CSV leaderboard exported.'});
  });

  document.getElementById('export-activity-csv-btn').addEventListener('click',function(){
    var logs=load(K.activity,[]);
    dlCsv('activity-'+new Date().toISOString().slice(0,10)+'.csv',logs,['date','student_name','activity_type','minutes','km']);
    showResult(reportsResultEl,{success:true,message:'Activity CSV exported.'});
  });

  document.getElementById('export-audit-csv-btn').addEventListener('click',function(){
    var rows=load(K.scanAudit,[]);
    dlCsv('scan-audit-'+new Date().toISOString().slice(0,10)+'.csv',rows,['time','scanner_id','source','barcode','student_id','student_name','success','duplicate','error','laps_after']);
    showResult(reportsResultEl,{success:true,message:'Scan audit CSV exported.'});
  });

  document.getElementById('export-class-summary-csv-btn').addEventListener('click',function(){
    var classRows=groupedSummary('cls').map(function(row){return {type:'class',group:row.group,students:row.students,laps:row.laps,km:row.km,certificates:row.certificates};});
    var yearRows=groupedSummary('year').map(function(row){return {type:'year',group:row.group,students:row.students,laps:row.laps,km:row.km,certificates:row.certificates};});
    dlCsv('class-year-summary-'+new Date().toISOString().slice(0,10)+'.csv',classRows.concat(yearRows),['type','group','students','laps','km','certificates']);
    showResult(reportsResultEl,{success:true,message:'Class and year summary CSV exported.'});
  });

  document.getElementById('export-medal-summary-csv-btn').addEventListener('click',function(){
    dlCsv('medal-summary-'+new Date().toISOString().slice(0,10)+'.csv',medalSummaryRows(),['medal','students','minimum_km']);
    showResult(reportsResultEl,{success:true,message:'Medal summary CSV exported.'});
  });

  document.getElementById('export-certificate-csv-btn').addEventListener('click',function(){
    dlCsv('certificate-readiness-'+new Date().toISOString().slice(0,10)+'.csv',certificateRows(),['student','year','class','milestone','km','total_km']);
    showResult(reportsResultEl,{success:true,message:'Certificate readiness CSV exported.'});
  });
  document.getElementById('export-carnival-results-csv-btn').addEventListener('click',exportCarnivalResultsCsv);
  document.getElementById('export-cross-country-csv-btn').addEventListener('click',exportCrossCountryCsv);

  fullHistoryStudentEl.addEventListener('change',renderFullStudentHistory);
  document.getElementById('refresh-full-history-btn').addEventListener('click',renderFullStudentHistory);
  document.getElementById('export-full-history-csv-btn').addEventListener('click',exportFullStudentHistoryCsv);
  document.getElementById('export-term-progress-csv-btn').addEventListener('click',exportTermProgressCsv);
  document.getElementById('print-term-progress-btn').addEventListener('click',printTermProgress);
  document.getElementById('print-class-report-btn').addEventListener('click',printClassReport);
  if(printLaunchReadinessBtn){printLaunchReadinessBtn.addEventListener('click',printLaunchReadiness);}
  document.getElementById('print-award-pack-btn').addEventListener('click',printAwardPack);
  document.getElementById('export-certificate-batch-csv-btn').addEventListener('click',function(){
    dlCsv('certificate-batch-'+new Date().toISOString().slice(0,10)+'.csv',certificateBatchRows(),['batch_rank','student','year','class','milestone','km','total_km','printed']);
    showResult(reportsResultEl,{success:true,message:'Certificate batch CSV exported.'});
  });
  document.getElementById('export-attendance-csv-btn').addEventListener('click',function(){
    dlCsv('session-attendance-'+new Date().toISOString().slice(0,10)+'.csv',sessionAttendanceRows(),['date','session','students','scans','participation']);
    showResult(reportsResultEl,{success:true,message:'Attendance CSV exported.'});
  });
  multiSchoolFilterEl.addEventListener('change',renderMultiSchoolReports);
  document.getElementById('export-multi-school-csv-btn').addEventListener('click',exportMultiSchoolCsv);
  brandingFormEl.addEventListener('submit',saveBrandingSettings);
  document.getElementById('reset-branding-btn').addEventListener('click',resetBrandingSettings);
  adjustmentFormEl.addEventListener('submit',createManualAdjustment);
  document.getElementById('download-admin-templates-btn').addEventListener('click',downloadAdminTemplates);

  document.getElementById('print-report-btn').addEventListener('click',function(){ window.print(); });

  // === IMPORT ===
  var importResultEl=document.getElementById('import-result');
  var importSummaryEl=document.getElementById('import-summary');
  var compassImportResultEl=document.getElementById('compass-import-result');
  var compassImportSummaryEl=document.getElementById('compass-import-summary');

  function normalizeImportCell(value){
    return String(value||'').trim().replace(/\s+/g,' ');
  }

  function parseCsvLine(line){
    var cells=[];
    var value='';
    var inQuotes=false;
    for(var i=0;i<line.length;i++){
      var ch=line.charAt(i);
      var next=line.charAt(i+1);
      if(ch==='"'&&inQuotes&&next==='"'){value+='"';i+=1;}
      else if(ch==='"'){inQuotes=!inQuotes;}
      else if(ch===','&&!inQuotes){cells.push(value);value='';}
      else{value+=ch;}
    }
    cells.push(value);
    return cells.map(normalizeImportCell);
  }

  function rosterDuplicateKey(first,last,year,cls){
    return [first,last,year,cls].map(function(part){return normalizeImportCell(part).toLowerCase();}).join('|');
  }

  function renderImportSummary(summary){
    importSummaryEl.hidden=false;
    importSummaryEl.innerHTML=
      '<div class="import-summary-grid">'+
        '<div><strong>'+summary.added+'</strong><span>Added</span></div>'+
        '<div><strong>'+summary.duplicates+'</strong><span>Duplicates</span></div>'+
        '<div><strong>'+summary.invalid+'</strong><span>Invalid</span></div>'+
        '<div><strong>'+summary.total+'</strong><span>Total roster</span></div>'+
      '</div>'+
      (summary.skipped_details.length?'<details open><summary>Skipped rows</summary><ul>'+summary.skipped_details.map(function(item){
        return '<li>Row '+item.row+': '+escapeHtml(item.name||'Unnamed row')+' - '+escapeHtml(item.reason)+'</li>';
      }).join('')+'</ul></details>':'<p class="success-message">No duplicates or invalid rows found.</p>');
  }

  function privacyDefaults(){
    return {pseudonym:'',preferred_name:'',consent_status:'pending',hide_public_name:false,share_certificates_publicly:false};
  }

  function compassStudentFromRow(headers,cols){
    function at(names){
      for(var i=0;i<names.length;i++){
        var idx=headers.indexOf(names[i]);
        if(idx>=0){return normalizeImportCell(cols[idx]);}
      }
      return '';
    }
    var first=at(['preferredname','firstname','first']);
    var last=at(['surname','lastname','last']);
    var year=at(['yearlevel','yeargroup','year']);
    var cls=at(['homegroup','classname','class']);
    var school=at(['school','campus','schoolname']);
    return {first:first,last:last,year:year,cls:cls.toUpperCase(),school:school||programSettings().schoolName};
  }

  function importCompassCsv(e){
    e.preventDefault();
    var file=document.getElementById('compass-csv-file').files[0];
    if(!file){showResult(compassImportResultEl,{success:false,error:'Select an authorised Compass CSV file.'});return;}
    var reader=new FileReader();
    reader.onload=function(ev){
      var lines=ev.target.result.split('\n').map(function(l){return l.trim();}).filter(Boolean);
      if(!lines.length){showResult(compassImportResultEl,{success:false,error:'Empty file.'});return;}
      var headers=parseCsvLine(lines[0]).map(function(h){return h.toLowerCase().replace(/\s+/g,'');});
      var students=getStudents();
      var existingKeys={};
      students.forEach(function(s){existingKeys[rosterDuplicateKey(s.first,s.last,s.year,s.cls)]=true;});
      var added=0; var duplicates=0; var invalid=0; var skippedDetails=[];
      var importedStudents=[];
      lines.slice(1).forEach(function(line,index){
        var rowNumber=index+2;
        var mapped=compassStudentFromRow(headers,parseCsvLine(line));
        var name=mapped.first+' '+mapped.last;
        if(!mapped.first||!mapped.last||!mapped.year||!mapped.cls){
          invalid++;
          skippedDetails.push({row:rowNumber,name:name.trim(),reason:'Missing preferred name, surname, year level, or home group'});
          return;
        }
        var key=rosterDuplicateKey(mapped.first,mapped.last,mapped.year,mapped.cls);
        if(existingKeys[key]){
          duplicates++;
          skippedDetails.push({row:rowNumber,name:name,reason:'Already exists in roster'});
          return;
        }
        var id=generateBarcodeId(mapped.first,mapped.last,students);
        var importedStudent=Object.assign({id:id,barcode:id,first:mapped.first,last:mapped.last,name:name,year:mapped.year,cls:mapped.cls,school:mapped.school,laps:0,minutes:0,events:[]},privacyDefaults());
        students.push(importedStudent);
        importedStudents.push(importedStudent);
        existingKeys[key]=true;
        added++;
      });
      var summary={success:true,added:added,duplicates:duplicates,invalid:invalid,total:students.length,skipped_details:skippedDetails};
      importStudentsWithBackend(students,importedStudents).then(function(result){
        if(!result.ok){showResult(compassImportResultEl,{success:false,error:result.error||result.reason||'Local roster import blocked.'});return;}
        refreshStudentViews();
        showResult(compassImportResultEl,summary);
        compassImportResultEl.hidden=true;
        compassImportSummaryEl.hidden=false;
        compassImportSummaryEl.innerHTML=importSummaryEl.innerHTML;
        renderImportSummary(summary);
        compassImportSummaryEl.innerHTML=importSummaryEl.innerHTML;
        importSummaryEl.hidden=true;
      });
    };
    reader.readAsText(file);
  }

  function downloadCompassTemplate(e){
    e.preventDefault();
    dlCsv('compass-class-list-template.csv',[
      {'Preferred Name':'James',Surname:'Smith','Year Level':'Year 5','Home Group':'5B',School:'Gwynne Park Schools'}
    ],['Preferred Name','Surname','Year Level','Home Group','School']);
  }

  document.getElementById('import-form').addEventListener('submit',function(e){
    e.preventDefault();
    var file=document.getElementById('csv-file').files[0];
    if(!file){showResult(importResultEl,{success:false,error:'Select a CSV file.'});return;}
    var reader=new FileReader();
    reader.onload=function(ev){
      var lines=ev.target.result.split('\n').map(function(l){return l.trim();}).filter(Boolean);
      if(!lines.length){showResult(importResultEl,{success:false,error:'Empty file.'});return;}
      var headers=parseCsvLine(lines[0]).map(function(h){return h.toLowerCase().replace(/\s+/g,'');});
      var fi=headers.indexOf('firstname'); var li=headers.indexOf('lastname');
      var yi=headers.indexOf('yeargroup'); var ci=headers.indexOf('classname');
      if(fi<0||li<0||yi<0||ci<0){showResult(importResultEl,{success:false,error:'Missing columns. Need: firstname,lastname,yeargroup,classname'});return;}
      var students=getStudents();
      var existingKeys={};
      students.forEach(function(s){existingKeys[rosterDuplicateKey(s.first,s.last,s.year,s.cls)]=true;});
      var fileKeys={};
      var added=0; var duplicates=0; var invalid=0; var skippedDetails=[];
      var importedStudents=[];
      lines.slice(1).forEach(function(line,index){
        var rowNumber=index+2;
        var cols=parseCsvLine(line);
        var first=normalizeImportCell(cols[fi]); var last=normalizeImportCell(cols[li]); var year=normalizeImportCell(cols[yi]); var cls=normalizeImportCell(cols[ci]).toUpperCase();
        var name=first+' '+last;
        if(!first||!last||!year||!cls){
          invalid++;
          skippedDetails.push({row:rowNumber,name:name.trim(),reason:'Missing first name, last name, year group, or class'});
          return;
        }
        var key=rosterDuplicateKey(first,last,year,cls);
        if(existingKeys[key]){
          duplicates++;
          skippedDetails.push({row:rowNumber,name:name,reason:'Already exists in roster'});
          return;
        }
        if(fileKeys[key]){
          duplicates++;
          skippedDetails.push({row:rowNumber,name:name,reason:'Duplicate row in this CSV'});
          return;
        }
        var id=generateBarcodeId(first,last,students);
        var importedStudent=Object.assign({id:id,barcode:id,first:first,last:last,name:name,year:year,cls:cls,school:programSettings().schoolName,laps:0,minutes:0,events:[]},privacyDefaults());
        students.push(importedStudent);
        importedStudents.push(importedStudent);
        existingKeys[key]=true;
        fileKeys[key]=true;
        added++;
      });
      var summary={success:true,added:added,duplicates:duplicates,invalid:invalid,total:students.length,skipped_details:skippedDetails};
      importStudentsWithBackend(students,importedStudents).then(function(result){
        if(!result.ok){showResult(importResultEl,{success:false,error:result.error||result.reason||'Local roster import blocked.'});return;}
        refreshStudentViews();
        showResult(importResultEl,summary);
        importResultEl.hidden=true;
        renderImportSummary(summary);
      });
    };
    reader.readAsText(file);
  });

  // CSV Template download
  document.getElementById('download-template').addEventListener('click',function(e){
    e.preventDefault();
    var csv='firstname,lastname,yeargroup,classname\nJames,Smith,Year 5,5B\nSarah,Johnson,Year 5,5B\nTom,VanDenberghe,Year 6,6A';
    var b=new Blob([csv],{type:'text/csv'});
    var u=URL.createObjectURL(b); var a=document.createElement('a');
    a.href=u; a.download='roster-template.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u);
  });
  document.getElementById('compass-import-form').addEventListener('submit',importCompassCsv);
  document.getElementById('download-compass-template').addEventListener('click',downloadCompassTemplate);

  // Barcode cards print
  document.getElementById('print-barcodes-btn').addEventListener('click',function(){
    var students=getStudents();
    var win=window.open('','_blank');
    if(!win){return;}
    var html='<html><head><title>Barcode / QR ID Cards</title><style>@page{size:A4;margin:10mm;}*{box-sizing:border-box;}body{font-family:Arial,sans-serif;padding:0;margin:0;color:#102a43;}.cards{display:flex;flex-wrap:wrap;gap:6mm;align-items:flex-start;}.barcode-card-print{width:85.6mm;height:53.98mm;border:0.35mm solid #0c5aa8;padding:4mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:1.2mm;break-inside:avoid;page-break-inside:avoid;}.barcode-card-school{font-size:3mm;font-weight:700;color:#0c5aa8;text-transform:uppercase;}.barcode-card-name{font-size:4.8mm;line-height:1.1;}.barcode-card-meta{font-size:2.9mm;color:#52616b;}.barcode-qr-row{display:flex;align-items:center;justify-content:center;gap:3mm;width:100%;}.barcode-bars{height:13mm;display:flex;align-items:stretch;justify-content:center;gap:0.45mm;width:54mm;margin-top:1mm;}.barcode-bars span{display:block;background:#0b1f38;height:100%;}.qr-code svg{display:block;width:18mm;height:18mm;}.qr-code-fallback{border:0.3mm solid #0b1f38;padding:2mm;font-size:2.2mm;}.barcode-code{font-family:Consolas,monospace;font-size:4.2mm;font-weight:700;letter-spacing:0.45mm;color:#0b1f38;}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}</style></head><body>';
    html+='<div class="cards">';
    students.forEach(function(s){
      var code=s.barcode||s.id;
      html+='<div class="barcode-card-print"><div class="barcode-card-school">Gwynne Park Run Club</div><strong class="barcode-card-name">'+escapeHtml(s.name)+'</strong><div class="barcode-card-meta">'+escapeHtml(s.year)+' / '+escapeHtml(s.cls)+'</div><div class="barcode-qr-row">'+barcodeBarsHtml(code)+qrCodeHtml(code)+'</div><div class="barcode-code">'+escapeHtml(code)+'</div></div>';
    });
    html+='</div></body></html>';
    win.document.write(html); win.document.close(); win.focus(); win.print();
  });

})();
