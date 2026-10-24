'use strict';
// Inyección de fallos del productor: cada mutación de una COPIA temporal debe hacer fallar la suite (código != 0). Incluye control positivo y propagación del código de salida.
const fs = require('fs'); const path = require('path'); const os = require('os'); const cp = require('child_process');
const root = path.join(__dirname, '..', '..');
const DIRS = ['core1-producer', 'kernel', 'kernel-v2', 'kernel-v2.0.1', 'kernel-v2.0.2', 'kernel-v2.0.3', 'tests', 'spec', 'scripts', 'fixtures', 'core1-price'];
function layout() { const t = fs.mkdtempSync(path.join(os.tmpdir(), 'c1prod-fault-')); for (const d of DIRS) fs.cpSync(path.join(root, d), path.join(t, d), { recursive: true, filter: (s) => !s.includes('__pycache__') }); fs.copyFileSync(path.join(root, 'package.json'), path.join(t, 'package.json')); return t; }
const run = (t) => cp.spawnSync(process.execPath, [path.join(t, 'core1-producer/tests/run_producer_tests.js')], { encoding: 'utf8', env: Object.assign({}, process.env, { PYTHONDONTWRITEBYTECODE: '1' }) });
const P = 'core1-producer/producer.js';
const MUT = [
  ['id del cliente usado como identidad de evaluación', P, 'ids.request_id = newRequestId();', 'ids.request_id = raw.request_id;'],
  ['campos de autoridad del cliente aceptados', P, "if (!CLIENT_FIELDS.includes(k)) return 'FORBIDDEN_FIELD';", ''],
  ['política: identidad no verificada basta', 'core1-producer/policy.js', 'p.verified === true && typeof p.id', 'typeof p.id'],
  ['política: usuario autenticado equivale a rol interno', 'core1-producer/policy.js', "scopes.includes(c.internalScope) && roles.some((r) => c.internalRoles.includes(r))", 'true'],
  ['política: público anónimo siempre permitido', 'core1-producer/policy.js', 'verified(principal) || c.publicAnonymous ?', 'true ?'],
  ['deriva entre lecturas ignorada', P, 'const drift = !sameRevisions(used, now_revs);', 'const drift = false;'],
  ['received_at sin prueba ignorado', P, "const unproven = eligible.some(", "const unproven = false && eligible.some("],
  ['perfil ambiguo no se detecta', P, "if (eligible.some((r) => digest(shape(r)) !== digest(shape(eligible[0])))) return null;", ''],
  ['FX incluida aunque no se use', P, 'let fx = null;\n  if (usesFx) {', 'let fx = null;\n  if (true) {'],
  ['concede reservar', P, 'const GRANTS = Object.freeze({ reserve: false,', 'const GRANTS = Object.freeze({ reserve: true,'],
  ['proyección interna declara autorización acreditada', P, "authz_accredited: false, calculation_status", "authz_accredited: true, calculation_status"],
  ['proyección interna copia valores externos', P, 'const pick = (v, list) => (list.includes(v) ? v : \'UNRECOGNIZED\');', 'const pick = (v, list) => v;'],
  ['revisión ausente aceptada', 'core1-producer/ports.js', "if (!rev(r.revision)) return", "if (false) return"],
  ['forma de puerto no validada', 'core1-producer/ports.js', "if (!isObj(r.data) || !shape(r.data)) return", "if (false) return"],
  ['puente no verifica huellas congeladas', 'core1-producer/bridge/core1_bridge.py.inert', 'if h != want:', 'if False:'],
  ['snapshot no se construye', P, 'if (prof) { ev.evaluation_snapshot', 'if (false) { ev.evaluation_snapshot'],
  ['fallo interno pasa como LISTO', P, "fail(ids, 'CONSULTAR', 'PRODUCER_INTERNAL_ERROR')", "fail(ids, 'LISTO', 'PRODUCER_INTERNAL_ERROR')"],
  ['multihabitación admitida', P, 'rq.rooms.length === 1 &&', 'rq.rooms.length >= 1 &&'],
  ['efecto de red en el código', P, '// Productor servidor de cotización', 'fetch("https://x"); // Productor servidor de cotización'],
  ['id de correlación sin sanear', P, ".replace(/[^A-Za-z0-9._:-]/g, '_')", ''],
];
let ok = 0; const total = MUT.length + 2; const fails = [];
let t = layout(); let r = run(t); fs.rmSync(t, { recursive: true, force: true }); if (r.status === 0) ok++; else fails.push('CONTROL positivo falló: ' + (r.stdout || '').split('\n').filter((l) => /FAIL/.test(l)).slice(0, 3).join(' | '));
t = layout(); fs.writeFileSync(path.join(t, 'core1-producer/tests/run_producer_tests.js'), "console.log('PRODUCTOR: 40/40 PASS');process.exit(3);\n"); r = run(t); fs.rmSync(t, { recursive: true, force: true }); if (r.status === 3) ok++; else fails.push('salida del proceso no se propaga');
for (const [name, rel, needle, repl] of MUT) {
  t = layout(); const f = path.join(t, rel); const src = fs.readFileSync(f, 'utf8');
  if (!src.includes(needle)) { fails.push(name + ' (objetivo de mutación ausente)'); fs.rmSync(t, { recursive: true, force: true }); continue; }
  fs.writeFileSync(f, src.replace(needle, repl)); r = run(t); fs.rmSync(t, { recursive: true, force: true });
  if (r.status !== 0) ok++; else fails.push(name + ' NO DETECTADA');
}
console.log(`INYECCIÓN DE FALLOS PRODUCTOR CORE1: ${ok}/${total} comportamientos esperados (${MUT.length} mutaciones + control positivo + propagación de salida)`);
for (const f of fails) console.log('FALLA:', f);
process.exit(fails.length ? 1 : 0);
