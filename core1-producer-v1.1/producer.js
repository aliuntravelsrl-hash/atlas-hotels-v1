'use strict';
// Productor servidor de cotización — candidato INERTE. Flujo: identidad/política → solicitud exacta → lecturas con revisión → estado → puente Core 1 → snapshot v2 → kernel v2.0.3 → comprobación de no deriva → respuesta por lista positiva.
// Dependencias inyectadas: repos (solo lectura), identity, policy, clock, newRequestId, bridge, kernel. Sin red, SQL, RPC de negocio, pagos, reservas ni webhooks.
const { PRODUCER_VERSION, LABEL, CONTRACT, CONTEXT_SCHEMA, CLIENT_FIELDS, ROOM_FIELDS, VIEWS } = require('./constants');
const { checked, SHAPES, sameRevisions } = require('./ports');
const { digest, requestCanonical } = require('../kernel-v2.0.3/canonical');
const CAT = require('../kernel-v2.0.3/catalog');
const { publicCode, reasonCode, proposal: safeProposal, bridgeCode } = require('./publicCodes');
const SNAPSHOT_VERSION = 'EVAL-SNAPSHOT-v2';
const MSG = Object.freeze({ LISTO: 'Referencia sujeta a confirmación. No es una reserva ni un cobro.', CONSULTAR: 'Consulte: no hay una referencia lista para esta selección.', RECHAZADO: 'La evaluación no pudo acreditarse; consulte.', DENEGADO: 'Acceso no autorizado.', SOLICITUD_INVALIDA: 'Solicitud no válida.' });
const isObj = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
const INTERNAL_ACTORS = Object.freeze(['OPERATOR', 'AI_SELLER']);
const GRANTS = Object.freeze({ reserve: false, collect: false, confirm: false });
const VERSIONS = Object.freeze({ producer: PRODUCER_VERSION, core1: 'core1_price_pure_v2_2_3', adapter: CONTRACT, snapshot: SNAPSHOT_VERSION });

