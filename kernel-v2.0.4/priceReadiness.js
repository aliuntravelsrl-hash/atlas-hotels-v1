'use strict';
// Resultado B — preparación del precio Core 1 para UNA selección vinculada a UNA cotización. El kernel NO calcula ni recalcula precio:
// verifica vínculo, vigencia, aplicabilidad de datos y coherencia con el resultado de Core 1. MODELO/SIMULACIÓN OFFLINE; NO DESPLEGADO.
const { classify, isPresent, valueOf, VAL } = require('./fieldData');
const { STATES, FX, OCCUPANCY_BY_ADULTS, CHILD_RULE_KINDS, CURRENCIES } = require('./constants');
const V = require('./validators');
const C = require('./contracts');
const CAT = require('./catalog');
const { verifySnapshot } = require('./snapshot');

const reject = (code) => ({ verdict: 'RECHAZADO', reasons: [code], applicable: [], not_applicable: [] });

function bind(rq, dto, view, evidence) { // K2-R1: vínculo de TODA la selección con la misma cotización; sin confiar en booleanos del cliente
  const room = rq.rooms[0];
  if (dto.request_id !== rq.request_id) return 'BINDING_REQUEST_ID';
  if (view && view.request_id !== rq.request_id) return 'BINDING_INTERNAL_VIEW_REQUEST_ID';
  if (evidence && evidence.quote_request_id !== undefined && evidence.quote_request_id !== rq.request_id) return 'BINDING_CONTEXT_EVIDENCE_REQUEST_ID';
  if (dto.status !== 'PRICE_REFERENCE') return null;
  const s = dto.selection;
  if (s.hotel_ref !== rq.hotel_ref) return 'BINDING_HOTEL';
  if (s.provider_plan_ref !== rq.provider_plan_ref) return 'BINDING_PROVIDER_PLAN';
  if (s.check_in !== rq.check_in || s.check_out !== rq.check_out) return 'BINDING_DATES';
  if (s.rooms.length !== 1) return 'MULTIROOM_NOT_SUPPORTED';
  const r = s.rooms[0];
  if (r.room_ref !== room.room_ref) return 'BINDING_ROOM';
  if (r.adults_requested !== room.adults) return 'BINDING_ADULTS';
  if (r.child_count !== room.child_ages.length) return 'BINDING_CHILD_COUNT';
  if (dto.price.reference_total.currency !== rq.payment_currency) return 'BINDING_CURRENCY';
  return null;
}
function findRoom(hotel, ref) { const rooms = V.plainObject(hotel) && Array.isArray(hotel.rooms) ? hotel.rooms : []; return rooms.find((r) => V.plainObject(r) && r.room_ref === ref) || null; } // solo la habitación elegida

function checkBands(ap, ages, reasons) {
  const afa = valueOf(ap.adult_from_age, VAL.adultFromAge);
  const bands = Array.isArray(ap.bands) ? ap.bands : [];
  // coherencia estructural de las bandas (aunque no se usen todas): enteros 0..17, from<=to, sin solapes, ordenadas
  let prevTo = -1;
  for (const b of bands) {
    if (!V.plainObject(b) || !V.isInt(b.from, 0, 17) || !V.isInt(b.to, 0, 17) || b.from > b.to || b.from <= prevTo) { reasons.push('AGE_BANDS_MALFORMED'); return afa; }
    prevTo = b.to;
  }
  for (const age of ages.filter((a) => a < afa)) {
    const band = bands.find((b) => age >= b.from && age <= b.to);
    if (!band) { reasons.push('AGE_BAND_ABSENT'); break; }
    const rule = band.rule;
    if (!V.plainObject(rule) || !CHILD_RULE_KINDS.includes(rule.kind)) { reasons.push('CHILD_RULE_NOT_EXPLICIT'); break; }
    if (!V.isProv(rule.origin) || !V.isProv(rule.version)) { reasons.push('CHILD_RULE_PROVENANCE_' + STATES.UNVERIFIED); break; } // FREE también exige procedencia del perfil/regla
    if (rule.kind === 'PERCENT' && !(V.isDecimalPos(rule.value) && Number(rule.value) <= 100)) { reasons.push('CHILD_RULE_VALUE_INVALID'); break; }
    if (rule.kind === 'FIXED' && !(V.isDecimalPos(rule.value) && CURRENCIES.includes(rule.currency))) { reasons.push('CHILD_RULE_VALUE_INVALID'); break; }
    if (rule.kind === 'FREE' && 'value' in rule && rule.value !== undefined) { reasons.push('CHILD_RULE_VALUE_INVALID'); break; }
  }
  return afa;
}

