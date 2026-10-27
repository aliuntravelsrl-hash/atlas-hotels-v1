'use strict';
// Pruebas del MODELO sintético de decisión documental (contrato v1.2 + corrigendum C12). Salida ≠ 0 si cualquier caso falla.
// Qué prueba: coherencia del contrato modelado con puertos simulados. Qué NO prueba: backend, autenticación real, PSP, render, canal, timing.
const assert = require('assert/strict');
const fs = require('fs'); const path = require('path');
const { M, makeWorld, REQ, DEL, CUST, OP, clone } = require('./world');

const cases = []; const C = (id, desc, fn) => cases.push({ id, desc, fn });
const TTL = 15 * 60 * 1000;
function ask(w, req, cred) {
  const out = w.model.handle(req, cred);
  const v = M.validatePublic(out.response); assert.ok(v.valid, 'respuesta pública inválida: ' + JSON.stringify(v.errors) + ' ' + JSON.stringify(out.response));
  if (out.document) assert.ok(M.validateDocumentPublic(out.document).valid, 'documento público inválido');
  if (out.delivery) assert.ok(M.validateDeliveryPublic(out.delivery).valid, 'entrega pública inválida');
  assert.ok(!JSON.stringify(out).includes('INTERNAL_'), 'dato interno filtrado a la proyección pública');
  { const env = clone(out.response); const dg = env.decision_digest; delete env.decision_digest; assert.equal(dg, M.sha(M.canon(env)), 'decision_digest no corresponde al sobre público'); }
  assert.ok(!Object.keys(out).some((k) => k.startsWith('_')), 'campo privado en la salida');
  if (out.response.form === 'DENIAL_UNSCOPED') { assert.deepEqual(Object.keys(out), ['response'], 'BND-2: el exterior de una denegación sin alcance es solo la denegación'); const s = JSON.stringify(out); assert.ok(!/"B1"|document_id|delivery_id|CHANNEL_ACK|"D1"|"V1"/.test(s), 'BND-2: metadatos de reserva/documento/entrega en una denegación sin alcance'); }
  return out;
}
const unscoped = (out, code, decision) => { assert.equal(out.response.form, 'DENIAL_UNSCOPED'); assert.equal(out.response.decision, decision || 'DENY'); assert.deepEqual(out.response.reason_codes, [code]); assert.deepEqual(Object.keys(out.response).sort(), ['correlation_id', 'decision', 'decision_digest', 'form', 'reason_codes', 'schema_version']); };
const scoped = (out, decision, codes) => { assert.equal(out.response.form, 'SCOPED_DECISION'); assert.equal(out.response.decision, decision); assert.deepEqual(out.response.reason_codes, codes || []); };
const allow = (out) => scoped(out, 'ALLOW', []);
// mundo "completo": todo lo necesario para ALLOW de cada documento
function full(opts) {
  const w = makeWorld(opts);
  w.setEvidence('B1', [w.mkEvidence('B1')]);
  w.addPayment('B1', '100.00', 'USD', true);
  w.fiscalPolicy = { version: 'F3' }; w.numbering = { ref: 'INTERNAL_NUM' };
  return w;
}
const bump = (w) => { w.bump('B1'); w.setEvidence('B1', [w.mkEvidence('B1')]); };

// ---------------- Forma (Sh) — heredado de v1.1 §7.1 ----------------
C('Sh01', 'falta booking_ref', () => { const w = makeWorld(); const r = REQ(); delete r.booking_ref; unscoped(ask(w, r, CUST), 'SHAPE_INVALID'); });
C('Sh02', 'campo extra en solicitud (raíz y delivery)', () => { const w = makeWorld(); unscoped(ask(w, REQ({ amount: '1.00' }), CUST), 'SHAPE_INVALID'); unscoped(ask(w, DEL({}, { extra: 1 }), CUST), 'SHAPE_INVALID'); });
C('Sh03', 'command fuera del enum', () => { const w = makeWorld(); unscoped(ask(w, REQ({ command: 'RECORD_PAYMENT_CLAIM' }), CUST), 'SHAPE_INVALID'); });
C('Sh04', 'document_type fuera del enum', () => { const w = makeWorld(); unscoped(ask(w, REQ({ document_type: 'CONTRACT' }), CUST), 'SHAPE_INVALID'); });
C('Sh05', 'booking_revision negativa, decimal o texto', () => { const w = makeWorld(); for (const v of [-1, 1.5, '1']) unscoped(ask(w, REQ({ booking_revision: v }), CUST), 'SHAPE_INVALID'); });
C('Sh06', 'nonce vacío o >64', () => { const w = makeWorld(); for (const v of ['', 'x'.repeat(65)]) unscoped(ask(w, REQ({ idempotency_nonce: v }), CUST), 'SHAPE_INVALID'); });
C('Sh07', 'MAJOR desconocida ⇒ UNKNOWN; versión ausente ⇒ forma inválida', () => { const w = makeWorld(); unscoped(ask(w, REQ({ schema_version: '2.0' }), CUST), 'SCHEMA_VERSION_UNSUPPORTED', 'UNKNOWN'); const r = REQ(); delete r.schema_version; unscoped(ask(w, r, CUST), 'SHAPE_INVALID'); });
C('Sh08', 'MINOR superior de la misma MAJOR en la SOLICITUD se procesa (mitad de respuesta: sustituida por Pj11/Pj12)', () => { const w = makeWorld(); allow(ask(w, REQ({ schema_version: '1.9' }), CUST)); });
const asDeny = (r, codes) => { r.decision = 'DENY'; r.reason_codes = codes; delete r.decision_expires_at; delete r.amounts; delete r.evidence_revisions; r.allowed_actions = ['NONE']; return r; };
C('Sh09', 'reason_code desconocido bien formado ⇒ consumidor DENY local REASON_UNRECOGNIZED', () => { const w = makeWorld(); const r = asDeny(clone(ask(w, REQ(), CUST).response), ['NEW_FUTURE_CODE']); const c = M.consumePublic(r); assert.equal(c.decision, 'DENY'); assert.equal(c.local_reason, 'REASON_UNRECOGNIZED'); assert.deepEqual(c.actions, []); });
C('Sh10', 'monto como número, con >2 decimales o notación científica', () => { const w = makeWorld(); const r = clone(ask(w, REQ({ document_type: 'QUOTE' }), CUST).response); for (const v of [12.5, '1.234', '1e3']) { const x = clone(r); x.amounts[0].amount = v; assert.equal(M.validatePublic(x).valid, false); } });
C('Sh11', 'moneda fuera de {USD, DOP}', () => { const w = makeWorld(); const r = clone(ask(w, REQ({ document_type: 'QUOTE' }), CUST).response); r.amounts[0].currency = 'EUR'; assert.equal(M.validatePublic(r).valid, false); });
C('Sh12', 'instante sin Z o con zona local', () => { const w = makeWorld(); const r = clone(ask(w, REQ(), CUST).response); for (const v of ['2026-10-27T12:00:00', '2026-10-27T12:00:00+02:00', '2026-13-45T99:00:00Z']) { const x = clone(r); x.decision_expires_at = v; assert.equal(M.validatePublic(x).valid, false); } });
C('Sh13', 'DELIVER_DOCUMENT sin delivery; delivery en REQUEST_DOCUMENT', () => { const w = makeWorld(); const d = DEL(); delete d.delivery; unscoped(ask(w, d, CUST), 'SHAPE_INVALID'); unscoped(ask(w, REQ({ delivery: { document_id: 'D1', document_revision: 1, channel: 'CH_TEST', recipient_kind: 'GUEST_ON_FILE' } }), CUST), 'SHAPE_INVALID'); unscoped(ask(w, DEL({}, { recipient_kind: 'GUEST_ON_FILE', recipient_ref: 'dest' }), CUST), 'SHAPE_INVALID'); });
C('Sh14', 'recipient_kind ausente o fuera del enum ⇒ RECIPIENT_MISSING (con alcance)', () => { const w = makeWorld(); for (const k of [undefined, 'ANYONE']) { const d = DEL({}, { recipient_kind: k }); if (k === undefined) delete d.delivery.recipient_kind; scoped(ask(w, d, CUST), 'DENY', ['RECIPIENT_MISSING']); } assert.equal(w.calls.deliver, 0); });
C('Sh15', 'reason_codes con texto libre o identificador interno ⇒ defecto; el consumidor no muestra nada', () => { const w = makeWorld(); const r = clone(ask(w, REQ(), CUST).response); for (const v of ['texto libre con espacios', 'INTERNAL_EVID_1', 'path/to/x']) { const x = clone(r); x.decision = 'DENY'; x.reason_codes = [v]; const c = M.consumePublic(x); assert.equal(c.usable, false); assert.equal(c.defect, true); assert.deepEqual(c.actions, []); } });

// ---------------- Autorización (Au) — v1.1 §7.2 con Au01/Au02 corregidos en v1.2 ----------------
C('Au01', 'actor UNVERIFIED (sin credencial) ⇒ DENY ACTOR_OUT_OF_SCOPE en ambos comandos', () => { const w = makeWorld(); unscoped(ask(w, REQ(), null), 'ACTOR_OUT_OF_SCOPE'); unscoped(ask(w, DEL(), null), 'ACTOR_OUT_OF_SCOPE'); });
C('Au02', 'cliente dueño con sesión: REQUEST_ACK ALLOW si hay solicitud persistida (mitad invitado: Gu01)', () => { const w = makeWorld(); const o = ask(w, REQ(), CUST); allow(o); assert.equal(o.document.state, 'RENDERED'); w.setBooking('B1', { request_persisted: false }); const o2 = ask(w, REQ({ idempotency_nonce: 'n2' }), CUST); scoped(o2, 'DENY', ['BOOKING_CANCELLED_OR_INVALID']); });
C('Au03', 'cliente de otra reserva ⇒ DENY ACTOR_OUT_OF_SCOPE', () => { const w = makeWorld(); unscoped(ask(w, REQ(), { account: 'cust2' }), 'ACTOR_OUT_OF_SCOPE'); });
C('Au04', 'operador en alcance: VOUCHER sin evidencia ⇒ DENY SUPPLIER_EVIDENCE_MISSING', () => { const w = makeWorld(); scoped(ask(w, REQ({ document_type: 'VOUCHER' }), OP), 'DENY', ['SUPPLIER_EVIDENCE_MISSING']); });
C('Au05', 'operador: VOUCHER con evidencia verificada y política ⇒ ALLOW (con abono pendiente; ver Mx01)', () => { const w = makeWorld(); w.setEvidence('B1', [w.mkEvidence('B1')]); const o = ask(w, REQ({ document_type: 'VOUCHER' }), OP); allow(o); assert.deepEqual(o.response.evidence_revisions, [{ kind: 'PROVIDER_ACCEPTANCE', evidence_revision: 1 }]); });
C('Au06', 'operador fuera de tenant ⇒ DENY ACTOR_OUT_OF_SCOPE', () => { const w = makeWorld(); unscoped(ask(w, REQ(), { operator: 'op2', tenant: 'T2' }), 'ACTOR_OUT_OF_SCOPE'); });
C('Au07', 'I-1: REQUEST_DOCUMENT de cada tipo ⇒ cero movimientos, cero cambios de estado/inventario, cero intentos comerciales', () => {
  const w = full(); const before = w.snapshot(); let n = 0;
  for (const t of ['QUOTE', 'REQUEST_ACK', 'BOOKING_CONFIRMATION', 'VOUCHER', 'PAYMENT_RECEIPT', 'INVOICE']) { allow(ask(w, REQ({ document_type: t, idempotency_nonce: 'i' + (++n) }), OP)); }
  assert.equal(w.snapshot(), before); assert.deepEqual(w.commercial.attempts, []);
  const b = w.bookings.get('B1'); assert.equal(b.status, 'pending'); assert.equal(b.payment_status, 'unpaid'); assert.equal(b.fulfillment_status, 'none'); assert.equal(b.inventory, 3); assert.equal(w.ledger.get('B1').length, 1);
});
C('Au08', 'misma clave y mismo digest ⇒ resultado registrado, sin duplicar render ni documento', () => { const w = makeWorld(); const a = ask(w, REQ(), CUST); const b = ask(w, REQ(), CUST); assert.deepEqual(b.response, a.response); assert.equal(b.replay, true); assert.equal(w.calls.render, 1); assert.equal(w.model.inspect().docs.length, 1); assert.equal(b.document.document_id, a.document.document_id); });
C('Au09', 'mismo nonce y ámbito, digest distinto ⇒ IDEMPOTENCY_CONFLICT; nada se ejecuta', () => { const w = makeWorld(); ask(w, REQ(), CUST); const o = ask(w, REQ({ document_type: 'QUOTE' }), CUST); scoped(o, 'DENY', ['IDEMPOTENCY_CONFLICT']); assert.equal(w.calls.render, 1); assert.equal(w.model.inspect().docs.length, 1); const w2 = makeWorld(); scoped(ask(w2, REQ({ document_type: 'VOUCHER' }), OP), 'DENY', ['SUPPLIER_EVIDENCE_MISSING']); scoped(ask(w2, REQ({ document_type: 'QUOTE' }), OP), 'DENY', ['IDEMPOTENCY_CONFLICT']); assert.equal(w2.calls.render, 0); });
C('Au10', 'dos principales, mismo nonce ⇒ claves distintas; no se cruzan resultados', () => { const w = makeWorld(); const a = ask(w, REQ(), CUST); const b = ask(w, REQ(), OP); allow(a); allow(b); assert.notEqual(a.document.document_id, b.document.document_id); assert.equal(w.calls.render, 2); assert.equal(b.replay, undefined); });
C('Au11', 'autoridad no disponible ⇒ UNKNOWN AUTHORITY_UNAVAILABLE sin alcance; el modelo se detiene (no degrada)', () => { const w = makeWorld(); unscoped(ask(w, REQ(), { unavailable: true }), 'AUTHORITY_UNAVAILABLE', 'UNKNOWN'); w.failBookings = true; unscoped(ask(w, REQ(), CUST), 'AUTHORITY_UNAVAILABLE', 'UNKNOWN'); assert.equal(w.calls.render, 0); });
C('Au12', 'SHARE_DOCUMENT sin destinatario en archivo o sin recipient_ref ⇒ RECIPIENT_MISSING; ningún envío alternativo', () => { const w = makeWorld(); ask(w, REQ(), CUST); w.setBooking('B1', { guest_on_file: false }); scoped(ask(w, DEL(), CUST), 'DENY', ['RECIPIENT_MISSING']); scoped(ask(w, DEL({ idempotency_nonce: 'd2' }, { recipient_kind: 'EXPLICIT' }), CUST), 'DENY', ['RECIPIENT_MISSING']); assert.equal(w.calls.deliver, 0); });

