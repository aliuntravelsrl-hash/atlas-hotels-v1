'use strict';
// Mundo SINTÉTICO de puertos inyectados. Nada aquí es una autoridad real: identidad, invitado, evidencia, render y canal son dobles
// que solo certifican coherencia del modelo. Los datos de reserva/ledger se entregan congelados (cualquier escritura del modelo lanza).
const path = require('path');
const MODEL_PATH = process.env.DOC_MODEL || path.join(__dirname, '..', 'model', 'hotel-doc-decision.js');
const M = require(MODEL_PATH);

const deepFreeze = (o) => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };
const clone = (o) => JSON.parse(JSON.stringify(o));
const T0 = Date.parse('2026-10-27T12:00:00Z');

function makeWorld(opts) {
  const o = Object.assign({ guests: true, channels: ['CH_TEST'], policy: { version: 'P7', requires_prepayment: false }, priceOk: true }, opts || {});
  const w = { t: T0, calls: { render: 0, deliver: 0 }, commercial: { attempts: [] }, behavior: { render: 'ok', deliver: 'ack' }, guestsTable: {}, nextId: { corr: 0 } };
  w.bookings = new Map(); w.ledger = new Map(); w.evidence = new Map();
  w.addBooking = (ref, extra) => { w.bookings.set(ref, Object.assign({ ref, revision: 1, selection_digest: M.sha('sel-' + ref), supplier_ref: 'INTERNAL_SUPPLIER_1', status: 'pending', payment_status: 'unpaid', fulfillment_status: 'none', inventory: 3, request_persisted: true, guest_on_file: true, cancelled: false, internal_ref: 'INTERNAL_REF_' + ref, owner: 'cust1', tenant: 'T1' }, extra || {})); w.ledger.set(ref, []); w.evidence.set(ref, []); return w; };
  w.setBooking = (ref, patch) => { w.bookings.set(ref, Object.assign({}, w.bookings.get(ref), patch)); };
  w.bump = (ref) => { const b = w.bookings.get(ref); w.setBooking(ref, { revision: b.revision + 1 }); };
  w.mkEvidence = (ref, patch) => {
    const b = w.bookings.get(ref);
    const e = Object.assign({ evidence_id: 'INTERNAL_EVID_1', evidence_revision: 1, kind: 'PROVIDER_ACCEPTANCE', issuer_ref: b.supplier_ref, locator: 'PRV-777', locator_source: 'PROVIDER_CHANNEL', binding: { booking_ref: ref, selection_digest: b.selection_digest, booking_revision: b.revision }, verification: { verifier_ref: 'INTERNAL_VERIFIER_1', verified_at: '2026-10-27T11:00:00Z', result: 'VERIFIED' }, contract_state: 'VALID' }, patch || {});
    delete e.evidence_digest; e.evidence_digest = M.createModel({ clock: {}, ids: {} }, {})._internals.evidenceDigestOf(e); return e;
  };
  w.setEvidence = (ref, list) => { w.evidence.set(ref, list); };
  w.addPayment = (ref, amount, currency, reconciled) => { w.ledger.get(ref).push({ entry_id: 'INTERNAL_LEDGER_' + (w.ledger.get(ref).length + 1), booking_ref: ref, amount, currency, origin: 'PSP_CAPTURE', reference: 'REF', reconciled: reconciled !== false, recorded_at: '2026-10-27T10:00:00Z' }); };
  w.policy = o.policy; w.fiscalPolicy = null; w.numbering = null; w.fx = null; w.priceOk = o.priceOk; w.priceExpires = '2026-10-28T12:00:00Z';
  w.advance = (msv) => { w.t += msv; };
  w.nowIso = () => new Date(w.t).toISOString().replace(/\.\d{3}Z$/, 'Z');
  w.guestsTable = {};
  w.addGuest = (token, scope, state) => { w.guestsTable[token] = { booking_scope: scope, state: state || 'VALID' }; };
  w.snapshot = () => M.canon({ b: Array.from(w.bookings.entries()), l: Array.from(w.ledger.entries()), e: Array.from(w.evidence.entries()) });
  const spy = (n) => (...a) => { w.commercial.attempts.push(n); throw new Error('INTENTO COMERCIAL ' + n); };
  w.ports = {
    clock: { now: () => w.nowIso() },
    ids: { next: (k) => k + String(++w.nextId[k]) },
    identity: { resolve: (cred) => {
      if (cred && cred.unavailable) throw new Error('identity down');
      if (!cred) return { status: 'OK', actor: { kind: 'UNVERIFIED' } };
      if (cred.guest) { if (!o.guests) return { status: 'OK', actor: { kind: 'UNVERIFIED' } }; const g = w.guestsTable[cred.guest]; if (!g) return { status: 'OK', actor: { kind: 'GUEST_VERIFIED', principal_scope: 'G:' + cred.guest, guest: { booking_scope: null, state: 'INVALID' } } }; return { status: 'OK', actor: { kind: 'GUEST_VERIFIED', principal_scope: 'G:' + cred.guest, guest: { booking_scope: g.booking_scope, state: g.state } } }; }
      if (cred.account) return { status: 'OK', actor: { kind: 'ACCOUNT', principal_scope: cred.account } };
      if (cred.operator) return { status: 'OK', actor: { kind: 'OPERATOR', principal_scope: cred.operator, tenant_scope: cred.tenant } };
      return { status: 'OK', actor: { kind: 'UNVERIFIED' } };
    } },
    access: { canAccess: (actor, b) => (actor.kind === 'ACCOUNT' ? actor.principal_scope === b.owner : actor.kind === 'OPERATOR' ? actor.tenant_scope === b.tenant : false) },
    bookings: { get: (ref) => { if (w.failBookings) throw new Error('bookings down'); const b = w.bookings.get(ref); return b ? deepFreeze(clone(b)) : null; } },
    policy: { get: () => (w.policy ? deepFreeze(clone(w.policy)) : null), guestScope: () => ({ commands: ['REQUEST_DOCUMENT', 'DELIVER_DOCUMENT'], types: ['REQUEST_ACK', 'QUOTE', 'VOUCHER', 'BOOKING_CONFIRMATION'], share_kinds: ['GUEST_ON_FILE'] }) },
    price: { get: () => (w.priceOk ? { verified: true, amount: '250.00', currency: 'USD', expires_at: w.priceExpires, authority_ref: 'INTERNAL_PRICE_AUTH' } : { verified: false }) },
    fx: { authority: () => w.fx },
    fiscal: { policy: () => w.fiscalPolicy, numbering: () => w.numbering },
    evidence: { list: (ref) => { if (w.failEvidence) throw new Error('evidence down'); return deepFreeze(clone(w.evidence.get(ref) || [])); } },
    ledger: { list: (ref) => deepFreeze(clone(w.ledger.get(ref) || [])) },
    renderer: {
      render: (spec) => { w.calls.render++; if (w.behavior.render === 'throw') throw new Error('render timeout'); const bytes = 'SYNTH:' + spec.document_type; if (w.behavior.render === 'badtype') return { ok: true, media_type: 'text/x-unknown', bytes, digest: M.sha(bytes) }; if (w.behavior.render === 'baddigest') return { ok: true, media_type: 'application/pdf', bytes, digest: M.sha('otro') }; if (w.behavior.render === 'big') { const big = 'X'.repeat(2000); return { ok: true, media_type: 'application/pdf', bytes: big, digest: M.sha(big) }; } if (w.behavior.render === 'empty') return { ok: true, media_type: 'application/pdf', bytes: '', digest: M.sha('') }; if (w.behavior.render === 'fail') return { ok: false }; return { ok: true, media_type: 'application/pdf', bytes, digest: M.sha(bytes) }; },
      mediaTypes: () => ['application/pdf'], maxBytes: () => 1000,
    },
    channel: {
      catalog: () => o.channels,
      deliver: () => { w.calls.deliver++; const b = w.behavior.deliver; if (b === 'throw') throw new Error('channel timeout'); if (b === 'ok_url') return { ok: true, url: 'synthetic://link' }; if (b === 'fail') return { failed: true }; return { ack: { kind: 'CHANNEL_ACK' } }; },
    },
    commercial: { appendLedger: spy('appendLedger'), setStatus: spy('setStatus'), adjustInventory: spy('adjustInventory') },
  };
  w.model = M.createModel(w.ports);
  w.addBooking('B1');
  return w;
}
const REQ = (over) => Object.assign({ schema_version: '1.2', command: 'REQUEST_DOCUMENT', document_type: 'REQUEST_ACK', booking_ref: 'B1', booking_revision: 1, idempotency_nonce: 'n1' }, over || {});
const DEL = (over, dover) => REQ(Object.assign({ command: 'DELIVER_DOCUMENT', document_type: 'SHARE_DOCUMENT', idempotency_nonce: 'd1', delivery: Object.assign({ document_id: 'D1', document_revision: 1, channel: 'CH_TEST', recipient_kind: 'GUEST_ON_FILE' }, dover || {}) }, over || {}));
const CUST = { account: 'cust1' }; const OP = { operator: 'op1', tenant: 'T1' };
module.exports = { M, makeWorld, REQ, DEL, CUST, OP, clone };
