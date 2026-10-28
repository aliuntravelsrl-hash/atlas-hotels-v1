'use strict';
// RA-R3 (v1.2) — mutación FOCAL de la lógica de limpieza/identidad (tests/lab/lifecycle.js). Cada mutante cambia UNA propiedad en una copia temporal; tests/run_lifecycle_tests.js debe fallar (exit≠0).
// Incluye los defectos del Curator (actuar sin acreditación = LM02; coincidencia por subcadena = LM03/LM04) y el original de v1 (LM01). Control positivo: sin mutar ⇒ exit 0. Equivalentes: ver EQUIV.
const fs = require('fs'); const os = require('os'); const path = require('path'); const cp = require('child_process');
const SRC = fs.readFileSync(path.join(__dirname, 'lab', 'lifecycle.js'), 'utf8'); const TEST = path.join(__dirname, 'run_lifecycle_tests.js');
const M = [
  ['LM01_desconocido_cuenta_como_parada_confirmada_defecto_v1', [["ev.stop_confirmed = ev.pid_alive_after_stop === false;", "ev.stop_confirmed = !ev.pid_alive_after_stop;"]]],
  ['LM02_actuar_pg_ctl_stop_sin_acreditacion_defecto_Curator', [["  } else { ev.cleanup_status = 'STOP_PENDING_' + ((state.acc", "  } else { stopOwn(state, deps, ev); ev.cleanup_status = 'STOP_PENDING_' + ((state.acc"]]],
  ['LM03_argv_por_subcadena_defecto_Curator', [["if (i < 1 || id.argv.indexOf('-D', i + 1) !== -1 || id.argv[i + 1] !== state.dataDir) return", "if (!id.argv.join(' ').includes(state.dataDir)) return"]]],
  ['LM04_cwd_por_subcadena', [["if (id.cwd !== state.dataDir)", "if (!String(id.cwd).includes(state.dataDir))"]]],
  ['LM05_sin_comprobar_binario', [["if (id.exe !== state.postgresBin) return { ok: false, reason: 'EXE_MISMATCH' };", ""]]],
  ['LM06_acepta_D_repetido', [["|| id.argv.indexOf('-D', i + 1) !== -1", ""]]],
  ['LM07_D_en_posicion_del_binario', [["if (i < 1 ||", "if (i < 0 ||"]]],
  ['LM08_postmaster_pid_sin_directorio_exacto', [["if (lines[1] !== state.dataDir) return { ok: false, reason: 'PIDFILE_DIR_MISMATCH' };", ""]]],
  ['LM09_sin_revalidacion_en_el_limite_de_parada', [["const rv = revalidate(state, deps, state.acc);\n    if (!rv.ok)", "const rv = { ok: true };\n    if (!rv.ok)"]]],
  ['LM10_revalidacion_sin_instante_de_inicio_PID_reciclado', [["if (c.id.starttime !== acc.token.starttime) return { ok: false, reason: 'REVALIDATION_PID_RECYCLED' };", ""]]],
  ['LM11_revalidacion_sin_comparar_PID_vigente_del_pidfile', [["if (p.pid !== acc.token.pid) return { ok: false, reason: 'REVALIDATION_PIDFILE_PID_CHANGED' };", ""]]],
  ['LM12_revalidacion_sin_identidad', [["const c = checkIdentity(state, deps, acc.token.pid); if (!c.ok) return { ok: false, reason: 'REVALIDATION_' + c.reason };", "const c = { ok: true, id: { starttime: acc.token.starttime } };"]]],
  ['LM13_estado_desconocido_se_toma_por_ausente', [["if (st === 'UNKNOWN') return null;", "if (st === 'UNKNOWN') return false;"]]],
  ['LM14_borrado_sin_comprobar_prefijo_propio', [["String(state.dir).startsWith(state.safePrefix) && ", ""]]],
  ['LM15_borrado_sin_marca_del_mandato', [["&& deps.exists(state.markerPath)", ""]]],
  ['LM16_limpieza_pendiente_no_cambia_el_exit', [["if (cleanup && !cleanup.lab_dir_removed && cleanup.retained_dir) return EXIT_CLEANUP_PENDING;", ""]]],
  ['LM17_arranque_fallido_se_trata_como_no_arrancado', [["if (!state.startAttempted) {", "if (!state.startAttempted || state.startStatus !== 0) {"]]],
  ['LM18_recuperacion_sin_nueva_acreditacion', [["const acc = accreditPid(state, deps); const s2", "const acc = state.acc; const s2"]]],
  ['LM19_pid_cero_o_uno_se_acepta', [["pid <= 1", "pid < 0"]]],
  ['LM20_pid_reciclado_durante_el_sondeo_no_se_detecta', [["if (id && typeof id.starttime === 'number' && id.starttime !== acc.token.starttime) return false;", ""]]],
  ['LM21_pid_con_espacios_o_signo_se_acepta', [["!/^[0-9]+$/.test(lines[0]) || ", ""]]],
  ['LM22_parada_sin_directorio_propio_en_los_argumentos', [["const args = ['-D', state.dataDir, ", "const args = ["]]],
];
const EQUIV = {};   // ninguno declarado: todos los mutantes deben morir
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ra1-lcm-')); const run = (file) => cp.spawnSync(process.execPath, [TEST], { env: Object.assign({}, process.env, { RA1_LIFECYCLE: file }), encoding: 'utf8' });
const base = path.join(dir, 'base.js'); fs.writeFileSync(base, SRC); const ctl = run(base); const out = { control_positivo_exit: ctl.status, mutants: {} }; let bad = 0;
if (ctl.status !== 0) { console.log('CONTROL POSITIVO FALLA'); process.exit(3); }
for (const [name, reps] of M) { let s = SRC; let ok = true; for (const [n, r] of reps) { if (s.split(n).length !== 2) { ok = false; break; } s = s.replace(n, () => r); } if (!ok) { out.mutants[name] = 'NEEDLE_STALE'; bad++; continue; } const f = path.join(dir, name + '.js'); fs.writeFileSync(f, s); const r = run(f); const failing = (r.stdout.match(/^L\d+_\S+ FAIL/gm) || []).map((x) => x.split(' ')[0].split('_')[0]); out.mutants[name] = r.status !== 0 ? 'KILLED by ' + (failing.join(',') || 'exit ' + r.status) : (EQUIV[name] ? 'EQUIVALENT_DECLARED' : 'SURVIVED'); if (out.mutants[name] === 'SURVIVED') bad++; }
fs.rmSync(dir, { recursive: true, force: true });
for (const [k, v] of Object.entries(out.mutants)) console.log(k, v);
const c = Object.values(out.mutants); console.log(`MUTANTES LIFECYCLE v1.2: killed=${c.filter((x) => /^KILLED/.test(x)).length} survivors/stale=${bad} de ${c.length}; control_positivo_exit=${ctl.status}`); process.exit(bad ? 1 : 0);
