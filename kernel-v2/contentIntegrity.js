'use strict';
// Resultado A — integridad del contenido. Presencia documental; NO evalúa emisión/entrega real de voucher (fulfillment).
const { classify, valueOf } = require('./dataState');
const { STATES } = require('./constants');
function evaluateContent(hotel) {
  const checks = []; const gaps = [];
  const add = (id, field, required, extra = {}) => {
    const c = classify(field); const ok = c.status === STATES.PRESENT && (extra.valid ? extra.valid(c.value) : true);
    const status = c.status === STATES.PRESENT && !ok ? STATES.UNVERIFIED : c.status;
    checks.push({ id, status, required, ...(c.why ? { why: c.why } : {}) });
    if (required && status !== STATES.PRESENT) gaps.push({ id, status });
  };
  if (!hotel || typeof hotel !== 'object') return { verdict: 'INCOMPLETO', checks: [], gaps: [{ id: 'HOTEL_RECORD', status: STATES.ABSENT }], fulfillment_scope: 'PRESENCIA_DOCUMENTAL; emisión/entrega real NO evaluada' };
  add('IDENTITY.hotel_ref', hotel.hotel_ref, true);
  add('IDENTITY.name', hotel.name, true);
  add('IDENTITY.is_active', hotel.is_active, true, { valid: (v) => v === true });
  add('MEDIA.photos', hotel.photos, true, { valid: (v) => Array.isArray(v) && v.length >= 3 && v.every((u) => typeof u === 'string' && u.startsWith('https://')) });
  const pol = (hotel.policies && typeof hotel.policies === 'object') ? hotel.policies : {};
  add('POLICY.check_in', pol.check_in, true);
  add('POLICY.check_out', pol.check_out, true);
  add('POLICY.cancellation', pol.cancellation, true);
  add('INFO.stars', hotel.stars, false); // visible, no obligatorio; nunca rellenado
  const rooms = Array.isArray(hotel.rooms) ? hotel.rooms : [];
  checks.push({ id: 'ROOMS.declared', status: rooms.length ? STATES.PRESENT : STATES.ABSENT, required: true });
  if (!rooms.length) gaps.push({ id: 'ROOMS.declared', status: STATES.ABSENT });
  return { verdict: gaps.length ? 'INCOMPLETO' : 'COMPLETO', checks, gaps, fulfillment_scope: 'PRESENCIA_DOCUMENTAL; emisión/entrega real NO evaluada' };
}
module.exports = { evaluateContent };
