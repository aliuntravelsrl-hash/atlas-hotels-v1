'use strict';
// Inyección de fallos del kernel v2.0.4: cada mutación de una COPIA temporal debe hacer fallar la suite (código != 0). Incluye control positivo y fallo del proceso.
const fs = require('fs'); const path = require('path'); const os = require('os'); const cp = require('child_process');
const root = path.join(__dirname, '..', '..');
function layout() { const t = fs.mkdtempSync(path.join(os.tmpdir(), 'kv204-fault-')); for (const d of ['kernel', 'tests', 'spec', 'scripts', 'fixtures', 'kernel-v2', 'kernel-v2.0.1', 'kernel-v2.0.2', 'kernel-v2.0.3', 'kernel-v2.0.4', 'kernel-probes']) fs.cpSync(path.join(root, d), path.join(t, d), { recursive: true }); fs.mkdirSync(path.join(t, 'core1-price'), { recursive: true }); fs.cpSync(path.join(root, 'core1-price/custody'), path.join(t, 'core1-price/custody'), { recursive: true }); fs.copyFileSync(path.join(root, 'package.json'), path.join(t, 'package.json')); return t; }
const run = (t) => cp.spawnSync(process.execPath, [path.join(t, 'kernel-v2.0.4/tests/run_kernel_v204_tests.js')], { encoding: 'utf8' });
const P = 'kernel-v2.0.4/priceReadiness.js';
const MUT = [
  ['K2-R1: no vincula adultos', P, "if (r.adults_requested !== room.adults) return 'BINDING_ADULTS';", ''],
  ['K2-R1: no vincula moneda', P, "if (dto.price.reference_total.currency !== rq.payment_currency) return 'BINDING_CURRENCY';", ''],
  ['K2-R1: acepta multihabitación', 'kernel-v2.0.4/contracts.js', "if (rq.rooms.length !== 1) return", "if (false) return"],
  ['K2-R2: ignora vencimiento', P, "if (now >= vu) reasons.push('QUOTE_EXPIRED');", ''],
  ['K2-R2: reloj sin zona aceptado', 'kernel-v2.0.4/validators.js', "(Z|[+-]\\d{2}:\\d{2})$/;", "(Z|[+-]\\d{2}:\\d{2})?$/;"],
  ['K2-R3: FX no verificada pasa', P, "if (!view) { reasons.push('FX_APPLICABILITY_UNVERIFIED');", "if (!view) { "],
  ['K2-R3: autoridad solo por etiqueta', P, "|| !auth.includes(fx.approved_by_ref)", ""],
  ['K2-R3: ventana FX no ligada a la cotización', P, "!(from <= at && at < until && vu <= until)", "false"],
  ['K2-R4: DTO abierto en reference_total', 'kernel-v2.0.4/contracts.js', "e = V.closed(d.price.reference_total, ['amount', 'currency'], ['amount', 'currency']); if (e)", "e = null; if (e)"],
  ['K2-R4: importe sin validar', 'kernel-v2.0.4/validators.js', "&& Number(s) > 0; // importe", "; // importe"],
  ['K2-R4: moneda no admitida', 'kernel-v2.0.4/validators.js', "const isCurrency = (s) => CURRENCIES.includes(s);", "const isCurrency = (s) => typeof s === 'string';"],
  ['K2-R5: usa conteos solicitados y no efectivos', P, "const occ = OCCUPANCY_BY_ADULTS[effAdults];", "const occ = OCCUPANCY_BY_ADULTS[room.adults];"],
  ['K2-R5: ignora divergencia de perfil', P, "reasons.push('PROFILE_RECLASSIFICATION_DIVERGES'); // dato local", "void 0; // dato local"],
  ['K2-R5: ignora reclasificación de la vista interna', P, "!== adultsByAge) reasons.push('PROFILE_RECLASSIFICATION_DIVERGES');\n", "!== adultsByAge) void 0;\n"],
  ['K2-R6: acepta cadenas vacías', 'kernel-v2.0.4/validators.js', "const isStr = (s) => typeof s === 'string' && s.trim().length > 0;", "const isStr = (s) => typeof s === 'string';"],
  ['K2-R6: FREE sin procedencia', P, "if (!V.isProv(rule.origin) || !V.isProv(rule.version)) {", "if (false) {"],
  ['K2-R7: concede reservar', 'kernel-v2.0.4/enablementProposal.js', "reserve: false, collect: false, confirm: false });", "reserve: true, collect: false, confirm: false });"],
  ['G1: no compara huella de solicitud (edades exactas)', 'kernel-v2.0.4/snapshot.js', "if (sn.request_digest !== digest(requestCanonical(rq)))", "if (false)"],
  ['G1: no compara el hotel local', 'kernel-v2.0.4/snapshot.js', "!== rq.hotel_ref) { out.fatal = 'LOCAL_PROFILE_HOTEL_MISMATCH'", "!== valueOf(hotel && hotel.hotel_ref, VAL.text)) { out.fatal = 'LOCAL_PROFILE_HOTEL_MISMATCH'"],
  ['G1: snapshot ausente no limita', 'kernel-v2.0.4/snapshot.js', "out.reasons.push('EVALUATION_SNAPSHOT_ABSENT');", "void 0;"],
  ['G1: no compara huella del DTO', 'kernel-v2.0.4/snapshot.js', "if (sn.dto_fingerprint !== quote.public_dto.fingerprint)", "if (false)"],
  ['G1: no compara identidad del perfil usado', 'kernel-v2.0.4/snapshot.js', "if (p.hotel_ref !== rq.hotel_ref || p.provider_plan_ref !== rq.provider_plan_ref || p.room_ref !== room.room_ref)", "if (false)"],
  ['G1: ignora divergencia de perfil local', 'kernel-v2.0.4/snapshot.js', "const diverge = (c) => { if (!out.reasons.includes(c)) out.reasons.push(c); };", "const diverge = () => {};"],
  ['G1: no compara huella de vista interna', 'kernel-v2.0.4/snapshot.js', "sn.internal_view_digest !== digest(quote.internal_view)", "false"],
  ['G2: motivo externo pasa tal cual', P, "known ? 'CORE1_' + dto.reason : 'CORE1_REASON_UNRECOGNIZED'", "'CORE1_' + dto.reason"],
  ['G2: promedio sin validar tasa', 'kernel-v2.0.4/contracts.js', " || a.is_rate !== false) return err('DTO.average:VALORES_INVALIDOS')", ") return err('DTO.average:VALORES_INVALIDOS')"],
  ['G2: estado de reserva fuera de catálogo', 'kernel-v2.0.4/contracts.js', "if (!CAT.BOOKING_STATUS.includes(d.booking_enablement.status)) return err('DTO.booking_enablement.status');", ""],
  ['G2: canal sin catálogo', 'kernel-v2.0.4/contracts.js', "|| !CAT.CHANNEL_MODES.includes(d.channel.mode)", ""],
  ['G2: unidad sin catálogo', 'kernel-v2.0.4/contracts.js', "if (!CAT.UNIT.includes(d.price.unit)) return err('DTO.price.unit');", ""],
  ['G2: salida pública sin filtro de códigos', 'kernel-v2.0.4/index.js', "reasons: r.B.reasons.map(safeCode)", "reasons: r.B.reasons.slice()"],
  ['OBS-218: no compara la huella completa del DTO', 'kernel-v2.0.4/snapshot.js', "if (sn.dto_digest !== digest(quote.public_dto))", "if (false)"],
  ['OBS-218: huella del DTO opcional en la forma', 'kernel-v2.0.4/snapshot.js', "'request_digest', 'dto_digest', 'dto_fingerprint',", "'request_digest', 'dto_fingerprint',"],
  ['OBS-218: huella del DTO sin formato hex', 'kernel-v2.0.4/snapshot.js', "![sn.request_digest, sn.dto_digest,", "![sn.request_digest,"],
  ['OBS-218: contrato antiguo no se limita', 'kernel-v2.0.4/snapshot.js', "if (OLD_VERSIONS.includes(sn.snapshot_version)) {", "if (false) {"],
  ['index: fallo interno pasa como LISTO', 'kernel-v2.0.4/index.js', "B = { verdict: 'RECHAZADO', reasons: ['EVALUATION_ERROR'], applicable: [], not_applicable: [] }", "B = { verdict: 'LISTO', reasons: [], applicable: [], not_applicable: [] }"],
  ['index: cualquier actor ve la vista interna', 'kernel-v2.0.4/index.js', "INTERNAL_ACTORS.includes(ctx.actor)", "true"],
  ['E: sin validar calculation_status', 'kernel-v2.0.4/contracts.js', "if (!CAT.inCatalog(CAT.CALCULATION_STATUS, v.calculation_status)) return err('VIEW.calculation_status');", ''],
  ['E: sin validar provider_amount_status', 'kernel-v2.0.4/contracts.js', "if (!CAT.inCatalog(CAT.PROVIDER_AMOUNT_STATUS, v.provider_amount_status)) return err('VIEW.provider_amount_status');", ''],
  ['E: catálogo calculation_status admite centinela', 'kernel-v2.0.4/catalog.js', "const CALCULATION_STATUS = Object.freeze(['COMPLETE', 'SOURCE_SUBTOTAL_ONLY', 'INCOMPLETE', 'INVALID']);", "const CALCULATION_STATUS = Object.freeze(['COMPLETE', 'SOURCE_SUBTOTAL_ONLY', 'INCOMPLETE', 'INVALID', 'SYNTH_PROBE_VALUE']);"],
  ['E: catálogo provider_amount_status admite centinela', 'kernel-v2.0.4/catalog.js', "const PROVIDER_AMOUNT_STATUS = Object.freeze(['ACCREDITED', 'NOT_ACCREDITED_CLIENT_FINAL', 'NOT_ACCREDITED_MIXED', 'NOT_ACCREDITED_UNKNOWN', 'NOT_ACCREDITED_NOT_EVALUATED']);", "const PROVIDER_AMOUNT_STATUS = Object.freeze(['ACCREDITED', 'NOT_ACCREDITED_CLIENT_FINAL', 'NOT_ACCREDITED_MIXED', 'NOT_ACCREDITED_UNKNOWN', 'NOT_ACCREDITED_NOT_EVALUATED', 'SYNTH_PROBE_VALUE']);"],
  ['E: comparación normaliza mayúsculas y espacios', 'kernel-v2.0.4/catalog.js', "typeof v === 'string' && list.includes(v);", "typeof v === 'string' && list.includes(v.trim().toUpperCase());"],
  ['E: comparación coacciona el tipo', 'kernel-v2.0.4/catalog.js', "typeof v === 'string' && list.includes(v);", 'list.includes(String(v));'],
  ['E: catálogo calculation_status sin COMPLETE', 'kernel-v2.0.4/catalog.js', "const CALCULATION_STATUS = Object.freeze(['COMPLETE', 'SOURCE_SUBTOTAL_ONLY', 'INCOMPLETE', 'INVALID']);", "const CALCULATION_STATUS = Object.freeze(['SOURCE_SUBTOTAL_ONLY', 'INCOMPLETE', 'INVALID']);"],
  ['E: catálogo calculation_status sin SOURCE_SUBTOTAL_ONLY', 'kernel-v2.0.4/catalog.js', "const CALCULATION_STATUS = Object.freeze(['COMPLETE', 'SOURCE_SUBTOTAL_ONLY', 'INCOMPLETE', 'INVALID']);", "const CALCULATION_STATUS = Object.freeze(['COMPLETE', 'INCOMPLETE', 'INVALID']);"],
  ['E: catálogo calculation_status sin INCOMPLETE', 'kernel-v2.0.4/catalog.js', "const CALCULATION_STATUS = Object.freeze(['COMPLETE', 'SOURCE_SUBTOTAL_ONLY', 'INCOMPLETE', 'INVALID']);", "const CALCULATION_STATUS = Object.freeze(['COMPLETE', 'SOURCE_SUBTOTAL_ONLY', 'INVALID']);"],
  ['E: catálogo calculation_status sin INVALID', 'kernel-v2.0.4/catalog.js', "const CALCULATION_STATUS = Object.freeze(['COMPLETE', 'SOURCE_SUBTOTAL_ONLY', 'INCOMPLETE', 'INVALID']);", "const CALCULATION_STATUS = Object.freeze(['COMPLETE', 'SOURCE_SUBTOTAL_ONLY', 'INCOMPLETE']);"],
  ['E: catálogo provider_amount_status sin ACCREDITED', 'kernel-v2.0.4/catalog.js', "const PROVIDER_AMOUNT_STATUS = Object.freeze(['ACCREDITED', 'NOT_ACCREDITED_CLIENT_FINAL', 'NOT_ACCREDITED_MIXED', 'NOT_ACCREDITED_UNKNOWN', 'NOT_ACCREDITED_NOT_EVALUATED']);", "const PROVIDER_AMOUNT_STATUS = Object.freeze(['NOT_ACCREDITED_CLIENT_FINAL', 'NOT_ACCREDITED_MIXED', 'NOT_ACCREDITED_UNKNOWN', 'NOT_ACCREDITED_NOT_EVALUATED']);"],
  ['E: catálogo provider_amount_status sin NOT_ACCREDITED_CLIENT_FINAL', 'kernel-v2.0.4/catalog.js', "const PROVIDER_AMOUNT_STATUS = Object.freeze(['ACCREDITED', 'NOT_ACCREDITED_CLIENT_FINAL', 'NOT_ACCREDITED_MIXED', 'NOT_ACCREDITED_UNKNOWN', 'NOT_ACCREDITED_NOT_EVALUATED']);", "const PROVIDER_AMOUNT_STATUS = Object.freeze(['ACCREDITED', 'NOT_ACCREDITED_MIXED', 'NOT_ACCREDITED_UNKNOWN', 'NOT_ACCREDITED_NOT_EVALUATED']);"],
  ['E: catálogo provider_amount_status sin NOT_ACCREDITED_MIXED', 'kernel-v2.0.4/catalog.js', "const PROVIDER_AMOUNT_STATUS = Object.freeze(['ACCREDITED', 'NOT_ACCREDITED_CLIENT_FINAL', 'NOT_ACCREDITED_MIXED', 'NOT_ACCREDITED_UNKNOWN', 'NOT_ACCREDITED_NOT_EVALUATED']);", "const PROVIDER_AMOUNT_STATUS = Object.freeze(['ACCREDITED', 'NOT_ACCREDITED_CLIENT_FINAL', 'NOT_ACCREDITED_UNKNOWN', 'NOT_ACCREDITED_NOT_EVALUATED']);"],
  ['E: catálogo provider_amount_status sin NOT_ACCREDITED_UNKNOWN', 'kernel-v2.0.4/catalog.js', "const PROVIDER_AMOUNT_STATUS = Object.freeze(['ACCREDITED', 'NOT_ACCREDITED_CLIENT_FINAL', 'NOT_ACCREDITED_MIXED', 'NOT_ACCREDITED_UNKNOWN', 'NOT_ACCREDITED_NOT_EVALUATED']);", "const PROVIDER_AMOUNT_STATUS = Object.freeze(['ACCREDITED', 'NOT_ACCREDITED_CLIENT_FINAL', 'NOT_ACCREDITED_MIXED', 'NOT_ACCREDITED_NOT_EVALUATED']);"],
  ['E: catálogo provider_amount_status sin NOT_ACCREDITED_NOT_EVALUATED', 'kernel-v2.0.4/catalog.js', "const PROVIDER_AMOUNT_STATUS = Object.freeze(['ACCREDITED', 'NOT_ACCREDITED_CLIENT_FINAL', 'NOT_ACCREDITED_MIXED', 'NOT_ACCREDITED_UNKNOWN', 'NOT_ACCREDITED_NOT_EVALUATED']);", "const PROVIDER_AMOUNT_STATUS = Object.freeze(['ACCREDITED', 'NOT_ACCREDITED_CLIENT_FINAL', 'NOT_ACCREDITED_MIXED', 'NOT_ACCREDITED_UNKNOWN']);"],
  ['E: lector ignora el rechazo de la vista interna', 'kernel-v2.0.4/priceReadiness.js', "if (!vv.ok) return reject(vv.code || 'INTERNAL_VIEW_SHAPE_INVALID'); ", ''],
  ['E: motivo de rechazo interpola el valor recibido', 'kernel-v2.0.4/priceReadiness.js', "reject(vv.code || 'INTERNAL_VIEW_SHAPE_INVALID')", "reject(vv.code || ('INTERNAL_VIEW_SHAPE_INVALID:' + String(quote.internal_view.calculation_status) + String(quote.internal_view.provider_amount_status)))"],
];
// Equivalentes por observable público/interno: el rechazo ya ocurre en el lector y la proyección interna solo se emite si B no es RECHAZADO. Se declaran, NO se cuentan como detectadas.
const EQUIV = [['E: la proyección interna omite validateInternalView (equivalente)', 'kernel-v2.0.4/index.js', 'quote.internal_view && C.validateInternalView(quote.internal_view).ok', 'quote.internal_view']];
let ok = 0; const total = MUT.length + 2; const fails = [];
let t = layout(); let r = run(t); fs.rmSync(t, { recursive: true, force: true }); if (r.status === 0) ok++; else fails.push('CONTROL positivo falló');
t = layout(); fs.writeFileSync(path.join(t, 'kernel-v2.0.4/tests/run_kernel_v204_tests.js'), "console.log('KERNEL V2.0.4 (modelo/simulación offline): 101/101 PASS; failing=[]');process.exit(3);\n"); r = run(t); fs.rmSync(t, { recursive: true, force: true }); if (r.status === 3) ok++; else fails.push('salida del proceso no se propaga');
for (const [name, rel, needle, repl] of MUT) {
  t = layout(); const f = path.join(t, rel); const src = fs.readFileSync(f, 'utf8');
  if (!src.includes(needle)) { fails.push(name + ' (objetivo de mutación ausente)'); fs.rmSync(t, { recursive: true, force: true }); continue; }
  fs.writeFileSync(f, src.replace(needle, repl)); r = run(t); fs.rmSync(t, { recursive: true, force: true });
  if (r.status !== 0) ok++; else fails.push(name + ' NO DETECTADA');
}
for (const [name, rel, needle, repl] of EQUIV) { t = layout(); const f = path.join(t, rel); const src = fs.readFileSync(f, 'utf8'); if (!src.includes(needle)) { fails.push(name + ' (objetivo de mutación ausente)'); fs.rmSync(t, { recursive: true, force: true }); continue; } fs.writeFileSync(f, src.replace(needle, repl)); r = run(t); fs.rmSync(t, { recursive: true, force: true }); console.log(r.status === 0 ? 'EQUIVALENTE (sobrevive, declarado, no contado como detectado): ' + name : 'equivalente detectado: ' + name); }
console.log(`INYECCIÓN DE FALLOS KERNEL V2.0.4: ${ok}/${total} comportamientos esperados (${MUT.length} mutaciones + control positivo + propagación de salida)`);
for (const f of fails) console.log('FALLA:', f);
process.exit(fails.length ? 1 : 0);
