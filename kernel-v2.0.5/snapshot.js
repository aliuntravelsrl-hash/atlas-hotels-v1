'use strict';
// G1 — Snapshot de evaluación del SERVIDOR (misma evaluación): huellas canónicas de solicitud exacta (edades incluidas), perfil usado, DTO, vista interna, depósito y FX.
// Esto acredita CONSISTENCIA del bundle (offline). NO acredita autenticidad del emisor ni permisos (UNK, backend). Sin booleanos "firmado=true".
const { digest, requestCanonical } = require('./canonical');
const { valueOf, VAL } = require('./fieldData');
const V = require('./validators');
const OLD_VERSIONS = ['EVAL-SNAPSHOT-v1']; // contrato anterior (sin huella completa del DTO): no se acepta como LISTO
const SNAPSHOT_VERSION = 'EVAL-SNAPSHOT-v2';
const HEX = /^[0-9a-f]{64}$/;
const normLocalBands = (bands) => (Array.isArray(bands) ? bands : []).map((b) => { const r = V.plainObject(b) && V.plainObject(b.rule) ? b.rule : {};
  return { from: b.from, to: b.to, mode: r.kind === 'PERCENT' ? 'PERCENT_OF_DBL' : r.kind, value: r.kind === 'FREE' ? null : (r.value === undefined ? null : r.value), ...(r.kind === 'FIXED' ? { currency: r.currency } : {}) }; });
function verifySnapshot(hotel, rq, quote) {
  const out = { fatal: null, reasons: [] };
  const ev = V.plainObject(quote.context_evidence) ? quote.context_evidence : null; const sn = ev && ev.evaluation_snapshot;
  if (!V.plainObject(sn)) { out.reasons.push('EVALUATION_SNAPSHOT_ABSENT'); return out; }
  if (OLD_VERSIONS.includes(sn.snapshot_version)) { out.reasons.push('EVALUATION_SNAPSHOT_CONTRACT_OUTDATED'); return out; }
  const keys = ['snapshot_version', 'request_id', 'request_digest', 'dto_digest', 'dto_fingerprint', 'internal_view_digest', 'deposit_policy_digest', 'fx_digest', 'profile', 'profile_digest'];
  if (V.closed(sn, keys, keys) !== null || sn.snapshot_version !== SNAPSHOT_VERSION) { out.fatal = 'SNAPSHOT_SHAPE_INVALID'; return out; }
  if (sn.request_id !== rq.request_id) { out.fatal = 'SNAPSHOT_REQUEST_ID_MISMATCH'; return out; }
  if (![sn.request_digest, sn.dto_digest, sn.internal_view_digest, sn.deposit_policy_digest, sn.profile_digest].every((h) => HEX.test(h)) || !(sn.fx_digest === null || HEX.test(sn.fx_digest))) { out.fatal = 'SNAPSHOT_SHAPE_INVALID'; return out; }
  if (sn.request_digest !== digest(requestCanonical(rq))) { out.fatal = 'SNAPSHOT_REQUEST_DIGEST_MISMATCH'; return out; }          // edades exactas, identidad, fechas, moneda
  if (sn.dto_digest !== digest(quote.public_dto)) { out.fatal = 'SNAPSHOT_DTO_DIGEST_MISMATCH'; return out; } // contenido completo del DTO (total, promedio, condiciones, selección, vigencia…)
  if (sn.dto_fingerprint !== quote.public_dto.fingerprint) { out.fatal = 'SNAPSHOT_FINGERPRINT_MISMATCH'; return out; }
  if (quote.internal_view !== undefined && quote.internal_view !== null && sn.internal_view_digest !== digest(quote.internal_view)) { // vista ausente: la FX queda NO_VERIFICADO y no hay LISTO
    out.fatal = 'SNAPSHOT_INTERNAL_VIEW_MISMATCH'; return out; }
  if (ev.deposit_policy !== null && ev.deposit_policy !== undefined && sn.deposit_policy_digest !== digest(ev.deposit_policy)) { out.fatal = 'SNAPSHOT_DEPOSIT_MISMATCH'; return out; }
  if ((ev.fx === null || ev.fx === undefined) ? sn.fx_digest !== null : sn.fx_digest !== digest(ev.fx)) { out.fatal = 'SNAPSHOT_FX_MISMATCH'; return out; }
  if (!V.plainObject(sn.profile) || sn.profile_digest !== digest(sn.profile)) { out.fatal = 'SNAPSHOT_PROFILE_DIGEST_MISMATCH'; return out; }
  // identidad local: el perfil del hotel debe ser el hotel de la solicitud, del plan y de la habitación evaluada
  const p = sn.profile; const room = rq.rooms[0];
  if (p.hotel_ref !== rq.hotel_ref || p.provider_plan_ref !== rq.provider_plan_ref || p.room_ref !== room.room_ref) { out.fatal = 'SNAPSHOT_PROFILE_IDENTITY_MISMATCH'; return out; }
  if (valueOf(hotel && hotel.hotel_ref, VAL.text) !== rq.hotel_ref) { out.fatal = 'LOCAL_PROFILE_HOTEL_MISMATCH'; return out; }
  // correspondencia perfil local ↔ perfil usado en la evaluación (porción aplicable)
  const hr = (Array.isArray(hotel.rooms) ? hotel.rooms : []).find((r) => V.plainObject(r) && r.room_ref === room.room_ref);
  const diverge = (c) => { if (!out.reasons.includes(c)) out.reasons.push(c); };
  if (!hr) return out; // ROOM_NOT_DECLARED lo informa la evaluación de datos
  const cap = V.plainObject(hr.capacity) ? hr.capacity : {};
  const cmp = (datum, valid, expected) => { if (valueOf(datum, valid) !== expected) return false; return V.plainObject(datum) && datum.version === p.profile_version; };
  if (!cmp(cap.adults_max, VAL.capAdults, p.capacity.adults_max) || !cmp(cap.total_max, VAL.capTotal, p.capacity.total_max)) diverge('PROFILE_SNAPSHOT_DIVERGES');
  const dr = quote.public_dto.selection.rooms[0];
  if (dr.children_billed > 0 && !cmp(cap.children_max, VAL.capChildren, p.capacity.children_max)) diverge('PROFILE_SNAPSHOT_DIVERGES');
  if (room.child_ages.length > 0) {
    const ap = V.plainObject(hotel.age_policy) ? hotel.age_policy : {};
    if (!cmp(ap.adult_from_age, VAL.adultFromAge, p.adult_from_age)) diverge('PROFILE_SNAPSHOT_DIVERGES');
    const local = normLocalBands(ap.bands); const bandsVer = (Array.isArray(ap.bands) ? ap.bands : []).every((b) => V.plainObject(b) && V.plainObject(b.rule) && b.rule.version === p.profile_version);
    if (digest(local) !== digest(p.bands) || !bandsVer) diverge('PROFILE_SNAPSHOT_DIVERGES');
  }
  return out;
}

