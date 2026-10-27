'use strict';
// Modelo sintético OFFLINE de decisión documental de hoteles (contrato v1.2 + corrigendum C12; herencia v1.1 según §0 de v1.2).
// INERTE: sin servidor, sin red, sin SQL, sin dependencias (solo `crypto` de Node). Todos los efectos externos pasan por PUERTOS inyectados.
// Lo que prueba: coherencia del contrato modelado. NO prueba: backend, autenticación real, PSP, renderizador, canal, timing, retención cerrada.
const crypto = require('crypto');

// ---------- catálogos cerrados (v1.2 / v1.1 §3) ----------
const COMMANDS = ['REQUEST_DOCUMENT', 'DELIVER_DOCUMENT'];
const DOC_TYPES = ['QUOTE', 'REQUEST_ACK', 'BOOKING_CONFIRMATION', 'VOUCHER', 'PAYMENT_RECEIPT', 'INVOICE', 'SHARE_DOCUMENT'];
const REQUEST_TYPES = DOC_TYPES.filter((t) => t !== 'SHARE_DOCUMENT');
const REASONS = ['PRICE_UNVERIFIED', 'PRICE_EXPIRED', 'SUPPLIER_EVIDENCE_MISSING', 'SUPPLIER_EVIDENCE_UNVERIFIED', 'SUPPLIER_EVIDENCE_OTHER_BOOKING', 'SUPPLIER_EVIDENCE_ISSUER_MISMATCH', 'SUPPLIER_EVIDENCE_REVOKED', 'SUPPLIER_EVIDENCE_EXPIRED', 'SUPPLIER_EVIDENCE_FALLBACK_SUBSTITUTE', 'PAYMENT_NOT_RECONCILED', 'PAYMENT_CURRENCY_MIXED_NO_FX', 'POLICY_MISSING', 'POLICY_REQUIRES_PREPAYMENT', 'FISCAL_POLICY_MISSING', 'NUMBERING_AUTHORITY_MISSING', 'ACTOR_OUT_OF_SCOPE', 'REVISION_CHANGED', 'BOOKING_CANCELLED_OR_INVALID', 'RECIPIENT_MISSING', 'IDEMPOTENCY_CONFLICT', 'SHAPE_INVALID', 'SCHEMA_VERSION_UNSUPPORTED', 'AUTHORITY_UNAVAILABLE', 'DECISION_EXPIRED', 'GUEST_ACCESS_INVALID', 'GUEST_ACCESS_OUT_OF_SCOPE'];
const UNSCOPED_REASONS = ['ACTOR_OUT_OF_SCOPE', 'GUEST_ACCESS_INVALID', 'GUEST_ACCESS_OUT_OF_SCOPE', 'SHAPE_INVALID', 'SCHEMA_VERSION_UNSUPPORTED', 'AUTHORITY_UNAVAILABLE', 'IDEMPOTENCY_CONFLICT'];
const EVIDENCE_KINDS = ['PROVIDER_LOCATOR', 'PROVIDER_ACCEPTANCE', 'CONTRACTUAL_BASIS'];
const MEANINGS = ['QUOTED_TOTAL', 'PAID_TOTAL', 'BALANCE_DUE', 'DEPOSIT_RECEIVED', 'REFUND', 'ADJUSTMENT'];
const NONNEG_MEANINGS = ['QUOTED_TOTAL', 'PAID_TOTAL', 'BALANCE_DUE', 'DEPOSIT_RECEIVED', 'REFUND'];
const ACTIONS = ['RENDER', 'DELIVER', 'NONE'];
const CURRENCIES = ['USD', 'DOP'];
const SUPPORTED_MAJOR = '1';
const PROJECTION_VERSION = '1.2';
const DOC_STATES = ['DECISION_ISSUED', 'RENDERED', 'RENDER_FAILED', 'SUPERSEDED', 'VOIDED'];
const DELIVERY_STATES = ['REQUESTED', 'ATTEMPTED', 'ACKED_BY_CHANNEL', 'UNCONFIRMED', 'FAILED'];
const UNKNOWN_REASONS = ['POLICY_MISSING', 'FISCAL_POLICY_MISSING', 'NUMBERING_AUTHORITY_MISSING', 'AUTHORITY_UNAVAILABLE', 'SCHEMA_VERSION_UNSUPPORTED'];
const EVIDENCE_DEPENDENT = ['BOOKING_CONFIRMATION', 'VOUCHER'];
const NONTERMINAL_DELIVERY = ['REQUESTED', 'ATTEMPTED', 'UNCONFIRMED'];
const NONTERMINAL_DOC = ['DECISION_ISSUED'];

