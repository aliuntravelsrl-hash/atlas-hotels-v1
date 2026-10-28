'use strict';
// RA-R3 — mutantes de la lógica de limpieza (tests/lab/lifecycle.js). Cada mutante cambia UNA propiedad en una copia temporal; tests/run_lifecycle_tests.js debe fallar (exit≠0).
// Control positivo: el módulo sin mutar pasa (exit 0). Sin equivalentes declarados.
const fs = require('fs'); const os = require('os'); const path = require('path'); const cp = require('child_process');
const SRC = fs.readFileSync(path.join(__dirname, 'lab', 'lifecycle.js'), 'utf8'); const TEST = path.join(__dirname, 'run_lifecycle_tests.js');
const M = [
  ['LM01_desconocido_cuenta_como_parada_confirmada_defecto_original', [["ev.stop_confirmed = ev.pid_alive_after_stop === false;", "ev.stop_confirmed = !ev.pid_alive_after_stop;"]]],
  ['LM02_pid_no_acreditado_permite_borrar', [["|| 'PID_NOT_ACCREDITED'); removable = false;", "|| 'PID_NOT_ACCREDITED'); removable = true;"]]],
  ['LM03_sin_identidad_de_la_instancia_propia', [["|| !String(cmd).includes(state.dataDir)", ""]]],
  ['LM04_estado_desconocido_se_toma_por_ausente', [["if (st === 'UNKNOWN') return null;", "if (st === 'UNKNOWN') return false;"]]],
  ['LM05_sin_intento_de_parada_propia_si_pid_no_acreditado', [["NO se afirma parada ni se borra\n    stopOwn(); ", "NO se afirma parada ni se borra\n    "]]],
  ['LM06_borrado_sin_comprobar_prefijo_propio', [["String(state.dir).startsWith(state.safePrefix) && ", ""]]],
  ['LM07_borrado_sin_marca_del_mandato', [["&& deps.exists(state.markerPath)", ""]]],
  ['LM08_limpieza_pendiente_no_cambia_el_exit', [["if (cleanup && !cleanup.lab_dir_removed && cleanup.retained_dir) return EXIT_CLEANUP_PENDING;", ""]]],
  ['LM09_arranque_fallido_se_trata_como_no_arrancado', [["if (!state.startAttempted) {", "if (!state.startAttempted || state.startStatus !== 0) {"]]],
  ['LM10_pid_cero_o_uno_se_acepta', [["pid <= 1", "pid < 0"]]],
];
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ra1-lcm-')); const run = (file) => cp.spawnSync(process.execPath, [TEST], { env: Object.assign({}, process.env, { RA1_LIFECYCLE: file }), encoding: 'utf8' });
const base = path.join(dir, 'base.js'); fs.writeFileSync(base, SRC); const ctl = run(base); const out = { control_positivo_exit: ctl.status, mutants: {} }; let bad = 0;
if (ctl.status !== 0) { console.log('CONTROL POSITIVO FALLA'); process.exit(3); }
for (const [name, reps] of M) { let s = SRC; let ok = true; for (const [n, r] of reps) { if (s.split(n).length !== 2) { ok = false; break; } s = s.replace(n, () => r); } if (!ok) { out.mutants[name] = 'NEEDLE_STALE'; bad++; continue; } const f = path.join(dir, name + '.js'); fs.writeFileSync(f, s); const r = run(f); out.mutants[name] = r.status !== 0 ? 'KILLED' : 'SURVIVED'; if (out.mutants[name] === 'SURVIVED') bad++; }
fs.rmSync(dir, { recursive: true, force: true });
for (const [k, v] of Object.entries(out.mutants)) console.log(k, v);
const c = Object.values(out.mutants); console.log(`MUTANTES LIFECYCLE: killed=${c.filter((x) => x === 'KILLED').length} survivors/stale=${bad} de ${c.length}; control_positivo_exit=${ctl.status}`); process.exit(bad ? 1 : 0);