function evaluateFx(rq, dto, view, evidence, ctx, reasons) { // K2-R3: aplicabilidad acreditada con evidencia de la MISMA cotización; NO_VERIFICADO no equivale a LISTO
  if (!view) { reasons.push('FX_APPLICABILITY_UNVERIFIED'); return { status: STATES.UNVERIFIED, note: 'sin vista interna vinculada no se acredita si hubo conversión' }; }
  const dep = evidence && V.plainObject(evidence.deposit_policy) ? evidence.deposit_policy : null;
  if (!dep || !evidence || evidence.quote_request_id !== rq.request_id) { reasons.push('DEPOSIT_POLICY_UNVERIFIED'); return { status: STATES.UNVERIFIED, note: 'sin política de depósito vinculada no se acredita si el mínimo convierte' }; }
  const srcCcy = view.source_subtotal && view.source_subtotal.currency; const pay = rq.payment_currency;
  if (!srcCcy) { reasons.push('FX_APPLICABILITY_UNVERIFIED'); return { status: STATES.UNVERIFIED, note: 'la vista interna no trae moneda de origen' }; }
  const uses = [];
  if (srcCcy !== pay) uses.push('TOTAL');
  if (dep.type !== 'FULL_PAYMENT') {
    const m = dep.minimum_per_room; if (!V.plainObject(m) || !CURRENCIES.includes(m.currency)) { reasons.push('DEPOSIT_POLICY_UNVERIFIED'); return { status: STATES.UNVERIFIED }; }
    if (m.currency !== pay) uses.push('DEPOSIT_MINIMUM');
  }
  if (!uses.length) return { status: STATES.NOT_APPLICABLE, note: 'misma moneda en total y mínimo; la tasa no se exige', used_for: [] };
  const fx = evidence.fx; const fail = (c) => { reasons.push(c); return { status: STATES.UNVERIFIED, used_for: uses }; };
  if (!V.plainObject(fx)) return fail('FX_EVIDENCE_ABSENT');
  if (fx.quote_request_id !== rq.request_id) return fail('FX_EVIDENCE_UNBOUND');
  if (fx.pair !== FX.PAIR) return fail('FX_PAIR_INVALID');
  if (fx.direction !== FX.DIRECTION) return fail('FX_DIRECTION_INVALID');
  if (!V.isProv(fx.version) || !V.isProv(fx.rate_ref) || !V.isProv(fx.source_ref)) return fail('FX_SOURCE_OR_VERSION_ABSENT');
  const auth = ctx && Array.isArray(ctx.fx_authorities) ? ctx.fx_authorities : [];
  if (!V.isProv(fx.approved_by_ref) || !auth.includes(fx.approved_by_ref)) return fail('FX_AUTHORITY_NOT_ACCREDITED');
  const from = V.parseInstant(fx.effective_from), until = V.parseInstant(fx.effective_until_exclusive), at = V.parseInstant(dto.computed_at), vu = V.parseInstant(dto.valid_until);
  if (Number.isNaN(from) || Number.isNaN(until) || !(from <= at && at < until && vu <= until)) return fail('FX_NOT_VALID_FOR_QUOTE');
  return { status: STATES.PRESENT, used_for: uses, note: 'evidencia de la misma cotización: autoridad acreditada por el servidor, dirección, versión y ventana; el valor de la tasa no se compara con 1' };
}