// ---------------- Evidencia (Ev) — v1.1 §7.3 ----------------
const evCase = (id, desc, patch, code, mut) => C(id, desc, () => { const w = makeWorld(); const ev = w.mkEvidence('B1', patch); w.setEvidence('B1', [mut ? mut(ev, w) : ev]); const o = ask(w, REQ({ document_type: 'BOOKING_CONFIRMATION' }), OP); if (code) scoped(o, 'DENY', [code]); else allow(o); });
evCase('Ev01', 'kind declarado sin verificación VERIFIED', { verification: { verifier_ref: 'INTERNAL_V', verified_at: '2026-10-27T11:00:00Z', result: 'UNVERIFIED' } }, 'SUPPLIER_EVIDENCE_UNVERIFIED');
evCase('Ev02', 'evidencia verificada de OTRA reserva (ref distinta aunque la selección coincida; selección distinta aunque la ref coincida)', { binding: { booking_ref: 'B9', selection_digest: M.sha('sel-B1'), booking_revision: 1 } }, 'SUPPLIER_EVIDENCE_OTHER_BOOKING');
C('Ev02b', 'selección distinta con la misma referencia ⇒ OTHER_BOOKING', () => { const w = makeWorld(); w.setEvidence('B1', [w.mkEvidence('B1', { binding: { booking_ref: 'B1', selection_digest: M.sha('otra'), booking_revision: 1 } })]); scoped(ask(w, REQ({ document_type: 'BOOKING_CONFIRMATION' }), OP), 'DENY', ['SUPPLIER_EVIDENCE_OTHER_BOOKING']); });
evCase('Ev03', 'evidencia revocada', { contract_state: 'REVOKED' }, 'SUPPLIER_EVIDENCE_REVOKED');
evCase('Ev03b', 'evidencia sustituida ⇒ REVOKED', { contract_state: 'SUPERSEDED' }, 'SUPPLIER_EVIDENCE_REVOKED');
evCase('Ev03c', 'evidencia vencida ⇒ EXPIRED', { contract_state: 'EXPIRED' }, 'SUPPLIER_EVIDENCE_EXPIRED');
evCase('Ev03d', 'estado contractual desconocido ⇒ UNVERIFIED', { contract_state: 'WEIRD' }, 'SUPPLIER_EVIDENCE_UNVERIFIED');
evCase('Ev03e', 'locator_source desconocido ⇒ UNVERIFIED', { locator_source: 'WHATEVER' }, 'SUPPLIER_EVIDENCE_UNVERIFIED');
evCase('Ev04', 'localizador obtenido por respaldo desde la referencia interna', { locator_source: 'INTERNAL_FALLBACK' }, 'SUPPLIER_EVIDENCE_FALLBACK_SUBSTITUTE');
evCase('Ev05', 'MISMO texto que la referencia interna pero con aceptación externa verificada ⇒ ALLOW', { locator: 'INTERNAL_REF_B1', locator_source: 'PROVIDER_CHANNEL' }, null);
C('Ev06', 'PENDIENTE, NONE o sin evidencia ⇒ SUPPLIER_EVIDENCE_MISSING', () => { for (const kind of ['PENDIENTE', 'NONE', '']) { const w = makeWorld(); w.setEvidence('B1', [w.mkEvidence('B1', { kind })]); scoped(ask(w, REQ({ document_type: 'BOOKING_CONFIRMATION' }), OP), 'DENY', ['SUPPLIER_EVIDENCE_MISSING']); } const w = makeWorld(); scoped(ask(w, REQ({ document_type: 'BOOKING_CONFIRMATION' }), OP), 'DENY', ['SUPPLIER_EVIDENCE_MISSING']); });
evCase('Ev07', 'emisor distinto del proveedor de la reserva', { issuer_ref: 'INTERNAL_OTHER_SUPPLIER' }, 'SUPPLIER_EVIDENCE_ISSUER_MISMATCH');
C('Ev08', 'booking_revision cambió tras la decisión ⇒ REVISION_CHANGED (solicitud y evidencia ligadas a revisión anterior)', () => { const w = makeWorld(); w.setEvidence('B1', [w.mkEvidence('B1')]); allow(ask(w, REQ({ document_type: 'BOOKING_CONFIRMATION' }), OP)); w.bump('B1'); scoped(ask(w, REQ({ document_type: 'BOOKING_CONFIRMATION', idempotency_nonce: 'n2' }), OP), 'DENY', ['REVISION_CHANGED']); const o = ask(w, REQ({ document_type: 'BOOKING_CONFIRMATION', idempotency_nonce: 'n3', booking_revision: 2 }), OP); scoped(o, 'DENY', ['REVISION_CHANGED']); });

// ---------------- Repetición y vigencia (Rp) — v1.2 §7.1 + C12 ----------------
C('Rp01', 'retry tras decision_expires_at ⇒ DECISION_EXPIRED; el historial se conserva', () => { const w = makeWorld(); ask(w, REQ(), CUST); w.advance(TTL + 1000); const o = ask(w, REQ(), CUST); scoped(o, 'DENY', ['DECISION_EXPIRED']); assert.equal(o.document, undefined); assert.equal(w.model.inspect().docs[0].state, 'RENDERED'); });
C('Rp02', 'retry tras revocar la evidencia ⇒ SUPPLIER_EVIDENCE_REVOKED; sin devolver el resultado histórico', () => { const w = makeWorld(); w.setEvidence('B1', [w.mkEvidence('B1')]); const r = REQ({ document_type: 'BOOKING_CONFIRMATION' }); allow(ask(w, r, OP)); w.setEvidence('B1', [w.mkEvidence('B1', { contract_state: 'REVOKED' })]); const o = ask(w, r, OP); scoped(o, 'DENY', ['SUPPLIER_EVIDENCE_REVOKED']); assert.equal(o.document, undefined); assert.equal(o.replay, undefined); assert.equal(w.model.inspect().docs.length, 1); });
C('Rp03', 'retry tras cambio de propietario/alcance ⇒ ACTOR_OUT_OF_SCOPE', () => { const w = makeWorld(); ask(w, REQ(), CUST); w.setBooking('B1', { owner: 'cust9' }); const o = ask(w, REQ(), CUST); unscoped(o, 'ACTOR_OUT_OF_SCOPE'); assert.equal(o.document, undefined); });
C('Rp04', 'retry tras cambio de revisión ⇒ REVISION_CHANGED; con revisión y nonce nuevos ⇒ nueva decisión', () => { const w = makeWorld(); const a = ask(w, REQ({ document_type: 'QUOTE' }), CUST); w.bump('B1'); const o = ask(w, REQ({ document_type: 'QUOTE' }), CUST); scoped(o, 'DENY', ['REVISION_CHANGED']); assert.equal(o.response.booking_revision, 2); const n = ask(w, REQ({ document_type: 'QUOTE', booking_revision: 2, idempotency_nonce: 'n2' }), CUST); allow(n); assert.notEqual(n.document.document_id, a.document.document_id); });
C('Rp07', 'timeout de entrega y reintento ⇒ UNCONFIRMED; sin segunda acción por replay ni por nonce nuevo', () => { const w = makeWorld(); ask(w, REQ(), CUST); w.behavior.deliver = 'throw'; const a = ask(w, DEL(), CUST); assert.equal(a.delivery.state, 'UNCONFIRMED'); assert.equal(w.calls.deliver, 1); const b = ask(w, DEL(), CUST); assert.equal(b.delivery.state, 'UNCONFIRMED'); assert.equal(w.calls.deliver, 1); const c = ask(w, DEL({ idempotency_nonce: 'd2' }), CUST); assert.equal(c.delivery.delivery_id, a.delivery.delivery_id); assert.equal(w.calls.deliver, 1); });
C('Rp08', 'operación no terminal con decisión vencida: el registro se conserva y reanudar exige autorización actual', () => { const w = makeWorld(); w.behavior.render = 'throw'; const a = ask(w, REQ(), CUST); assert.equal(a.document.state, 'DECISION_ISSUED'); w.advance(TTL + 1000); assert.equal(w.model.purge(() => true), 0); assert.equal(w.model.inspect().nonTerminalOps, 1); w.behavior.render = 'ok'; const b = ask(w, REQ(), CUST); scoped(b, 'DENY', ['DECISION_EXPIRED']); assert.equal(w.calls.render, 1); });
C('Rp09', 'nueva entrega con autorización vencida ⇒ DECISION_EXPIRED; la entrega anterior permanece', () => { const w = makeWorld(); ask(w, REQ(), CUST); ask(w, DEL(), CUST); w.advance(TTL + 1000); scoped(ask(w, DEL({ idempotency_nonce: 'd2' }), CUST), 'DENY', ['DECISION_EXPIRED']); assert.deepEqual(w.model.inspect().deliveries, [{ id: 'V1', state: 'ACKED_BY_CHANNEL' }]); assert.equal(w.calls.deliver, 1); });
C('Rp10', 'C12-01: mismo nonce, misma reserva, revisión distinta ⇒ IDEMPOTENCY_CONFLICT; nada se ejecuta; nueva revisión exige nonce nuevo', () => { const w = makeWorld(); const a = ask(w, REQ({ document_type: 'QUOTE' }), CUST); w.bump('B1'); const o = ask(w, REQ({ document_type: 'QUOTE', booking_revision: 2 }), CUST); scoped(o, 'DENY', ['IDEMPOTENCY_CONFLICT']); assert.equal(o.document, undefined); assert.equal(w.model.inspect().docs.length, 1); assert.equal(w.calls.render, 1); assert.equal(w.model.inspect().docs[0].id, a.document.document_id); allow(ask(w, REQ({ document_type: 'QUOTE', booking_revision: 2, idempotency_nonce: 'n2' }), CUST)); });

// ---------------- Proyección pública (Pj) — v1.2 §7.2 + C12 ----------------
C('Pj01', 'datos internos centinela anidados ⇒ ausentes en toda la proyección pública', () => { const w = full(); w.numbering = { ref: 'INTERNAL_NUM' }; let n = 0; const all = []; for (const t of ['QUOTE', 'REQUEST_ACK', 'BOOKING_CONFIRMATION', 'VOUCHER', 'PAYMENT_RECEIPT', 'INVOICE']) all.push(ask(w, REQ({ document_type: t, idempotency_nonce: 'p' + (++n) }), OP)); all.push(ask(w, DEL({}, {}), OP)); assert.ok(!JSON.stringify(all).includes('INTERNAL_')); assert.ok(all.every((o) => o.response.decision === 'ALLOW')); });
C('Pj02', 'campo extra en delivery, artifact, amounts o evidence_revisions de la respuesta ⇒ inválida; el consumidor no ofrece acciones', () => {
  const w = full(); const q = clone(ask(w, REQ({ document_type: 'QUOTE' }), OP)); const c = clone(ask(w, REQ({ document_type: 'BOOKING_CONFIRMATION', idempotency_nonce: 'x2' }), OP)); const d = clone(ask(w, DEL(), OP));
  const a = clone(q.response); a.amounts[0].ledger_id = 'x'; assert.equal(M.validatePublic(a).valid, false); assert.deepEqual(M.consumePublic(a).actions, []);
  const e = clone(c.response); e.evidence_revisions[0].extra = 1; assert.equal(M.validatePublic(e).valid, false);
  const ar = clone(q.document); ar.artifact.path = '/x'; assert.equal(M.validateDocumentPublic(ar).valid, false);
  const dl = clone(d.delivery); dl.extra = 1; assert.equal(M.validateDeliveryPublic(dl).valid, false);
});
C('Pj03', 'acción desconocida en allowed_actions ⇒ el consumidor no ofrece ninguna acción', () => { const w = makeWorld(); const r = clone(ask(w, REQ(), CUST).response); r.allowed_actions = ['RENDER', 'TELEPORT']; const x = M.consumePublic(r); assert.deepEqual(x.actions, []); assert.equal(x.usable, false); const dn = clone(ask(makeWorld(), REQ(), CUST).response); dn.decision = 'DENY'; dn.reason_codes = ['PRICE_EXPIRED']; assert.deepEqual(M.consumePublic(dn).actions, []); const ok = M.consumePublic(ask(makeWorld(), REQ(), CUST).response); assert.deepEqual(ok.actions, ['RENDER', 'DELIVER'].filter((a) => ['RENDER', 'DELIVER'].includes(a))); });
C('Pj04', 'canal desconocido ⇒ DENY sin envío alternativo (también catálogo de canales vacío)', () => { const w = makeWorld(); ask(w, REQ(), CUST); scoped(ask(w, DEL({}, { channel: 'CH_X' }), CUST), 'DENY', ['SHAPE_INVALID']); assert.equal(w.calls.deliver, 0); const w2 = makeWorld({ channels: [] }); ask(w2, REQ(), CUST); scoped(ask(w2, DEL(), CUST), 'DENY', ['SHAPE_INVALID']); assert.equal(w2.calls.deliver, 0); });
C('Pj05', 'evidence_revisions con revisión inválida ⇒ respuesta inválida', () => { const w = full(); const r = clone(ask(w, REQ({ document_type: 'BOOKING_CONFIRMATION' }), OP).response); for (const v of [-1, 1.5, '1']) { const x = clone(r); x.evidence_revisions[0].evidence_revision = v; assert.equal(M.validatePublic(x).valid, false); } });
C('Pj06', 'monto negativo según significado (BALANCE_DUE/REFUND/QUOTED_TOTAL ✗, ADJUSTMENT ✓)', () => { const w = makeWorld(); const r = clone(ask(w, REQ({ document_type: 'QUOTE' }), CUST).response); const t = (m, a) => { const x = clone(r); x.amounts = [{ amount: a, currency: 'USD', meaning: m }]; return M.validatePublic(x).valid; }; assert.equal(t('BALANCE_DUE', '-5.00'), false); assert.equal(t('REFUND', '-1.00'), false); assert.equal(t('QUOTED_TOTAL', '-1'), false); assert.equal(t('ADJUSTMENT', '-1.00'), true); assert.equal(t('BALANCE_DUE', '5.00'), true); });
C('Pj07', 'REQUEST_DOCUMENT + SHARE_DOCUMENT incompatible ⇒ SHAPE_INVALID', () => { const w = makeWorld(); unscoped(ask(w, REQ({ document_type: 'SHARE_DOCUMENT' }), CUST), 'SHAPE_INVALID'); });
C('Pj08', 'DELIVER_DOCUMENT + VOUCHER incompatible ⇒ SHAPE_INVALID', () => { const w = makeWorld(); unscoped(ask(w, DEL({ document_type: 'VOUCHER' }), CUST), 'SHAPE_INVALID'); });
C('Pj09', 'respuesta con evidence_id, issuer_ref, verifier_ref o digest de evidencia ⇒ defecto del productor', () => { const w = full(); const r = clone(ask(w, REQ({ document_type: 'BOOKING_CONFIRMATION' }), OP).response); for (const [k, v] of [['evidence_id', 'E1'], ['issuer_ref', 'S1'], ['verifier_ref', 'V1'], ['evidence_digest', M.sha('x')]]) { const top = clone(r); top[k] = v; assert.equal(M.validatePublic(top).valid, false); const nested = clone(r); nested.evidence_revisions[0][k] = v; assert.equal(M.validatePublic(nested).valid, false); } });
C('Pj10', 'DeliveryRecordPublic con recipient_ref en claro ⇒ defecto del productor', () => { const w = makeWorld(); ask(w, REQ(), CUST); const d = clone(ask(w, DEL({}, { recipient_kind: 'GUEST_ON_FILE' }), CUST).delivery); assert.equal(d.recipient_ref, undefined); d.recipient_ref = 'dest'; assert.equal(M.validateDeliveryPublic(d).valid, false); });
C('Pj11', 'MINOR superior con extensión DECLARADA ⇒ el consumidor la ignora y procesa lo conocido', () => { const w = makeWorld(); const r = clone(ask(w, REQ({ document_type: 'QUOTE' }), CUST).response); r.schema_version = '1.3'; r.notice_code = 'EXTRA_NOTE'; const V = M.makeValidator({ '1.3': { scoped: { notice_code: { t: 'reason' } } } }); const c = M.consumePublic(r, V); assert.equal(c.usable, true); assert.equal(c.decision, 'ALLOW'); });
C('Pj12', 'MINOR superior con campo NO declarado ⇒ respuesta inválida', () => { const w = makeWorld(); const r = clone(ask(w, REQ({ document_type: 'QUOTE' }), CUST).response); r.schema_version = '1.3'; r.zzz = 'x'; const V = M.makeValidator({ '1.3': { scoped: { notice_code: { t: 'reason' } } } }); assert.equal(M.validatePublic(r).valid, false); assert.equal(V(r).valid, false); assert.equal(M.consumePublic(r, V).usable, false); });
const sameShape = (a, b) => assert.deepEqual(a.response, b.response);
C('Pj13', 'C12-02: denegación sin alcance ante reserva EXISTENTE vs INEXISTENTE ⇒ misma forma, campos y códigos; sin campos vedados', () => {
  const mk = () => makeWorld(); const wa = mk(); const wb = mk();
  const a = ask(wa, REQ({ booking_ref: 'B1' }), { account: 'cust2' }); const b = ask(wb, REQ({ booking_ref: 'BX' }), { account: 'cust2' });
  sameShape(a, b); unscoped(a, 'ACTOR_OUT_OF_SCOPE'); for (const k of ['booking_ref', 'booking_revision', 'policy_version', 'amounts', 'evidence_revisions', 'allowed_actions', 'decision_expires_at', 'document_type']) assert.equal(a.response[k], undefined);
  assert.ok(/^corr\d+$/.test(a.response.correlation_id)); assert.ok(!a.response.correlation_id.includes('B1')); const c2 = ask(wa, REQ({ booking_ref: 'B1', idempotency_nonce: 'n2' }), { account: 'cust2' }); assert.notEqual(c2.response.correlation_id, a.response.correlation_id);
});