// ---------- validador de forma propio (sin bibliotecas) ----------
const RE = { id: /^[A-Za-z0-9_.:-]{1,64}$/, instant: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/, amount: /^-?[0-9]{1,12}(\.[0-9]{1,2})?$/, digest: /^sha256:[0-9a-f]{64}$/, ver: /^[0-9]{1,3}\.[0-9]{1,3}$/, reason: /^[A-Z][A-Z_]{2,47}$/ };
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
function checkScalar(s, v) {
  switch (s.t) {
    case 'id': return typeof v === 'string' && RE.id.test(v);
    case 'ver': return typeof v === 'string' && RE.ver.test(v);
    case 'digest': return typeof v === 'string' && RE.digest.test(v);
    case 'reason': return typeof v === 'string' && RE.reason.test(v);
    case 'instant': return typeof v === 'string' && RE.instant.test(v) && !Number.isNaN(Date.parse(v));
    case 'amount': return typeof v === 'string' && RE.amount.test(v);
    case 'currency': return CURRENCIES.includes(v);
    case 'enum': return typeof v === 'string' && s.v.includes(v);
    case 'int': return Number.isInteger(v) && v >= s.min && v <= s.max;
    case 'str': return typeof v === 'string' && v.length >= 1 && v.length <= s.max;
    default: throw new Error('schema desconocido ' + s.t);
  }
}
function validate(s, v, path, errs) {
  if (s.t === 'obj') {
    if (!isObj(v)) { errs.push(path); return; }
    for (const k of Object.keys(v)) if (!(k in s.props)) errs.push(path + '.' + k); // additionalProperties: false
    for (const k of Object.keys(s.props)) {
      if (v[k] === undefined) { if ((s.req || []).includes(k)) errs.push(path + '.' + k); continue; }
      validate(s.props[k], v[k], path + '.' + k, errs);
    }
    if (s.check) s.check(v, path, errs);
  } else if (s.t === 'list') {
    if (!Array.isArray(v) || v.length < s.min || v.length > s.max) { errs.push(path); return; }
    v.forEach((x, i) => validate(s.of, x, path + '[' + i + ']', errs));
    if (s.unique && new Set(v.map((x) => JSON.stringify(x))).size !== v.length) errs.push(path);
  } else if (!checkScalar(s, v)) errs.push(path);
}
const T = {
  id: { t: 'id' }, ver: { t: 'ver' }, digest: { t: 'digest' }, instant: { t: 'instant' }, amount: { t: 'amount' }, currency: { t: 'currency' },
  en: (v) => ({ t: 'enum', v }), int: (min, max) => ({ t: 'int', min, max }), reason: { t: 'reason' },
};
const INT_MAX = 2147483647;
const REQUEST_SCHEMA = {
  t: 'obj', req: ['schema_version', 'command', 'document_type', 'booking_ref', 'booking_revision', 'idempotency_nonce'],
  props: {
    schema_version: T.ver, command: T.en(COMMANDS), document_type: T.en(DOC_TYPES), booking_ref: T.id, booking_revision: T.int(0, INT_MAX), idempotency_nonce: T.id,
    delivery: { t: 'obj', req: ['document_id', 'document_revision', 'channel', 'recipient_kind'], props: { document_id: T.id, document_revision: T.int(1, INT_MAX), channel: T.id, recipient_kind: T.en(['GUEST_ON_FILE', 'EXPLICIT']), recipient_ref: T.id } },
  },
  check(v, path, errs) {
    if ((v.command === 'DELIVER_DOCUMENT') !== (v.delivery !== undefined)) errs.push(path + '.delivery'); // Sh13 y delivery prohibido en otro comando
    if (v.command === 'REQUEST_DOCUMENT' && !REQUEST_TYPES.includes(v.document_type)) errs.push(path + '.document_type'); // Pj07
    if (v.command === 'DELIVER_DOCUMENT' && v.document_type !== 'SHARE_DOCUMENT') errs.push(path + '.document_type'); // Pj08
    if (v.delivery && v.delivery.recipient_kind === 'EXPLICIT' && v.delivery.recipient_ref === undefined) errs.push(path + '.delivery.recipient_kind');
    if (v.delivery && v.delivery.recipient_kind === 'GUEST_ON_FILE' && v.delivery.recipient_ref !== undefined) errs.push(path + '.delivery.recipient_ref');
  },
};
// Condiciones ENTRE campos (DM-R2): presencia, exclusión y coherencia decisión/motivos/acciones/caducidad/importes/evidencia.
function scopedCheck(v, path, errs) {
  const d = v.decision; const rc = Array.isArray(v.reason_codes) ? v.reason_codes : []; const aa = Array.isArray(v.allowed_actions) ? v.allowed_actions : [];
  if (aa.includes('NONE') && aa.length > 1) errs.push(path + '.allowed_actions');
  if (d === 'ALLOW') {
    if (rc.length) errs.push(path + '.reason_codes');
    if (v.decision_expires_at === undefined) errs.push(path + '.decision_expires_at');
    if (EVIDENCE_DEPENDENT.includes(v.document_type) ? !(Array.isArray(v.evidence_revisions) && v.evidence_revisions.length >= 1) : v.evidence_revisions !== undefined) errs.push(path + '.evidence_revisions');
  } else {
    if (rc.length < 1) errs.push(path + '.reason_codes');
    if (!(aa.length === 1 && aa[0] === 'NONE')) errs.push(path + '.allowed_actions');
    for (const k of ['decision_expires_at', 'amounts', 'evidence_revisions']) if (v[k] !== undefined) errs.push(path + '.' + k);
    if (d === 'UNKNOWN' && !rc.every((r) => UNKNOWN_REASONS.includes(r))) errs.push(path + '.reason_codes');
    if (d === 'DENY' && rc.some((r) => UNKNOWN_REASONS.includes(r))) errs.push(path + '.reason_codes');
  }
}
function unscopedCheck(v, path, errs) {
  const rc = Array.isArray(v.reason_codes) ? v.reason_codes : []; const unk = rc.length > 0 && rc.every((r) => UNKNOWN_REASONS.includes(r)); const any = rc.some((r) => UNKNOWN_REASONS.includes(r));
  if (v.decision === 'UNKNOWN' ? !unk : any) errs.push(path + '.decision');
}
function documentCheck(v, path, errs) { if (v.state === 'RENDERED' && v.artifact === undefined) errs.push(path + '.artifact'); if ((v.state === 'DECISION_ISSUED' || v.state === 'RENDER_FAILED') && v.artifact !== undefined) errs.push(path + '.artifact'); }
function deliveryCheck(v, path, errs) { if ((v.state === 'ACKED_BY_CHANNEL') !== (v.ack !== undefined)) errs.push(path + '.ack'); }
const amountItem = { t: 'obj', req: ['amount', 'currency', 'meaning'], props: { amount: T.amount, currency: T.currency, meaning: T.en(MEANINGS) },
  check(v, path, errs) { if (typeof v.amount === 'string' && v.amount.startsWith('-') && NONNEG_MEANINGS.includes(v.meaning)) errs.push(path + '.amount'); } };
const SCOPED_PROPS = {
  form: T.en(['SCOPED_DECISION']), schema_version: T.ver, decision: T.en(['ALLOW', 'DENY', 'UNKNOWN']), document_type: T.en(DOC_TYPES), booking_ref: T.id, booking_revision: T.int(0, INT_MAX),
  reason_codes: { t: 'list', of: T.reason, min: 0, max: 8, unique: true },
  evidence_revisions: { t: 'list', of: { t: 'obj', req: ['kind', 'evidence_revision'], props: { kind: T.en(EVIDENCE_KINDS), evidence_revision: T.int(0, INT_MAX) } }, min: 0, max: 4 },
  policy_version: { t: 'str', max: 32 }, amounts: { t: 'list', of: amountItem, min: 0, max: 6 },
  allowed_actions: { t: 'list', of: T.en(ACTIONS), min: 1, max: 3, unique: true }, decision_expires_at: T.instant, decision_digest: T.digest,
};
const SCOPED_REQ = ['form', 'schema_version', 'decision', 'document_type', 'booking_ref', 'booking_revision', 'reason_codes', 'allowed_actions', 'decision_digest'];
const UNSCOPED_PROPS = { form: T.en(['DENIAL_UNSCOPED']), schema_version: T.ver, decision: T.en(['DENY', 'UNKNOWN']), reason_codes: { t: 'list', of: T.reason, min: 1, max: 2, unique: true }, correlation_id: T.id, decision_digest: T.digest };
const UNSCOPED_REQ = ['form', 'schema_version', 'decision', 'reason_codes', 'correlation_id'];
const DOCUMENT_PUBLIC = { t: 'obj', check: (v, p, e) => documentCheck(v, p, e), req: ['document_id', 'document_revision', 'document_type', 'booking_revision', 'state'], props: { document_id: T.id, document_revision: T.int(1, INT_MAX), document_type: T.en(DOC_TYPES), booking_revision: T.int(0, INT_MAX), state: T.en(DOC_STATES),
  artifact: { t: 'obj', req: ['media_type', 'size_bytes', 'content_digest', 'validated_at'], props: { media_type: { t: 'str', max: 64 }, size_bytes: T.int(1, INT_MAX), content_digest: T.digest, validated_at: T.instant } } } };
