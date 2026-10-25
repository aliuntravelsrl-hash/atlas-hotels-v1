'use strict';
// Adaptador físico de puertos Core 1 — CANDIDATO INERTE (composición 1 de la SPEC). Etapa asíncrona de lectura con revisiones FIJADAS por una autoridad inyectada → evaluación pura SÍNCRONA con el
// productor v1.1 (sin editarlo) → relectura asíncrona de la autoridad que BLOQUEA el resultado provisional si hay deriva. Sin red, SQL, RPC ni cliente de base de datos.
const { createProducer } = require('../core1-producer-v1.1/producer');
const { ADAPTER_VERSION, PORT_STATUSES } = require('./constants');
const isObj = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
const str = (s) => typeof s === 'string' && s.length > 0;
const REV = /^[A-Za-z0-9._:-]{1,80}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CAP_SOURCES = Object.freeze(['rooms.capacity_kids', 'rooms.capacity_children', 'room_occupancy_rules.max_children']);
const READERS = Object.freeze({ physical: ['selectionRows', 'rateRows', 'ruleRows', 'profileRows'], accredited: ['registry', 'rateTerms', 'rowProfile', 'kernelProfile', 'governedPolicy'], revisions: ['pin', 'current'] });
const PROBE = Symbol('probe');
const TIME_CODES = Object.freeze(['QUOTE_EXPIRED', 'NOW_INVALID', 'QUOTE_FROM_FUTURE']);   // códigos temporales EXISTENTES del kernel congelado (sin códigos nuevos)
const addDay = (d) => { const t = new Date(d + 'T00:00:00Z'); if (Number.isNaN(t.getTime()) || t.toISOString().slice(0, 10) !== d) return null; t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10); };
const fail = (status) => ({ ok: false, status: PORT_STATUSES.includes(status) ? status : 'UNAVAILABLE' });
// Toda lectura inyectada se normaliza: excepciones, rechazos, estados desconocidos y textos crudos (SQL, tablas, proveedor) NUNCA cruzan; solo el catálogo cerrado.
async function call(fn) { try { const r = await fn(); return isObj(r) && r.ok === true ? r : fail(isObj(r) ? r.status : undefined); } catch (e) { return fail('UNAVAILABLE'); } }

async function mapSelection(a, at, R) {
  const reg = await call(() => R.accredited.registry(a, at)); if (!reg.ok) return reg;
  const h = isObj(reg.hotels) && reg.hotels[a.hotel_ref]; const p = isObj(reg.provider_plans) && reg.provider_plans[a.provider_plan_ref]; const r = isObj(reg.rooms) && reg.rooms[a.room_ref];
  if (!isObj(h) || !isObj(p) || !isObj(r)) return fail('NOT_FOUND');                       // sin registro autorizado no hay selección (sinonimia/nombre no basta)
  if (![h.hotel_id, h.source_ref, p.provider_id, p.source_ref, r.product, r.room_type_id, r.map_hotel_id, r.source_ref].every(str)) return fail('NOT_FOUND');
  if (p.hotel_ref !== a.hotel_ref || r.provider_plan_ref !== a.provider_plan_ref) return fail('SHAPE_INVALID');   // el registro se contradice a sí mismo
  const ph = await call(() => R.physical.selectionRows({ hotel_id: h.hotel_id, room_type_id: r.room_type_id }, at)); if (!ph.ok) return ph;
  if (!isObj(ph.hotel) || !isObj(ph.room) || ph.hotel.id !== h.hotel_id || ph.room.id !== r.room_type_id || !str(ph.room.hotel_id)) return fail('NOT_FOUND');
  return { ok: true, data: { hotels: { [a.hotel_ref]: { hotel_id: h.hotel_id } }, provider_plans: { [a.provider_plan_ref]: { hotel_ref: p.hotel_ref, provider_id: p.provider_id } },
    rooms: { [a.room_ref]: { provider_plan_ref: r.provider_plan_ref, product: r.product, room_type_id: r.room_type_id, room_row_hotel_id: ph.room.hotel_id, map_hotel_id: r.map_hotel_id } } } };   // sin elegir «la más barata» ni corregir contradicciones
}

