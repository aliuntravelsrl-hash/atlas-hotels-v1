'use strict';
// Resultado B — preparación del precio Core 1 para UNA selección. El kernel NO calcula precio: consume el DTO/vista de Core 1 (v2.2.3 / adaptador v1.1.1).
// Estado del modelo: MODELO/SIMULACIÓN OFFLINE; NO DESPLEGADO.
const { classify, valueOf, isPresent } = require('./dataState');
const { STATES, CORE1, FX, OCCUPANCY_BY_ADULTS, CHILD_RULE_KINDS } = require('./constants');

const isAge = (a) => Number.isInteger(a) && a >= 0 && a <= 17;
function validateSelection(sel) {
  if (!sel || typeof sel !== 'object') return false;
  if (typeof sel.room_ref !== 'string' || !sel.room_ref) return false;
  if (!Number.isInteger(sel.adults) || sel.adults < 1) return false;
  if (!Array.isArray(sel.child_ages) || !sel.child_ages.every(isAge)) return false;
  return true;
}
function checkContract(core) {
  const dto = core && core.public_dto;
  if (!dto || typeof dto !== 'object') return 'PUBLIC_DTO_AUSENTE';
  if (dto.dto_version !== CORE1.DTO_VERSION) return 'DTO_VERSION_INCOMPATIBLE';
  if (dto.mechanism_version !== CORE1.MECHANISM) return 'MECHANISM_INCOMPATIBLE';
  if (core.internal_view) {
    if (core.internal_view.view_version !== CORE1.VIEW_VERSION) return 'INTERNAL_VIEW_INCOMPATIBLE';
    if (core.internal_view.engine_version !== CORE1.ENGINE) return 'ENGINE_INCOMPATIBLE';
  }
  // defensa: Core 1 jamás debe entregar precio pagable/certificado ni habilitación derivada de la referencia
  if (dto.collection_allowed !== false) return 'CONTRACT_VIOLATION_COLLECTION';
  if (dto.booking_enablement && dto.booking_enablement.derived_from_reference !== false) return 'CONTRACT_VIOLATION_ENABLEMENT';
  if (dto.price && (dto.price.payable !== false || dto.price.total_certified !== false)) return 'CONTRACT_VIOLATION_PAYABLE';
  return null;
}
function roomData(hotel, roomRef) {
  const rooms = hotel && Array.isArray(hotel.rooms) ? hotel.rooms : [];
  return rooms.find((r) => r && r.room_ref === roomRef) || null; // SOLO la habitación elegida: sin herencia entre habitaciones
}
function evaluateFx(core, ctx) {
  const dto = core.public_dto; const target = dto.price && dto.price.reference_total && dto.price.reference_total.currency;
  const src = core.internal_view && core.internal_view.source_subtotal && core.internal_view.source_subtotal.currency;
  if (!src || !target) return { status: STATES.UNVERIFIED, note: 'Sin vista interna no se puede saber si hubo conversión; Core 1 ya exige tasa válida para devolver precio' };
  if (src === target) return { status: STATES.NOT_APPLICABLE, note: 'misma divisa; la tasa no se exige' };
  const fx = ctx && ctx.fx; const now = ctx && ctx.now ? Date.parse(ctx.now) : NaN;
  if (!fx) return { status: STATES.ABSENT, reason: 'FX_EVIDENCE_ABSENT' };
  if (!FX.AUTHORITIES.includes(fx.authority)) return { status: STATES.UNVERIFIED, reason: 'FX_AUTHORITY_INVALID' };
  if (!FX.DIRECTIONS.includes(fx.direction)) return { status: STATES.UNVERIFIED, reason: 'FX_DIRECTION_INVALID' };
  if (!fx.version) return { status: STATES.UNVERIFIED, reason: 'FX_VERSION_ABSENT' };
  const from = Date.parse(fx.valid_from); const until = Date.parse(fx.valid_until);
  if (Number.isNaN(now) || Number.isNaN(from) || Number.isNaN(until) || now < from || now >= until) return { status: STATES.UNVERIFIED, reason: 'FX_NOT_VALID_NOW' };
  return { status: STATES.PRESENT, note: 'validada por autoridad, dirección y vigencia; el valor de la tasa no se compara con 1' };
}
function evaluatePriceReadiness(hotel, selection, core, ctx) {
  const reasons = []; const applicable = []; const notApplicable = [];
  if (!validateSelection(selection)) return { verdict: 'RECHAZADO', reasons: ['INPUT_INVALID'], applicable, not_applicable: notApplicable };
  const bad = checkContract(core);
  if (bad) return { verdict: 'RECHAZADO', reasons: [bad], applicable, not_applicable: notApplicable };
  const dto = core.public_dto;
  const dtoRoom = dto.selection && Array.isArray(dto.selection.rooms) && dto.selection.rooms[0];
  if (dto.status === 'PRICE_REFERENCE' && (!dtoRoom || dtoRoom.room_ref !== selection.room_ref)) return { verdict: 'RECHAZADO', reasons: ['SELECTION_MISMATCH'], applicable, not_applicable: notApplicable };
  const room = roomData(hotel, selection.room_ref);
  if (!room) reasons.push('ROOM_NOT_DECLARED');
  else {
    applicable.push('capacity.adults_max'); const cap = room.capacity || {};
    const am = valueOf(cap.adults_max);
    if (!isPresent(cap.adults_max)) reasons.push('CAPACITY_ADULTS_' + classify(cap.adults_max).status);
    else if (selection.adults > am) reasons.push('CAPACITY_EXCEEDED_ADULTS');
    const occ = OCCUPANCY_BY_ADULTS[selection.adults]; applicable.push('occupancy.' + (occ || 'UNSUPPORTED'));
    if (!occ) reasons.push('OCCUPANCY_UNSUPPORTED');
    else if (valueOf((room.occupancies || {})[occ]) !== true) reasons.push('OCCUPANCY_' + occ + '_' + classify((room.occupancies || {})[occ]).status);
    for (const other of ['SGL', 'DBL', 'TPL', 'QUAD']) if (other !== occ) notApplicable.push('occupancy.' + other);
    const n = selection.child_ages.length;
    if (n === 0) notApplicable.push('capacity.children_max', 'age_policy.adult_from_age', 'age_policy.bands');
    else {
      applicable.push('capacity.children_max', 'age_policy.adult_from_age', 'age_policy.bands');
      const cm = valueOf(cap.children_max);
      if (!isPresent(cap.children_max)) reasons.push('CAPACITY_CHILDREN_' + classify(cap.children_max).status);
      else if (n > cm) reasons.push('CAPACITY_EXCEEDED_CHILDREN');
      const ap = (hotel && hotel.age_policy) || {};
      const afa = valueOf(ap.adult_from_age);
      if (!isPresent(ap.adult_from_age) || !Number.isInteger(afa)) reasons.push('ADULT_FROM_AGE_' + classify(ap.adult_from_age).status);
      else {
        const bands = Array.isArray(ap.bands) ? ap.bands : [];
        for (const age of selection.child_ages.filter((a) => a < afa)) {
          const band = bands.find((b) => b && Number.isInteger(b.from) && Number.isInteger(b.to) && age >= b.from && age <= b.to);
          if (!band) { reasons.push('AGE_BAND_ABSENT'); break; }
          const rule = band.rule;
          if (!rule || !CHILD_RULE_KINDS.includes(rule.kind)) { reasons.push('CHILD_RULE_NOT_EXPLICIT'); break; }   // 0 implícito o regla ausente: no se acepta
          if (rule.kind !== 'FREE' && !isPresent({ value: rule.value, origin: rule.origin, version: rule.version })) { reasons.push('CHILD_RULE_VALUE_' + classify({ value: rule.value, origin: rule.origin, version: rule.version }).status); break; }
        }
      }
    }
  }
  const fx = evaluateFx(core, ctx);
  if (fx.status === STATES.NOT_APPLICABLE) notApplicable.push('fx'); else if (fx.status !== STATES.UNVERIFIED || fx.reason) applicable.push('fx');
  if (fx.reason) reasons.push(fx.reason);
  if (dto.status !== 'PRICE_REFERENCE') reasons.push('CORE1_' + (dto.reason || dto.status));
  else if (!dto.price || !dto.price.reference_total) reasons.push('CORE1_PRICE_MISSING');
  const verdict = reasons.length ? 'CONSULTAR' : 'LISTO';
  const out = { verdict, reasons, applicable, not_applicable: notApplicable, fx: { status: fx.status, ...(fx.note ? { note: fx.note } : {}) } };
  if (verdict === 'LISTO') out.reference_total = dto.price.reference_total; // referencia pública de Core 1; no pagable, no certificada
  return out;
}
module.exports = { evaluatePriceReadiness, checkContract, validateSelection };