// ---------------- Invitado (Gu) — v1.2 §7.3 + C12 ----------------
C('Gu01', 'invitado válido, su reserva, REQUEST_ACK ⇒ ALLOW', () => { const w = makeWorld(); w.addGuest('g1', 'B1'); const o = ask(w, REQ(), { guest: 'g1' }); allow(o); assert.equal(o.document.state, 'RENDERED'); });
C('Gu03', 'credencial vencida ⇒ GUEST_ACCESS_INVALID sin alcance', () => { const w = makeWorld(); w.addGuest('g1', 'B1', 'EXPIRED'); unscoped(ask(w, REQ(), { guest: 'g1' }), 'GUEST_ACCESS_INVALID'); });
C('Gu04', 'credencial revocada ⇒ GUEST_ACCESS_INVALID sin alcance', () => { const w = makeWorld(); w.addGuest('g1', 'B1', 'REVOKED'); unscoped(ask(w, REQ(), { guest: 'g1' }), 'GUEST_ACCESS_INVALID'); });
C('Gu05', 'credencial de OTRA reserva ⇒ GUEST_ACCESS_OUT_OF_SCOPE sin revelar existencia', () => { const w = makeWorld(); w.addBooking('B2'); w.addGuest('g2', 'B2'); unscoped(ask(w, REQ({ booking_ref: 'B1' }), { guest: 'g2' }), 'GUEST_ACCESS_OUT_OF_SCOPE'); });
C('Gu06', 'booking_ref/teléfono NO son prueba de propiedad (credencial de otro tipo) ⇒ ACTOR_OUT_OF_SCOPE', () => { const w = makeWorld(); unscoped(ask(w, REQ(), { claimed_phone: 'x', booking_ref: 'B1' }), 'ACTOR_OUT_OF_SCOPE'); });
C('Gu07', 'invitado intenta compartir con destinatario EXPLÍCITO fuera de su límite ⇒ DENY; sin envío', () => { const w = makeWorld(); w.addGuest('g1', 'B1'); ask(w, REQ(), { guest: 'g1' }); scoped(ask(w, DEL({}, { recipient_kind: 'EXPLICIT', recipient_ref: 'dest' }), { guest: 'g1' }), 'DENY', ['GUEST_ACCESS_OUT_OF_SCOPE']); assert.equal(w.calls.deliver, 0); allow(ask(w, DEL({ idempotency_nonce: 'd2' }), { guest: 'g1' })); assert.equal(w.calls.deliver, 1); });
C('Gu08', 'invitado pide documento fuera de su alcance (INVOICE) ⇒ GUEST_ACCESS_OUT_OF_SCOPE', () => { const w = full(); w.addGuest('g1', 'B1'); scoped(ask(w, REQ({ document_type: 'INVOICE' }), { guest: 'g1' }), 'DENY', ['GUEST_ACCESS_OUT_OF_SCOPE']); });
C('Gu09', 'mecanismo de acceso invitado sin fuente (UNK) ⇒ toda solicitud sin sesión ⇒ DENY', () => { const w = makeWorld({ guests: false }); w.addGuest('g1', 'B1'); unscoped(ask(w, REQ(), { guest: 'g1' }), 'ACTOR_OUT_OF_SCOPE'); assert.equal(w.calls.render, 0); });
C('Gu10', 'sesión y credencial invitado se evalúan por separado', () => { const w = makeWorld(); w.addGuest('g1', 'B1', 'REVOKED'); unscoped(ask(w, REQ({ idempotency_nonce: 'a' }), { guest: 'g1' }), 'GUEST_ACCESS_INVALID'); allow(ask(w, REQ({ idempotency_nonce: 'b' }), CUST)); w.setBooking('B1', { owner: 'cust9' }); unscoped(ask(w, REQ({ idempotency_nonce: 'c' }), CUST), 'ACTOR_OUT_OF_SCOPE'); w.addGuest('g1', 'B1', 'VALID'); allow(ask(w, REQ({ idempotency_nonce: 'd' }), { guest: 'g1' })); });
C('Gu11', 'C12-02: credencial inválida/ajena/ausente ante reserva existente vs inexistente ⇒ misma denegación indistinguible', () => {
  const scenarios = [
    ['expirada', (w) => w.addGuest('g1', 'B1', 'EXPIRED'), { guest: 'g1' }], ['revocada', (w) => w.addGuest('g1', 'B1', 'REVOKED'), { guest: 'g1' }],
    ['desconocida', () => {}, { guest: 'gX' }], ['otra reserva', (w) => { w.addBooking('B2'); w.addGuest('g2', 'B2'); }, { guest: 'g2' }], ['ausente', () => {}, null],
  ];
  for (const [name, setup, cred] of scenarios) { const wa = makeWorld(); const wb = makeWorld(); setup(wa); setup(wb); const a = ask(wa, REQ({ booking_ref: 'B1' }), cred); const b = ask(wb, REQ({ booking_ref: 'BX' }), cred); sameShape(a, b); for (const k of ['booking_ref', 'booking_revision', 'policy_version']) assert.equal(a.response[k], undefined, name); }
});

