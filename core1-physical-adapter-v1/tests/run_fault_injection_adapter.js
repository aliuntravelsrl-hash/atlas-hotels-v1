'use strict';
// Inyección de fallos del adaptador físico: cada mutación de una COPIA temporal debe hacer fallar la suite (código != 0). Incluye control positivo y propagación del código de salida.
// Los mutantes equivalentes se declaran aparte y NO se cuentan como detectados.
const fs = require('fs'); const path = require('path'); const os = require('os'); const cp = require('child_process');
const root = path.join(__dirname, '..', '..'); const A = 'core1-physical-adapter-v1/adapter.js';
function layout() { const t = fs.mkdtempSync(path.join(os.tmpdir(), 'cpa-fault-')); for (const d of ['core1-physical-adapter-v1', 'core1-producer', 'core1-producer-v1.1', 'core1-price', 'kernel-v2.0.3', 'kernel-v2.0.4', 'kernel-v2.0.5', 'kernel-v2.0.6']) fs.cpSync(path.join(root, d), path.join(t, d), { recursive: true }); fs.cpSync(path.join(root, 'package.json'), path.join(t, 'package.json')); return t; }
const run = (t) => cp.spawnSync(process.execPath, [path.join(t, 'core1-physical-adapter-v1/tests/run_adapter_tests.js')], { encoding: 'utf8' });
const MUT = [
  ['drift: la relectura no bloquea (se evalúa y libera siempre)', A, 'if (same) {', 'if (true) {'],
  ['PA-R1: la hora de entrega es la hora cacheada (no fresca)', A, 'fresh = deps.clock();', 'fresh = times[0];'],
  ['PA-R1: se rejuvenece el cálculo (hora fresca también como computed_at)', A, 'return () => (i++ === 0 ? times[0] : fresh);', 'return () => fresh;'],
  ['PA-R1: reloj que lanza se sustituye por la hora cacheada', A, 'catch (e) { fresh = null; }', 'catch (e) { fresh = times[0]; }'],
  ['PA-R1: reloj que lanza se sustituye por una hora válida fija', A, 'catch (e) { fresh = null; }', "catch (e) { fresh = '2026-10-23T14:01:00Z'; }"],
  ['PA-R1: la proyección interna sobrevive a la referencia vencida', A, 'out.public.reasons.some((r) => TIME_CODES.includes(r))', 'false'],
  ['PA-R1: vencimiento no figura entre los códigos temporales', A, "['QUOTE_EXPIRED', 'NOW_INVALID', 'QUOTE_FROM_FUTURE']", "['NOW_INVALID', 'QUOTE_FROM_FUTURE']"],
  ['drift: la comprobación ignora el puerto de selección', A, "const same = !!cur && PORTS4.every((k) => typeof cur[k] === 'string' && cur[k] === st.pinned[k]);", "const same = !!cur && PORTS4.slice(1).every((k) => typeof cur[k] === 'string' && cur[k] === st.pinned[k]);"],
  ['drift: la comprobación ignora el último puerto (política)', A, "const same = !!cur && PORTS4.every((k) => typeof cur[k] === 'string' && cur[k] === st.pinned[k]);", "const same = !!cur && PORTS4.slice(0, 3).every((k) => typeof cur[k] === 'string' && cur[k] === st.pinned[k]);"],
  ['drift: relectura fallida cuenta como «sin cambio»', A, 'const same = !!cur &&', 'const same = !cur ||'],
  ['drift: tras relectura distinta se evalúa con la fijación como si coincidiera', A, 'return mkProducer(syncRepos(st, blocked), rid, clk).produce(input);', 'return mkProducer(syncRepos(st, st.pinned), rid, clk).produce(input);'],
  ['drift: relectura fallida reutiliza la fijación como actual', A, "cur && typeof cur[k] === 'string' ? cur[k] : null", 'st.pinned[k]'],
  ['rev: no exige inmutabilidad', A, ' && p.immutable === true', ''],
  ['rev: no exige retención', A, ' && p.retained === true', ''],
  ['rev: no exige fuente de la autoridad', A, ' && str(p.source_ref)', ''],
  ['rev: pin con puertos incompletos se acepta', A, '|| !PORTS4.every((k) => good(pin.ports[k]))', ''],
  ['aut: lecturas antes de autorizar', A, 'if (!sel) return first;', 'if (!sel) sel = { hotel_ref: input.request.hotel_ref, provider_plan_ref: input.request.provider_plan_ref, room_ref: input.request.rooms[0].room_ref };'],
  ['recepción: created_at/received_at sin recibo acreditado cuenta como PROVEN', A, "const proven = t.receipt === 'PROVEN' && str(t.receipt_ref) && typeof t.received_at === 'string';", "const proven = typeof t.received_at === 'string';"],
  ['recepción: no exige referencia de recibo', A, ' && str(t.receipt_ref)', ''],
  ['rango: convención ausente se asume', A, '|| ![\'TO_EXCLUSIVE\', \'TO_INCLUSIVE\'].includes(t.range_convention)', ''],
  ['rango: TO_INCLUSIVE no suma el día', A, "t.range_convention === 'TO_EXCLUSIVE' ? x.valid_to : addDay(x.valid_to)", 'x.valid_to'],
  ['capacidad: sin precedencia se escoge en divergencia', A, 'k !== c && !CAP_SOURCES.includes(src)', 'false'],
  ['capacidad: la columna elegida no se coteja', A, "if (phys !== prof.capacity.max_children) return 'SHAPE_INVALID'; }", '}'],
  ['capacidad: fuente de precedencia desconocida se acepta', A, "if (!CAP_SOURCES.includes(src)) return 'SHAPE_INVALID'; const phys", 'const phys'],
  ['perfil: regla de otro hotel no se detecta', A, "if (rr.some((x) => x.hotel_id !== room.hotel_id)) return 'SHAPE_INVALID';", ''],
  ['perfil: edades físicas divergentes de las bandas acreditadas', A, "if (rr.some((x) => x.child_max_age !== null && x.child_max_age !== undefined && x.child_max_age !== top)) return 'SHAPE_INVALID';", ''],
  ['perfil: bandas vacías aceptadas', A, '|| !prof.age_policy.bands.length', ''],
  ['perfil: adult_from_age no exigido', A, '!Number.isInteger(prof.age_policy.adult_from_age) || ', ''],
  ['tarifas: fila sin términos acreditados se omite', A, "if (!isObj(t)) return fail('UNAVAILABLE');", 'if (!isObj(t)) continue;'],
  ['tarifas: proveedor del término no exigido', A, '!str(t.provider_id) || ', ''],
  ['tarifas: base de precio no exigida', A, ' || !str(t.price_basis)', ''],
  ['tarifas: fila física de otro hotel aceptada', A, 'x.hotel_id !== a.hotel_id || !DATE.test', '!DATE.test'],
  ['selección: entradas ausentes del registro aceptadas', A, "if (!isObj(h) || !isObj(p) || !isObj(r)) return fail('NOT_FOUND');", ''],
  ['selección: registro incoherente consigo mismo', A, "if (p.hotel_ref !== a.hotel_ref || r.provider_plan_ref !== a.provider_plan_ref) return fail('SHAPE_INVALID');", ''],
  ['selección: map_hotel_id no exigido', A, 'r.map_hotel_id, ', ''],
  ['selección: producto no exigido', A, 'r.product, ', ''],
  ['selección: habitación física no coincide con el registro', A, 'ph.room.id !== r.room_type_id || ', ''],
  ['perfil físico: slug del perfil no se coteja', A, ' || ph.profile.hotel_slug !== ph.hotel.slug', ''],
  ['perfil: profile_version/fuente no exigidos', A, "if (!str(kp.profile_version) || !str(kp.source_ref)) return fail('REVISION_MISSING');", ''],
  ['política: fuente gobernada no exigida', A, 'if (!isObj(g.policy) || !str(g.source_ref))', 'if (!isObj(g.policy))'],
  ['frontera: las excepciones del lector se propagan', A, "catch (e) { return fail('UNAVAILABLE'); }", 'catch (e) { throw e; }'],
  ['reloj: cada ejecución interna toma una hora nueva', A, 'if (i >= times.length) times.push(deps.clock()); return times[i++];', 'return deps.clock();'],
  ['composición: la sinonimia/created_at/texto de depósito se consumen (política de depósito del texto físico)', 'core1-physical-adapter-v1/adapter.js', 'return { ok: true, data: g.policy };', 'return { ok: true, data: Object.assign({}, g.policy, { deposit_policy: { type: "FULL_PAYMENT" } }) };'],
];
// Equivalentes: el productor v1.1 ya produce la misma salida observable (no se cuentan como detectados).
const EQUIV = [
  ['PA-R1: retroceso del reloj no figura entre los códigos temporales (equivalente: el kernel ya RECHAZA sin proyección; defensa en profundidad)', A, "['QUOTE_EXPIRED', 'NOW_INVALID', 'QUOTE_FROM_FUTURE']", "['QUOTE_EXPIRED', 'NOW_INVALID']"],
  ['PA-R1: hora inválida no figura entre los códigos temporales (equivalente: el kernel ya RECHAZA sin proyección; defensa en profundidad)', A, "['QUOTE_EXPIRED', 'NOW_INVALID', 'QUOTE_FROM_FUTURE']", "['QUOTE_EXPIRED', 'QUOTE_FROM_FUTURE']"],
  ['formato de revisión en el adaptador (el productor v1.1 lo revalida y da el mismo CONTEXT_REVISION_MISSING)', A, 'REV.test(p.revision) &&', ''],
  ['estado desconocido crudo (el productor v1.1 lo reduce al catálogo CONTEXT_*; defensa en profundidad)', A, "PORT_STATUSES.includes(status) ? status : 'UNAVAILABLE'", 'status'],
  ['reutilizar el id de solicitud (la prueba inyecta un id constante)', A, 'if (rid.v === null) rid.v = deps.newRequestId();', 'rid.v = deps.newRequestId();'],
  ['fallo de puerto tras fijar: se evalúa igualmente (el productor repite el mismo fallo)', A, 'PORTS4.some((k) => !st.ports[k] || st.ports[k].ok !== true)', 'false'],
];
let ok = 0; const total = MUT.length + 2; const fails = [];
let t = layout(); let r = run(t); fs.rmSync(t, { recursive: true, force: true }); if (r.status === 0) ok++; else fails.push('CONTROL positivo falló: ' + (r.stdout || '').split('\n').filter((l) => /FAIL/.test(l)).slice(0, 2).join(' | '));
t = layout(); fs.writeFileSync(path.join(t, 'core1-physical-adapter-v1/tests/run_adapter_tests.js'), "console.log('ADAPTADOR 38/38 PASS; failing=[]');process.exit(3);\n"); r = run(t); fs.rmSync(t, { recursive: true, force: true }); if (r.status === 3) ok++; else fails.push('salida del proceso no se propaga');
for (const [name, rel, needle, repl] of MUT) {
  t = layout(); const f = path.join(t, rel); const src = fs.readFileSync(f, 'utf8');
  if (!src.includes(needle)) { fails.push(name + ' (objetivo de mutación ausente)'); fs.rmSync(t, { recursive: true, force: true }); continue; }
  fs.writeFileSync(f, src.replace(needle, repl)); r = run(t); fs.rmSync(t, { recursive: true, force: true });
  if (r.status !== 0) ok++; else fails.push(name + ' NO DETECTADA');
}
for (const [name, rel, needle, repl] of EQUIV) { t = layout(); const f = path.join(t, rel); const src = fs.readFileSync(f, 'utf8'); if (!src.includes(needle)) { fails.push(name + ' (objetivo de mutación ausente)'); fs.rmSync(t, { recursive: true, force: true }); continue; } fs.writeFileSync(f, src.replace(needle, repl)); r = run(t); fs.rmSync(t, { recursive: true, force: true }); console.log(r.status === 0 ? 'EQUIVALENTE (sobrevive, declarado, no contado como detectado): ' + name : 'equivalente detectado: ' + name); }
console.log(`INYECCIÓN DE FALLOS ADAPTADOR FÍSICO: ${ok}/${total} comportamientos esperados (${MUT.length} mutaciones + control positivo + propagación de salida)`);
for (const f of fails) console.log('FALLA:', f);
process.exit(fails.length ? 1 : 0);
