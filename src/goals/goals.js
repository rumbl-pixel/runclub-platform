// src/goals/goals.js
// Shared goals logic for the Run Club platform.
//   - Student goals: owner = 'student', editable by the student.
//   - Coach goals:   owner = 'coach',   read-only to students, editable by coaches.
// Stored per-student under localStorage key rc_goals.
// Reuses window.RunClubScan for laps-based auto-progress.
//
// Exposes a single global: window.RunClubGoals
(function (global) {
  'use strict';

  var Scan = global.RunClubScan;
  var STORE = 'rc_goals';
  var SETTINGS_STORE = 'rc_goal_settings';
  var BASE_METRICS = ['laps', 'time', 'distance'];
  var INTERSCHOOL_ATHLETICS_EVENTS = [
    { group: 'Sprints', name: 'Junior 50m', metric: 'time', years: 'Junior' },
    { group: 'Sprints', name: 'Intermediate 75m', metric: 'time', years: 'Intermediate' },
    { group: 'Sprints', name: 'Senior 100m', metric: 'time', years: 'Senior' },
    { group: 'Middle Distance', name: 'Junior 100m', metric: 'time', years: 'Junior' },
    { group: 'Middle Distance', name: 'Intermediate 200m', metric: 'time', years: 'Intermediate' },
    { group: 'Middle Distance', name: 'Senior 400m', metric: 'time', years: 'Senior' },
    { group: 'Ball Games', name: 'Tunnel Ball', metric: 'team-time', years: 'All' },
    { group: 'Ball Games', name: 'Leader Ball', metric: 'team-time', years: 'All' },
    { group: 'Ball Games', name: 'Pass Ball', metric: 'team-time', years: 'All' },
    { group: 'Relays', name: 'Baton Relay', metric: 'team-time', years: 'All' },
    { group: 'Jumps', name: 'Long Jump', metric: 'distance', years: 'All' },
    { group: 'Throws', name: 'Vortex Throw', metric: 'distance', years: 'All' }
  ];

  // --- Metric catalogue -----------------------------------------------------
  // kind: 'cumulative' (fills up toward target, auto-tracked from laps)
  //       'pb-high'     (higher is better — jump/throw/length)
  //       'pb-low'      (lower is better — time)
  var METRICS = {
    laps:     { label: 'Laps',          unit: 'laps', kind: 'cumulative', auto: true },
    time:     { label: 'Lap Time',      unit: 's',    kind: 'pb-low',     auto: false },
    distance: { label: 'Distance',      unit: 'km',   kind: 'cumulative', auto: true },
    jump:     { label: 'Jump (PB)',     unit: 'm',    kind: 'pb-high',    auto: false },
    throw:    { label: 'Throw (PB)',    unit: 'm',    kind: 'pb-high',    auto: false },
    length:   { label: 'Length (PB)',   unit: 'm',    kind: 'pb-high',    auto: false },
    run:      { label: 'Run / sprint (PB)', unit: 's', kind: 'pb-low',    auto: false }
  };

  function metricInfo(metric) { return METRICS[metric] || METRICS.laps; }

  function loadSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_STORE);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_STORE, JSON.stringify(settings));
  }

  function isInterschoolAthleticsMode() {
    var settings = loadSettings();
    return settings.interschoolAthleticsMode === true || settings.sportsCarnivalMode === true;
  }

  function setInterschoolAthleticsMode(enabled) {
    var settings = loadSettings();
    settings.interschoolAthleticsMode = enabled === true;
    settings.sportsCarnivalMode = enabled === true;
    saveSettings(settings);
  }

  function isSportsCarnivalMode() {
    return isInterschoolAthleticsMode();
  }

  function setSportsCarnivalMode(enabled) {
    setInterschoolAthleticsMode(enabled);
  }

  function isMetricVisible(metric) {
    return isInterschoolAthleticsMode() || BASE_METRICS.indexOf(metric) !== -1;
  }

  function visibleMetrics() {
    return Object.keys(METRICS)
      .filter(isMetricVisible)
      .map(function (key) {
        return Object.assign({ key: key }, METRICS[key]);
      });
  }

  // --- Storage --------------------------------------------------------------
  function loadAll() {
    try { var r = localStorage.getItem(STORE); return r ? JSON.parse(r) : {}; }
    catch (e) { return {}; }
  }
  function saveAll(obj) { localStorage.setItem(STORE, JSON.stringify(obj)); }

  function goalsFor(studentId) {
    var all = loadAll();
    var goals = (all[studentId] || []).slice();
    var changed = false;
    goals.forEach(function (goal) {
      var m = metricInfo(goal.metric);
      if (m.kind === 'cumulative' && goal.baseline == null) {
        goal.baseline = currentCumulativeValue(studentId, goal.metric);
        changed = true;
      }
    });
    if (changed) {
      all[studentId] = goals;
      saveAll(all);
    }
    return goals;
  }
  function setGoalsFor(studentId, goals) {
    var all = loadAll();
    all[studentId] = goals;
    saveAll(all);
  }

  function uid() { return 'g-' + Date.now() + '-' + Math.floor(Math.random() * 1000); }

  function currentCumulativeValue(studentId, metric) {
    var student = Scan.getStudents().find(function (s) { return s.id === studentId; });
    if (!student) { return 0; }
    return metric === 'distance' ? Scan.totalKm(student) : student.laps;
  }

  // --- CRUD -----------------------------------------------------------------
  // goal = { metric, target (number), deadline (optional), title (optional) }
  function addGoal(studentId, owner, goal) {
    var m = metricInfo(goal.metric);
    var baseline = m.kind === 'cumulative'
      ? currentCumulativeValue(studentId, goal.metric)
      : null;
    var g = {
      id: uid(),
      owner: owner === 'coach' ? 'coach' : 'student',
      metric: goal.metric,
      unit: m.unit,
      title: goal.title || (m.label + ' goal'),
      target: Number(goal.target),
      baseline: baseline,
      deadline: goal.deadline || null,
      best: null,          // best logged result (PB metrics)
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    var goals = goalsFor(studentId);
    goals.push(g);
    setGoalsFor(studentId, goals);
    return g;
  }

  function updateGoal(studentId, goalId, patch) {
    var goals = goalsFor(studentId);
    var g = goals.find(function (x) { return x.id === goalId; });
    if (!g) { return null; }
    Object.keys(patch).forEach(function (k) { g[k] = patch[k]; });
    g.updated = new Date().toISOString();
    setGoalsFor(studentId, goals);
    return g;
  }

  function deleteGoal(studentId, goalId) {
    setGoalsFor(studentId, goalsFor(studentId).filter(function (g) { return g.id !== goalId; }));
  }

  // Log a result for a PB metric — stores only if it's a new best.
  function logResult(studentId, goalId, value) {
    var goals = goalsFor(studentId);
    var g = goals.find(function (x) { return x.id === goalId; });
    if (!g) { return null; }
    var v = Number(value);
    var m = metricInfo(g.metric);
    if (g.best == null) { g.best = v; }
    else if (m.kind === 'pb-low' && v < g.best) { g.best = v; }
    else if (m.kind === 'pb-high' && v > g.best) { g.best = v; }
    g.updated = new Date().toISOString();
    setGoalsFor(studentId, goals);
    return g;
  }

  // --- Progress -------------------------------------------------------------
  // Returns { current, target, percent (0-100), met (bool), label }.
  function progress(studentId, goal) {
    var m = metricInfo(goal.metric);
    var current = 0;

    if (m.kind === 'cumulative') {
      current = currentCumulativeValue(studentId, goal.metric) - (Number(goal.baseline) || 0);
      current = Math.max(0, current);
      var pct = goal.target > 0 ? Math.min(100, (current / goal.target) * 100) : 0;
      return { current: +current.toFixed(2), target: goal.target, percent: Math.round(pct), met: current >= goal.target, label: m.label };
    }

    // PB metrics use the best logged result.
    current = goal.best;
    if (current == null) {
      return { current: null, target: goal.target, percent: 0, met: false, label: m.label };
    }
    var met, percent;
    if (m.kind === 'pb-low') {            // faster is better
      met = current <= goal.target;
      // progress: how close are we, from a generous 2x-target start point
      percent = Math.max(0, Math.min(100, Math.round(((2 * goal.target - current) / goal.target) * 100)));
    } else {                              // pb-high: bigger is better
      met = current >= goal.target;
      percent = goal.target > 0 ? Math.min(100, Math.round((current / goal.target) * 100)) : 0;
    }
    return { current: current, target: goal.target, percent: percent, met: met, label: m.label };
  }

  global.RunClubGoals = {
    METRICS: METRICS,
    INTERSCHOOL_ATHLETICS_EVENTS: INTERSCHOOL_ATHLETICS_EVENTS,
    metricInfo: metricInfo,
    visibleMetrics: visibleMetrics,
    isMetricVisible: isMetricVisible,
    isInterschoolAthleticsMode: isInterschoolAthleticsMode,
    setInterschoolAthleticsMode: setInterschoolAthleticsMode,
    isSportsCarnivalMode: isSportsCarnivalMode,
    setSportsCarnivalMode: setSportsCarnivalMode,
    goalsFor: goalsFor,
    addGoal: addGoal,
    updateGoal: updateGoal,
    deleteGoal: deleteGoal,
    logResult: logResult,
    progress: progress
  };
})(window);