// ---------------- Casos propios del modelo (Mx) — sin equivalente previo ----------------
C('Mx01', 'pago y confirmación del proveedor son independientes (ambos sentidos)', () => { const w = makeWorld(); w.setEvidence('B1', [w.mkEvidence('B1')]); allow(ask(w, REQ({ document_type: 'BOOKING_CONFIRMATION' }), OP)); scoped(ask(w, REQ({ document_type: 'PAYMENT_RECEIPT', idempotency_nonce: 'r' }), OP), 'DENY', ['PAYMENT_NOT_RECONCILED']); const w2 = makeWorld(); w2.addPayment('B1', '50.00', 'USD', true); const o = ask(w2, REQ({ document_type: 'PAYMENT_RECEIPT' }), OP); allow(o); assert.deepEqual(o.response.amounts, [{ amount: '50.00', currency: 'USD', meaning: 'PAID_TOTAL' }]); scoped(ask(w2, REQ({ document_type: 'BOOKING_CONFIRMATION', idempotency_nonce: 'c' }), OP), 'DENY', ['SUPPLIER_EVIDENCE_MISSING']); scoped(ask(w2, REQ({ document_type: 'VOUCHER', idempotency_nonce: 'v' }), OP), 'DENY', ['SUPPLIER_EVIDENCE_MISSING']); });
C('Mx02', 'VOUCHER con prepago exigido: sin abono ⇒ POLICY_REQUIRES_PREPAYMENT; con abono conciliado ⇒ ALLOW', () => { const pol = { version: 'P8', requires_prepayment: true, min_paid: { amount: '100.00', currency: 'USD' } }; const w = makeWorld({ policy: pol }); w.setEvidence('B1', [w.mkEvidence('B1')]); scoped(ask(w, REQ({ document_type: 'VOUCHER' }), OP), 'DENY', ['POLICY_REQUIRES_PREPAYMENT']); w.addPayment('B1', '60.00', 'USD', true); scoped(ask(w, REQ({ document_type: 'VOUCHER', idempotency_nonce: 'v2' }), OP), 'DENY', ['POLICY_REQUIRES_PREPAYMENT']); w.addPayment('B1', '40.00', 'USD', true); allow(ask(w, REQ({ document_type: 'VOUCHER', idempotency_nonce: 'v3' }), OP)); });
C('Mx03', 'moneda mixta sin fx ⇒ PAYMENT_CURRENCY_MIXED_NO_FX; con fx gobernado se evalúa', () => { const pol = { version: 'P8', requires_prepayment: true, min_paid: { amount: '100.00', currency: 'USD' } }; const w = makeWorld({ policy: pol }); w.setEvidence('B1', [w.mkEvidence('B1')]); w.addPayment('B1', '100.00', 'USD', true); w.addPayment('B1', '500.00', 'DOP', true); scoped(ask(w, REQ({ document_type: 'VOUCHER' }), OP), 'DENY', ['PAYMENT_CURRENCY_MIXED_NO_FX']); w.fx = { ref: 'INTERNAL_FX' }; allow(ask(w, REQ({ document_type: 'VOUCHER', idempotency_nonce: 'v2' }), OP)); });
C('Mx04', 'abono sin conciliar no cuenta (receipt y prepago)', () => { const w = makeWorld({ policy: { version: 'P8', requires_prepayment: true, min_paid: { amount: '10.00', currency: 'USD' } } }); w.setEvidence('B1', [w.mkEvidence('B1')]); w.addPayment('B1', '500.00', 'USD', false); scoped(ask(w, REQ({ document_type: 'PAYMENT_RECEIPT' }), OP), 'DENY', ['PAYMENT_NOT_RECONCILED']); scoped(ask(w, REQ({ document_type: 'VOUCHER', idempotency_nonce: 'v' }), OP), 'DENY', ['PAYMENT_NOT_RECONCILED']); });
C('Mx05', 'INVOICE: sin política fiscal ⇒ UNKNOWN; sin numeración ⇒ UNKNOWN; con ambas ⇒ ALLOW sin tocar reserva ni pago', () => { const w = makeWorld(); scoped(ask(w, REQ({ document_type: 'INVOICE' }), OP), 'UNKNOWN', ['FISCAL_POLICY_MISSING']); w.fiscalPolicy = { version: 'F3' }; scoped(ask(w, REQ({ document_type: 'INVOICE', idempotency_nonce: 'i2' }), OP), 'UNKNOWN', ['NUMBERING_AUTHORITY_MISSING']); w.numbering = { ref: 'INTERNAL_NUM' }; const before = w.snapshot(); allow(ask(w, REQ({ document_type: 'INVOICE', idempotency_nonce: 'i3' }), OP)); assert.equal(w.snapshot(), before); });
C('Mx06', 'sin política: VOUCHER ⇒ UNKNOWN POLICY_MISSING; QUOTE y REQUEST_ACK siguen ALLOW', () => { const w = makeWorld({ policy: null }); w.policy = null; w.setEvidence('B1', [w.mkEvidence('B1')]); scoped(ask(w, REQ({ document_type: 'VOUCHER' }), OP), 'UNKNOWN', ['POLICY_MISSING']); allow(ask(w, REQ({ document_type: 'QUOTE', idempotency_nonce: 'q' }), OP)); allow(ask(w, REQ({ idempotency_nonce: 'a' }), OP)); });
C('Mx07', 'evidencia con digest manipulado ⇒ SUPPLIER_EVIDENCE_UNVERIFIED', () => { const w = makeWorld(); const e = w.mkEvidence('B1'); e.locator = 'ALTERADO'; w.setEvidence('B1', [e]); scoped(ask(w, REQ({ document_type: 'BOOKING_CONFIRMATION' }), OP), 'DENY', ['SUPPLIER_EVIDENCE_UNVERIFIED']); });
C('Mx08', 'render: tipo de medio no permitido, digest distinto, vacío o fallo ⇒ RENDER_FAILED sin artefacto; excepción ⇒ DECISION_ISSUED sin re-render', () => { for (const b of ['badtype', 'baddigest', 'empty', 'fail']) { const w = makeWorld(); w.behavior.render = b; const o = ask(w, REQ(), CUST); assert.equal(o.document.state, 'RENDER_FAILED', b); assert.equal(o.document.artifact, undefined, b); } const w = makeWorld(); w.behavior.render = 'throw'; const o = ask(w, REQ(), CUST); assert.equal(o.document.state, 'DECISION_ISSUED'); ask(w, REQ(), CUST); assert.equal(w.calls.render, 1); });
C('Mx09', 'entrega: solo el acuse del canal acredita; res.ok/URL ⇒ UNCONFIRMED; excepción ⇒ UNCONFIRMED; fallo explícito ⇒ FAILED', () => { const run = (b) => { const w = makeWorld(); ask(w, REQ(), CUST); w.behavior.deliver = b; return ask(w, DEL(), CUST).delivery; }; assert.equal(run('ack').state, 'ACKED_BY_CHANNEL'); assert.deepEqual(run('ack').ack, { kind: 'CHANNEL_ACK' }); assert.equal(run('ok_url').state, 'UNCONFIRMED'); assert.equal(run('ok_url').ack, undefined); assert.equal(run('throw').state, 'UNCONFIRMED'); assert.equal(run('fail').state, 'FAILED'); });
C('Mx10', 'entrega incierta: reconciliación explícita sale de UNCONFIRMED; luego se permite nueva entrega con nonce nuevo', () => { const w = makeWorld(); ask(w, REQ(), CUST); w.behavior.deliver = 'ok_url'; const a = ask(w, DEL(), CUST); assert.equal(a.delivery.state, 'UNCONFIRMED'); const r = w.model.reconcileDelivery(a.delivery.delivery_id, { ack: { kind: 'CHANNEL_ACK' } }); assert.equal(r.state, 'ACKED_BY_CHANNEL'); assert.equal(w.model.reconcileDelivery(a.delivery.delivery_id, { failed: true }), null); assert.equal(w.model.inspect().nonTerminalOps, 0); w.behavior.deliver = 'ack'; const b = ask(w, DEL({ idempotency_nonce: 'd2' }), CUST); assert.notEqual(b.delivery.delivery_id, a.delivery.delivery_id); assert.equal(w.calls.deliver, 2); });
C('Mx11', 'replay de una entrega ya acreditada no envía de nuevo', () => { const w = makeWorld(); ask(w, REQ(), CUST); const a = ask(w, DEL(), CUST); const b = ask(w, DEL(), CUST); assert.equal(b.replay, true); assert.equal(w.calls.deliver, 1); assert.equal(b.delivery.delivery_id, a.delivery.delivery_id); });
C('Mx12', 'retención: purge nunca elimina operaciones no terminales; sí terminales elegibles', () => { const w = makeWorld(); w.behavior.render = 'throw'; ask(w, REQ({ idempotency_nonce: 'u1' }), CUST); w.behavior.render = 'ok'; ask(w, REQ({ idempotency_nonce: 'u2' }), CUST); w.behavior.deliver = 'throw'; ask(w, DEL({ idempotency_nonce: 'u3' }, { document_id: 'D2' }), CUST); assert.equal(w.model.inspect().nonTerminalOps, 2); assert.equal(w.model.purge(() => true), 1); assert.equal(w.model.inspect().nonTerminalOps, 2); assert.equal(w.model.purge(() => false), 0); });
C('Mx13', 'sweep por evento: cancelación ⇒ VOIDED; cambio de revisión ⇒ SUPERSEDED; evidencia revocada ⇒ VOIDED; nada se borra', () => { const w = makeWorld(); w.setEvidence('B1', [w.mkEvidence('B1')]); ask(w, REQ(), CUST); ask(w, REQ({ document_type: 'BOOKING_CONFIRMATION', idempotency_nonce: 'c' }), OP); ask(w, REQ({ document_type: 'QUOTE', idempotency_nonce: 'q' }), OP); w.setBooking('B1', { cancelled: true }); w.model.sweep(); assert.deepEqual(w.model.inspect().docs.map((d) => d.state), ['VOIDED', 'VOIDED', 'VOIDED']); const w2 = makeWorld(); ask(w2, REQ(), CUST); w2.bump('B1'); w2.model.sweep(); assert.equal(w2.model.inspect().docs[0].state, 'SUPERSEDED'); const w3 = makeWorld(); w3.setEvidence('B1', [w3.mkEvidence('B1')]); ask(w3, REQ({ document_type: 'BOOKING_CONFIRMATION' }), OP); w3.setEvidence('B1', [w3.mkEvidence('B1', { contract_state: 'REVOKED' })]); w3.model.sweep(); assert.equal(w3.model.inspect().docs[0].state, 'VOIDED'); });
C('Mx14', 'entrega de documento anulado/sustituido o de otra reserva ⇒ DENY; sin envío', () => { const w = makeWorld(); ask(w, REQ(), CUST); w.setBooking('B1', { cancelled: true }); w.model.sweep(); scoped(ask(w, DEL(), CUST), 'DENY', ['BOOKING_CANCELLED_OR_INVALID']); const w2 = makeWorld(); ask(w2, REQ(), CUST); w2.bump('B1'); w2.model.sweep(); scoped(ask(w2, DEL({ booking_revision: 2 }), CUST), 'DENY', ['REVISION_CHANGED']); const w3 = makeWorld(); w3.addBooking('B3'); w3.setBooking('B3', { owner: 'cust1' }); ask(w3, REQ(), CUST); scoped(ask(w3, DEL({ booking_ref: 'B3' }), CUST), 'DENY', ['SHAPE_INVALID']); const w4 = makeWorld(); ask(w4, REQ(), CUST); w4.bump('B1'); scoped(ask(w4, DEL({ booking_revision: 2 }), CUST), 'DENY', ['REVISION_CHANGED']); const w5 = makeWorld(); ask(w5, REQ(), CUST); scoped(ask(w5, DEL({}, { document_revision: 2 }), CUST), 'DENY', ['SHAPE_INVALID']); assert.equal(w.calls.deliver + w2.calls.deliver + w3.calls.deliver + w4.calls.deliver + w5.calls.deliver, 0); });
C('Mx15', 'allowed_actions: ALLOW ⇒ RENDER (+DELIVER si hay canal); DENY/UNKNOWN ⇒ NONE', () => { const a = ask(makeWorld(), REQ(), CUST); assert.deepEqual(a.response.allowed_actions, ['RENDER', 'DELIVER']); const b = ask(makeWorld({ channels: [] }), REQ(), CUST); assert.deepEqual(b.response.allowed_actions, ['RENDER']); const w = makeWorld(); const c = ask(w, REQ({ document_type: 'VOUCHER' }), OP); assert.deepEqual(c.response.allowed_actions, ['NONE']); });
C('Mx16', 'fallo de un puerto durante la evaluación ⇒ UNKNOWN AUTHORITY_UNAVAILABLE con alcance; sin render', () => { const w = makeWorld(); w.failEvidence = true; scoped(ask(w, REQ({ document_type: 'BOOKING_CONFIRMATION' }), OP), 'UNKNOWN', ['AUTHORITY_UNAVAILABLE']); assert.equal(w.calls.render, 0); });
C('Mx17', 'el digest canónico incluye la revisión, el comando y el nonce', () => { const a = M.canonicalDigest(REQ()); assert.notEqual(a, M.canonicalDigest(REQ({ booking_revision: 2 }))); assert.notEqual(a, M.canonicalDigest(REQ({ idempotency_nonce: 'n9' }))); assert.notEqual(a, M.canonicalDigest(REQ({ document_type: 'QUOTE' }))); assert.equal(a, M.canonicalDigest(Object.fromEntries(Object.entries(REQ()).reverse()))); });
C('Mx18', 'QUOTE: precio no verificado o vencido ⇒ DENY; verificado ⇒ ALLOW con QUOTED_TOTAL', () => { const w = makeWorld({ priceOk: false }); scoped(ask(w, REQ({ document_type: 'QUOTE' }), CUST), 'DENY', ['PRICE_UNVERIFIED']); const w2 = makeWorld(); w2.priceExpires = '2026-10-27T11:00:00Z'; scoped(ask(w2, REQ({ document_type: 'QUOTE' }), CUST), 'DENY', ['PRICE_EXPIRED']); const w3 = makeWorld(); const o = ask(w3, REQ({ document_type: 'QUOTE' }), CUST); allow(o); assert.deepEqual(o.response.amounts, [{ amount: '250.00', currency: 'USD', meaning: 'QUOTED_TOTAL' }]); });
C('Mx19', 'reserva cancelada ⇒ DENY BOOKING_CANCELLED_OR_INVALID (A17)', () => { const w = makeWorld(); w.setBooking('B1', { cancelled: true }); scoped(ask(w, REQ(), CUST), 'DENY', ['BOOKING_CANCELLED_OR_INVALID']); });
C('Mx21', 'entrega revalida la puerta ACTUAL del documento (evidencia revocada sin barrido) ⇒ DENY; sin envío', () => { const w = makeWorld(); w.setEvidence('B1', [w.mkEvidence('B1')]); ask(w, REQ({ document_type: 'BOOKING_CONFIRMATION' }), OP); w.setEvidence('B1', [w.mkEvidence('B1', { contract_state: 'REVOKED' })]); const o = ask(w, DEL(), OP); scoped(o, 'DENY', ['SUPPLIER_EVIDENCE_REVOKED']); assert.equal(o.response.document_type, 'SHARE_DOCUMENT'); assert.equal(w.calls.deliver, 0); });
C('Mx22', 'render: tamaño mayor al límite del puerto ⇒ RENDER_FAILED', () => { const w = makeWorld(); w.behavior.render = 'big'; assert.equal(ask(w, REQ(), CUST).document.state, 'RENDER_FAILED'); });
C('Mx23', 'el índice del nonce es por reserva: mismo nonce en dos reservas del mismo principal ⇒ sin conflicto', () => { const w = makeWorld(); w.addBooking('B2'); const a = ask(w, REQ(), CUST); const b = ask(w, REQ({ booking_ref: 'B2' }), CUST); allow(a); allow(b); assert.notEqual(a.document.document_id, b.document.document_id); });
C('Mx24', 'defensa en profundidad: un actor UNVERIFIED se deniega aunque el puerto de acceso fuera permisivo', () => { const w = makeWorld(); w.ports.access.canAccess = () => true; unscoped(ask(w, REQ(), null), 'ACTOR_OUT_OF_SCOPE'); assert.equal(w.calls.render, 0); });
C('Mx20', 'el modelo no escribe nada: reserva/ledger/evidencia congelados y sin intentos comerciales tras una sesión mixta', () => { const w = full(); const before = w.snapshot(); ask(w, REQ({ document_type: 'VOUCHER' }), OP); ask(w, DEL(), OP); ask(w, REQ({ idempotency_nonce: 'z' }), { guest: 'nope' }); assert.equal(w.snapshot(), before); assert.deepEqual(w.commercial.attempts, []); });


