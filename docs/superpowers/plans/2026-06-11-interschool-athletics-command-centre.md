# Interschool Athletics Command Centre Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a smoother admin-only Interschool Athletics Command Centre with category sliders, event readiness counts, improved event team selection filters, and helper cards.

**Architecture:** Keep the feature local-first inside the existing static admin dashboard. `admin-dashboard.html` owns the new filter controls and helper containers, `admin-dashboard.js` owns local state and rendering, `styles.css` owns responsive/dark-mode-safe presentation, and `tests/portal-smoke.test.js` locks the workflow contract.

**Tech Stack:** Static HTML, vanilla JavaScript, localStorage, CSS, Node smoke tests, in-app browser verification.

---

### Task 1: Smoke-Test The New Command Centre Contract

**Files:**
- Modify: `tests/portal-smoke.test.js`

- [ ] **Step 1: Add failing markup and script assertions**

Add these assertions near the current Interschool Athletics assertions:

```js
assert(/athletics-command-centre/.test(adminDashboardHtml), 'admin athletics mode should render a command centre panel');
assert(/athletics-helper-cards/.test(adminDashboardHtml), 'admin athletics command centre should include helper cards');
assert(/athletics-category-controls/.test(adminDashboardHtml), 'admin athletics command centre should include category slider controls');
assert(/athletics-team-year-filter/.test(adminDashboardHtml), 'admin athletics team modal should filter by year');
assert(/athletics-team-division-filter/.test(adminDashboardHtml), 'admin athletics team modal should filter by division');
assert(/athletics-team-show-pending/.test(adminDashboardHtml), 'admin athletics team modal should optionally show pending consent students');
assert(/ATHLETICS_CATEGORY_STATE_KEY/.test(adminDashboardJs), 'admin dashboard should persist athletics category open state');
assert(/renderAthleticsHelperCards/.test(adminDashboardJs), 'admin dashboard should render athletics helper cards');
assert(/toggleAthleticsCategory/.test(adminDashboardJs), 'admin dashboard should toggle athletics event categories');
assert(/studentMatchesAthleticsDivision/.test(adminDashboardJs), 'admin athletics team selector should filter students by division');
assert(/athletics-team-student-option--disabled/.test(adminDashboardJs), 'admin athletics team selector should disable pending consent rows');
assert(/\.athletics-command-centre/.test(styles), 'styles should include athletics command centre layout');
assert(/\.athletics-category-toggle/.test(styles), 'styles should include category slider controls');
assert(/\.athletics-helper-card/.test(styles), 'styles should include helper card styles');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test
```

Expected: FAIL in `portal-smoke.test.js` because the new command centre IDs/functions/classes do not exist yet.

---

### Task 2: Add Command Centre Markup And Modal Filters

**Files:**
- Modify: `admin-dashboard.html`

- [ ] **Step 1: Replace the athletics panel contents**

Inside `#athletics-mode-panel`, replace the two direct children with:

```html
<div id="athletics-command-centre" class="athletics-command-centre">
  <div id="athletics-consent-summary" class="athletics-consent-summary"></div>
  <div id="athletics-helper-cards" class="athletics-helper-cards" aria-label="Interschool athletics planning summary"></div>
  <div id="athletics-category-controls" class="athletics-category-controls" aria-label="Interschool athletics event categories"></div>
  <div id="interschool-athletics-events" class="athletics-event-list"></div>
</div>
```

- [ ] **Step 2: Add modal filters above the team student list**

In the `#athletics-event-modal` toolbar, keep the search label and add:

```html
<label>Year
  <select id="athletics-team-year-filter">
    <option value="">All years</option>
  </select>
</label>
<label>Division
  <select id="athletics-team-division-filter">
    <option value="">All divisions</option>
    <option value="Junior">Junior</option>
    <option value="Intermediate">Intermediate</option>
    <option value="Senior">Senior</option>
  </select>
</label>
<label class="checkbox-row athletics-pending-toggle">
  <input type="checkbox" id="athletics-team-show-pending" />
  <span>Show pending consent</span>
</label>
```

