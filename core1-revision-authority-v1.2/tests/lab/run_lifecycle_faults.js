'use strict';
// RA-R3 (v1.2) — fallos REALES inyectados sobre la instancia PostgreSQL PROPIA (modo lifecycle de run_lab.js). Solo instancias/directorios creados por esta ejecución (ruta del JSON de cada corrida).
// Verifica con TRAZA (`actions`) que cuando el PID no está acreditado o la identidad cambia hay CERO llamadas de parada, y comprueba el estado REAL del proceso al salir el laboratorio.
// Los residuos retenidos a propósito (el servidor propio puede seguir vivo) se recuperan AL FINAL por este arnés SOLO mediante NUEVA acreditación positiva (LC.recoverRetained); si no es acreditable
// y no hay NINGÚN proceso que use el directorio (lectura de /proc, sin señales), se elimina el directorio sin proceso. Nunca pkill/killall ni PID ajeno. Ningún caso usa un PID ajeno real: los de identidad ajena se simulan sobre la propia.
const fs = require('fs'); const os = require('os'); const path = require('path'); const cp = require('child_process');
const LC = require('./lifecycle'); const RD = require('./realdeps');
const BIN = '/usr/lib/postgresql/16/bin'; const OSUSER = 'ubuntu'; const LAB = path.join(__dirname, 'run_lab.js'); const OUT = process.env.RA1_FAULTS_OUT || path.join(__dirname, 'evidence', 'lifecycle-faults');
const PREFIX = path.join(os.tmpdir(), 'c1-ra1-lab-'); const sh = (c, a, o = {}) => cp.spawnSync(c, a, Object.assign({ encoding: 'utf8' }, o)); const asUser = (c, a) => sh('runuser', ['-u', OSUSER, '--', 'env', '-i', 'PATH=/usr/bin:/bin', 'LANG=C', c, ...a]);
const alive = (pid) => { try { return fs.readFileSync('/proc/' + pid + '/stat', 'utf8').split(') ')[1][0] !== 'Z'; } catch (_) { return false; } };
// [nombre, fallo, exit esperado, estado esperado, retenido, acciones esperadas (n), ¿proceso propio vivo al salir? (null = no se afirma)]
const CASES = [
  ['C0_control_limpieza_normal', null, 0, 'STOP_CONFIRMED', false, 1, false],
  ['F1_arranque_ok_lectura_de_PID_falla', 'pidread', 5, 'STOP_PENDING_PID_READ_FAILED', true, 0, true],
  ['F2_parada_emitida_no_detiene', 'stopnoop', 5, 'STOP_PENDING_PID_STILL_ALIVE', true, 1, true],
  ['F3_estado_del_proceso_desconocido', 'procunknown', 5, 'STOP_PENDING_STATE_UNKNOWN', true, 1, null],
  ['F4_arranque_falla_sin_PID', 'startfail', 5, 'STOP_PENDING_PID_READ_FAILED', true, 0, false],
  ['F5_inicializacion_falla_antes_de_arrancar', 'initfail', 1, 'NOT_STARTED_REMOVABLE', false, 0, false],
  ['F6_fallo_de_gate_de_identidad', 'gatefail', 4, 'STOP_CONFIRMED', false, 1, false],
  ['F7_identidad_ajena_data-foreign_sobre_proceso_propio', 'idforeign', 5, 'STOP_PENDING_PID_NOT_OWN_INSTANCE:CWD_MISMATCH', true, 0, true],
  ['F8_PID_cambiado_o_reciclado_en_el_limite_de_parada', 'pidchanged', 5, 'STOP_PENDING_REVALIDATION_PID_RECYCLED', true, 0, true],
  ['F9_postmaster_pid_vigente_apunta_a_otro_PID_en_el_limite', 'pidfilechanged', 5, 'STOP_PENDING_REVALIDATION_PIDFILE_PID_CHANGED', true, 0, true],
];
const usersOfDir = (dir) => { const hits = []; for (const p of fs.readdirSync('/proc').filter((x) => /^[0-9]+$/.test(x))) { try { const cwd = fs.readlinkSync('/proc/' + p + '/cwd'); const cmd = fs.readFileSync('/proc/' + p + '/cmdline', 'utf8'); if (cwd.startsWith(dir) || cmd.includes(dir)) hits.push(Number(p)); } catch (_) {} } return hits.filter((p) => p !== process.pid); };
function residue(dir) {   // recuperación de un residuo PROPIO retenido
  const r = { dir: '<SCRATCH>/' + path.basename(dir) }; if (!dir.startsWith(PREFIX) || !fs.existsSync(path.join(dir, 'MANDATE.marker'))) { r.result = 'REFUSED_NOT_OWN'; return r; }
  const st = { dir, dataDir: path.join(fs.realpathSync(dir), 'data'), markerPath: path.join(dir, 'MANDATE.marker'), safePrefix: PREFIX, postgresBin: BIN + '/postgres', startAttempted: true };
  const ev = LC.recoverRetained(st, RD.makeRealDeps({ BIN, asUser })); r.recovery = { cleanup_status: ev.cleanup_status, actions: ev.actions, stop_confirmed: ev.stop_confirmed, removed: ev.lab_dir_removed };
  if (ev.lab_dir_removed) { r.result = 'RECOVERED_BY_POSITIVE_ACCREDITATION'; return r; }
  const users = usersOfDir(dir); r.processes_using_dir = users.length; if (users.length === 0 && !fs.existsSync(path.join(st.dataDir, 'postmaster.pid'))) { fs.rmSync(dir, { recursive: true, force: true }); r.result = fs.existsSync(dir) ? 'DIR_NOT_REMOVED' : 'REMOVED_NO_PROCESS_USES_DIR'; return r; }
  r.result = 'KEPT_UNRESOLVED'; return r;
}
fs.mkdirSync(OUT, { recursive: true }); const report = { version: 'RA-1 v1.2', cases: {}, started_utc: new Date().toISOString() }; let bad = 0; const created = [];
for (const [name, fault, wantExit, wantStatus, wantRetained, wantActions, wantAlive] of CASES) {
  const ev_dir = path.join(OUT, name); fs.mkdirSync(ev_dir, { recursive: true });
  const r = sh(process.execPath, [LAB], { env: Object.assign({}, process.env, { RA1_LAB_MODE: 'lifecycle', RA1_LAB_EVID: ev_dir }, fault ? { RA1_LAB_FAULT: fault } : {}) });
  let ev = null; try { ev = JSON.parse(fs.readFileSync(path.join(ev_dir, 'lab-run.json'), 'utf8')); } catch (_) {}
  const c = { exit: r.status, want_exit: wantExit, checks: {} }; const chk = (k, ok) => { c.checks[k] = ok ? 'PASS' : 'FAIL'; if (!ok) bad++; };
  chk('exit_code', r.status === wantExit); chk('json_present', !!ev);
  if (ev) {
    const cl = ev.cleanup; created.push(ev.lab_dir); c.cleanup_status = cl.cleanup_status; c.lab_dir_removed = cl.lab_dir_removed; c.stop_confirmed = cl.stop_confirmed; c.actions = cl.actions; c.pid_alive_after_stop = cl.pid_alive_after_stop;
    chk('cleanup_status', cl.cleanup_status === wantStatus); chk('traza_de_acciones', cl.actions.length === wantActions && cl.stop_attempted === (wantActions > 0));
    chk('retention', wantRetained ? (cl.lab_dir_removed === false && fs.existsSync(ev.lab_dir)) : (cl.lab_dir_removed === true && !fs.existsSync(ev.lab_dir)));
    chk('no_afirma_limpieza_si_retiene', wantRetained ? (cl.stop_confirmed === false && /RETENIDO \(limpieza pendiente\)/.test(r.stdout)) : !/DIRECTORIO RETENIDO/.test(r.stdout));
    if (wantAlive !== null && ev.pid) { c.process_alive_at_exit = alive(ev.pid); chk('estado_real_del_proceso_al_salir', c.process_alive_at_exit === wantAlive); }
    if (wantRetained) { c.residue_recovery = residue(ev.lab_dir); chk('residuo_propio_resuelto', /^(RECOVERED_BY_POSITIVE_ACCREDITATION|REMOVED_NO_PROCESS_USES_DIR)$/.test(c.residue_recovery.result)); if (wantAlive === true && ev.pid) { c.process_alive_after_recovery = alive(ev.pid); chk('proceso_propio_detenido_solo_por_recuperacion_acreditada', c.process_alive_after_recovery === false && c.residue_recovery.result === 'RECOVERED_BY_POSITIVE_ACCREDITATION'); } }
    c.lab_dir = '<SCRATCH>/' + path.basename(ev.lab_dir);
  }
  report.cases[name] = c; console.log(name, JSON.stringify({ exit: c.exit, want: wantExit, status: c.cleanup_status, actions: c.actions && c.actions.length, retained: c.lab_dir_removed === false, checks: c.checks, residue: c.residue_recovery && c.residue_recovery.result }));
}
const left = created.filter((d) => fs.existsSync(d)); report.leftover_own_dirs = left.length; report.finished_utc = new Date().toISOString(); report.failures = bad;
fs.writeFileSync(path.join(OUT, 'lifecycle-faults.json'), JSON.stringify(report, null, 2) + '\n'); console.log(`FALLOS INYECTADOS v1.2: casos=${CASES.length} fallos=${bad} directorios propios restantes=${left.length}`);
process.exit(bad || left.length ? 1 : 0);
