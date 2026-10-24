'use strict';
// Inyección de fallos del productor v1.1: cada mutación de una COPIA temporal debe hacer fallar la suite (código != 0). Incluye control positivo y propagación del código de salida.
// Corre 2 mutaciones en paralelo. PRODUCER_SKIP_HEAVY=1 omite en la copia las suites pesadas del kernel (ya cubiertas por su propia inyección).
const fs = require('fs'); const path = require('path'); const os = require('os'); const cp = require('child_process');
const root = path.join(__dirname, '..', '..'); const D = 'core1-producer-v1.1';
const DIRS = [D, 'kernel', 'kernel-v2', 'kernel-v2.0.1', 'kernel-v2.0.2', 'kernel-v2.0.3', 'tests', 'spec', 'scripts', 'fixtures', 'core1-price'];
function layout() { const t = fs.mkdtempSync(path.join(os.tmpdir(), 'c1prod-fault-')); for (const d of DIRS) fs.cpSync(path.join(root, d), path.join(t, d), { recursive: true, filter: (s) => !s.includes('__pycache__') }); fs.copyFileSync(path.join(root, 'package.json'), path.join(t, 'package.json')); return t; }
const run = (t) => new Promise((res) => { let out = ''; const c = cp.spawn(process.execPath, [path.join(t, D, 'tests/run_producer_tests.js')], { env: Object.assign({}, process.env, { PYTHONDONTWRITEBYTECODE: '1', PRODUCER_SKIP_HEAVY: '1' }) }); c.stdout.on('data', (d) => { out += d; }); c.on('close', (code) => res({ status: code, stdout: out })); });
const P = D + '/producer.js'; const PC = D + '/publicCodes.js'; const BR = D + '/bridge/bridge.js'; const PY = D + '/bridge/core1_bridge.py.inert';
const MUT = [   // [nombre, [[archivo, aguja, reemplazo], ...]]
  ['id del cliente usado como identidad de evaluación', [[P, 'ids.request_id = newRequestId();', 'ids.request_id = raw.request_id;']]],
  ['campos de autoridad del cliente aceptados', [[P, "if (!CLIENT_FIELDS.includes(k)) return 'FORBIDDEN_FIELD';", '']]],
  ['campos de autoridad en habitaciones aceptados', [[P, "if (!ROOM_FIELDS.includes(k)) return 'FORBIDDEN_FIELD';", '']]],
  ['política: identidad no verificada basta', [[D + '/policy.js', 'p.verified === true && typeof p.id', 'typeof p.id']]],
  ['política: usuario autenticado equivale a rol interno', [[D + '/policy.js', 'scopes.includes(c.internalScope) && roles.some((r) => c.internalRoles.includes(r))', 'true']]],
  ['política: público anónimo siempre permitido', [[D + '/policy.js', 'verified(principal) || c.publicAnonymous ?', 'true ?']]],
  ['deriva entre lecturas ignorada', [[P, 'const drift = !sameRevisions(used, now_revs);', 'const drift = false;']]],
  ['received_at sin prueba ignorado', [[P, 'const unproven = used_rows.rows.some(', 'const unproven = false && used_rows.rows.some(']]],
  ['perfil ambiguo entre filas usadas no se detecta', [[P, 'if (eligible.some((r) => digest(shape(r)) !== digest(shape(eligible[0])))) return null;', '']]],
  ['FX incluida aunque no se use', [[P, 'let fx = null;\n  if (usesFx) {', 'let fx = null;\n  if (true) {']]],
  ['concede reservar', [[P, 'const GRANTS = Object.freeze({ reserve: false,', 'const GRANTS = Object.freeze({ reserve: true,']]],
  ['proyección interna declara autorización acreditada', [[P, 'authz_accredited: false, calculation_status', 'authz_accredited: true, calculation_status']]],
  ['proyección interna copia valores externos', [[P, "const pick = (v, list) => (list.includes(v) ? v : 'UNRECOGNIZED');", 'const pick = (v, list) => v;']]],
  ['revisión ausente aceptada', [[D + '/ports.js', 'if (!rev(r.revision)) return', 'if (false) return']]],
  ['forma de puerto no validada', [[D + '/ports.js', 'if (!isObj(r.data) || !shape(r.data)) return', 'if (false) return']]],
  ['puente no verifica huellas congeladas', [[PY, 'if h != want:', 'if False:']]],
  ['snapshot no se construye', [[P, 'if (prof) { ev.evaluation_snapshot', 'if (false) { ev.evaluation_snapshot']]],
  ['fallo interno pasa como LISTO', [[P, "fail(ids, 'CONSULTAR', 'PRODUCER_INTERNAL_ERROR', 'producer')", "fail(ids, 'LISTO', 'PRODUCER_INTERNAL_ERROR', 'producer')"]]],
  ['multihabitación admitida', [[P, 'rq.rooms.length === 1 &&', 'rq.rooms.length >= 1 &&']]],
  ['efecto de red en el código', [[P, '// Productor servidor de cotización', 'fetch("https://x"); // Productor servidor de cotización']]],
  ['id de correlación sin sanear', [[P, ".replace(/[^A-Za-z0-9._:-]/g, '_')", '']]],
  // OBS-222 P-R1
  ['P-R1: código por frontera pasa si tiene formato válido', [[PC, "typeof code === 'string' && b.codes.has(code) ? code : b.fallback", "typeof code === 'string' && /^[A-Z0-9_]+$/.test(code) ? code : b.fallback"]]],
  ['P-R1: motivos públicos sin catálogo', [[PC, "(typeof code === 'string' && (PRODUCER.has(code) || KERNEL.has(code)) ? code : BOUNDARY.kernel.fallback)", "(typeof code === 'string' ? code : BOUNDARY.kernel.fallback)"]]],
  ['P-R1: actor fuera de catálogo aceptado', [[P, '(auth0.actor === null || INTERNAL_ACTORS.includes(auth0.actor))', 'true']]],
  ['P-R1: propuesta sin catálogo', [[PC, 'const proposal = (p) => (PROPOSALS.has(p) ? p : \'NO_PREPARADA\');', 'const proposal = (p) => p;']]],
  // OBS-222 P-R3
  ['P-R3: se usan todas las filas elegibles en vez de las usadas', [[P, 'const used_rows = usedRows(q, eligible);', 'const used_rows = { rows: eligible, profileRows: eligible, verified: true };']]],
  ['P-R3: fila usada inexistente se omite', [[P, 'if (!r) return { rows: [], profileRows: [], verified: false }; if (!rows.includes(r)) rows.push(r); }', 'if (!r) continue; if (!rows.includes(r)) rows.push(r); }']]],
  ['P-R3: trazabilidad vacía aceptada', [[P, 'if (!tr || !tr.length) return { rows: [], profileRows: [], verified: false };', 'if (!tr) return { rows: [], profileRows: [], verified: false };']]],
  // OBS-222 P-R2
  ['P-R2: el puente escribe bytecode', [[BR, "['-I', '-B', SCRIPT]", "['-I', SCRIPT]"], [BR, "PYTHONDONTWRITEBYTECODE: '1'", "PYTHONDONTWRITEBYTECODE: ''"], [PY, 'sys.dont_write_bytecode = True', 'sys.dont_write_bytecode = False']]],
];
const pool = async (items, n, f) => { const q = items.slice(); const out = []; await Promise.all(Array.from({ length: n }, async () => { while (q.length) { const it = q.shift(); out.push(await f(it)); } })); return out; };
(async () => {
  const total = MUT.length + 2; let ok = 0; const fails = [];
  let t = layout(); let r = await run(t); fs.rmSync(t, { recursive: true, force: true }); if (r.status === 0) ok++; else fails.push('CONTROL positivo falló: ' + r.stdout.split('\n').filter((l) => /FAIL/.test(l)).slice(0, 3).join(' | '));
  t = layout(); fs.writeFileSync(path.join(t, D, 'tests/run_producer_tests.js'), "console.log('PRODUCTOR: 56/56 PASS');process.exit(3);\n"); r = await run(t); fs.rmSync(t, { recursive: true, force: true }); if (r.status === 3) ok++; else fails.push('salida del proceso no se propaga');
  const res = await pool(MUT, 2, async ([name, edits]) => {
    const t2 = layout(); try {
      for (const [rel, needle, repl] of edits) { const f = path.join(t2, rel); const src = fs.readFileSync(f, 'utf8'); if (!src.includes(needle)) return { name, bad: ' (objetivo de mutación ausente: ' + rel + ')' }; fs.writeFileSync(f, src.replace(needle, repl)); }
      const rr = await run(t2); return rr.status !== 0 ? { name, ok: true } : { name, bad: ' NO DETECTADA' };
    } finally { fs.rmSync(t2, { recursive: true, force: true }); }
  });
  for (const x of res) { if (x.ok) ok++; else fails.push(x.name + x.bad); }
  console.log(`INYECCIÓN DE FALLOS PRODUCTOR CORE1 v1.1: ${ok}/${total} comportamientos esperados (${MUT.length} mutaciones + control positivo + propagación de salida)`);
  for (const f of fails) console.log('FALLA:', f);
  process.exit(fails.length ? 1 : 0);
})();
