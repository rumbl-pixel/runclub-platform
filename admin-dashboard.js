// admin-dashboard.js
// Full local-first admin dashboard inspired by Marathon Kids + StrideTrack
(function () {

  // --- Auth gate ---
  function getSession() {
    try { return JSON.parse(localStorage.getItem('runClubAdminSession')); } catch { return null; }
  }
  var session = getSession();
  if (!session) { window.location.href = 'admin.html'; return; }
  function sessionAccessLabel(currentSession) {
    if (!currentSession) { return ''; }
    if (currentSession.role === 'platform_admin' || currentSession.access_scope === 'platform') {
      return 'Platform admin access - all schools';
    }
    if (currentSession.role === 'coach' || currentSession.access_scope === 'school') {
      return 'Coach access - school scope ' + (currentSession.school_id || 'not set');
    }
    return 'Demo access - local sample data only';
  }
  document.getElementById('session-label').textContent = (session.username || session.email || 'Signed in') + ' · ' + sessionAccessLabel(session);
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
  var COACH_FOLLOWUPS_KEY = 'rc_coach_followups';
  var STUDENT_NOTIFICATIONS_KEY = 'rc_student_notifications';
  var CROSS_COUNTRY_COURSES_KEY = 'rc_cross_country_courses';
  var ATHLETICS_RESULTS_KEY = 'rc_athletics_results';
  var ATHLETICS_TEAM_SELECTIONS_KEY = 'rc_athletics_team_selections';
  var ATHLETICS_CONSENT_SELECTIONS_KEY = 'rc_athletics_consent_selections';
  var CROSS_COUNTRY_VISIBLE_KEY = 'rc_cross_country_visible';
  var BUILDER_WORKOUTS_KEY = 'rc_builder_workouts';
  var RESOURCE_SESSION_PLANS_KEY = 'rc_resource_session_plans';
  var COMPLIANCE_CHECKLIST_KEY = 'rc_compliance_checklist';
  var SCHOOL_SIGNUP_KEY = 'rc_school_admin_signup';
  var BREACH_LOG_KEY = 'rc_breach_log';
  var THEME_SETTINGS_KEY = 'rc_theme_settings';
  var DEFAULT_RUN_CLUB_NAME = 'School Run Club';
  var DEFAULT_BRAND_LOGO = 'assets/corso-logo.png';

  function schedulePrintWindow(printWin) {
    var trigger = function () {
      setTimeout(function () {
        try { printWin.focus(); printWin.print(); } catch (error) {}
      }, 120);
    };
    if (printWin.document.readyState === 'complete') { trigger(); }
    else { printWin.addEventListener('load', trigger, { once: true }); }
  }

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

  var WARMUP_MOBILITY_DRILLS = [
    {id:'easy-jog',title:'Easy jog or skip',minutes:2,cue:'Raise temperature with relaxed movement'},
    {id:'leg-swings',title:'Leg swings',minutes:1,cue:'Front/back and side swings for hip mobility'},
    {id:'walking-lunges',title:'Walking lunges',minutes:2,cue:'Tall chest, soft knee, controlled steps'},
    {id:'ankling',title:'Ankling',minutes:2,cue:'Quick toe-to-heel contacts under the hips'},
    {id:'high-knees',title:'High knees',minutes:2,cue:'Drive knee up, foot snaps down under body'},
    {id:'butt-kicks',title:'Butt kicks',minutes:2,cue:'Heel recovers under the body, relaxed posture'},
    {id:'a-skips',title:'A-skips',minutes:2,cue:'Tall posture, knee drive, coordinated arm swing'},
    {id:'b-skips',title:'B-skips',minutes:2,cue:'Lift, extend, then paw foot down under hips'},
    {id:'straight-leg-run',title:'Straight-leg run',minutes:2,cue:'Stiff ankle, gentle pawing action, no leaning back'},
    {id:'carioca',title:'Carioca / grapevine',minutes:2,cue:'Sideways rhythm to open hips and trunk'},
    {id:'lateral-shuffle',title:'Lateral shuffle',minutes:2,cue:'Stay low, face forward, quick feet both ways'},
    {id:'build-up-strides',title:'Build-up strides',minutes:3,cue:'2 to 3 relaxed accelerations before faster work'}
  ];
  var DEFAULT_WARMUP_DRILL_IDS = ['easy-jog','leg-swings','ankling','high-knees','butt-kicks','a-skips','b-skips','build-up-strides'];
  var selectedWarmupDrillIds = DEFAULT_WARMUP_DRILL_IDS.slice();

  function selectedWarmupDrills(){
    return WARMUP_MOBILITY_DRILLS.filter(function(drill){return selectedWarmupDrillIds.indexOf(drill.id)!==-1;});
  }

  function warmupMobilityComponent(){
    var drills=selectedWarmupDrills();
    var detail=drills.map(function(drill){return drill.title+' - '+drill.cue;}).join(' | ');
    return {id:'warmup-mobility',title:'Mobility Warm-up',minutes:Math.max(5,drills.reduce(function(sum,drill){return sum+drill.minutes;},0)),focus:'Prep',detail:detail||'Select warm-up drills from the checkbox library'};
  }

  var TRAINING_LIBRARY_COMPONENTS = [
    warmupMobilityComponent(),
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
  function themeSettings(){
    var saved=load(THEME_SETTINGS_KEY,{});
    return {appTitle:String(saved.appTitle||DEFAULT_RUN_CLUB_NAME).trim()||DEFAULT_RUN_CLUB_NAME};
  }
  function applyThemeSettings(){
    var settings=themeSettings();
    document.querySelectorAll('.brand h1').forEach(function(el){el.textContent='Corso';});
    document.querySelectorAll('.brand-logo, .kiosk-brand-logo').forEach(function(img){img.src=DEFAULT_BRAND_LOGO; img.alt='Corso';});
    document.querySelectorAll('.school-switcher').forEach(function(el){el.innerHTML=escapeHtml(settings.appTitle)+' <span aria-hidden="true">⌄</span>';});
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

  function getStudents() {
    var students = load(K.students, defaultStudents());
    // Backfill login credentials for rosters created before student login existed.
    // Persist once so generated passwords stay stable across reads.
    var changed = false;
    students.forEach(function (s) {
      if (!s.username) { s.username = generateStudentUsername(s.first, s.last, students); changed = true; }
      if (!s.password) { s.password = generateStudentPassword(); changed = true; }
    });
    if (changed) { save(K.students, students); }
    return students;
  }
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
  function resultMetaText(payload){
    if(!payload||typeof payload!=='object'){return '';}
    return Object.keys(payload).filter(function(key){
      return ['success','message','error'].indexOf(key)===-1;
    }).map(function(key){
      var value=payload[key];
      if(value&&typeof value==='object'){
        if(Array.isArray(value)){value=value.length+' items';}
        else if(value.name){value=value.name;}
        else if(value.title){value=value.title;}
        else {value=Object.keys(value).length+' details';}
      }
      return key.replace(/_/g,' ')+': '+String(value);
    }).join(' · ');
  }

  function showResult(el,payload) {
    var success=!(payload&&payload.success===false);
    var message=payload&&payload.error?payload.error:(payload&&payload.message?payload.message:(success?'Saved.':'Something needs attention.'));
    showInlineStatus(el,success,message,resultMetaText(payload));
  }

  function showInlineStatus(el,success,message,meta){
    if(!el){return;}
    el.hidden=false;
    el.classList.toggle('inline-save-status--success',success!==false);
    el.classList.toggle('inline-save-status--error',success===false);
    el.innerHTML='<strong>'+escapeHtml(message||'Saved.')+'</strong>'+(meta?'<span>'+escapeHtml(meta)+'</span>':'');
  }

  function openAdminModalAt(overlay, trigger){
    if(!overlay){return;}
    overlay.style.removeProperty('--modal-top');
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
      '<div class="barcode-card-school">Corso</div>' +
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
      '<div class="barcode-card-school">Corso</div>' +
      '<strong class="barcode-card-name">' + escapeHtml(student.name) + '</strong>' +
      '<div class="barcode-card-meta">' + escapeHtml(student.year) + ' / ' + escapeHtml(student.cls) + '</div>' +
      '<div class="barcode-qr-row">' + barcodeBarsHtml(code) + qrCodeHtml(code) + '</div>' +
      '<div class="barcode-code">' + escapeHtml(code) + '</div>' +
      '</div></body></html>';
    win.document.write(html);
    win.document.close();
    schedulePrintWindow(win);
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

  // Student login username: FirstName + LastInitial + number (e.g. JamesS1).
  // Collision-safe across the roster's existing usernames. Barcodes are NOT
  // login credentials any more - they stay purely for lap-tracking scans.
  function generateStudentUsername(first, last, students) {
    var firstPart = String(first || '').replace(/[^A-Za-z0-9]/g, '');
    var initial = String(last || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 1);
    var stem = (firstPart.charAt(0).toUpperCase() + firstPart.slice(1).toLowerCase()) + initial.toUpperCase();
    if (!stem) { stem = 'Runner'; }
    var used = {};
    (students || []).forEach(function (s) {
      if (s && s.username) { used[String(s.username).toLowerCase()] = true; }
    });
    var n = 1;
    var candidate = stem + n;
    while (used[candidate.toLowerCase()]) {
      n += 1;
      candidate = stem + n;
    }
    return candidate;
  }

  // Kid-friendly generic password: Colour/adjective + Animal + 2 digits
  // (e.g. BlueFox42). Easy to read off a card and type; per student, not shared.
  var PASSWORD_ADJECTIVES = ['Blue','Green','Happy','Brave','Sunny','Swift','Lucky','Calm','Bright','Cosy','Jolly','Kind','Bold','Mighty','Speedy'];
  var PASSWORD_NOUNS = ['Fox','Lion','Panda','Tiger','Otter','Koala','Dolphin','Falcon','Bear','Rocket','Comet','Maple','River','Cloud','Star'];
  function randomFrom(list) { return list[Math.floor(Math.random() * list.length)]; }
  function generateStudentPassword() {
    var digits = String(Math.floor(Math.random() * 90) + 10); // 10-99
    return randomFrom(PASSWORD_ADJECTIVES) + randomFrom(PASSWORD_NOUNS) + digits;
  }

  // Attach login credentials to a freshly created/imported student in demo mode.
  // Stored locally so the coach can print them and the student login can match.
  // (In live mode the csv_import edge function creates the real Supabase Auth
  // account and the plaintext password is only returned once, never stored.)
  function assignStudentCredentials(student, students) {
    if (!student.username) {
      student.username = generateStudentUsername(student.first, student.last, students);
    }
    if (!student.password) {
      student.password = generateStudentPassword();
    }
    return student;
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

  function corsoLocalStorageKeys(){
    var keys=[];
    for(var i=0;i<localStorage.length;i+=1){
      var key=localStorage.key(i);
      if(!key){continue;}
      if(key==='runClubAdminSession' || key==='gp_run_club_theme'){continue;}
      if(key.indexOf('rc_')===0 || key.indexOf('runClub')===0 || key.indexOf('gp_run_club')===0){
        keys.push(key);
      }
    }
    return keys.sort();
  }

  function exportDemoSnapshot(){
    var keys=corsoLocalStorageKeys();
    var data={
      exported_at:new Date().toISOString(),
      app:'Corso',
      mode:'demo-local-storage',
      warning:'Demo/local browser snapshot only. Do not include real student data.',
      keys:{}
    };
    keys.forEach(function(key){
      var raw=localStorage.getItem(key);
      try{data.keys[key]=JSON.parse(raw);}catch(e){data.keys[key]=raw;}
    });
    dlJson('corso-demo-snapshot-'+new Date().toISOString().slice(0,10)+'.json',data);
    showResult(document.getElementById('demo-data-result'),{success:true,message:'Demo snapshot exported.',keys:keys.length});
  }

  function resetDemoData(){
    var message='Reset Corso demo data in this browser? This clears local students, scans, training, sports, guardian links, reports, compliance notes, and school branding overrides. Export a snapshot first if you need to keep this test state.';
    if(!confirm(message)){return;}
    corsoLocalStorageKeys().forEach(function(key){localStorage.removeItem(key);});
    localStorage.removeItem('studentSession');
    localStorage.removeItem('parentSession');
    showResult(document.getElementById('demo-data-result'),{success:true,message:'Demo data reset. Reloading sample state...'});
    window.setTimeout(function(){window.location.href='admin-dashboard.html?tab=school-admin&section=help&qa=demo-reset';},700);
  }

  // --- TABS ---
  var tabBtns = document.querySelectorAll('.tab-btn');
  var coachHubTabs = document.querySelectorAll('[data-coach-section]');
  var adminHubTabs = document.querySelectorAll('.admin-hub-tab');
  var tabPanels = document.querySelectorAll('.tab-panel');
  var coachHubSections = ['sports','training','resources','future-intelligence'];
  var activeCoachHubSection = 'sports';
  var adminHubSections = ['reports','school-settings','compliance','import','help'];
  var activeAdminHubSection = 'reports';
  function isCoachHubSection(tabName){
    return coachHubSections.indexOf(tabName)!==-1;
  }
  function isAdminHubSection(tabName){
    return adminHubSections.indexOf(tabName)!==-1;
  }
  function setProgrammingCoachWidgetVisibility(tabName){
    var widget=document.getElementById('resource-mini-coach-widget');
    if(widget){widget.hidden=tabName!=='resources';}
  }
  function activateCoachHubSection(sectionName){
    if(!isCoachHubSection(sectionName)){sectionName='sports';}
    activeCoachHubSection=sectionName;
    coachHubTabs.forEach(function(btn){
      var active=btn.dataset.coachSection===sectionName;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-selected',String(active));
    });
    coachHubSections.forEach(function(section){
      var panel=document.getElementById('tab-'+section);
      if(panel){panel.classList.toggle('active',section===sectionName);}
    });
    setProgrammingCoachWidgetVisibility(sectionName);
  }
  function activateAdminHubSection(sectionName){
    if(!isAdminHubSection(sectionName)){sectionName='reports';}
    activeAdminHubSection=sectionName;
    adminHubTabs.forEach(function(btn){
      var active=btn.dataset.adminSection===sectionName;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-selected',String(active));
    });
    adminHubSections.forEach(function(section){
      var panel=document.getElementById('tab-'+section);
      if(panel){panel.classList.toggle('active',section===sectionName);}
    });
    setProgrammingCoachWidgetVisibility(sectionName);
  }
  function activateAdminTab(tabName) {
    var requestedSection=isCoachHubSection(tabName)?tabName:null;
    var requestedAdminSection=isAdminHubSection(tabName)?tabName:null;
    if(requestedSection){tabName='coach-hub';}
    if(requestedAdminSection){tabName='school-admin';}
    var btn = Array.from(tabBtns).find(function(candidate) { return candidate.dataset.tab === tabName; });
    var panel = document.getElementById('tab-' + tabName);
    if (!btn || !panel) { return false; }
    tabBtns.forEach(function(b){b.classList.remove('active');b.setAttribute('aria-selected','false');});
    tabPanels.forEach(function(p){p.classList.remove('active');});
    btn.classList.add('active');
    btn.setAttribute('aria-selected','true');
    panel.classList.add('active');
    if(tabName==='coach-hub'){
      activateCoachHubSection(requestedSection||activeCoachHubSection);
    } else if(tabName==='school-admin'){
      activateAdminHubSection(requestedAdminSection||activeAdminHubSection);
    } else {
      setProgrammingCoachWidgetVisibility(tabName);
    }
    return true;
  }
  tabBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      activateAdminTab(btn.dataset.tab);
    });
  });
  coachHubTabs.forEach(function(btn){
    btn.addEventListener('click',function(){
      activateAdminTab(btn.dataset.coachSection);
    });
  });
  adminHubTabs.forEach(function(btn){
    btn.addEventListener('click',function(){
      activateAdminTab(btn.dataset.adminSection);
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
      '<div><strong>Student added</strong><br><span>'+escapeHtml(student.name)+'</span></div>'+
      '<div class="student-login-credentials">'+
        '<strong>Login details</strong>'+
        '<div class="student-login-row"><span>Username</span><code>'+escapeHtml(student.username||'')+'</code></div>'+
        '<div class="student-login-row"><span>Password</span><code>'+escapeHtml(student.password||'')+'</code></div>'+
        '<small>Give these to the student to log in. The barcode below is for lap scanning only.</small>'+
      '</div>'+
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
    if(/^in-app:\/\//i.test(value)){return value;}
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
        return '<tr><td>'+escapeHtml(student?student.name:studentId)+'</td><td>'+escapeHtml(student?student.year:'')+'</td><td>'+escapeHtml(student?student.cls:'')+'</td><td>'+(completion?'Completed':click?'Opened':'Not opened')+'</td><td>'+escapeHtml(click?new Date(click.opened_at).toLocaleString():'')+'</td><td>'+escapeHtml(completion?new Date(completion.completed_at).toLocaleString():'')+'</td></tr>';
      }).join('');
      return '<div class="training-assignment">'+
        '<div class="training-assignment-head"><div><strong>'+escapeHtml(task.title)+'</strong><br><span>'+escapeHtml(task.notes||'No notes')+'</span></div><a href="'+escapeAttr(task.url)+'" target="_blank" rel="noopener">Open task</a></div>'+
        '<div class="training-meta">'+(task.due_date?'Due '+escapeHtml(task.due_date)+' • ':'')+(task.assigned_student_ids||[]).length+' student(s)</div>'+
        '<table class="training-status-table"><thead><tr><th>Student</th><th>Year</th><th>Class</th><th>Status</th><th>Last opened</th><th>Completed</th></tr></thead><tbody>'+rows+'</tbody></table>'+
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
    var item=componentId==='warmup-mobility'?warmupMobilityComponent():TRAINING_LIBRARY_COMPONENTS.find(function(component){return component.id===componentId;});
    if(!item){return;}
    builderWorkout.push(Object.assign({},item));
    renderWorkoutBuilderDropzone();
  }

  function renderWarmupMobilitySelector(){
    return '<div class="warmup-drill-selector" aria-label="Edit Mobility Warm-up drills">'+
      '<div class="warmup-drill-selector-head"><strong>Edit Mobility Warm-up</strong><span>'+selectedWarmupDrills().length+' selected</span></div>'+
      WARMUP_MOBILITY_DRILLS.map(function(drill){
        var checked=selectedWarmupDrillIds.indexOf(drill.id)!==-1?' checked':'';
        return '<label class="warmup-drill-option"><input class="warmup-drill-check" type="checkbox" value="'+escapeAttr(drill.id)+'"'+checked+' />'+
          '<span><strong>'+escapeHtml(drill.title)+'</strong><small>'+drill.minutes+' min - '+escapeHtml(drill.cue)+'</small></span></label>';
      }).join('')+
    '</div>';
  }

  function renderTrainingLibraryBuilder(){
    if(!trainingLibraryListEl||!workoutBuilderDropzoneEl){return;}
    var libraryComponents=TRAINING_LIBRARY_COMPONENTS.map(function(item){return item.id==='warmup-mobility'?warmupMobilityComponent():item;});
    trainingLibraryListEl.innerHTML=libraryComponents.map(function(item){
      var warmupEditor=item.id==='warmup-mobility'?renderWarmupMobilitySelector():'';
      return '<button type="button" class="training-library-chip" draggable="true" data-component-id="'+escapeAttr(item.id)+'">'+
        '<strong>'+escapeHtml(item.title)+'</strong><span>'+item.minutes+' min - '+escapeHtml(item.focus)+'</span><small>'+escapeHtml(item.detail)+'</small></button>'+warmupEditor;
    }).join('');
    document.querySelectorAll('.training-library-chip').forEach(function(chip){
      chip.addEventListener('click',function(){addBuilderComponent(chip.dataset.componentId);});
      chip.addEventListener('dragstart',function(e){e.dataTransfer.setData('text/plain',chip.dataset.componentId);});
    });
    document.querySelectorAll('.warmup-drill-check').forEach(function(input){
      input.addEventListener('change',function(){
        var checked=Array.prototype.map.call(document.querySelectorAll('.warmup-drill-check:checked'),function(item){return item.value;});
        selectedWarmupDrillIds=checked.length?checked:DEFAULT_WARMUP_DRILL_IDS.slice(0,1);
        renderTrainingLibraryBuilder();
      });
    });
    workoutBuilderDropzoneEl.addEventListener('dragover',function(e){e.preventDefault();});
    workoutBuilderDropzoneEl.addEventListener('drop',function(e){e.preventDefault();addBuilderComponent(e.dataTransfer.getData('text/plain'));});
    renderWorkoutBuilderDropzone();
  }

  function createTrainingAssignmentFromBuilder(){
    if(!builderWorkout.length){showResult(trainingResultEl,{success:false,error:'Add at least one drill to the workout builder.'});return;}
    var title=workoutBuilderTitleEl.value.trim()||builderWorkout.map(function(item){return item.title;}).slice(0,2).join(' + ');
    var total=builderWorkout.reduce(function(sum,item){return sum+Number(item.minutes||0);},0);
    var planText=builderWorkout.map(function(item){return item.title+' - '+item.minutes+' min - '+item.detail;}).join('\n');
    trainingTitleEl.value=title;
    trainingUrlEl.value=workoutBuilderUrlEl.value.trim()||'in-app://training-builder/'+Date.now();
    trainingNotesEl.value=total+' min plan\n'+planText;
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

  var resourceSessionListEl=document.getElementById('resource-session-list');
  var resourceSessionDetailEl=document.getElementById('resource-session-detail');
  var resourcePlanSaveStatusEl=document.getElementById('resource-plan-save-status');
  var resourceMiniCoachWidgetEl=document.getElementById('resource-mini-coach-widget');
  var resourceMiniCoachToggleEl=document.getElementById('resource-mini-coach-toggle');
  var resourceMiniCoachPopoverEl=document.getElementById('resource-mini-coach-popover');
  var resourceMiniCoachCloseEl=document.getElementById('resource-mini-coach-close');
  var resourceMiniCoachSessionEl=document.getElementById('resource-mini-coach-session');
  var resourceMiniCoachSummaryEl=document.getElementById('resource-mini-coach-summary');
  var resourceMiniCoachNotesEl=document.getElementById('resource-mini-coach-notes');
  var resourceMiniCoachActionsEl=document.getElementById('resource-mini-coach-actions');
  var resourceMiniCoachPairingsEl=document.getElementById('resource-mini-coach-pairings');
  var resourceMiniCoachProgramEl=document.getElementById('resource-mini-coach-program');
  var resourceMiniCoachChatLogEl=document.getElementById('resource-mini-coach-chat-log');
  var resourceMiniCoachChatFormEl=document.getElementById('resource-mini-coach-chat-form');
  var resourceMiniCoachChatInputEl=document.getElementById('resource-mini-coach-chat-input');
  var resourceMiniCoachChatHistory=[];
  var resourceMiniCoachGeneratedProgram=null;
  if(resourceMiniCoachWidgetEl&&resourceMiniCoachWidgetEl.parentElement!==document.body){
    document.body.appendChild(resourceMiniCoachWidgetEl);
  }
  var activeTopTab=document.querySelector('.tab-btn.active');
  setProgrammingCoachWidgetVisibility(activeTopTab&&activeTopTab.dataset.tab==='coach-hub'?activeCoachHubSection:(activeTopTab?activeTopTab.dataset.tab:'scanner'));
  var activeResourceSessionId='run-club-session';
  var WA_HPE_CURRICULUM_URL='https://k10outline.scsa.wa.edu.au/home/wa-curriculum/learning-areas/health-and-physical-education/p-10-hpe-curriculum/p-10-hpe-curriculum';
  var ASC_PLAYING_FOR_LIFE_URL='https://www.ausport.gov.au/p4l';
  var ASC_SPORT_LESSON_PLANS_URL='https://www.ausport.gov.au/sport-lesson-plans';
  var WORLD_ATHLETICS_KIDS_URL='https://worldathletics.org/en/kids-athletics/teaching-athletics';
  var AUSTRALIAN_HPE_URL='https://www.australiancurriculum.edu.au/curriculum-information/understand-this-learning-area/health-and-physical-education';
  var SPARK_PE_URL='https://sparkpe.org/free-lesson-downloads/';
  var PE_STATION_IDEAS_URL='https://www.capnpetespowerpe.com/single-post/track-and-field-in-physical-education-10-exciting-pe-activity-stations-that-get-students-fired-up';
  var RESOURCE_PLAN_SECTIONS=[
    {id:'starters',title:'Starters',defaultTarget:8,placeholder:'Warm-up focus, safety reminders, setup notes...'},
    {id:'sessions',title:'Sessions',defaultTarget:18,placeholder:'Main learning block, rotations, coaching cues...'},
    {id:'cooldowns',title:'Cool-downs',defaultTarget:4,placeholder:'Recovery, reflection, pack-up, next steps...'}
  ];
  var RESOURCE_SESSION_TEMPLATES=[
    {
      id:'run-club-session',
      title:'Run Club Session Plan',
      duration:30,
      focus:'Barcode-supported laps, pacing, encouragement, and safe session flow.',
      miniCoach:'Mini Coach: connects steady participation to WA Curriculum HPE movement confidence, active choices, and learning through movement.',
      curriculum:[
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL},
        {label:'Movement and physical activity',url:WA_HPE_CURRICULUM_URL},
        {label:'Making active choices',url:WA_HPE_CURRICULUM_URL}
      ],
      activities:[
        {id:'roll-call',title:'Roll call and safety scan',section:'starters',minutes:3,included:true,detail:'Confirm space, medical flags, scanner device and session type.'},
        {id:'dynamic-warmup',title:'Dynamic warm-up',section:'starters',minutes:6,included:true,detail:'Easy jog, ankling, A-skips, arm swings and movement cues.'},
        {id:'scan-run',title:'Scan and run block',section:'sessions',minutes:15,included:true,detail:'Students complete laps while staff scan attendance and lap progress.'},
        {id:'challenge',title:'Short challenge',section:'sessions',minutes:4,included:true,detail:'Class target, even pacing, teamwork or personal effort focus.'},
        {id:'cooldown',title:'Cooldown and notes',section:'cooldowns',minutes:2,included:true,detail:'Walk, water, quick reflection and teacher notes.'}
      ]
    },
    {
      id:'athletics-rotation',
      title:'Interschool Athletics Rotation',
      duration:35,
      focus:'Rotating event stations for sprinting, middle distance, jumps, throws and teamwork.',
      miniCoach:'Mini Coach: links event rotation to moving our bodies, applying movement concepts, teamwork, and fair participation.',
      curriculum:[
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL},
        {label:'Moving our bodies',url:WA_HPE_CURRICULUM_URL},
        {label:'Learning through movement',url:WA_HPE_CURRICULUM_URL}
      ],
      activities:[
        {id:'briefing',title:'Division briefing',section:'starters',minutes:4,included:true,detail:'Group students by Junior, Intermediate, Senior and explain station expectations.'},
        {id:'sprint-starts',title:'Sprint starts station',section:'sessions',minutes:8,included:true,detail:'Reaction cues, 3-point starts, 10m acceleration focus.'},
        {id:'middle-distance',title:'Middle-distance pacing station',section:'sessions',minutes:8,included:true,detail:'Controlled 100m, 200m or 400m rhythm practice by division.'},
        {id:'field-events',title:'Long jump and Vortex technique',section:'sessions',minutes:8,included:true,detail:'Take-off markers, safe landing, throwing lane and retrieval routine.'},
        {id:'ball-games',title:'Ball-game teamwork',section:'sessions',minutes:5,included:true,detail:'Tunnel Ball, Leader Ball or Pass Ball communication and turn-taking.'},
        {id:'review',title:'PB and team review',section:'cooldowns',minutes:2,included:true,detail:'Record noteworthy PBs and selection notes in Sports tab.'}
      ]
    },
    {
      id:'cross-country-prep',
      title:'Cross Country Preparation',
      duration:30,
      focus:'Pacing, breathing rhythm, course awareness and safe finish-line flow.',
      miniCoach:'Mini Coach: supports active choices, effort awareness, resilience and safe participation in outdoor movement contexts.',
      curriculum:[
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL},
        {label:'Making active choices',url:WA_HPE_CURRICULUM_URL},
        {label:'Learning through movement',url:WA_HPE_CURRICULUM_URL}
      ],
      activities:[
        {id:'course-walk',title:'Course walk and hazards',section:'starters',minutes:5,included:true,detail:'Show route, marshal points, finish area, water and safe passing.'},
        {id:'warmup',title:'Progressive warm-up',section:'starters',minutes:5,included:true,detail:'Jog, mobility, breathing rhythm and relaxed strides.'},
        {id:'pacing-block',title:'Pacing block',section:'sessions',minutes:12,included:true,detail:'Steady running or run/walk effort matched to year group distance.'},
        {id:'finish-flow',title:'Finish-line practice',section:'cooldowns',minutes:4,included:true,detail:'Finish chute, recovery walk and scanning/order expectations.'},
        {id:'reflection',title:'Reflection and next action',section:'cooldowns',minutes:4,included:true,detail:'Students identify one pacing cue or confidence target for next session.'}
      ]
    },
    {
      id:'speed-tune-up',
      title:'Speed Tune-Up',
      duration:25,
      focus:'Sprint mechanics for 50m, 75m, 100m and 200m preparation.',
      miniCoach:'Mini Coach: targets locomotor skills, body control, acceleration mechanics and confidence in short-distance events.',
      curriculum:[
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL},
        {label:'Moving our bodies',url:WA_HPE_CURRICULUM_URL}
      ],
      activities:[
        {id:'jog',title:'Easy jog and mobility',section:'starters',minutes:4,included:true,detail:'Raise temperature without fatigue.'},
        {id:'askips',title:'A-skips, ankling and wall drives',section:'starters',minutes:7,included:true,detail:'Tall posture, rhythm, knee lift and ground contact cues.'},
        {id:'accelerations',title:'Three 30m accelerations',section:'sessions',minutes:8,included:true,detail:'Build from relaxed to fast with full walk-back recovery.'},
        {id:'relaxed-sprint',title:'Relaxed 75m run',section:'sessions',minutes:4,included:true,detail:'Fast but smooth, no straining.'},
        {id:'cooldown',title:'Cooldown walk',section:'cooldowns',minutes:2,included:true,detail:'Walk, breathe, water.'}
      ]
    },
    {
      id:'middle-distance-builder',
      title:'Middle-Distance Builder',
      duration:30,
      focus:'Controlled effort for 400m, cross country and run club endurance.',
      miniCoach:'Mini Coach: links pacing judgement, effort regulation and active participation to HPE movement learning.',
      curriculum:[
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL},
        {label:'Making active choices',url:WA_HPE_CURRICULUM_URL}
      ],
      activities:[
        {id:'easy-lap',title:'Easy lap',section:'starters',minutes:5,included:true,detail:'Comfortable conversational pace.'},
        {id:'pacing-talk',title:'Pacing talk',section:'starters',minutes:3,included:true,detail:'Discuss first half control and finish effort.'},
        {id:'steady-200s',title:'Two steady 200m efforts',section:'sessions',minutes:10,included:true,detail:'Even rhythm with walk recovery.'},
        {id:'controlled-400',title:'Controlled 400m effort',section:'sessions',minutes:8,included:true,detail:'Smooth effort, finish composed.'},
        {id:'recovery',title:'Recovery walk',section:'cooldowns',minutes:4,included:true,detail:'Cool down and note one pacing cue.'}
      ]
    },
    {
      id:'field-event-circuit',
      title:'Field Event Circuit',
      duration:30,
      focus:'Long jump and Vortex Throw technique with safe attempts.',
      miniCoach:'Mini Coach: supports object control, force, balance, safe retrieval routines and technique reflection.',
      curriculum:[
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL},
        {label:'Moving our bodies',url:WA_HPE_CURRICULUM_URL},
        {label:'Learning through movement',url:WA_HPE_CURRICULUM_URL}
      ],
      activities:[
        {id:'safety',title:'Safety setup',section:'starters',minutes:4,included:true,detail:'Landing area, throwing lane, wait line and retrieval signal.'},
        {id:'jump-markers',title:'Long jump take-off markers',section:'sessions',minutes:8,included:true,detail:'Short approach, jump off one foot, land balanced.'},
        {id:'vortex-throws',title:'Vortex throw practice',section:'sessions',minutes:8,included:true,detail:'Side-on stance, step, throw, follow-through.'},
        {id:'measured-attempts',title:'Three measured attempts',section:'sessions',minutes:8,included:true,detail:'Record best safe attempt if needed.'},
        {id:'packup',title:'Pack-up and reflection',section:'cooldowns',minutes:2,included:true,detail:'Retrieve equipment and name one technical cue.'}
      ]
    },
    {
      id:'barcode-device-setup',
      title:'Barcode And Device Setup',
      duration:20,
      focus:'Operational checklist for scanners, iPads, phones and printed ID cards.',
      miniCoach:'Mini Coach: admin-only checklist. Not a curriculum lesson; use it to reduce session friction before students arrive.',
      curriculum:[
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL},
        {label:'Teacher planning support',url:WA_HPE_CURRICULUM_URL}
      ],
      activities:[
        {id:'print-cards',title:'Print ID cards',section:'starters',minutes:5,included:true,detail:'Generate and print credit-card sized student barcode cards.'},
        {id:'device-name',title:'Name each device',section:'starters',minutes:3,included:true,detail:'Set scanner device name and location in Admin Scanner settings.'},
        {id:'camera-test',title:'Camera permission test',section:'sessions',minutes:4,included:true,detail:'Open kiosk on phone/iPad and confirm camera permission.'},
        {id:'demo-scan',title:'Demo scan',section:'sessions',minutes:5,included:true,detail:'Scan one test barcode and verify it records once.'},
        {id:'fallback',title:'Fallback check',section:'cooldowns',minutes:3,included:true,detail:'Confirm typed barcode entry works if a scanner fails.'}
      ]
    }
  ];

  RESOURCE_SESSION_TEMPLATES=RESOURCE_SESSION_TEMPLATES.concat([
    {
      id:'foundation-run-jump-throw',
      title:'Run, Jump, Throw Fundamentals',
      duration:40,
      focus:'A broad PE foundation session for locomotor skills, landing shapes, safe throwing, and teamwork.',
      miniCoach:'Mini Coach: use this as the first lesson in an athletics unit. Keep it playful, fast moving, and focused on safe movement quality.',
      curriculum:[
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL},
        {label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL},
        {label:'ASC Playing for Life',url:ASC_PLAYING_FOR_LIFE_URL}
      ],
      activities:[
        {id:'frjt-start-game',title:'Traffic light movers',section:'starters',minutes:6,included:true,detail:'Students move on green, freeze on red, change movement on amber.',how:'Call movement types such as jog, skip, hop, side-step and walk. Keep the space wide and stop often to reset posture.',cues:'Eyes up, soft feet, personal space, balanced stop.',safety:'Use clear boundaries and remove loose equipment before students move.',progressions:'Add partner mirroring or ask students to invent a safe movement pattern.',links:[{label:'ASC Playing for Life',url:ASC_PLAYING_FOR_LIFE_URL},{label:'WA HPE Movement',url:WA_HPE_CURRICULUM_URL}]},
        {id:'frjt-run-lines',title:'Run the lines',section:'sessions',minutes:8,included:true,detail:'Short line runs to practise starting, stopping and changing speed.',how:'Set cones 10m apart. Students run out, slow down before the cone, turn safely and return.',cues:'Lean slightly forward, arms cheek to pocket, slow before turning.',safety:'Stagger groups so nobody turns into another runner.',progressions:'Make one return a skip, one a sprint, one a walk recovery.',links:[{label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL}]},
        {id:'frjt-jump-land',title:'Jump and stick landing',section:'sessions',minutes:8,included:true,detail:'Two-foot jumps and one-foot take-offs with quiet landings.',how:'Mark take-off spots. Students jump to a hoop or line and hold the landing for two seconds.',cues:'Bend knees, arms swing, land soft, chest up.',safety:'Use grass, mats or soft surfaces; avoid slippery areas.',progressions:'Add a short approach or ask students to measure personal improvement.',links:[{label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL}]},
        {id:'frjt-throw-target',title:'Throw for target zones',section:'sessions',minutes:12,included:true,detail:'Safe overarm throwing with beanbags, foam balls or vortex equipment.',how:'Create three landing zones. Students throw from behind a line, wait for the signal, retrieve together, then rotate.',cues:'Side on, step with opposite foot, point then throw, follow through.',safety:'No retrieval until all throwing has stopped.',progressions:'Change object weight, target distance or scoring zones.',links:[{label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL},{label:'PE station ideas',url:PE_STATION_IDEAS_URL}]},
        {id:'frjt-reflect',title:'Movement reflection',section:'cooldowns',minutes:6,included:true,detail:'Students name one running, jumping or throwing cue they used.',how:'Walk a slow lap, then ask pairs to share one cue and one safety rule.',cues:'Use simple language students can repeat next lesson.',safety:'Use this to check fatigue and readiness to return to class.',progressions:'Students choose the skill they want to practise next time.',links:[{label:'Australian Curriculum HPE',url:AUSTRALIAN_HPE_URL}]}
      ]
    },
    {
      id:'sprint-mechanics-50-75-100',
      title:'Sprint Mechanics 50m, 75m, 100m',
      duration:35,
      focus:'Acceleration, posture, rhythm, and safe sprint efforts for Junior, Intermediate and Senior students.',
      miniCoach:'Mini Coach: sprint lessons work best when students sprint less often but with higher quality and full recovery.',
      curriculum:[
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL},
        {label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL},
        {label:'Track and field stations',url:PE_STATION_IDEAS_URL}
      ],
      activities:[
        {id:'sm-warmup',title:'Sprint mobility warm-up',section:'starters',minutes:7,included:true,detail:'Ankling, A-skips, high knees and relaxed strides.',how:'Run drills over 15m. Walk back after each drill and keep cues short.',cues:'Tall hips, quick feet under body, relaxed face and hands.',safety:'Stop if students are racing the drill instead of controlling it.',progressions:'Senior students can add B-skips or wall drives.',links:[{label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL}]},
        {id:'sm-start-shapes',title:'Start shapes',section:'sessions',minutes:8,included:true,detail:'Standing, falling and three-point starts over 10m.',how:'Teach one start position at a time, then let students complete 3-4 short starts with full walk-back recovery.',cues:'Push the ground away, first steps powerful, eyes down then rise.',safety:'No starting blocks needed; keep lanes clear.',progressions:'Add reaction commands or partner clap starts.',links:[{label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL}]},
        {id:'sm-acceleration',title:'20m acceleration lanes',section:'sessions',minutes:8,included:true,detail:'Build speed over 20m without overstriding.',how:'Students sprint to 20m, then decelerate through a 10m run-off zone.',cues:'Short powerful first steps, arms drive straight, finish through the cone.',safety:'Long run-off area is required before any wall/fence.',progressions:'Time only the final rep after technique practice.',links:[{label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL}]},
        {id:'sm-race-model',title:'Event distance rhythm',section:'sessions',minutes:8,included:true,detail:'Practise the correct school carnival distance for the division.',how:'Juniors run 50m, Intermediates 75m, Seniors 100m at smooth effort.',cues:'Fast start, relaxed middle, run past the line.',safety:'Limit to two quality reps for younger students.',progressions:'Add lane draw or final selection trial later, not in the first lesson.',links:[{label:'Track and field stations',url:PE_STATION_IDEAS_URL}]},
        {id:'sm-cooldown',title:'Sprint reset',section:'cooldowns',minutes:4,included:true,detail:'Walk, calf shake-out and one cue recap.',how:'Ask students to point to the cue that helped most: start, arms, posture or finish.',cues:'Leave them confident, not exhausted.',safety:'Hydrate and monitor heat.',progressions:'Students write one target for next sprint session.',links:[{label:'Australian Curriculum HPE',url:AUSTRALIAN_HPE_URL}]}
      ]
    },
    {
      id:'relay-baton-straight-line',
      title:'Straight-Line Baton Relay',
      duration:35,
      focus:'Safe baton exchange, lane awareness, acceleration and team communication.',
      miniCoach:'Mini Coach: keep relay teaching simple. Straight lines, clear waiting zones, and one exchange cue are enough for primary students.',
      curriculum:[
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL},
        {label:'ASC Playing for Life',url:ASC_PLAYING_FOR_LIFE_URL},
        {label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL}
      ],
      activities:[
        {id:'relay-call-response',title:'Call and pass warm-up',section:'starters',minutes:6,included:true,detail:'Stationary baton pass with voice cue.',how:'Pairs stand one behind the other. Back runner says “hand”, front runner reaches back, pass happens only when ready.',cues:'Call early, palm open, pass into the hand.',safety:'Use foam batons or rolled paper for beginners.',progressions:'Add walking then jogging passes.',links:[{label:'ASC Playing for Life',url:ASC_PLAYING_FOR_LIFE_URL}]},
        {id:'relay-zones',title:'Exchange zone walk-through',section:'sessions',minutes:7,included:true,detail:'Students learn where to wait, accelerate and pass.',how:'Mark waiting line, go line and pass zone. Walk the route before running.',cues:'Outgoing runner looks forward, incoming runner calls clearly.',safety:'One team per lane; no crossing lanes.',progressions:'Let students choose a team cue word.',links:[{label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL}]},
        {id:'relay-rolling-pass',title:'Jogging exchange reps',section:'sessions',minutes:10,included:true,detail:'Repeated low-speed baton exchanges in lanes.',how:'Teams of four rotate through positions. Keep speed at 60 percent until passes are reliable.',cues:'Smooth beats fast; baton never thrown.',safety:'Stop immediately if students bunch up.',progressions:'Increase speed only when the baton is passed cleanly three times.',links:[{label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL}]},
        {id:'relay-team-run',title:'Team relay rehearsal',section:'sessions',minutes:8,included:true,detail:'One full straight-line relay rehearsal by team.',how:'Run one clean attempt, then discuss what helped the team.',cues:'Run your leg, communicate, stay in lane.',safety:'Use clear finish/run-off space.',progressions:'Record team time only after technique practice.',links:[{label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL}]},
        {id:'relay-reflection',title:'Team reflection',section:'cooldowns',minutes:4,included:true,detail:'Students identify one communication strength.',how:'Each team names one thing to keep and one thing to improve.',cues:'Praise teamwork over winning.',safety:'Set batons down before leaving.',progressions:'Add leadership roles for captains or helpers.',links:[{label:'Australian Curriculum HPE',url:AUSTRALIAN_HPE_URL}]}
      ]
    },
    {
      id:'middle-distance-pacing-100-200-400',
      title:'Middle Distance Pacing 100m, 200m, 400m',
      duration:40,
      focus:'Pacing judgement for Junior 100m, Intermediate 200m and Senior 400m events.',
      miniCoach:'Mini Coach: pacing lessons should feel controlled. The goal is learning effort regulation, not smashing every rep.',
      curriculum:[
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL},
        {label:'Australian Curriculum HPE',url:AUSTRALIAN_HPE_URL},
        {label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL}
      ],
      activities:[
        {id:'md-talk-test',title:'Talk-test warm-up',section:'starters',minutes:6,included:true,detail:'Students jog at a pace where they can still talk.',how:'Use a short loop and ask students to say a phrase while moving.',cues:'Smooth breathing, shoulders down, no racing yet.',safety:'Check heat and asthma plans before continuous running.',progressions:'Students rate effort out of 10.',links:[{label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL}]},
        {id:'md-even-pace',title:'Even pace out-and-back',section:'sessions',minutes:8,included:true,detail:'Run out for time, turn, return at the same pace.',how:'Students run 30 seconds out and try to return in 30 seconds.',cues:'Start easier than you think, rhythm over rush.',safety:'Use a visible turn marker and clear traffic flow.',progressions:'Increase to 45 or 60 seconds for older students.',links:[{label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL}]},
        {id:'md-division-reps',title:'Division event reps',section:'sessions',minutes:12,included:true,detail:'Juniors 100m, Intermediates 200m, Seniors 400m at controlled pace.',how:'Divide students by event distance. Run one controlled rep, walk recovery, then one improved pacing rep.',cues:'First half controlled, second half strong.',safety:'Avoid back-to-back maximum efforts.',progressions:'Students try to negative split the second rep.',links:[{label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL}]},
        {id:'md-team-pacer',title:'Team pacer challenge',section:'sessions',minutes:8,included:true,detail:'Teams try to finish together inside a target window.',how:'Give a group target such as “finish within five seconds of each other”.',cues:'Encourage, listen, adjust pace.',safety:'Group by similar ability so no one is dragged beyond capacity.',progressions:'Let students nominate a pacer and rotate leadership.',links:[{label:'ASC Playing for Life',url:ASC_PLAYING_FOR_LIFE_URL}]},
        {id:'md-reflect',title:'Pacing reflection',section:'cooldowns',minutes:6,included:true,detail:'Students record their best pacing cue.',how:'Walk and discuss: what did your body feel like when the pace was right?',cues:'Notice breathing, legs, rhythm and confidence.',safety:'Cool down long enough after harder running.',progressions:'Set one personal pacing goal for next session.',links:[{label:'Australian Curriculum HPE',url:AUSTRALIAN_HPE_URL}]}
      ]
    },
    {
      id:'long-jump-primary',
      title:'Long Jump Primary Progression',
      duration:40,
      focus:'Run-up rhythm, one-foot take-off, safe landing and measured attempts.',
      miniCoach:'Mini Coach: teach long jump as rhythm plus safe landing before chasing distance.',
      curriculum:[
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL},
        {label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL},
        {label:'Track and field stations',url:PE_STATION_IDEAS_URL}
      ],
      activities:[
        {id:'lj-landing-shape',title:'Landing shapes',section:'starters',minutes:6,included:true,detail:'Practise two-foot soft landings and balance holds.',how:'Students jump from a standing start to a line, land on two feet and hold.',cues:'Knees bent, arms forward, freeze the landing.',safety:'Use a soft, flat landing area.',progressions:'Add a hoop or mat target.',links:[{label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL}]},
        {id:'lj-takeoff-foot',title:'Find take-off foot',section:'sessions',minutes:6,included:true,detail:'Students discover their preferred one-foot take-off.',how:'Try three easy run-and-pop jumps and note which foot feels natural.',cues:'Jump off one foot, land on two.',safety:'No full-speed run-ups yet.',progressions:'Mark preferred take-off foot with a wristband or note.',links:[{label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL}]},
        {id:'lj-runup-rhythm',title:'Five-step run-up rhythm',section:'sessions',minutes:10,included:true,detail:'Short approach into a controlled take-off.',how:'Use 5-7 steps only. Students aim to hit a take-off zone, not a board.',cues:'Tall run, eyes forward, pop up and out.',safety:'One jumper at a time per lane.',progressions:'Students adjust start mark by half-steps.',links:[{label:'Track and field stations',url:PE_STATION_IDEAS_URL}]},
        {id:'lj-measured-jumps',title:'Three safe attempts',section:'sessions',minutes:12,included:true,detail:'Students complete measured attempts after technique practice.',how:'Measure from take-off zone to nearest back mark on landing.',cues:'Same run-up, strong take-off, safe landing.',safety:'Rake/check landing area between jumps if using a pit.',progressions:'Record best attempt and one technique note.',links:[{label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL}]},
        {id:'lj-review',title:'Jump review',section:'cooldowns',minutes:6,included:true,detail:'Students compare what changed when technique improved.',how:'Ask students whether run-up, take-off or landing helped most.',cues:'Distance follows control.',safety:'Finish with walking and hydration.',progressions:'Set a next lesson target: rhythm, take-off or landing.',links:[{label:'Australian Curriculum HPE',url:AUSTRALIAN_HPE_URL}]}
      ]
    },
    {
      id:'vortex-throw-primary',
      title:'Vortex Throw Technique',
      duration:35,
      focus:'Safe throwing routines, side-on shape, step-through action and measured throws.',
      miniCoach:'Mini Coach: throwing lessons succeed when retrieval rules are crystal clear before anyone throws.',
      curriculum:[
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL},
        {label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL},
        {label:'Track and field stations',url:PE_STATION_IDEAS_URL}
      ],
      activities:[
        {id:'vt-safety-routine',title:'Throwing safety routine',section:'starters',minutes:5,included:true,detail:'Teach throw line, wait line, landing zone and retrieval signal.',how:'Walk students through the routine with no equipment first.',cues:'Throw, freeze, wait, retrieve together.',safety:'No student crosses the line until teacher signal.',progressions:'Student leaders repeat the safety command.',links:[{label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL}]},
        {id:'vt-side-on',title:'Side-on target shapes',section:'sessions',minutes:7,included:true,detail:'Practise side-on body shape without release.',how:'Students hold vortex/foam object, point non-throwing arm to target and rehearse the step.',cues:'Side to target, elbow high, eyes forward.',safety:'Spacing arms-length plus equipment length.',progressions:'Add slow-motion throw without distance focus.',links:[{label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL}]},
        {id:'vt-step-throw',title:'Step and throw',section:'sessions',minutes:10,included:true,detail:'Controlled throws into broad zones.',how:'Students step with opposite foot and throw to coloured distance zones.',cues:'Step, pull, release high, follow through.',safety:'All throwers release in the same direction.',progressions:'Score zones but reward technique points too.',links:[{label:'Track and field stations',url:PE_STATION_IDEAS_URL}]},
        {id:'vt-measured',title:'Measured best of three',section:'sessions',minutes:9,included:true,detail:'Three safe measured attempts with partner marker.',how:'Partner stands outside landing sector and marks only after signal.',cues:'Repeat same routine each throw.',safety:'Use cones to mark out-of-bounds landing areas.',progressions:'Students identify one cue before each attempt.',links:[{label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL}]},
        {id:'vt-packup',title:'Equipment count and cue recap',section:'cooldowns',minutes:4,included:true,detail:'Count equipment, return safely, name one throwing cue.',how:'Students return gear before sharing cues.',cues:'Safety routine is part of performance.',safety:'No free throwing during pack-up.',progressions:'Students coach a partner next lesson.',links:[{label:'Australian Curriculum HPE',url:AUSTRALIAN_HPE_URL}]}
      ]
    },
    {
      id:'ball-games-carnival',
      title:'Carnival Ball Games Rotation',
      duration:40,
      focus:'Tunnel Ball, Leader Ball and Pass Ball skills for teamwork, passing accuracy and fast transitions.',
      miniCoach:'Mini Coach: ball games are movement, communication and cooperation lessons. Make rotations short and roles clear.',
      curriculum:[
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL},
        {label:'ASC Playing for Life',url:ASC_PLAYING_FOR_LIFE_URL},
        {label:'Australian Curriculum HPE',url:AUSTRALIAN_HPE_URL}
      ],
      activities:[
        {id:'bg-passing-warmup',title:'Partner pass warm-up',section:'starters',minutes:6,included:true,detail:'Chest pass, bounce pass and overhead pass with accuracy targets.',how:'Pairs stand 3-5m apart and pass to a target chest/high hands.',cues:'Step to target, soft hands, call name.',safety:'Use soft balls and avoid head-height hard passes.',progressions:'Add movement after pass.',links:[{label:'ASC Playing for Life',url:ASC_PLAYING_FOR_LIFE_URL}]},
        {id:'bg-tunnel-ball',title:'Tunnel Ball station',section:'sessions',minutes:9,included:true,detail:'Roll ball through team tunnel and sprint to front.',how:'Teams line up straddled. Back student rolls ball through legs, front collects and runs to back/front depending carnival rules.',cues:'Low roll, team spacing, quick reset.',safety:'No diving onto the ball.',progressions:'Add rule variations for junior/senior groups.',links:[{label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL}]},
        {id:'bg-leader-ball',title:'Leader Ball station',section:'sessions',minutes:9,included:true,detail:'Leader passes to each teammate, who returns and sits/rotates.',how:'Leader faces team. Pass down the line with clean catches before speed.',cues:'Target hands, eyes on ball, call ready.',safety:'Keep lines separated.',progressions:'Change pass type or leader rotation.',links:[{label:'ASC Playing for Life',url:ASC_PLAYING_FOR_LIFE_URL}]},
        {id:'bg-pass-ball',title:'Pass Ball station',section:'sessions',minutes:9,included:true,detail:'Pass across team sequence with communication and accuracy.',how:'Students pass in a set order, moving only after the pass is secure.',cues:'Pass then move, talk early, help teammate.',safety:'Use clear team lanes.',progressions:'Add timed challenge after accuracy improves.',links:[{label:'ASC Sport Lesson Plans',url:ASC_SPORT_LESSON_PLANS_URL}]},
        {id:'bg-team-review',title:'Team review',section:'cooldowns',minutes:7,included:true,detail:'Teams identify the communication that improved performance.',how:'Each group shares one phrase or habit that made them faster.',cues:'Teamwork is trainable.',safety:'Collect balls first to reduce distraction.',progressions:'Students choose event roles for the next carnival practice.',links:[{label:'Australian Curriculum HPE',url:AUSTRALIAN_HPE_URL}]}
      ]
    },
    {
      id:'cross-country-skills',
      title:'Cross Country Skills And Course Confidence',
      duration:40,
      focus:'Course awareness, pacing, overtaking etiquette, finish flow and effort confidence.',
      miniCoach:'Mini Coach: cross country is a confidence unit. Teach course routines and effort choices before asking for hard running.',
      curriculum:[
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL},
        {label:'Australian Curriculum HPE',url:AUSTRALIAN_HPE_URL},
        {label:'ASC Playing for Life',url:ASC_PLAYING_FOR_LIFE_URL}
      ],
      activities:[
        {id:'xc-map-walk',title:'Course map walk',section:'starters',minutes:7,included:true,detail:'Walk the route and name marshal points, turns and finish area.',how:'Stop at important course points and ask students what safe choices look like there.',cues:'Know the course, know your effort, know where help is.',safety:'Identify hazards and asthma/medical processes.',progressions:'Students explain the course to a partner.',links:[{label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL}]},
        {id:'xc-gears',title:'Running gears',section:'sessions',minutes:8,included:true,detail:'Students practise easy, steady and strong effort levels.',how:'Use 30-second blocks: gear 1 walk/jog, gear 2 steady, gear 3 strong but controlled.',cues:'You can change gears without stopping.',safety:'Avoid maximum sprints in endurance sessions.',progressions:'Students choose a gear for hills, turns and finish.',links:[{label:'Australian Curriculum HPE',url:AUSTRALIAN_HPE_URL}]},
        {id:'xc-overtake',title:'Overtaking etiquette',section:'sessions',minutes:6,included:true,detail:'Practice safe passing on a narrow path.',how:'Set a cone corridor. Students pass with voice cue and space.',cues:'Call, pass wide, no pushing, keep moving.',safety:'No shoulder contact or cutting off.',progressions:'Add small groups with different speeds.',links:[{label:'ASC Playing for Life',url:ASC_PLAYING_FOR_LIFE_URL}]},
        {id:'xc-loop',title:'Confidence loop',section:'sessions',minutes:14,included:true,detail:'Run/walk loop with personal effort target.',how:'Students choose a run/walk pattern and try to keep it consistent.',cues:'Start calm, finish proud, use your plan.',safety:'Monitor heat, hydration and known medical needs.',progressions:'Older students record lap splits.',links:[{label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL}]},
        {id:'xc-finish',title:'Finish chute practice',section:'cooldowns',minutes:5,included:true,detail:'Practise finishing, walking on and recovering safely.',how:'Students jog through a finish line, keep walking, then move to recovery zone.',cues:'Run through, do not stop on the line.',safety:'Keep finish chute clear.',progressions:'Add barcode scan/placing process later.',links:[{label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL}]}
      ]
    },
    {
      id:'athletics-station-circuit',
      title:'Athletics Station Circuit',
      duration:45,
      focus:'A full PE circuit across sprint, jump, throw, relay and teamwork stations.',
      miniCoach:'Mini Coach: use station circuits when you need maximum participation and minimal waiting.',
      curriculum:[
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL},
        {label:'Track and field stations',url:PE_STATION_IDEAS_URL},
        {label:'SPARK sample lessons',url:SPARK_PE_URL}
      ],
      activities:[
        {id:'circuit-brief',title:'Station briefing',section:'starters',minutes:5,included:true,detail:'Explain rotations, safety zones and scoring/feedback method.',how:'Show every station before starting. Assign groups and start points.',cues:'Rotate on whistle, leave equipment ready.',safety:'Throwing stations need the clearest separation.',progressions:'Assign student station captains.',links:[{label:'SPARK sample lessons',url:SPARK_PE_URL}]},
        {id:'circuit-sprint',title:'Sprint station',section:'sessions',minutes:8,included:true,detail:'Short 20m acceleration or 40m smooth sprint.',how:'Students run one at a time or in safe lanes, walk back, repeat.',cues:'Push, posture, run past line.',safety:'Use a run-off zone.',progressions:'Add reaction start.',links:[{label:'Track and field stations',url:PE_STATION_IDEAS_URL}]},
        {id:'circuit-jump',title:'Jump station',section:'sessions',minutes:8,included:true,detail:'Standing long jump or short approach jump.',how:'Students jump into a landing zone and mark best safe jump.',cues:'Swing arms, take off strong, land soft.',safety:'Check surface before each rotation.',progressions:'Add five-step approach.',links:[{label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL}]},
        {id:'circuit-throw',title:'Throw station',section:'sessions',minutes:8,included:true,detail:'Foam javelin/vortex or beanbag throws into zones.',how:'Students throw from behind a line and retrieve on signal.',cues:'Side on, step, throw high.',safety:'All objects travel same direction.',progressions:'Add technique score plus distance score.',links:[{label:'Track and field stations',url:PE_STATION_IDEAS_URL}]},
        {id:'circuit-relay-review',title:'Relay station and review',section:'cooldowns',minutes:16,included:true,detail:'Mini relay plus group reflection on best movement cue.',how:'Teams complete a short relay, then rotate through a two-minute reflection.',cues:'Communicate early, move safely, encourage.',safety:'Keep relay lanes clear.',progressions:'Students choose their strongest station for assessment.',links:[{label:'ASC Playing for Life',url:ASC_PLAYING_FOR_LIFE_URL}]}
      ]
    },
    {
      id:'inclusive-athletics-pe',
      title:'Inclusive Athletics Adaptations',
      duration:35,
      focus:'Adapted running, jumping and throwing tasks for mixed ability classes.',
      miniCoach:'Mini Coach: inclusion is not a separate lesson. Use this when you need multiple ways for students to access the same movement goal.',
      curriculum:[
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL},
        {label:'ASC Playing for Life',url:ASC_PLAYING_FOR_LIFE_URL},
        {label:'Australian Curriculum HPE',url:AUSTRALIAN_HPE_URL}
      ],
      activities:[
        {id:'inc-choice-warmup',title:'Choice warm-up pathway',section:'starters',minutes:6,included:true,detail:'Students choose walk, jog, wheel/roll, skip or side-step pathways.',how:'Set parallel lanes with the same start/finish. Students choose the movement they can do safely.',cues:'Same challenge, different pathway.',safety:'Keep lanes wide and surfaces accessible.',progressions:'Students switch pathways or add partner support.',links:[{label:'ASC Playing for Life',url:ASC_PLAYING_FOR_LIFE_URL}]},
        {id:'inc-target-throw',title:'Multi-distance target throws',section:'sessions',minutes:9,included:true,detail:'Targets at different distances and heights for success choice.',how:'Students pick a target zone, throw safely, then adjust easier or harder.',cues:'Choose challenge, use technique, celebrate accuracy.',safety:'Use soft equipment and one throwing direction.',progressions:'Students design a fair scoring system.',links:[{label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL}]},
        {id:'inc-jump-options',title:'Jump or reach options',section:'sessions',minutes:8,included:true,detail:'Standing jump, step-over, reach target or balance landing.',how:'Offer stations that train power, balance or coordination without one fixed outcome.',cues:'Strong shape, safe landing, personal best.',safety:'Use non-slip markers and allow supported balance.',progressions:'Students track their own improvement.',links:[{label:'Australian Curriculum HPE',url:AUSTRALIAN_HPE_URL}]},
        {id:'inc-team-challenge',title:'Team points challenge',section:'sessions',minutes:8,included:true,detail:'Teams collect points from varied movement stations.',how:'Every station has multiple scoring options so all students contribute.',cues:'Pick your role, help your team, move safely.',safety:'Avoid ranking students by disability or support need.',progressions:'Students rotate leadership roles.',links:[{label:'ASC Playing for Life',url:ASC_PLAYING_FOR_LIFE_URL}]},
        {id:'inc-reflect',title:'Inclusion reflection',section:'cooldowns',minutes:4,included:true,detail:'Students identify how adapting rules helped participation.',how:'Ask: what made the activity fair, safe and fun?',cues:'Fair does not always mean identical.',safety:'Keep feedback respectful and private.',progressions:'Students suggest one adaptation for next lesson.',links:[{label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL}]}
      ]
    },
    {
      id:'assessment-pb-trials',
      title:'Athletics PB And Assessment Trials',
      duration:45,
      focus:'Structured, low-stress personal best collection across run, jump and throw events.',
      miniCoach:'Mini Coach: PB days should be calm and procedural. Students need clear attempts, not chaos.',
      curriculum:[
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL},
        {label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL},
        {label:'Australian Curriculum HPE',url:AUSTRALIAN_HPE_URL}
      ],
      activities:[
        {id:'pb-brief',title:'PB trial briefing',section:'starters',minutes:5,included:true,detail:'Explain attempts, recording, safety and encouragement expectations.',how:'Show the recording sheet/app process and explain that PB means personal best.',cues:'Do your best, record honestly, support others.',safety:'Make medical and heat procedures explicit.',progressions:'Student helpers can manage clipboards.',links:[{label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL}]},
        {id:'pb-sprint',title:'Sprint timing trial',section:'sessions',minutes:10,included:true,detail:'Students complete one practice and one timed sprint.',how:'Run by division distance. Pair students for timing or use teacher timing.',cues:'Run through the finish.',safety:'Clear run-off zone.',progressions:'Add second attempt only if recovery is adequate.',links:[{label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL}]},
        {id:'pb-jump',title:'Long jump trial',section:'sessions',minutes:10,included:true,detail:'Three safe jumps with best attempt recorded.',how:'Use a take-off zone and measure from the closest landing mark.',cues:'Same run-up, safe landing.',safety:'One jumper at a time.',progressions:'Students record technique cue with result.',links:[{label:'Track and field stations',url:PE_STATION_IDEAS_URL}]},
        {id:'pb-throw',title:'Vortex throw trial',section:'sessions',minutes:10,included:true,detail:'Three throws with best safe throw recorded.',how:'Students throw in order, retrieve together, then record best distance.',cues:'Step, throw, follow through.',safety:'Strict retrieval signal.',progressions:'Mark leading results in Sports tab later.',links:[{label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL}]},
        {id:'pb-record',title:'Record and celebrate',section:'cooldowns',minutes:10,included:true,detail:'Record PBs and recognise effort, technique and teamwork.',how:'Students check their recorded results and name an improvement.',cues:'Celebrate improvement and courage.',safety:'Keep public sharing opt-in and respectful.',progressions:'Create goal groups for future lessons.',links:[{label:'Australian Curriculum HPE',url:AUSTRALIAN_HPE_URL}]}
      ]
    },
    {
      id:'game-sense-athletics',
      title:'Game Sense Athletics',
      duration:40,
      focus:'Play-based athletics tasks that develop decision-making, teamwork and movement confidence.',
      miniCoach:'Mini Coach: use this when the class needs high energy and low pressure while still building athletics skills.',
      curriculum:[
        {label:'ASC Playing for Life',url:ASC_PLAYING_FOR_LIFE_URL},
        {label:'ASC Sport Lesson Plans',url:ASC_SPORT_LESSON_PLANS_URL},
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL}
      ],
      activities:[
        {id:'gs-tag-starts',title:'Tag starts',section:'starters',minutes:7,included:true,detail:'Short chase starts to practise reaction and acceleration.',how:'In pairs, front student starts on cue and back student chases for 10m.',cues:'React, push, stay in lane.',safety:'Pair similar speeds and use clear finish line.',progressions:'Change start positions.',links:[{label:'ASC Playing for Life',url:ASC_PLAYING_FOR_LIFE_URL}]},
        {id:'gs-zone-jumps',title:'Zone jump scoring',section:'sessions',minutes:8,included:true,detail:'Students jump into scoring zones with personal challenge choices.',how:'Mark three zones. Students choose starting point and try to improve.',cues:'Swing, jump, land safely.',safety:'Do not crowd landing zones.',progressions:'Teams score improvement points.',links:[{label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL}]},
        {id:'gs-throw-bowling',title:'Throwing bowling',section:'sessions',minutes:8,included:true,detail:'Throw to knock over cones or land in hoops.',how:'Set targets at different distances. Students select the challenge level.',cues:'Aim, step, release, follow through.',safety:'Retrieve only on signal.',progressions:'Add team strategy around target choice.',links:[{label:'ASC Sport Lesson Plans',url:ASC_SPORT_LESSON_PLANS_URL}]},
        {id:'gs-relay-puzzle',title:'Relay puzzle',section:'sessions',minutes:11,included:true,detail:'Teams complete short shuttle runs to collect puzzle pieces/cards.',how:'One runner at a time collects a card and returns for team problem solving.',cues:'Run safely, tag next runner, think together.',safety:'No diving for cards.',progressions:'Use athletics cue cards as the puzzle.',links:[{label:'ASC Playing for Life',url:ASC_PLAYING_FOR_LIFE_URL}]},
        {id:'gs-review',title:'Game sense review',section:'cooldowns',minutes:6,included:true,detail:'Students explain a decision that helped their team.',how:'Ask teams what they changed to improve performance.',cues:'Good athletes think and move.',safety:'Use calm discussion after high-energy play.',progressions:'Students modify one rule for next round.',links:[{label:'Australian Curriculum HPE',url:AUSTRALIAN_HPE_URL}]}
      ]
    },
    {
      id:'wet-weather-athletics',
      title:'Wet Weather Athletics Classroom/Gym',
      duration:35,
      focus:'Indoor-safe movement learning for days when oval training is not possible.',
      miniCoach:'Mini Coach: wet weather lessons can still build vocabulary, rhythm, strength and safety habits.',
      curriculum:[
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL},
        {label:'SPARK sample lessons',url:SPARK_PE_URL},
        {label:'ASC Playing for Life',url:ASC_PLAYING_FOR_LIFE_URL}
      ],
      activities:[
        {id:'ww-space-check',title:'Indoor space check',section:'starters',minutes:4,included:true,detail:'Identify safe movement areas and equipment limits.',how:'Walk boundaries, mark no-go zones and set voice level expectations.',cues:'Small space, small movement, big control.',safety:'Remove chairs/bags and avoid slippery floors.',progressions:'Students help set station boundaries.',links:[{label:'SPARK sample lessons',url:SPARK_PE_URL}]},
        {id:'ww-tech-circuit',title:'Technique shadow circuit',section:'sessions',minutes:9,included:true,detail:'Shadow sprint arms, jump take-off shapes and throw positions.',how:'Rotate through stations without running or releasing equipment.',cues:'Quality shapes, slow control.',safety:'No throwing objects indoors unless soft and approved.',progressions:'Add peer coach cue cards.',links:[{label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL}]},
        {id:'ww-reaction',title:'Reaction and rhythm games',section:'sessions',minutes:8,included:true,detail:'Clap starts, mirror movement and foot rhythm drills.',how:'Students react to visual/audio cues and move in place or over short markers.',cues:'Ready shape, quick response, stop balanced.',safety:'Low-speed movements only.',progressions:'Students become callers/leaders.',links:[{label:'ASC Playing for Life',url:ASC_PLAYING_FOR_LIFE_URL}]},
        {id:'ww-plan-event',title:'Design an event station',section:'sessions',minutes:8,included:true,detail:'Groups design a safe athletics station for the next outdoor lesson.',how:'Give each group run, jump or throw and ask for rules, safety and scoring.',cues:'Plan for fairness and safety.',safety:'Teacher approves all ideas before use.',progressions:'Best stations become next lesson rotations.',links:[{label:'Australian Curriculum HPE',url:AUSTRALIAN_HPE_URL}]},
        {id:'ww-share',title:'Share and select',section:'cooldowns',minutes:6,included:true,detail:'Groups explain one station and one safety rule.',how:'Keep presentations to 30 seconds and record useful ideas.',cues:'Clear, simple, safe.',safety:'No demonstrations that need speed indoors.',progressions:'Save as Programming notes.',links:[{label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL}]}
      ]
    },
    {
      id:'upper-primary-athletics-unit',
      title:'Upper Primary 6-Lesson Athletics Unit',
      duration:50,
      focus:'A unit-style overview lesson for Years 5-6 covering sprint, relay, jump, throw and pacing.',
      miniCoach:'Mini Coach: use this as a planning shell. It helps map a multi-week athletics block, not just one session.',
      curriculum:[
        {label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL},
        {label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL},
        {label:'ASC Sport Lesson Plans',url:ASC_SPORT_LESSON_PLANS_URL}
      ],
      activities:[
        {id:'unit-map',title:'Unit map and success criteria',section:'starters',minutes:8,included:true,detail:'Show students the athletics block and what success looks like.',how:'List lessons: sprint, relay, jump, throw, pacing, PB trials. Students choose a personal focus.',cues:'Technique, effort, safety, teamwork.',safety:'Explain that trials are staff-managed and inclusive.',progressions:'Students add a personal goal card.',links:[{label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL}]},
        {id:'unit-skill-sample',title:'Skill sample rotation',section:'sessions',minutes:18,included:true,detail:'Short samples of sprint, jump and throw stations.',how:'Run three six-minute stations with quick cues only.',cues:'Try the cue, notice what changes.',safety:'Throw station has separate space and retrieval signal.',progressions:'Students rate confidence for each event.',links:[{label:'World Athletics Kids',url:WORLD_ATHLETICS_KIDS_URL}]},
        {id:'unit-peer-coach',title:'Peer coaching cards',section:'sessions',minutes:10,included:true,detail:'Students use simple cue cards to coach a partner.',how:'Give one cue per event. Partner watches and gives one helpful comment.',cues:'One cue at a time; be specific and kind.',safety:'Teacher models respectful feedback.',progressions:'Students write their own cue card.',links:[{label:'Australian Curriculum HPE',url:AUSTRALIAN_HPE_URL}]},
        {id:'unit-mini-event',title:'Mini event choice',section:'sessions',minutes:8,included:true,detail:'Students choose one event to practise with feedback.',how:'Open stations and direct students to their chosen event.',cues:'Choose the event that matches your goal.',safety:'Cap numbers per station.',progressions:'Record goal groups for future lessons.',links:[{label:'ASC Sport Lesson Plans',url:ASC_SPORT_LESSON_PLANS_URL}]},
        {id:'unit-exit-ticket',title:'Exit ticket',section:'cooldowns',minutes:6,included:true,detail:'Students write one event goal and one safety rule.',how:'Use sticky notes or digital notes.',cues:'Specific goals help training.',safety:'Collect notes privately if confidence is low.',progressions:'Use goals to assign training later.',links:[{label:'WA Curriculum HPE',url:WA_HPE_CURRICULUM_URL}]}
      ]
    }
  ]);

  function clonePlan(plan){return JSON.parse(JSON.stringify(plan));}
  function resourceSessionPlans(){
    var saved=load(RESOURCE_SESSION_PLANS_KEY,{});
    return RESOURCE_SESSION_TEMPLATES.map(function(template){
      var override=saved[template.id]||{};
      var merged=clonePlan(template);
      if(override.duration){merged.duration=Number(override.duration)||merged.duration;}
      if(Array.isArray(override.activities)){
        merged.activities=merged.activities.map(function(activity){
          var edited=override.activities.find(function(row){return row.id===activity.id;})||{};
          return Object.assign({},activity,{
            included:edited.included!==undefined?!!edited.included:activity.included,
            minutes:edited.minutes!==undefined?Number(edited.minutes)||0:activity.minutes,
            section:edited.section||activity.section||'sessions'
          });
        });
      }
      merged.sections=resourcePlanSections(merged,override.sections);
      return merged;
    });
  }

  function activeResourceSession(){
    return resourceSessionPlans().find(function(plan){return plan.id===activeResourceSessionId;})||resourceSessionPlans()[0];
  }

  function resourceIncludedMinutes(plan){
    return plan.activities.filter(function(activity){return activity.included;}).reduce(function(total,activity){return total+Number(activity.minutes||0);},0);
  }

  function resourceSectionMinutes(plan,sectionId){
    return plan.activities.filter(function(activity){return activity.included&&(activity.section||'sessions')===sectionId;}).reduce(function(total,activity){return total+Number(activity.minutes||0);},0);
  }

  function resourcePlanSections(plan,overrides){
    var saved=Array.isArray(overrides)?overrides:[];
    return RESOURCE_PLAN_SECTIONS.map(function(section){
      var edited=saved.find(function(row){return row.id===section.id;})||{};
      return {
        id:section.id,
        title:section.title,
        target:edited.target!==undefined?Number(edited.target)||0:section.defaultTarget,
        note:edited.note||'',
        placeholder:section.placeholder
      };
    });
  }

  function resourceMiniCoachRecommendations(plan){
    var notes=[];
    var selected=resourceIncludedMinutes(plan);
    var included=plan.activities.filter(function(activity){return activity.included;});
    var includedText=included.map(function(activity){return (activity.title+' '+activity.detail+' '+(activity.how||'')+' '+(activity.cues||'')).toLowerCase();}).join(' ');
    plan.sections.forEach(function(section){
      var actual=resourceSectionMinutes(plan,section.id);
      if(actual===0){notes.push(section.title+' is empty. Add or tick at least one activity so the plan has a clear '+section.title.toLowerCase()+' block.');}
      else if(section.target&&actual>section.target+3){notes.push(section.title+' is '+(actual-section.target)+' minutes over target. Consider trimming or moving one activity.');}
      else if(section.target&&actual<section.target-3){notes.push(section.title+' is '+(section.target-actual)+' minutes under target. Add a cue, transition, or reflection task if needed.');}
    });
    if(/\bsprint|acceleration|start|speed/.test(includedText)&&!/\brelay|baton|exchange/.test(includedText)){notes.push('Because you have sprint work selected, a short relay exchange or reaction game would pair well without adding too much load.');}
    if(/\bthrow|vortex|javelin/.test(includedText)&&!/\bsafety|retrieval|wait line/.test(includedText)){notes.push('Throwing is selected, so add a safety routine or retrieval signal before any distance attempts.');}
    if(/\blong jump|jump|landing/.test(includedText)&&!/\blanding|stick/.test(includedText)){notes.push('Jump work pairs best with a landing-shape starter before measured attempts.');}
    if(/\bpacing|cross country|400m|endurance/.test(includedText)&&/\bsprint|maximum/.test(includedText)){notes.push('This mixes endurance and speed. Keep sprint reps short and make the pacing block controlled rather than maximal.');}
    if(included.length>=6){notes.push('You have a busy lesson. Consider opening the chat and asking “what should I cut?” if time gets tight.');}
    if(selected>Number(plan.duration||0)){notes.push('Selected activities are longer than the session length. Reduce minutes or increase the session length.');}
    if(selected<=Number(plan.duration||0)&&!notes.length){notes.push('This balance looks workable. Keep transitions tight and use the notes boxes to remind staff what to emphasise.');}
    return notes;
  }

  function resourcePlanSearchText(plan){
    return [
      plan.title,plan.focus,plan.miniCoach,
      plan.curriculum.map(function(link){return link.label;}).join(' '),
      plan.activities.map(function(activity){return [activity.title,activity.detail,activity.how,activity.cues,activity.safety,activity.progressions].join(' ');}).join(' ')
    ].join(' ').toLowerCase();
  }

  function resourceKeywordScore(text,query){
    var words=String(query||'').toLowerCase().split(/[^a-z0-9]+/).filter(function(word){return word.length>2;});
    return words.reduce(function(score,word){return score+(text.indexOf(word)!==-1?1:0);},0);
  }

  function resourceCoachPairings(plan){
    var text=resourcePlanSearchText(plan);
    var pairings=[];
    function add(label,reason){
      if(!pairings.some(function(item){return item.label===label;})){pairings.push({label:label,reason:reason});}
    }
    if(/\bsprint|acceleration|start|speed/.test(text)){
      add('Straight-Line Baton Relay','Sprint starts pair naturally with relay exchanges and team communication.');
      add('Long Jump Primary Progression','Acceleration rhythm transfers well into a short long-jump run-up.');
      add('Athletics PB And Assessment Trials','Use PB trials after students have practised sprint mechanics safely.');
    }
    if(/\bpacing|cross country|endurance|400m/.test(text)){
      add('Cross Country Skills And Course Confidence','Pacing lessons connect directly to course confidence and effort choices.');
      add('Middle Distance Pacing 100m, 200m, 400m','Use this to sharpen pacing without turning it into a max-effort session.');
    }
    if(/\bthrow|vortex|javelin/.test(text)){
      add('Athletics Station Circuit','Vortex work fits well as one station inside a broader circuit.');
      add('Athletics PB And Assessment Trials','Measured throws work best after a safety-routine lesson.');
    }
    if(/\bjump|landing|long jump/.test(text)){
      add('Run, Jump, Throw Fundamentals','Use fundamental landing shapes before measured jumps.');
      add('Athletics Station Circuit','Jump stations pair well with sprint and throw stations for high participation.');
    }
    if(/\bball|teamwork|pass|tunnel|leader/.test(text)){
      add('Game Sense Athletics','Ball games pair with game-sense activities because both teach decisions and teamwork.');
      add('Inclusive Athletics Adaptations','Use adaptations to keep ball-game roles fair across mixed abilities.');
    }
    if(!pairings.length){
      add('Athletics Station Circuit','A station circuit is the safest default pairing when the lesson goal is broad.');
      add('Run, Jump, Throw Fundamentals','Use fundamentals when a class needs a reset before specialised event work.');
    }
    return pairings.slice(0,4);
  }

  function setResourceMiniCoachOpen(open){
    if(!resourceMiniCoachWidgetEl||!resourceMiniCoachToggleEl||!resourceMiniCoachPopoverEl){return;}
    resourceMiniCoachWidgetEl.classList.toggle('open',!!open);
    resourceMiniCoachToggleEl.setAttribute('aria-expanded',open?'true':'false');
    resourceMiniCoachPopoverEl.hidden=!open;
  }

  function updateResourceMiniCoachWidget(plan){
    if(!resourceMiniCoachWidgetEl||!resourceMiniCoachSessionEl||!resourceMiniCoachSummaryEl||!resourceMiniCoachNotesEl){return;}
    var notes=resourceMiniCoachRecommendations(plan);
    resourceMiniCoachSessionEl.textContent=plan.title;
    resourceMiniCoachSummaryEl.textContent=plan.miniCoach.replace(/^Mini Coach:\s*/,'');
    resourceMiniCoachNotesEl.innerHTML=notes.map(function(note){return '<li>'+escapeHtml(note)+'</li>';}).join('');
    if(resourceMiniCoachActionsEl){
      resourceMiniCoachActionsEl.innerHTML='<strong>Quick help</strong><div>'+resourceMiniCoachQuickActions(plan).map(function(action){
        return '<button type="button" data-mini-coach-question="'+escapeAttr(action.prompt)+'">'+escapeHtml(action.label)+'</button>';
      }).join('')+'</div>';
      Array.prototype.forEach.call(resourceMiniCoachActionsEl.querySelectorAll('[data-mini-coach-question]'),function(btn){
        btn.addEventListener('click',function(){resourceMiniCoachAsk(btn.getAttribute('data-mini-coach-question')||'');});
      });
    }
    if(resourceMiniCoachPairingsEl){
      resourceMiniCoachPairingsEl.innerHTML='<strong>Pairs well with</strong><div>'+resourceCoachPairings(plan).map(function(item){
        return '<button type="button" data-mini-coach-question="How should I pair '+escapeAttr(plan.title)+' with '+escapeAttr(item.label)+'?">'+escapeHtml(item.label)+'</button>';
      }).join('')+'</div>';
      Array.prototype.forEach.call(resourceMiniCoachPairingsEl.querySelectorAll('[data-mini-coach-question]'),function(btn){
        btn.addEventListener('click',function(){
          resourceMiniCoachAsk(btn.getAttribute('data-mini-coach-question')||'');
        });
      });
    }
  }

  function resourceMiniCoachQuickActions(plan){
    var title=plan.title;
    return [
      {label:'Build program',prompt:'Make me a 4 week program based on '+title},
      {label:'Safety check',prompt:'Give me a safety check for '+title},
      {label:'Differentiate',prompt:'How can I differentiate '+title+' for mixed ability students?'},
      {label:'Equipment',prompt:'What equipment and setup do I need for '+title+'?'},
      {label:'Assessment',prompt:'How should I assess or record progress for '+title+'?'},
      {label:'Wet weather',prompt:'Give me a wet weather backup for '+title}
    ];
  }

  function resourceMiniCoachSearchPlans(query){
    return resourceSessionPlans().map(function(plan){
      return {plan:plan,score:resourceKeywordScore(resourcePlanSearchText(plan),query)};
    }).filter(function(row){return row.score>0;}).sort(function(a,b){return b.score-a.score;}).slice(0,4).map(function(row){return row.plan;});
  }

  function resourceMiniCoachGoalTags(goal){
    var q=String(goal||'').toLowerCase();
    var tags=[];
    if(/\bsprint|50m|75m|100m|200m|speed|acceleration/.test(q)){tags.push('sprint','speed');}
    if(/\brelay|baton/.test(q)){tags.push('relay','teamwork');}
    if(/\bcross country|endurance|distance|400m|800m|pacing|stamina/.test(q)){tags.push('pacing','cross country','endurance');}
    if(/\blong jump|jump|landing/.test(q)){tags.push('jump');}
    if(/\bthrow|vortex|javelin|shot|discus/.test(q)){tags.push('throw');}
    if(/\bball|tunnel|leader|pass/.test(q)){tags.push('ball game','teamwork');}
    if(/\binclusive|mixed ability|confidence|beginner/.test(q)){tags.push('inclusive','fundamentals');}
    if(/\bpb|trial|assess|carnival|team/.test(q)){tags.push('assessment','carnival');}
    if(/\bwet|rain|indoor|classroom|gym/.test(q)){tags.push('wet weather');}
    if(!tags.length){tags.push('fundamentals','athletics');}
    return Array.from(new Set(tags));
  }

  function resourceMiniCoachWeeks(goal){
    var match=String(goal||'').match(/(\d+)\s*(?:week|wk)/i);
    var weeks=match?Math.max(1,Math.min(10,Number(match[1]))):4;
    return weeks;
  }

  function resourceMiniCoachPlanScore(plan,tags,goal){
    var text=resourcePlanSearchText(plan);
    var score=resourceKeywordScore(text,goal);
    tags.forEach(function(tag){if(text.indexOf(tag)!==-1){score+=3;}});
    if(/foundation|fundamental/.test(text)){score+=1;}
    if(/assessment|pb|trial/.test(text)&&tags.indexOf('assessment')!==-1){score+=2;}
    return score;
  }

  function resourceMiniCoachBuildProgram(goal){
    var weeks=resourceMiniCoachWeeks(goal);
    var tags=resourceMiniCoachGoalTags(goal);
    var ranked=resourceSessionPlans().map(function(plan){
      return {plan:plan,score:resourceMiniCoachPlanScore(plan,tags,goal)};
    }).sort(function(a,b){return b.score-a.score;}).map(function(row){return row.plan;});
    var fallbackTitles=['Run, Jump, Throw Fundamentals','Athletics Station Circuit','Athletics PB And Assessment Trials'];
    fallbackTitles.forEach(function(title){
      var plan=resourceSessionPlans().find(function(item){return item.title===title;});
      if(plan&&ranked.indexOf(plan)===-1){ranked.push(plan);}
    });
    var selected=[];
    ranked.forEach(function(plan){
      if(selected.length<Math.min(weeks,6)&&selected.indexOf(plan)===-1){selected.push(plan);}
    });
    while(selected.length<weeks){
      selected.push(selected[selected.length%Math.max(1,selected.length)]||resourceSessionPlans()[0]);
    }
    var sessions=[];
    for(var i=0;i<weeks;i++){
      var source=selected[i%selected.length];
      var cloned=clonePlan(source);
      var includeLimit=i===weeks-1?5:4;
      var activities=cloned.activities.filter(function(activity){return activity.included;}).slice(0,includeLimit);
      if(i===weeks-1&&resourcePlanSearchText(source).indexOf('assessment')===-1){
        var assessment=resourceSessionPlans().find(function(plan){return plan.id==='assessment-pb-trials';});
        if(assessment){source=assessment; cloned=clonePlan(assessment); activities=cloned.activities.filter(function(activity){return activity.included;}).slice(0,5);}
      }
      sessions.push({
        week:i+1,
        title:(weeks>1?'Week '+(i+1)+': ':'')+source.title,
        sourceId:source.id,
        sourceTitle:source.title,
        focus:source.focus,
        duration:source.duration,
        activities:activities.map(function(activity){return {title:activity.title,minutes:activity.minutes,detail:activity.detail,cues:activity.cues||'',safety:activity.safety||''};}),
        safety:activities.map(function(activity){return activity.safety;}).filter(Boolean)[0]||'Keep clear boundaries, hydrate, and adjust intensity to student readiness.'
      });
    }
    return {
      id:'mini-coach-program-'+Date.now(),
      goal:String(goal||'').trim(),
      weeks:weeks,
      tags:tags,
      sessions:sessions,
      created_at:new Date().toISOString()
    };
  }

  function resourceMiniCoachProgramSummary(program){
    return 'I drafted a '+program.weeks+' week program for: '+program.goal+'. It uses '+program.sessions.map(function(session){return session.sourceTitle;}).filter(function(value,index,self){return self.indexOf(value)===index;}).join(', ')+'. Review it, then apply it to the editable planner if it fits.';
  }

  function renderResourceMiniCoachProgram(program){
    if(!resourceMiniCoachProgramEl){return;}
    if(!program){resourceMiniCoachProgramEl.hidden=true;resourceMiniCoachProgramEl.innerHTML='';return;}
    resourceMiniCoachProgramEl.hidden=false;
    resourceMiniCoachProgramEl.innerHTML='<strong>Generated program</strong><p>'+escapeHtml(program.goal)+'</p>'+
      '<div class="resource-mini-coach-program-list">'+program.sessions.map(function(session){
        return '<details><summary>'+escapeHtml(session.title)+' <span>'+Number(session.duration||0)+' min</span></summary>'+
          '<p>'+escapeHtml(session.focus)+'</p>'+
          '<ul>'+session.activities.map(function(activity){return '<li><strong>'+escapeHtml(activity.title)+'</strong> '+Number(activity.minutes||0)+' min - '+escapeHtml(activity.detail)+'</li>';}).join('')+'</ul>'+
          '<small>Safety: '+escapeHtml(session.safety)+'</small>'+
        '</details>';
      }).join('')+'</div>'+
      '<div class="resource-mini-coach-program-actions"><button type="button" id="apply-mini-coach-program-btn">Apply first session</button><button type="button" id="copy-mini-coach-program-btn">Copy summary</button></div>';
    var applyBtn=document.getElementById('apply-mini-coach-program-btn');
    var copyBtn=document.getElementById('copy-mini-coach-program-btn');
    if(applyBtn){applyBtn.addEventListener('click',applyMiniCoachProgramFirstSession);}
    if(copyBtn){copyBtn.addEventListener('click',copyMiniCoachProgramSummary);}
  }

  function applyMiniCoachProgramFirstSession(){
    if(!resourceMiniCoachGeneratedProgram||!resourceMiniCoachGeneratedProgram.sessions.length){return;}
    activeResourceSessionId=resourceMiniCoachGeneratedProgram.sessions[0].sourceId;
    renderResourceSessionPlanner();
    resourceMiniCoachChatHistory.push({role:'coach',text:'Applied the first generated session to the editable planner. You can now adjust timings, tick activities, drag sections and save it.'});
    renderResourceMiniCoachChat();
    setResourceMiniCoachOpen(true);
  }

  function copyMiniCoachProgramSummary(){
    if(!resourceMiniCoachGeneratedProgram){return;}
    var text=resourceMiniCoachProgramSummary(resourceMiniCoachGeneratedProgram)+'\n'+resourceMiniCoachGeneratedProgram.sessions.map(function(session){
      return session.title+' - '+session.focus+' - '+session.activities.map(function(activity){return activity.title+' ('+activity.minutes+' min)';}).join(', ');
    }).join('\n');
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).catch(function(){});
    }
    resourceMiniCoachChatHistory.push({role:'coach',text:'Program summary prepared. If clipboard access is available, it has been copied.'});
    renderResourceMiniCoachChat();
  }

  function resourceMiniCoachAnswer(question,plan){
    var q=String(question||'').toLowerCase();
    var selected=plan.activities.filter(function(activity){return activity.included;});
    var selectedTitles=selected.map(function(activity){return activity.title;}).join(', ')||'nothing selected yet';
    if(/\b(make|build|create|generate|write|draft)\b.*\b(program|plan|unit|sessions|lesson block)\b|\bprogram for\b|\bplan for\b/.test(q)){
      resourceMiniCoachGeneratedProgram=resourceMiniCoachBuildProgram(question);
      renderResourceMiniCoachProgram(resourceMiniCoachGeneratedProgram);
      return resourceMiniCoachProgramSummary(resourceMiniCoachGeneratedProgram);
    }
    if(/\bsprint|50|75|100|speed/.test(q)){return 'For sprints, choose Sprint Mechanics first, then pair it with Straight-Line Baton Relay, Long Jump Primary Progression, or PB Trials. Keep efforts short, give full walk-back recovery, and avoid too many max reps.';}
    if(/\bthrow|vortex/.test(q)){return 'For Vortex or throws, start with safety routine, side-on shapes, then controlled zone throws. Only measure after retrieval rules are automatic.';}
    if(/\bjump|long/.test(q)){return 'For long jump, pair landing shapes with five-step run-up rhythm. Measure only after students can land safely and repeat a controlled take-off.';}
    if(/\bpair|with|combine|match/.test(q)){
      return 'For '+plan.title+', I would pair it with '+resourceCoachPairings(plan).map(function(item){return item.label+' because '+item.reason.toLowerCase();}).join(' ');
    }
    if(/\bcut|short|time|too long|trim/.test(q)){
      var over=resourceIncludedMinutes(plan)-Number(plan.duration||0);
      if(over>0){return 'You are '+over+' minutes over. Keep the starter, keep the safest main activity, then trim the lowest-priority repeated practice block first. Current selected activities: '+selectedTitles+'.';}
      return 'You are within the session length. If you need to shorten it, cut one repeated practice block before cutting safety, warm-up, or cooldown.';
    }
    if(/\bsafety|risk|safe|medical/.test(q)){
      return 'Safety focus for this lesson: keep clear boundaries, avoid max efforts without recovery, and preserve any activity marked around retrieval, landing, finish flow, or medical checks. For the selected lesson, do not cut safety routines before technical practice.';
    }
    if(/\bdifferentiate|inclusive|mixed ability|support|extension|easier|harder/.test(q)){
      return 'Differentiate by changing distance, speed, object weight, target size, recovery time and role. Keep the same learning goal, but offer choices: supported movement pathway, standard challenge, and extension challenge. Avoid public ranking; track personal bests and effort cues.';
    }
    if(/\bequipment|setup|cones|gear|what do i need/.test(q)){
      return 'Setup checklist: cones for boundaries, clear run-off space, first aid/medical notes, water point, whistle/timer, clipboard or device, and event-specific gear. For sprints use lanes and finish markers. For throws use a wait line, throw line and retrieval signal. For jumps check the landing surface first.';
    }
    if(/\bassess|assessment|record|rubric|progress|pb/.test(q)){
      return 'Assessment can be simple: 1 technique cue observed, 1 safety behaviour, 1 participation/teamwork note, and optional PB result. Record progress after technique practice, not before. For younger students, use “safe / developing / confident” rather than over-measuring.';
    }
    if(/\bwet weather|rain|indoor|gym|classroom/.test(q)){
      return 'Wet-weather backup: use technique shadows, reaction games, rhythm drills, station design, cue-card peer coaching and goal setting. Avoid full throws or sprints indoors unless the space is approved and equipment is soft.';
    }
    if(/\bbrainstorm|ideas|functions|what else|features/.test(q)){
      return 'Mini Coach could also help with: automatic unit plans, equipment lists, safety risk prompts, differentiation options, PB/assessment rubrics, wet-weather swaps, parent-safe summaries, student cue cards, lesson reflection questions, team selection notes, and next-session recommendations.';
    }
    if(/\bwarm|starter|start/.test(q)){
      return 'A good starter should prepare the exact skill. Sprint lessons suit ankling, A-skips and reaction starts. Jump lessons suit landing shapes. Throw lessons suit no-equipment safety rehearsal. Pacing lessons suit talk-test jogging.';
    }
    if(/\bcurriculum|wa|hpe|link/.test(q)){
      return 'This library maps back to WA Curriculum HPE movement learning, active choices, teamwork and safe participation. Open the source chips in each lesson leg for the exact curriculum/resource family.';
    }
    if(/\bselect|recommend|best|suit|choose|lesson/.test(q)){
      var matches=resourceMiniCoachSearchPlans(question);
      if(matches.length){return 'Best catalogue matches: '+matches.map(function(match){return match.title+' - '+match.focus;}).join(' | ');}
    }
    return 'Based on the current lesson, you have selected '+selectedTitles+'. My next best action is: '+resourceMiniCoachRecommendations(plan)[0]+' You can ask about pairings, safety, warm-ups, timing, curriculum, or which lesson suits a specific event.';
  }

  function renderResourceMiniCoachChat(){
    if(!resourceMiniCoachChatLogEl){return;}
    resourceMiniCoachChatLogEl.innerHTML=resourceMiniCoachChatHistory.slice(-8).map(function(msg){
      return '<div class="resource-mini-coach-message resource-mini-coach-message--'+escapeAttr(msg.role)+'"><strong>'+escapeHtml(msg.role==='coach'?'Mini Coach':'Coach')+'</strong><p>'+escapeHtml(msg.text)+'</p></div>';
    }).join('');
    resourceMiniCoachChatLogEl.scrollTop=resourceMiniCoachChatLogEl.scrollHeight;
  }

  function resourceMiniCoachAsk(question){
    var clean=String(question||'').trim();
    if(!clean){return;}
    var plan=currentResourcePlanFromDom();
    resourceMiniCoachChatHistory.push({role:'user',text:clean});
    resourceMiniCoachChatHistory.push({role:'coach',text:resourceMiniCoachAnswer(clean,plan)});
    renderResourceMiniCoachChat();
    if(resourceMiniCoachChatInputEl){resourceMiniCoachChatInputEl.value='';}
    setResourceMiniCoachOpen(true);
  }

  function currentResourcePlanFromDom(){
    var plan=activeResourceSession();
    var sections=RESOURCE_PLAN_SECTIONS.map(function(section){
      var targetEl=document.querySelector('.resource-section-target[data-section-id="'+section.id+'"]');
      var noteEl=document.querySelector('.resource-section-note[data-section-id="'+section.id+'"]');
      return {id:section.id,title:section.title,target:targetEl?Math.max(0,Number(targetEl.value||0)):section.defaultTarget,note:noteEl?noteEl.value.trim():'',placeholder:section.placeholder};
    });
    var activities=plan.activities.map(function(activity){
      var includeEl=document.querySelector('.resource-activity-include[data-activity-id="'+activity.id+'"]');
      var minuteEl=document.querySelector('.resource-activity-minutes[data-activity-id="'+activity.id+'"]');
      var rowEl=document.querySelector('.resource-activity-row[data-activity-id="'+activity.id+'"]');
      var sectionEl=rowEl?rowEl.closest('.resource-section-dropzone'):null;
      return Object.assign({},activity,{
        included:includeEl?includeEl.checked:activity.included,
        minutes:minuteEl?Math.max(0,Number(minuteEl.value||0)):activity.minutes,
        section:sectionEl?sectionEl.getAttribute('data-resource-section'):(activity.section||'sessions')
      });
    });
    return Object.assign({},plan,{sections:sections,activities:activities,duration:Number(document.getElementById('resource-session-duration').value||plan.duration)});
  }

  function updateResourceSectionSummary(){
    var plan=currentResourcePlanFromDom();
    plan.sections.forEach(function(section){
      var zone=document.querySelector('.resource-section-dropzone[data-resource-section="'+section.id+'"]');
      var label=zone&&zone.querySelector('.resource-section-head span');
      if(label){label.textContent=resourceSectionMinutes(plan,section.id)+' / '+Number(section.target||0)+' min';}
    });
    var footer=document.querySelector('.resource-session-footer span');
    if(footer){footer.textContent=resourceIncludedMinutes(plan)+' selected minutes of '+Number(plan.duration||0)+' planned';}
    updateResourceMiniCoachWidget(plan);
  }

  function resourceActivityRows(plan,sectionId){
    var rows=plan.activities.filter(function(activity){return (activity.section||'sessions')===sectionId;});
    if(!rows.length){return '<p class="resource-empty-drop">Drag an activity into this section.</p>';}
    return rows.map(function(activity){
      var links=Array.isArray(activity.links)&&activity.links.length?activity.links:plan.curriculum;
      var linkHtml=links.map(function(link){return '<a href="'+escapeAttr(link.url)+'" target="_blank" rel="noopener">'+escapeHtml(link.label)+'</a>';}).join('');
      var breakdown=[
        activity.how?'<p><strong>How:</strong> '+escapeHtml(activity.how)+'</p>':'',
        activity.cues?'<p><strong>Cues:</strong> '+escapeHtml(activity.cues)+'</p>':'',
        activity.safety?'<p><strong>Safety:</strong> '+escapeHtml(activity.safety)+'</p>':'',
        activity.progressions?'<p><strong>Progression:</strong> '+escapeHtml(activity.progressions)+'</p>':''
      ].join('');
      return '<div class="resource-activity-row" draggable="true" data-activity-id="'+escapeAttr(activity.id)+'">'+
        '<input type="checkbox" class="resource-activity-include" data-activity-id="'+escapeAttr(activity.id)+'" '+(activity.included?'checked':'')+' aria-label="Include '+escapeAttr(activity.title)+'" />'+
        '<details class="resource-activity-detail"><summary><strong>'+escapeHtml(activity.title)+'</strong><small>'+escapeHtml(activity.detail)+'</small></summary><div class="resource-activity-breakdown">'+breakdown+'<div class="resource-activity-links">'+linkHtml+'</div></div></details>'+
        '<input type="number" class="resource-activity-minutes" data-activity-id="'+escapeAttr(activity.id)+'" min="0" step="1" value="'+Number(activity.minutes||0)+'" aria-label="Minutes for '+escapeAttr(activity.title)+'" />'+
      '</div>';
    }).join('');
  }

  function curriculumChips(plan){
    return plan.curriculum.map(function(item){
      return '<a class="resource-curriculum-chip" href="'+escapeAttr(item.url)+'" target="_blank" rel="noopener">'+escapeHtml(item.label)+'</a>';
    }).join('');
  }

  function renderResourceSessionPlanner(){
    if(!resourceSessionListEl||!resourceSessionDetailEl){return;}
    var plans=resourceSessionPlans();
    var active=plans.find(function(plan){return plan.id===activeResourceSessionId;})||plans[0];
    activeResourceSessionId=active.id;
    resourceSessionListEl.innerHTML=plans.map(function(plan){
      return '<button type="button" class="'+(plan.id===active.id?'resource-session-tab active':'resource-session-tab')+'" data-resource-session="'+escapeAttr(plan.id)+'">'+
        '<strong>'+escapeHtml(plan.title)+'</strong><span>'+resourceIncludedMinutes(plan)+'/'+Number(plan.duration||0)+' min</span></button>';
    }).join('');
    resourceSessionDetailEl.innerHTML=
      '<article class="resource-session-panel">'+
        '<div class="resource-session-head"><div><h3>'+escapeHtml(active.title)+'</h3><p>'+escapeHtml(active.focus)+'</p></div>'+
        '<label>Session length <input id="resource-session-duration" type="number" min="5" step="5" value="'+Number(active.duration||0)+'" /></label></div>'+
        '<div class="resource-curriculum-links">'+curriculumChips(active)+'</div>'+
        '<div class="resource-section-grid">'+active.sections.map(function(section){
          return '<section class="resource-section-dropzone" data-resource-section="'+escapeAttr(section.id)+'">'+
            '<div class="resource-section-head"><h4>'+escapeHtml(section.title)+'</h4><span>'+resourceSectionMinutes(active,section.id)+' / '+Number(section.target||0)+' min</span></div>'+
            '<label>Section target minutes <input type="number" class="resource-section-target" data-section-id="'+escapeAttr(section.id)+'" min="0" step="1" value="'+Number(section.target||0)+'" /></label>'+
            '<label>Coach notes <textarea class="resource-section-note" data-section-id="'+escapeAttr(section.id)+'" rows="3" placeholder="'+escapeAttr(section.placeholder)+'">'+escapeHtml(section.note||'')+'</textarea></label>'+
            '<div class="resource-activity-list">'+resourceActivityRows(active,section.id)+'</div>'+
          '</section>';
        }).join('')+'</div>'+
        '<div class="resource-session-footer"><span>'+resourceIncludedMinutes(active)+' selected minutes of '+Number(active.duration||0)+' planned</span><button id="save-resource-session-plan-btn" type="button">Save session plan</button></div>'+
      '</article>';
    Array.prototype.forEach.call(resourceSessionListEl.querySelectorAll('[data-resource-session]'),function(btn){
      btn.addEventListener('click',function(){activeResourceSessionId=btn.getAttribute('data-resource-session');renderResourceSessionPlanner();});
    });
    document.getElementById('save-resource-session-plan-btn').addEventListener('click',saveResourceSessionPlan);
    bindResourceDragDrop();
    updateResourceMiniCoachWidget(active);
  }

  function saveResourceSessionPlan(){
    var plan=currentResourcePlanFromDom();
    var saved=load(RESOURCE_SESSION_PLANS_KEY,{});
    var activities=plan.activities.map(function(activity){return {id:activity.id,included:activity.included,minutes:activity.minutes,section:activity.section};});
    var sectionRows=plan.sections.map(function(section){return {id:section.id,target:section.target,note:section.note};});
    saved[plan.id]={duration:plan.duration,sections:sectionRows,activities:activities,updated_at:new Date().toISOString()};
    save(RESOURCE_SESSION_PLANS_KEY,saved);
    renderResourceSessionPlanner();
    showResult(resourcePlanSaveStatusEl,{success:true,message:'Session plan saved.',session:plan.title,total_minutes:activities.filter(function(row){return row.included;}).reduce(function(total,row){return total+Number(row.minutes||0);},0)});
  }

  function resourceActivityDragStart(e){
    var row=e.currentTarget;
    e.dataTransfer.setData('text/plain',row.getAttribute('data-activity-id'));
    e.dataTransfer.effectAllowed='move';
  }

  function resourceActivityDrop(e){
    e.preventDefault();
    var activityId=e.dataTransfer.getData('text/plain');
    var target=e.currentTarget.querySelector('.resource-activity-list');
    var row=document.querySelector('.resource-activity-row[data-activity-id="'+activityId+'"]');
    if(target&&row){target.appendChild(row);}
    e.currentTarget.classList.remove('drag-over');
    updateResourceSectionSummary();
  }

  function bindResourceDragDrop(){
    Array.prototype.forEach.call(document.querySelectorAll('.resource-activity-row'),function(row){
      row.addEventListener('dragstart',resourceActivityDragStart);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.resource-section-dropzone'),function(zone){
      zone.addEventListener('dragover',function(e){e.preventDefault();zone.classList.add('drag-over');});
      zone.addEventListener('dragleave',function(){zone.classList.remove('drag-over');});
      zone.addEventListener('drop',resourceActivityDrop);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.resource-section-target,.resource-section-note,.resource-activity-include,.resource-activity-minutes,#resource-session-duration'),function(input){
      input.addEventListener('input',updateResourceSectionSummary);
      input.addEventListener('change',updateResourceSectionSummary);
    });
  }

  renderResourceSessionPlanner();
  if(resourceMiniCoachToggleEl){
    resourceMiniCoachToggleEl.addEventListener('click',function(){
      setResourceMiniCoachOpen(resourceMiniCoachPopoverEl?resourceMiniCoachPopoverEl.hidden:true);
    });
  }
  if(resourceMiniCoachCloseEl){
    resourceMiniCoachCloseEl.addEventListener('click',function(){setResourceMiniCoachOpen(false);});
  }
  if(resourceMiniCoachChatFormEl){
    resourceMiniCoachChatFormEl.addEventListener('submit',function(e){
      e.preventDefault();
      resourceMiniCoachAsk(resourceMiniCoachChatInputEl?resourceMiniCoachChatInputEl.value:'');
    });
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
    assignStudentCredentials(student,students);
    students.push(student);
    saveStudentsWithBackend(students,student).then(function(result){
      if(!result.ok){showResult(addStudentResultEl,{success:false,error:result.error||result.reason||'Local roster save blocked.'});return;}
      addStudentFormEl.reset();
      refreshStudentViews();
      addStudentResultEl.hidden=true;
      renderBarcodeConfirmation(student);
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
  var selectVisibleAthletesBtn=document.getElementById('select-visible-athletes-btn');
  var selectApprovedAthletesBtn=document.getElementById('select-approved-athletes-btn');
  var clearVisibleAthletesBtn=document.getElementById('clear-visible-athletes-btn');
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

  function athleticsTeamCheckboxes(){
    return Array.prototype.slice.call(document.querySelectorAll('.athletics-team-student-check'));
  }

  function updateAthleticsTeamPendingSummary(){
    if(!currentAthleticsTeamEvent){return;}
    var checkboxes=athleticsTeamCheckboxes();
    var selected=checkboxes.filter(function(input){return input.checked;});
    var approvedSelected=selected.filter(function(input){return input.dataset.consent==='granted';}).length;
    if(athleticsTeamSummaryEl){
      athleticsTeamSummaryEl.innerHTML=
        '<span>'+selected.length+' selected</span>'+
        '<span>'+checkboxes.length+' shown</span>'+
        '<span>'+approvedSelected+' selected approved</span>';
    }
    if(athleticsEventModalStatusEl){
      athleticsEventModalStatusEl.innerHTML=
        '<strong>'+escapeHtml(currentAthleticsTeamEvent.name)+'</strong>'+
        '<span>'+escapeHtml(selectedDivisionForCurrentEvent()||'All divisions')+'</span>'+
        '<span>'+selected.length+' pending save</span>'+
        '<span>'+approvedSelected+' approved</span>';
    }
  }

  function setVisibleAthleteChecks(mode){
    athleticsTeamCheckboxes().forEach(function(input){
      input.checked=mode==='approved'?input.dataset.consent==='granted':mode==='select';
    });
    if(athleticsTeamResultEl){athleticsTeamResultEl.hidden=true;}
    updateAthleticsTeamPendingSummary();
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
      updateAthleticsTeamPendingSummary();
      return;
    }
    if(!filtered.length){
      athleticsTeamStudentListEl.innerHTML='<p class="empty-note">No eligible students match that search.</p>';
      updateAthleticsTeamPendingSummary();
      return;
    }
    athleticsTeamStudentListEl.innerHTML=filtered.map(function(student){
      var checked=selectedMap[student.id]?' checked':'';
      var consentStatus=consentStatusForStudent(student);
      var pb=studentPbForEvent(student.id,event.id);
      var meta=[student.year,student.cls,divisionForStudent(student),student.house||student.team||'No house/team'].filter(Boolean).join(' · ');
      return '<label class="athletics-team-student-option">'+
        '<input type="checkbox" class="athletics-team-student-check" value="'+escapeAttr(student.id)+'" data-consent="'+escapeAttr(consentStatus)+'"'+checked+' />'+
        '<span><strong>'+escapeHtml(student.name)+'</strong><small>'+escapeHtml(meta)+'</small></span>'+
        '<span class="athletics-team-row-meta">'+
          '<em class="'+consentBadgeClass(consentStatus)+'">'+consentLabel(consentStatus)+'</em>'+
          '<small>'+(pb?'PB '+escapeHtml(resultDisplay(pb)):'No PB yet')+'</small>'+
        '</span>'+
      '</label>';
    }).join('');
    athleticsTeamCheckboxes().forEach(function(input){
      input.addEventListener('change',function(){
        if(athleticsTeamResultEl){athleticsTeamResultEl.hidden=true;}
        updateAthleticsTeamPendingSummary();
      });
    });
    updateAthleticsTeamPendingSummary();
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
      if(!result.ok){showInlineStatus(athleticsTeamResultEl,false,result.error||result.reason||'Team save failed.','Check the selected students and try again.');return;}
      showInlineStatus(athleticsTeamResultEl,true,'Team saved.','Summary updated · '+selected.length+' selected · '+(result.local?'local':'synced'));
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
    if(!guard.ok){showInlineStatus(athleticsTeamResultEl,false,guard.message||'Local athletics consent blocked.','Consent checklist was not saved.');return;}
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
      if(failed){showInlineStatus(athleticsTeamResultEl,false,failed.error||failed.reason||'Consent save failed.','Consent checklist was not saved.');return;}
      saveStudents(students);
      saveAthleticsConsentSelections(selected);
      renderAthleticsConsentSummary();
      renderAthleticsConsentList();
      renderAthleticsTeamOverview();
      refreshSportsCommandSummary();
      closeAthleticsConsentModal();
      showInlineStatus(athleticsTeamResultEl,true,'Athletics consent checklist saved.',changed.length+' students checked · '+(guard.live?'synced':'local'));
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
      if(!result.ok){showInlineStatus(athleticsTeamResultEl,false,result.error||result.reason||'Consent save failed.','Student consent was not updated.');return;}
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
  if(selectVisibleAthletesBtn){selectVisibleAthletesBtn.addEventListener('click',function(){setVisibleAthleteChecks('select');});}
  if(selectApprovedAthletesBtn){selectApprovedAthletesBtn.addEventListener('click',function(){setVisibleAthleteChecks('approved');});}
  if(clearVisibleAthletesBtn){clearVisibleAthletesBtn.addEventListener('click',function(){setVisibleAthleteChecks('clear');});}
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
    showInlineStatus(athleticsTeamResultEl,true,'Team list CSV exported.','Download created from the current selections.');
  }
  function printAthleticsTeamList(){
    var rows=athleticsTeamCsvRows();
    if(!rows.length){showInlineStatus(athleticsTeamResultEl,false,'No team selections to print yet.','Save at least one event team first.');return;}
    printWindow('Interschool Team List','<h1>Corso - Interschool Team List</h1>'+reportRowsTable(rows,[{key:'student',label:'Student'},{key:'year',label:'Year'},{key:'class',label:'Class'},{key:'division',label:'Division'},{key:'event',label:'Event'},{key:'pb',label:'PB'},{key:'consent',label:'Consent'}]));
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
    if(!student||numeric==null){showInlineStatus(athleticsResultOutputEl,false,'Choose a student and enter a valid result.','No result was saved.');return;}
    if(!studentEligibleForAthleticsEvent(student,event,'')){showInlineStatus(athleticsResultOutputEl,false,student.name+' is not eligible for '+event.name+'.','Choose a student from the correct division.');return;}
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
      if(!result.ok){showInlineStatus(athleticsResultOutputEl,false,result.error||result.reason||'Result save failed.','No result was saved.');return;}
      showInlineStatus(athleticsResultOutputEl,true,row.personal_best?'Result saved - new PB.':'Result saved.',student.name+' · '+event.name+' · '+resultDisplay(row)+' · '+(result.local?'local':'synced'));
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
    win.document.write(html); win.document.close(); schedulePrintWindow(win);
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
  var eventCalendarGridEl=document.getElementById('event-calendar-grid');
  var eventCalendarTitleEl=document.getElementById('event-calendar-title');
  var eventCalendarPrevEl=document.getElementById('event-calendar-prev');
  var eventCalendarNextEl=document.getElementById('event-calendar-next');
  var eventCalendarTodayEl=document.getElementById('event-calendar-today');
  var waHolidayNextEl=document.getElementById('wa-holiday-next');
  var waHolidayListEl=document.getElementById('wa-holiday-list');
  var eventCalendarDate=new Date();
  eventCalendarDate.setDate(1);
  var WA_SCHOOL_TERMS=[
    {year:2026,term:'Term 1',start:'2026-02-02',end:'2026-04-02'},
    {year:2026,term:'Term 2',start:'2026-04-20',end:'2026-07-03'},
    {year:2026,term:'Term 3',start:'2026-07-20',end:'2026-09-25'},
    {year:2026,term:'Term 4',start:'2026-10-12',end:'2026-12-17'},
    {year:2027,term:'Term 1',start:'2027-02-01',end:'2027-04-09'},
    {year:2027,term:'Term 2',start:'2027-04-26',end:'2027-07-02'},
    {year:2027,term:'Term 3',start:'2027-07-19',end:'2027-09-24'},
    {year:2027,term:'Term 4',start:'2027-10-11',end:'2027-12-16'},
    {year:2028,term:'Term 1',start:'2028-02-02',end:'2028-04-07'},
    {year:2028,term:'Term 2',start:'2028-04-24',end:'2028-06-30'},
    {year:2028,term:'Term 3',start:'2028-07-17',end:'2028-09-22'},
    {year:2028,term:'Term 4',start:'2028-10-09',end:'2028-12-14'}
  ];
  var WA_SCHOOL_HOLIDAYS=[
    {name:'Autumn school holidays',start:'2026-04-03',end:'2026-04-19'},
    {name:'Winter school holidays',start:'2026-07-04',end:'2026-07-19'},
    {name:'Spring school holidays',start:'2026-09-26',end:'2026-10-11'},
    {name:'Summer school holidays',start:'2026-12-18',end:'2027-01-31'},
    {name:'Autumn school holidays',start:'2027-04-10',end:'2027-04-25'},
    {name:'Winter school holidays',start:'2027-07-03',end:'2027-07-18'},
    {name:'Spring school holidays',start:'2027-09-25',end:'2027-10-10'},
    {name:'Summer school holidays',start:'2027-12-17',end:'2028-02-01'},
    {name:'Autumn school holidays',start:'2028-04-08',end:'2028-04-23'},
    {name:'Winter school holidays',start:'2028-07-01',end:'2028-07-16'},
    {name:'Spring school holidays',start:'2028-09-23',end:'2028-10-08'},
    {name:'Summer school holidays',start:'2028-12-15',end:'2029-01-30'}
  ];

  function dateFromIso(value){
    var parts=String(value||'').split('-').map(Number);
    return new Date(parts[0]||1970,(parts[1]||1)-1,parts[2]||1);
  }

  function isoDate(date){
    var y=date.getFullYear();
    var m=String(date.getMonth()+1).padStart(2,'0');
    var d=String(date.getDate()).padStart(2,'0');
    return y+'-'+m+'-'+d;
  }

  function formatShortDate(value){
    return dateFromIso(value).toLocaleDateString('en-AU',{day:'numeric',month:'short'});
  }

  function daysInclusive(start,end){
    return Math.round((dateFromIso(end)-dateFromIso(start))/86400000)+1;
  }

  function holidayForDate(iso){
    return WA_SCHOOL_HOLIDAYS.find(function(item){return iso>=item.start&&iso<=item.end;})||null;
  }

  function termForDate(iso){
    return WA_SCHOOL_TERMS.find(function(item){return iso>=item.start&&iso<=item.end;})||null;
  }

  function renderWaHolidaySummary(){
    if(!waHolidayNextEl||!waHolidayListEl){return;}
    var today=isoDate(new Date());
    var nextBreak=WA_SCHOOL_HOLIDAYS.find(function(item){return item.end>=today;})||WA_SCHOOL_HOLIDAYS[WA_SCHOOL_HOLIDAYS.length-1];
    var currentHoliday=holidayForDate(today);
    var currentTerm=termForDate(today);
    if(currentHoliday){
      waHolidayNextEl.textContent='Currently in '+currentHoliday.name+' until '+formatShortDate(currentHoliday.end)+'.';
    }else if(currentTerm){
      waHolidayNextEl.textContent=currentTerm.term+' is running now. Next break starts '+formatShortDate(nextBreak.start)+'.';
    }else if(nextBreak){
      waHolidayNextEl.textContent='Next WA school break starts '+formatShortDate(nextBreak.start)+' and runs for '+daysInclusive(nextBreak.start,nextBreak.end)+' days.';
    }
    waHolidayListEl.innerHTML=WA_SCHOOL_HOLIDAYS.map(function(item){
      var active=today>=item.start&&today<=item.end;
      return '<div class="'+(active?'wa-holiday-item wa-holiday-item--active':'wa-holiday-item')+'"><strong>'+escapeHtml(item.name)+'</strong><span>'+escapeHtml(formatShortDate(item.start))+' - '+escapeHtml(formatShortDate(item.end))+' · '+daysInclusive(item.start,item.end)+' days</span></div>';
    }).join('');
  }

  function renderEventCalendar(){
    if(!eventCalendarGridEl||!eventCalendarTitleEl){return;}
    var month=eventCalendarDate.getMonth();
    var year=eventCalendarDate.getFullYear();
    var events=load(K.events,[]);
    var eventsByDate={};
    events.forEach(function(event){
      if(!eventsByDate[event.date]){eventsByDate[event.date]=[];}
      eventsByDate[event.date].push(event);
    });
    var first=new Date(year,month,1);
    var startOffset=first.getDay();
    var daysInMonth=new Date(year,month+1,0).getDate();
    var cells=[];
    var weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    eventCalendarTitleEl.textContent=first.toLocaleDateString('en-AU',{month:'long',year:'numeric'});
    weekdays.forEach(function(day){cells.push('<div class="event-calendar-weekday">'+day+'</div>');});
    for(var blank=0;blank<startOffset;blank+=1){cells.push('<div class="event-calendar-day event-calendar-day--empty" aria-hidden="true"></div>');}
    for(var dayNum=1;dayNum<=daysInMonth;dayNum+=1){
      var date=new Date(year,month,dayNum);
      var iso=isoDate(date);
      var holiday=holidayForDate(iso);
      var dayEvents=eventsByDate[iso]||[];
      var todayClass=iso===isoDate(new Date())?' event-calendar-day--today':'';
      var holidayClass=holiday?' event-calendar-day--holiday':'';
      cells.push(
        '<article class="event-calendar-day'+todayClass+holidayClass+'">'+
          '<strong>'+dayNum+'</strong>'+
          (holiday?'<span class="calendar-pill calendar-pill--holiday">'+escapeHtml(holiday.name.replace(' school holidays',''))+'</span>':'')+
          dayEvents.slice(0,3).map(function(event){return '<span class="calendar-pill calendar-pill--event">'+escapeHtml(event.type)+': '+escapeHtml(event.name)+'</span>';}).join('')+
          (dayEvents.length>3?'<span class="calendar-pill">+'+(dayEvents.length-3)+' more</span>':'')+
        '</article>'
      );
    }
    eventCalendarGridEl.innerHTML=cells.join('');
    renderWaHolidaySummary();
  }

  function renderEvents(){
    var events=load(K.events,[]);
    if(!events.length){eventsListEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No events created yet.</p>';return;}
    var html='<ul class="program-event-items">';
    events.slice().reverse().forEach(function(e){
      html+='<li><strong>'+escapeHtml(e.name)+'</strong><span>'+escapeHtml(e.type)+' · '+escapeHtml(e.date)+'</span></li>';
    });
    html+='</ul>';
    eventsListEl.innerHTML=html;
  }
  renderEvents();
  renderEventCalendar();

  if(eventCalendarPrevEl){
    eventCalendarPrevEl.addEventListener('click',function(){eventCalendarDate.setMonth(eventCalendarDate.getMonth()-1);renderEventCalendar();});
  }
  if(eventCalendarNextEl){
    eventCalendarNextEl.addEventListener('click',function(){eventCalendarDate.setMonth(eventCalendarDate.getMonth()+1);renderEventCalendar();});
  }
  if(eventCalendarTodayEl){
    eventCalendarTodayEl.addEventListener('click',function(){eventCalendarDate=new Date();eventCalendarDate.setDate(1);renderEventCalendar();});
  }

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
    eventCalendarDate=dateFromIso(date);
    eventCalendarDate.setDate(1);
    renderEventCalendar();
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
        html+='<div class="award-student-card">';
        html+='<strong>'+escapeHtml(s.name)+'</strong> ('+escapeHtml(s.year)+', '+escapeHtml(s.cls)+')<br>';
        earned.forEach(function(m){
          html+='<button type="button" class="award-badge award-certificate-pill" data-award-student="'+escapeAttr(s.id)+'" data-award-milestone="'+escapeAttr(String(m))+'" title="Open printable certificate for '+escapeAttr(s.name)+' - '+escapeAttr(milestoneLabel(m))+'">&#127942; '+escapeHtml(milestoneLabel(m))+'</button>';
        });
        html+='</div>';
      }
    });
    awardsDisplayEl.innerHTML=html||'<p style="color:#888;font-size:0.85rem;">No milestone awards yet. Start scanning!</p>';
  }

  function certificateHtmlForAward(student,milestone){
    var label=milestoneLabel(milestone);
    return '<section class="certificate-preview" style="border:4px solid #c99722;border-radius:18px;padding:2.4rem;margin:0 auto 1.5rem;max-width:820px;text-align:center;page-break-after:always;background:linear-gradient(145deg,#ffffff,#fff8dd);">'+
      '<p style="letter-spacing:0.18em;text-transform:uppercase;color:#8a6415;font-weight:800;margin:0 0 0.5rem;">Corso</p>'+
      '<h1 style="color:#071426;font-size:2rem;margin:0.2rem 0;">Run Club Achievement Certificate</h1>'+
      '<p style="color:#64748b;margin:0 0 1.25rem;">Every lap counts</p>'+
      '<p style="font-size:1rem;color:#64748b;margin:0;">Presented to</p>'+
      '<h2 style="font-size:2.35rem;color:#003880;margin:0.25rem 0 0.6rem;">'+escapeHtml(student.name)+'</h2>'+
      '<p style="font-size:1.1rem;margin:0 0 1rem;">'+escapeHtml(student.year)+' - Class '+escapeHtml(student.cls)+'</p>'+
      '<div style="display:inline-block;border:1px solid rgba(201,151,34,0.58);border-radius:999px;background:#fff4bf;color:#4f3100;padding:0.55rem 1rem;font-weight:900;">&#127942; '+escapeHtml(label)+'</div>'+
      '<p style="font-size:1rem;margin:1.2rem 0 0;">Total laps: <strong>'+Number(student.laps||0)+'</strong> · '+lapsTokm(student.laps||0).toFixed(2)+' km</p>'+
      '<p style="margin-top:2rem;color:#64748b;font-size:0.86rem;">Printed '+new Date().toLocaleDateString('en-AU')+'</p>'+
    '</section>';
  }

  function printSingleAwardCertificate(studentId,milestone){
    var student=getStudents().find(function(s){return s.id===studentId;});
    var milestoneNumber=Number(milestone);
    if(!student||!isFinite(milestoneNumber)){return;}
    printWindow(student.name+' - '+milestoneLabel(milestoneNumber)+' Certificate',certificateHtmlForAward(student,milestoneNumber));
  }

  awardsDisplayEl.addEventListener('click',function(e){
    var pill=e.target.closest('.award-certificate-pill');
    if(!pill){return;}
    printSingleAwardCertificate(pill.getAttribute('data-award-student'),pill.getAttribute('data-award-milestone'));
  });

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
    var html='';
    students.forEach(function(s){
      var earned=milestoneThresholds().filter(function(m){return s.laps>=m;});
      earned.forEach(function(m){html+=certificateHtmlForAward(s,m);});
    });
    if(!html){return;}
    printWindow('Award Certificates',html);
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
  var applyBrandingTitleBtn=document.getElementById('apply-branding-title-btn');
  var brandingResultEl=document.getElementById('branding-settings-result');
  var backendReadinessSummaryEl=document.getElementById('backend-readiness-summary');
  var backendReadinessBlockersEl=document.getElementById('backend-readiness-blockers');
  var launchReadinessChecklistEl=document.getElementById('launch-readiness-checklist');
  var printLaunchReadinessBtn=document.getElementById('print-launch-readiness-btn');
  var vendorPostureStatusEl=document.getElementById('vendor-posture-status');
  var vendorPostureCopyEl=document.getElementById('vendor-posture-copy');
  var complianceAutoChecksListEl=document.getElementById('compliance-auto-checks-list');
  var complianceChecklistListEl=document.getElementById('compliance-checklist-list');
  var complianceDataMapEl=document.getElementById('compliance-data-map');
  var complianceResultEl=document.getElementById('compliance-result');
  var schoolSignupFormEl=document.getElementById('school-admin-signup-form');
  var schoolSignupSummaryEl=document.getElementById('school-signup-summary');
  var parentNoticePreviewEl=document.getElementById('parent-notice-preview');
  var breachLogFormEl=document.getElementById('breach-log-form');
  var breachLogListEl=document.getElementById('breach-log-list');

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
  }

  function brandSettingsPayload(){
    return {
      appTitle:brandingAppTitleEl.value.trim()||DEFAULT_RUN_CLUB_NAME
    };
  }

  function persistBrandingSettings(settings,message){
    save(THEME_SETTINGS_KEY,settings);
    applyThemeSettings();
    renderBrandingSettings();
    showInlineStatus(brandingResultEl,true,message||'Run club name saved.','Top-right selector: '+settings.appTitle);
  }

  function saveBrandingSettings(e){
    e.preventDefault();
    persistBrandingSettings(brandSettingsPayload(), 'Run club name saved.');
  }

  function saveBrandingTitleOnly(){
    persistBrandingSettings(brandSettingsPayload(), 'Run club name applied.');
  }

  function resetBrandingSettings(){
    localStorage.removeItem(THEME_SETTINGS_KEY);
    applyThemeSettings();
    renderBrandingSettings();
    showInlineStatus(brandingResultEl,true,'Run club name cleared.','The top-right selector now uses the default School Run Club label.');
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

  function schoolSignupAttestationItems(){
    return [
      {id:'authorised',inputId:'signup-attest-authorised',label:'Authorised school representative',detail:'I confirm I am authorised to configure Corso for this school.'},
      {id:'policy',inputId:'signup-attest-policy',label:'Policy and government standards alignment',detail:'I confirm this school will abide by Corso policy and applicable school, Department, privacy, child safety, and data-retention requirements.'},
      {id:'parent_notice',inputId:'signup-attest-parent-notice',label:'Parent/guardian communication',detail:'I confirm required parent/guardian communication or consent has been completed where required.'},
      {id:'data',inputId:'signup-attest-data',label:'Authorised student data only',detail:'I confirm student data entered into Corso is authorised for this run club and athletics purpose.'},
      {id:'staff_access',inputId:'signup-attest-staff-access',label:'Staff access limited',detail:'I confirm access will be limited to authorised school staff and school-approved support pathways.'},
      {id:'retention_breach',inputId:'signup-attest-retention-breach',label:'Retention and incident pathway',detail:'I confirm the school will manage retention, correction, deletion, and incident/breach response decisions.'}
    ];
  }

  function schoolSignupRecord(){
    return load(SCHOOL_SIGNUP_KEY,{});
  }

  function schoolSignupComplete(){
    var record=schoolSignupRecord();
    var checks=record.attestations||{};
    return !!(record.school_name&&record.admin_name&&record.admin_email&&schoolSignupAttestationItems().every(function(item){return !!checks[item.id];}));
  }

  function collectSchoolSignupForm(){
    var attestations={};
    schoolSignupAttestationItems().forEach(function(item){
      var input=document.getElementById(item.inputId);
      attestations[item.id]=!!(input&&input.checked);
    });
    return {
      school_name:(document.getElementById('signup-school-name').value||'').trim(),
      site_code:(document.getElementById('signup-site-code').value||'').replace(/\D/g,'').slice(0,4),
      admin_name:(document.getElementById('signup-admin-name').value||'').trim(),
      admin_role:(document.getElementById('signup-admin-role').value||'').trim(),
      admin_email:(document.getElementById('signup-admin-email').value||'').trim(),
      review_date:document.getElementById('signup-review-date').value||'',
      attestations:attestations,
      saved_at:new Date().toISOString(),
      saved_by:session.username||session.email||'coach'
    };
  }

  function setSchoolSignupForm(record){
    if(!schoolSignupFormEl){return;}
    document.getElementById('signup-school-name').value=record.school_name||programSettings().schoolName||'';
    document.getElementById('signup-site-code').value=record.site_code||publicConfig().siteCode||'';
    document.getElementById('signup-admin-name').value=record.admin_name||'';
    document.getElementById('signup-admin-role').value=record.admin_role||'';
    document.getElementById('signup-admin-email').value=record.admin_email||'';
    document.getElementById('signup-review-date').value=record.review_date||new Date().toISOString().slice(0,10);
    var checks=record.attestations||{};
    schoolSignupAttestationItems().forEach(function(item){
      var input=document.getElementById(item.inputId);
      if(input){input.checked=!!checks[item.id];}
    });
  }

  function renderSchoolSignup(){
    if(!schoolSignupFormEl){return;}
    var record=schoolSignupRecord();
    setSchoolSignupForm(record);
    if(!schoolSignupSummaryEl){return;}
    if(!record.saved_at){
      schoolSignupSummaryEl.innerHTML='<p class="muted-copy">No school admin signup sheet has been saved yet.</p>';
      return;
    }
    var complete=schoolSignupComplete();
    var completed=schoolSignupAttestationItems().filter(function(item){return record.attestations&&record.attestations[item.id];}).length;
    schoolSignupSummaryEl.innerHTML='<article class="breach-log-item">'+
      '<strong>'+escapeHtml(complete?'Signup complete':'Signup saved - items still open')+'</strong>'+
      '<span>'+escapeHtml(record.school_name||'School not set')+' · Site '+escapeHtml(record.site_code||'not set')+'</span>'+
      '<p>'+escapeHtml(record.admin_name||'Admin not set')+' · '+escapeHtml(record.admin_role||'Role not set')+' · '+escapeHtml(record.admin_email||'Email not set')+'</p>'+
      '<small>'+completed+' of '+schoolSignupAttestationItems().length+' attestations confirmed · Saved '+escapeHtml(new Date(record.saved_at).toLocaleString())+' by '+escapeHtml(record.saved_by||'coach')+'</small>'+
    '</article>';
  }

  function saveSchoolSignup(e){
    if(e){e.preventDefault();}
    var record=collectSchoolSignupForm();
    save(SCHOOL_SIGNUP_KEY,record);
    renderSchoolSignup();
    var readiness=window.RunClubBackend&&window.RunClubBackend.backendReadiness?window.RunClubBackend.backendReadiness():{};
    renderLaunchReadiness(readiness);
    renderVendorCompliancePosture(readiness);
    if(complianceResultEl){
      complianceResultEl.hidden=false;
      complianceResultEl.textContent=schoolSignupComplete()?'School admin signup attestation saved.':'Signup sheet saved. Complete all required attestations before live use.';
    }
  }

  function exportSchoolSignup(){
    var record=schoolSignupRecord();
    var pack={
      exported_at:new Date().toISOString(),
      purpose:'School admin signup and use attestation for Corso',
      signup:record,
      attestation_items:schoolSignupAttestationItems()
    };
    dl('corso-school-admin-signup.json',JSON.stringify(pack,null,2),'application/json');
    if(complianceResultEl){complianceResultEl.hidden=false;complianceResultEl.textContent='School admin signup sheet exported.';}
  }

  function launchReadinessItems(readiness){
    var config=publicConfig();
    var complianceState=complianceChecklistState();
    function reviewState(id){return complianceState[id]?'ready':'review';}
    var signupReady=schoolSignupComplete();
    return [
      {state:config.demoMode===false?'ready':'blocked',label:'Demo mode disabled',detail:'Turn off demoMode before entering real student records.'},
      {state:config.syncEnabled===true?'ready':'blocked',label:'Backend sync enabled',detail:'syncEnabled must be true for cross-device live use.'},
      {state:config.liveDataMode===true?'ready':'blocked',label:'Live data mode enabled',detail:'liveDataMode should only be enabled after school approval and backend review.'},
      {state:config.schoolId?'ready':'blocked',label:'School scope ID set',detail:'schoolId keeps records scoped to the correct school.'},
      {state:config.supabaseUrl?'ready':'blocked',label:'Supabase project URL set',detail:'Use the public project URL only. Never paste service-role secrets here.'},
      {state:config.supabaseAnonKey?'ready':'blocked',label:'Supabase anon key set',detail:'Use the public anon key and rely on RLS/Edge Functions for protection.'},
      {state:readiness&&readiness.ready?'ready':'blocked',label:'Backend adapter can reach storage',detail:'REST and required Edge Function checks must pass before live use.'},
      {state:signupReady?'ready':'review',label:'School admin signup sheet saved',detail:'Record the authorised school contact, site code, and Corso use attestation before real student data is entered.'},
      {state:reviewState('school-approval'),label:'School approval recorded',detail:'Confirm leadership approval, parent communication, and school privacy expectations outside the browser.'},
      {state:reviewState('parent-notice'),label:'Parent collection notice prepared',detail:'Explain what is collected, why, who can see it, hosting location, exports, retention, and correction/deletion requests.'},
      {state:reviewState('online-service'),label:'Online service and acceptable-use alignment checked',detail:'Confirm whether the school treats Corso as an online service requiring parent permission, acceptable-use wording, or Department review.'},
      {state:reviewState('st4s-evidence'),label:'ST4S-style provider evidence prepared',detail:'Prepare privacy, security, online safety, interoperability, hosting, backup, and sub-processor notes for school review.'},
      {state:'review',label:'Coach invite accounts prepared',detail:'Create invite-only coach accounts for each school in Supabase Auth. Platform admin access stays separate and owner-only.'},
      {state:reviewState('live-backend'),label:'RLS and role policies reviewed',detail:'Confirm school-scoped RLS policies and Edge Function secrets in the Supabase dashboard.'},
      {state:reviewState('breach-path'),label:'Information breach response path recorded',detail:'Identify the school contact pathway, evidence to preserve, notification decision process, and breach register expectations.'},
      {state:reviewState('retention'),label:'Data retention and deletion schedule recorded',detail:'Set term/year retention for scans, reports, training, guardian access, audit logs, and medical safety notes.'},
      {state:reviewState('demo-clear'),label:'Demo data cleared or exported',detail:'Export testing data, then clear demo rosters before entering real students.'},
      {state:'review',label:'Parent/student access boundaries checked',detail:'Parents see only linked children. Students see only their own profile. Schools see only their own students.'},
      {state:'review',label:'Real phone camera scan tested',detail:'Open the hosted beta on a real phone, allow camera permission, and scan demo barcode cards only.'},
      {state:'review',label:'Real iPad camera scan tested',detail:'Open the hosted beta on an iPad, allow camera permission, and confirm the scanner flow works at school-use size.'},
      {state:'review',label:'Bluetooth scanner tested',detail:'Pair the scanner as keyboard input, focus the barcode field, scan demo cards, and confirm duplicate cooldown behaviour.'},
      {state:'review',label:'Barcode card print/download tested',detail:'Print or download demo barcode cards and confirm the credit-card sizing, QR/barcode readability, and school workflow.'},
      {state:'review',label:'Real roster import rehearsed with fake data',detail:'Use a school-shaped fake CSV to prove import mapping, duplicate handling, and rollback before any real class list is used.'}
    ];
  }

  function complianceChecklistState(){
    return load(COMPLIANCE_CHECKLIST_KEY,{});
  }

  function saveComplianceChecklistState(rows){
    save(COMPLIANCE_CHECKLIST_KEY,rows||{});
  }

  function complianceReviewItems(){
    return [
      {id:'school-approval',label:'School approval recorded',detail:'Principal/leadership approval and school privacy expectations are documented.'},
      {id:'parent-notice',label:'Parent collection notice prepared',detail:'Families can see what is collected, why, access boundaries, retention, and contact path.'},
      {id:'online-service',label:'Online-service / acceptable-use alignment checked',detail:'School confirms whether Corso needs online-service permission wording or Department review.'},
      {id:'st4s-evidence',label:'ST4S-style provider evidence prepared',detail:'Privacy, security, online safety, hosting, backup, and sub-processor notes are ready for review.'},
      {id:'retention',label:'Retention and deletion schedule recorded',detail:'School has decided how long run club, training, guardian, audit, and safety records are kept.'},
      {id:'breach-path',label:'Information breach response path recorded',detail:'School contact, escalation, evidence preservation, and notification decision process are known.'},
      {id:'live-backend',label:'Live backend and RLS reviewed',detail:'Supabase URL, anon key, school ID, RLS, Edge Functions, and staff roles have been checked.'},
      {id:'demo-clear',label:'Demo data cleared or exported',detail:'Testing data is exported or cleared before importing real student data.'}
    ];
  }

  function complianceGatePassed(readiness){
    var state=complianceChecklistState();
    var allReviewed=complianceReviewItems().every(function(item){return !!state[item.id];});
    return !!(schoolSignupComplete()&&allReviewed&&readiness&&readiness.realDataAllowed);
  }

  function technicalComplianceChecks(readiness){
    var config=publicConfig();
    return [
      {id:'demo-mode-disabled',state:config.demoMode===false?'ready':'blocked',label:'Demo mode disabled',detail:'Universal demo access is off before real records are entered.'},
      {id:'live-data-mode',state:config.liveDataMode===true?'ready':'blocked',label:'Live data mode enabled deliberately',detail:'Live data mode is only enabled after backend and school review.'},
      {id:'backend-sync',state:config.syncEnabled===true?'ready':'blocked',label:'Backend sync enabled',detail:'Cross-device data writes are not relying on browser-only localStorage.'},
      {id:'school-scope',state:config.schoolId?'ready':'blocked',label:'School scope ID configured',detail:'Records can be scoped to a single school.'},
      {id:'public-supabase-config',state:(config.supabaseUrl&&config.supabaseAnonKey)?'ready':'blocked',label:'Public Supabase config present',detail:'Frontend has only URL/anon key, not service-role secrets.'},
      {id:'backend-readiness',state:readiness&&readiness.realDataAllowed?'ready':'blocked',label:'Backend readiness gate passed',detail:'Backend adapter, live guards, and required checks allow real-data writes.'},
      {id:'privacy-policy',state:document.querySelector('a[href="privacy-policy.html"]')?'ready':'review',label:'Privacy policy linked',detail:'Footer links to the privacy policy and parent-facing privacy language.'},
      {id:'evidence-pack',state:'ready',label:'Evidence pack export available',detail:'Admin can export data map, notice, checklist, breach log, and source references.'}
    ];
  }

  function vendorCompliancePostureStatus(readiness){
    var technical=technicalComplianceChecks(readiness);
    var blocked=technical.filter(function(item){return item.state==='blocked';}).length;
    var state=complianceChecklistState();
    var signoffComplete=complianceReviewItems().every(function(item){return !!state[item.id];});
    if(blocked){return {state:'blocked',label:'Technical blockers remain',detail:'Fix the automated technical blockers before asking a school to sign off.'};}
    if(!schoolSignupComplete()){return {state:'review',label:'Signup sheet required',detail:'Technical checks are clear. Record the school admin signup sheet and Corso use attestation before live student data is entered.'};}
    if(!signoffComplete){return {state:'review',label:'Technically ready for school sign-off',detail:'Technical checks are clear. School approval, parent communication, retention, and breach-response sign-off still need to be recorded.'};}
    return {state:'ready',label:'Ready for school approval record',detail:'Technical checks and school sign-off items are recorded. Export the evidence pack for the school review record.'};
  }

  function renderTechnicalComplianceChecks(readiness){
    if(!complianceAutoChecksListEl){return;}
    complianceAutoChecksListEl.innerHTML=technicalComplianceChecks(readiness).map(function(item){
      var label=item.state==='ready'?'Auto-checked':item.state==='blocked'?'Blocked':'Review';
      return '<article class="launch-readiness-item launch-readiness-item--'+escapeAttr(item.state)+'">'+
        '<span class="launch-readiness-status">'+escapeHtml(label)+'</span>'+
        '<div><strong>'+escapeHtml(item.label)+'</strong><p>'+escapeHtml(item.detail)+'</p></div>'+
      '</article>';
    }).join('');
  }

  function renderVendorCompliancePosture(readiness){
    var status=vendorCompliancePostureStatus(readiness);
    if(vendorPostureStatusEl){
      vendorPostureStatusEl.textContent=status.label;
      vendorPostureStatusEl.className='bookmark-pill vendor-posture-status vendor-posture-status--'+status.state;
    }
    if(vendorPostureCopyEl){vendorPostureCopyEl.textContent=status.detail;}
    renderTechnicalComplianceChecks(readiness);
  }

  function renderComplianceChecklist(){
    if(!complianceChecklistListEl){return;}
    var state=complianceChecklistState();
    complianceChecklistListEl.innerHTML=complianceReviewItems().map(function(item){
      var checked=!!state[item.id];
      return '<label class="compliance-checklist-item">'+
        '<input type="checkbox" data-compliance-item="'+escapeAttr(item.id)+'" '+(checked?'checked':'')+' />'+
        '<span><strong>'+escapeHtml(item.label)+'</strong><small>'+escapeHtml(item.detail)+'</small></span>'+
      '</label>';
    }).join('');
    Array.prototype.forEach.call(complianceChecklistListEl.querySelectorAll('[data-compliance-item]'),function(input){
      input.addEventListener('change',function(){
        var rows=complianceChecklistState();
        rows[input.dataset.complianceItem]=input.checked;
        rows.updated_at=new Date().toISOString();
        rows.updated_by=session.username||session.email||'coach';
        saveComplianceChecklistState(rows);
        if(complianceResultEl){
          complianceResultEl.hidden=false;
          complianceResultEl.textContent='Compliance checklist saved locally.';
        }
        var readiness=window.RunClubBackend&&window.RunClubBackend.backendReadiness?window.RunClubBackend.backendReadiness():{};
        renderLaunchReadiness(readiness);
        renderVendorCompliancePosture(readiness);
      });
    });
  }

  function complianceDataMapRows(){
    return [
      {area:'Student roster',fields:'Name, year, class, barcode/access code, optional house/team/pseudonym',purpose:'Run club identification, scanning, reports, certificates',access:'School staff; student own profile; linked parent/guardian view where appropriate',retention:'Set school term/year retention; delete or de-identify when student leaves.'},
      {area:'Run participation',fields:'Lap scans, sessions, adjustments, distance totals, award progress',purpose:'Track attendance, progress, milestones, and audit changes',access:'School staff; student own profile; linked parent/guardian summaries',retention:'Keep for school-approved period; export before deletion if required.'},
      {area:'Training assignments',fields:'Teacher-directed tasks, links, due dates, opened/completed status',purpose:'Support training follow-up without student self-reported activity claims',access:'School staff; assigned student; linked parent/guardian read-only visibility',retention:'Review termly; delete outdated tasks when no longer needed.'},
      {area:'Medical safety notes',fields:'Asthma, anaphylaxis/allergies, medication carried, emergency note, health-plan supplied flag',purpose:'Practical run-club safety reference aligned with school health plans',access:'Authorised staff and linked guardian safety view only',retention:'Review each term and delete when not current or when student leaves.'},
      {area:'Guardian access',fields:'Guardian link/code status, expiry, access log',purpose:'Ensure parents/guardians only see their linked child or children',access:'Authorised staff; guardian only after code/link verification',retention:'Expire/revoke links; keep access audit only for approved period.'},
      {area:'Audit and exports',fields:'Scan audit, imports, manual adjustments, exports, incident notes',purpose:'Accountability, troubleshooting, and breach/incident evidence',access:'Authorised school staff and platform admin support only',retention:'Follow school recordkeeping and breach-response requirements.'}
    ];
  }

  function renderComplianceDataMap(){
    if(!complianceDataMapEl){return;}
    complianceDataMapEl.innerHTML=miniReportTable('Compliance data map',complianceDataMapRows(),[
      {key:'area',label:'Area'},
      {key:'fields',label:'Fields'},
      {key:'purpose',label:'Purpose'},
      {key:'access',label:'Access'},
      {key:'retention',label:'Retention decision'}
    ]);
  }

  function parentCollectionNoticeText(){
    var settings=programSettings();
    return [
      'Corso parent/guardian collection notice',
      '',
      'Our school is using Corso to help staff run and administer the school run club and related athletics activities.',
      '',
      'Information collected: student name, year group, class, barcode/access code, run club scans, lap totals, awards, teacher-directed training tasks, and limited safety notes where needed for run-club duty of care.',
      '',
      'Purpose: to track participation, support student progress, prepare awards/certificates, manage interschool athletics planning, and help staff run sessions safely.',
      '',
      'Access: school staff can see records for this school only. Students can see their own profile only. Linked parents/guardians can see only their own child or children.',
      '',
      'Advertising and sharing: Corso is not used for advertising, does not sell student data, and should not share data across schools.',
      '',
      'Storage and retention: demo mode stores data in the browser only. Production use requires school-approved backend storage, staff accounts, audit logs, and a school-approved retention/deletion schedule.',
      '',
      'Questions or correction/deletion requests should be directed to the school run club administrator.',
      '',
      'School/program: '+settings.schoolName
    ].join('\n');
  }

  function renderParentCollectionNotice(){
    if(!parentNoticePreviewEl){return;}
    parentNoticePreviewEl.innerHTML=parentCollectionNoticeText().split('\n').map(function(line){
      return line?'<p>'+escapeHtml(line)+'</p>':'<br />';
    }).join('');
  }

  function printParentCollectionNotice(){
    printWindow('Parent Collection Notice','<h1>Corso - Parent Collection Notice</h1><pre style="white-space:pre-wrap;font-family:Arial,sans-serif;line-height:1.5;">'+escapeHtml(parentCollectionNoticeText())+'</pre>');
  }

  function exportParentCollectionNotice(){
    dl('corso-parent-collection-notice.txt',parentCollectionNoticeText(),'text/plain');
    if(complianceResultEl){complianceResultEl.hidden=false;complianceResultEl.textContent='Parent notice text exported.';}
  }

  function breachLogRows(){
    return load(BREACH_LOG_KEY,[]);
  }

  function saveBreachLogRows(rows){
    save(BREACH_LOG_KEY,rows||[]);
  }

  function saveBreachLogEntry(e){
    e.preventDefault();
    var row={
      id:'breach-'+Date.now(),
      date:(document.getElementById('breach-log-date').value||new Date().toISOString().slice(0,10)),
      status:document.getElementById('breach-log-status').value||'open',
      affected:document.getElementById('breach-log-affected').value.trim(),
      contact:document.getElementById('breach-log-contact').value.trim(),
      notes:document.getElementById('breach-log-notes').value.trim(),
      created_at:new Date().toISOString(),
      staff:session.username||session.email||'coach'
    };
    if(!row.notes){
      if(complianceResultEl){complianceResultEl.hidden=false;complianceResultEl.textContent='Add an issue/action note before saving.';}
      return;
    }
    var rows=breachLogRows();
    rows.push(row);
    saveBreachLogRows(rows);
    breachLogFormEl.reset();
    document.getElementById('breach-log-date').value=new Date().toISOString().slice(0,10);
    renderBreachLog();
    if(complianceResultEl){complianceResultEl.hidden=false;complianceResultEl.textContent='Incident note saved locally.';}
  }

  function renderBreachLog(){
    if(!breachLogListEl){return;}
    var rows=breachLogRows().slice().reverse();
    breachLogListEl.innerHTML=rows.length?rows.map(function(row){
      return '<article class="breach-log-item"><strong>'+escapeHtml(row.date)+' - '+escapeHtml(row.status)+'</strong><span>'+escapeHtml(row.affected||'Affected records not specified')+'</span><p>'+escapeHtml(row.notes)+'</p><small>Contact: '+escapeHtml(row.contact||'not set')+' · Staff: '+escapeHtml(row.staff||'coach')+'</small></article>';
    }).join(''):'<p class="muted-copy">No incident notes saved yet.</p>';
  }

  function printComplianceChecklist(){
    var state=complianceChecklistState();
    var rows=complianceReviewItems().map(function(item){return {status:state[item.id]?'Reviewed':'Not reviewed',item:item.label,detail:item.detail};});
    printWindow('Compliance Readiness Checklist','<h1>Corso - Compliance Readiness Checklist</h1>'+reportRowsTable(rows,[{key:'status',label:'Status'},{key:'item',label:'Item'},{key:'detail',label:'Detail'}]));
  }

  function exportCompliancePack(){
    var readiness=window.RunClubBackend&&window.RunClubBackend.backendReadiness?window.RunClubBackend.backendReadiness():{};
    var pack={
      exported_at:new Date().toISOString(),
      school:programSettings().schoolName,
      backend_readiness:readiness,
      compliance_gate_passed:complianceGatePassed(readiness),
      vendor_posture_status:vendorCompliancePostureStatus(readiness),
      school_admin_signup:schoolSignupRecord(),
      school_admin_signup_items:schoolSignupAttestationItems(),
      technical_checks:technicalComplianceChecks(readiness),
      checklist_state:complianceChecklistState(),
      checklist_items:complianceReviewItems(),
      data_map:complianceDataMapRows(),
      parent_notice:parentCollectionNoticeText(),
      breach_log:breachLogRows(),
      sources:[
        'https://www.education.wa.edu.au/web/policies/-/students-online-in-public-schools-procedures',
        'https://www.education.wa.edu.au/web/policies/-/information-breach-procedures',
        'https://www.oaic.gov.au/privacy/australian-privacy-principles',
        'https://st4s.edu.au/'
      ]
    };
    dl('corso-compliance-evidence-pack.json',JSON.stringify(pack,null,2),'application/json');
    if(complianceResultEl){complianceResultEl.hidden=false;complianceResultEl.textContent='Compliance evidence pack exported.';}
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
    printWindow('Launch Readiness Checklist','<h1>Corso - Launch Readiness Checklist</h1>'+reportRowsTable(rows,[{key:'status',label:'Status'},{key:'item',label:'Item'},{key:'detail',label:'Detail'}]));
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
    renderVendorCompliancePosture(readiness);
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
    win.document.close(); schedulePrintWindow(win);
  }

  function printProgramResources(){
    var plans=resourceSessionPlans();
    var body='<h1>Corso - Program Resources</h1><p>Editable session plans with WA Curriculum HPE links and Mini Coach notes.</p>';
    plans.forEach(function(plan){
      body+='<section style="page-break-inside:avoid;margin-bottom:1.5rem;"><h2>'+escapeHtml(plan.title)+'</h2>'+
        '<p><strong>Focus:</strong> '+escapeHtml(plan.focus)+'</p>'+
        '<p><strong>Mini Coach:</strong> '+escapeHtml(plan.miniCoach)+'</p>'+
        '<p><strong>Curriculum:</strong> '+plan.curriculum.map(function(item){return escapeHtml(item.label);}).join(', ')+'</p>'+
        plan.sections.map(function(section){
          var rows=plan.activities.filter(function(activity){return (activity.section||'sessions')===section.id;});
          return '<h3>'+escapeHtml(section.title)+' - '+resourceSectionMinutes(plan,section.id)+' / '+Number(section.target||0)+' min</h3>'+
            (section.note?'<p><strong>Coach note:</strong> '+escapeHtml(section.note)+'</p>':'')+
            '<table><thead><tr><th>Use</th><th>Activity</th><th>Minutes</th><th>Notes</th></tr></thead><tbody>'+
            rows.map(function(activity){return '<tr><td>'+(activity.included?'Yes':'No')+'</td><td>'+escapeHtml(activity.title)+'</td><td>'+Number(activity.minutes||0)+'</td><td>'+escapeHtml(activity.detail)+'</td></tr>';}).join('')+
            '</tbody></table>';
        }).join('')+
        '<p><strong>Selected time:</strong> '+resourceIncludedMinutes(plan)+' minutes of '+Number(plan.duration||0)+' planned.</p></section>';
    });
    printWindow('Program Resources',body);
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
    printWindow('Term Progress Report','<h1>Corso - '+escapeHtml(termLabel(termReportTermEl.value))+'</h1>'+reportRowsTable(rows,[{key:'student',label:'Student'},{key:'year',label:'Year'},{key:'class',label:'Class'},{key:'period_laps',label:'Term laps'},{key:'period_km',label:'Term km'},{key:'lifetime_km',label:'Total km'}]));
  }

  function printClassReport(){
    var cls=classReportSelectEl.value;
    var rows=termProgressRows(termReportTermEl.value).filter(function(row){return row.class===cls;});
    printWindow('Class Report '+cls,'<h1>Corso - '+escapeHtml(cls)+' '+escapeHtml(termLabel(termReportTermEl.value))+'</h1>'+reportRowsTable(rows,[{key:'student',label:'Student'},{key:'year',label:'Year'},{key:'period_laps',label:'Term laps'},{key:'period_km',label:'Term km'},{key:'lifetime_laps',label:'Total laps'},{key:'lifetime_km',label:'Total km'},{key:'certificates',label:'Certificates'}]));
  }

  function certificateBatchRows(){
    return certificateRows().map(function(row,index){return Object.assign({batch_rank:index+1,printed:'No'},row);});
  }

  function printAwardPack(){
    var rows=certificateBatchRows();
    printWindow('Award Pack','<h1>Corso - Award Pack</h1>'+reportRowsTable(rows,[{key:'batch_rank',label:'#'},{key:'student',label:'Student'},{key:'year',label:'Year'},{key:'class',label:'Class'},{key:'milestone',label:'Award'},{key:'total_km',label:'Total km'}]));
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
  var coachToolNoteStatusEl=document.getElementById('coach-tool-note-status');
  var coachToolNoteCategoryEl=document.getElementById('coach-tool-note-category');
  var coachToolFollowUpDateEl=document.getElementById('coach-tool-follow-up-date');
  var coachToolResultEl=document.getElementById('coach-tool-result');
  var coachNoteListEl=document.getElementById('coach-note-list');
  var activeCoachTool='needs-attention';

  function coachNotes(){return load(COACH_NOTES_KEY,[]);}
  function saveCoachNotes(rows){save(COACH_NOTES_KEY,rows.slice(-400));}
  function coachFollowUps(){return load(COACH_FOLLOWUPS_KEY,{});}
  function saveCoachFollowUps(rows){save(COACH_FOLLOWUPS_KEY,rows||{});}
  function studentNotifications(){return load(STUDENT_NOTIFICATIONS_KEY,[]);}
  function saveStudentNotifications(rows){save(STUDENT_NOTIFICATIONS_KEY,rows.slice(-500));}

  function saveCoachNote(scope,note,status,category,followUpDate){
    var text=String(note||'').trim();
    if(!text){return null;}
    var row={id:'coach-note-'+Date.now(),tool:activeCoachTool,scope:scope||activeCoachTool,note:text,status:status||'open',category:category||'general',follow_up_date:followUpDate||'',created_at:new Date().toISOString(),staff:session.username||session.email||'coach'};
    var rows=coachNotes(); rows.push(row); saveCoachNotes(rows); return row;
  }

  function saveCoachNoteWithBackend(scope,note,status,category,followUpDate){
    var text=String(note||'').trim();
    if(!text){return Promise.resolve({ok:false,validation:true,error:'Type a note before saving.'});}
    var row={id:'coach-note-'+Date.now(),tool:activeCoachTool,scope:scope||activeCoachTool,note:text,status:status||'open',category:category||'general',follow_up_date:followUpDate||'',created_at:new Date().toISOString(),staff:session.username||session.email||'coach'};
    return runLiveFeatureWrite('saveCoachNote',{
      tool:row.tool,
      scope:row.scope,
      note:row.note,
      staff:row.staff,
      metadata:{source_screen:'coach-tools',local_note_id:row.id,status:row.status,category:row.category,follow_up_date:row.follow_up_date}
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

  function coachWorkflowKey(tool,row){
    if(row.student){return tool+':student:'+row.student.id;}
    if(row.student_id){return tool+':student:'+row.student_id;}
    if(row.group){return tool+':class:'+row.group;}
    if(row.result&&row.result.id){return tool+':result:'+row.result.id;}
    return tool+':item:'+String(row.title||row.detail||'general').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  }

  function coachWorkflowStatus(key){
    return coachFollowUps()[key]||{status:'open',follow_up_date:'',updated_at:''};
  }

  function saveCoachWorkflowStatus(key,status,followUpDate){
    var rows=coachFollowUps();
    rows[key]={status:status||'open',follow_up_date:followUpDate||'',updated_at:new Date().toISOString(),staff:session.username||session.email||'coach'};
    saveCoachFollowUps(rows);
    return rows[key];
  }

  function coachWorkflowStatusLabel(state){
    if(!state||!state.status||state.status==='open'){return 'Open';}
    if(state.status==='resolved'){return 'Resolved';}
    if(state.status==='follow-up'){return state.follow_up_date?'Follow-up '+state.follow_up_date:'Follow-up';}
    return state.status;
  }

  function renderCoachToolSummary(tool,rows){
    var states=coachFollowUps();
    var resolved=0;
    var followUps=0;
    rows.forEach(function(row){
      var state=states[coachWorkflowKey(tool,row)];
      if(state&&state.status==='resolved'){resolved+=1;}
      if(state&&state.status==='follow-up'){followUps+=1;}
    });
    var openCount=Math.max(0,rows.length-resolved);
    return 'Mini Coach summary: '+openCount+' open item'+(openCount===1?'':'s')+', '+followUps+' follow-up'+(followUps===1?'':'s')+' scheduled, '+resolved+' resolved. Use notes for staff context before acting.';
  }

  function coachToolSafeNextSteps(tool,rows){
    var count=rows.length;
    if(!count){return 'No action is needed from this list right now. Recheck after the next run session, training assignment, or athletics result entry.';}
    var steps={
      'needs-attention':'Start with the first three flagged students, check attendance/barcode/training access, then add a short staff-only note before speaking with the student.',
      'close-award':'Use this as encouragement only: notify profiles or mention the next badge at the next session, without promising an award until the laps are logged.',
      'training-not-opened':'Check whether the task title and link are clear, then follow up in class. Avoid treating unopened training as a behaviour issue.',
      'personal-bests':'Celebrate PBs privately first, then decide whether the achievement is safe and appropriate to share more widely.',
      'class-trends':'Look for one practical class nudge, such as a reminder, scanner setup fix, or class target. Avoid ranking students publicly from this view.',
      'celebration-wall':'Review each candidate for consent, privacy-safe naming, and school tone before publishing, printing, or sharing.'
    };
    return 'Safe next step: '+(steps[tool]||'Review the list, add a staff note, and choose one small action for the next session.');
  }

  var smartCoachInsightsCache=null;

  function insightConfidenceLabel(score){
    if(score>=0.85){return 'High confidence rule';}
    if(score>=0.65){return 'Medium confidence rule';}
    return 'Staff review needed';
  }

  function buildSmartCoachInsights(){
    var students=getStudents();
    var settings=programSettings();
    var lapDistance=settings.lapDistanceKm||0.25;
    var trainingTasks=load(K.training,[]);
    var trainingClicks=load(K.trainingClicks,[]);
    var athleticsPbs=athleticsResults().filter(function(row){return row.personal_best;}).slice().reverse();
    var unopenedByStudent={};
    var unopenedRows=[];

    trainingTasks.forEach(function(task){
      (task.student_ids||[]).forEach(function(studentId){
        var opened=trainingClicks.some(function(click){return click.training_id===task.id&&click.student_id===studentId;});
        if(opened){return;}
        var student=students.find(function(s){return s.id===studentId;});
        if(!student){return;}
        unopenedByStudent[student.id]=(unopenedByStudent[student.id]||0)+1;
        unopenedRows.push({
          student:student,
          task:task,
          reason:'Assigned training has not been opened',
          action:'Check whether the task was clear and remind the student in class.',
          confidence:0.86
        });
      });
    });

    var closeAward=students.map(function(student){
      var next=nextCertificateFor(student);
      if(!next){return null;}
      var kmLeft=Math.max(0,next.km-totalKm(student));
      var lapsLeft=Math.ceil(kmLeft/lapDistance);
      return {
        student:student,
        next:next,
        lapsLeft:lapsLeft,
        kmLeft:kmLeft,
        action:'Give a small next-session target and celebrate the upcoming milestone.',
        confidence:lapsLeft<=3?0.95:0.82
      };
    }).filter(function(row){return row&&row.lapsLeft<=8;}).sort(function(a,b){return a.lapsLeft-b.lapsLeft;});

    var needsAttention=students.map(function(student){
      var reasons=[];
      var actions=[];
      var confidence=0.7;
      if(!(student.laps||0)){
        reasons.push('No laps recorded yet');
        actions.push('Check attendance or barcode setup before the next run.');
        confidence=0.9;
      }
      if((student.laps||0)>0&&(student.laps||0)<5){
        reasons.push('Still below first 5-lap badge');
        actions.push('Set a tiny target such as one steady lap next session.');
        confidence=Math.max(confidence,0.78);
      }
      if(unopenedByStudent[student.id]){
        reasons.push(unopenedByStudent[student.id]+' training task'+(unopenedByStudent[student.id]===1?'':'s')+' not opened');
        actions.push('Confirm the student can find the Training tab and understands the task.');
        confidence=Math.max(confidence,0.86);
      }
      return reasons.length?{
        student:student,
        reasons:reasons,
        actions:actions,
        confidence:confidence,
        confidence_label:insightConfidenceLabel(confidence)
      }:null;
    }).filter(Boolean);

    var classTrends=groupedSummary('cls').sort(function(a,b){return b.km-a.km;}).map(function(row,index){
      return Object.assign({},row,{
        rank:index+1,
        action:index===0?'Share what is working for this class.':'Look for one simple participation nudge this week.',
        confidence:0.74,
        confidence_label:insightConfidenceLabel(0.74)
      });
    });

    var celebrationRows=[];
    certificateRows().slice(0,12).forEach(function(row){
      celebrationRows.push({
        title:row.milestone,
        detail:row.student+' - '+row.class+' - '+row.total_km+' km',
        type:'award',
        action:'Approve for Celebration Wall or print certificate.',
        confidence:0.9,
        confidence_label:insightConfidenceLabel(0.9)
      });
    });
    athleticsPbs.slice(0,12).forEach(function(row){
      celebrationRows.push({
        title:'PB: '+row.event_name,
        detail:row.student_name+' - '+resultDisplay(row),
        type:'personal_best',
        result:row,
        action:'Approve as a staff-moderated PB celebration.',
        confidence:0.88,
        confidence_label:insightConfidenceLabel(0.88)
      });
    });

    var nextBestActions=[];
    if(needsAttention.length){
      nextBestActions.push({title:'Follow up flagged students',count:needsAttention.length,tool:'needs-attention',action:'Open Needs Attention and add notes for the highest-priority students.',confidence:0.88});
    }
    if(closeAward.length){
      nextBestActions.push({title:'Nudge close-to-award runners',count:closeAward.length,tool:'close-award',action:'Send profile reminders or mention the milestone next session.',confidence:0.86});
    }
    if(unopenedRows.length){
      nextBestActions.push({title:'Check unopened training',count:unopenedRows.length,tool:'training-not-opened',action:'Review tasks that have not been opened and simplify instructions if needed.',confidence:0.84});
    }
    if(celebrationRows.length){
      nextBestActions.push({title:'Review celebration candidates',count:celebrationRows.length,tool:'celebration-wall',action:'Approve only privacy-safe achievements for sharing.',confidence:0.82});
    }

    return {
      generated_at:new Date().toISOString(),
      summary:{
        students:students.length,
        needs_attention:needsAttention.length,
        close_to_award:closeAward.length,
        training_not_opened:unopenedRows.length,
        personal_bests:athleticsPbs.length,
        celebration_candidates:celebrationRows.length,
        next_best_actions:nextBestActions.length
      },
      needs_attention:needsAttention,
      close_to_award:closeAward,
      training_not_opened:unopenedRows,
      personal_bests:athleticsPbs,
      class_trends:classTrends,
      celebration_wall:celebrationRows,
      next_best_actions:nextBestActions
    };
  }

  function getSmartCoachInsights(refresh){
    if(refresh||!smartCoachInsightsCache){
      smartCoachInsightsCache=buildSmartCoachInsights();
    }
    return smartCoachInsightsCache;
  }

  function closeAwardRows(limit){
    return getSmartCoachInsights().close_to_award.slice(0,limit||999);
  }

  function trainingNotOpenedRows(limit){
    return getSmartCoachInsights().training_not_opened.slice(0,limit||999);
  }

  function needsAttentionRows(limit){
    return getSmartCoachInsights().needs_attention.slice(0,limit||999);
  }

  function personalBestRows(limit){
    return getSmartCoachInsights().personal_bests.slice(0,limit||999);
  }

  function classTrendRows(limit){
    return getSmartCoachInsights().class_trends.slice(0,limit||999);
  }

  function celebrationRows(limit){
    return getSmartCoachInsights().celebration_wall.slice(0,limit||999);
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

  function coachWorkflowActionsHtml(workflowKey,extra){
    return '<div class="coach-workflow-actions">'+(extra||'')+
      '<button type="button" class="secondary coach-note-target" data-scope="'+escapeAttr(workflowKey)+'">Note</button>'+
      '<button type="button" class="secondary coach-follow-up-target" data-workflow-key="'+escapeAttr(workflowKey)+'">Follow up</button>'+
      '<button type="button" class="secondary coach-resolve-target" data-workflow-key="'+escapeAttr(workflowKey)+'">Resolve</button>'+
      '</div>';
  }

  function coachToolRowHtml(tool,row){
    var workflowKey=coachWorkflowKey(tool,row);
    var workflowState=coachWorkflowStatus(workflowKey);
    var statusBadge='<span class="coach-workflow-status coach-workflow-status--'+escapeAttr(workflowState.status||'open')+'">'+escapeHtml(coachWorkflowStatusLabel(workflowState))+'</span>';
    if(tool==='needs-attention'){
      return '<article class="coach-tool-row" data-workflow-key="'+escapeAttr(workflowKey)+'"><div><strong>'+escapeHtml(row.student.name)+'</strong>'+statusBadge+'<span>'+escapeHtml(row.student.year+' / '+row.student.cls)+' - '+escapeHtml(row.confidence_label||insightConfidenceLabel(row.confidence||0.7))+'</span><p>'+row.reasons.map(escapeHtml).join(' | ')+'</p><p>'+escapeHtml((row.actions&&row.actions[0])||'Add a staff note for next follow-up.')+'</p></div>'+coachWorkflowActionsHtml(workflowKey)+'</article>';
    }
    if(tool==='close-award'){
      return '<article class="coach-tool-row" data-workflow-key="'+escapeAttr(workflowKey)+'"><div><strong>'+escapeHtml(row.student.name)+'</strong>'+statusBadge+'<span>'+row.lapsLeft+' lap'+(row.lapsLeft===1?'':'s')+' to '+escapeHtml(row.next.name)+' - '+escapeHtml(insightConfidenceLabel(row.confidence||0.82))+'</span><p>'+row.student.laps+' laps currently recorded. '+escapeHtml(row.action||'Celebrate the upcoming milestone.')+'</p></div>'+coachWorkflowActionsHtml(workflowKey,'<button type="button" class="secondary coach-notify-award" data-student="'+escapeAttr(row.student.id)+'">Notify</button>')+'</article>';
    }
    if(tool==='training-not-opened'){
      return '<article class="coach-tool-row" data-workflow-key="'+escapeAttr(workflowKey)+'"><div><strong>'+escapeHtml(row.student.name)+'</strong>'+statusBadge+'<span>'+escapeHtml(row.task.title)+' - '+escapeHtml(insightConfidenceLabel(row.confidence||0.86))+'</span><p>Due '+escapeHtml(row.task.due_date||'not set')+' - '+escapeHtml(row.student.cls)+'. '+escapeHtml(row.action||'Check access to the task.')+'</p></div>'+coachWorkflowActionsHtml(workflowKey)+'</article>';
    }
    if(tool==='personal-bests'){
      return '<article class="coach-tool-row" data-workflow-key="'+escapeAttr(workflowKey)+'"><div><strong>'+escapeHtml(row.student_name)+'</strong>'+statusBadge+'<span>'+escapeHtml(row.event_name)+' - '+escapeHtml(resultDisplay(row))+'</span><p>'+new Date(row.date).toLocaleDateString()+'</p></div>'+coachWorkflowActionsHtml(workflowKey)+'</article>';
    }
    if(tool==='class-trends'){
      return '<article class="coach-tool-row" data-workflow-key="'+escapeAttr(workflowKey)+'"><div><strong>'+escapeHtml(row.group)+'</strong>'+statusBadge+'<span>'+row.students+' students - '+row.laps+' laps - '+row.km+' km</span><p>'+row.certificates+' certificates ready. '+escapeHtml(row.action||'Review class participation trend.')+'</p></div>'+coachWorkflowActionsHtml(workflowKey)+'</article>';
    }
    return '<article class="coach-tool-row" data-workflow-key="'+escapeAttr(workflowKey)+'"><div><strong>'+escapeHtml(row.title)+'</strong>'+statusBadge+'<span>'+escapeHtml(row.detail)+'</span><p>'+escapeHtml(row.action||'Staff review before sharing.')+'</p></div>'+coachWorkflowActionsHtml(workflowKey)+'</article>';
  }

  function renderCoachNotes(){
    if(!coachNoteListEl){return;}
    var rows=coachNotes().slice().reverse().slice(0,8);
    coachNoteListEl.innerHTML=rows.length?rows.map(function(row){
      return '<div class="coach-note-item"><strong>'+escapeHtml(row.scope)+'</strong><span>'+escapeHtml(row.tool)+' - '+escapeHtml(row.status||'open')+' - '+escapeHtml(row.category||'general')+' - '+new Date(row.created_at).toLocaleString()+'</span>'+(row.follow_up_date?'<small>Follow-up: '+escapeHtml(row.follow_up_date)+'</small>':'')+'<p>'+escapeHtml(row.note)+'</p></div>';
    }).join(''):'<p class="muted-copy">No coach notes saved yet.</p>';
  }

  function renderCoachToolModal(tool){
    activeCoachTool=tool;
    var config=coachToolConfig(tool);
    var rows=coachToolRows(tool);
    coachToolTitleEl.textContent=config.title;
    coachToolSubtitleEl.textContent=config.subtitle;
    coachToolAiCopyEl.textContent=renderCoachToolSummary(tool,rows)+' '+coachToolSafeNextSteps(tool,rows)+' Staff-reviewed only: '+config.ai;
    coachToolNoteScopeEl.value=tool;
    coachToolNoteTextEl.value='';
    if(coachToolNoteStatusEl){coachToolNoteStatusEl.value='open';}
    if(coachToolNoteCategoryEl){coachToolNoteCategoryEl.value=tool==='close-award'?'award':tool==='training-not-opened'?'training':tool==='personal-bests'?'pb':tool==='celebration-wall'?'celebration':'general';}
    if(coachToolFollowUpDateEl){coachToolFollowUpDateEl.value='';}
    coachToolResultEl.hidden=true;
    coachToolActionsEl.innerHTML=tool==='close-award'&&rows.length?'<button type="button" class="secondary" id="notify-all-close-awards-btn">Notify all close-to-award students</button>':'';
    coachToolListEl.innerHTML=rows.length?rows.map(function(row){return coachToolRowHtml(tool,row);}).join(''):'<p class="empty-note">Nothing to review here yet.</p>';
    Array.prototype.forEach.call(coachToolListEl.querySelectorAll('.coach-note-target'),function(btn){
      btn.addEventListener('click',function(){coachToolNoteScopeEl.value=btn.dataset.scope;if(coachToolNoteStatusEl){coachToolNoteStatusEl.value='open';}coachToolNoteTextEl.focus();});
    });
    Array.prototype.forEach.call(coachToolListEl.querySelectorAll('.coach-follow-up-target'),function(btn){
      btn.addEventListener('click',function(){
        coachToolNoteScopeEl.value=btn.dataset.workflowKey;
        if(coachToolNoteStatusEl){coachToolNoteStatusEl.value='follow-up';}
        if(coachToolFollowUpDateEl){coachToolFollowUpDateEl.focus();}
      });
    });
    Array.prototype.forEach.call(coachToolListEl.querySelectorAll('.coach-resolve-target'),function(btn){
      btn.addEventListener('click',function(){
        saveCoachWorkflowStatus(btn.dataset.workflowKey,'resolved','');
        renderCoachToolModal.trigger=null;
        renderCoachToolModal(activeCoachTool);
        showResult(coachToolResultEl,{success:true,message:'Insight marked resolved.',item:btn.dataset.workflowKey});
      });
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
    var insights=getSmartCoachInsights(true);
    var cards=[
      {tool:'mini-coach',label:'Mini Coach AI',title:insights.summary.next_best_actions+' smart actions',body:'Rule-based local insights now review timelines, goals, PBs, awards, and training history.',foot:'Staff-reviewed advice only.'},
      {tool:'needs-attention',label:'Needs Attention',title:insights.summary.needs_attention+' flagged',body:'Open flagged students with practical follow-up reasons.',foot:'Click to review and add notes.'},
      {tool:'close-award',label:'Close To Award',title:insights.summary.close_to_award+' runners nearby',body:'Review students within 8 laps of the next milestone.',foot:'Click to notify student profiles.'},
      {tool:'training-not-opened',label:'Training Not Opened',title:insights.summary.training_not_opened+' pending views',body:'See assigned tasks that have not been opened.',foot:'Click for reminder notes.'},
      {tool:'personal-bests',label:'Personal Bests',title:insights.summary.personal_bests+' PB markers',body:'Review recent PBs across athletics and carnival results.',foot:'Click for celebration or next-step notes.'},
      {tool:'class-trends',label:'Class Trends',title:(insights.class_trends[0]&&insights.class_trends[0].group)||'No class yet',body:'Compare participation, progress, and award readiness by class.',foot:'Click for class-level notes.'},
      {tool:'celebration-wall',label:'Celebration Wall',title:insights.summary.celebration_candidates+' candidates',body:'Moderated list of awards and PBs worth celebrating.',foot:'Click to prepare staff-reviewed shout-outs.',wide:true}
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
      var status=coachToolNoteStatusEl?coachToolNoteStatusEl.value:'open';
      var category=coachToolNoteCategoryEl?coachToolNoteCategoryEl.value:'general';
      var followUpDate=coachToolFollowUpDateEl?coachToolFollowUpDateEl.value:'';
      if(coachToolNoteScopeEl.value){saveCoachWorkflowStatus(coachToolNoteScopeEl.value,status,followUpDate);}
      saveCoachNoteWithBackend(coachToolNoteScopeEl.value,coachToolNoteTextEl.value,status,category,followUpDate).then(function(result){
        if(!result.ok){showResult(coachToolResultEl,{success:false,error:result.error||result.reason||'Coach note failed.'});return;}
        var row=result.coach_note;
        coachToolNoteTextEl.value='';
        if(coachToolFollowUpDateEl){coachToolFollowUpDateEl.value='';}
        renderCoachNotes();
        renderFutureIntelligenceSkeleton();
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
  renderSchoolSignup();
  renderComplianceChecklist();
  renderComplianceDataMap();
  renderParentCollectionNotice();
  renderBreachLog();
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
  if(schoolSignupFormEl){schoolSignupFormEl.addEventListener('submit',saveSchoolSignup);}
  document.getElementById('export-school-signup-btn').addEventListener('click',exportSchoolSignup);
  document.getElementById('print-compliance-checklist-btn').addEventListener('click',printComplianceChecklist);
  document.getElementById('export-compliance-pack-btn').addEventListener('click',exportCompliancePack);
  document.getElementById('print-parent-notice-btn').addEventListener('click',printParentCollectionNotice);
  document.getElementById('export-parent-notice-btn').addEventListener('click',exportParentCollectionNotice);
  var exportDemoSnapshotBtn=document.getElementById('export-demo-snapshot-btn');
  if(exportDemoSnapshotBtn){exportDemoSnapshotBtn.addEventListener('click',exportDemoSnapshot);}
  var resetDemoDataBtn=document.getElementById('reset-demo-data-btn');
  if(resetDemoDataBtn){resetDemoDataBtn.addEventListener('click',resetDemoData);}
  breachLogFormEl.addEventListener('submit',saveBreachLogEntry);
  document.getElementById('breach-log-date').value=new Date().toISOString().slice(0,10);
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
  applyBrandingTitleBtn.addEventListener('click',saveBrandingTitleOnly);
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
        assignStudentCredentials(importedStudent,students);
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
        assignStudentCredentials(importedStudent,students);
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
      html+='<div class="barcode-card-print"><div class="barcode-card-school">Corso</div><strong class="barcode-card-name">'+escapeHtml(s.name)+'</strong><div class="barcode-card-meta">'+escapeHtml(s.year)+' / '+escapeHtml(s.cls)+'</div><div class="barcode-qr-row">'+barcodeBarsHtml(code)+qrCodeHtml(code)+'</div><div class="barcode-code">'+escapeHtml(code)+'</div></div>';
    });
    html+='</div></body></html>';
    win.document.write(html); win.document.close(); schedulePrintWindow(win);
  });

})();