// ---------------- Correcciones DM-R1…DM-R5 (OBS-247) — sondas exactas del Curator como regresión + positivos/negativos ----------------
const withLoc = (kind, loc, absent) => { const w = makeWorld(); const e = w.mkEvidence('B1', { kind, locator: loc }); if (absent) { delete e.locator; e.evidence_digest = w.model._internals.evidenceDigestOf(Object.assign({}, e)); } w.setEvidence('B1', [e]); return w; };
C('Dm01', 'DM-R1 sonda exacta: PROVIDER_LOCATOR con localizador vacío/PENDIENTE (y variantes) ⇒ DENY MISSING; render=0', () => { for (const loc of ['', 'PENDIENTE', '  pendiente ', 'none', '   ']) { const w = withLoc('PROVIDER_LOCATOR', loc); scoped(ask(w, REQ({ document_type: 'VOUCHER' }), CUST), 'DENY', ['SUPPLIER_EVIDENCE_MISSING']); assert.equal(w.calls.render, 0, JSON.stringify(loc)); } const w2 = withLoc('PROVIDER_LOCATOR', undefined, true); scoped(ask(w2, REQ({ document_type: 'VOUCHER' }), CUST), 'DENY', ['SUPPLIER_EVIDENCE_MISSING']); assert.equal(w2.calls.render, 0); });
C('Dm02', 'DM-R1 control: localizador real en PROVIDER_LOCATOR ⇒ ALLOW; CONTRACTUAL_BASIS y PROVIDER_ACCEPTANCE no exigen localizador', () => { const a = withLoc('PROVIDER_LOCATOR', 'PRV-777'); allow(ask(a, REQ({ document_type: 'VOUCHER' }), CUST)); assert.equal(a.calls.render, 1); for (const kind of ['CONTRACTUAL_BASIS', 'PROVIDER_ACCEPTANCE']) for (const loc of ['', 'PENDIENTE', undefined]) { const w = withLoc(kind, loc, loc === undefined); allow(ask(w, REQ({ document_type: 'BOOKING_CONFIRMATION' }), OP)); } });
C('Dm03', 'DM-R1 sonda exacta: precio con expires_at malformado ⇒ DENY PRICE_UNVERIFIED; render=0; control válido ⇒ ALLOW', () => { for (const v of ['INVALID', '', null, 12345, '2026-10-28T12:00:00', '2026-13-45T99:00:00Z']) { const w = makeWorld(); w.priceExpires = v; scoped(ask(w, REQ({ document_type: 'QUOTE' }), CUST), 'DENY', ['PRICE_UNVERIFIED']); assert.equal(w.calls.render, 0, String(v)); } const ok = makeWorld(); allow(ask(ok, REQ({ document_type: 'QUOTE' }), CUST)); assert.equal(ok.calls.render, 1); const w2 = makeWorld(); w2.ports.price.get = () => ({ verified: true, amount: '-5.00', currency: 'USD', expires_at: '2026-10-28T12:00:00Z' }); scoped(ask(w2, REQ({ document_type: 'QUOTE' }), CUST), 'DENY', ['PRICE_UNVERIFIED']); const w3 = makeWorld(); w3.ports.price.get = () => ({ verified: true, amount: '5.00', currency: 'EUR', expires_at: '2026-10-28T12:00:00Z' }); scoped(ask(w3, REQ({ document_type: 'QUOTE' }), CUST), 'DENY', ['PRICE_UNVERIFIED']); });
C('Dm04', 'DM-R1: instante de verificación malformado o futuro ⇒ SUPPLIER_EVIDENCE_UNVERIFIED', () => { for (const v of ['ayer', '2026-10-27T11:00:00', '2027-01-01T00:00:00Z']) { const w = makeWorld(); w.setEvidence('B1', [w.mkEvidence('B1', { verification: { verifier_ref: 'INTERNAL_V', verified_at: v, result: 'VERIFIED' } })]); scoped(ask(w, REQ({ document_type: 'BOOKING_CONFIRMATION' }), OP), 'DENY', ['SUPPLIER_EVIDENCE_UNVERIFIED']); assert.equal(w.calls.render, 0, v); } });
C('Dm05', 'DM-R1: reloj ausente, malformado o que lanza ⇒ UNKNOWN AUTHORITY_UNAVAILABLE gobernado (sin excepción ni render)', () => { for (const f of [() => { throw new Error('clock down'); }, () => 'ayer', () => undefined, () => 1700000000000]) { const w = makeWorld(); w.ports.clock.now = f; unscoped(ask(w, REQ(), CUST), 'AUTHORITY_UNAVAILABLE', 'UNKNOWN'); assert.equal(w.calls.render, 0); } });
C('Dm06', 'DM-R1: reserva, ledger, política o política fiscal malformados ⇒ respuesta gobernada sin habilitar', () => {
  const wb = makeWorld(); wb.setBooking('B1', { revision: -1 }); unscoped(ask(wb, REQ(), CUST), 'AUTHORITY_UNAVAILABLE', 'UNKNOWN'); const wc = makeWorld(); wc.setBooking('B1', { cancelled: 'no' }); unscoped(ask(wc, REQ(), CUST), 'AUTHORITY_UNAVAILABLE', 'UNKNOWN');
  const wl = makeWorld(); wl.ledger.get('B1').push({ amount: 12.5, currency: 'USD', reconciled: true }); scoped(ask(wl, REQ({ document_type: 'PAYMENT_RECEIPT' }), OP), 'UNKNOWN', ['AUTHORITY_UNAVAILABLE']);
  const wl2 = makeWorld(); wl2.ledger.get('B1').push({ amount: '5.00', currency: 'EUR', reconciled: true }); scoped(ask(wl2, REQ({ document_type: 'PAYMENT_RECEIPT' }), OP), 'UNKNOWN', ['AUTHORITY_UNAVAILABLE']);
  const wp = makeWorld({ policy: { version: 'P', requires_prepayment: 'si' } }); wp.setEvidence('B1', [wp.mkEvidence('B1')]); scoped(ask(wp, REQ({ document_type: 'VOUCHER' }), OP), 'UNKNOWN', ['POLICY_MISSING']); assert.equal(wp.calls.render, 0);
  const wp2 = makeWorld({ policy: { version: 'P', requires_prepayment: true, min_paid: { amount: 'diez', currency: 'USD' } } }); wp2.setEvidence('B1', [wp2.mkEvidence('B1')]); scoped(ask(wp2, REQ({ document_type: 'VOUCHER' }), OP), 'UNKNOWN', ['POLICY_MISSING']);
  const wf = makeWorld(); wf.fiscalPolicy = { version: 7 }; wf.numbering = { ref: 'N' }; scoped(ask(wf, REQ({ document_type: 'INVOICE' }), OP), 'UNKNOWN', ['FISCAL_POLICY_MISSING']);
});
C('Dm07', 'DM-R2 sondas exactas: ALLOW sin caducidad / allowed_actions [NONE,RENDER] / DENY sin motivos ⇒ inválidos; el consumidor no ofrece acciones', () => {
  const w = makeWorld(); const base = clone(ask(w, REQ(), CUST).response);
  const a = clone(base); delete a.decision_expires_at; assert.equal(M.validatePublic(a).valid, false); assert.deepEqual(M.consumePublic(a).actions, []); assert.equal(M.consumePublic(a).usable, false);
  const b = clone(base); b.allowed_actions = ['NONE', 'RENDER']; assert.equal(M.validatePublic(b).valid, false); assert.deepEqual(M.consumePublic(b).actions, []);
  const c = clone(base); c.decision = 'DENY'; c.reason_codes = []; assert.equal(M.validatePublic(c).valid, false);
  { const wd = makeWorld({ priceOk: false }); const den = clone(ask(wd, REQ({ document_type: 'QUOTE' }), CUST).response); assert.equal(den.decision, 'DENY'); assert.equal(M.validatePublic(den).valid, true); const e = clone(den); e.reason_codes = []; assert.equal(M.validatePublic(e).valid, false); }
  { const wv = makeWorld(); wv.ports.price.get = () => ({ verified: false, amount: '250.00', currency: 'USD', expires_at: wv.priceExpires }); scoped(ask(wv, REQ({ document_type: 'QUOTE' }), CUST), 'DENY', ['PRICE_UNVERIFIED']); }
  { const wr = makeWorld(); const r1 = ask(wr, REQ(), CUST); allow(r1); wr.advance(60000); const r2 = ask(wr, REQ(), CUST); allow(r2); assert.equal(r2.response.decision_expires_at, r1.response.decision_expires_at); }
  assert.equal(M.validatePublic(base).valid, true); assert.deepEqual(M.consumePublic(base).actions, ['RENDER', 'DELIVER']);
});
C('Dm08', 'DM-R2: condiciones de presencia/exclusión entre campos (decisión, motivos, acciones, caducidad, importes, evidencia, formas discriminadas)', () => {
  const w = full(); const q = clone(ask(w, REQ({ document_type: 'QUOTE' }), OP).response); const cf = clone(ask(w, REQ({ document_type: 'BOOKING_CONFIRMATION', idempotency_nonce: 'c' }), OP).response); const un = clone(ask(makeWorld(), REQ(), null).response); const uk = clone(ask(makeWorld(), REQ(), { unavailable: true }).response);
  const bad = (o, f) => { const x = clone(o); f(x); assert.equal(M.validatePublic(x).valid, false, JSON.stringify(f.toString())); };
  bad(q, (x) => { x.reason_codes = ['PRICE_EXPIRED']; }); bad(q, (x) => { x.evidence_revisions = [{ kind: 'PROVIDER_LOCATOR', evidence_revision: 1 }]; });
  bad(cf, (x) => { delete x.evidence_revisions; }); bad(cf, (x) => { x.evidence_revisions = []; });
  const dn = asDeny(clone(q), ['PRICE_EXPIRED']); assert.equal(M.validatePublic(dn).valid, true);
  bad(dn, (x) => { x.decision_expires_at = '2026-10-28T12:00:00Z'; }); bad(dn, (x) => { x.amounts = [{ amount: '1.00', currency: 'USD', meaning: 'QUOTED_TOTAL' }]; }); bad(dn, (x) => { x.allowed_actions = ['RENDER']; }); bad(dn, (x) => { x.evidence_revisions = [{ kind: 'PROVIDER_LOCATOR', evidence_revision: 1 }]; });
  bad(dn, (x) => { x.decision = 'UNKNOWN'; }); bad(dn, (x) => { x.reason_codes = ['POLICY_MISSING']; });
  const unk = clone(dn); unk.decision = 'UNKNOWN'; unk.reason_codes = ['POLICY_MISSING']; assert.equal(M.validatePublic(unk).valid, true);
  bad(un, (x) => { x.decision = 'UNKNOWN'; }); bad(uk, (x) => { x.decision = 'DENY'; }); bad(un, (x) => { x.reason_codes = ['AUTHORITY_UNAVAILABLE']; });
  assert.equal(M.validatePublic(un).valid, true); assert.equal(M.validatePublic(uk).valid, true);
  const doc = clone(ask(makeWorld(), REQ(), CUST).document); const d1 = clone(doc); delete d1.artifact; assert.equal(M.validateDocumentPublic(d1).valid, false); const d2 = clone(doc); d2.state = 'RENDER_FAILED'; assert.equal(M.validateDocumentPublic(d2).valid, false); d2.state = 'VOIDED'; assert.equal(M.validateDocumentPublic(d2).valid, true);
  const w2 = makeWorld(); ask(w2, REQ(), CUST); const dv = clone(ask(w2, DEL(), CUST).delivery); const v1 = clone(dv); delete v1.ack; assert.equal(M.validateDeliveryPublic(v1).valid, false); const v2 = clone(dv); v2.state = 'UNCONFIRMED'; assert.equal(M.validateDeliveryPublic(v2).valid, false);
});
C('Dm09', 'DM-R3 sonda exacta: replay con documento anulado (condición restaurada sin nueva revisión) ⇒ DENY gobernado; sin segundo render; historial intacto', () => {
  const w = makeWorld(); w.setEvidence('B1', [w.mkEvidence('B1')]); const req = REQ({ document_type: 'VOUCHER' }); allow(ask(w, req, CUST)); w.setBooking('B1', { cancelled: true }); w.model.sweep(); w.setBooking('B1', { cancelled: false });
  const r = ask(w, req, CUST); scoped(r, 'DENY', ['BOOKING_CANCELLED_OR_INVALID']); assert.equal(r.document.state, 'VOIDED'); assert.deepEqual(r.response.allowed_actions, ['NONE']); assert.equal(r.replay, undefined); assert.equal(w.calls.render, 1); assert.equal(w.model.inspect().docs.length, 1);
  scoped(ask(w, DEL(), CUST), 'DENY', ['BOOKING_CANCELLED_OR_INVALID']); assert.equal(w.calls.deliver, 0);
  const w2 = makeWorld(); const q = REQ({ document_type: 'QUOTE' }); ask(w2, q, CUST); w2.bump('B1'); w2.model.sweep(); w2.setBooking('B1', { revision: 1 }); const r2 = ask(w2, q, CUST); scoped(r2, 'DENY', ['REVISION_CHANGED']); assert.equal(r2.document.state, 'SUPERSEDED'); assert.equal(w2.calls.render, 1);
  const w3 = makeWorld(); w3.setEvidence('B1', [w3.mkEvidence('B1')]); const c = REQ({ document_type: 'BOOKING_CONFIRMATION' }); ask(w3, c, OP); w3.setEvidence('B1', [w3.mkEvidence('B1', { contract_state: 'REVOKED' })]); w3.model.sweep(); w3.setEvidence('B1', [w3.mkEvidence('B1')]); const r3 = ask(w3, c, OP); scoped(r3, 'DENY', ['SUPPLIER_EVIDENCE_REVOKED']); assert.equal(r3.document.state, 'VOIDED'); scoped(ask(w3, DEL(), OP), 'DENY', ['SUPPLIER_EVIDENCE_REVOKED']); assert.equal(w3.calls.deliver, 0);
});
C('Dm10', 'DM-R3: artefacto válido / fallido / incierto en replay: solo el válido es accionable; nunca se re-renderiza', () => {
  const ok = makeWorld(); const a = ask(ok, REQ(), CUST); assert.deepEqual(a.response.allowed_actions, ['RENDER', 'DELIVER']); const a2 = ask(ok, REQ(), CUST); assert.deepEqual(a2.response, a.response); assert.equal(ok.calls.render, 1);
  for (const [b, st] of [['fail', 'RENDER_FAILED'], ['baddigest', 'RENDER_FAILED'], ['throw', 'DECISION_ISSUED']]) { const w = makeWorld(); w.behavior.render = b; const f = ask(w, REQ(), CUST); allow(f); assert.equal(f.document.state, st); assert.deepEqual(f.response.allowed_actions, ['NONE']); w.behavior.render = 'ok'; const g = ask(w, REQ(), CUST); allow(g); assert.equal(g.document.state, st); assert.deepEqual(g.response.allowed_actions, ['NONE']); assert.equal(w.calls.render, 1); assert.equal(g.response.decision_expires_at, f.response.decision_expires_at); }
});
C('Dm11', 'DM-R4 sonda exacta: la revisión cambia DURANTE el render ⇒ no se presenta como vigente; evidencia del intento conservada', () => {
  const w = makeWorld(); const original = w.ports.renderer.render; w.ports.renderer.render = (sp) => { w.bump('B1'); return original(sp); };
  const r = ask(w, REQ(), CUST); scoped(r, 'DENY', ['REVISION_CHANGED']); assert.equal(r.response.booking_revision, 2); assert.equal(w.bookings.get('B1').revision, 2); assert.equal(r.document.state, 'SUPERSEDED'); assert.ok(r.document.artifact, 'el artefacto del intento se conserva'); assert.deepEqual(r.response.allowed_actions, ['NONE']);
  const again = ask(w, REQ(), CUST); scoped(again, 'DENY', ['REVISION_CHANGED']); assert.equal(w.calls.render, 1); assert.equal(w.model.inspect().docs.length, 1);
  scoped(ask(w, DEL(), CUST), 'DENY', ['REVISION_CHANGED']); assert.equal(w.calls.deliver, 0);
  const ctl = makeWorld(); const c = ask(ctl, REQ(), CUST); allow(c); assert.equal(c.document.state, 'RENDERED');
});
C('Dm12', 'DM-R4: deriva en cancelación, proveedor (evidencia), política, alcance, caducidad o reloj durante el render ⇒ fail-closed sin duplicar', () => {
  const drift = (setup, apply, type, nonce) => { const w = makeWorld(); setup(w); const o = w.ports.renderer.render; w.ports.renderer.render = (sp) => { apply(w); return o(sp); }; return [w, ask(w, REQ({ document_type: type || 'REQUEST_ACK', idempotency_nonce: nonce || 'n1' }), type === 'VOUCHER' ? OP : CUST)]; };
  let [w, r] = drift(() => {}, (x) => x.setBooking('B1', { cancelled: true })); scoped(r, 'DENY', ['BOOKING_CANCELLED_OR_INVALID']); assert.equal(r.document.state, 'VOIDED'); assert.equal(w.calls.render, 1);
  [w, r] = drift((x) => x.setEvidence('B1', [x.mkEvidence('B1')]), (x) => x.setEvidence('B1', [x.mkEvidence('B1', { contract_state: 'REVOKED' })]), 'VOUCHER'); scoped(r, 'DENY', ['SUPPLIER_EVIDENCE_REVOKED']); assert.equal(r.document.state, 'VOIDED');
  [w, r] = drift((x) => x.setEvidence('B1', [x.mkEvidence('B1')]), (x) => { x.policy = null; }, 'VOUCHER'); scoped(r, 'UNKNOWN', ['POLICY_MISSING']); assert.equal(r.document.state, 'VOIDED'); w.policy = { version: 'P7', requires_prepayment: false }; const rp = ask(w, REQ({ document_type: 'VOUCHER' }), OP); scoped(rp, 'UNKNOWN', ['POLICY_MISSING']); assert.equal(rp.document.state, 'VOIDED'); assert.equal(w.calls.render, 1);
  [w, r] = drift(() => {}, (x) => x.setBooking('B1', { owner: 'cust9' })); unscoped(r, 'ACTOR_OUT_OF_SCOPE'); assert.equal(r.document, undefined); assert.equal(w.model.inspect().docs[0].state, 'VOIDED');
  [w, r] = drift(() => {}, (x) => x.advance(TTL + 1000)); scoped(r, 'DENY', ['DECISION_EXPIRED']); assert.deepEqual(r.response.allowed_actions, ['NONE']);
  [w, r] = drift(() => {}, (x) => { x.ports.clock.now = () => 'ayer'; }); unscoped(r, 'AUTHORITY_UNAVAILABLE', 'UNKNOWN'); assert.equal(w.model.inspect().docs[0].state, 'VOIDED'); // sin reloj no se acredita el alcance actual (BND-2)
  [w, r] = drift(() => {}, (x) => { x.ports.identity.resolve = () => { throw new Error('down'); }; }); unscoped(r, 'AUTHORITY_UNAVAILABLE', 'UNKNOWN'); assert.equal(w.model.inspect().docs[0].state, 'VOIDED');
  [w, r] = drift(() => {}, (x) => { x.setBooking('B1', { owner: 'cust2' }); x.ports.identity.resolve = () => ({ status: 'OK', actor: { kind: 'ACCOUNT', principal_scope: 'cust2' } }); }); unscoped(r, 'ACTOR_OUT_OF_SCOPE'); assert.equal(w.model.inspect().docs[0].state, 'VOIDED');
  [w, r] = drift(() => {}, () => {}); allow(r); assert.equal(r.document.state, 'RENDERED');
});
C('Dm13', 'DM-R4: deriva durante el ENVÍO ⇒ el intento queda registrado pero el sobre no se presenta como vigente; sin segundo envío', () => {
  const w = makeWorld(); ask(w, REQ(), CUST); const o = w.ports.channel.deliver; w.ports.channel.deliver = (x) => { w.bump('B1'); return o(x); };
  const r = ask(w, DEL(), CUST); scoped(r, 'DENY', ['REVISION_CHANGED']); assert.equal(r.delivery.state, 'ACKED_BY_CHANNEL'); assert.equal(w.calls.deliver, 1); assert.equal(r.response.booking_revision, 2);
  scoped(ask(w, DEL(), CUST), 'DENY', ['REVISION_CHANGED']); assert.equal(w.calls.deliver, 1);
  const w2 = makeWorld(); ask(w2, REQ(), CUST); const o2 = w2.ports.channel.deliver; w2.ports.channel.deliver = (x) => { w2.setBooking('B1', { owner: 'cust9' }); return o2(x); }; unscoped(ask(w2, DEL(), CUST), 'ACTOR_OUT_OF_SCOPE'); assert.equal(w2.calls.deliver, 1);
});
C('Dm14', 'DM-R5: las respuestas de entrega (normal, replay, incierta) llevan decision_expires_at de la autorización del documento y NO la renuevan', () => {
  const w = makeWorld(); const rq = ask(w, REQ(), CUST); const exp = rq.response.decision_expires_at;
  const a = ask(w, DEL(), CUST); allow(a); assert.deepEqual(M.consumePublic(a.response).actions, []); assert.equal(a.response.decision_expires_at, exp); assert.equal(a.response.booking_revision, 1);
  w.advance(5 * 60 * 1000); const b = ask(w, DEL(), CUST); assert.equal(b.replay, true); assert.equal(b.response.decision_expires_at, exp);
  const w2 = makeWorld(); const rq2 = ask(w2, REQ(), CUST); w2.behavior.deliver = 'ok_url'; const u = ask(w2, DEL(), CUST); assert.equal(u.delivery.state, 'UNCONFIRMED'); assert.equal(u.response.decision_expires_at, rq2.response.decision_expires_at); w2.advance(60 * 1000); const u2 = ask(w2, DEL({ idempotency_nonce: 'd2' }), CUST); assert.equal(u2.delivery.delivery_id, u.delivery.delivery_id); assert.equal(u2.response.decision_expires_at, rq2.response.decision_expires_at);
  w.advance(TTL); scoped(ask(w, DEL({ idempotency_nonce: 'd9' }), CUST), 'DENY', ['DECISION_EXPIRED']);
});

