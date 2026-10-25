'use strict';
// Mundo SINTÉTICO en memoria (no es Viva Miches ni datos reales): tablas «físicas» con la forma de las columnas observadas y lectores acreditados/revisiones INYECTABLES.
// Derivado de los escenarios del productor v1.1 para poder demostrar paridad. Nada aquí es un cliente de base de datos ni toca red.
const F = require('../../core1-producer-v1.1/synthetic/fixtures');
const clone = F.clone;
function buildWorld(name, mutate) {
  const [rq, data] = F.SC[name](); const W = { rq, calls: [], rev: { selection: 'SEL-1', rates: 'RAT-1', profile: 'PRO-1', policy: 'POL-1' }, immutable: true, retained: true, hooks: {} };
  const hid = data.hotels['H-REF'].hotel_id; const rowsAll = data.rates;
  const rt = (id) => rowsAll.find((x) => x.room_type_id === id) || rowsAll[0];
  W.physical = { hotels_master: [{ id: hid, slug: 'synth-hotel' }],
    rooms: Object.values(data.rooms).map((r) => { const row = rt(r.room_type_id); return { id: r.room_type_id, hotel_id: r.room_row_hotel_id, room_type: 'Texto libre', type: 'T', capacity_adults: row.capacity.max_adults, capacity_kids: row.capacity.max_children, capacity_children: row.capacity.max_children, max_occupancy: String(row.capacity.max_total) }; }),
    rates: rowsAll.map((x) => ({ id: x.id, room_id: x.room_type_id, hotel_id: x.hotel_id, valid_from: x.stay_from, valid_to: x.stay_until_exclusive, currency: x.currency, created_at: '2026-08-31T00:00:00Z' })),
    room_occupancy_rules: Object.values(data.rooms).map((r) => { const row = rt(r.room_type_id); return { room_id: r.room_type_id, hotel_id: r.room_row_hotel_id, child_min_age: 0, child_max_age: Math.max(...row.age_policy.bands.map((b) => b.to_age)), infant_max_age: 2, teen_max_age: null, max_adults: row.capacity.max_adults, max_children: row.capacity.max_children, max_occupancy: row.capacity.max_total }; }),
    hotel_profiles: [{ hotel_id: hid, hotel_slug: 'synth-hotel', politica_deposito: 'TEXTO POR DEFECTO 30% — NO AUTORIDAD' }] };
  W.accredited = { registry: { hotels: { 'H-REF': { hotel_id: hid, source_ref: 'SYNTH-REG', version: 'REG-1' } }, provider_plans: { PP1: { hotel_ref: 'H-REF', provider_id: 'P1', source_ref: 'SYNTH-REG' } },
      rooms: Object.fromEntries(Object.entries(data.rooms).map(([k, r]) => [k, { provider_plan_ref: r.provider_plan_ref, product: r.product, room_type_id: r.room_type_id, map_hotel_id: r.map_hotel_id, source_ref: 'SYNTH-REG' }])) },
    terms: Object.fromEntries(rowsAll.map((x) => [x.id, { provider_id: x.provider_id, revision: x.revision, unit: x.unit, price_basis: x.price_basis, taxes_included: x.taxes_included, placeholder: x.placeholder, is_active: x.is_active, verification_status: x.verification_status,
      review_evidence_ref: x.review_evidence_ref, source_document_id: x.source_document_id, occupancy_rates: clone(x.occupancy_rates), range_convention: 'TO_EXCLUSIVE', source_ref: 'SYNTH-TERMS', ...(x.condition_notes ? { condition_notes: clone(x.condition_notes) } : {}),
      ...(data.evidence[x.id] === 'PROVEN' ? { receipt: 'PROVEN', receipt_ref: 'SYNTH-RCPT', received_at: x.received_at } : {}) }])),
    source_document: clone(data.source_document),
    profiles: Object.fromEntries(Object.values(data.rooms).map((r) => { const row = rt(r.room_type_id); return [r.room_type_id, { age_policy: clone(row.age_policy), capacity: clone(row.capacity), source_ref: 'SYNTH-PROF', version: 'PV-1' }]; })),
    kernel: { hotel: clone(data.hotel), profile_version: data.hotel.hotel_ref.version, source_ref: 'SYNTH-HOTEL' }, policy: { policy: clone(data.policy), source_ref: 'SYNTH-POLICY' } };
  if (mutate) mutate(W, data); return W;
}
const U = (status) => ({ ok: false, status });
function createReaders(W) {
  const log = (n) => W.calls.push(n); const P = W.physical; const A = W.accredited; const hook = async (n) => { if (W.hooks[n]) await W.hooks[n](W); };
  const need = (cond, st) => (cond ? null : U(st || 'UNAVAILABLE'));
  return {
    physical: {
      async selectionRows(a) { log('phys.selectionRows'); await hook('selectionRows'); const h = P.hotels_master.find((x) => x.id === a.hotel_id); const r = P.rooms.find((x) => x.id === a.room_type_id); return h && r ? { ok: true, hotel: clone(h), room: clone(r) } : U('NOT_FOUND'); },
      async rateRows(a) { log('phys.rateRows'); await hook('rateRows'); return { ok: true, rows: clone(P.rates.filter((x) => x.hotel_id === a.hotel_id && a.room_type_ids.includes(x.room_id))) }; },
      async ruleRows(a) { log('phys.ruleRows'); await hook('ruleRows'); return { ok: true, rooms: clone(P.rooms.filter((x) => a.room_type_ids.includes(x.id))), rules: clone(P.room_occupancy_rules.filter((x) => a.room_type_ids.includes(x.room_id))) }; },
      async profileRows(a) { log('phys.profileRows'); await hook('profileRows'); const h = P.hotels_master.find((x) => x.id === a.hotel_id); const p = P.hotel_profiles.find((x) => x.hotel_id === a.hotel_id); return h && p ? { ok: true, hotel: clone(h), profile: clone(p) } : U('NOT_FOUND'); },
    },
    accredited: {
      async registry() { log('acc.registry'); await hook('registry'); return A.registry ? Object.assign({ ok: true }, clone(A.registry)) : U('UNAVAILABLE'); },
      async rateTerms(a) { log('acc.rateTerms'); await hook('rateTerms'); return A.terms ? { ok: true, terms: clone(Object.fromEntries(a.row_ids.filter((i) => A.terms[i]).map((i) => [i, A.terms[i]]))), source_document: clone(A.source_document) } : U('UNAVAILABLE'); },
      async rowProfile(a) { log('acc.rowProfile'); await hook('rowProfile'); return A.profiles ? { ok: true, profiles: clone(Object.fromEntries(a.room_type_ids.filter((i) => A.profiles[i]).map((i) => [i, A.profiles[i]]))) } : U('UNAVAILABLE'); },
      async kernelProfile() { log('acc.kernelProfile'); await hook('kernelProfile'); return A.kernel ? Object.assign({ ok: true }, clone(A.kernel)) : U('UNAVAILABLE'); },
      async governedPolicy() { log('acc.governedPolicy'); await hook('governedPolicy'); return A.policy ? Object.assign({ ok: true }, clone(A.policy)) : U('UNAVAILABLE'); },
    },
    revisions: {
      async pin() { log('rev.pin'); await hook('pin'); if (W.pinFail) return U(W.pinFail); const mk = (k) => ({ revision: W.rev[k], immutable: W.immutable, retained: W.retained, source_ref: 'SYNTH-REVAUTH' }); return { ok: true, ports: { selection: mk('selection'), rates: mk('rates'), profile: mk('profile'), policy: mk('policy') } }; },
      async current() { log('rev.current'); await hook('current'); if (W.currentFail) return W.currentFail === 'THROW' ? Promise.reject(new Error('relation "public.rates" does not exist SELECT * FROM secret')) : U(W.currentFail); return { ok: true, revisions: Object.assign({}, W.rev) }; },
    },
  };
}
module.exports = { buildWorld, createReaders, clone };
