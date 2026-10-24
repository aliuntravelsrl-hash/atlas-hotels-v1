'use strict';
// JSON canónico (claves ordenadas, sin espacios) y huella SHA-256: idéntico al generador de la evidencia (Python). Solo consistencia de bundle; NO autenticidad.
const crypto = require('crypto');
function canon(v) {
  if (v === null || typeof v !== 'object') { if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('NO_FINITO'); return JSON.stringify(v); }
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
}
const digest = (v) => crypto.createHash('sha256').update(canon(v), 'utf8').digest('hex');
const requestCanonical = (rq) => ({ hotel_ref: rq.hotel_ref, provider_plan_ref: rq.provider_plan_ref, check_in: rq.check_in, check_out: rq.check_out, payment_currency: rq.payment_currency,
  rooms: rq.rooms.map((r) => ({ room_ref: r.room_ref, adults: r.adults, child_ages: r.child_ages.slice() })) }); // incluye edades exactas
module.exports = { canon, digest, requestCanonical };