- [ ] **Step 3: Run test to verify partial progress**

Run:

```powershell
npm test
```

Expected: FAIL only on the missing JavaScript functions/classes and styles.

---

### Task 3: Implement Category State, Status Counts, And Helper Cards

**Files:**
- Modify: `admin-dashboard.js`

- [ ] **Step 1: Add storage key and DOM references**

Near the existing athletics storage keys, add:

```js
var ATHLETICS_CATEGORY_STATE_KEY = 'rc_athletics_category_state';
```

Near the existing athletics DOM references, add:

```js
var athleticsHelperCardsEl=document.getElementById('athletics-helper-cards');
var athleticsCategoryControlsEl=document.getElementById('athletics-category-controls');
var athleticsTeamYearFilterEl=document.getElementById('athletics-team-year-filter');
var athleticsTeamDivisionFilterEl=document.getElementById('athletics-team-division-filter');
var athleticsTeamShowPendingEl=document.getElementById('athletics-team-show-pending');
```

- [ ] **Step 2: Add category and readiness helpers**

Add these helpers before `renderInterschoolAthleticsEvents`:

```js
function athleticsCategoryState(){
  var state=load(ATHLETICS_CATEGORY_STATE_KEY,null);
  if(state&&typeof state==='object'&&!Array.isArray(state)){return state;}
  return {'Sprints':true,'Middle Distance':true};
}

function saveAthleticsCategoryState(state){
  save(ATHLETICS_CATEGORY_STATE_KEY,state);
}

function toggleAthleticsCategory(group){
  var state=athleticsCategoryState();
  state[group]=!state[group];
  saveAthleticsCategoryState(state);
  renderInterschoolAthleticsEvents();
}

function readyTargetForAthleticsEvent(event){
  var group=String(event.group||event.category||'').toLowerCase();
  if(group.indexOf('relay')!==-1||group.indexOf('ball')!==-1){return 4;}
  return 1;
}

function selectedAthleticsCount(eventId){
  return selectedAthleticsTeamIds(eventId).length;
}

function athleticsEventStatus(event,eventId){
  var count=selectedAthleticsCount(eventId);
  var target=readyTargetForAthleticsEvent(event);
  if(count>=target){return 'ready';}
  if(count>0){return 'partial';}
  return 'empty';
}
```

- [ ] **Step 3: Add helper-card renderer**

Add:

```js
function renderAthleticsHelperCards(){
  if(!athleticsHelperCardsEl){return;}
  var students=getStudents();
  var pending=students.filter(function(student){return String(student.consent_status||'pending').toLowerCase()==='pending';}).length;
  var declined=students.filter(function(student){return String(student.consent_status||'pending').toLowerCase()==='declined';}).length;
  var events=window.RunClubGoals.INTERSCHOOL_ATHLETICS_EVENTS||[];
  var empty=0;
  var ready=0;
  var studentEventCounts={};
  events.forEach(function(event){
    var eventId=athleticsEventIdForName(event.name);
    var selected=selectedAthleticsTeamIds(eventId);
    if(!selected.length){empty+=1;}
    if(selected.length>=readyTargetForAthleticsEvent(event)){ready+=1;}
    selected.forEach(function(studentId){studentEventCounts[studentId]=(studentEventCounts[studentId]||0)+1;});
  });
  var multi=Object.keys(studentEventCounts).filter(function(studentId){return studentEventCounts[studentId]>=2;}).length;
  athleticsHelperCardsEl.innerHTML=
    '<article class="athletics-helper-card"><span>Consent Follow-Up</span><strong>'+pending+' pending / '+declined+' declined</strong><small>Resolve before team sheets go home.</small></article>'+
    '<article class="athletics-helper-card"><span>Empty Events</span><strong>'+empty+'</strong><small>Events needing athlete selection.</small></article>'+
    '<article class="athletics-helper-card"><span>Multi-Event Athletes</span><strong>'+multi+'</strong><small>Check workload and clashes.</small></article>'+
    '<article class="athletics-helper-card"><span>Team Ready</span><strong>'+ready+' / '+events.length+'</strong><small>Based on simple default team targets.</small></article>';
}
```