// ---------------- OBS-248: residuales DM-R4-A / DM-R4-B / DM-R5-A / DM-E1 ----------------
const hook = (w, port, fn, after) => { const o = port.render ? 'render' : port.deliver ? 'deliver' : null; const orig = port[o]; port[o] = (x) => { const r = orig(x); fn(w); return r; }; };
C('Rs01', 'DM-R4-A sonda exacta: el precio cambia (válido, misma moneda) durante el render ⇒ no se libera el importe anterior como vigente; artefacto y evidencia conservados; sin re-render', () => {
  const w = makeWorld(); hook(w, w.ports.renderer, (x) => { x.ports.price.get = () => ({ verified: true, amount: '9999.00', currency: 'USD', expires_at: '2026-10-28T12:00:00Z' }); });
  const r = ask(w, REQ({ document_type: 'QUOTE' }), CUST); scoped(r, 'DENY', ['REVISION_CHANGED']); assert.equal(r.response.amounts, undefined); assert.equal(r.document.state, 'SUPERSEDED'); assert.ok(r.document.artifact); assert.equal(w.calls.render, 1);
  const again = ask(w, REQ({ document_type: 'QUOTE' }), CUST); scoped(again, 'DENY', ['REVISION_CHANGED']); assert.equal(w.calls.render, 1);
  const wd = ask(w, DEL(), CUST); scoped(wd, 'DENY', ['REVISION_CHANGED']); assert.equal(w.calls.deliver, 0);
});
C('Rs02', 'DM-R4-A: evidencia válida distinta, política válida distinta y control sin deriva / cambio irrelevante', () => {
  let w = full(); hook(w, w.ports.renderer, (x) => { x.setEvidence('B1', [x.mkEvidence('B1', { evidence_revision: 2, locator: 'PRV-888' })]); });
  let r = ask(w, REQ({ document_type: 'BOOKING_CONFIRMATION' }), OP); scoped(r, 'DENY', ['REVISION_CHANGED']); assert.equal(r.document.state, 'SUPERSEDED');
  w = full(); hook(w, w.ports.renderer, (x) => { x.policy = { version: 'P8', requires_prepayment: false }; });
  r = ask(w, REQ({ document_type: 'VOUCHER' }), OP); scoped(r, 'DENY', ['REVISION_CHANGED']); assert.equal(r.document.state, 'SUPERSEDED');
  w = full(); hook(w, w.ports.renderer, (x) => { x.policy = { version: 'P7', requires_prepayment: true, min_paid: { amount: '50.00', currency: 'USD' } }; });
  r = ask(w, REQ({ document_type: 'VOUCHER' }), OP); scoped(r, 'DENY', ['REVISION_CHANGED']);
  w = full(); hook(w, w.ports.renderer, (x) => { x.fiscalPolicy = { version: 'F4' }; });
  r = ask(w, REQ({ document_type: 'INVOICE' }), OP); scoped(r, 'DENY', ['REVISION_CHANGED']); assert.equal(r.document.state, 'SUPERSEDED');
  w = full(); r = ask(w, REQ({ document_type: 'VOUCHER' }), OP); allow(r); assert.equal(r.document.state, 'RENDERED');
  w = makeWorld(); hook(w, w.ports.renderer, (x) => { x.priceExpires = '2026-10-29T12:00:00Z'; x.addPayment('B1', '5.00', 'USD', true); });
  r = ask(w, REQ({ document_type: 'QUOTE' }), CUST); allow(r); assert.equal(r.document.state, 'RENDERED');
  w = full(); hook(w, w.ports.renderer, (x) => { x.addPayment('B1', '5.00', 'USD', true); });
  r = ask(w, REQ({ document_type: 'PAYMENT_RECEIPT' }), OP); scoped(r, 'DENY', ['REVISION_CHANGED']);
});
C('Rs03', 'DM-R4-A: deriva de contenido tras el RENDER detectada en replay, entrega y barrido', () => {
  const w = makeWorld(); const r = ask(w, REQ({ document_type: 'QUOTE' }), CUST); allow(r);
  w.ports.price.get = () => ({ verified: true, amount: '777.00', currency: 'USD', expires_at: w.priceExpires });
  const rp = ask(w, REQ({ document_type: 'QUOTE' }), CUST); scoped(rp, 'DENY', ['REVISION_CHANGED']); assert.equal(rp.document.state, 'SUPERSEDED'); assert.equal(w.calls.render, 1);
  const w2 = makeWorld(); ask(w2, REQ({ document_type: 'QUOTE' }), CUST); w2.ports.price.get = () => ({ verified: true, amount: '777.00', currency: 'USD', expires_at: w2.priceExpires });
  scoped(ask(w2, DEL(), CUST), 'DENY', ['REVISION_CHANGED']); assert.equal(w2.calls.deliver, 0); assert.equal(w2.model.inspect().docs[0].state, 'SUPERSEDED');
  const w3 = makeWorld(); ask(w3, REQ({ document_type: 'QUOTE' }), CUST); w3.ports.price.get = () => ({ verified: true, amount: '777.00', currency: 'USD', expires_at: w3.priceExpires }); w3.model.sweep(); assert.equal(w3.model.inspect().docs[0].state, 'SUPERSEDED');
  const w4 = makeWorld(); ask(w4, REQ({ document_type: 'QUOTE' }), CUST); w4.model.sweep(); assert.equal(w4.model.inspect().docs[0].state, 'RENDERED');
  const w5 = makeWorld(); ask(w5, REQ(), CUST); w5.ports.channel.deliver = ((o) => (x) => { w5.ports.price.get = () => ({ verified: true, amount: '1.00', currency: 'USD', expires_at: w5.priceExpires }); return o(x); })(w5.ports.channel.deliver); allow(ask(w5, DEL(), CUST));
  const w6 = makeWorld(); ask(w6, REQ({ document_type: 'QUOTE' }), CUST); w6.ports.channel.deliver = ((o) => (x) => { w6.ports.price.get = () => ({ verified: true, amount: '1.00', currency: 'USD', expires_at: w6.priceExpires }); return o(x); })(w6.ports.channel.deliver);
  const d6 = ask(w6, DEL(), CUST); scoped(d6, 'DENY', ['REVISION_CHANGED']); assert.equal(d6.delivery.state, 'ACKED_BY_CHANNEL'); assert.equal(w6.calls.deliver, 1); assert.equal(w6.model.inspect().docs[0].state, 'SUPERSEDED');
});
C('Rs04', 'DM-R4-B sonda exacta: el invitado pierde el alcance de comando/tipo durante el render ⇒ no se libera; mismo principal y propiedad no bastan', () => {
  for (const patch of [{ commands: [], types: [], share_kinds: [] }, { commands: ['REQUEST_DOCUMENT'], types: ['QUOTE'], share_kinds: [] }, { commands: ['DELIVER_DOCUMENT'], types: ['REQUEST_ACK'], share_kinds: [] }]) {
    const w = makeWorld(); w.addGuest('g', 'B1'); hook(w, w.ports.renderer, (x) => { x.ports.policy.guestScope = () => patch; });
    const r = ask(w, REQ(), { guest: 'g' }); scoped(r, 'DENY', ['GUEST_ACCESS_OUT_OF_SCOPE']); assert.equal(w.calls.render, 1); assert.equal(w.model.inspect().docs[0].state, 'VOIDED'); assert.deepEqual(r.response.allowed_actions, ['NONE']);
  }
  const wc = makeWorld(); wc.addGuest('g', 'B1'); allow(ask(wc, REQ(), { guest: 'g' }));
  const wu = makeWorld(); wu.addGuest('g', 'B1'); hook(wu, wu.ports.renderer, (x) => { x.ports.policy.guestScope = () => { throw new Error('policy down'); }; }); const ru = ask(wu, REQ(), { guest: 'g' }); unscoped(ru, 'AUTHORITY_UNAVAILABLE', 'UNKNOWN'); assert.equal(wu.model.inspect().docs[0].state, 'VOIDED'); unscoped(ask(wu, REQ({ idempotency_nonce: 'n9' }), { guest: 'g' }), 'AUTHORITY_UNAVAILABLE', 'UNKNOWN');
  const wm = makeWorld(); wm.addGuest('g', 'B1'); hook(wm, wm.ports.renderer, (x) => { x.ports.policy.guestScope = () => null; }); unscoped(ask(wm, REQ(), { guest: 'g' }), 'AUTHORITY_UNAVAILABLE', 'UNKNOWN');
});
C('Rs05', 'DM-R4-B: alcance de destinatario/compartir revocado durante la ENTREGA; tenant/clase/principal cambiados; el acuse histórico se conserva', () => {
  const w = makeWorld(); w.addGuest('g', 'B1'); ask(w, REQ(), { guest: 'g' }); hook(w, w.ports.channel, (x) => { x.ports.policy.guestScope = () => ({ commands: ['REQUEST_DOCUMENT', 'DELIVER_DOCUMENT'], types: ['REQUEST_ACK'], share_kinds: [] }); });
  const r = ask(w, DEL(), { guest: 'g' }); scoped(r, 'DENY', ['GUEST_ACCESS_OUT_OF_SCOPE']); assert.equal(r.delivery, undefined); assert.equal(w.model.inspect().deliveries[0].state, 'ACKED_BY_CHANNEL'); assert.equal(w.calls.deliver, 1); assert.deepEqual(r.response.allowed_actions, ['NONE']); // BND-2: acuse interno, no divulgado sin alcance
  const w2 = makeWorld(); w2.addGuest('g', 'B1'); ask(w2, REQ(), { guest: 'g' }); w2.ports.policy.guestScope = () => ({ commands: ['REQUEST_DOCUMENT', 'DELIVER_DOCUMENT'], types: ['REQUEST_ACK'], share_kinds: [] });
  scoped(ask(w2, DEL(), { guest: 'g' }), 'DENY', ['GUEST_ACCESS_OUT_OF_SCOPE']); assert.equal(w2.calls.deliver, 0);
  const w3 = makeWorld(); ask(w3, REQ(), OP); w3.ports.identity.resolve = ((o) => (c) => { const x = o(c); return x.actor.kind === 'OPERATOR' ? { status: 'OK', actor: Object.assign({}, x.actor, { tenant_scope: 'T9' }) } : x; })(w3.ports.identity.resolve);
  hook(w3, w3.ports.renderer, () => {}); const w4 = makeWorld(); hook(w4, w4.ports.renderer, (x) => { const o = x.ports.identity.resolve; x.ports.identity.resolve = (c) => { const y = o(c); return { status: 'OK', actor: Object.assign({}, y.actor, { tenant_scope: 'T9' }) }; }; x.ports.access.canAccess = () => true; });
  unscoped(ask(w4, REQ(), OP), 'ACTOR_OUT_OF_SCOPE'); assert.equal(w4.model.inspect().docs[0].state, 'VOIDED');
  const w5 = makeWorld(); hook(w5, w5.ports.renderer, (x) => { const o = x.ports.identity.resolve; x.ports.identity.resolve = (c) => { const y = o(c); return { status: 'OK', actor: Object.assign({}, y.actor, { kind: 'OPERATOR' }) }; }; x.ports.access.canAccess = () => true; });
  unscoped(ask(w5, REQ(), CUST), 'ACTOR_OUT_OF_SCOPE');
});
C('Rs06', 'DM-R5-A sonda exacta: la caducidad se cruza durante el envío ⇒ sin ALLOW vencido; el acuse se conserva; sin segundo efecto', () => {
  const run = (adv, beh) => { const w = makeWorld(); ask(w, REQ(), CUST); w.behavior.deliver = beh || 'ack'; const o = w.ports.channel.deliver; w.ports.channel.deliver = (x) => { try { return o(x); } finally { w.advance(adv); } }; return [w, ask(w, DEL(), CUST)]; };
  let [w, r] = run(TTL + 60 * 1000); scoped(r, 'DENY', ['DECISION_EXPIRED']); assert.equal(r.delivery.state, 'ACKED_BY_CHANNEL'); assert.deepEqual(r.response.allowed_actions, ['NONE']); assert.equal(w.calls.deliver, 1);
  const rp = ask(w, DEL(), CUST); scoped(rp, 'DENY', ['DECISION_EXPIRED']); assert.equal(rp.delivery.state, 'ACKED_BY_CHANNEL'); assert.equal(w.calls.deliver, 1);
  scoped(ask(w, DEL({ idempotency_nonce: 'd7' }), CUST), 'DENY', ['DECISION_EXPIRED']); assert.equal(w.calls.deliver, 1);
  [w, r] = run(TTL); scoped(r, 'DENY', ['DECISION_EXPIRED']); assert.equal(r.delivery.state, 'ACKED_BY_CHANNEL'); // exactamente en el límite ⇒ vencido
  [w, r] = run(TTL - 1000); allow(r); assert.equal(r.delivery.state, 'ACKED_BY_CHANNEL'); // antes del límite
  [w, r] = run(TTL + 1000, 'ok_url'); scoped(r, 'DENY', ['DECISION_EXPIRED']); assert.equal(r.delivery.state, 'UNCONFIRMED');
  [w, r] = run(TTL + 1000, 'fail'); scoped(r, 'DENY', ['DECISION_EXPIRED']); assert.equal(r.delivery.state, 'FAILED');
  [w, r] = run(TTL + 1000, 'throw'); scoped(r, 'DENY', ['DECISION_EXPIRED']); assert.equal(r.delivery.state, 'UNCONFIRMED');
  const rec = w.model.reconcileDelivery(r.delivery.delivery_id, { ack: { kind: 'CHANNEL_ACK' } }); assert.equal(rec.state, 'ACKED_BY_CHANNEL'); assert.equal(w.calls.deliver, 1);
});
C('Rs07', 'DM-R5-A: un replay denegado NO borra el registro de la entrega original (no habilita un segundo efecto al volver la autorización)', () => {
  const w = makeWorld(); ask(w, REQ(), CUST); allow(ask(w, DEL(), CUST)); assert.equal(w.calls.deliver, 1);
  w.setBooking('B1', { owner: 'cust9' }); unscoped(ask(w, DEL(), CUST), 'ACTOR_OUT_OF_SCOPE'); w.setBooking('B1', { owner: 'cust1' });
  const w2 = makeWorld(); ask(w2, REQ(), CUST); allow(ask(w2, DEL(), CUST)); w2.ports.policy.get = () => null; ask(w2, DEL(), CUST); w2.policy = { version: 'P7', requires_prepayment: false }; w2.ports.policy.get = () => w2.policy;
  w2.setBooking('B1', { guest_on_file: false }); scoped(ask(w2, DEL(), CUST), 'DENY', ['RECIPIENT_MISSING']); w2.setBooking('B1', { guest_on_file: true });
  const again = ask(w2, DEL(), CUST); assert.equal(again.replay, true); assert.equal(w2.calls.deliver, 1);
});
C('Rs08', 'DM-E1 sonda exacta M63: cancelación + cambio de revisión simultáneos ⇒ el barrido deja VOIDED (no SUPERSEDED)', () => {
  const w = makeWorld(); ask(w, REQ(), CUST); w.setBooking('B1', { cancelled: true, revision: 2 }); w.model.sweep(); assert.equal(w.model.inspect().docs[0].state, 'VOIDED');
  const w2 = makeWorld(); ask(w2, REQ(), CUST); w2.setBooking('B1', { revision: 2 }); w2.model.sweep(); assert.equal(w2.model.inspect().docs[0].state, 'SUPERSEDED');
  const w3 = makeWorld(); ask(w3, REQ(), CUST); w3.setBooking('B1', { cancelled: true, revision: 2 }); w3.model.sweep(); scoped(ask(w3, REQ(), CUST), 'DENY', ['BOOKING_CANCELLED_OR_INVALID']);
});