function createProducer(deps) {
  const { repos, identity, policy, clock, newRequestId, bridge, kernel } = deps;
  for (const [k, v] of Object.entries({ repos, identity, policy, clock, newRequestId, bridge, kernel })) if (!v) throw new Error('DEPENDENCIA_AUSENTE:' + k);

  const publicBase = (ids, status, extra) => Object.assign({ producer_version: PRODUCER_VERSION, label: LABEL, request_id: ids.request_id, correlation_id: ids.correlation_id, status, message_es: MSG[status] || MSG.CONSULTAR, reasons: [], enablement: { grants: GRANTS }, versions: VERSIONS }, extra || {});
  const fail = (ids, status, code, boundary) => ({ ok: false, public: publicBase(ids, status, { reasons: [publicCode(boundary, code)] }) });   // P-R1: el código sale de un catálogo cerrado por frontera

  function validateEnvelope(raw) {
    if (!isObj(raw)) return 'REQUEST_INVALID';
    for (const k of Object.keys(raw)) if (!CLIENT_FIELDS.includes(k)) return 'FORBIDDEN_FIELD';           // actor/rol/slug/precio/received_at/flags del cliente: nunca autoridad
    if (Array.isArray(raw.rooms)) for (const r of raw.rooms) if (isObj(r)) for (const k of Object.keys(r)) if (!ROOM_FIELDS.includes(k)) return 'FORBIDDEN_FIELD';
    if (raw.contract_version !== CONTRACT) return 'CONTRACT_VERSION_UNSUPPORTED';
    if (typeof raw.request_id !== 'string' || !raw.request_id || raw.request_id.length > 80) return 'REQUEST_INVALID';
    return null;
  }

  function produce(input) {
    const ids = { request_id: null, correlation_id: null };
    try {
      const want = input && input.view; const raw = input && input.request;
      if (!VIEWS.includes(want)) return fail(ids, 'SOLICITUD_INVALIDA', 'VIEW_UNKNOWN', 'request');
      const principal = identity.verify(input.credential);                                   // identidad comprobada en servidor; null = anónimo
      const auth0 = policy.authorize(principal, want); const auth = auth0 && auth0.allowed === true && (auth0.actor === null || INTERNAL_ACTORS.includes(auth0.actor)) ? auth0 : { allowed: false, code: auth0 && auth0.code };
      if (!auth.allowed) return fail(ids, 'DENEGADO', auth.code, 'auth');                            // sin lecturas ni puente si no hay permiso
      const bad = validateEnvelope(raw); if (bad) return fail(ids, 'SOLICITUD_INVALIDA', bad, 'request');
      ids.correlation_id = String(raw.request_id).replace(/[^A-Za-z0-9._:-]/g, '_');          // el id del cliente es solo correlación
      ids.request_id = newRequestId();                                                      // identidad de la evaluación: la asigna el servidor
      const rq = JSON.parse(JSON.stringify(raw)); rq.request_id = ids.request_id;
      const room = Array.isArray(rq.rooms) && rq.rooms.length === 1 && isObj(rq.rooms[0]) ? rq.rooms[0] : null;
      if (!room) return fail(ids, 'SOLICITUD_INVALIDA', Array.isArray(rq.rooms) && rq.rooms.length > 1 ? 'MULTIROOM_NOT_SUPPORTED' : 'ROOM_NOT_SELECTED', 'request');
      const nowIso = clock();
      // ---- lecturas con revisión
      const selArgs = { hotel_ref: rq.hotel_ref, provider_plan_ref: rq.provider_plan_ref, room_ref: room.room_ref };
      const sel = checked('selection', repos.resolveSelection(selArgs), SHAPES.selection); if (!sel.ok) return fail(ids, 'CONSULTAR', 'CONTEXT_' + sel.status, 'port');
      const hotelRow = sel.data.hotels[rq.hotel_ref]; const plan = sel.data.provider_plans[rq.provider_plan_ref]; const rrow = sel.data.rooms[room.room_ref];
      if (!hotelRow || !plan || !rrow) return fail(ids, 'RECHAZADO', 'SELECTION_INVALID', 'request');
      const rateArgs = { hotel_id: hotelRow.hotel_id, provider_id: plan.provider_id, room_type_ids: [rrow.room_type_id] };
      const rates = checked('rates', repos.getRates(rateArgs), SHAPES.rates); if (!rates.ok) return fail(ids, 'CONSULTAR', 'CONTEXT_' + rates.status, 'port');
      const prof = checked('profile', repos.getHotelProfile({ hotel_ref: rq.hotel_ref }), SHAPES.profile); if (!prof.ok) return fail(ids, 'CONSULTAR', 'CONTEXT_' + prof.status, 'port');
      const pol = checked('policy', repos.getPolicyAndFx(), SHAPES.policy); if (!pol.ok) return fail(ids, 'CONSULTAR', 'CONTEXT_' + pol.status, 'port');
      const used = { selection: sel.revision, rates: rates.revision, profile: prof.revision, policy: pol.revision };
      // ---- estado para el motor congelado (todo viene de los puertos; nada del cliente salvo la selección permitida)
      const state = { now: nowIso, hotels: { [rq.hotel_ref]: hotelRow }, provider_plans: { [rq.provider_plan_ref]: plan }, rooms: { [room.room_ref]: rrow }, rates: rates.data.rates,
        fx_approvals: pol.data.fx_approvals, fx_governed: pol.data.fx_governed, source_document: rates.data.source_document, context_schema: CONTEXT_SCHEMA,
        policy: { deposit_policy: pol.data.deposit_policy, accepted_payment_currencies: pol.data.accepted_payment_currencies, quote_ttl_minutes: pol.data.quote_ttl_minutes, review_notice_days: pol.data.review_notice_days },
        capabilities: { assisted_channel_accredited: deps.assistedChannelAccredited === true } };
      const q = bridge.quote(rq, state); if (!q || q.ok !== true) return fail(ids, 'CONSULTAR', bridgeCode(q && q.code), 'bridge');
      // P-R3: filas REALMENTE usadas = traceability del propio motor (contrato existente), cotejada con las filas leídas; otras temporadas/inactivas/futuras/reemplazadas no participan.
      // received_at: rates.created_at NO equivale a received_at; una fila USADA sin evidencia PROVEN impide LISTO.
      const eligible = rates.data.rates.filter((x) => x.hotel_id === rateArgs.hotel_id && x.provider_id === rateArgs.provider_id && x.room_type_id === rrow.room_type_id);
      const used_rows = usedRows(q, eligible);
      const unproven = used_rows.rows.some((x) => typeof x.received_at !== 'string' || rates.data.received_at_evidence[x.id] !== 'PROVEN');
      const quote = { public_dto: q.public_dto, internal_view: q.internal_view, context_evidence: buildEvidence(rq, state, q, pol.data, used_rows.profileRows, prof.data) };
      const result = kernel.evaluate(prof.data.hotel, rq, quote, { now: clock(), fx_authorities: pol.data.fx_authorities, actor: auth.actor || undefined });
      if (typeof deps.observe === 'function') deps.observe({ request: rq, quote, result }); // solo pruebas; en producción no se inyecta
      // ---- no deriva: las revisiones usadas deben seguir vigentes tras evaluar
      const now_revs = repos.currentRevisions(Object.assign({}, selArgs, rateArgs));
      const drift = !sameRevisions(used, now_revs);
      let verdict = result.B.verdict; const reasons = result.B.reasons.slice();
      if (drift) { verdict = 'CONSULTAR'; reasons.unshift('READ_DRIFT_DETECTED'); }
      if (used_rows.verified && quote.public_dto.status === 'PRICE_REFERENCE' && !quote.context_evidence.evaluation_snapshot) reasons.unshift('USED_PROFILE_UNRESOLVED'); // filas usadas con perfiles que discrepan o incompletos
      if (!used_rows.verified) { if (verdict === 'LISTO') verdict = 'CONSULTAR'; reasons.unshift('USED_ROWS_UNVERIFIED'); }
      if (unproven) { if (verdict === 'LISTO') verdict = 'CONSULTAR'; reasons.unshift('RECEIVED_AT_UNPROVEN'); }
      if (!quote.context_evidence.evaluation_snapshot && verdict === 'LISTO') verdict = 'CONSULTAR';
      const ready = verdict === 'LISTO' && !drift && !unproven && used_rows.verified;
      const pub = publicBase(ids, verdict, { reasons: reasons.map(reasonCode), enablement: { proposal: ready ? safeProposal(result.C.proposal) : 'NO_PREPARADA', grants: GRANTS } });
      if (ready) { const dto = q.public_dto; pub.reference_total = { amount: String(result.B.reference_total.amount), currency: String(result.B.reference_total.currency) }; pub.computed_at = dto.computed_at; pub.valid_until = dto.valid_until;
        pub.conditions = dto.conditions.map((c) => ({ code: c.code, message_es: CAT.CONDITIONS[c.code] })).filter((c) => typeof c.message_es === 'string'); }
      const out = { ok: true, public: pub };
      if (want === 'INTERNAL' && auth.actor && result.internal && !drift) out.internal = internalProjection(result.internal);
      return out;
    } catch (e) { return fail(ids, 'CONSULTAR', 'PRODUCER_INTERNAL_ERROR', 'producer'); }   // un fallo nunca se convierte en referencia lista; el detalle no se devuelve
  }
  return Object.freeze({ produce });
}

