'use strict';
// RA-R3 — fallos REALES inyectados sobre la instancia PostgreSQL PROPIA (modo lifecycle de run_lab.js): control normal, rechazo seguro y fallos de lectura de PID / parada / arranque / inicialización / gate.
// Solo instancias y directorios creados por esta ejecución (ruta tomada del JSON de cada corrida, con prefijo y marca del mandato). Sin pkill/killall ni búsqueda por nombre: el único proceso que se toca es el
// PID acreditado de la instancia propia (vía `pg_ctl -D <directorio propio> stop`). Los residuos retenidos a propósito se limpian AL FINAL por este arnés, con parada observada, y se registra.
const fs = require('fs'); const os = require('os'); const path = require('path'); const cp = require('child_process');
const BIN = '/usr/lib/postgresql/16/bin'; const OSUSER = 'ubuntu'; const LAB = path.join(__dirname, 'run_lab.js'); const OUT = process.env.RA1_FAULTS_OUT || path.join(__dirname, 'evidence', 'lifecycle-faults');
const PREFIX = path.join(os.tmpdir(), 'c1-ra1-lab-'); const sh = (c, a, o = {}) => cp.spawnSync(c, a, Object.assign({ encoding: 'utf8' }, o)); const asUser = (c, a) => sh('runuser', ['-u', OSUSER, '--', 'env', '-i', 'PATH=/usr/bin:/bin', 'LANG=C', c, ...a]);
const alive = (pid) => { try { const st = fs.readFileSync('/proc/' + pid + '/stat', 'utf8').split(') ')[1][0]; return st !== 'Z'; } catch (_) { return false; } };
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const CASES = [   // nombre, fallo, salida esperada, estado esperado, ¿directorio retenido?, ¿proceso propio sigue vivo al salir el laboratorio?
  ['C0_control_limpieza_normal', null, 0, 'STOP_CONFIRMED', false, false],
  ['F1_arranque_ok_lectura_de_PID_falla', 'pidread', 5, 'STOP_PENDING_PID_READ_FAILED', true, null],
  ['F2_parada_no_confirmada_la_orden_no_detiene', 'stopnoop', 5, 'STOP_PENDING_PID_STILL_ALIVE', true, true],
  ['F3_estado_del_proceso_desconocido', 'procunknown', 5, 'STOP_PENDING_STATE_UNKNOWN', true, null],
  ['F4_arranque_falla_sin_PID', 'startfail', 5, 'STOP_PENDING_PID_READ_FAILED', true, null],
  ['F5_inicializacion_falla_antes_de_arrancar', 'initfail', 1, 'NOT_STARTED_REMOVABLE', false, false],
  ['F6_fallo_de_gate_de_identidad', 'gatefail', 4, 'STOP_CONFIRMED', false, false],
];
function residueCleanup(dir) {   // limpieza externa de un residuo PROPIO retenido a propósito; exige prefijo, marca, PID leído de su postmaster.pid con cmdline propio y parada observada
  const r = { dir, steps: [] }; const data = path.join(dir, 'data');
  if (!dir.startsWith(PREFIX) || !fs.existsSync(path.join(dir, 'MANDATE.marker'))) { r.result = 'REFUSED_NOT_OWN'; return r; }
  let pid = null; try { pid = Number(fs.readFileSync(path.join(data, 'postmaster.pid'), 'utf8').split('\n')[0]); } catch (_) {}
  r.pid_file_present = pid !== null; if (pid && alive(pid)) {
    const cmd = (() => { try { return fs.readFileSync('/proc/' + pid + '/cmdline', 'utf8').replace(/\0/g, ' '); } catch (_) { return ''; } })(); if (!cmd.includes(data)) { r.result = 'REFUSED_PID_NOT_OWN'; return r; }
    r.alive_before_stop = true; const st = asUser(BIN + '/pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']); r.stop_status = st.status; for (let i = 0; i < 50 && alive(pid); i++) sleep(200); r.alive_after_stop = alive(pid); if (r.alive_after_stop) { r.result = 'STOP_NOT_CONFIRMED_DIR_KEPT'; return r; }
  } else r.alive_before_stop = false;
  fs.rmSync(dir, { recursive: true, force: true }); r.result = fs.existsSync(dir) ? 'DIR_NOT_REMOVED' : 'CLEANED_BY_HARNESS'; return r;
}
fs.mkdirSync(OUT, { recursive: true }); const report = { cases: {}, started_utc: new Date().toISOString() }; let bad = 0; const created = [];
for (const [name, fault, wantExit, wantStatus, wantRetained, wantAliveAtExit] of CASES) {
  const ev_dir = path.join(OUT, name); fs.mkdirSync(ev_dir, { recursive: true });
  const r = sh(process.execPath, [LAB], { env: Object.assign({}, process.env, { RA1_LAB_MODE: 'lifecycle', RA1_LAB_EVID: ev_dir }, fault ? { RA1_LAB_FAULT: fault } : {}) });
  let ev = null; try { ev = JSON.parse(fs.readFileSync(path.join(ev_dir, 'lab-run.json'), 'utf8')); } catch (_) {}
  const c = { exit: r.status, want_exit: wantExit, checks: {} }; const chk = (k, ok) => { c.checks[k] = ok ? 'PASS' : 'FAIL'; if (!ok) bad++; };
  chk('exit_code', r.status === wantExit); chk('json_present', !!ev);
  if (ev) {
    const cl = ev.cleanup; c.cleanup_status = cl.cleanup_status; c.lab_dir_removed = cl.lab_dir_removed; c.stop_confirmed = cl.stop_confirmed; c.pid_alive_after_stop = cl.pid_alive_after_stop; c.stop_attempted = cl.stop_attempted;
    chk('cleanup_status', cl.cleanup_status === wantStatus); chk('retention', wantRetained ? (cl.lab_dir_removed === false && fs.existsSync(ev.lab_dir)) : (cl.lab_dir_removed === true && !fs.existsSync(ev.lab_dir)));
    chk('no_afirma_limpieza_si_retiene', wantRetained ? (cl.stop_confirmed === false && /pendiente|PENDING/i.test(cl.cleanup_status + (r.stdout.match(/RETENIDO \(limpieza pendiente\)/) ? 'PENDING' : ''))) : true);
    chk('stdout_declara_directorio_retenido_si_corresponde', wantRetained ? /DIRECTORIO RETENIDO \(limpieza pendiente\)/.test(r.stdout) : !/DIRECTORIO RETENIDO/.test(r.stdout));
    if (wantAliveAtExit !== null && ev.pid) { c.process_alive_at_exit = alive(ev.pid); chk('estado_real_del_proceso_al_salir', c.process_alive_at_exit === wantAliveAtExit); }
    if (fault === 'startfail') chk('arranque_sin_pid', ev.pid === null || ev.pid === undefined);
    if (fault === 'initfail') chk('sin_pg_ctl', cl.stop_attempted === false && !ev.pid);
    if (wantRetained) { c.residue_cleanup = residueCleanup(ev.lab_dir); chk('residuo_propio_limpiado_con_parada_observada', c.residue_cleanup.result === 'CLEANED_BY_HARNESS'); }
    created.push(ev.lab_dir); c.lab_dir = '<SCRATCH>/' + path.basename(ev.lab_dir);
  }
  report.cases[name] = c; console.log(name, JSON.stringify({ exit: c.exit, want: wantExit, status: c.cleanup_status, retained: c.lab_dir_removed === false, checks: c.checks, residue: c.residue_cleanup && c.residue_cleanup.result }));
}
// estado final: ningún directorio propio de esta ejecución queda
const left = created.filter((d) => fs.existsSync(d)); report.leftover_own_dirs = left.length; report.finished_utc = new Date().toISOString(); report.failures = bad;
fs.writeFileSync(path.join(OUT, 'lifecycle-faults.json'), JSON.stringify(report, null, 2) + '\n'); console.log(`FALLOS INYECTADOS: casos=${CASES.length} fallos=${bad} directorios propios restantes=${left.length}`);
process.exit(bad || left.length ? 1 : 0);