C('Rs09', 'DM-E1 / M61 / M64: precedencia de revisión frente a cancelación/evidencia en la entrega y en el barrido; selección distinta con la misma revisión', () => {
  const w = full(); ask(w, REQ({ document_type: 'VOUCHER' }), OP); w.setBooking('B1', { cancelled: true, revision: 2 });
  scoped(ask(w, DEL(), OP), 'DENY', ['REVISION_CHANGED']); assert.equal(w.calls.deliver, 0); // la revisión del documento precede a la reevaluación: no se re-explica con otro código
  const w2 = full(); ask(w2, REQ({ document_type: 'VOUCHER' }), OP); w2.setBooking('B1', { revision: 2 }); w2.setEvidence('B1', [w2.mkEvidence('B1', { contract_state: 'REVOKED' })]); w2.model.sweep(); assert.equal(w2.model.inspect().docs[0].state, 'SUPERSEDED');
  const w3 = full(); ask(w3, REQ({ document_type: 'VOUCHER' }), OP); w3.setBooking('B1', { selection_digest: M.sha('otra') }); w3.model.sweep(); assert.equal(w3.model.inspect().docs[0].state, 'VOIDED'); // evidencia ligada a otra selección ⇒ anulado
  const w4 = makeWorld(); ask(w4, REQ(), CUST); w4.setBooking('B1', { selection_digest: M.sha('otra') }); w4.model.sweep(); assert.equal(w4.model.inspect().docs[0].state, 'SUPERSEDED'); scoped(ask(w4, DEL(), CUST), 'DENY', ['REVISION_CHANGED']); assert.equal(w4.calls.deliver, 0);
  const w5 = makeWorld(); ask(w5, REQ(), CUST); w5.ports.channel.deliver = ((o) => (x) => { w5.setBooking('B1', { selection_digest: M.sha('otra') }); return o(x); })(w5.ports.channel.deliver); const r5 = ask(w5, DEL(), CUST); scoped(r5, 'DENY', ['REVISION_CHANGED']); assert.equal(r5.delivery.state, 'ACKED_BY_CHANNEL'); assert.equal(w5.model.inspect().docs[0].state, 'SUPERSEDED');
});
C('Rs10', 'DM-R4-A/R5-A: salidas aplicables sin ALLOW vencido ni liberación de contenido anterior (render + deriva simultánea, error del puerto tras envío)', () => {
  const w = makeWorld(); ask(w, REQ(), CUST); const o = w.ports.channel.deliver; w.ports.channel.deliver = (x) => { const r = o(x); w.ports.bookings.get = () => { throw new Error('down'); }; return r; };
  const r = ask(w, DEL(), CUST); unscoped(r, 'AUTHORITY_UNAVAILABLE', 'UNKNOWN'); assert.equal(w.calls.deliver, 1);
  const wk = makeWorld(); ask(wk, REQ(), CUST); const ok_ = wk.ports.channel.deliver; wk.ports.channel.deliver = (x) => { const r = ok_(x); wk.ports.channel.catalog = () => { throw new Error('down'); }; return r; };
  const rk = ask(wk, DEL(), CUST); scoped(rk, 'UNKNOWN', ['AUTHORITY_UNAVAILABLE']); assert.equal(rk.delivery.state, 'ACKED_BY_CHANNEL');
  const w2 = makeWorld(); hook(w2, w2.ports.renderer, (x) => { x.advance(TTL + 1000); x.ports.price.get = () => ({ verified: true, amount: '1.00', currency: 'USD', expires_at: '2026-10-29T12:00:00Z' }); });
  const r2 = ask(w2, REQ({ document_type: 'QUOTE' }), CUST); assert.equal(r2.response.decision, 'DENY'); assert.equal(r2.document.state, 'SUPERSEDED');
});

// ---------------- OBS-249: fronteras BND-1 (aislamiento de datos) y BND-2 (proyección exterior) ----------------
C('Bn01', 'BND-1 sonda exacta: el renderizador altera por referencia el importe de su entrada ⇒ la decisión no cambia, el resultado no se libera como vigente; intento conservado, sin re-render', () => {
  const w = makeWorld(); const o = w.ports.renderer.render; w.ports.renderer.render = (s) => { s.amounts[0].amount = '9999.00'; return o(s); };
  const r = ask(w, REQ({ document_type: 'QUOTE' }), CUST); assert.ok(!JSON.stringify(r).includes('9999')); assert.equal(r.document.state, 'RENDER_FAILED'); assert.equal(r.document.artifact, undefined); assert.deepEqual(r.response.allowed_actions, ['NONE']); assert.deepEqual(r.response.amounts, [{ amount: '250.00', currency: 'USD', meaning: 'QUOTED_TOTAL' }]); assert.equal(w.ports.price.get().amount, '250.00'); assert.equal(w.calls.render, 1);
  const again = ask(w, REQ({ document_type: 'QUOTE' }), CUST); assert.ok(!JSON.stringify(again).includes('9999')); assert.equal(w.calls.render, 1);
  const wd = ask(w, DEL(), CUST); assert.equal(w.calls.deliver, 0); assert.notEqual(wd.response.decision, 'UNKNOWN');
});
C('Bn02', 'BND-1: añadir/borrar/reordenar elementos, cambiar moneda, significado o campos de la petición; control de renderizador de solo lectura', () => {
  const muts = { add: (s) => s.amounts.push({ amount: '1.00', currency: 'USD', meaning: 'PAID_TOTAL' }), del: (s) => s.amounts.pop(), cur: (s) => { s.amounts[0].currency = 'EUR'; }, meaning: (s) => { s.amounts[0].meaning = 'QUOTED_TOTAL'; }, rev: (s) => { s.booking_revision = 99; }, type: (s) => { s.document_type = 'INVOICE'; }, ref: (s) => { s.booking_ref = 'B9'; }, replace: (s) => { s.amounts = []; }, freeze: (s) => { Object.freeze(s); } };
  for (const [k, f] of Object.entries(muts)) { const w = full(); const o = w.ports.renderer.render; w.ports.renderer.render = (s) => { try { f(s); } catch (e) { /* congelado */ } return o(s); }; const r = ask(w, REQ({ document_type: 'PAYMENT_RECEIPT' }), OP); if (k === 'freeze') { assert.equal(r.document.state, 'RENDERED'); continue; } assert.equal(r.document.state, 'RENDER_FAILED', k); assert.deepEqual(r.response.amounts, [{ amount: '100.00', currency: 'USD', meaning: 'PAID_TOTAL' }], k); assert.equal(w.calls.render, 1); }
  const wr = makeWorld(); const o = wr.ports.renderer.render; let seen; wr.ports.renderer.render = (s) => { seen = JSON.stringify(s); return o(s); }; const c = ask(wr, REQ({ document_type: 'QUOTE' }), CUST); allow(c); assert.equal(c.document.state, 'RENDERED'); assert.ok(seen.includes('250.00'));
});
C('Bn03', 'BND-1: los datos que entran por un puerto se copian; mutar el objeto del puerto durante el render no altera lo proyectado y se detecta como deriva de la fuente', () => {
  const w = full(); const shared = [w.mkEvidence('B1')]; w.ports.evidence.list = () => shared;
  const o = w.ports.renderer.render; w.ports.renderer.render = (s) => { shared[0].evidence_revision = 5; return o(s); };
  const r = ask(w, REQ({ document_type: 'BOOKING_CONFIRMATION' }), OP); assert.equal(r.response.decision, 'DENY'); assert.ok(!JSON.stringify(r).includes('"evidence_revision":5')); assert.equal(r.document.state, 'VOIDED');
  const w2 = makeWorld(); let pr = { verified: true, amount: '250.00', currency: 'USD', expires_at: w2.priceExpires }; w2.ports.price.get = () => pr; const o2 = w2.ports.renderer.render; w2.ports.renderer.render = (s) => { pr.amount = '9999.00'; return o2(s); };
  const r2 = ask(w2, REQ({ document_type: 'QUOTE' }), CUST); assert.equal(r2.response.decision, 'DENY'); assert.equal(r2.document.state, 'SUPERSEDED');
});
C('Bn04', 'BND-2 sonda exacta: invitado revocado durante el envío ⇒ exterior solo la denegación; acuse interno conservado; recuperación solo con acceso actual y sin segundo envío', () => {
  const w = makeWorld(); w.addGuest('g', 'B1'); const cred = { guest: 'g' }; ask(w, REQ(), cred);
  const o = w.ports.channel.deliver; w.ports.channel.deliver = (x) => { w.guestsTable.g.state = 'REVOKED'; return o(x); };
  const r = ask(w, DEL(), cred); unscoped(r, 'GUEST_ACCESS_INVALID'); assert.deepEqual(Object.keys(r), ['response']); assert.equal(w.calls.deliver, 1); assert.equal(w.model.inspect().deliveries[0].state, 'ACKED_BY_CHANNEL');
  unscoped(ask(w, DEL(), cred), 'GUEST_ACCESS_INVALID'); assert.equal(w.calls.deliver, 1);
  w.guestsTable.g.state = 'VALID'; const rec = ask(w, DEL(), cred); assert.equal(rec.replay, true); assert.equal(rec.delivery.state, 'ACKED_BY_CHANNEL'); assert.equal(w.calls.deliver, 1);
});
C('Bn05', 'BND-2: pérdida de principal/propiedad/tenant/clase o autoridad no verificable (reserva, identidad, reloj) durante el envío ⇒ exterior solo denegación; recuperable luego; un solo intento', () => {
  const cases = [
    ['owner', CUST, (x) => x.setBooking('B1', { owner: 'cust9' }), (x) => x.setBooking('B1', { owner: 'cust1' }), 'ACTOR_OUT_OF_SCOPE', 'DENY'],
    ['tenant', OP, (x) => x.setBooking('B1', { tenant: 'T9' }), (x) => x.setBooking('B1', { tenant: 'T1' }), 'ACTOR_OUT_OF_SCOPE', 'DENY'],
    ['bookings', CUST, (x) => { x.failBookings = true; }, (x) => { x.failBookings = false; }, 'AUTHORITY_UNAVAILABLE', 'UNKNOWN'],
    ['identity', CUST, (x) => { x.idDown = true; }, (x) => { x.idDown = false; }, 'AUTHORITY_UNAVAILABLE', 'UNKNOWN'],
    ['clock', CUST, (x) => { x.clockBad = true; }, (x) => { x.clockBad = false; }, 'AUTHORITY_UNAVAILABLE', 'UNKNOWN'],
  ];
  for (const [name, cred, lose, restore, code, dec] of cases) {
    const w = makeWorld(); const oi = w.ports.identity.resolve; w.ports.identity.resolve = (c) => { if (w.idDown) throw new Error('down'); return oi(c); }; const oc = w.ports.clock.now; w.ports.clock.now = () => (w.clockBad ? 'ayer' : oc());
    ask(w, REQ(), cred); const od = w.ports.channel.deliver; w.ports.channel.deliver = (x) => { const r = od(x); lose(w); return r; };
    const r = ask(w, DEL(), cred); unscoped(r, code, dec); assert.deepEqual(Object.keys(r), ['response'], name); assert.equal(w.calls.deliver, 1, name); assert.equal(w.model.inspect().deliveries[0].state, 'ACKED_BY_CHANNEL', name);
    restore(w); const rec = ask(w, DEL(), cred); assert.equal(rec.replay, true, name); assert.equal(rec.delivery.state, 'ACKED_BY_CHANNEL', name); assert.equal(w.calls.deliver, 1, name);
  }
});
C('Bn05b', 'BND-2: el fallo del generador de ids al denegar tras el envío sigue siendo una denegación gobernada sin entrega; recuperable', () => {
  const w = makeWorld(); w.addGuest('g', 'B1'); const cred = { guest: 'g' }; ask(w, REQ(), cred); const od = w.ports.channel.deliver; let arm = false; const oid = w.ports.ids.next;
  w.ports.ids.next = (k) => { if (arm) { arm = false; throw new Error('ids down'); } return oid(k); };
  w.ports.channel.deliver = (x) => { const r = od(x); w.guestsTable.g.state = 'REVOKED'; arm = true; return r; };
  const r = ask(w, DEL(), cred); unscoped(r, 'GUEST_ACCESS_INVALID'); assert.ok(/^LOCAL-/.test(r.response.correlation_id)); assert.deepEqual(Object.keys(r), ['response']); assert.equal(w.model.inspect().deliveries[0].state, 'ACKED_BY_CHANNEL'); assert.equal(w.calls.deliver, 1);
  w.guestsTable.g.state = 'VALID'; const rec = ask(w, DEL(), cred); assert.equal(rec.replay, true); assert.equal(w.calls.deliver, 1);
});
C('Bn06', 'BND-2: alcance conservado (caducidad) ⇒ el historial SÍ se muestra; alcance de comando perdido del invitado ⇒ no se muestra la entrega; documento oculto en pérdida durante el render', () => {
  const w = makeWorld(); ask(w, REQ(), CUST); const o = w.ports.channel.deliver; w.ports.channel.deliver = (x) => { const r = o(x); w.advance(TTL + 1000); return r; };
  const r = ask(w, DEL(), CUST); scoped(r, 'DENY', ['DECISION_EXPIRED']); assert.equal(r.delivery.state, 'ACKED_BY_CHANNEL');
  const w2 = makeWorld(); w2.addGuest('g', 'B1'); ask(w2, REQ(), { guest: 'g' }); const o2 = w2.ports.channel.deliver; w2.ports.channel.deliver = (x) => { const r2 = o2(x); w2.ports.policy.guestScope = () => ({ commands: ['REQUEST_DOCUMENT'], types: ['REQUEST_ACK'], share_kinds: ['GUEST_ON_FILE'] }); return r2; };
  const r2 = ask(w2, DEL(), { guest: 'g' }); scoped(r2, 'DENY', ['GUEST_ACCESS_OUT_OF_SCOPE']); assert.deepEqual(Object.keys(r2), ['response']); assert.equal(w2.model.inspect().deliveries[0].state, 'ACKED_BY_CHANNEL');
  const wk = makeWorld(); const ok = wk.ports.renderer.render; wk.ports.renderer.render = (s) => { wk.ports.channel.catalog = () => { throw new Error('down'); }; return ok(s); }; const rk = ask(wk, REQ(), CUST); scoped(rk, 'UNKNOWN', ['AUTHORITY_UNAVAILABLE']); assert.equal(rk.document.state, 'VOIDED'); // alcance acreditado + puerto de decisión caído ⇒ UNKNOWN con alcance
  const w3 = makeWorld(); w3.addGuest('g', 'B1'); const o3 = w3.ports.renderer.render; w3.ports.renderer.render = (s) => { w3.guestsTable.g.state = 'REVOKED'; return o3(s); }; const r3 = ask(w3, REQ(), { guest: 'g' }); unscoped(r3, 'GUEST_ACCESS_INVALID'); assert.equal(w3.model.inspect().docs[0].state, 'VOIDED');
});