const DELIVERY_PUBLIC = { t: 'obj', check: (v, p, e) => deliveryCheck(v, p, e), req: ['delivery_id', 'document_id', 'document_revision', 'channel', 'recipient_kind', 'state'], props: { delivery_id: T.id, document_id: T.id, document_revision: T.int(1, INT_MAX), channel: T.id, recipient_kind: T.en(['GUEST_ON_FILE', 'EXPLICIT']), state: T.en(DELIVERY_STATES), ack: { t: 'obj', req: ['kind'], props: { kind: T.en(['CHANNEL_ACK']) } } } };
// Versiones de proyección: MINOR superior solo con campos opcionales DECLARADOS (Pj11/Pj12).
function makeValidator(extraVersions) {
  const versions = Object.assign({ '1.2': {} }, extraVersions || {}); // versión -> { scoped:{prop:schema}, unscoped:{...} } extensiones declaradas (opcionales)
  function forms(version) {
    const ext = versions[version]; if (!ext) return null;
    return { scoped: { t: 'obj', req: SCOPED_REQ, check: scopedCheck, props: Object.assign({}, SCOPED_PROPS, ext.scoped || {}) }, unscoped: { t: 'obj', req: UNSCOPED_REQ, check: unscopedCheck, props: Object.assign({}, UNSCOPED_PROPS, ext.unscoped || {}) } };
  }
  return function validatePublic(obj) {
    if (!isObj(obj) || typeof obj.schema_version !== 'string' || !RE.ver.test(obj.schema_version)) return { valid: false, errors: ['schema_version'] };
    if (obj.schema_version.split('.')[0] !== SUPPORTED_MAJOR) return { valid: false, unsupported_major: true, errors: ['schema_version'] };
    const f = forms(obj.schema_version); if (!f) return { valid: false, errors: ['schema_version.undeclared_minor'] };
    const s = obj.form === 'SCOPED_DECISION' ? f.scoped : obj.form === 'DENIAL_UNSCOPED' ? f.unscoped : null;
    if (!s) return { valid: false, errors: ['form'] };
    const errs = []; validate(s, obj, '$', errs);
    if (obj.form === 'DENIAL_UNSCOPED' && obj.reason_codes && Array.isArray(obj.reason_codes) && obj.reason_codes.some((r) => !UNSCOPED_REASONS.includes(r) && REASONS.includes(r))) errs.push('$.reason_codes');
    return { valid: errs.length === 0, errors: errs };
  };
}
const validatePublic = makeValidator();
function validateDocumentPublic(o) { const e = []; validate(DOCUMENT_PUBLIC, o, '$', e); return { valid: e.length === 0, errors: e }; }
function validateDeliveryPublic(o) { const e = []; validate(DELIVERY_PUBLIC, o, '$', e); return { valid: e.length === 0, errors: e }; }
// Consumidor: nunca trata una respuesta inválida/desconocida como ALLOW ni ofrece acciones (Pj02–Pj05, Sh09).
function consumePublic(resp, validator) {
  const v = (validator || validatePublic)(resp);
  if (v.unsupported_major) return { usable: false, decision: 'UNKNOWN', local_reason: 'SCHEMA_VERSION_UNSUPPORTED', actions: [] };
  if (!v.valid) return { usable: false, decision: 'DENY', defect: true, actions: [] };
  const unknown = resp.reason_codes.filter((r) => !REASONS.includes(r));
  if (unknown.length) return { usable: false, decision: 'DENY', local_reason: 'REASON_UNRECOGNIZED', actions: [] };
  const acts = resp.form === 'SCOPED_DECISION' ? resp.allowed_actions.filter((a) => ACTIONS.includes(a) && a !== 'NONE') : [];
  return { usable: true, decision: resp.decision, actions: resp.decision === 'ALLOW' ? acts : [] };
}

// ---------- utilidades ----------
function sortDeep(v) { if (Array.isArray(v)) return v.map(sortDeep); if (isObj(v)) { const o = {}; for (const k of Object.keys(v).sort()) o[k] = sortDeep(v[k]); return o; } return v; }
const canon = (v) => JSON.stringify(sortDeep(v));
const sha = (s) => 'sha256:' + crypto.createHash('sha256').update(s).digest('hex');
const canonicalDigest = (req) => sha(canon(req)); // incluye command, tipo, reserva, booking_revision, nonce y delivery
const cents = (s) => { const neg = s.startsWith('-'); const [i, f = ''] = s.replace('-', '').split('.'); const c = BigInt(i) * 100n + BigInt((f + '00').slice(0, 2)); return neg ? -c : c; };
const fmt = (c) => { const neg = c < 0n; const a = neg ? -c : c; return (neg ? '-' : '') + (a / 100n).toString() + '.' + (a % 100n).toString().padStart(2, '0'); };
const ms = (iso) => Date.parse(iso);
class PortError extends Error {}
const isInstant = (v) => typeof v === 'string' && RE.instant.test(v) && !Number.isNaN(Date.parse(v));
const portBad = (m) => { throw new PortError('entrada de puerto inválida: ' + m); };
const goodAmount = (a) => typeof a === 'string' && RE.amount.test(a) && !a.startsWith('-');
const placeholder = (x) => typeof x !== 'string' || x.trim() === '' || /^(PENDIENTE|NONE)$/i.test(x.trim());
function checkBookingShape(b) { if (!isObj(b) || typeof b.ref !== 'string' || !RE.id.test(b.ref) || !Number.isInteger(b.revision) || b.revision < 0 || typeof b.cancelled !== 'boolean' || typeof b.supplier_ref !== 'string' || typeof b.selection_digest !== 'string') portBad('reserva'); return b; }
function checkLedger(list) { if (!Array.isArray(list)) portBad('ledger'); for (const x of list) if (!isObj(x) || typeof x.amount !== 'string' || !RE.amount.test(x.amount) || !CURRENCIES.includes(x.currency) || typeof x.reconciled !== 'boolean') portBad('ledger'); return list; }
const call = (fn) => { try { return fn(); } catch (e) { throw new PortError(String(e && e.message || e)); } };