- [ ] **Step 4: Update event rendering to include category controls and statuses**

Rewrite `renderInterschoolAthleticsEvents` so it:

```js
function renderInterschoolAthleticsEvents(){
  if(!interschoolAthleticsEventsEl){return;}
  var events=window.RunClubGoals.INTERSCHOOL_ATHLETICS_EVENTS||[];
  var groups={};
  events.forEach(function(event){
    if(!groups[event.group]){groups[event.group]=[];}
    groups[event.group].push(event);
  });
  var state=athleticsCategoryState();
  var groupNames=Object.keys(groups);
  if(athleticsCategoryControlsEl){
    athleticsCategoryControlsEl.innerHTML=groupNames.map(function(group){
      var selectedTotal=groups[group].reduce(function(total,event){return total+selectedAthleticsCount(athleticsEventIdForName(event.name));},0);
      var expanded=state[group]!==false;
      return '<button type="button" class="athletics-category-toggle '+(expanded?'is-active':'')+'" aria-expanded="'+(expanded?'true':'false')+'" data-athletics-group="'+escapeAttr(group)+'"><span>'+escapeHtml(group)+'</span><small>'+groups[group].length+' events · '+selectedTotal+' selected</small></button>';
    }).join('');
    Array.prototype.forEach.call(athleticsCategoryControlsEl.querySelectorAll('[data-athletics-group]'),function(btn){
      btn.addEventListener('click',function(){toggleAthleticsCategory(btn.dataset.athleticsGroup);});
    });
  }
  interschoolAthleticsEventsEl.innerHTML=groupNames.map(function(group){
    var expanded=state[group]!==false;
    if(!expanded){return '';}
    return '<div class="athletics-event-group"><strong>'+escapeHtml(group)+'</strong><div>'+groups[group].map(function(event){
      var eventId=athleticsEventIdForName(event.name);
      var selected=selectedAthleticsCount(eventId);
      var status=athleticsEventStatus(event,eventId);
      return '<button type="button" class="athletics-event-chip athletics-event-chip--'+escapeAttr(status)+'" data-athletics-event="'+escapeAttr(eventId)+'">'+escapeHtml(event.name)+' <small>'+escapeHtml(event.years)+' · '+selected+' selected</small></button>';
    }).join('')+'</div></div>';
  }).join('');
  Array.prototype.forEach.call(interschoolAthleticsEventsEl.querySelectorAll('[data-athletics-event]'),function(btn){
    btn.addEventListener('click',function(){openAthleticsTeamModal(btn.dataset.athleticsEvent);});
  });
  renderAthleticsHelperCards();
}
```

- [ ] **Step 5: Run tests**

Run:

```powershell
npm test
```

Expected: FAIL only on modal filter behavior and missing styles.

---

### Task 4: Upgrade Modal Filtering And Pending Consent Behavior

**Files:**
- Modify: `admin-dashboard.js`

- [ ] **Step 1: Add division helpers**

Add near the athletics helpers:

```js
function divisionForStudent(student){
  var yearNumber=Number(String(student.year||'').match(/\d+/));
  if(yearNumber>=5){return 'Senior';}
  if(yearNumber>=3){return 'Intermediate';}
  if(yearNumber>=1){return 'Junior';}
  return '';
}

function studentMatchesAthleticsDivision(student,division){
  return !division||divisionForStudent(student)===division;
}
```

- [ ] **Step 2: Populate year filter on modal open**

Add:

