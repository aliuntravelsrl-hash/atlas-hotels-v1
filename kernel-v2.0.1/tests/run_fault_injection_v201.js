'use strict';
// Inyección de fallos del kernel v2.0.1: cada mutación de una COPIA temporal debe hacer fallar la suite (código != 0). Incluye control positivo y fallo del proceso.
const fs = require('fs'); const path = require('path'); const os = require('os'); const cp = require('child_process');
const root = path.join(__dirname, '..', '..');
function layout() { const t = fs.mkdtempSync(path.join(os.tmpdir(), 'kv201-fault-')); for (const d of ['kernel', 'tests', 'spec', 'scripts', 'fixtures', 'kernel-v2', 'kernel-v2.0.1']) fs.cpSync(path.join(root, d), path.join(t, d), { recursive: true }); fs.mkdirSync(path.join(t, 'core1-price'), { recursive: true }); fs.cpSync(path.join(root, 'core1-price/custody'), path.join(t, 'core1-price/custody'), { recursive: true }); fs.copyFileSync(path.join(root, 'package.json'), path.join(t, 'package.json')); return t; }
const run = (t) => cp.spawnSync(process.execPath, [path.join(t, 'kernel-v2.0.1/tests/run_kernel_v201_tests.js')], { encoding: 'utf8' });
const P = 'kernel-v2.0.1/priceReadiness.js';
const MUT = [
  ['K2-R1: no vincula adultos', P, "if (r.adults_requested !== room.adults) return 'BINDING_ADULTS';", ''],
  ['K2-R1: no vincula moneda', P, "if (dto.price.reference_total.currency !== rq.payment_currency) return 'BINDING_CURRENCY';", ''],
  ['K2-R1: acepta multihabitación', 'kernel-v2.0.1/contracts.js', "if (rq.rooms.length !== 1) return", "if (false) return"],
  ['K2-R2: ignora vencimiento', P, "if (now >= vu) reasons.push('QUOTE_EXPIRED');", ''],
  ['K2-R2: reloj sin zona aceptado', 'kernel-v2.0.1/validators.js', "(Z|[+-]\\d{2}:\\d{2})$/;", "(Z|[+-]\\d{2}:\\d{2})?$/;"],
  ['K2-R3: FX no verificada pasa', P, "if (!view) { reasons.push('FX_APPLICABILITY_UNVERIFIED');", "if (!view) { "],
  ['K2-R3: autoridad solo por etiqueta', P, "|| !auth.includes(fx.approved_by_ref)", ""],
  ['K2-R3: ventana FX no ligada a la cotización', P, "!(from <= at && at < until && vu <= until)", "false"],
  ['K2-R4: DTO abierto en reference_total', 'kernel-v2.0.1/contracts.js', "e = V.closed(d.price.reference_total, ['amount', 'currency'], ['amount', 'currency']); if (e)", "e = null; if (e)"],
  ['K2-R4: importe sin validar', 'kernel-v2.0.1/validators.js', "&& Number(s) > 0; // importe", "; // importe"],
  ['K2-R4: moneda no admitida', 'kernel-v2.0.1/validators.js', "const isCurrency = (s) => CURRENCIES.includes(s);", "const isCurrency = (s) => typeof s === 'string';"],
  ['K2-R5: usa conteos solicitados y no efectivos', P, "const occ = OCCUPANCY_BY_ADULTS[effAdults];", "const occ = OCCUPANCY_BY_ADULTS[room.adults];"],
  ['K2-R5: ignora divergencia de perfil', P, "reasons.push('PROFILE_RECLASSIFICATION_DIVERGES'); // dato local", "void 0; // dato local"],
  ['K2-R5: ignora reclasificación de la vista interna', P, "!== adultsByAge) reasons.push('PROFILE_RECLASSIFICATION_DIVERGES');\n", "!== adultsByAge) void 0;\n"],
  ['K2-R6: acepta cadenas vacías', 'kernel-v2.0.1/validators.js', "const isStr = (s) => typeof s === 'string' && s.trim().length > 0;", "const isStr = (s) => typeof s === 'string';"],
  ['K2-R6: FREE sin procedencia', P, "if (!V.isProv(rule.origin) || !V.isProv(rule.version)) {", "if (false) {"],
  ['K2-R7: concede reservar', 'kernel-v2.0.1/enablementProposal.js', "reserve: false, collect: false, confirm: false });", "reserve: true, collect: false, confirm: false });"],
  ['index: fallo interno pasa como LISTO', 'kernel-v2.0.1/index.js', "B = { verdict: 'RECHAZADO', reasons: ['EVALUATION_ERROR'], applicable: [], not_applicable: [] }", "B = { verdict: 'LISTO', reasons: [], applicable: [], not_applicable: [] }"],
  ['index: cualquier actor ve la vista interna', 'kernel-v2.0.1/index.js', "INTERNAL_ACTORS.includes(ctx.actor)", "true"],
];
let ok = 0; const total = MUT.length + 2; const fails = [];
let t = layout(); let r = run(t); fs.rmSync(t, { recursive: true, force: true }); if (r.status === 0) ok++; else fails.push('CONTROL positivo falló');
t = layout(); fs.writeFileSync(path.join(t, 'kernel-v2.0.1/tests/run_kernel_v201_tests.js'), "console.log('KERNEL V2.0.1 (modelo/simulación offline): 61/61 PASS; failing=[]');process.exit(3);\n"); r = run(t); fs.rmSync(t, { recursive: true, force: true }); if (r.status === 3) ok++; else fails.push('salida del proceso no se propaga');
for (const [name, rel, needle, repl] of MUT) {
  t = layout(); const f = path.join(t, rel); const src = fs.readFileSync(f, 'utf8');
  if (!src.includes(needle)) { fails.push(name + ' (objetivo de mutación ausente)'); fs.rmSync(t, { recursive: true, force: true }); continue; }
  fs.writeFileSync(f, src.replace(needle, repl)); r = run(t); fs.rmSync(t, { recursive: true, force: true });
  if (r.status !== 0) ok++; else fails.push(name + ' NO DETECTADA');
}
console.log(`INYECCIÓN DE FALLOS KERNEL V2.0.1: ${ok}/${total} comportamientos esperados (${MUT.length} mutaciones + control positivo + propagación de salida)`);
for (const f of fails) console.log('FALLA:', f);
process.exit(fails.length ? 1 : 0);
