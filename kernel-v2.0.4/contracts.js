'use strict';
// Validación estricta (cerrada) del contrato candidato de Core 1 v2.2.3 / adaptador v1.1.1 y de las evidencias de contexto. No recalcula precio.
const { CORE1, FX } = require('./constants');
const CAT = require('./catalog');
const V = require('./validators');
const DTO_KEYS = ['booking_enablement', 'channel', 'collection_allowed', 'computed_at', 'conditions', 'dto_version', 'fingerprint', 'mechanism_version', 'message_es', 'price', 'reason', 'request_id', 'selection', 'status', 'valid_until'];
const err = (m) => ({ ok: false, detail: m });
function validateRequest(rq) {
  if (!V.plainObject(rq)) return err('REQUEST_NO_OBJETO');
  if (!V.isStr(rq.request_id) || !V.isStr(rq.hotel_ref) || !V.isStr(rq.provider_plan_ref)) return err('REQUEST_IDENTIDAD');
  if (!V.isDate(rq.check_in) || !V.isDate(rq.check_out) || !(rq.check_in < rq.check_out)) return err('REQUEST_FECHAS');
  if (!V.isCurrency(rq.payment_currency)) return err('REQUEST_MONEDA');
  if (!Array.isArray(rq.rooms) || rq.rooms.length === 0) return err('REQUEST_HABITACIONES');
  if (rq.rooms.length !== 1) return { ok: false, detail: 'MULTIROOM_NOT_SUPPORTED', code: 'MULTIROOM_NOT_SUPPORTED' };
  const r = rq.rooms[0];
  if (!V.plainObject(r) || !V.isStr(r.room_ref) || !V.isInt(r.adults, 1, 20) || !Array.isArray(r.child_ages) || !r.child_ages.every((a) => V.isInt(a, 0, 17))) return err('REQUEST_HABITACION');
  return { ok: true };
}
function nightsBetween(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }
function validateConditions(list) {
  if (!Array.isArray(list)) return false; const seen = new Set();
  return list.every((c) => V.closed(c, ['code', 'message_es'], ['code', 'message_es']) === null && CAT.has(CAT.CONDITIONS, c.code) && c.message_es === CAT.CONDITIONS[c.code] && !seen.has(c.code) && seen.add(c.code));
}
function validatePublicDto(d) {
  let e = V.closed(d, DTO_KEYS, ['collection_allowed', 'computed_at', 'dto_version', 'mechanism_version', 'price', 'reason', 'request_id', 'status', 'booking_enablement', 'conditions', 'channel', 'message_es']);
  if (e) return err('DTO:' + e);
  if (d.dto_version !== CORE1.DTO_VERSION) return { ok: false, detail: 'DTO_VERSION_INCOMPATIBLE', code: 'DTO_VERSION_INCOMPATIBLE' };
  if (d.mechanism_version !== CORE1.MECHANISM) return { ok: false, detail: 'MECHANISM_INCOMPATIBLE', code: 'MECHANISM_INCOMPATIBLE' };
  if (!V.isStr(d.request_id) || Number.isNaN(V.parseInstant(d.computed_at))) return err('DTO:request_id/computed_at');
  if (!V.isStr(d.message_es) || d.message_es.length > 300) return err('DTO.message_es');
  if (d.collection_allowed !== false) return { ok: false, detail: 'COLLECTION_ALLOWED', code: 'CONTRACT_VIOLATION_COLLECTION' };
  e = V.closed(d.booking_enablement, ['derived_from_reference', 'status'], ['derived_from_reference', 'status']);
  if (e) return err('DTO.booking_enablement:' + e);
  if (d.booking_enablement.derived_from_reference !== false) return { ok: false, detail: 'ENABLEMENT_DERIVED', code: 'CONTRACT_VIOLATION_ENABLEMENT' };
  if (!CAT.BOOKING_STATUS.includes(d.booking_enablement.status)) return err('DTO.booking_enablement.status');
  if (d.channel !== null && (V.closed(d.channel, ['mode', 'status'], ['mode', 'status']) !== null || !CAT.CHANNEL_MODES.includes(d.channel.mode) || !CAT.CHANNEL_STATUS.includes(d.channel.status))) return err('DTO.channel');
  if (!validateConditions(d.conditions)) return err('DTO.conditions');
  if (d.status === 'PRICE_REFERENCE') {
    if (d.reason !== null) return err('DTO.reason');
    if (d.message_es !== CAT.CONDITIONS.REFERENCE_SUBJECT_TO_CONFIRMATION) return err('DTO.message_es_catalogo');
    if (!d.conditions.some((c) => c.code === 'REFERENCE_SUBJECT_TO_CONFIRMATION')) return err('DTO.conditions:falta_referencia_sujeta_a_confirmacion');
    e = V.closed(d.price, ['derived_average_per_night', 'nights', 'payable', 'reference_total', 'total_certified', 'unit'], ['derived_average_per_night', 'nights', 'payable', 'reference_total', 'total_certified', 'unit']);
    if (e) return err('DTO.price:' + e);
    if (d.price.payable !== false || d.price.total_certified !== false) return { ok: false, detail: 'PAYABLE_OR_CERTIFIED', code: 'CONTRACT_VIOLATION_PAYABLE' };
    if (!CAT.UNIT.includes(d.price.unit)) return err('DTO.price.unit');
    e = V.closed(d.price.reference_total, ['amount', 'currency'], ['amount', 'currency']); if (e) return err('DTO.reference_total:' + e);
    if (!V.isAmount(d.price.reference_total.amount) || !V.isCurrency(d.price.reference_total.currency)) return err('DTO.reference_total:IMPORTE_O_MONEDA_INVALIDOS');
    const a = d.price.derived_average_per_night;
    e = V.closed(a, ['amount', 'currency', 'is_rate'], ['amount', 'currency', 'is_rate']); if (e) return err('DTO.average:' + e);
    if (!V.isAmount(a.amount) || a.currency !== d.price.reference_total.currency || a.is_rate !== false) return err('DTO.average:VALORES_INVALIDOS');
    if (!V.isInt(d.price.nights, 1, 365)) return err('DTO.nights');
    if (!V.isStr(d.fingerprint) || !/^[0-9a-f]{24}$/.test(d.fingerprint)) return err('DTO.fingerprint');
    const ct = V.parseInstant(d.computed_at), vu = V.parseInstant(d.valid_until); if (Number.isNaN(ct) || Number.isNaN(vu)) return { ok: false, detail: 'QUOTE_TIMES_INVALID', code: 'QUOTE_TIMES_INVALID' };
    e = V.closed(d.selection, ['check_in', 'check_out', 'hotel_ref', 'provider_plan_ref', 'rooms'], ['check_in', 'check_out', 'hotel_ref', 'provider_plan_ref', 'rooms']); if (e) return err('DTO.selection:' + e);
    if (!V.isDate(d.selection.check_in) || !V.isDate(d.selection.check_out) || !(d.selection.check_in < d.selection.check_out) || !V.isStr(d.selection.hotel_ref) || !V.isStr(d.selection.provider_plan_ref)) return err('DTO.selection:valores');
    if (nightsBetween(d.selection.check_in, d.selection.check_out) !== d.price.nights) return err('DTO.nights:incoherente_con_fechas');
    if (!Array.isArray(d.selection.rooms) || !d.selection.rooms.every((r) => V.closed(r, ['adults_billed', 'adults_requested', 'child_count', 'children_billed', 'room_ref'], ['adults_billed', 'adults_requested', 'child_count', 'children_billed', 'room_ref']) === null && V.isInt(r.adults_billed, 0, 40) && V.isInt(r.adults_requested, 1, 40) && V.isInt(r.child_count, 0, 40) && V.isInt(r.children_billed, 0, 40) && V.isStr(r.room_ref))) return err('DTO.selection.rooms');
  } else if (CAT.NO_PRICE_STATUS.includes(d.status)) {
    if (d.price !== null || !V.isStr(d.reason)) return err('DTO.sin_precio');
    if ('selection' in d || 'fingerprint' in d || 'valid_until' in d) return err('DTO.sin_precio:campos_de_precio');
    if (d.conditions.length !== 0 || d.channel !== null) return err('DTO.sin_precio:conditions_o_channel');
    if (CAT.has(CAT.REASONS, d.reason) && d.message_es !== CAT.REASONS[d.reason]) return err('DTO.message_es_catalogo'); // motivos desconocidos NO se rechazan aquí: se mapean a «no reconocido»
  } else return err('DTO.status');
  return { ok: true };
}
function validateInternalView(v) {
  if (!V.plainObject(v)) return err('VIEW_NO_OBJETO');
  if (v.view_version !== CORE1.VIEW_VERSION) return { ok: false, detail: 'INTERNAL_VIEW_INCOMPATIBLE', code: 'INTERNAL_VIEW_INCOMPATIBLE' };
  if (v.engine_version !== CORE1.ENGINE) return { ok: false, detail: 'ENGINE_INCOMPATIBLE', code: 'ENGINE_INCOMPATIBLE' };
  if (!V.isStr(v.request_id)) return err('VIEW.request_id');
  if (!CAT.inCatalog(CAT.CALCULATION_STATUS, v.calculation_status)) return err('VIEW.calculation_status'); // v2.0.4: desconocido/ausente/nulo/tipo incorrecto ⇒ inválida; el valor recibido nunca se interpola
  if (!CAT.inCatalog(CAT.PROVIDER_AMOUNT_STATUS, v.provider_amount_status)) return err('VIEW.provider_amount_status');
  if (v.source_subtotal != null && (!V.isAmount(v.source_subtotal.amount) || !V.isCurrency(v.source_subtotal.currency))) return err('VIEW.source_subtotal');
  if (v.final_price_confirmed !== null) return { ok: false, detail: 'FINAL_PRICE_CONFIRMED', code: 'CONTRACT_VIOLATION_FINAL_PRICE' };
  if (v.collection_allowed !== false) return { ok: false, detail: 'COLLECTION', code: 'CONTRACT_VIOLATION_COLLECTION' };
  return { ok: true };
}
module.exports = { validateRequest, validatePublicDto, validateInternalView, FX };