```js
function populateAthleticsTeamYearFilter(){
  if(!athleticsTeamYearFilterEl){return;}
  var selected=athleticsTeamYearFilterEl.value;
  var years=Array.from(new Set(getStudents().map(function(student){return student.year;}).filter(Boolean))).sort();
  athleticsTeamYearFilterEl.innerHTML='<option value="">All years</option>'+years.map(function(year){return '<option value="'+escapeAttr(year)+'">'+escapeHtml(year)+'</option>';}).join('');
  if(selected&&years.indexOf(selected)!==-1){athleticsTeamYearFilterEl.value=selected;}
}
```

- [ ] **Step 3: Replace `renderAthleticsTeamModal` filtering**

Update the function so it uses:

```js
var year=athleticsTeamYearFilterEl&&athleticsTeamYearFilterEl.value||'';
var division=athleticsTeamDivisionFilterEl&&athleticsTeamDivisionFilterEl.value||'';
var showPending=!!(athleticsTeamShowPendingEl&&athleticsTeamShowPendingEl.checked);
var eligible=getStudents().filter(function(student){
  var consent=String(student.consent_status||'pending').toLowerCase();
  return consent==='granted'||(showPending&&consent==='pending');
});
var filtered=eligible.filter(function(student){
  return (!q||athleticsStudentSearchText(student).includes(q))&&
    (!year||student.year===year)&&
    studentMatchesAthleticsDivision(student,division);
});
```

When rendering each row, use:

```js
var consent=String(student.consent_status||'pending').toLowerCase();
var disabled=consent!=='granted';
var checked=!disabled&&selectedMap[student.id]?' checked':'';
return '<label class="athletics-team-student-option '+(disabled?'athletics-team-student-option--disabled':'')+'">'+
  '<input type="checkbox" class="athletics-team-student-check" value="'+escapeAttr(student.id)+'"'+checked+(disabled?' disabled':'')+' />'+
  '<span><strong>'+escapeHtml(student.name)+'</strong><small>'+escapeHtml(meta)+(disabled?' · consent pending':'')+'</small></span>'+
'</label>';
```

Update the summary to include selected, eligible, pending shown, and filtered counts.

- [ ] **Step 4: Add filter listeners**

After the existing search listener, add:

```js
if(athleticsTeamYearFilterEl){athleticsTeamYearFilterEl.addEventListener('change',renderAthleticsTeamModal);}
if(athleticsTeamDivisionFilterEl){athleticsTeamDivisionFilterEl.addEventListener('change',renderAthleticsTeamModal);}
if(athleticsTeamShowPendingEl){athleticsTeamShowPendingEl.addEventListener('change',renderAthleticsTeamModal);}
```

- [ ] **Step 5: Reset filters on modal open**

Inside `openAthleticsTeamModal`, call:

```js
populateAthleticsTeamYearFilter();
if(athleticsTeamYearFilterEl){athleticsTeamYearFilterEl.value='';}
if(athleticsTeamDivisionFilterEl){athleticsTeamDivisionFilterEl.value='';}
if(athleticsTeamShowPendingEl){athleticsTeamShowPendingEl.checked=false;}
```

- [ ] **Step 6: Run tests**

Run:

```powershell
npm test
```

Expected: FAIL only on missing CSS assertions if CSS has not been added yet.

---

### Task 5: Style The Command Centre And Modal Filters

**Files:**
- Modify: `styles.css`

- [ ] **Step 1: Add command centre and helper card styles**

Add near the athletics mode CSS:

```css
.athletics-command-centre {
  display: grid;
  gap: 0.9rem;
}

.athletics-helper-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
}

.athletics-helper-card {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.75rem;
  background: rgba(255,255,255,0.62);
}

.athletics-helper-card span,
.athletics-helper-card small {
  display: block;
  color: var(--muted);
  font-size: 0.78rem;
}

.athletics-helper-card strong {
  display: block;
  color: var(--obsidian-navy-3);
  font-size: 1.15rem;
  margin: 0.18rem 0;
}
```

- [ ] **Step 2: Add category slider styles**

Add:

```css
.athletics-category-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.athletics-category-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 40px;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(7,20,38,0.08);
  color: var(--obsidian-navy-3);
}

.athletics-category-toggle small {
  color: var(--muted);
  font-weight: 700;
}

.athletics-category-toggle.is-active {
  background: linear-gradient(180deg, rgba(255,248,221,0.98), rgba(242,216,145,0.88));
  border-color: rgba(201,151,34,0.58);
  color: #071426;
}
```

- [ ] **Step 3: Add status and disabled row styles**

Add:

```css
.athletics-event-chip--empty { opacity: 0.86; }
.athletics-event-chip--partial { border-color: rgba(159,199,247,0.78); }
.athletics-event-chip--ready { border-color: rgba(34,197,94,0.58); }

.athletics-team-student-option--disabled {
  opacity: 0.72;
  cursor: not-allowed;
}
```

- [ ] **Step 4: Add dark mode and responsive styles**

Add:

```css
html[data-theme="dark"] .athletics-helper-card,
html[data-theme="dark"] .athletics-category-toggle {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.16);
}

html[data-theme="dark"] .athletics-helper-card strong {
  color: #f5f9ff;
}

html[data-theme="dark"] .athletics-category-toggle {
  color: #d7e6fa;
}

html[data-theme="dark"] .athletics-category-toggle.is-active {
  color: #071426;
}

@media (max-width: 900px) {
  .athletics-helper-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .athletics-helper-cards {
    grid-template-columns: 1fr;
  }

  .athletics-category-toggle {
    width: 100%;
    justify-content: space-between;
  }
}
```

- [ ] **Step 5: Run tests**

Run:

```powershell
npm test
```

Expected: PASS.

---

### Task 6: Cache Bump, Browser QA, And Commit

**Files:**
- Modify: `admin-dashboard.html`
- Modify: `admin.html`
- Modify: `index.html`
- Modify: `leaderboard.html`
- Modify: `parent.html`
- Modify: `privacy-policy.html`
- Modify: `student.html`
- Modify: `student-profile.html`
- Modify: `interschool-team.html`
- Modify: `kiosk.html`
- Modify: `src/kiosk/kiosk.html`
- Modify: `service-worker.js`
- Modify: `tests/portal-smoke.test.js`

- [ ] **Step 1: Bump static asset versions**

Replace:

```text
styles.css?v=65
```

with:

```text
styles.css?v=66
```

If `admin-dashboard.js` changed, replace:

```text
admin-dashboard.js?v=43
```

with:

```text
admin-dashboard.js?v=44
```

Replace the service worker cache:

```js
var CACHE_NAME = 'gwynne-park-run-club-v97';
```

with:

```js
var CACHE_NAME = 'gwynne-park-run-club-v98';
```

Update matching test assertions.

- [ ] **Step 2: Run final automated checks**

Run:

```powershell
npm test
rg -n "styles\\.css\\?v=65|admin-dashboard\\.js\\?v=43|gwynne-park-run-club-v97" -S .
```

Expected: tests pass and stale scan returns no matches.

- [ ] **Step 3: Browser QA**

Open:

```text
http://127.0.0.1:8080/admin-dashboard.html?tab=students&qa=command-centre
```

Check:

- Interschool Athletics Mode expands the command centre.
- Category sliders open and close event groups.
- Helper cards do not hover-highlight.
- Event chips show selected counts and status.
- Modal opens, filters by search/year/division, and pending toggle shows disabled pending rows.
- No horizontal overflow at desktop width.
- No horizontal overflow at phone width.

- [ ] **Step 4: Commit and push**

Run:

```powershell
git status --short
git add admin-dashboard.html admin-dashboard.js admin.html index.html interschool-team.html kiosk.html leaderboard.html parent.html privacy-policy.html service-worker.js src/kiosk/kiosk.html student-profile.html student.html styles.css tests/portal-smoke.test.js
git commit -m "Build interschool athletics command centre"
git push origin main
```

Expected: commit pushes to `main`.