// ---------------- OBS-250: ID-F1 (fallo del generador de ids y vínculo nonce→operación→entrega) ----------------
const idsDown = (w, mode) => { const o = w.ports.ids.next; w.ports.ids.next = mode === 'invalid' ? () => 42 : () => { throw new Error('ids unavailable'); }; return () => { w.ports.ids.next = o; }; };
C('Id01', 'ID-F1 sonda exacta: ids cae de forma persistente tras el envío y el acceso se revoca ⇒ denegación gobernada sin datos; el vínculo con el nonce se conserva; al volver el acceso el mismo comando NO reenvía', () => {
  const w = makeWorld(); w.addGuest('g', 'B1'); const cred = { guest: 'g' }; ask(w, REQ(), cred); const normal = w.ports.channel.deliver; let restore;
  w.ports.channel.deliver = (x) => { w.calls.deliver++; w.guestsTable.g.state = 'REVOKED'; restore = idsDown(w); return { ack: { kind: 'CHANNEL_ACK' } }; };
  const first = ask(w, DEL(), cred); unscoped(first, 'GUEST_ACCESS_INVALID'); assert.match(first.response.correlation_id, /^LOCAL-\d+$/); assert.deepEqual(Object.keys(first), ['response']);
  const s1 = w.model.inspect(); assert.equal(s1.deliveries.length, 1); assert.equal(s1.deliveries[0].state, 'ACKED_BY_CHANNEL'); assert.equal(s1.ops, 2); assert.equal(w.calls.deliver, 1);
  const again = ask(w, DEL(), cred); unscoped(again, 'GUEST_ACCESS_INVALID'); assert.notEqual(again.response.correlation_id, first.response.correlation_id); assert.equal(w.calls.deliver, 1); // ids sigue caído: nada se reenvía
  restore(); w.ports.channel.deliver = normal; w.guestsTable.g.state = 'VALID';
  const rec = ask(w, DEL(), cred); assert.equal(rec.replay, true); assert.equal(rec.delivery.state, 'ACKED_BY_CHANNEL'); assert.equal(rec.delivery.delivery_id, s1.deliveries[0].id); assert.equal(w.calls.deliver, 1); assert.equal(w.model.inspect().deliveries.length, 1);
});
C('Id02', 'ID-F1: ids caído ANTES del efecto (denegación sin acceso, id inválido, id duplicado) ⇒ denegación gobernada, ningún envío; con todo restaurado, un único envío; controles con ids normal', () => {
  for (const mode of ['throw', 'invalid']) {
    const w = makeWorld(); w.addGuest('g', 'B1'); const cred = { guest: 'g' }; ask(w, REQ(), cred); w.guestsTable.g.state = 'REVOKED'; const restore = idsDown(w, mode);
    const a = ask(w, DEL(), cred); unscoped(a, 'GUEST_ACCESS_INVALID'); assert.match(a.response.correlation_id, /^LOCAL-\d+$/); assert.equal(w.calls.deliver, 0);
    restore(); w.guestsTable.g.state = 'VALID'; const ok_ = ask(w, DEL(), cred); allow(ok_); assert.equal(ok_.delivery.state, 'ACKED_BY_CHANNEL'); assert.equal(w.calls.deliver, 1); assert.equal(ask(w, DEL(), cred).replay, true); assert.equal(w.calls.deliver, 1);
  }
  const wc = makeWorld(); wc.addGuest('g', 'B1'); ask(wc, REQ(), { guest: 'g' }); wc.guestsTable.g.state = 'REVOKED'; const c = ask(wc, DEL(), { guest: 'g' }); assert.match(c.response.correlation_id, /^corr\d+$/); // control: con ids sano se usa el generador
  const wl = makeWorld(); const rs = idsDown(wl); const l1 = ask(wl, REQ(), { guest: 'x' }); const l2 = ask(wl, REQ({ idempotency_nonce: 'n2' }), { guest: 'x' }); assert.notEqual(l1.response.correlation_id, l2.response.correlation_id); assert.ok(!/B1|INTERNAL|n1/.test(l1.response.correlation_id)); rs();
});
C('Id03', 'ID-F1: ACK / timeout / FAILED con ids caído tras el efecto ⇒ estado conocido o incierto conservado; sin reenvío al repetir; el acuse incierto se concilia sin repetir', () => {
  for (const [beh, st] of [['ack', 'ACKED_BY_CHANNEL'], ['throw', 'UNCONFIRMED'], ['fail', 'FAILED'], ['ok_url', 'UNCONFIRMED']]) {
    const w = makeWorld(); w.addGuest('g', 'B1'); const cred = { guest: 'g' }; ask(w, REQ(), cred); w.behavior.deliver = beh; const o = w.ports.channel.deliver; let restore;
    w.ports.channel.deliver = (x) => { try { return o(x); } finally { w.guestsTable.g.state = 'REVOKED'; restore = idsDown(w); } };
    unscoped(ask(w, DEL(), cred), 'GUEST_ACCESS_INVALID'); assert.equal(w.model.inspect().deliveries[0].state, st, beh); assert.equal(w.calls.deliver, 1, beh);
    unscoped(ask(w, DEL(), cred), 'GUEST_ACCESS_INVALID'); assert.equal(w.calls.deliver, 1, beh);
    restore(); w.guestsTable.g.state = 'VALID'; const rec = ask(w, DEL(), cred); assert.equal(rec.replay, true, beh); assert.equal(rec.delivery.state, st, beh); assert.equal(w.calls.deliver, 1, beh);
    if (st === 'UNCONFIRMED') { if (beh !== 'throw' || true) { const nn = ask(w, DEL({ idempotency_nonce: 'd2' }), cred); assert.equal(nn.delivery.delivery_id, rec.delivery.delivery_id); assert.equal(w.calls.deliver, 1, beh); } const rc = w.model.reconcileDelivery(rec.delivery.delivery_id, { ack: { kind: 'CHANNEL_ACK' } }); assert.equal(rc.state, 'ACKED_BY_CHANNEL'); assert.equal(w.calls.deliver, 1); }
  }
});
C('Id04', 'ID-F1: el resultado hostil del canal (getters que lanzan) deja la entrega INCIERTA, sin excepción ni reenvío', () => {
  const w = makeWorld(); ask(w, REQ(), CUST); w.ports.channel.deliver = () => { w.calls.deliver++; return { get ack() { throw new Error('boom'); } }; };
  const r = ask(w, DEL(), CUST); assert.equal(r.delivery.state, 'UNCONFIRMED'); assert.equal(w.calls.deliver, 1); const r2 = ask(w, DEL(), CUST); assert.equal(r2.replay, true); assert.equal(w.calls.deliver, 1); ask(w, DEL({ idempotency_nonce: 'd2' }), CUST); assert.equal(w.calls.deliver, 1);
});
C('Id05b', 'ID-F1: un fallo no gobernado al reevaluar el alcance tras el efecto se trata como autoridad no acreditada: exterior solo denegación, entrega interna, recuperable', () => {
  const w = makeWorld(); w.addGuest('g', 'B1'); const cred = { guest: 'g' }; ask(w, REQ(), cred); let after = false; const o = w.ports.channel.deliver; w.ports.channel.deliver = (x) => { const r = o(x); after = true; return r; };
  const req = DEL(); const cmd = req.command; Object.defineProperty(req, 'command', { enumerable: true, get() { if (after) throw new Error('hostile'); return cmd; } });
  const r = ask(w, req, cred); unscoped(r, 'AUTHORITY_UNAVAILABLE', 'UNKNOWN'); assert.deepEqual(Object.keys(r), ['response']); assert.equal(w.model.inspect().deliveries[0].state, 'ACKED_BY_CHANNEL'); assert.equal(w.calls.deliver, 1);
  after = false; const rec = ask(w, DEL(), cred); assert.equal(rec.replay, true); assert.equal(w.calls.deliver, 1);
});
C('Id05', 'ID-F1: un error NO gobernado después del efecto (petición hostil) no pierde el vínculo: tras el error, repetir NO reenvía', () => {
  const w = makeWorld(); ask(w, REQ(), CUST); let after = false; const o = w.ports.channel.deliver; w.ports.channel.deliver = (x) => { const r = o(x); after = true; return r; };
  const req = DEL(); let post = 0; const ref = req.booking_ref; Object.defineProperty(req, 'booking_ref', { enumerable: true, get() { if (after && ++post >= 2) throw new Error('hostile'); return ref; } });
  assert.throws(() => w.model.handle(req, CUST)); assert.equal(w.calls.deliver, 1); assert.equal(w.model.inspect().ops, 2); assert.equal(w.model.inspect().nonTerminalOps, 0);
  const again = ask(w, DEL(), CUST); assert.equal(again.replay, true); assert.equal(w.calls.deliver, 1);
});

// ---------------- verificación del mapa de casos y ejecución ----------------
const map = JSON.parse(fs.readFileSync(path.join(__dirname, 'CASE-MAP.json'), 'utf8'));
const ids = cases.map((c) => c.id); const dupIds = ids.filter((x, i) => ids.indexOf(x) !== i);
const mapExec = map.cases.filter((c) => c.status === 'EXECUTED').map((c) => c.id);
const missing = mapExec.filter((x) => !ids.includes(x)); const unmapped = ids.filter((x) => !mapExec.includes(x));
const nonExec = map.cases.filter((c) => c.status !== 'EXECUTED').map((c) => c.id).filter((x) => ids.includes(x));
let failed = 0; const results = [];
for (const c of cases) { try { c.fn(); results.push([c.id, 'PASS']); } catch (e) { failed++; results.push([c.id, 'FAIL']); console.log('FAIL', c.id, '-', c.desc, '\n   ', String(e && e.stack || e).split('\n').slice(0,6).join(' | ').slice(0, 600)); } }
const structural = dupIds.length + missing.length + unmapped.length + nonExec.length;
if (structural) console.log('MAPA DE CASOS INCONSISTENTE', { dupIds, missing, unmapped, nonExec });
const pass = results.filter((r) => r[1] === 'PASS').length;
console.log(`modelo: ${pass}/${cases.length} casos ejecutados PASS · mapa: ${map.cases.length} entradas (${mapExec.length} ejecutadas, ${map.cases.length - mapExec.length} duplicadas/sustituidas/no modelables)`);
if (process.env.DOC_RESULTS_JSON) fs.writeFileSync(process.env.DOC_RESULTS_JSON, JSON.stringify({ executed: cases.length, pass, results }, null, 1));
process.exit(failed || structural ? 1 : 0);
