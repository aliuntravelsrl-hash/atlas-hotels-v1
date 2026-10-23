'use strict';
// Validación estricta (cerrada) del contrato candidato de Core 1 v2.2.3 / adaptador v1.1.1 y de las evidencias de contexto. No recalcula precio.
const { CORE1, FX } = require('./constants');
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
function validatePublicDto(d) {
  let e = V.closed(d, DTO_KEYS, ['collection_allowed', 'computed_at', 'dto_version', 'mechanism_version', 'price', 'reason', 'request_id', 'status', 'booking_enablement', 'conditions']);
  if (e) return err('DTO:' + e);
  if (d.dto_version !== CORE1.DTO_VERSION) return { ok: false, detail: 'DTO_VERSION_INCOMPATIBLE', code: 'DTO_VERSION_INCOMPATIBLE' };
  if (d.mechanism_version !== CORE1.MECHANISM) return { ok: false, detail: 'MECHANISM_INCOMPATIBLE', code: 'MECHANISM_INCOMPATIBLE' };
  if (!V.isStr(d.request_id) || V.parseInstant(d.computed_at) !== V.parseInstant(d.computed_at) /* NaN */) return err('DTO:request_id/computed_at');
  if (d.collection_allowed !== false) return { ok: false, detail: 'COLLECTION_ALLOWED', code: 'CONTRACT_VIOLATION_COLLECTION' };
  e = V.closed(d.booking_enablement, ['derived_from_reference', 'status'], ['derived_from_reference', 'status']);
  if (e) return err('DTO.booking_enablement:' + e);
  if (d.booking_enablement.derived_from_reference !== false) return { ok: false, detail: 'ENABLEMENT_DERIVED', code: 'CONTRACT_VIOLATION_ENABLEMENT' };
  if (!Array.isArray(d.conditions) || !d.conditions.every((c) => V.closed(c, ['code', 'message_es'], ['code', 'message_es']) === null && V.isStr(c.code))) return err('DTO.conditions');
  if (d.status === 'PRICE_REFERENCE') {
    if (d.reason !== null) return err('DTO.reason');
    e = V.closed(d.price, ['derived_average_per_night', 'nights', 'payable', 'reference_total', 'total_certified', 'unit'], ['derived_average_per_night', 'nights', 'payable', 'reference_total', 'total_certified', 'unit']);
    if (e) return err('DTO.price:' + e);
    if (d.price.payable !== false || d.price.total_certified !== false) return { ok: false, detail: 'PAYABLE_OR_CERTIFIED', code: 'CONTRACT_VIOLATION_PAYABLE' };
    e = V.closed(d.price.reference_total, ['amount', 'currency'], ['amount', 'currency']); if (e) return err('DTO.reference_total:' + e);
    if (!V.isAmount(d.price.reference_total.amount) || !V.isCurrency(d.price.reference_total.currency)) return err('DTO.reference_total:IMPORTE_O_MONEDA_INVALIDOS');
    e = V.closed(d.price.derived_average_per_night, ['amount', 'currency', 'is_rate'], ['amount', 'currency', 'is_rate']); if (e) return err('DTO.average:' + e);
    if (!V.isInt(d.price.nights, 1, 365)) return err('DTO.nights');
    if (!V.isStr(d.fingerprint) || !/^[0-9a-f]{24}$/.test(d.fingerprint)) return err('DTO.fingerprint');
    const ct = V.parseInstant(d.computed_at), vu = V.parseInstant(d.valid_until); if (Number.isNaN(ct) || Number.isNaN(vu)) return { ok: false, detail: 'QUOTE_TIMES_INVALID', code: 'QUOTE_TIMES_INVALID' };
    e = V.closed(d.selection, ['check_in', 'check_out', 'hotel_ref', 'provider_plan_ref', 'rooms'], ['check_in', 'check_out', 'hotel_ref', 'provider_plan_ref', 'rooms']); if (e) return err('DTO.selection:' + e);
    if (!Array.isArray(d.selection.rooms) || !d.selection.rooms.every((r) => V.closed(r, ['adults_billed', 'adults_requested', 'child_count', 'children_billed', 'room_ref'], ['adults_billed', 'adults_requested', 'child_count', 'children_billed', 'room_ref']) === null && V.isInt(r.adults_billed, 0, 40) && V.isInt(r.adults_requested, 1, 40) && V.isInt(r.child_count, 0, 40) && V.isInt(r.children_billed, 0, 40) && V.isStr(r.room_ref))) return err('DTO.selection.rooms');
  } else if (d.status === 'CONSULT' || d.status === 'REQUEST_INVALID') {
    if (d.price !== null || !V.isStr(d.reason)) return err('DTO.sin_precio');
    if ('selection' in d || 'fingerprint' in d || 'valid_until' in d) return err('DTO.sin_precio:campos_de_precio');
  } else return err('DTO.status');
  return { ok: true };
}
function validateInternalView(v) {
  if (!V.plainObject(v)) return err('VIEW_NO_OBJETO');
  if (v.view_version !== CORE1.VIEW_VERSION) return { ok: false, detail: 'INTERNAL_VIEW_INCOMPATIBLE', code: 'INTERNAL_VIEW_INCOMPATIBLE' };
  if (v.engine_version !== CORE1.ENGINE) return { ok: false, detail: 'ENGINE_INCOMPATIBLE', code: 'ENGINE_INCOMPATIBLE' };
  if (!V.isStr(v.request_id)) return err('VIEW.request_id');
  if (v.source_subtotal != null && (!V.isAmount(v.source_subtotal.amount) || !V.isCurrency(v.source_subtotal.currency))) return err('VIEW.source_subtotal');
  if (v.final_price_confirmed !== null) return { ok: false, detail: 'FINAL_PRICE_CONFIRMED', code: 'CONTRACT_VIOLATION_FINAL_PRICE' };
  if (v.collection_allowed !== false) return { ok: false, detail: 'COLLECTION', code: 'CONTRACT_VIOLATION_COLLECTION' };
  return { ok: true };
}
module.exports = { validateRequest, validatePublicDto, validateInternalView, FX };