// Proyección interna PROPIA: catálogos cerrados; lo desconocido se reporta como UNRECOGNIZED, nunca se copia texto externo. Sin traceability, tarifas reemplazadas ni precio final.
const INT_CAT = Object.freeze({ calc: ['COMPLETE', 'SOURCE_SUBTOTAL_ONLY'], prov: ['ACCREDITED', 'NOT_ACCREDITED_CLIENT_FINAL', 'NOT_ACCREDITED_MIXED', 'NOT_ACCREDITED_UNKNOWN', 'NOT_ACCREDITED_NOT_EVALUATED'],
  alert: ['CONSULT_PROVIDER_ABOUT_CONDITION', 'RECEIVED_AT_IN_FUTURE_ROW_IGNORED'], cstatus: ['VENCIDA', 'VIGENTE', 'POR_VENCER'], basis: ['CLIENT_FINAL', 'NET_PROVIDER'], ccy: ['USD', 'DOP'] });
const pick = (v, list) => (list.includes(v) ? v : 'UNRECOGNIZED');
const money = (m) => (isObj(m) && typeof m.amount === 'string' && /^\d+\.\d{2}$/.test(m.amount) && INT_CAT.ccy.includes(m.currency) ? { amount: m.amount, currency: m.currency, basis: INT_CAT.basis.includes(m.basis) ? m.basis : 'UNRECOGNIZED' } : null);
function internalProjection(i) {
  return { authz_basis: 'SIMULATED_POLICY', authz_accredited: false, calculation_status: pick(i.calculation_status, INT_CAT.calc), provider_amount_status: pick(i.provider_amount_status, INT_CAT.prov),
    source_subtotal: money(i.source_subtotal), provider_amount: money(i.provider_amount),
    operator_alerts: (Array.isArray(i.operator_alerts) ? i.operator_alerts : []).slice(0, 20).map((a) => ({ code: pick(a && a.code, INT_CAT.alert), status: a && a.status !== undefined ? pick(a.status, INT_CAT.cstatus) : undefined })) };
}
function usedRows(q, eligible) {
  if (!q.public_dto || q.public_dto.status !== 'PRICE_REFERENCE') return { rows: [], profileRows: eligible, verified: true };   // sin precio no hay filas usadas que acreditar (el perfil informativo conserva paridad con el generador candidato)
  const tr = q.internal_view && Array.isArray(q.internal_view.traceability) ? q.internal_view.traceability : null;
  if (!tr || !tr.length) return { rows: [], profileRows: [], verified: false };                                        // evidencia de uso insuficiente: no se adivina
  const rows = [];
  for (const t of tr) { const r = isObj(t) ? eligible.find((x) => x.id === t.row_id && x.revision === t.revision) : null; if (!r) return { rows: [], profileRows: [], verified: false }; if (!rows.includes(r)) rows.push(r); }
  return { rows, profileRows: rows, verified: true };
}
function buildEvidence(rq, state, q, pol, eligible, profData) {
  const dep = state.policy.deposit_policy; const view = q.internal_view; const dto = q.public_dto; const pay = rq.payment_currency;
  const srcCcy = view && view.source_subtotal && view.source_subtotal.currency;
  const usesFx = !!(srcCcy && srcCcy !== pay) || (dep.type !== 'FULL_PAYMENT' && isObj(dep.minimum_per_room) && dep.minimum_per_room.currency !== pay);   // FX solo cuando se usa
  let fx = null;
  if (usesFx) { const nowMs = Date.parse(state.now); const a = state.fx_approvals.find((x) => x.active && Date.parse(x.effective_from) <= nowMs && nowMs < Date.parse(x.effective_until_exclusive));
    const g = a && state.fx_governed[a.exchange_rate_ref];
    if (a && g && g.version === a.source_version && g.rate_sell === a.rate_observed) fx = { quote_request_id: rq.request_id, pair: a.pair, direction: g.direction, rate_ref: a.exchange_rate_ref, version: g.version, approved_by_ref: a.approved_by_ref, source_ref: a.source_ref, effective_from: a.effective_from, effective_until_exclusive: a.effective_until_exclusive}; }
  const ev = { deposit_policy: JSON.parse(JSON.stringify(dep)), quote_request_id: rq.request_id, fx };
  const prof = profileOf(rq, eligible, profData.profile_version);
  if (prof) { ev.evaluation_snapshot = { snapshot_version: SNAPSHOT_VERSION, request_id: rq.request_id, request_digest: digest(requestCanonical(rq)), dto_digest: digest(dto), dto_fingerprint: dto.fingerprint === undefined ? null : dto.fingerprint,
    internal_view_digest: digest(view === undefined ? null : view), deposit_policy_digest: digest(ev.deposit_policy), fx_digest: fx ? digest(fx) : null, profile: prof, profile_digest: digest(prof) }; }
  return ev;
}
function profileOf(rq, eligible, version) {
  if (!eligible.length) return null; const room = rq.rooms[0];
  const shape = (r) => ({ ap: r.age_policy, cap: r.capacity });
  if (eligible.some((r) => digest(shape(r)) !== digest(shape(eligible[0])))) return null;   // perfil ambiguo entre filas elegibles: no se afirma uno
  const r = eligible[0]; if (!isObj(r.age_policy) || !Array.isArray(r.age_policy.bands) || !isObj(r.capacity)) return null;
  return { hotel_ref: rq.hotel_ref, provider_plan_ref: rq.provider_plan_ref, room_ref: room.room_ref, profile_version: version, adult_from_age: r.age_policy.adult_from_age,
    bands: r.age_policy.bands.map((b) => ({ from: b.from_age, to: b.to_age, mode: b.price.mode, value: b.price.value === undefined ? null : b.price.value })),
    capacity: { adults_max: r.capacity.max_adults, children_max: r.capacity.max_children, total_max: r.capacity.max_total } };
}
module.exports = { createProducer, SNAPSHOT_VERSION };
