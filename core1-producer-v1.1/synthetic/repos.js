'use strict';
// Repositorios SINTÉTICOS en memoria. Solo lectura desde la perspectiva del productor. La revisión es direccionada por contenido (cambiar el dato cambia la revisión).
const { digest } = require('../../kernel-v2.0.3/canonical');
const clone = (o) => JSON.parse(JSON.stringify(o));
function createSyntheticRepos(initial, opts = {}) {
  const store = clone(initial); const hooks = {}; const log = [];
  const R = (d) => 'rev-' + digest(d).slice(0, 12);
  const after = (port) => { if (hooks[port]) { const f = hooks[port]; delete hooks[port]; f(store); } };
  const sliceSel = (a) => ({ hotels: store.hotels[a.hotel_ref] ? { [a.hotel_ref]: store.hotels[a.hotel_ref] } : {}, provider_plans: store.provider_plans[a.provider_plan_ref] ? { [a.provider_plan_ref]: store.provider_plans[a.provider_plan_ref] } : {}, rooms: store.rooms[a.room_ref] ? { [a.room_ref]: store.rooms[a.room_ref] } : {} });
  const sliceRates = (a) => { const rows = store.rates.filter((x) => x.hotel_id === a.hotel_id && x.provider_id === a.provider_id && a.room_type_ids.includes(x.room_type_id)); const ev = {}; rows.forEach((x) => { ev[x.id] = store.evidence[x.id] || 'UNK'; }); return { rates: clone(rows), received_at_evidence: ev, source_document: clone(store.source_document) }; };
  const sliceProfile = (a) => ({ hotel: clone(store.hotel), profile_version: store.hotel.hotel_ref && store.hotel.hotel_ref.version });
  const slicePolicy = () => clone(store.policy);
  const revs = (a) => ({ selection: R(sliceSel(a)), rates: R(sliceRates(a)), profile: R(sliceProfile(a)), policy: R(slicePolicy()) });
  return {
    resolveSelection(a) { log.push('resolveSelection'); if (opts.unavailable === 'selection') return { ok: false, status: 'UNAVAILABLE' }; const d = sliceSel(a); const r = { ok: true, revision: opts.noRevisions ? '' : R(d), data: d }; after('selection'); return r; },
    getRates(a) { log.push('getRates'); if (opts.unavailable === 'rates') return { ok: false, status: 'UNAVAILABLE' }; const d = sliceRates(a); const r = { ok: true, revision: R(d), data: d }; after('rates'); return r; },
    getHotelProfile(a) { log.push('getHotelProfile'); if (opts.unavailable === 'profile') return { ok: false, status: 'NOT_FOUND' }; const d = sliceProfile(a); const r = { ok: true, revision: R(d), data: d }; after('profile'); return r; },
    getPolicyAndFx() { log.push('getPolicyAndFx'); if (opts.unavailable === 'policy') return { ok: false, status: 'UNAVAILABLE' }; const d = slicePolicy(); const r = { ok: true, revision: R(d), data: d }; after('policy'); return r; },
    currentRevisions(a) { log.push('currentRevisions'); return revs(a); },
    _store: store, _hooks: hooks, _log: log,
  };
}
module.exports = { createSyntheticRepos };
