'use strict';
// RA-R3 (v1.2) — ciclo de vida y limpieza de la instancia PostgreSQL PROPIA del laboratorio. Lógica pura con dependencias inyectadas (tests/run_lifecycle_tests.js).
// Reglas: (1) SOLO se actúa (pg_ctl stop) sobre un proceso identificado POSITIVAMENTE como la instancia creada por este mandato; PID ilegible, inválido, ajeno o no acreditado ⇒ CERO comandos de
// parada/señales y CERO borrado, directorio retenido, exit 5. (2) La identidad es EXACTA, no por subcadena: postmaster.pid (línea 1 = PID, línea 2 = directorio de datos propio exacto), /proc/<pid>/exe =
// binario postgres esperado, /proc/<pid>/cwd = directorio de datos propio exacto y argv (límites preservados) con «-D» seguido del directorio exacto; se registra el instante de inicio del proceso.
// (3) La identidad y el postmaster.pid se REVALIDAN en el límite de actuación (justo antes de pg_ctl stop) contra la identidad acreditada al arrancar; un PID cambiado/reciclado no se toca.
// (4) El directorio solo se elimina con parada OBSERVADA del proceso acreditado (o si nunca se intentó arrancar). Recuperar un residuo exige una NUEVA acreditación positiva (recoverRetained).
// Nunca se busca ni se mata por nombre/patrón. Límite: entre la revalidación y pg_ctl existe una ventana TOCTOU inherente; no se promete defensa contra administrador/superusuario del SO.
const path = require('path');
const EXIT_CLEANUP_PENDING = 5;

// Identidad exacta de la instancia propia. state: {dataDir, postgresBin}. deps: {readFile, identity}.
// identity(pid) -> {exe, cwd, argv:string[]|null, starttime} | null (no legible).
function checkIdentity(state, deps, pidFromFile) {
  if (typeof deps.identity !== 'function') return { ok: false, reason: 'IDENTITY_UNAVAILABLE' };
  let id; try { id = deps.identity(pidFromFile); } catch (_) { id = null; }
  if (!id || typeof id !== 'object') return { ok: false, reason: 'IDENTITY_UNREADABLE' };
  if (id.exe !== state.postgresBin) return { ok: false, reason: 'EXE_MISMATCH' };
  if (id.cwd !== state.dataDir) return { ok: false, reason: 'CWD_MISMATCH' };
  if (!Array.isArray(id.argv) || id.argv.length === 0) return { ok: false, reason: 'ARGV_UNREADABLE' };
  const i = id.argv.indexOf('-D');
  if (i < 1 || id.argv.indexOf('-D', i + 1) !== -1 || id.argv[i + 1] !== state.dataDir) return { ok: false, reason: 'ARGV_DIR_MISMATCH' };   // «-D» único y su valor EXACTO
  if (typeof id.starttime !== 'number' || !Number.isFinite(id.starttime)) return { ok: false, reason: 'STARTTIME_UNREADABLE' };
  return { ok: true, id };
}
function readPidFile(state, deps) {
  let txt; try { txt = deps.readFile(path.join(state.dataDir, 'postmaster.pid')); } catch (_) { return { ok: false, reason: 'PID_READ_FAILED' }; }
  const lines = String(txt).split('\n'); const pid = Number(lines[0]);
  if (!/^[0-9]+$/.test(lines[0]) || !Number.isInteger(pid) || pid <= 1) return { ok: false, reason: 'PID_INVALID' };
  if (lines[1] !== state.dataDir) return { ok: false, reason: 'PIDFILE_DIR_MISMATCH' };
  return { ok: true, pid };
}
// Acreditación positiva tras un intento de arranque (o antes de recuperar un residuo). Devuelve {pid, accredited, reason, token}.
function accreditPid(state, deps) {
  const p = readPidFile(state, deps); if (!p.ok) return { pid: null, accredited: false, reason: p.reason };
  const c = checkIdentity(state, deps, p.pid); if (!c.ok) return { pid: p.pid, accredited: false, reason: 'PID_NOT_OWN_INSTANCE:' + c.reason };
  return { pid: p.pid, accredited: true, reason: null, token: { pid: p.pid, exe: c.id.exe, cwd: c.id.cwd, starttime: c.id.starttime } };
}
// En el límite de actuación: el postmaster.pid vigente y la identidad vigente deben seguir siendo EXACTAMENTE los acreditados.
function revalidate(state, deps, acc) {
  const p = readPidFile(state, deps); if (!p.ok) return { ok: false, reason: 'REVALIDATION_' + p.reason };
  if (p.pid !== acc.token.pid) return { ok: false, reason: 'REVALIDATION_PIDFILE_PID_CHANGED' };
  const c = checkIdentity(state, deps, acc.token.pid); if (!c.ok) return { ok: false, reason: 'REVALIDATION_' + c.reason };
  if (c.id.starttime !== acc.token.starttime) return { ok: false, reason: 'REVALIDATION_PID_RECYCLED' };
  return { ok: true };
}
// Sondeo tri-estado: false = el proceso acreditado ya no existe (ausente, zombi o PID reciclado por otro proceso); true = sigue vivo tras agotar el tiempo; null = no determinable.
function aliveAfterStop(acc, deps, tries = 50) {
  for (let i = 0; i < tries; i++) {
    const st = deps.procState(acc.token.pid);
    if (st === 'GONE' || st === 'ZOMBIE') return false;
    if (st === 'UNKNOWN') return null;
    let id = null; try { id = deps.identity(acc.token.pid); } catch (_) { id = null; }
    if (id && typeof id.starttime === 'number' && id.starttime !== acc.token.starttime) return false;   // ese PID ya es otro proceso: el acreditado terminó
    deps.sleep(200);
  }
  return true;
}
function stopOwn(state, deps, ev) { ev.stop_attempted = true; const args = ['-D', state.dataDir, '-m', 'fast', '-w', 'stop']; ev.actions.push('pg_ctl ' + args.join(' ')); const r = deps.run('pg_ctl', args); ev.stop_status = r.status; }

