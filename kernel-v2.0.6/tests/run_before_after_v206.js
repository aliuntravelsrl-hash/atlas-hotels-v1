'use strict';
// Antes/después v2.0.5 → v2.0.6 sobre las consultas sintéticas × 7 variantes de snapshot (evidencia NUEVA y medida, no histórica). Código != 0 si el delta no es exactamente el autorizado.
const assert = require('assert'); const fs = require('fs'); const path = require('path'); const root = path.join(__dirname, '..', '..');
const K5 = require(path.join(root, 'kernel-v2.0.5')), K6 = require(path.join(root, 'kernel-v2.0.6'));
const hotel = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'hotel_synthetic.json')));
const QS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'paired-quotes.json'))).quotes.filter((q) => q.public_dto.status !== 'PRICE_REFERENCE' && q.name !== 'enum_invalid_probe');
const V = { presente: () => {}, ausente_propiedad: (q) => { delete q.context_evidence.evaluation_snapshot; }, contexto_null: (q) => { q.context_evidence = null; }, snapshot_null: (q) => { q.context_evidence.evaluation_snapshot = null; }, snapshot_v1: (q) => { q.context_evidence.evaluation_snapshot.snapshot_version = 'EVAL-SNAPSHOT-v1'; }, version_desconocida: (q) => { q.context_evidence.evaluation_snapshot.snapshot_version = 'x'; }, malformado: (q) => { delete q.context_evidence.evaluation_snapshot.dto_digest; } };
const EXP = { presente: null, ausente_propiedad: 'CONSULTAR+ABSENT,internal=no', contexto_null: 'CONSULTAR+ABSENT,internal=no', snapshot_null: 'RECHAZADO SNAPSHOT_SHAPE_INVALID', snapshot_v1: 'RECHAZADO EVALUATION_SNAPSHOT_CONTRACT_OUTDATED', version_desconocida: 'RECHAZADO SNAPSHOT_SHAPE_INVALID', malformado: 'RECHAZADO SNAPSHOT_SHAPE_INVALID' };
const sig = (r) => r.B.verdict + '|' + r.B.reasons.join(',') + '|internal=' + (r.internal ? 'sí' : 'no'); const table = {}; let n = 0, changed = 0; const fails = [];
for (const q0 of QS) for (const [vn, f] of Object.entries(V)) { const q = JSON.parse(JSON.stringify(q0)); f(q); const qq = { public_dto: q.public_dto, internal_view: q.internal_view, context_evidence: q.context_evidence };
  const run = (K) => sig(K.evaluate(hotel, q.request, qq, { now: '2026-10-23T14:10:00Z', fx_authorities: ['SYNTH-APPROVER'], actor: 'OPERATOR' })); const a = run(K5), b = run(K6); n++;
  const kind = b.startsWith('RECHAZADO') ? 'RECHAZADO ' + b.split('|')[1] : (b.includes('EVALUATION_SNAPSHOT_ABSENT') ? 'CONSULTAR+ABSENT,' + b.split('|')[2] : 'sin cambio de forma');
  if (a !== b) changed++; if (EXP[vn] === null) { if (a !== b) fails.push(vn + ' cambió'); } else if (kind !== EXP[vn]) fails.push(vn + ' ' + q0.name + ': ' + b); if (vn !== 'presente' && !a.includes('internal=sí')) fails.push('referencia v2.0.5 inesperada ' + q0.name + vn + ': ' + a);
  table[vn] = table[vn] || { antes: new Set(), despues: new Set() }; table[vn].antes.add(a.split('|')[0] + (a.endsWith('sí') ? ' + interno' : '')); table[vn].despues.add(b.split('|').slice(0, 2).join(' ') + (b.endsWith('sí') ? ' + interno' : '')); }
for (const [k, v] of Object.entries(table)) console.log(k.padEnd(20), '| v2.0.5:', [...v.antes].join(' / '), '| v2.0.6:', [...v.despues].join(' / '));
console.log(`ANTES/DESPUÉS v2.0.5→v2.0.6: ${n} evaluaciones (${QS.length} consultas × ${Object.keys(V).length} variantes), ${changed} con cambio`);
if (n !== 35 || changed !== 30) fails.push('conteos inesperados ' + n + '/' + changed);
for (const f of fails) console.log('FALLA:', f); process.exit(fails.length ? 1 : 0);
