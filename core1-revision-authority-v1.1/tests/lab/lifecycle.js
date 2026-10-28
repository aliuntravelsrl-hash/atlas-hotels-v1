'use strict';
// RA-R3 — ciclo de vida y limpieza de la instancia PostgreSQL PROPIA del laboratorio (RA-1 v1.1). Lógica pura con dependencias inyectadas (probada en tests/run_lifecycle_tests.js).
// Principio: una parada DESCONOCIDA no es una parada CONFIRMADA. Solo se borra el directorio si (a) nunca se intentó arrancar, o (b) el PID de la instancia propia fue ACREDITADO
// (leído de su postmaster.pid, entero > 1 y /proc/<pid>/cmdline contiene su propio directorio de datos) y se observó que dejó de existir. Cualquier otro caso RETIENE el directorio y
// declara STOP/cleanup pendiente (exit 5). Nunca se busca ni se mata por nombre/patrón; solo `pg_ctl -D <directorio propio>` y lectura de /proc/<pid> del PID acreditado.
const path = require('path');
const EXIT_CLEANUP_PENDING = 5;

// Tras un intento de arranque (haya devuelto éxito o no): acreditar el PID propio. Devuelve {pid, accredited, reason}.
function accreditPid(state, deps) {
  let txt; try { txt = deps.readFile(path.join(state.dataDir, 'postmaster.pid')); } catch (_) { return { pid: null, accredited: false, reason: 'PID_READ_FAILED' }; }
  const pid = Number(String(txt).split('\n')[0]);
  if (!Number.isInteger(pid) || pid <= 1) return { pid: null, accredited: false, reason: 'PID_INVALID' };
  const cmd = deps.cmdline(pid);
  if (cmd === null || cmd === undefined || !String(cmd).includes(state.dataDir)) return { pid, accredited: false, reason: 'PID_NOT_OWN_INSTANCE' };
  return { pid, accredited: true, reason: null };
}

// Sondeo tri-estado: false = ya no existe (ausente o zombi); true = sigue vivo tras agotar el tiempo; null = no se pudo determinar.
function aliveAfterStop(pid, deps, tries = 50) {
  for (let i = 0; i < tries; i++) {
    const st = deps.procState(pid);
    if (st === 'GONE' || st === 'ZOMBIE') return false;
    if (st === 'UNKNOWN') return null;
    deps.sleep(200);
  }
  return true;
}

// state: { dir, dataDir, markerPath, safePrefix, startAttempted, startStatus, acc }
// deps:  { run(cmd,args)->{status}, readFile, cmdline, procState, sleep, exists, rmDir }
function finalizeCleanup(state, deps) {
  const ev = { start_attempted: !!state.startAttempted, pid_accredited: !!(state.acc && state.acc.accredited), pid_reason: state.acc ? state.acc.reason : null, stop_attempted: false, stop_status: null, pid_alive_after_stop: null, stop_confirmed: false, cleanup_status: null, lab_dir_removed: false, retained_dir: null };
  const stopOwn = () => { ev.stop_attempted = true; const r = deps.run('pg_ctl', ['-D', state.dataDir, '-m', 'fast', '-w', 'stop']); ev.stop_status = r.status; };   // solo la instancia propia, por su directorio de datos
  let removable = false;
  if (!state.startAttempted) { ev.cleanup_status = 'NOT_STARTED_REMOVABLE'; removable = true; }
  else if (state.acc && state.acc.accredited) {
    stopOwn(); ev.pid_alive_after_stop = aliveAfterStop(state.acc.pid, deps); ev.stop_confirmed = ev.pid_alive_after_stop === false;
    ev.cleanup_status = ev.stop_confirmed ? 'STOP_CONFIRMED' : (ev.pid_alive_after_stop === true ? 'STOP_PENDING_PID_STILL_ALIVE' : 'STOP_PENDING_STATE_UNKNOWN');
    removable = ev.stop_confirmed;
  } else {   // PID no acreditado: intento acotado de parada por directorio propio, pero NO se afirma parada ni se borra
    stopOwn(); ev.cleanup_status = 'STOP_PENDING_' + ((state.acc && state.acc.reason) || 'PID_NOT_ACCREDITED'); removable = false;
  }
  const safeDir = !!state.dir && String(state.dir).startsWith(state.safePrefix) && deps.exists(state.markerPath);
  if (removable && safeDir) { deps.rmDir(state.dir); ev.lab_dir_removed = !deps.exists(state.dir); }
  else if (removable && !safeDir) ev.cleanup_status = 'REMOVAL_REFUSED_UNSAFE_PATH';
  if (!ev.lab_dir_removed) ev.retained_dir = state.dir || null;
  return ev;
}

// Código de salida del laboratorio. 4 = gate de aislamiento (NO EJECUTADO); 5 = limpieza pendiente (residuo propio retenido); 1 = otras fallas.
function exitCodeFor({ error, mainFails, survivors, rollbackOk, cleanup }) {
  if (cleanup && !cleanup.lab_dir_removed && cleanup.retained_dir) return EXIT_CLEANUP_PENDING;
  if (error) return /GATE/.test(error) ? 4 : 1;
  return mainFails || survivors || !rollbackOk || (cleanup && (cleanup.pid_alive_after_stop !== false && cleanup.start_attempted)) || !(cleanup && cleanup.lab_dir_removed) ? 1 : 0;
}
module.exports = Object.freeze({ accreditPid, aliveAfterStop, finalizeCleanup, exitCodeFor, EXIT_CLEANUP_PENDING });