// state: { dir, dataDir, markerPath, safePrefix, postgresBin, startAttempted, startStatus, acc }
// deps:  { run, readFile, identity, procState, sleep, exists, rmDir }
function finalizeCleanup(state, deps) {
  const ev = { start_attempted: !!state.startAttempted, pid_accredited: !!(state.acc && state.acc.accredited), pid_reason: state.acc ? state.acc.reason : null, actions: [], stop_attempted: false, stop_status: null, pid_alive_after_stop: null, stop_confirmed: false, cleanup_status: null, lab_dir_removed: false, retained_dir: null };
  let removable = false;
  if (!state.startAttempted) { ev.cleanup_status = 'NOT_STARTED_REMOVABLE'; removable = true; }
  else if (state.acc && state.acc.accredited) {
    const rv = revalidate(state, deps, state.acc);
    if (!rv.ok) { ev.cleanup_status = 'STOP_PENDING_' + rv.reason; ev.pid_reason = rv.reason; }   // identidad cambiada: CERO acciones
    else { stopOwn(state, deps, ev); ev.pid_alive_after_stop = aliveAfterStop(state.acc, deps); ev.stop_confirmed = ev.pid_alive_after_stop === false;
      ev.cleanup_status = ev.stop_confirmed ? 'STOP_CONFIRMED' : (ev.pid_alive_after_stop === true ? 'STOP_PENDING_PID_STILL_ALIVE' : 'STOP_PENDING_STATE_UNKNOWN'); removable = ev.stop_confirmed; }
  } else { ev.cleanup_status = 'STOP_PENDING_' + ((state.acc && state.acc.reason) || 'PID_NOT_ACCREDITED'); }   // no acreditado: ni stop ni señal ni borrado
  const safeDir = !!state.dir && String(state.dir).startsWith(state.safePrefix) && deps.exists(state.markerPath);
  if (removable && safeDir) { deps.rmDir(state.dir); ev.lab_dir_removed = !deps.exists(state.dir); }
  else if (removable && !safeDir) ev.cleanup_status = 'REMOVAL_REFUSED_UNSAFE_PATH';
  if (!ev.lab_dir_removed) ev.retained_dir = state.dir || null;
  return ev;
}
// Recuperación de un residuo retenido: exige una NUEVA acreditación positiva de la instancia propia; si no, no se hace nada.
function recoverRetained(state, deps) {
  const acc = accreditPid(state, deps); const s2 = Object.assign({}, state, { startAttempted: true, acc });
  const ev = finalizeCleanup(s2, deps); ev.recovery = true; return ev;
}
// Código de salida del laboratorio. 4 = gate de aislamiento (NO EJECUTADO); 5 = limpieza pendiente (residuo propio retenido); 1 = otras fallas.
function exitCodeFor({ error, mainFails, survivors, rollbackOk, cleanup }) {
  if (cleanup && !cleanup.lab_dir_removed && cleanup.retained_dir) return EXIT_CLEANUP_PENDING;
  if (error) return /GATE/.test(error) ? 4 : 1;
  return mainFails || survivors || !rollbackOk || (cleanup && (cleanup.pid_alive_after_stop !== false && cleanup.start_attempted)) || !(cleanup && cleanup.lab_dir_removed) ? 1 : 0;
}
module.exports = Object.freeze({ checkIdentity, readPidFile, accreditPid, revalidate, aliveAfterStop, finalizeCleanup, recoverRetained, exitCodeFor, EXIT_CLEANUP_PENDING });