function evaluatePriceReadiness(hotel, rq, quote, ctx) {
  const vr = C.validateRequest(rq); if (!vr.ok) return reject(vr.code || 'INPUT_INVALID');
  const now = V.parseInstant(ctx && ctx.now); if (Number.isNaN(now)) return reject('NOW_INVALID');
  if (!V.plainObject(quote)) return reject('QUOTE_ABSENT');
  const dto = quote.public_dto; const vd = C.validatePublicDto(dto); if (!vd.ok) return reject(vd.code || 'DTO_SHAPE_INVALID');
  let view = null; if (quote.internal_view !== undefined && quote.internal_view !== null) { const vv = C.validateInternalView(quote.internal_view); if (!vv.ok) return reject(vv.code || 'INTERNAL_VIEW_SHAPE_INVALID'); view = quote.internal_view; }
  const evidence = V.plainObject(quote.context_evidence) ? quote.context_evidence : null;
  const bad = bind(rq, dto, view, evidence); if (bad) return reject(bad);
  const reasons = []; const applicable = []; const notApplicable = []; const room = rq.rooms[0];
  if (dto.status !== 'PRICE_REFERENCE') { // motivos externos: solo del catálogo local; lo desconocido es genérico y su detalle queda interno
    const known = CAT.has(CAT.REASONS, dto.reason);
    return { verdict: 'CONSULTAR', reasons: [known ? 'CORE1_' + dto.reason : 'CORE1_REASON_UNRECOGNIZED'], applicable, not_applicable: notApplicable, ...(known ? {} : { diagnostics: { unrecognized_core1_reason: String(dto.reason).slice(0, 60) } }) };
  }
  // G1: snapshot de la misma evaluación (edades exactas, perfil, huellas). Ausente ⇒ no LISTO; inconsistente ⇒ rechazado.
  const sv = verifySnapshot(hotel, rq, quote); if (sv.fatal) return reject(sv.fatal); sv.reasons.forEach((c) => reasons.push(c));
  // K2-R2: vigencia con reloj de servidor explícito. La condición comercial vencida es una nota y NO se mezcla aquí.
  const ct = V.parseInstant(dto.computed_at), vu = V.parseInstant(dto.valid_until);
  if (!(ct < vu)) return reject('QUOTE_TIMES_INVALID');
  if (ct > now) return reject('QUOTE_FROM_FUTURE');
  if (now >= vu) reasons.push('QUOTE_EXPIRED');
  // K2-R5: ocupación y capacidad EFECTIVAS (tras reclasificación) y coherencia con el perfil local; sin segundo calculador
  const dr = dto.selection.rooms[0]; const effAdults = dr.adults_billed, effChildren = dr.children_billed;
  if (effAdults + effChildren !== dr.adults_requested + dr.child_count) reasons.push('EFFECTIVE_COUNTS_INCONSISTENT');
  const hr = findRoom(hotel, room.room_ref);
  if (!hr) reasons.push('ROOM_NOT_DECLARED');
  else {
    const cap = V.plainObject(hr.capacity) ? hr.capacity : {};
    applicable.push('capacity.adults_max', 'capacity.total_max');
    if (!isPresent(cap.adults_max, VAL.capAdults)) reasons.push('CAPACITY_ADULTS_' + classify(cap.adults_max, VAL.capAdults).status); else if (effAdults > cap.adults_max.value) reasons.push('CAPACITY_EXCEEDED_ADULTS');
    if (!isPresent(cap.total_max, VAL.capTotal)) reasons.push('CAPACITY_TOTAL_' + classify(cap.total_max, VAL.capTotal).status); else if (effAdults + effChildren > cap.total_max.value) reasons.push('CAPACITY_EXCEEDED_TOTAL');
    const occ = OCCUPANCY_BY_ADULTS[effAdults]; applicable.push('occupancy.' + (occ || 'UNSUPPORTED'));
    if (!occ) reasons.push('OCCUPANCY_UNSUPPORTED');
    else if (valueOf((V.plainObject(hr.occupancies) ? hr.occupancies : {})[occ], VAL.occ) !== true) reasons.push('OCCUPANCY_' + occ + '_' + classify((V.plainObject(hr.occupancies) ? hr.occupancies : {})[occ], VAL.occ).status);
    for (const o of ['SGL', 'DBL', 'TPL', 'QUAD']) if (o !== occ) notApplicable.push('occupancy.' + o);
    const n = room.child_ages.length;
    if (n === 0) notApplicable.push('capacity.children_max', 'age_policy.adult_from_age', 'age_policy.bands');
    else {
      applicable.push('age_policy.adult_from_age', 'age_policy.bands');
      const ap = V.plainObject(hotel.age_policy) ? hotel.age_policy : {};
      if (!isPresent(ap.adult_from_age, VAL.adultFromAge)) reasons.push('ADULT_FROM_AGE_' + classify(ap.adult_from_age, VAL.adultFromAge).status);
      else {
        const afa = checkBands(ap, room.child_ages, reasons);
        const adultsByAge = room.child_ages.filter((a) => a >= afa).length;
        if (dr.adults_billed !== dr.adults_requested + adultsByAge || dr.children_billed !== n - adultsByAge) reasons.push('PROFILE_RECLASSIFICATION_DIVERGES'); // dato local y cotización divergen: no LISTO hasta reconciliar
        if (view && Array.isArray(view.reclassified) && view.reclassified.reduce((s, x) => s + (Array.isArray(x.ages) ? x.ages.length : 0), 0) !== adultsByAge) reasons.push('PROFILE_RECLASSIFICATION_DIVERGES');
      }
      if (dr.children_billed > 0) { applicable.push('capacity.children_max'); if (!isPresent(cap.children_max, VAL.capChildren)) reasons.push('CAPACITY_CHILDREN_' + classify(cap.children_max, VAL.capChildren).status); else if (effChildren > cap.children_max.value) reasons.push('CAPACITY_EXCEEDED_CHILDREN'); }
      else notApplicable.push('capacity.children_max');
    }
  }
  const fx = evaluateFx(rq, dto, view, evidence, ctx, reasons);
  if (fx.status === STATES.NOT_APPLICABLE) notApplicable.push('fx'); else applicable.push('fx');
  const uniq = [...new Set(reasons)];
  const out = { verdict: uniq.length ? 'CONSULTAR' : 'LISTO', reasons: uniq, applicable, not_applicable: notApplicable, fx: { status: fx.status, ...(fx.used_for ? { used_for: fx.used_for } : {}), ...(fx.note ? { note: fx.note } : {}) } };
  if (out.verdict === 'LISTO') out.reference_total = { amount: dto.price.reference_total.amount, currency: dto.price.reference_total.currency }; // proyección positiva: campos explícitos ya validados
  return out;
}
module.exports = { evaluatePriceReadiness };