// ---------- modelo ----------
function createModel(ports, opts) {
  const o = Object.assign({ decisionTtlMs: 15 * 60 * 1000 }, opts || {});
  const now = () => { const t = call(() => ports.clock.now()); if (!isInstant(t)) portBad('reloj'); return t; };
  const ops = new Map(); // índice idempotente por principal/tenant + comando + reserva + nonce
  const docs = new Map(); const deliveries = new Map(); let docSeq = 0; let delSeq = 0;
  const iso = (t) => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z');

  // ----- proyección pública campo por campo (DOC-R2/C12-02) -----
  function envDigest(env) { return sha(canon(env)); }
  function denialUnscoped(code, decision) {
    if (!UNSCOPED_REASONS.includes(code)) throw new Error('código fuera del subconjunto sin alcance: ' + code);
    const env = { form: 'DENIAL_UNSCOPED', schema_version: PROJECTION_VERSION, decision: decision || 'DENY', reason_codes: [code], correlation_id: ports.ids.next('corr') };
    env.decision_digest = envDigest(env); return { response: env };
  }
  function projectScoped(d) {
    const env = { form: 'SCOPED_DECISION', schema_version: PROJECTION_VERSION, decision: d.decision, document_type: d.doc_type, booking_ref: d.booking_ref, booking_revision: d.booking_revision, reason_codes: d.reasons.slice() };
    if (d.evidence && d.decision === 'ALLOW') env.evidence_revisions = d.evidence.map((e) => ({ kind: e.kind, evidence_revision: e.evidence_revision }));
    if (d.policy_version !== undefined) env.policy_version = String(d.policy_version);
    if (d.decision === 'ALLOW' && d.amounts && d.amounts.length) env.amounts = d.amounts.map((a) => ({ amount: a.amount, currency: a.currency, meaning: a.meaning }));
    env.allowed_actions = d.actions.slice();
    if (d.decision === 'ALLOW' && d.expires_at) env.decision_expires_at = d.expires_at;
    env.decision_digest = envDigest(env); return env;
  }
  const projectDocument = (r) => { const p = { document_id: r.document_id, document_revision: r.document_revision, document_type: r.document_type, booking_revision: r.booking_revision, state: r.state }; if (r.artifact) p.artifact = { media_type: r.artifact.media_type, size_bytes: r.artifact.size_bytes, content_digest: r.artifact.content_digest, validated_at: r.artifact.validated_at }; return p; };
  const projectDelivery = (r) => { const p = { delivery_id: r.delivery_id, document_id: r.document_id, document_revision: r.document_revision, channel: r.channel, recipient_kind: r.recipient_kind, state: r.state }; if (r.state === 'ACKED_BY_CHANNEL' && r.ack) p.ack = { kind: 'CHANNEL_ACK' }; return p; };
  const scopedDeny = (req, booking, reasons, decision) => ({ response: projectScoped({ decision: decision || (reasons.every((r) => UNKNOWN_REASONS.includes(r)) ? 'UNKNOWN' : 'DENY'), doc_type: req.document_type, booking_ref: req.booking_ref, booking_revision: booking ? booking.revision : req.booking_revision, reasons, actions: ['NONE'] }) });

  // ----- evidencia del proveedor (DC-R2, §4.2) -----
  function evidenceDigestOf(e) { const c = Object.assign({}, e); delete c.evidence_digest; return sha(canon(c)); }
  function evidenceReason(e, booking, nowIso) {
    if (!isObj(e) || !EVIDENCE_KINDS.includes(e.kind)) return 'SUPPLIER_EVIDENCE_MISSING';
    if (e.kind === 'PROVIDER_LOCATOR' && placeholder(e.locator)) return 'SUPPLIER_EVIDENCE_MISSING'; // el localizador solo es exigible a PROVIDER_LOCATOR
    if (!e.binding || e.binding.booking_ref !== booking.ref || e.binding.selection_digest !== booking.selection_digest) return 'SUPPLIER_EVIDENCE_OTHER_BOOKING';
    if (e.issuer_ref !== booking.supplier_ref) return 'SUPPLIER_EVIDENCE_ISSUER_MISMATCH';
    if (e.contract_state === 'REVOKED' || e.contract_state === 'SUPERSEDED') return 'SUPPLIER_EVIDENCE_REVOKED';
    if (e.contract_state === 'EXPIRED') return 'SUPPLIER_EVIDENCE_EXPIRED';
    if (e.contract_state !== 'VALID') return 'SUPPLIER_EVIDENCE_UNVERIFIED';
    if (!e.verification || e.verification.result !== 'VERIFIED' || e.evidence_digest !== evidenceDigestOf(e)) return 'SUPPLIER_EVIDENCE_UNVERIFIED';
    if (!isInstant(e.verification.verified_at) || ms(e.verification.verified_at) > ms(nowIso)) return 'SUPPLIER_EVIDENCE_UNVERIFIED'; // instante malformado o futuro
    if (e.locator_source === 'INTERNAL_FALLBACK') return 'SUPPLIER_EVIDENCE_FALLBACK_SUBSTITUTE';
    if (!['PROVIDER_CHANNEL', 'OPERATOR_ENTRY'].includes(e.locator_source)) return 'SUPPLIER_EVIDENCE_UNVERIFIED';
    if (e.binding.booking_revision !== booking.revision) return 'REVISION_CHANGED';
    return null;
  }
  function checkEvidence(booking, nowIso) {
    const list = call(() => ports.evidence.list(booking.ref)) || []; if (!Array.isArray(list)) portBad('evidencia');
    let best = null; let bestRev = -1; let firstReason = 'SUPPLIER_EVIDENCE_MISSING';
    for (const e of list) {
      const r = evidenceReason(e, booking, nowIso);
      if (r === null) return { ok: true, used: [e] };
      const rev = isObj(e) && Number.isInteger(e.evidence_revision) ? e.evidence_revision : -1;
      if (rev > bestRev) { bestRev = rev; best = r; }
    }
    return { ok: false, reason: best || firstReason };
  }

  // ----- pagos (independientes de la evidencia del proveedor) -----
  function paidByCurrency(booking) {
    const entries = checkLedger(call(() => ports.ledger.list(booking.ref)) || []);
    const rec = entries.filter((x) => x.reconciled === true);
    const sums = {}; rec.forEach((x) => { sums[x.currency] = (sums[x.currency] || 0n) + cents(x.amount); });
    return { entries, reconciled: rec, sums };
  }

  // ----- puertas por documento (§4.1) -----
  function gate(type, booking, ctx) {
    const R = (decision, reasons, extra) => Object.assign({ decision, reasons, actions: ['NONE'] }, extra || {});
    const policy = () => call(() => ports.policy.get(booking, type));
    switch (type) {
      case 'QUOTE': {
        const pr = call(() => ports.price.get(booking));
        if (!isObj(pr) || pr.verified !== true || !goodAmount(pr.amount) || !CURRENCIES.includes(pr.currency) || !isInstant(pr.expires_at)) return R('DENY', ['PRICE_UNVERIFIED']); // entrada malformada no habilita
        if (ms(pr.expires_at) <= ms(ctx.nowIso)) return R('DENY', ['PRICE_EXPIRED']);
        return R('ALLOW', [], { amounts: [{ amount: pr.amount, currency: pr.currency, meaning: 'QUOTED_TOTAL' }] });
      }
      case 'REQUEST_ACK':
        return booking.request_persisted === true ? R('ALLOW', []) : R('DENY', ['BOOKING_CANCELLED_OR_INVALID']);
      case 'BOOKING_CONFIRMATION': {
        const ev = checkEvidence(booking, ctx.nowIso);
        return ev.ok ? R('ALLOW', [], { evidence: ev.used }) : R('DENY', [ev.reason]);
      }
      case 'VOUCHER': {
        const ev = checkEvidence(booking, ctx.nowIso); if (!ev.ok) return R('DENY', [ev.reason]);
        const pol = policy(); if (!pol || typeof pol.version !== 'string' || typeof pol.requires_prepayment !== 'boolean' || (pol.requires_prepayment && !(isObj(pol.min_paid) && goodAmount(pol.min_paid.amount) && CURRENCIES.includes(pol.min_paid.currency)))) return R('UNKNOWN', ['POLICY_MISSING']);
        const base = { evidence: ev.used, policy_version: pol.version, policy_digest: sha(canon(pol)) };
        if (pol.requires_prepayment) {
          const p = paidByCurrency(booking);
          const cur = Object.keys(p.sums);
          if (cur.some((c) => c !== pol.min_paid.currency) && !call(() => ports.fx.authority(booking))) return R('DENY', ['PAYMENT_CURRENCY_MIXED_NO_FX'], base);
          if (p.reconciled.length === 0 && p.entries.length > 0) return R('DENY', ['PAYMENT_NOT_RECONCILED'], base);
          if ((p.sums[pol.min_paid.currency] || 0n) < cents(pol.min_paid.amount)) return R('DENY', ['POLICY_REQUIRES_PREPAYMENT'], base);
        }
        return R('ALLOW', [], base);
      }
      case 'PAYMENT_RECEIPT': {
        const p = paidByCurrency(booking);
        if (p.reconciled.length === 0) return R('DENY', ['PAYMENT_NOT_RECONCILED']);
        return R('ALLOW', [], { amounts: Object.keys(p.sums).sort().map((c) => ({ amount: fmt(p.sums[c]), currency: c, meaning: 'PAID_TOTAL' })) });
      }
      case 'INVOICE': {
        const fp = call(() => ports.fiscal.policy(booking)); if (!isObj(fp) || typeof fp.version !== 'string') return R('UNKNOWN', ['FISCAL_POLICY_MISSING']);
        const nm = call(() => ports.fiscal.numbering(booking)); if (!nm) return R('UNKNOWN', ['NUMBERING_AUTHORITY_MISSING'], { policy_version: fp.version });
        return R('ALLOW', [], { policy_version: fp.version });
      }
      default: throw new Error('tipo sin puerta: ' + type);
    }
  }
  function depsOf(type, booking, d) {
    return sha(canon({ t: type, ref: booking.ref, sel: booking.selection_digest, rev: booking.revision, amounts: (d.amounts || []).map((a) => [a.amount, a.currency, a.meaning]), ev: (d.evidence || []).map((e) => [e.evidence_id, e.evidence_revision, e.evidence_digest]), pv: d.policy_version === undefined ? null : String(d.policy_version), pd: d.policy_digest || null }));
  }
  function evaluateDoc(type, booking, req, ctx) {
    const base = { doc_type: type, booking_ref: booking.ref, booking_revision: booking.revision };
    if (booking.cancelled === true) return Object.assign(base, { decision: 'DENY', reasons: ['BOOKING_CANCELLED_OR_INVALID'], actions: ['NONE'] });
    if (req.booking_revision !== booking.revision) return Object.assign(base, { decision: 'DENY', reasons: ['REVISION_CHANGED'], actions: ['NONE'] });
    const g = gate(type, booking, ctx);
    const chans = call(() => ports.channel.catalog()) || [];
    const actions = g.decision === 'ALLOW' ? (chans.length ? ['RENDER', 'DELIVER'] : ['RENDER']) : ['NONE'];
    const d = Object.assign(base, g, { actions });
    if (d.decision === 'ALLOW') {
      d.expires_at = iso(ms(ctx.nowIso) + o.decisionTtlMs);
      d.deps = depsOf(type, booking, d); // DM-R4-A: huella canónica de las dependencias realmente usadas (selección, revisión, importes, evidencia, política)
    }
    return d;
  }

  // ----- render (separado de la entrega) -----
  function renderDocument(d, req, actor, ctx) {
    const doc = { document_id: 'D' + String(++docSeq), document_revision: 1, document_type: d.doc_type, booking_ref: d.booking_ref, booking_revision: d.booking_revision, decision_digest: d.public_digest, state: 'DECISION_ISSUED', owner: actor.principal_scope, decision_expires_at: d.expires_at, deps: d.deps };
    docs.set(doc.document_id, doc);
    let r;
    try { r = ports.renderer.render({ document_type: d.doc_type, booking_ref: d.booking_ref, booking_revision: d.booking_revision, amounts: d.amounts || [] }); } catch (e) { return doc; } // incierto: se queda DECISION_ISSUED; no se reintenta solo
    const mt = ports.renderer.mediaTypes(); const max = ports.renderer.maxBytes();
    const bytes = r && r.bytes !== undefined ? String(r.bytes) : '';
    const ok = r && r.ok === true && mt.includes(r.media_type) && Buffer.byteLength(bytes) > 0 && Buffer.byteLength(bytes) <= max && sha(bytes) === r.digest;
    if (!ok) { doc.state = 'RENDER_FAILED'; return doc; }
    doc.artifact = { media_type: r.media_type, size_bytes: Buffer.byteLength(bytes), content_digest: sha(bytes), validated_at: ctx.nowIso };
    doc.state = 'RENDERED'; return doc;
  }

  // ----- alcance (compartido por la entrada y por el límite de liberación; DM-R4) -----
  function resolveScope(req, credential, nowIso) {
    let idr; try { idr = ports.identity.resolve(credential, nowIso); } catch (e) { idr = { status: 'UNAVAILABLE' }; }
    if (!idr || idr.status !== 'OK') return { denial: denialUnscoped('AUTHORITY_UNAVAILABLE', 'UNKNOWN') };
    const actor = idr.actor;
    if (!actor || actor.kind === 'UNVERIFIED') return { denial: denialUnscoped('ACTOR_OUT_OF_SCOPE') };
    if (actor.kind === 'GUEST_VERIFIED') {
      if (!actor.guest || actor.guest.state !== 'VALID') return { denial: denialUnscoped('GUEST_ACCESS_INVALID') };
      if (actor.guest.booking_scope !== req.booking_ref) return { denial: denialUnscoped('GUEST_ACCESS_OUT_OF_SCOPE') };
    }
    let booking;
    try { booking = ports.bookings.get(req.booking_ref); if (booking) checkBookingShape(booking); } catch (e) { return { denial: denialUnscoped('AUTHORITY_UNAVAILABLE', 'UNKNOWN') }; }
    if (!booking) return { denial: denialUnscoped(actor.kind === 'GUEST_VERIFIED' ? 'GUEST_ACCESS_OUT_OF_SCOPE' : 'ACTOR_OUT_OF_SCOPE') };
    if (actor.kind !== 'GUEST_VERIFIED') { let ok; try { ok = ports.access.canAccess(actor, booking); } catch (e) { return { denial: denialUnscoped('AUTHORITY_UNAVAILABLE', 'UNKNOWN') }; } if (!ok) return { denial: denialUnscoped('ACTOR_OUT_OF_SCOPE') }; }
    // DM-R4-B: alcance de comando, tipo y destinatario del invitado, reevaluado en cada límite (la identidad y la propiedad no lo sustituyen)
    let scopedReasons = null;
    if (actor.kind === 'GUEST_VERIFIED') {
      let gs; try { gs = ports.policy.guestScope(); } catch (e) { return { denial: denialUnscoped('AUTHORITY_UNAVAILABLE', 'UNKNOWN') }; }
      if (!isObj(gs)) return { denial: denialUnscoped('AUTHORITY_UNAVAILABLE', 'UNKNOWN') };
      const has = (k, v) => Array.isArray(gs[k]) && gs[k].includes(v);
      if (!has('commands', req.command) || (req.command === 'REQUEST_DOCUMENT' && !has('types', req.document_type)) || (req.command === 'DELIVER_DOCUMENT' && req.delivery && req.delivery.recipient_kind !== undefined && !has('share_kinds', req.delivery.recipient_kind))) scopedReasons = ['GUEST_ACCESS_OUT_OF_SCOPE'];
    }
    return { actor, booking, scopedReasons };
  }
  // Autorización FRESCA en el límite de liberación (tras render o tras envío): alcance, reserva/revisión, proveedor y política.
  function freshAuth(req, credential, actor, evalType, originalReq) {
    let nowIso2; try { nowIso2 = now(); } catch (e) { return { unknown: true }; }
    let sc; try { sc = resolveScope(req, credential, nowIso2); } catch (e) { return { unknown: true }; }
    if (sc.denial) return { lost: sc.denial };
    if (sc.actor.principal_scope !== actor.principal_scope || (sc.actor.tenant_scope || null) !== (actor.tenant_scope || null) || sc.actor.kind !== actor.kind) return { lost: denialUnscoped('ACTOR_OUT_OF_SCOPE') };
    if (sc.scopedReasons) return { lost: scopedDeny(req, sc.booking, sc.scopedReasons) };
    try { return { d2: evaluateDoc(evalType, sc.booking, originalReq, { nowIso: nowIso2 }), nowIso2, booking: sc.booking }; } catch (e) { if (e instanceof PortError) return { unknown: true }; throw e; }
  }

  // ----- entrega (comando separado; acuse del canal) -----
  const allowDelivery = (req, booking, doc) => projectScoped({ decision: 'ALLOW', doc_type: 'SHARE_DOCUMENT', booking_ref: req.booking_ref, booking_revision: booking.revision, reasons: [], actions: ['NONE'], expires_at: doc.decision_expires_at }); // caducidad = la de la autorización del documento; el sobre nuevo NO la renueva (DM-R5)
  function deliver(req, actor, booking, ctx, rec, credential) {
    const dl = req.delivery;
    const doc = docs.get(dl.document_id);
    if (!doc || doc.booking_ref !== req.booking_ref || doc.document_revision !== dl.document_revision) return scopedDeny(req, booking, ['SHAPE_INVALID']); // modelo: el catálogo no tiene código «documento no disponible» (ver informe)
    if (doc.state === 'VOIDED') return scopedDeny(req, booking, [doc.void_reason || 'BOOKING_CANCELLED_OR_INVALID']);
    if (doc.state === 'SUPERSEDED' || doc.booking_revision !== booking.revision) return scopedDeny(req, booking, [doc.void_reason || 'REVISION_CHANGED']);
    if (doc.state !== 'RENDERED') return scopedDeny(req, booking, ['SHAPE_INVALID']);
    if (ms(doc.decision_expires_at) <= ms(ctx.nowIso)) { const x = scopedDeny(req, booking, ['DECISION_EXPIRED']); if (rec && rec.delivery_id) x.delivery = projectDelivery(deliveries.get(rec.delivery_id)); return x; } // DM-R5-A: el registro histórico del acuse se conserva; no hay ALLOW vigente
    const re = evaluateDoc(doc.document_type, booking, { booking_revision: booking.revision }, ctx); // autorización ACTUAL del documento (no la histórica)
    if (re.decision !== 'ALLOW') return { response: projectScoped(Object.assign({}, re, { doc_type: 'SHARE_DOCUMENT', actions: ['NONE'] })) };
    if (re.deps !== doc.deps) { doc.state = 'SUPERSEDED'; doc.void_reason = 'REVISION_CHANGED'; return scopedDeny(req, booking, ['REVISION_CHANGED']); } // DM-R4-A: las dependencias del artefacto ya no son las vigentes
    const chans = call(() => ports.channel.catalog()) || [];
    if (!chans.includes(dl.channel)) return scopedDeny(req, booking, ['SHAPE_INVALID']);
    if (dl.recipient_kind === 'GUEST_ON_FILE' && booking.guest_on_file !== true) return scopedDeny(req, booking, ['RECIPIENT_MISSING']);
    if (rec && rec.delivery_id) return { response: allowDelivery(req, booking, doc), delivery: projectDelivery(deliveries.get(rec.delivery_id)), replay: true }; // misma solicitud: revalidada arriba, sin segundo efecto
    const sig = canon([dl.document_id, dl.document_revision, dl.channel, dl.recipient_kind, dl.recipient_ref || null]);
    for (const dv of deliveries.values()) if (dv.sig === sig && NONTERMINAL_DELIVERY.includes(dv.state)) return { response: allowDelivery(req, booking, doc), delivery: projectDelivery(dv), _delivery: dv }; // incierto: no hay segundo efecto
    const dv = { delivery_id: 'V' + String(++delSeq), sig, document_id: doc.document_id, document_revision: doc.document_revision, channel: dl.channel, recipient_kind: dl.recipient_kind, state: 'REQUESTED' };
    deliveries.set(dv.delivery_id, dv);
    dv.state = 'ATTEMPTED';
    let r; try { r = ports.channel.deliver({ delivery_id: dv.delivery_id, document_id: doc.document_id, channel: dl.channel, recipient_kind: dl.recipient_kind, recipient_ref: dl.recipient_ref }); } catch (e) { r = { uncertain: true }; }
    if (r && r.ack && r.ack.kind === 'CHANNEL_ACK') { dv.state = 'ACKED_BY_CHANNEL'; dv.ack = r.ack; } else if (r && r.failed === true) dv.state = 'FAILED'; else dv.state = 'UNCONFIRMED'; // res.ok / URL / apertura de enlace NO son acuse
    // límite de liberación de la entrega: si la autorización derivó durante el envío, el intento queda registrado pero el sobre NO se presenta como vigente
    const fa = freshAuth(req, credential, actor, doc.document_type, { booking_revision: booking.revision });
    const withDv = (x) => Object.assign(x, { delivery: projectDelivery(dv), _delivery: dv }); // el intento y su acuse histórico siempre se conservan y se informan
    if (fa.unknown) return withDv(scopedDeny(req, booking, ['AUTHORITY_UNAVAILABLE'], 'UNKNOWN'));
    if (fa.lost) return withDv({ response: fa.lost.response });
    if (fa.d2.decision !== 'ALLOW') return withDv({ response: projectScoped(Object.assign({}, fa.d2, { doc_type: 'SHARE_DOCUMENT', actions: ['NONE'] })) });
    if (fa.d2.deps !== doc.deps) { doc.state = 'SUPERSEDED'; doc.void_reason = 'REVISION_CHANGED'; return withDv(scopedDeny(req, booking, ['REVISION_CHANGED'])); }
    if (ms(doc.decision_expires_at) <= ms(fa.nowIso2)) return withDv(scopedDeny(req, booking, ['DECISION_EXPIRED'])); // DM-R5-A: el límite ORIGINAL se comprueba también tras el envío
    return withDv({ response: allowDelivery(req, booking, doc) });
  }

  // ----- punto de entrada -----
  function handle(raw, credential) {
    // 1) versión
    if (isObj(raw) && typeof raw.schema_version === 'string' && RE.ver.test(raw.schema_version) && raw.schema_version.split('.')[0] !== SUPPORTED_MAJOR) return denialUnscoped('SCHEMA_VERSION_UNSUPPORTED', 'UNKNOWN');
    // 2) forma estricta
    const errs = []; validate(REQUEST_SCHEMA, raw, '$', errs);
    const recipientOnly = errs.length > 0 && errs.every((p) => p === '$.delivery.recipient_kind'); // Sh14: RECIPIENT_MISSING es código CON alcance; se resuelve tras acreditar acceso
    if (errs.length && !recipientOnly) return denialUnscoped('SHAPE_INVALID');
    const req = raw; let nowIso; try { nowIso = now(); } catch (e) { return denialUnscoped('AUTHORITY_UNAVAILABLE', 'UNKNOWN'); } // reloj ausente/malformado: respuesta gobernada, nunca excepción
    const ctx = { nowIso };
    // 3–4) identidad y alcance (sin revelar existencia)
    const sc = resolveScope(req, credential, nowIso); if (sc.denial) return sc.denial;
    const { actor, booking } = sc;
    // — a partir de aquí el actor tiene alcance: formas SCOPED_DECISION —
    try {
      if (recipientOnly) return scopedDeny(req, booking, ['RECIPIENT_MISSING']);
      if (sc.scopedReasons) return scopedDeny(req, booking, sc.scopedReasons);
      // 5) idempotencia: ámbito principal/tenant + comando + reserva; el nonce identifica UNA solicitud canónica incluida su revisión (C12-01)
      const scopeKey = canon([actor.principal_scope, actor.tenant_scope || null, req.command, req.booking_ref]);
      const key = scopeKey + '\u0001' + req.idempotency_nonce; const digest = canonicalDigest(req);
      const rec = ops.get(key);
      if (rec && rec.digest !== digest) return scopedDeny(req, booking, ['IDEMPOTENCY_CONFLICT']);
      // 6) autorización ACTUAL en cada ejecución, también en el replay
      if (req.command === 'REQUEST_DOCUMENT') {
        const d = evaluateDoc(req.document_type, booking, req, ctx);
        if (rec && rec.document_id) { // replay: el historial no renueva el permiso ni rehabilita un artefacto anulado/sustituido (DM-R3)
          const doc = docs.get(rec.document_id);
          if (doc.state === 'VOIDED') return { response: scopedDeny(req, booking, [doc.void_reason || 'BOOKING_CANCELLED_OR_INVALID']).response, document: projectDocument(doc) };
          if (doc.state === 'SUPERSEDED') return { response: scopedDeny(req, booking, [doc.void_reason || 'REVISION_CHANGED']).response, document: projectDocument(doc) };
          if (d.decision !== 'ALLOW') return { response: projectScoped(d) };
          if (doc.deps && d.deps !== doc.deps) { doc.state = 'SUPERSEDED'; doc.void_reason = 'REVISION_CHANGED'; return { response: scopedDeny(req, booking, ['REVISION_CHANGED']).response, document: projectDocument(doc) }; }
          if (ms(rec.expires_at) <= ms(nowIso)) return scopedDeny(req, booking, ['DECISION_EXPIRED']);
          return { response: projectScoped(Object.assign({}, d, { expires_at: rec.expires_at, actions: doc.state === 'RENDERED' ? d.actions : ['NONE'] })), document: projectDocument(doc), replay: true }; // sin segundo render; expiración original
        }
        if (d.decision !== 'ALLOW') { ops.set(key, { digest, terminal: true }); return { response: projectScoped(d) }; } // la denegación no consume el nonce más allá de fijar su solicitud canónica
        d.public_digest = envDigest({ k: key });
        const doc = renderDocument(d, req, actor, ctx);
        // 7) límite de liberación (DM-R4): la autorización se verifica de nuevo cuando el artefacto va a presentarse como vigente
        let result;
        if (doc.state === 'RENDERED') {
          const fa = freshAuth(req, credential, actor, req.document_type, req);
          if (fa.unknown) { doc.state = 'VOIDED'; doc.void_reason = 'AUTHORITY_UNAVAILABLE'; result = Object.assign(scopedDeny(req, booking, ['AUTHORITY_UNAVAILABLE'], 'UNKNOWN'), { document: projectDocument(doc) }); }
          else if (fa.lost) { doc.state = 'VOIDED'; doc.void_reason = fa.lost.response.reason_codes[0]; result = { response: fa.lost.response }; }
          else if (fa.d2.decision !== 'ALLOW') { doc.state = fa.d2.reasons[0] === 'REVISION_CHANGED' ? 'SUPERSEDED' : 'VOIDED'; doc.void_reason = fa.d2.reasons[0]; result = { response: projectScoped(fa.d2), document: projectDocument(doc) }; }
          else if (fa.d2.deps !== doc.deps) { doc.state = 'SUPERSEDED'; doc.void_reason = 'REVISION_CHANGED'; result = Object.assign(scopedDeny(req, booking, ['REVISION_CHANGED']), { document: projectDocument(doc) }); }
          else if (ms(d.expires_at) <= ms(fa.nowIso2)) result = Object.assign(scopedDeny(req, booking, ['DECISION_EXPIRED']), { document: projectDocument(doc) });
        }
        if (!result) { const response = projectScoped(Object.assign({}, d, { actions: doc.state === 'RENDERED' ? d.actions : ['NONE'] })); result = { response, document: projectDocument(doc) }; }
        ops.set(key, { digest, document_id: doc.document_id, expires_at: d.expires_at, terminal: !NONTERMINAL_DOC.includes(doc.state) });
        return result;
      }
      // DELIVER_DOCUMENT
      const out = deliver(req, actor, booking, ctx, rec, credential);
      if (out.replay) return { response: out.response, delivery: out.delivery, replay: true };
      if (out._delivery) ops.set(key, { digest, delivery_id: out._delivery.delivery_id, terminal: !NONTERMINAL_DELIVERY.includes(out._delivery.state) });
      else if (!rec) ops.set(key, { digest, terminal: true }); // un replay denegado NO borra el registro de la entrega original (evita un segundo efecto posterior)
      delete out._delivery; return out;
    } catch (e) {
      if (e instanceof PortError) return scopedDeny(req, booking, ['AUTHORITY_UNAVAILABLE'], 'UNKNOWN');
      throw e;
    }
  }

  // Concilia una entrega incierta con el resultado observado del canal (única vía para salir de UNCONFIRMED).
  function reconcileDelivery(deliveryId, outcome) {
    const dv = deliveries.get(deliveryId); if (!dv || !NONTERMINAL_DELIVERY.includes(dv.state)) return null;
    if (outcome && outcome.ack && outcome.ack.kind === 'CHANNEL_ACK') { dv.state = 'ACKED_BY_CHANNEL'; dv.ack = outcome.ack; } else if (outcome && outcome.failed === true) dv.state = 'FAILED'; else return projectDelivery(dv);
    for (const r of ops.values()) if (r.delivery_id === deliveryId) r.terminal = true;
    return projectDelivery(dv);
  }
  // Barrido por evento: cancelación/revocación/cambio de revisión ⇒ SUPERSEDED/VOIDED (por evento; no se borra).
  function sweep() {
    const ctx = { nowIso: now() };
    for (const doc of docs.values()) {
      if (doc.state !== 'RENDERED') continue;
      const b = ports.bookings.get(doc.booking_ref);
      if (!b || b.cancelled === true) { doc.state = 'VOIDED'; doc.void_reason = 'BOOKING_CANCELLED_OR_INVALID'; continue; }
      if (b.revision !== doc.booking_revision) { doc.state = 'SUPERSEDED'; doc.void_reason = 'REVISION_CHANGED'; continue; }
      const e = evaluateDoc(doc.document_type, b, { booking_revision: b.revision }, ctx);
      if (e.decision !== 'ALLOW') { doc.state = 'VOIDED'; doc.void_reason = e.reasons[0]; } else if (e.deps !== doc.deps) { doc.state = 'SUPERSEDED'; doc.void_reason = 'REVISION_CHANGED'; }
    }
  }
  // Retención: la política decide qué operaciones TERMINALES se purgan (UNK); nunca una operación no terminal.
  function purge(isEligible) {
    let n = 0;
    for (const [k, r] of ops.entries()) if (r.terminal === true && isEligible(r)) { ops.delete(k); n++; }
    return n;
  }
  const inspect = () => ({ ops: ops.size, docs: Array.from(docs.values()).map((d) => ({ id: d.document_id, state: d.state })), deliveries: Array.from(deliveries.values()).map((d) => ({ id: d.delivery_id, state: d.state })), nonTerminalOps: Array.from(ops.values()).filter((r) => r.terminal !== true).length });
  return { handle, reconcileDelivery, sweep, purge, inspect, _internals: { evidenceDigestOf } };
}

module.exports = { createModel, makeValidator, validatePublic, validateDocumentPublic, validateDeliveryPublic, consumePublic, canonicalDigest, sha, canon, CATALOG: { COMMANDS, DOC_TYPES, REASONS, UNSCOPED_REASONS, EVIDENCE_KINDS, MEANINGS, ACTIONS, DOC_STATES, DELIVERY_STATES }, PROJECTION_VERSION };
