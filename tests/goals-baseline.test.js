const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createLocalStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
}

const localStorage = createLocalStorage();
const window = { localStorage };
const context = {
  window,
  localStorage,
  console,
  Date,
  Math,
  JSON,
  String,
  Number
};

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'scanning.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'goals.js'), 'utf8'), context);

const Scan = context.window.RunClubScan;
const Goals = context.window.RunClubGoals;
const studentId = 'STUDENT1';

let visibleMetrics = Goals.visibleMetrics();
assert(visibleMetrics.map((metric) => metric.key).join(',') === 'laps,time,distance', 'default visible metrics should be laps, lap time, and distance only');
assert(Goals.metricInfo('time').label === 'Lap Time', 'time metric should be labelled Lap Time');
assert(Goals.isInterschoolAthleticsMode() === false, 'interschool athletics mode should be off by default');
assert(Array.isArray(Goals.INTERSCHOOL_ATHLETICS_EVENTS), 'interschool athletics event catalogue should be available');
assert(Goals.INTERSCHOOL_ATHLETICS_EVENTS.some((event) => event.name === 'Tunnel Ball'), 'event catalogue should include tunnel ball');
assert(Goals.INTERSCHOOL_ATHLETICS_EVENTS.some((event) => event.name === 'Leader Ball'), 'event catalogue should include leader ball');
assert(Goals.INTERSCHOOL_ATHLETICS_EVENTS.some((event) => event.name === 'Pass Ball'), 'event catalogue should include pass ball');
assert(Goals.INTERSCHOOL_ATHLETICS_EVENTS.some((event) => event.name === 'Junior 100m'), 'event catalogue should include junior middle-distance 100m');
assert(Goals.INTERSCHOOL_ATHLETICS_EVENTS.some((event) => event.name === 'Intermediate 200m'), 'event catalogue should include intermediate middle-distance 200m');
assert(Goals.INTERSCHOOL_ATHLETICS_EVENTS.some((event) => event.name === 'Senior 400m'), 'event catalogue should include senior middle-distance 400m');
assert(Goals.INTERSCHOOL_ATHLETICS_EVENTS.some((event) => event.name === 'Baton Relay'), 'event catalogue should include baton relay');
assert(Goals.INTERSCHOOL_ATHLETICS_EVENTS.some((event) => event.name === 'Vortex Throw'), 'event catalogue should include vortex throw');
assert(!Goals.INTERSCHOOL_ATHLETICS_EVENTS.some((event) => event.name === 'Flag Relay' || event.name === '800m'), 'event catalogue should remove retired relay and 800m defaults');

Goals.setInterschoolAthleticsMode(true);
visibleMetrics = Goals.visibleMetrics();
assert(visibleMetrics.some((metric) => metric.key === 'jump'), 'interschool athletics mode should reveal jump metric');
assert(visibleMetrics.some((metric) => metric.key === 'throw'), 'interschool athletics mode should reveal throw metric');
assert(visibleMetrics.some((metric) => metric.key === 'length'), 'interschool athletics mode should reveal length metric');
assert(visibleMetrics.some((metric) => metric.key === 'run'), 'interschool athletics mode should reveal run metric');

Goals.setInterschoolAthleticsMode(false);
visibleMetrics = Goals.visibleMetrics();
assert(!visibleMetrics.some((metric) => metric.key === 'jump'), 'jump metric should be hidden when interschool athletics mode is off');

const initialStudent = Scan.getStudents().find((student) => student.id === studentId);
assert(initialStudent.laps === 12, 'test expects demo STUDENT1 to start with 12 laps');

const lapsGoal = Goals.addGoal(studentId, 'coach', {
  metric: 'laps',
  target: 1,
  title: 'Next run session lap'
});

let progress = Goals.progress(studentId, lapsGoal);
assert(progress.current === 0, 'new laps goal should start from 0 after-goal laps');
assert(progress.met === false, 'new laps goal should not complete from existing lifetime laps');

Scan.logLap(studentId, { duplicateWindowMs: 0 });
progress = Goals.progress(studentId, lapsGoal);
assert(progress.current === 1, 'laps goal should progress after a later scan is logged');
assert(progress.met === true, 'laps goal should complete after the next logged lap reaches target');

const distanceGoal = Goals.addGoal(studentId, 'student', {
  metric: 'distance',
  target: 0.25,
  title: 'Next lap distance'
});

progress = Goals.progress(studentId, distanceGoal);
assert(progress.current === 0, 'new distance goal should start from 0 after-goal km');
assert(progress.met === false, 'new distance goal should not complete from existing lifetime distance');

Scan.logLap(studentId, { duplicateWindowMs: 0 });
progress = Goals.progress(studentId, distanceGoal);
assert(progress.current === 0.25, 'distance goal should progress after a later lap is logged');
assert(progress.met === true, 'distance goal should complete after a later lap reaches target');

localStorage.setItem('rc_goals', JSON.stringify({
  STUDENT2: [{
    id: 'legacy-goal',
    owner: 'student',
    metric: 'laps',
    unit: 'laps',
    title: 'Legacy one lap goal',
    target: 1,
    deadline: null,
    best: null,
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  }]
}));

const legacyGoal = Goals.goalsFor('STUDENT2')[0];
progress = Goals.progress('STUDENT2', legacyGoal);
assert(progress.current === 0, 'legacy cumulative goals should be baselined when read');
assert(progress.met === false, 'legacy cumulative goals should not complete from lifetime laps');

Scan.logLap('STUDENT2', { duplicateWindowMs: 0 });
progress = Goals.progress('STUDENT2', Goals.goalsFor('STUDENT2')[0]);
assert(progress.current === 1, 'legacy cumulative goals should progress after a later scan');
assert(progress.met === true, 'legacy cumulative goals should complete after a later scan reaches target');

console.log('goal baseline checks passed');
