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
  var K = { students:'rc_students', activity:'rc_activity', sessions:'rc_sessions', events:'rc_events', challenges:'rc_challenges', timedRuns:'rc_timed', customAwards:'rc_custom_awards', scanAudit:'rc_scan_audit', scannerSettings:'rc_scanner_settings', offlineQueue:'rc_offline_queue', programSettings:'rc_program_settings', training:'rc_training', trainingClicks:'rc_training_clicks', adjustments:'rc_adjustments' };
  var GUARDIAN_LINKS_KEY = 'rc_guardian_links';

  function load(key, def) { try { var r=localStorage.getItem(key); return r?JSON.parse(r):def; } catch{return def;} }
  function save(key,val) { localStorage.setItem(key,JSON.stringify(val)); }
  function scannerSettings(){ var settings=load(K.scannerSettings,{duplicateCooldownSeconds:3,deviceName:'Admin dashboard',deviceLocation:'School'}); var seconds=Number(settings.duplicateCooldownSeconds); if(!isFinite(seconds)||seconds<0){seconds=3;} return {duplicateCooldownSeconds:Math.min(120,seconds),deviceName:String(settings.deviceName||'Admin dashboard'),deviceLocation:String(settings.deviceLocation||'School')}; }
  function cleanList(value, fallback){ var list=Array.isArray(value)?value:String(value||'').split(','); list=list.map(function(item){return String(item).trim();}).filter(Boolean); return list.length?Array.from(new Set(list)):fallback; }
  function cleanThresholds(value){ var list=Array.isArray(value)?value:String(value||'').split(','); list=list.map(function(item){return Number(item);}).filter(function(item){return isFinite(item)&&item>0;}).map(function(item){return Math.round(item);}).sort(function(a,b){return a-b;}); return list.length?Array.from(new Set(list)):[5,10,25,50,100,200,500]; }
  function programSettings(){ var settings=window.RunClubScan&&window.RunClubScan.programSettings?window.RunClubScan.programSettings():load(K.programSettings,{schoolName:'Gwynne Park Schools',lapDistanceKm:0.25,defaultSessionType:'Run Club',activeYears:['Year 1','Year 2','Year 3','Year 4','Year 5','Year 6'],classNames:['1A','2A','3A','4C','5B','6A'],awardThresholds:[5,10,25,50,100,200,500]}); var lapDistanceKm=Number(settings.lapDistanceKm); if(!isFinite(lapDistanceKm)||lapDistanceKm<=0){lapDistanceKm=0.25;} return {schoolName:String(settings.schoolName||'Gwynne Park Schools'),lapDistanceKm:lapDistanceKm,defaultSessionType:String(settings.defaultSessionType||'Run Club'),activeYears:cleanList(settings.activeYears,['Year 1','Year 2','Year 3','Year 4','Year 5','Year 6']),classNames:cleanList(settings.classNames,['1A','2A','3A','4C','5B','6A']),awardThresholds:cleanThresholds(settings.awardThresholds)}; }
  function saveProgramSettings(partial){ save(K.programSettings,Object.assign({},programSettings(),partial)); }
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
    return '<span class="award-badge" style="border-color:'+medal.color+';color:'+medal.color+';">'+medal.name+'</span>';
  }

  // --- Helpers ---
  function showResult(el,payload) { el.hidden=false; el.textContent=JSON.stringify(payload,null,2); }

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
  tabBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      tabBtns.forEach(function(b){b.classList.remove('active');});
      tabPanels.forEach(function(p){p.classList.remove('active');});
      btn.classList.add('active');
      document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
    });
  });

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

  document.getElementById('start-session-btn').addEventListener('click', function(){
    currentSession={id:'session-'+Date.now(),date:new Date().toISOString().slice(0,10),type:sessionTypeEl.value||programSettings().defaultSessionType,notes:sessionNotesEl.value.trim(),device:scannerId(),lap_distance_km:programSettings().lapDistanceKm,scans:[]};
    sessionScans=[];
    sessionStateEl.style.background='#e6f0ff'; sessionStateEl.style.borderColor='#0c5aa8';
    sessionStateEl.textContent='Session OPEN - '+currentSession.type+' - '+currentSession.date+' - '+currentSession.device;
    scanInput.focus();
  });

  document.getElementById('finish-session-btn').addEventListener('click', function(){
    if(!currentSession){return;}
    currentSession.scans=sessionScans;
    currentSession.finished_at=new Date().toISOString();
    var sessions=load(K.sessions,[]);
    sessions.push(currentSession);
    save(K.sessions,sessions);
    sessionStateEl.style.background='#f0fff4'; sessionStateEl.style.borderColor='#c6f0d4';
    sessionStateEl.textContent='Session closed – '+sessionScans.length+' scans saved.';
    currentSession=null; sessionScans=[];
    renderSessionLog([]);
  });

  var autoTimer=null;
  function handleScan(){
    var barcode=scanInput.value.trim().toUpperCase();
    if(!barcode)return;
    var result=window.RunClubScan.logLap(barcode,{source:'admin-dashboard',scanner_id:scannerId(),duplicateWindowMs:duplicateWindowMs()});
    if(!result.success){
      showResult(scanResultEl,{success:false,duplicate:result.duplicate===true,error:result.error||'Scan error'});
    } else {
      var scan={barcode:barcode,name:result.student.name,laps:result.student.laps,time:new Date().toISOString(),scanner_id:scannerId(),session_type:currentSession?currentSession.type:sessionTypeEl.value};
      sessionScans.push(scan);
      lastAdminScan={student_id:result.student.id,name:result.student.name,barcode:barcode};
      undoAdminScanBtn.hidden=false;
      showResult(scanResultEl,{success:true,message:'Lap logged ✓',student:{id:result.student.id,name:result.student.name,total_laps:result.student.laps,km:result.student.km.toFixed(2)}});
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
      student.laps-=1;
      saveStudents(students);
      sessionScans=sessionScans.filter(function(scan,index){return index!==sessionScans.length-1;});
      if(window.RunClubScan&&window.RunClubScan.auditScan){
        window.RunClubScan.auditScan({barcode:lastAdminScan.barcode,scanner_id:scannerId(),source:'admin-dashboard',success:true,undo:true,student_id:student.id,student_name:student.name,laps_after:student.laps});
      }
      renderSessionLog(sessionScans);
      renderStudentList(); renderLeaderboard(); renderAwards(); renderMedals(); renderCertificates(); renderSchoolSummary(); renderReportSummaries(); renderAuditTrail();
      showResult(scanResultEl,{success:true,message:'Last scan undone.',student:{id:student.id,name:student.name,total_laps:student.laps}});
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
      html+='<li style="padding:0.3rem 0;border-bottom:1px solid #f0f0f0;font-size:0.82rem;">'+s.name+' – lap #'+s.laps+' – <span style="color:#888;">'+s.time.slice(11,19)+'</span></li>';
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
  var progressStudentEl=document.getElementById('progress-student');
  var progressTermEl=document.getElementById('progress-term');
  var studentProgressSummaryEl=document.getElementById('student-progress-summary');
  var studentProgressHistoryEl=document.getElementById('student-progress-history');
  var guardianLinkListEl=document.getElementById('guardian-link-list');
  var generateGuardianLinksBtn=document.getElementById('generate-guardian-links-btn');

  function refreshStudentViews(){
    renderStudentList();
    renderGuardianLinks();
    populateProgressStudents();
    populateTrainingStudents();
    populateLbFilters();
    renderLeaderboard();
    populateActivityStudents();
    populateTimedStudents();
    renderMedals();
    renderCertificates();
    renderSchoolSummary();
    renderReportSummaries();
    renderSummaryDashboards();
    renderAdminAnalytics();
    populateFullHistoryStudents();
    populateClassReportSelect();
    populateAdjustmentStudents();
    renderFullStudentHistory();
    renderAttendanceSummary();
    renderAdjustmentLedger();
    renderStudentProgress();
    renderTrainingStatus();
  }

  function renderBarcodeConfirmation(student){
    barcodeConfirmationEl.hidden=false;
    barcodeConfirmationEl.innerHTML=
      '<div><strong>Barcode generated</strong><br><span>'+escapeHtml(student.name)+' • '+escapeHtml(student.barcode||student.id)+'</span></div>'+
      barcodeCardHtml(student);
  }

  function renderStudentList(){
    var students=getStudents();
    var q=(studentSearchEl.value||'').toLowerCase();
    if(q) students=students.filter(function(s){return (s.name+s.id+s.year+s.cls).toLowerCase().includes(q);});
    studentListEl.innerHTML='';
    students.forEach(function(s){
      var li=document.createElement('li');
      li.style.display='flex'; li.style.justifyContent='space-between'; li.style.alignItems='center'; li.style.gap='8px';
      var label=document.createElement('span');
      label.textContent=s.name+' ('+s.barcode+') – '+s.year+', '+s.cls+' – '+s.laps+' laps / '+lapsTokm(s.laps).toFixed(2)+' km';
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
      editBtn.addEventListener('click',function(){ openStudentEditor(s.id); });
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

  function generateGuardianLinkCode(student){
    var seed=(student.id||student.barcode||student.name||'student').replace(/[^a-z0-9]/gi,'').slice(0,8).toUpperCase();
    var random=Math.floor(100000+Math.random()*900000);
    return 'GP-' + seed + '-' + random;
  }

  function upsertGuardianLink(student){
    var rows=guardianLinks();
    var existing=rows.find(function(row){return row.student_id===student.id;});
    var code=generateGuardianLinkCode(student);
    if(existing){
      existing.code=code;
      existing.student_name=student.name;
      existing.year=student.year;
      existing.class_name=student.cls;
      existing.updated_at=new Date().toISOString();
    } else {
      rows.push({student_id:student.id,student_name:student.name,year:student.year,class_name:student.cls,code:code,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
    }
    saveGuardianLinks(rows);
    renderGuardianLinks();
  }

  function generateMissingGuardianLinks(){
    var rows=guardianLinks();
    var has={};
    rows.forEach(function(row){has[row.student_id]=true;});
    getStudents().forEach(function(student){
      if(!has[student.id]){
        rows.push({student_id:student.id,student_name:student.name,year:student.year,class_name:student.cls,code:generateGuardianLinkCode(student),created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
      }
    });
    saveGuardianLinks(rows);
    renderGuardianLinks();
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
    guardianLinkListEl.innerHTML='<table class="progress-history-table"><thead><tr><th>Student</th><th>Year</th><th>Class</th><th>Guardian code</th><th>Action</th></tr></thead><tbody>'+
      rows.map(function(row){
        return '<tr><td>'+escapeHtml(row.student_name)+'</td><td>'+escapeHtml(row.year)+'</td><td>'+escapeHtml(row.class_name)+'</td><td><code>'+escapeHtml(row.code)+'</code></td><td><button type="button" class="link-btn reissue-guardian-link" data-student="'+escapeAttr(row.student_id)+'">Reissue</button></td></tr>';
      }).join('')+'</tbody></table>';
    document.querySelectorAll('.reissue-guardian-link').forEach(function(btn){
      btn.addEventListener('click',function(){
        var student=getStudents().find(function(s){return s.id===btn.dataset.student;});
        if(student){upsertGuardianLink(student);}
      });
    });
  }

  if(generateGuardianLinksBtn){
    generateGuardianLinksBtn.addEventListener('click',generateMissingGuardianLinks);
  }
  renderGuardianLinks();

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
      if(row.student_id===studentId&&row.success&&!row.undo&&inSelectedTerm(row.time)){
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
  document.getElementById('refresh-progress-btn').addEventListener('click',renderStudentProgress);
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

  function trainingAssignments(){ return load(K.training,[]); }
  function trainingClicks(){ return load(K.trainingClicks,[]); }

  function normalizeTrainingUrl(url){
    var value=String(url||'').trim();
    if(!value){return '';}
    if(!/^https?:\/\//i.test(value)){value='https://'+value;}
    return value;
  }

  function populateTrainingStudents(){
    if(!trainingStudentListEl){return;}
    trainingStudentListEl.innerHTML=getStudents().map(function(s){
      return '<label class="ag-student-option"><input type="checkbox" class="training-student-check" value="'+escapeAttr(s.id)+'" /> '+escapeHtml(s.name)+' <span>'+escapeHtml(s.year)+' / '+escapeHtml(s.cls)+'</span></label>';
    }).join('');
  }

  function selectedTrainingStudents(){
    return Array.from(document.querySelectorAll('.training-student-check:checked')).map(function(input){return input.value;});
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
    var assignments=trainingAssignments();
    assignments.push(assignment);
    save(K.training,assignments);
    trainingFormEl.reset();
    populateTrainingStudents();
    showResult(trainingResultEl,{success:true,message:'Training assigned.',assigned_students:assigned.length,title:assignment.title});
    renderTrainingStatus();
  }

  function trainingClickFor(assignmentId,studentId){
    return trainingClicks().filter(function(click){return click.assignment_id===assignmentId&&click.student_id===studentId;}).sort(function(a,b){return String(b.opened_at).localeCompare(String(a.opened_at));})[0]||null;
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
        return '<tr><td>'+escapeHtml(student?student.name:studentId)+'</td><td>'+escapeHtml(student?student.year:'')+'</td><td>'+escapeHtml(student?student.cls:'')+'</td><td>'+(click?'Opened':'Not opened')+'</td><td>'+escapeHtml(click?new Date(click.opened_at).toLocaleString():'')+'</td></tr>';
      }).join('');
      return '<div class="training-assignment">'+
        '<div class="training-assignment-head"><div><strong>'+escapeHtml(task.title)+'</strong><br><span>'+escapeHtml(task.notes||'No notes')+'</span></div><a href="'+escapeAttr(task.url)+'" target="_blank" rel="noopener">Open task</a></div>'+
        '<div class="training-meta">'+(task.due_date?'Due '+escapeHtml(task.due_date)+' • ':'')+(task.assigned_student_ids||[]).length+' student(s)</div>'+
        '<table class="training-status-table"><thead><tr><th>Student</th><th>Year</th><th>Class</th><th>Status</th><th>Last opened</th></tr></thead><tbody>'+rows+'</tbody></table>'+
      '</div>';
    }).join('');
  }

  if(trainingFormEl){
    trainingFormEl.addEventListener('submit',createTrainingAssignment);
    document.getElementById('select-all-training-students').addEventListener('click',function(){
      document.querySelectorAll('.training-student-check').forEach(function(input){input.checked=true;});
    });
    populateTrainingStudents();
    renderTrainingStatus();
  }

  function openStudentEditor(studentId){
    var student=getStudents().find(function(s){return s.id===studentId;});
    if(!student){return;}
    editStudentIdEl.value=student.id;
    editStudentFirstEl.value=student.first||'';
    editStudentLastEl.value=student.last||'';
    editStudentYearEl.value=student.year||'Year 1';
    editStudentClassEl.value=student.cls||'';
    studentEditorModalEl.hidden=false;
    editStudentFirstEl.focus();
  }

  function closeStudentEditor(){
    studentEditorModalEl.hidden=true;
    editStudentFormEl.reset();
  }

  function deleteStudent(studentId){
    var students=getStudents();
    var student=students.find(function(s){return s.id===studentId;});
    if(!student){return;}
    if(!confirm('Remove '+student.name+' from the roster? Their past exported reports will not be changed.')){return;}
    saveStudents(students.filter(function(s){return s.id!==studentId;}));
    try {
      var allGoals=JSON.parse(localStorage.getItem('rc_goals')||'{}');
      delete allGoals[studentId];
      localStorage.setItem('rc_goals',JSON.stringify(allGoals));
    } catch(e) {}
    refreshStudentViews();
    showResult(addStudentResultEl,{success:true,message:'Student removed.',student:{name:student.name,barcode:student.barcode}});
  }

  editStudentFormEl.addEventListener('submit',function(e){
    e.preventDefault();
    var studentId=editStudentIdEl.value;
    var first=editStudentFirstEl.value.trim();
    var last=editStudentLastEl.value.trim();
    var year=editStudentYearEl.value;
    var cls=editStudentClassEl.value.trim().toUpperCase();
    if(!studentId||!first||!last||!year||!cls){return;}
    var students=getStudents();
    var updated=null;
    students=students.map(function(s){
      if(s.id!==studentId){return s;}
      updated=Object.assign({},s,{first:first,last:last,name:first+' '+last,year:year,cls:cls});
      return updated;
    });
    saveStudents(students);
    closeStudentEditor();
    refreshStudentViews();
    if(updated){showResult(addStudentResultEl,{success:true,message:'Student updated.',student:{name:updated.name,year:updated.year,cls:updated.cls,barcode:updated.barcode}});}
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
    if(!first||!last||!year||!cls){showResult(addStudentResultEl,{success:false,error:'Enter first name, last name, year and class.'});return;}
    var students=getStudents();
    var id=generateBarcodeId(first,last,students);
    var student={id:id,barcode:id,first:first,last:last,name:first+' '+last,year:year,cls:cls,laps:0,minutes:0,events:[]};
    students.push(student);
    saveStudents(students);
    addStudentFormEl.reset();
    refreshStudentViews();
    addStudentResultEl.hidden=true;
    renderBarcodeConfirmation(student);
    printStudentBarcodeCard(student);
  });

  var sportsCarnivalModeEl=document.getElementById('sports-carnival-mode');
  sportsCarnivalModeEl.checked=window.RunClubGoals.isSportsCarnivalMode();
  sportsCarnivalModeEl.addEventListener('change',function(){
    window.RunClubGoals.setSportsCarnivalMode(sportsCarnivalModeEl.checked);
  });

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

  document.getElementById('log-activity-btn').addEventListener('click',function(){
    var studentId=actStudentEl.value;
    var student=getStudents().find(function(s){return s.id===studentId;});
    var type=actTypeEl.value.trim()||'General';
    var mins=Number(actMinsEl.value||'0');
    if(!student||mins<=0){showResult(actResultEl,{success:false,error:'Choose a student and enter valid minutes.'});return;}
    var logs=load(K.activity,[]);
    logs.push({id:'act-'+Date.now(),student_id:studentId,student_name:student.name,activity_type:type,minutes:mins,km:minutesToKm(mins).toFixed(2),date:new Date().toISOString().slice(0,10)});
    save(K.activity,logs);
    // Also add to student minutes
    var students=getStudents();
    var st=students.find(function(s){return s.id===studentId;});
    if(st){st.minutes=(st.minutes||0)+mins; saveStudents(students);}
    showResult(actResultEl,{success:true,message:'Activity logged.',student:student.name,minutes:mins,km_credit:minutesToKm(mins).toFixed(2)});
    renderActivityLog(); renderLeaderboard(); renderMedals(); renderCertificates(); renderSchoolSummary(); renderReportSummaries();
    actMinsEl.value='';
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
  function milestoneThresholds(){ return programSettings().awardThresholds; }
  var MILESTONE_LABELS={5:'First 5 Laps',10:'10 Lap Club',25:'Quarter Century',50:'Half Century',100:'Century Club',200:'Double Century',500:'Elite Runner'};
  function milestoneLabel(laps){ return MILESTONE_LABELS[laps]||laps+' Lap Club'; }

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

  function renderMedals(){
    medalRulesEl.innerHTML=MEDAL_TIERS.filter(function(t){return t.name!=='Starter';}).map(function(t){
      return '<span class="award-badge" style="border-color:'+t.color+';color:'+t.color+';">'+t.name+' • '+t.km+' km</span>';
    }).join('');
    var counts={};
    MEDAL_TIERS.forEach(function(t){counts[t.name]=0;});
    getStudents().forEach(function(s){counts[medalFor(s).name]+=1;});
    medalSummaryEl.innerHTML='<div style="display:flex;gap:0.75rem;flex-wrap:wrap;">'+MEDAL_TIERS.map(function(t){
      return '<div class="stat-box"><div class="stat-value" style="color:'+t.color+';">'+counts[t.name]+'</div><div class="stat-label">'+t.name+'</div></div>';
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

  function renderChallenges(){
    var challenges=load(K.challenges,[]);
    if(!challenges.length){challengesListEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No challenges yet.</p>';return;}
    var html='<ul style="padding:0;list-style:none;margin:0;">';
    challenges.forEach(function(c){
      html+='<li style="padding:0.4rem 0;border-bottom:1px solid #f0f0f0;font-size:0.85rem;"><strong>'+c.name+'</strong> – Goal: '+c.goal+'</li>';
    });
    html+='</ul>';
    challengesListEl.innerHTML=html;
  }
  renderChallenges();

  document.getElementById('create-challenge-btn').addEventListener('click',function(){
    var name=document.getElementById('challenge-name').value.trim();
    var goal=document.getElementById('challenge-goal').value.trim();
    if(!name||!goal){showResult(challengeResultEl,{success:false,error:'Enter name and goal.'});return;}
    var challenges=load(K.challenges,[]);
    challenges.push({id:'ch-'+Date.now(),name:name,goal:goal,created:new Date().toISOString().slice(0,10)});
    save(K.challenges,challenges);
    showResult(challengeResultEl,{success:true,message:'Challenge created: '+name});
    renderChallenges();
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
    var audit=load(K.scanAudit,[]).filter(function(row){return row.success&&!row.undo;});
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
    saveStudents(students);
    var rows=load(K.adjustments,[]);
    var record={id:'adj-'+Date.now(),time:new Date().toISOString(),student_id:student.id,student_name:student.name,delta_laps:delta,reason:reason,staff:session.email||'admin',laps_after:student.laps};
    rows.push(record);
    save(K.adjustments,rows);
    document.getElementById('adjustment-reason').value='';
    showResult(adjustmentResultEl,{success:true,message:'Manual adjustment saved.',record:record});
    refreshStudentViews();
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

  fullHistoryStudentEl.addEventListener('change',renderFullStudentHistory);
  document.getElementById('refresh-full-history-btn').addEventListener('click',renderFullStudentHistory);
  document.getElementById('export-full-history-csv-btn').addEventListener('click',exportFullStudentHistoryCsv);
  document.getElementById('export-term-progress-csv-btn').addEventListener('click',exportTermProgressCsv);
  document.getElementById('print-term-progress-btn').addEventListener('click',printTermProgress);
  document.getElementById('print-class-report-btn').addEventListener('click',printClassReport);
  document.getElementById('print-award-pack-btn').addEventListener('click',printAwardPack);
  document.getElementById('export-certificate-batch-csv-btn').addEventListener('click',function(){
    dlCsv('certificate-batch-'+new Date().toISOString().slice(0,10)+'.csv',certificateBatchRows(),['batch_rank','student','year','class','milestone','km','total_km','printed']);
    showResult(reportsResultEl,{success:true,message:'Certificate batch CSV exported.'});
  });
  document.getElementById('export-attendance-csv-btn').addEventListener('click',function(){
    dlCsv('session-attendance-'+new Date().toISOString().slice(0,10)+'.csv',sessionAttendanceRows(),['date','session','students','scans','participation']);
    showResult(reportsResultEl,{success:true,message:'Attendance CSV exported.'});
  });
  adjustmentFormEl.addEventListener('submit',createManualAdjustment);
  document.getElementById('download-admin-templates-btn').addEventListener('click',downloadAdminTemplates);

  document.getElementById('print-report-btn').addEventListener('click',function(){ window.print(); });

  // === IMPORT ===
  var importResultEl=document.getElementById('import-result');
  var importSummaryEl=document.getElementById('import-summary');

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
        students.push({id:id,barcode:id,first:first,last:last,name:name,year:year,cls:cls,laps:0,minutes:0,events:[]});
        existingKeys[key]=true;
        fileKeys[key]=true;
        added++;
      });
      saveStudents(students);
      refreshStudentViews();
      var summary={success:true,added:added,duplicates:duplicates,invalid:invalid,total:students.length,skipped_details:skippedDetails};
      showResult(importResultEl,summary);
      importResultEl.hidden=true;
      renderImportSummary(summary);
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
