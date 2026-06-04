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
  var K = { students:'rc_students', activity:'rc_activity', sessions:'rc_sessions', events:'rc_events', challenges:'rc_challenges', timedRuns:'rc_timed' };

  function load(key, def) { try { var r=localStorage.getItem(key); return r?JSON.parse(r):def; } catch{return def;} }
  function save(key,val) { localStorage.setItem(key,JSON.stringify(val)); }

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
  function lapsTokm(l) { return l*0.25; }
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
  var scanResultEl=document.getElementById('scan-result');
  var sessionStateEl=document.getElementById('session-state');
  var sessionLogEl=document.getElementById('session-log');
  var currentSession=null;
  var sessionScans=[];

  document.getElementById('start-session-btn').addEventListener('click', function(){
    currentSession={id:'session-'+Date.now(),date:new Date().toISOString().slice(0,10),scans:[]};
    sessionScans=[];
    sessionStateEl.style.background='#e6f0ff'; sessionStateEl.style.borderColor='#0c5aa8';
    sessionStateEl.textContent='Session OPEN – '+currentSession.date;
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
    var students=getStudents();
    var student=students.find(function(s){return s.barcode===barcode||s.id===barcode;});
    if(!student){
      showResult(scanResultEl,{success:false,error:'Unknown barcode: '+barcode});
    } else {
      student.laps+=1;
      saveStudents(students);
      var scan={barcode:barcode,name:student.name,laps:student.laps,time:new Date().toISOString()};
      sessionScans.push(scan);
      showResult(scanResultEl,{success:true,message:'Lap logged ✓',student:{id:student.id,name:student.name,total_laps:student.laps,km:lapsTokm(student.laps).toFixed(2)}});
      renderSessionLog(sessionScans);
      renderStudentList();
      renderLeaderboard();
      renderAwards();
      renderMedals();
      renderCertificates();
      renderSchoolSummary();
    }
    scanInput.value=''; scanInput.focus();
  }

  scanBtn.addEventListener('click',handleScan);
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

  function renderOfflineQueue(){
    var batches=load('rc_offline_queue', defaultOfflineQueue());
    if(!batches.length){offlineQueueEl.innerHTML='<p style="color:#888;font-size:0.85rem;">No offline kiosk batches waiting to sync.</p>';return;}
    offlineQueueEl.innerHTML=batches.map(function(batch){
      return '<div style="padding:0.75rem;border:1px solid #e2e8f0;border-radius:0.5rem;margin-bottom:0.75rem;background:#f8faff;">'+
        '<strong>'+batch.device+'</strong><br>'+
        '<span style="font-size:0.82rem;color:#555;">'+batch.scans.length+' scans • Last updated '+new Date(batch.lastUpdated).toLocaleTimeString()+'</span>'+
        '<details style="margin-top:0.5rem;"><summary>Review batch</summary>'+
        '<ul style="margin:0.5rem 0 0;padding-left:1.1rem;font-size:0.82rem;">'+batch.scans.map(function(scan){return '<li>'+scan.barcode+' • '+new Date(scan.time).toLocaleTimeString()+'</li>';}).join('')+'</ul>'+
        '</details>'+
        '<button type="button" class="secondary sync-offline-batch" data-batch="'+batch.id+'" style="margin-top:0.75rem;">Sync to main data</button>'+
      '</div>';
    }).join('');
    document.querySelectorAll('.sync-offline-batch').forEach(function(btn){
      btn.onclick=function(){ syncOfflineBatch(btn.dataset.batch); };
    });
  }

  function syncOfflineBatch(batchId){
    var batches=load('rc_offline_queue', defaultOfflineQueue());
    var batch=batches.find(function(b){return b.id===batchId;});
    if(!batch){return;}
    var students=getStudents();
    batch.scans.forEach(function(scan){
      var barcode=String(scan.barcode||'').toUpperCase();
      var student=students.find(function(s){return s.barcode===barcode||s.id===barcode;});
      if(student){student.laps+=1;}
    });
    saveStudents(students);
    save('rc_offline_queue', batches.filter(function(b){return b.id!==batchId;}));
    renderOfflineQueue(); renderStudentList(); renderLeaderboard(); renderAwards(); renderMedals(); renderCertificates(); renderSchoolSummary();
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
      li.appendChild(label); li.appendChild(goalsBtn);
      studentListEl.appendChild(li);
    });
  }
  renderStudentList();
  studentSearchEl.addEventListener('input',renderStudentList);

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
    renderActivityLog(); renderLeaderboard(); renderMedals(); renderCertificates(); renderSchoolSummary();
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
  var MILESTONES=[5,10,25,50,100,200,500];
  var MILESTONE_LABELS={5:'First 5 Laps',10:'10 Lap Club',25:'Quarter Century',50:'Half Century',100:'Century Club',200:'Double Century',500:'Elite Runner'};

  function renderAwards(){
    var students=getStudents();
    var html='';
    students.forEach(function(s){
      var earned=MILESTONES.filter(function(m){return s.laps>=m;});
      if(earned.length){
        html+='<div style="margin-bottom:0.75rem;padding:0.75rem;border-radius:0.5rem;background:#fff8e1;border:1px solid #f59e0b;">';
        html+='<strong>'+s.name+'</strong> ('+s.year+', '+s.cls+')<br>';
        earned.forEach(function(m){
          html+='<span class="award-badge">&#127942; '+MILESTONE_LABELS[m]+'</span>';
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

  document.getElementById('refresh-awards-btn').addEventListener('click',renderAwards);
  document.getElementById('print-certificates-btn').addEventListener('click',function(){
    var students=getStudents();
    var win=window.open('','_blank');
    var html='<html><head><title>Award Certificates</title><style>body{font-family:sans-serif;padding:2rem;} .cert{border:3px solid gold;padding:2rem;margin:1rem 0;text-align:center;page-break-after:always;} h2{color:#0c5aa8;} .badge{display:inline-block;padding:0.3rem 0.8rem;border-radius:999px;background:#fff8e1;border:1px solid #f59e0b;margin:0.2rem;font-size:0.9rem;}</style></head><body>';
    students.forEach(function(s){
      var earned=MILESTONES.filter(function(m){return s.laps>=m;});
      if(earned.length){
        html+='<div class="cert"><h2>&#127942; Run Club Achievement Certificate</h2><h3>'+s.name+'</h3><p>'+s.year+' – Class '+s.cls+'</p><p>Total laps: <strong>'+s.laps+'</strong> ('+lapsTokm(s.laps).toFixed(2)+' km)</p>';
        earned.forEach(function(m){html+='<span class="badge">&#127942; '+MILESTONE_LABELS[m]+'</span>';});
        html+='<p style="margin-top:1rem;color:#888;font-size:0.8rem;">Run Club Connect • 2026</p></div>';
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

  document.getElementById('export-report-json-btn').addEventListener('click',function(){
    dlJson('runclub-report-'+new Date().toISOString().slice(0,10)+'.json',{
      exported_at:new Date().toISOString(),
      students:getStudents(),
      activity_logs:load(K.activity,[]),
      events:load(K.events,[]),
      challenges:load(K.challenges,[]),
      timed_runs:load(K.timedRuns,[]),
      sessions:load(K.sessions,[])
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

  document.getElementById('print-report-btn').addEventListener('click',function(){ window.print(); });

  // === IMPORT ===
  var importResultEl=document.getElementById('import-result');

  document.getElementById('import-form').addEventListener('submit',function(e){
    e.preventDefault();
    var file=document.getElementById('csv-file').files[0];
    if(!file){showResult(importResultEl,{success:false,error:'Select a CSV file.'});return;}
    var reader=new FileReader();
    reader.onload=function(ev){
      var lines=ev.target.result.split('\n').map(function(l){return l.trim();}).filter(Boolean);
      if(!lines.length){showResult(importResultEl,{success:false,error:'Empty file.'});return;}
      var headers=lines[0].toLowerCase().split(',').map(function(h){return h.trim();});
      var fi=headers.indexOf('firstname'); var li=headers.indexOf('lastname');
      var yi=headers.indexOf('yeargroup'); var ci=headers.indexOf('classname');
      if(fi<0||li<0||yi<0||ci<0){showResult(importResultEl,{success:false,error:'Missing columns. Need: firstname,lastname,yeargroup,classname'});return;}
      var students=getStudents();
      var added=0; var skipped=0;
      lines.slice(1).forEach(function(line){
        var cols=line.split(',').map(function(c){return c.trim();});
        var first=cols[fi]; var last=cols[li]; var year=cols[yi]; var cls=cols[ci];
        if(!first||!last)return;
        var name=first+' '+last;
        var exists=students.find(function(s){return s.name===name&&s.year===year;});
        if(exists){skipped++;return;}
        var code=(last.substring(0,5)+first.substring(0,1)).toUpperCase().replace(/[^A-Z]/g,'');
        var id=code+(Math.floor(Math.random()*90)+10);
        students.push({id:id,barcode:id,first:first,last:last,name:name,year:year,cls:cls,laps:0,minutes:0,events:[]});
        added++;
      });
      saveStudents(students);
      renderStudentList(); renderLeaderboard(); populateActivityStudents(); populateTimedStudents(); populateLbFilters(); renderMedals(); renderCertificates(); renderSchoolSummary();
      showResult(importResultEl,{success:true,added:added,skipped:skipped,total:students.length});
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
    var html='<html><head><title>Barcode ID Cards</title><style>body{font-family:sans-serif;padding:1rem;} .cards{display:flex;flex-wrap:wrap;gap:0.5rem;} .card{border:1px solid #ccc;padding:0.5rem;width:200px;font-size:0.75rem;text-align:center;border-radius:4px;} .barcode{font-family:monospace;font-size:1.1rem;font-weight:bold;letter-spacing:0.1em;background:#f4f4f4;padding:0.3rem;border-radius:3px;margin:0.3rem 0;} @media print{@page{margin:1cm;}}</style></head><body>';
    html+='<div class="cards">';
    students.forEach(function(s){
      html+='<div class="card"><strong>'+s.name+'</strong><br>'+s.year+' – '+s.cls+'<div class="barcode">'+s.barcode+'</div><small>Run Club Connect</small></div>';
    });
    html+='</div></body></html>';
    win.document.write(html); win.document.close(); win.print();
  });

})();