/**
 * Suplemento PA8 (dictamen Curator 9e43b48): integridad del paquete aplicable a una CONSULTA (DTO distinto de PRICE_REFERENCE) cuando hay snapshot ACTUAL de forma válida.
 * Separada de verifySnapshot: no usa dto.selection ni compara datos de perfil/capacidad del hotel (campos exclusivos de la preparación de precio).
 * Política conservada: snapshot ausente, de contrato antiguo o de forma no válida ⇒ sin cambios respecto de v2.0.5@f205a7e7 (la consulta no se rechaza por esto).
 * Acredita CONSISTENCIA del paquete, no autenticidad. Una huella recalculada por quien altera el paquete no es una firma.
 */
function verifyConsultIntegrity(rq, quote) {
  const out = { fatal: null };
  const ev = V.plainObject(quote.context_evidence) ? quote.context_evidence : null; const sn = ev && ev.evaluation_snapshot;
  if (!V.plainObject(sn) || sn.snapshot_version !== SNAPSHOT_VERSION) return out;
  const keys = ['snapshot_version', 'request_id', 'request_digest', 'dto_digest', 'dto_fingerprint', 'internal_view_digest', 'deposit_policy_digest', 'fx_digest', 'profile', 'profile_digest'];
  if (V.closed(sn, keys, keys) !== null) return out;
  if (![sn.request_digest, sn.dto_digest, sn.internal_view_digest, sn.deposit_policy_digest, sn.profile_digest].every((h) => HEX.test(h)) || !(sn.fx_digest === null || HEX.test(sn.fx_digest))) return out;
  if (sn.request_id !== rq.request_id) { out.fatal = 'SNAPSHOT_REQUEST_ID_MISMATCH'; return out; }
  if (sn.request_digest !== digest(requestCanonical(rq))) { out.fatal = 'SNAPSHOT_REQUEST_DIGEST_MISMATCH'; return out; }
  if (sn.dto_digest !== digest(quote.public_dto)) { out.fatal = 'SNAPSHOT_DTO_DIGEST_MISMATCH'; return out; }
  const fp = quote.public_dto.fingerprint === undefined ? null : quote.public_dto.fingerprint; // la consulta no trae fingerprint de precio
  if (sn.dto_fingerprint !== fp) { out.fatal = 'SNAPSHOT_FINGERPRINT_MISMATCH'; return out; }
  if (quote.internal_view !== undefined && quote.internal_view !== null && sn.internal_view_digest !== digest(quote.internal_view)) { out.fatal = 'SNAPSHOT_INTERNAL_VIEW_MISMATCH'; return out; }
  if (ev.deposit_policy !== null && ev.deposit_policy !== undefined && sn.deposit_policy_digest !== digest(ev.deposit_policy)) { out.fatal = 'SNAPSHOT_DEPOSIT_MISMATCH'; return out; }
  if ((ev.fx === null || ev.fx === undefined) ? sn.fx_digest !== null : sn.fx_digest !== digest(ev.fx)) { out.fatal = 'SNAPSHOT_FX_MISMATCH'; return out; }
  if (!V.plainObject(sn.profile) || sn.profile_digest !== digest(sn.profile)) { out.fatal = 'SNAPSHOT_PROFILE_DIGEST_MISMATCH'; return out; }
  return out;
}
module.exports = { verifySnapshot, verifyConsultIntegrity, SNAPSHOT_VERSION, normLocalBands };
