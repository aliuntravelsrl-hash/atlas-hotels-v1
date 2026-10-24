'use strict';
// Resultado A — integridad del contenido (presencia + validez semántica del dato). Fulfillment = presencia documental; emisión/entrega real NO evaluada.
const { classify, VAL } = require('./fieldData');
const { STATES } = require('./constants');
const V = require('./validators');
const SCOPE = 'PRESENCIA_DOCUMENTAL; emisión/entrega real NO evaluada';
function evaluateContent(hotel) {
  const checks = []; const gaps = [];
  const add = (id, field, required, valid) => { const c = classify(field, valid); checks.push({ id, status: c.status, required, ...(c.why ? { why: c.why } : {}) }); if (required && c.status !== STATES.PRESENT) gaps.push({ id, status: c.status, ...(c.why ? { why: c.why } : {}) }); };
  if (!V.plainObject(hotel)) return { verdict: 'INCOMPLETO', checks: [], gaps: [{ id: 'HOTEL_RECORD', status: STATES.ABSENT }], fulfillment_scope: SCOPE };
  add('IDENTITY.hotel_ref', hotel.hotel_ref, true, VAL.text); add('IDENTITY.name', hotel.name, true, VAL.text); add('IDENTITY.is_active', hotel.is_active, true, VAL.active);
  add('MEDIA.photos', hotel.photos, true, VAL.photos);
  const pol = V.plainObject(hotel.policies) ? hotel.policies : {};
  add('POLICY.check_in', pol.check_in, true, VAL.time); add('POLICY.check_out', pol.check_out, true, VAL.time); add('POLICY.cancellation', pol.cancellation, true, VAL.text);
  add('INFO.stars', hotel.stars, false, (v) => V.isInt(v, 1, 7));
  const rooms = Array.isArray(hotel.rooms) ? hotel.rooms.filter((r) => V.plainObject(r) && V.isStr(r.room_ref)) : [];
  checks.push({ id: 'ROOMS.declared', status: rooms.length ? STATES.PRESENT : STATES.ABSENT, required: true }); if (!rooms.length) gaps.push({ id: 'ROOMS.declared', status: STATES.ABSENT });
  return { verdict: gaps.length ? 'INCOMPLETO' : 'COMPLETO', checks, gaps, fulfillment_scope: SCOPE };
}
module.exports = { evaluateContent };
