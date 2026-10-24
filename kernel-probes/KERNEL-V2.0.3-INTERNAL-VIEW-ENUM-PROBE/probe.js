'use strict';
// Sonda mínima y SOLO LECTURA contra kernel-v2.0.3 (congelado). No modifica nada. Uso: node probe.js
// Hipótesis (DECLARADO-AT, pendiente de contraste directo por el Curator): validateInternalView no cierra por enumeración calculation_status / provider_amount_status
// y la proyección `internal` del kernel los devuelve tal cual. Salida: JSON con el valor enviado y el valor devuelto.
const path = require('path'); const fs = require('fs');
const root = path.join(__dirname, '..', '..'); const K = require(path.join(root, 'kernel-v2.0.3')); const C = require(path.join(root, 'kernel-v2.0.3/contracts'));
const hotel = JSON.parse(fs.readFileSync(path.join(root, 'kernel-v2.0.3/fixtures/hotel_synthetic.json'), 'utf8'));
const q = JSON.parse(fs.readFileSync(path.join(root, 'kernel-v2.0.3/fixtures/paired-quotes.json'), 'utf8')).quotes.find((x) => x.name === 'base');
const SENT = 'SYNTH_PROBE_VALUE'; const view = JSON.parse(JSON.stringify(q.internal_view)); view.calculation_status = SENT; view.provider_amount_status = SENT;
const shape = C.validateInternalView(view);
const { digest } = require(path.join(root, 'kernel-v2.0.3/canonical')); const ev = JSON.parse(JSON.stringify(q.context_evidence)); ev.evaluation_snapshot.internal_view_digest = digest(view); // re-sellado: el servidor habría emitido ESA vista (sin esto el kernel rechaza por huella)
const r = K.evaluate(hotel, q.request, { public_dto: q.public_dto, internal_view: view, context_evidence: ev }, { now: '2026-10-23T14:10:00Z', fx_authorities: ['SYNTH-APPROVER'], actor: 'OPERATOR' });
const out = { sent: SENT, validateInternalView_ok: shape.ok === true, kernel_B_verdict: r.B.verdict, internal_calculation_status: r.internal && r.internal.calculation_status, internal_provider_amount_status: r.internal && r.internal.provider_amount_status,
  hypothesis_reproduced: !!(r.internal && r.internal.calculation_status === SENT) };
console.log(JSON.stringify(out, null, 1));
process.exit(0);
