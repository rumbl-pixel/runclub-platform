// src/backend/backend.js
// Priority 3 backend adapter for Supabase-ready data access and offline sync.
// This file is browser-safe: public anon keys only, no private server credentials.
(function (global) {
  'use strict';

  var CONFIG = global.RUN_CLUB_CONFIG || {};
  var QUEUE_KEY = 'rc_backend_mutation_queue';
  var SYNC_LOG_KEY = 'rc_backend_sync_log';

  var TABLES = {
    students: 'students',
    runSessions: 'run_sessions',
    lapEntries: 'lap_entries',
    scanAuditLogs: 'scan_audit_logs',
    leaderboardTotals: 'leaderboard_totals',
    studentProgressSummary: 'student_progress_summary',
    backupExports: 'backup_exports',
    demoDataImports: 'demo_data_imports'
  };

  function localLoad(key, fallback) {
    try {
      var raw = global.localStorage && global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function localSave(key, value) {
    if (global.localStorage) {
      global.localStorage.setItem(key, JSON.stringify(value));
    }
  }

  function config() {
    return {
      demoMode: CONFIG.demoMode !== false,
      syncEnabled: CONFIG.syncEnabled === true,
      liveDataMode: CONFIG.liveDataMode === true,
      schoolId: CONFIG.schoolId || '',
      supabaseUrl: String(CONFIG.supabaseUrl || '').replace(/\/+$/, ''),
      supabaseAnonKey: CONFIG.supabaseAnonKey || '',
      endpoints: CONFIG.endpoints || {}
    };
  }

  function isConfigured() {
    var c = config();
    return !!(c.syncEnabled && c.schoolId && c.supabaseUrl && c.supabaseAnonKey);
  }

  function backendReadiness() {
    var c = config();
    var blockers = [];
    if (c.demoMode) { blockers.push('demo-mode-enabled'); }
    if (!c.syncEnabled) { blockers.push('sync-disabled'); }
    if (!c.schoolId) { blockers.push('missing-school-id'); }
    if (!c.supabaseUrl) { blockers.push('missing-supabase-url'); }
    if (!c.supabaseAnonKey) { blockers.push('missing-supabase-anon-key'); }

    var configured = isConfigured();
    var ready = configured && blockers.length === 0;
    var mode = 'backend-ready';
    if (c.demoMode) {
      mode = 'demo-local-storage';
    } else if (!c.syncEnabled) {
      mode = 'local-storage-sync-disabled';
    } else if (!configured) {
      mode = 'backend-incomplete';
    }

    return {
      ready: ready,
      configured: configured,
      mode: mode,
      realDataAllowed: ready && c.liveDataMode,
      liveDataMode: c.liveDataMode,
      blockers: blockers,
      schoolId: c.schoolId,
      supabaseUrl: c.supabaseUrl
    };
  }

  function requiresLiveBackend() {
    var readiness = backendReadiness();
    if (readiness.realDataAllowed) {
      return { ok: true, readiness: readiness, message: 'Live backend is ready for real student data.' };
    }
    return {
      ok: false,
      readiness: readiness,
      message: 'Do not enter real student data until Priority 0 is complete and live data mode is enabled.'
    };
  }

  function tableUrl(table, query) {
    var c = config();
    return c.supabaseUrl + '/rest/v1/' + table + (query ? '?' + query : '');
  }

  function rpcUrl(name) {
    return config().supabaseUrl + '/rest/v1/rpc/' + name;
  }

  function edgeAlias(name) {
    return String(name || '').replace(/_([a-z])/g, function (_, letter) { return letter.toUpperCase(); });
  }

  function edgeFunctionUrl(name) {
    var c = config();
    var endpoints = c.endpoints || {};
    var alias = edgeAlias(name);
    var configured = endpoints[name] || endpoints[alias];
    if (configured) {
      return String(configured).replace(/\/+$/, '');
    }
    return c.supabaseUrl + '/functions/v1/' + name;
  }

  function headers(extra) {
    var c = config();
    return Object.assign({
      apikey: c.supabaseAnonKey,
      Authorization: 'Bearer ' + c.supabaseAnonKey,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }, extra || {});
  }

  function classifySyncError(status, text) {
    if (status === 409 || /duplicate|unique|idempotency/i.test(text || '')) {
      return 'conflict';
    }
    if (status === 401 || status === 403) {
      return 'auth';
    }
    if (status >= 500) {
      return 'server';
    }
    return 'error';
  }

  function request(method, table, body, query, extraHeaders) {
    if (!isConfigured()) {
      return Promise.resolve({ ok: false, skipped: true, reason: 'backend-not-configured' });
    }
    return global.fetch(tableUrl(table, query), {
      method: method,
      headers: headers(extraHeaders),
      body: body == null ? undefined : JSON.stringify(body)
    }).then(function (response) {
      return response.text().then(function (text) {
        var data = text ? JSON.parse(text) : null;
        if (!response.ok) {
          return { ok: false, status: response.status, kind: classifySyncError(response.status, text), error: text || response.statusText };
        }
        return { ok: true, status: response.status, data: data };
      });
    }).catch(function (error) {
      return { ok: false, kind: 'network', error: error && error.message ? error.message : String(error) };
    });
  }

  function callEdgeFunction(name, payload, options) {
    options = options || {};
    if (!isConfigured()) {
      return Promise.resolve({ ok: false, skipped: true, reason: 'backend-not-configured' });
    }
    var c = config();
    var body = Object.assign({ school_id: c.schoolId }, payload || {});
    return global.fetch(edgeFunctionUrl(name), {
      method: options.method || 'POST',
      headers: headers(Object.assign({ 'X-School-Id': c.schoolId }, options.headers || {})),
      body: JSON.stringify(body)
    }).then(function (response) {
      return response.text().then(function (text) {
        var data = text ? JSON.parse(text) : null;
        if (!response.ok) {
          return { ok: false, status: response.status, kind: classifySyncError(response.status, text), error: text || response.statusText };
        }
        return { ok: true, status: response.status, data: data };
      });
    }).catch(function (error) {
      return { ok: false, kind: 'network', error: error && error.message ? error.message : String(error) };
    });
  }

  function callRpc(name, payload, options) {
    options = options || {};
    if (!isConfigured()) {
      return Promise.resolve({ ok: false, skipped: true, reason: 'backend-not-configured' });
    }
    return global.fetch(rpcUrl(name), {
      method: options.method || 'POST',
      headers: headers(options.headers),
      body: JSON.stringify(payload || {})
    }).then(function (response) {
      return response.text().then(function (text) {
        var data = text ? JSON.parse(text) : null;
        if (!response.ok) {
          return { ok: false, status: response.status, kind: classifySyncError(response.status, text), error: text || response.statusText };
        }
        return { ok: true, status: response.status, data: data };
      });
    }).catch(function (error) {
      return { ok: false, kind: 'network', error: error && error.message ? error.message : String(error) };
    });
  }

  function makeIdempotencyKey(parts) {
    parts = Array.isArray(parts) ? parts : [parts];
    var clean = parts.map(function (part) { return String(part == null ? '' : part).trim().toLowerCase(); }).join('|');
    var hash = 0;
    for (var i = 0; i < clean.length; i += 1) {
      hash = ((hash << 5) - hash + clean.charCodeAt(i)) | 0;
    }
    return 'idem-' + Math.abs(hash) + '-' + clean.length;
  }

  function queue() {
    return localLoad(QUEUE_KEY, []);
  }

  function saveQueue(rows) {
    localSave(QUEUE_KEY, rows.slice(-2000));
  }

  function enqueueMutation(type, payload, options) {
    options = options || {};
    var idempotencyKey = options.idempotency_key || options.idempotencyKey || payload.idempotency_key || makeIdempotencyKey([type, payload.student_id, payload.barcode, payload.scanned_at || payload.time || Date.now()]);
    var row = {
      id: 'mutation-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      type: type,
      table: options.table || type,
      idempotency_key: idempotencyKey,
      payload: Object.assign({}, payload, { idempotency_key: idempotencyKey }),
      status: 'queued',
      attempts: 0,
      created_at: new Date().toISOString()
    };
    var rows = queue();
    rows.push(row);
    saveQueue(rows);
    return row;
  }

  function syncOfflineQueue() {
    var rows = queue();
    if (!isConfigured()) {
      return Promise.resolve({ ok: false, skipped: true, reason: 'backend-not-configured', queued: rows.length });
    }
    var chain = Promise.resolve([]);
    rows.forEach(function (item) {
      chain = chain.then(function (results) {
        if (item.status === 'synced' || item.status === 'conflict') {
          results.push(item);
          return results;
        }
        item.status = 'syncing';
        item.attempts = (item.attempts || 0) + 1;
        return request('POST', item.table, item.payload).then(function (result) {
          if (result.ok) {
            item.status = 'synced';
            item.synced_at = new Date().toISOString();
          } else if (result.kind === 'conflict') {
            item.status = 'conflict';
            item.conflict = true;
            item.error = result.error || 'Conflict while syncing';
          } else {
            item.status = 'failed';
            item.error = result.error || result.reason || 'Sync failed';
          }
          results.push(item);
          return results;
        });
      });
    });
    return chain.then(function (updated) {
      saveQueue(updated);
      localSave(SYNC_LOG_KEY, localLoad(SYNC_LOG_KEY, []).concat([{ time: new Date().toISOString(), count: updated.length }]).slice(-200));
      return { ok: true, queued: updated.length, rows: updated };
    });
  }

  function mapRemoteStudent(row) {
    return {
      id: row.id,
      barcode: row.barcode,
      first: row.first_name,
      last: row.last_name,
      name: (row.preferred_name || (row.first_name + ' ' + row.last_name)).trim(),
      year: row.year_group,
      cls: row.class_name,
      house: row.house || '',
      team: row.team || '',
      pseudonym: row.pseudonym || '',
      preferred_name: row.preferred_name || '',
      consent_status: row.consent_status || 'pending',
      hide_public_name: row.hide_public_name === true,
      share_certificates_publicly: row.share_certificates_publicly === true,
      laps: Number(row.lap_count || row.laps || 0),
      minutes: Number(row.minutes || 0),
      events: []
    };
  }

  function studentPayload(student) {
    var c = config();
    return {
      school_id: c.schoolId,
      barcode: student.barcode || student.id,
      first_name: student.first || '',
      last_name: student.last || '',
      preferred_name: student.pseudonym || student.preferred_name || student.name || '',
      year_group: student.year || '',
      class_name: student.cls || '',
      house: student.house || '',
      team: student.team || '',
      pseudonym: student.pseudonym || '',
      consent_status: student.consent_status || 'pending',
      hide_public_name: student.hide_public_name === true,
      share_certificates_publicly: student.share_certificates_publicly === true,
      active: true
    };
  }

  var backendDataAccess = {
    getStudents: function (fallback) {
      if (!isConfigured()) {
        return Promise.resolve(fallback || localLoad('rc_students', []));
      }
      return request('GET', TABLES.students, null, 'school_id=eq.' + encodeURIComponent(config().schoolId) + '&active=eq.true&order=class_name.asc,last_name.asc')
        .then(function (result) {
          return result.ok ? result.data.map(mapRemoteStudent) : (fallback || localLoad('rc_students', []));
        });
    },
    upsertStudent: function (student) {
      return request('POST', TABLES.students, studentPayload(student), 'on_conflict=school_id,barcode', { Prefer: 'resolution=merge-duplicates,return=representation' });
    },
    upsertStudentsBatch: function (students) {
      var rows = (students || []).map(studentPayload);
      if (!rows.length) {
        return Promise.resolve({ ok: true, data: [], skipped: true });
      }
      return request('POST', TABLES.students, rows, 'on_conflict=school_id,barcode', { Prefer: 'resolution=merge-duplicates,return=representation' });
    },
    deleteStudent: function (student) {
      var barcode = student && (student.barcode || student.id);
      if (!barcode) {
        return Promise.resolve({ ok: false, kind: 'validation', error: 'Missing student barcode' });
      }
      return request('PATCH', TABLES.students, { active: false }, 'school_id=eq.' + encodeURIComponent(config().schoolId) + '&barcode=eq.' + encodeURIComponent(barcode), { Prefer: 'return=representation' });
    },
    createRunSession: function (session) {
      return request('POST', TABLES.runSessions, {
        school_id: config().schoolId,
        session_type: session.session_type || session.type || 'Run Club',
        notes: session.notes || '',
        lap_distance_km: session.lap_distance_km || 0.25,
        device_id: session.device_id || null
      }, null, { Prefer: 'return=representation' });
    },
    finishRunSession: function (session) {
      if (!session || !session.id) {
        return Promise.resolve({ ok: false, kind: 'validation', error: 'Missing run session id' });
      }
      return request('PATCH', TABLES.runSessions, {
        finished_at: session.finished_at || new Date().toISOString()
      }, 'school_id=eq.' + encodeURIComponent(config().schoolId) + '&id=eq.' + encodeURIComponent(session.id), { Prefer: 'return=representation' });
    },
    recordLapScan: function (scan) {
      var c = config();
      return callRpc('record_lap_scan', {
        p_school_id: c.schoolId,
        p_student_id: scan.student_id,
        p_session_id: scan.session_id || null,
        p_device_id: scan.device_id || null,
        p_idempotency_key: scan.idempotency_key,
        p_lap_distance_km: scan.lap_distance_km,
        p_source: scan.source || 'scanner',
        p_barcode: scan.barcode || '',
        p_metadata: scan.metadata || {}
      });
    },
    recordScanUndo: function (scan) {
      var c = config();
      return callRpc('record_scan_undo', {
        p_school_id: c.schoolId,
        p_idempotency_key: scan.idempotency_key,
        p_barcode: scan.barcode || '',
        p_reason: scan.reason || 'Undo last scan',
        p_source: scan.source || 'admin-dashboard',
        p_metadata: scan.metadata || {}
      });
    },
    recordManualAdjustment: function (adjustment) {
      var c = config();
      return callRpc('record_manual_adjustment', {
        p_school_id: c.schoolId,
        p_student_id: adjustment.student_id || null,
        p_barcode: adjustment.barcode || '',
        p_delta_laps: adjustment.delta_laps,
        p_reason: adjustment.reason || '',
        p_staff: adjustment.staff || '',
        p_lap_distance_km: adjustment.lap_distance_km || 0.25,
        p_metadata: adjustment.metadata || {}
      });
    },
    leaderboardTotals: function () {
      if (!isConfigured()) { return Promise.resolve(localLoad('rc_students', [])); }
      return request('GET', TABLES.leaderboardTotals, null, 'school_id=eq.' + encodeURIComponent(config().schoolId) + '&order=total_laps.desc')
        .then(function (result) {
          if (!result.ok) { return []; }
          return (result.data || []).map(function (row) {
            return {
              id: row.student_id,
              barcode: row.barcode,
              name: row.student_name,
              year: row.year_group,
              cls: row.class_name,
              laps: Number(row.total_laps || 0),
              total_km: Number(row.total_km || 0),
              last_scanned_at: row.last_scanned_at
            };
          });
        });
    },
    studentProgressSummary: function () {
      if (!isConfigured()) { return Promise.resolve([]); }
      return request('GET', TABLES.studentProgressSummary, null, 'school_id=eq.' + encodeURIComponent(config().schoolId));
    }
  };

  function migrationPayloadFromLocalStorage() {
    return {
      exported_at: new Date().toISOString(),
      school_id: config().schoolId || 'demo-school',
      students: localLoad('rc_students', []),
      scan_audit: localLoad('rc_scan_audit', []),
      sessions: localLoad('rc_sessions', []),
      goals: localLoad('rc_goals', {}),
      training: localLoad('rc_training', []),
      training_clicks: localLoad('rc_training_clicks', []),
      adjustments: localLoad('rc_adjustments', [])
    };
  }

  function backupExportPayload() {
    return Object.assign({ backup_kind: 'browser-export' }, migrationPayloadFromLocalStorage(), {
      queued_mutations: queue(),
      sync_log: localLoad(SYNC_LOG_KEY, [])
    });
  }

  function liveStyleSupabaseCheck(options) {
    options = options || {};
    if (!isConfigured()) {
      return Promise.resolve({ ok: false, skipped: true, reason: 'backend-not-configured' });
    }
    var restCheck = request('GET', TABLES.students, null, 'school_id=eq.' + encodeURIComponent(config().schoolId) + '&active=eq.true&limit=1')
      .then(function (result) {
        return {
          ok: result.ok,
          status: result.status,
          count: Array.isArray(result.data) ? result.data.length : 0,
          error: result.error
        };
      });
    var edgeCheck = callEdgeFunction(options.edgeFunction || 'student_auth', {
      code: options.studentCode || options.code || 'DEMO-CHECK',
      dry_run: true
    });
    return Promise.all([restCheck, edgeCheck]).then(function (results) {
      return {
        ok: !!(results[0].ok && results[1].ok),
        rest: results[0],
        edge: results[1]
      };
    });
  }

  global.RunClubBackend = {
    TABLES: TABLES,
    config: config,
    isConfigured: isConfigured,
    backendReadiness: backendReadiness,
    requiresLiveBackend: requiresLiveBackend,
    backendDataAccess: backendDataAccess,
    edgeFunctionUrl: edgeFunctionUrl,
    callEdgeFunction: callEdgeFunction,
    callRpc: callRpc,
    liveStyleSupabaseCheck: liveStyleSupabaseCheck,
    makeIdempotencyKey: makeIdempotencyKey,
    enqueueMutation: enqueueMutation,
    syncOfflineQueue: syncOfflineQueue,
    migrationPayloadFromLocalStorage: migrationPayloadFromLocalStorage,
    backupExportPayload: backupExportPayload,
    _localLoad: localLoad,
    _localSave: localSave
  };
})(window);