function coherentProfile(room, rules, prof) {   // verificación cruzada: lo físico NUNCA completa ni sustituye lo acreditado
  if (!isObj(prof) || !isObj(prof.age_policy) || !Number.isInteger(prof.age_policy.adult_from_age) || !Array.isArray(prof.age_policy.bands) || !prof.age_policy.bands.length || !isObj(prof.capacity) || !str(prof.source_ref) || !str(prof.version)) return 'UNAVAILABLE';
  const rr = (rules || []).filter((x) => isObj(x) && x.room_id === room.id);
  if (rr.some((x) => x.hotel_id !== room.hotel_id)) return 'SHAPE_INVALID';                       // A04: la regla pertenece a otro hotel
  const k = room.capacity_kids; const c = room.capacity_children; const src = prof.capacity_source;
  if (Number.isInteger(k) && Number.isInteger(c) && k !== c && !CAP_SOURCES.includes(src)) return 'SHAPE_INVALID';   // A03: sin precedencia acreditada no se escoge
  if (src !== undefined) { if (!CAP_SOURCES.includes(src)) return 'SHAPE_INVALID'; const phys = src === 'rooms.capacity_kids' ? k : src === 'rooms.capacity_children' ? c : (rr[0] && rr[0].max_children); if (phys !== prof.capacity.max_children) return 'SHAPE_INVALID'; }
  const top = Math.max(...prof.age_policy.bands.map((b) => (isObj(b) && Number.isInteger(b.to_age) ? b.to_age : -1)));
  if (rr.some((x) => x.child_max_age !== null && x.child_max_age !== undefined && x.child_max_age !== top)) return 'SHAPE_INVALID';
  return null;
}

async function mapRates(a, at, R) {
  const ph = await call(() => R.physical.rateRows({ hotel_id: a.hotel_id, room_type_ids: a.room_type_ids }, at)); if (!ph.ok) return ph;
  if (!Array.isArray(ph.rows)) return fail('SHAPE_INVALID');
  for (const x of ph.rows) if (!isObj(x) || !str(x.id) || !a.room_type_ids.includes(x.room_id) || x.hotel_id !== a.hotel_id || !DATE.test(x.valid_from) || !DATE.test(x.valid_to) || !str(x.currency)) return fail('SHAPE_INVALID');
  const tr = await call(() => R.accredited.rateTerms({ row_ids: ph.rows.map((x) => x.id) }, at)); if (!tr.ok) return tr;
  const pr = await call(() => R.accredited.rowProfile({ room_type_ids: a.room_type_ids }, at)); if (!pr.ok) return pr;
  const ru = await call(() => R.physical.ruleRows({ room_type_ids: a.room_type_ids }, at)); if (!ru.ok) return ru;
  if (!isObj(tr.terms) || !isObj(pr.profiles) || !Array.isArray(ru.rooms) || !Array.isArray(ru.rules)) return fail('SHAPE_INVALID');
  const rows = []; const evidence = {};
  for (const x of ph.rows) {
    const t = tr.terms[x.id]; const prof = pr.profiles[x.room_id]; const room = ru.rooms.find((z) => isObj(z) && z.id === x.room_id);
    if (!isObj(t)) return fail('UNAVAILABLE');                                                  // fila sin términos acreditados: no se puede atribuir proveedor/base/revisión ⇒ el conjunto no es completo
    if (!isObj(room) || room.hotel_id !== a.hotel_id) return fail('SHAPE_INVALID');
    if (!str(t.provider_id) || t.revision === undefined || t.revision === null || !str(t.unit) || !str(t.price_basis) || !isObj(t.occupancy_rates) || !str(t.verification_status) || !str(t.source_ref)
      || typeof t.taxes_included !== 'boolean' || typeof t.placeholder !== 'boolean' || typeof t.is_active !== 'boolean' || !['TO_EXCLUSIVE', 'TO_INCLUSIVE'].includes(t.range_convention)) return fail('UNAVAILABLE');
    const cp = coherentProfile(room, ru.rules, prof); if (cp) return fail(cp);
    const until = t.range_convention === 'TO_EXCLUSIVE' ? x.valid_to : addDay(x.valid_to); if (!until) return fail('SHAPE_INVALID');
    const row = { id: x.id, revision: t.revision, hotel_id: a.hotel_id, provider_id: t.provider_id, room_type_id: x.room_id, stay_from: x.valid_from, stay_until_exclusive: until, currency: x.currency, unit: t.unit, placeholder: t.placeholder, is_active: t.is_active,
      verification_status: t.verification_status, review_evidence_ref: t.review_evidence_ref, source_document_id: t.source_document_id, price_basis: t.price_basis, taxes_included: t.taxes_included, occupancy_rates: t.occupancy_rates,
      age_policy: prof.age_policy, capacity: prof.capacity };
    if (Array.isArray(t.condition_notes)) row.condition_notes = t.condition_notes;
    const proven = t.receipt === 'PROVEN' && str(t.receipt_ref) && typeof t.received_at === 'string';   // rates.created_at NO es received_at; sin recibo acreditado no hay received_at
    if (proven) row.received_at = t.received_at;
    evidence[x.id] = proven ? 'PROVEN' : 'UNK'; rows.push(row);
  }
  return { ok: true, data: { rates: rows, received_at_evidence: evidence, source_document: isObj(tr.source_document) ? tr.source_document : {} } };
}

async function mapProfile(a, at, R) {
  const kp = await call(() => R.accredited.kernelProfile({ hotel_ref: a.hotel_ref }, at)); if (!kp.ok) return kp;
  const ph = await call(() => R.physical.profileRows({ hotel_id: a.hotel_id }, at)); if (!ph.ok) return ph;
  if (!isObj(kp.hotel)) return fail('SHAPE_INVALID'); if (!str(kp.profile_version) || !str(kp.source_ref)) return fail('REVISION_MISSING');   // sin perfil versionado no hay profile_version
  if (!isObj(ph.hotel) || !isObj(ph.profile) || ph.hotel.id !== a.hotel_id || ph.profile.hotel_id !== a.hotel_id || ph.profile.hotel_slug !== ph.hotel.slug) return fail('SHAPE_INVALID');
  return { ok: true, data: { hotel: kp.hotel, profile_version: kp.profile_version } };            // hotel_profiles.politica_deposito NO se consume
}
async function mapPolicy(at, R) {
  const g = await call(() => R.accredited.governedPolicy(at)); if (!g.ok) return g;
  if (!isObj(g.policy) || !str(g.source_ref)) return fail('UNAVAILABLE'); return { ok: true, data: g.policy };
}

function createPhysicalPortAdapter(deps) {
  for (const [g, names] of Object.entries(READERS)) for (const n of names) if (!deps.readers || !deps.readers[g] || typeof deps.readers[g][n] !== 'function') throw new Error('DEPENDENCIA_AUSENTE:' + g + '.' + n);
  const R = deps.readers;
  const mkProducer = (repos, rid, clk) => createProducer({ repos, identity: deps.identity, policy: deps.policy, clock: clk(), newRequestId: () => { if (rid.v === null) rid.v = deps.newRequestId(); return rid.v; }, bridge: deps.bridge, kernel: deps.kernel, assistedChannelAccredited: deps.assistedChannelAccredited === true });
  async function stage(sel) {
    const ports = {}; const pin = await call(() => R.revisions.pin(sel));
    const good = (p) => isObj(p) && REV.test(p.revision) && p.immutable === true && p.retained === true && str(p.source_ref);
    if (!pin.ok || !isObj(pin.ports) || !PORTS4.every((k) => good(pin.ports[k]))) { ports.selection = fail(pin.ok ? 'REVISION_MISSING' : pin.status === 'REVISION_MISSING' ? 'REVISION_MISSING' : pin.status); return { ports, pinned: null, rateArgs: null }; }   // sin revisión inmutable acreditada no hay éxito
    const pinned = Object.fromEntries(PORTS4.map((k) => [k, pin.ports[k].revision]));
    const done = (name, r) => { ports[name] = r.ok ? { ok: true, revision: pinned[name], data: r.data } : r; return r.ok; };
    if (!done('selection', await mapSelection(sel, pinned.selection, R))) return { ports, pinned, rateArgs: null };
    const hotel_id = ports.selection.data.hotels[sel.hotel_ref].hotel_id; const rrow = ports.selection.data.rooms[sel.room_ref];
    const rateArgs = { hotel_id, provider_id: ports.selection.data.provider_plans[sel.provider_plan_ref].provider_id, room_type_ids: [rrow.room_type_id] };
    if (!done('rates', await mapRates(rateArgs, pinned.rates, R))) return { ports, pinned, rateArgs };
    if (!done('profile', await mapProfile({ hotel_ref: sel.hotel_ref, hotel_id }, pinned.profile, R))) return { ports, pinned, rateArgs };
    done('policy', await mapPolicy(pinned.policy, R)); return { ports, pinned, rateArgs };
  }
  const syncRepos = (st, currentRev) => { const g = (n) => () => st.ports[n] || fail('UNAVAILABLE'); return { resolveSelection: g('selection'), getRates: g('rates'), getHotelProfile: g('profile'), getPolicyAndFx: g('policy'), currentRevisions: () => currentRev }; };
  async function produce(input) {
    const rid = { v: null }; let sel = null; const times = []; const clk = () => { let i = 0; return () => { if (i >= times.length) times.push(deps.clock()); return times[i++]; }; };   // cada ejecución repite la misma secuencia de reloj: salida reproducible
    const probe = { resolveSelection(a) { sel = a; throw PROBE; }, getRates() { throw PROBE; }, getHotelProfile() { throw PROBE; }, getPolicyAndFx() { throw PROBE; }, currentRevisions() { throw PROBE; } };
    const first = mkProducer(probe, rid, clk).produce(input);
    if (!sel) return first;                                                  // denegado / solicitud inválida: se devuelve tal cual, SIN ninguna lectura (la autorización precede a toda lectura)
    const st = await stage(sel);
    if (!st.pinned || !st.rateArgs || PORTS4.some((k) => !st.ports[k] || st.ports[k].ok !== true)) return mkProducer(syncRepos(st, st.pinned || {}), rid, clk).produce(input);   // fallo de puerto: el productor lo traduce por su catálogo cerrado
    const now = await call(() => R.revisions.current(Object.assign({}, sel, st.rateArgs)));   // ÚLTIMA espera asíncrona antes de liberar
    const cur = now.ok && isObj(now.revisions) ? now.revisions : null;
    const same = !!cur && PORTS4.every((k) => typeof cur[k] === 'string' && cur[k] === st.pinned[k]);
    if (same) {                                                             // PA-R1: la coincidencia de revisión NO conserva la vigencia temporal
      let fresh = null; try { fresh = deps.clock(); } catch (e) { fresh = null; }   // hora FRESCA, tomada tras la última espera y antes de evaluar/liberar (no la hora cacheada); sin hora acreditada ⇒ null ⇒ el kernel responde NOW_INVALID
      const clkGate = () => { let i = 0; return () => (i++ === 0 ? times[0] : fresh); };   // 1.ª hora = la original (computed_at/valid_until/snapshot se conservan; NO se rejuvenece); 2.ª = hora fresca como «ahora» del kernel
      const out = mkProducer(syncRepos(st, st.pinned), rid, clkGate).produce(input);
      if (out && out.internal !== undefined && out.public && Array.isArray(out.public.reasons) && out.public.reasons.some((r) => TIME_CODES.includes(r))) { const { internal, ...rest } = out; return rest; }   // vigencia/hora no acreditadas: tampoco proyección interna sobre una referencia vencida
      return out;   // evaluación PURA síncrona sin esperas posteriores: vencimiento, hora inválida o retroceso los decide el kernel congelado con sus códigos existentes; el productor no libera proyección interna ni total si no es LISTO
    }
    const blocked = Object.fromEntries(PORTS4.map((k) => [k, cur && typeof cur[k] === 'string' ? cur[k] : null]));   // relectura fallida o distinta ⇒ no se acredita; el provisional se DESCARTA
    return mkProducer(syncRepos(st, blocked), rid, clk).produce(input);
  }
  return Object.freeze({ produce, version: ADAPTER_VERSION });
}
const PORTS4 = ['selection', 'rates', 'profile', 'policy'];
module.exports = { createPhysicalPortAdapter, ADAPTER_VERSION };
