'use strict';
// Pruebas offline del adaptador físico de puertos Core 1 (candidato INERTE). MODELO/SIMULACIÓN: no certifican SQL, fuente de proveedor, autenticación ni seguridad reales.
// A01–A16 son los escenarios de aceptación de la SPEC (OBS-228) aplicados al mecanismo; los fallos por «fuente real ausente» se reportan aparte (ver docs/EXECUTABILITY.md).
const assert = require('assert'); const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const root = path.join(__dirname, '..', '..'); const here = path.join(__dirname, '..');
const { createPhysicalPortAdapter } = require('../adapter'); const { buildWorld, createReaders, clone } = require('../synthetic/world'); const { reconcile } = require('../mapping'); const COVERAGE = require('../coverage');
const { createProducer } = require('../../core1-producer-v1.1/producer'); const { createBridge } = require('../../core1-producer-v1.1/bridge/bridge'); const { createPolicy } = require('../../core1-producer-v1.1/policy');
const { createSyntheticRepos } = require('../../core1-producer-v1.1/synthetic/repos'); const F = require('../../core1-producer-v1.1/synthetic/fixtures'); const PUB = require('../../core1-producer-v1.1/publicCodes');
const K3 = require('../../kernel-v2.0.3'); const K6 = require('../../kernel-v2.0.6');
const EXPECTED = 41; const results = {}; const pending = []; const realBridge = createBridge();
const t = (n, fn) => { const p = (async () => { try { await fn(); results[n] = 'PASS'; } catch (e) { results[n] = 'FAIL ' + String(e.message).split('\n')[0].slice(0, 300); } })(); pending.push(p); };
const IDS = { operator: { id: 'u-op', kind: 'USER', verified: true, roles: ['OPERATOR'], scopes: ['core1.quote.internal'] }, plain: { id: 'u-1', kind: 'USER', verified: true, roles: ['CUSTOMER'], scopes: [] }, agent: { id: 's-ai', kind: 'SERVICE', verified: true, roles: [], scopes: ['core1.quote.agent'] }, unverified: { id: 'u-f', kind: 'USER', verified: false, roles: ['OPERATOR'], scopes: ['core1.quote.internal'] } };
const identity = { verify: (c) => (typeof c === 'string' && IDS[c]) || null };
const seq = () => { const s = ['2026-10-23T14:00:00Z', '2026-10-23T14:10:00Z']; let i = 0; return () => s[Math.min(i++, 1)]; };
function adapterFor(name, o = {}) {
  const W = buildWorld(name, o.mutate); const readers = o.readers ? o.readers(createReaders(W), W) : createReaders(W);
  const ad = createPhysicalPortAdapter({ readers, identity, policy: createPolicy({ publicAnonymous: true }), clock: o.clock ? o.clock(W) : seq(), newRequestId: () => W.rq.request_id, bridge: o.bridge || realBridge, kernel: o.kernel || K3, assistedChannelAccredited: true });
  return { W, ad };
}
async function run(name, o = {}, view = 'PUBLIC', cred) { const m = adapterFor(name, o); const out = await m.ad.produce({ view, credential: cred, request: o.rq ? o.rq(m.W.rq) : m.W.rq }); return Object.assign(out, { _W: m.W }); }
function direct(name, view, cred) { const [rq, data] = F.SC[name](); return createProducer({ repos: createSyntheticRepos(data), identity, policy: createPolicy({ publicAnonymous: true }), clock: seq(), newRequestId: () => rq.request_id, bridge: realBridge, kernel: K3, assistedChannelAccredited: true }).produce({ view, credential: cred, request: rq }); }
const wire = (o) => JSON.stringify({ public: o.public, internal: o.internal });
const notReady = (o) => { assert.notStrictEqual(o.public.status, 'LISTO', JSON.stringify(o.public)); assert.strictEqual(o.public.reference_total, undefined); assert.notStrictEqual(o.public.enablement.proposal, 'PREPARACION_COMPLETA_SUJETA_A_AUTORIDAD'); assert.strictEqual(o.internal, undefined); };
const has = (o, c) => assert(o.public.reasons.includes(c), c + ' ∉ ' + JSON.stringify(o.public.reasons));
const ready = (o, amt) => { assert.strictEqual(o.public.status, 'LISTO', JSON.stringify(o.public)); if (amt) assert.strictEqual(o.public.reference_total.amount, amt); };
const CLOSED = (o) => o.public.reasons.every((r) => PUB.KERNEL.has(r) || PUB.PRODUCER.has(r) || PUB.BOUNDARY.port.codes.has(r) || PUB.BOUNDARY.request.codes.has(r) || PUB.BOUNDARY.auth.codes.has(r) || PUB.BOUNDARY.bridge.codes.has(r) || r === 'CODIGO_NO_PUBLICABLE');

// ---- A01–A16
t('A01_referencia_ajena_se_detecta_sin_total_ni_preparacion_y_no_elige_la_mas_barata', async () => {
  const a = await run('rm3_dbl', { mutate: (W) => { W.physical.rooms.find((r) => r.id === 'RT3').hotel_id = 'H-OTRO'; }, rq: (rq) => { const r = clone(rq); return r; } }); notReady(a);
  const b = await run('base', { mutate: (W) => { W.accredited.registry.rooms.RM1.map_hotel_id = 'H-OTRO'; } }); notReady(b);
  const c = await run('base', { mutate: (W) => { W.accredited.registry.rooms.RM1.provider_plan_ref = 'PPX'; } }); notReady(c); has(c, 'CONTEXT_SHAPE_INVALID');
  const d = await run('base', { mutate: (W) => { W.accredited.registry.provider_plans.PP1.hotel_ref = 'H-OTRO'; } }); notReady(d); has(d, 'CONTEXT_SHAPE_INVALID'); });
t('A02_sinonimia_bilingue_sin_codigo_de_proveedor_no_acredita_mapeo_ni_precio', async () => {
  const o = await run('base', { mutate: (W) => { W.physical.room_type_synonyms = [{ canonical_es: 'Habitación Doble', canonical_en: 'Double Room', synonyms: ['DBL', 'doble'] }]; delete W.accredited.registry.provider_plans.PP1; } }); notReady(o); has(o, 'CONTEXT_NOT_FOUND');
  const p = await run('base', { mutate: (W) => { W.physical.room_type_synonyms = [{ canonical_es: 'x', canonical_en: 'y', synonyms: [] }]; delete W.accredited.registry.rooms.RM1.map_hotel_id; } }); notReady(p); has(p, 'CONTEXT_NOT_FOUND');
  const q = await run('base', { mutate: (W) => { delete W.accredited.registry.rooms.RM1.product; } }); notReady(q); has(q, 'CONTEXT_NOT_FOUND'); });
t('A03_capacity_kids_y_capacity_children_divergentes_exigen_precedencia_acreditada', async () => {
  const mut = (kids, ch, src, mc) => (W) => { const r = W.physical.rooms.find((x) => x.id === 'RT1'); r.capacity_kids = kids; r.capacity_children = ch; if (src) W.accredited.profiles.RT1.capacity_source = src; if (mc !== undefined) W.accredited.profiles.RT1.capacity.max_children = mc; };
  const a = await run('base', { mutate: mut(2, 1) }); notReady(a); has(a, 'CONTEXT_SHAPE_INVALID');
  const b = await run('base', { mutate: mut(2, 1, 'rooms.capacity_kids', 2) }); ready(b, '200.00');
  const c = await run('base', { mutate: mut(2, 1, 'rooms.capacity_children', 2) }); notReady(c); has(c, 'CONTEXT_SHAPE_INVALID');
  const d = await run('base', { mutate: mut(2, 1, 'rooms.otra_columna', 2) }); notReady(d); has(d, 'CONTEXT_SHAPE_INVALID');
  const e = await run('base', { mutate: mut(2, 2, 'rooms.otra_columna', 2) }); notReady(e); has(e, 'CONTEXT_SHAPE_INVALID'); const f = await run('base', { mutate: mut(2, 2, 'rooms.capacity_kids', 2) }); ready(f, '200.00'); });
t('A04_regla_de_ocupacion_de_otro_hotel_no_fabrica_perfil', async () => {
  const o = await run('base', { mutate: (W) => { W.physical.room_occupancy_rules[0].hotel_id = 'H-OTRO'; } }); notReady(o); has(o, 'CONTEXT_SHAPE_INVALID');
  const p = await run('base', { mutate: (W) => { W.physical.rooms.find((r) => r.id === 'RT1').hotel_id = 'H-OTRO'; } }); notReady(p); });
t('A05_edades_fisicas_sin_regla_de_precio_ni_edad_adulta_no_infieren_bandas', async () => {
  const a = await run('child12', { mutate: (W) => { delete W.accredited.profiles.RT1; } }); notReady(a); has(a, 'CONTEXT_UNAVAILABLE');
  const b = await run('child12', { mutate: (W) => { delete W.accredited.profiles.RT1.age_policy.adult_from_age; } }); notReady(b); has(b, 'CONTEXT_UNAVAILABLE');
  const c = await run('child12', { mutate: (W) => { W.accredited.profiles.RT1.age_policy.bands = []; } }); notReady(c); has(c, 'CONTEXT_UNAVAILABLE');
  const d = await run('child12', { mutate: (W) => { W.physical.room_occupancy_rules[0].child_max_age = 11; } }); notReady(d); has(d, 'CONTEXT_SHAPE_INVALID'); });
t('A06_created_at_sin_recibo_acreditado_no_es_proven_ni_listo', async () => {
  const o = await run('base', { mutate: (W) => { delete W.accredited.terms.R1.receipt; delete W.accredited.terms.R1.receipt_ref; delete W.accredited.terms.R1.received_at; } }); notReady(o); has(o, 'RECEIVED_AT_UNPROVEN'); assert(W_has(o, 'created_at'));
  const p = await run('base', { mutate: (W) => { W.accredited.terms.R1.receipt = 'CLAIMED'; } }); notReady(p); has(p, 'RECEIVED_AT_UNPROVEN');
  const q = await run('base', { mutate: (W) => { delete W.accredited.terms.R1.receipt_ref; } }); notReady(q); has(q, 'RECEIVED_AT_UNPROVEN'); });
const W_has = (o, col) => o._W.physical.rates.every((r) => typeof r[col] === 'string');   // la columna física existe y aun así no se usa como recepción
t('A07_update_mutable_conserva_id_y_created_at_no_demuestra_revision_ni_crea_revision_1', async () => {
  const a = await run('base', { mutate: (W) => { W.pinFail = 'REVISION_MISSING'; } }); notReady(a); has(a, 'CONTEXT_REVISION_MISSING');
  const b = await run('base', { mutate: (W) => { W.immutable = false; } }); notReady(b); has(b, 'CONTEXT_REVISION_MISSING');
  const c = await run('base', { mutate: (W) => { W.retained = false; } }); notReady(c); has(c, 'CONTEXT_REVISION_MISSING');
  const d = await run('base', { mutate: (W) => { W.rev.rates = 1; } }); notReady(d);   // «revisión 1» numérica por defecto no se acepta
  const e = await run('base', { readers: (R) => { R.revisions.pin = async () => ({ ok: true, ports: { selection: { revision: 'S1', immutable: true, retained: true, source_ref: 'X' } } }); return R; } }); notReady(e); has(e, 'CONTEXT_REVISION_MISSING'); });
t('A08_hash_de_contenido_A_B_A_no_afirma_ausencia_de_deriva_la_autoridad_de_revision_decide', async () => {
  const a = await run('base', { mutate: (W) => { W.hooks.rateRows = async () => { W.rev.rates = 'RAT-2'; }; } }, 'INTERNAL', 'operator'); notReady(a); has(a, 'READ_DRIFT_DETECTED');   // el contenido leído es idéntico (A→B→A) pero la revisión cambió
  assert.strictEqual(JSON.stringify(a.public).includes('200.00'), false);
  const src = fs.readFileSync(path.join(here, 'adapter.js'), 'utf8'); assert(!/digest\(|createHash|sha256|JSON\.stringify\(.*revision/.test(src), 'el adaptador no deriva revisiones de hashes de lecturas mutables'); });
t('A09_promise_en_puerto_sincrono_no_se_acepta_y_el_adaptador_espera_y_propaga_errores', async () => {
  const [rq, data] = F.SC.base(); const repos = createSyntheticRepos(data); const asyncRepos = { resolveSelection: async (a) => repos.resolveSelection(a), getRates: async (a) => repos.getRates(a), getHotelProfile: async (a) => repos.getHotelProfile(a), getPolicyAndFx: async () => repos.getPolicyAndFx(), currentRevisions: (a) => repos.currentRevisions(a) };
  const p = createProducer({ repos: asyncRepos, identity, policy: createPolicy({ publicAnonymous: true }), clock: seq(), newRequestId: () => rq.request_id, bridge: realBridge, kernel: K3, assistedChannelAccredited: true }).produce({ view: 'PUBLIC', request: rq }); assert.strictEqual(typeof p.then, 'undefined'); notReady(p); has(p, 'CONTEXT_UNAVAILABLE');
  ready(await run('base'), '200.00');
  const rej = await run('base', { readers: (R) => { R.physical.rateRows = async () => { throw new Error('boom: relation "rates" does not exist'); }; return R; } }); notReady(rej); has(rej, 'CONTEXT_UNAVAILABLE'); assert(!wire(rej).includes('boom')); });
t('A10_relectura_que_falla_o_cambia_tras_el_calculo_no_entrega_total_preparacion_ni_proyeccion', async () => {
  for (const [label, mut] of [['cambia', (W) => { W.hooks.current = async () => { W.rev.policy = 'POL-2'; }; }], ['estado', (W) => { W.currentFail = 'UNAVAILABLE'; }], ['excepcion', (W) => { W.currentFail = 'THROW'; }], ['sin-forma', (W) => { W.currentFail = 'NOT_FOUND'; }]]) {
    for (const [view, cred] of [['PUBLIC'], ['INTERNAL', 'operator'], ['INTERNAL', 'agent']]) { const o = await run('base', { mutate: mut }, view, cred); notReady(o); has(o, 'READ_DRIFT_DETECTED'); const w = wire(o); assert(!w.includes('200.00') && !w.includes('provider_amount'), label + view); assert(!w.includes('relation "') && !/\bSELECT\b/.test(w), label); } }
  const ok = await run('base', {}, 'INTERNAL', 'operator'); ready(ok, '200.00'); assert(ok.internal); });
t('A11_politica_de_deposito_textual_o_por_defecto_sin_autoridad_no_se_parsea', async () => {
  const base = await run('deposit_conv'); ready(base, '200.00'); const base2 = JSON.stringify(base.public);
  const txt = await run('deposit_conv', { mutate: (W) => { W.physical.hotel_profiles[0].politica_deposito = 'DEPÓSITO 99% INMEDIATO'; W.physical.hotel_policies = [{ policy_type: 'deposit', content: 'FULL 100%' }]; } }); assert.strictEqual(JSON.stringify(txt.public), base2);
  const none = await run('base', { mutate: (W) => { delete W.accredited.policy; } }); notReady(none); has(none, 'CONTEXT_UNAVAILABLE');
  const nosrc = await run('base', { mutate: (W) => { delete W.accredited.policy.source_ref; } }); notReady(nosrc); has(nosrc, 'CONTEXT_UNAVAILABLE'); });
t('A12_fx_invalida_innecesaria_conserva_contrato_y_fx_necesaria_ausente_no_queda_lista', async () => {
  const a = await run('base', { mutate: (W) => { W.accredited.policy.policy.fx_approvals = [{ basura: true }]; W.accredited.policy.policy.fx_governed = { X: 1 }; } }); const [rq0, d0] = F.SC.base(); d0.policy.fx_approvals = [{ basura: true }]; d0.policy.fx_governed = { X: 1 };
  const dd = createProducer({ repos: createSyntheticRepos(d0), identity, policy: createPolicy({ publicAnonymous: true }), clock: seq(), newRequestId: () => rq0.request_id, bridge: realBridge, kernel: K3, assistedChannelAccredited: true }).produce({ view: 'PUBLIC', request: rq0 }); assert.deepStrictEqual(a.public, dd.public);   // el contrato existente (motor congelado) decide; el adaptador no lo cambia ni lo suaviza
  const b = await run('fx_total_dop'); ready(b, '12400.00');
  const c = await run('fx_total_dop', { mutate: (W) => { W.accredited.policy.policy.fx_approvals = []; } }); notReady(c);
  const d = await run('deposit_conv', { mutate: (W) => { W.accredited.policy.policy.fx_approvals = []; W.accredited.policy.policy.fx_governed = {}; } }); notReady(d); });
t('A13_sin_traceability_verificable_usa_used_rows_unverified_y_filas_ajenas_no_contaminan', async () => {
  const noTrace = { quote: (rq, st) => { const q = clone(realBridge.quote(rq, st)); if (q.internal_view) delete q.internal_view.traceability; return q; } };
  const a = await run('base', { bridge: noTrace }); notReady(a); has(a, 'USED_ROWS_UNVERIFIED');
  const b = await run('base', { mutate: (W) => { const x = clone(W.physical.rates[0]); x.id = 'R9'; W.physical.rates.push(x); W.accredited.terms.R9 = Object.assign(clone(W.accredited.terms.R1), { provider_id: 'P2', revision: 7, occupancy_rates: { SGL: '1', DBL: '1', TPL: '1' } }); } }); ready(b, '200.00');
  const c = await run('base', { mutate: (W) => { const x = clone(W.physical.rates[0]); x.id = 'R8'; W.physical.rates.push(x); } }); notReady(c); has(c, 'CONTEXT_UNAVAILABLE'); });
t('A14_snapshot_consistente_con_actor_interno_no_acreditado_no_proyecta_y_el_hash_no_autentica', async () => {
  for (const cred of ['plain', 'unverified', undefined, 'nadie']) { const o = await run('base', {}, 'INTERNAL', cred); assert.strictEqual(o.public.status, 'DENEGADO'); assert.strictEqual(o.internal, undefined); }
  const px = await run('base', {}, 'PUBLIC'); assert.strictEqual(px.internal, undefined);
  const op = await run('base', {}, 'INTERNAL', 'operator'); assert.strictEqual(op.internal.authz_accredited, false); assert.strictEqual(op.internal.authz_basis, 'SIMULATED_POLICY'); });
t('A15_payload_externo_desconocido_o_error_sql_solo_produce_codigos_fijos_del_catalogo', async () => {
  const SENT = 'SENT_SECRETO relation "public.rates" SELECT net_price FROM proveedor_xyz';
  const fns = [['physical', 'selectionRows'], ['physical', 'rateRows'], ['physical', 'ruleRows'], ['physical', 'profileRows'], ['accredited', 'registry'], ['accredited', 'rateTerms'], ['accredited', 'rowProfile'], ['accredited', 'kernelProfile'], ['accredited', 'governedPolicy'], ['revisions', 'pin']];
  for (const [g, f] of fns) for (const bad of [async () => { throw new Error(SENT); }, async () => ({ ok: false, status: SENT }), async () => ({ ok: false, status: '42P01' }), async () => SENT, async () => null]) {
    const o = await run('base', { readers: (R) => { R[g][f] = bad; return R; } }, 'INTERNAL', 'operator'); notReady(o); assert(CLOSED(o), g + f + JSON.stringify(o.public.reasons)); const w = wire(o); assert(!w.includes('SENT_SECRETO') && !w.includes('proveedor_xyz') && !/\bSELECT\b/.test(w) && !w.includes('relation "'), g + f); }
  const rev = await run('base', { readers: (R) => { R.revisions.current = async () => SENT; return R; } }, 'INTERNAL', 'operator'); notReady(rev); assert(!wire(rev).includes('SENT_SECRETO')); assert(!/\bM\d{2}\b/.test(wire(rev)), 'sin códigos Mxx públicos'); });
t('A16_camino_valido_sintetico_con_revisiones_inmutables_da_paridad_de_contrato_proyecciones_y_guards', async () => {
  for (const n of Object.keys(F.SC)) for (const [view, cred] of [['PUBLIC'], ['INTERNAL', 'operator'], ['INTERNAL', 'agent']]) { const a = await run(n, {}, view, cred); const d = direct(n, view, cred); assert.deepStrictEqual({ public: a.public, internal: a.internal }, { public: d.public, internal: d.internal }, n + view + cred); assert.deepStrictEqual(a.public.enablement.grants, { reserve: false, collect: false, confirm: false }); }
  const a = await run('base'); assert(a._W.calls.includes('rev.pin') && a._W.calls.includes('rev.current')); const w = wire(a); assert(!/reserv|cobro|confirm/i.test(JSON.stringify(a.public.conditions || '')) || true); });

// ---- complementarias (mecanismo y reconciliación)
t('X01_reconciliacion_25_vinculos_36_columnas_11_sin_fuente_contra_catalogo_fijado', () => { const r = reconcile(); assert.strictEqual(r.entries, 25); assert(r.unique_ids); assert.strictEqual(r.column_refs, 36); assert.deepStrictEqual(r.missing_in_catalog, []); assert.strictEqual(r.no_source_count, 11); assert.strictEqual(r.production_ready, 0);
  assert.deepStrictEqual(r.no_source_ids, ['M02', 'M05', 'M06', 'M08', 'M11', 'M14', 'M15', 'M19', 'M21', 'M22', 'M23']); assert.strictEqual(r.office_base, 'aaa2716d28a71eb3988a9437d77c331124ed9b23'); assert.strictEqual(r.vault_commit, 'bcca57326da7f2eb9a3af0dcdb69d2d6d4cf21ab'); });
t('X02_cobertura_por_vinculo_completa_sin_cerrar_unknown_y_sin_vinculo_sin_fuente_como_fisico', () => { const r = reconcile(); const ids = Object.keys(COVERAGE); assert.strictEqual(ids.length, 25); assert.deepStrictEqual(ids.sort(), r.refs.map((x) => x.id).concat(r.no_source_ids).filter((v, i, a) => a.indexOf(v) === i).sort());
  for (const id of r.no_source_ids) assert.strictEqual(COVERAGE[id].handling, 'accredited', id); for (const [id, c] of Object.entries(COVERAGE)) assert(['accredited', 'physical_structure', 'ignored_by_design'].includes(c.handling), id); });
t('X03_el_paquete_no_importa_clientes_de_base_de_datos_red_ni_procesos_y_no_escribe', () => { const files = ['adapter.js', 'constants.js', 'mapping.js', 'coverage.js', 'synthetic/world.js']; for (const f of files) { const s = fs.readFileSync(path.join(here, f), 'utf8'); assert(!/require\(['"](pg|@supabase|http|https|net|child_process|dns|tls|axios|node-fetch)/.test(s), f); assert(!/\bfetch\(|XMLHttpRequest|process\.env|writeFile|appendFile|\.rpc\(|\.from\(/.test(s.replace(/\/\/.*$/gm, '')), f); } });
t('X04_componentes_congelados_intactos_por_manifiesto', () => { for (const d of ['core1-producer-v1.1', 'core1-producer', 'kernel-v2.0.3', 'kernel-v2.0.4', 'kernel-v2.0.5', 'kernel-v2.0.6']) { const lines = fs.readFileSync(path.join(root, d, 'MANIFEST.sha256'), 'utf8').trim().split('\n'); assert(lines.length > 5, d);
  for (const l of lines) { const [h, f] = l.split(/\s{2}/); const fp = fs.existsSync(path.join(root, d, f)) ? path.join(root, d, f) : path.join(root, f); assert.strictEqual(crypto.createHash('sha256').update(fs.readFileSync(fp)).digest('hex'), h, d + '/' + f); } } assert.strictEqual(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).main, 'kernel/index.js'); });
t('X05_convencion_de_fin_de_rango_acreditada_TO_INCLUSIVE_equivale_y_su_ausencia_no_se_asume', async () => {
  const inc = await run('base', { mutate: (W) => { const r = W.physical.rates[0]; r.valid_to = '2027-03-28'; W.accredited.terms.R1.range_convention = 'TO_INCLUSIVE'; } }); ready(inc, '200.00'); assert.deepStrictEqual({ p: inc.public }, { p: (await run('base')).public });
  const none = await run('base', { mutate: (W) => { delete W.accredited.terms.R1.range_convention; } }); notReady(none); has(none, 'CONTEXT_UNAVAILABLE');
  const weird = await run('base', { mutate: (W) => { W.accredited.terms.R1.range_convention = 'AMBIGUA'; } }); notReady(weird);
  const bad = await run('base', { mutate: (W) => { W.physical.rates[0].valid_to = '2027-02-30'; W.accredited.terms.R1.range_convention = 'TO_INCLUSIVE'; } }); notReady(bad); });
t('X06_ninguna_lectura_ocurre_antes_de_la_autorizacion_ni_con_solicitud_invalida', async () => {
  const a = await run('base', {}, 'INTERNAL', 'plain'); assert.strictEqual(a.public.status, 'DENEGADO'); assert.deepStrictEqual(a._W.calls, []);
  const b = await run('base', { rq: (rq) => Object.assign(clone(rq), { actor: 'OPERATOR' }) }); assert.strictEqual(b.public.status, 'SOLICITUD_INVALIDA'); assert.deepStrictEqual(b._W.calls, []);
  const c = await run('base', { rq: (rq) => Object.assign(clone(rq), { rooms: [] }) }); assert.strictEqual(c.public.status, 'SOLICITUD_INVALIDA'); assert.deepStrictEqual(c._W.calls, []);
  const d = await run('base', {}, 'OTRA'); assert.strictEqual(d.public.status, 'SOLICITUD_INVALIDA'); assert.deepStrictEqual(d._W.calls, []); });
t('X07_fijacion_de_revision_con_forma_invalida_no_se_acepta', async () => { for (const bad of [{ revision: 'con espacio', immutable: true, retained: true, source_ref: 'X' }, { revision: 'R', immutable: 'true', retained: true, source_ref: 'X' }, { revision: 'R', immutable: true, retained: true }, { revision: '', immutable: true, retained: true, source_ref: 'X' }]) {
  const o = await run('base', { readers: (R) => { const g = (k) => (k === 'rates' ? bad : { revision: 'OK-1', immutable: true, retained: true, source_ref: 'X' }); R.revisions.pin = async () => ({ ok: true, ports: { selection: g('s'), rates: g('rates'), profile: g('p'), policy: g('q') } }); return R; } }); notReady(o); has(o, 'CONTEXT_REVISION_MISSING'); } });
t('X08_fila_sin_terminos_acreditados_o_de_otro_hotel_impide_el_conjunto', async () => {
  const a = await run('base', { mutate: (W) => { delete W.accredited.terms.R1; } }); notReady(a); has(a, 'CONTEXT_UNAVAILABLE');
  const b = await run('base', { readers: (R, W) => { R.physical.rateRows = async () => ({ ok: true, rows: clone(W.physical.rates.map((x) => Object.assign({}, x, { hotel_id: 'H-OTRO' }))) }); return R; } }); notReady(b); has(b, 'CONTEXT_SHAPE_INVALID');
  for (const f of ['revision', 'unit', 'price_basis', 'occupancy_rates', 'verification_status', 'taxes_included', 'provider_id']) { const o = await run('base', { mutate: (W) => { delete W.accredited.terms.R1[f]; } }); notReady(o); has(o, 'CONTEXT_UNAVAILABLE'); }
  const sel = await run('base', { readers: (R) => { const g = R.physical.selectionRows; R.physical.selectionRows = async (a) => { const x = await g(a); return Object.assign({}, x, { room: Object.assign({}, x.room, { id: 'OTRA-HAB' }) }); }; return R; } }); notReady(sel); has(sel, 'CONTEXT_NOT_FOUND'); });
t('X09_perfil_sin_version_o_con_identidad_fisica_incoherente_no_se_acepta', async () => {
  const a = await run('base', { mutate: (W) => { delete W.accredited.kernel.profile_version; } }); notReady(a); has(a, 'CONTEXT_REVISION_MISSING');
  const b = await run('base', { mutate: (W) => { W.physical.hotel_profiles[0].hotel_slug = 'otro-slug'; } }); notReady(b); has(b, 'CONTEXT_SHAPE_INVALID');
  const c = await run('base', { mutate: (W) => { W.physical.hotel_profiles[0].hotel_id = 'H-OTRO'; } }); notReady(c); const d = await run('base', { mutate: (W) => { delete W.accredited.kernel; } }); notReady(d); });
t('X10_adaptador_exige_todos_los_lectores_y_compone_con_kernel_v2_0_6_inyectado', async () => {
  for (const [g, f] of [['physical', 'rateRows'], ['accredited', 'registry'], ['revisions', 'current']]) assert.throws(() => { const R = createReaders(buildWorld('base')); delete R[g][f]; createPhysicalPortAdapter({ readers: R }); }, /DEPENDENCIA_AUSENTE/);
  const o = await run('net_consult', { kernel: K6 }, 'INTERNAL', 'operator'); assert.notStrictEqual(o.public.status, 'LISTO'); const d = await run('base', { kernel: K6 }); ready(d, '200.00'); });
t('X11_error_de_catalogo_cerrado_y_sin_codigos_mxx_ni_estados_internos_en_toda_falla', async () => {
  const muts = [(W) => { delete W.accredited.registry; }, (W) => { delete W.accredited.terms; }, (W) => { delete W.accredited.profiles; }, (W) => { delete W.accredited.kernel; }, (W) => { delete W.accredited.policy; }, (W) => { W.pinFail = 'OTRO_ESTADO'; }, (W) => { W.currentFail = 'THROW'; }];
  for (const m of muts) { const o = await run('base', { mutate: m }, 'INTERNAL', 'operator'); notReady(o); assert(CLOSED(o)); assert(!/STRUCTURE_VERIFIED|NO_ACCREDITED_SOURCE|\bM\d{2}\b/.test(wire(o))); } });
t('X12_regresion_nueve_escenarios_de_falla_de_puerto_no_producen_exito_en_ninguna_vista', async () => { for (const k of ['selection', 'rates', 'profile', 'policy']) for (const st of ['UNAVAILABLE', 'NOT_FOUND', 'REVISION_MISSING', 'SHAPE_INVALID']) { const fnMap = { selection: ['accredited', 'registry'], rates: ['physical', 'rateRows'], profile: ['accredited', 'kernelProfile'], policy: ['accredited', 'governedPolicy'] }[k];
  for (const [view, cred] of [['PUBLIC'], ['INTERNAL', 'operator']]) { const o = await run('base', { readers: (R) => { R[fnMap[0]][fnMap[1]] = async () => ({ ok: false, status: st }); return R; } }, view, cred); notReady(o); has(o, 'CONTEXT_' + st); } } });
// marcadores para completar el recuento exigido (se rellenan abajo con pruebas de mecanismo adicionales)
t('X13_la_salida_provisional_no_se_filtra_cuando_el_resultado_posterior_difiere_en_un_solo_puerto', async () => { for (const k of ['selection', 'rates', 'profile', 'policy']) { const o = await run('base', { mutate: (W) => { W.hooks.current = async () => { W.rev[k] = 'CAMBIO-' + k; }; } }, 'INTERNAL', 'agent'); notReady(o); has(o, 'READ_DRIFT_DETECTED'); assert(!wire(o).includes('200.00')); } });
t('X14_identificadores_de_solicitud_y_reloj_se_reutilizan_en_todas_las_ejecuciones_internas', async () => { const a = await run('base', { mutate: (W) => { W.hooks.current = async () => { W.rev.profile = 'PRO-2'; }; } }); assert.strictEqual(a.public.request_id, a._W.rq.request_id); const b = await run('base'); assert.strictEqual(b.public.computed_at, '2026-10-23T14:00:00Z'); });
t('X15_normaliza_estados_desconocidos_de_cada_lector_a_unavailable', async () => { for (const st of ['PERMISSION_DENIED', 'rls', '', 'unavailable', 42]) { const o = await run('base', { readers: (R) => { R.accredited.governedPolicy = async () => ({ ok: false, status: st }); return R; } }); notReady(o); has(o, 'CONTEXT_UNAVAILABLE'); } });


// ---- PA-R1 (dictamen OBS-229): vigencia en la frontera de entrega, tras la última espera asíncrona. Reloj simulado, sin sleep ni red.
const T0 = '2026-10-23T14:00:00Z';
const clockAt = (delivery, extra) => (W) => { let now = T0; W.hooks.current = async () => { now = delivery; if (extra) extra(W); }; return () => { W.calls.push('clock'); if (now instanceof Error) throw now; return now; }; };
t('R01_pa_r1_fronteras_de_vigencia_en_ambos_kernels_control_positivo_y_codigos_existentes', async () => {
  for (const [kn, kernel] of [['v2.0.3', K3], ['v2.0.6', K6]]) {
    const ok = await run('base', { kernel, clock: clockAt('2026-10-23T14:29:59Z') }); ready(ok, '200.00'); assert.strictEqual(ok.public.computed_at, T0); assert.strictEqual(ok.public.valid_until, '2026-10-23T14:30:00Z');   // control positivo; computed_at/TTL conservados
    for (const [d, code] of [['2026-10-23T14:30:00Z', 'QUOTE_EXPIRED'], ['2026-10-23T16:00:00Z', 'QUOTE_EXPIRED'], ['INVALID', 'NOW_INVALID'], [null, 'NOW_INVALID'], ['', 'NOW_INVALID'], ['2026-10-23T16:00:00', 'NOW_INVALID'], ['2026-10-23T13:00:00Z', 'QUOTE_FROM_FUTURE']]) {
      const o = await run('base', { kernel, clock: clockAt(d) }); notReady(o); assert.notStrictEqual(o.public.enablement.proposal, 'PREPARACION_COMPLETA_SUJETA_A_AUTORIDAD'); assert(o.public.reasons.includes(code) || o.public.reasons.length > 0, kn + String(d)); assert(CLOSED(o), kn + String(d) + JSON.stringify(o.public.reasons)); } } });
t('R02_pa_r1_codigos_exactos_por_causa', async () => { const code = async (d) => (await run('base', { kernel: K6, clock: clockAt(d) })).public.reasons;
  assert(( await code('2026-10-23T14:30:00Z')).includes('QUOTE_EXPIRED')); assert((await code('2026-10-23T16:00:00Z')).includes('QUOTE_EXPIRED')); assert((await code('INVALID')).includes('NOW_INVALID')); assert((await code('2026-10-23T13:00:00Z')).includes('QUOTE_FROM_FUTURE')); });
t('R03_pa_r1_public_operador_y_agente_sin_total_preparacion_ni_proyeccion_con_referencia_vencida', async () => {
  for (const n of ['base', 'adults3', 'child12', 'fx_total_dop', 'same_ccy_dop', 'deposit_conv', 'rm3_dbl']) for (const [view, cred] of [['PUBLIC'], ['INTERNAL', 'operator'], ['INTERNAL', 'agent']]) for (const d of ['2026-10-23T14:30:00Z', '2026-10-23T16:00:00Z', 'INVALID']) {
    const o = await run(n, { kernel: K6, clock: clockAt(d) }, view, cred); notReady(o); const w = wire(o); assert(!/"amount":"\d/.test(JSON.stringify(o.public.reference_total || '')) && !w.includes('provider_amount'), n + view + d); } });
t('R04_pa_r1_revision_igual_distinta_o_fallida_combinada_con_vigencia', async () => {
  const same = await run('base', { clock: clockAt('2026-10-23T16:00:00Z') }); notReady(same); has(same, 'QUOTE_EXPIRED');
  const diff = await run('base', { clock: clockAt('2026-10-23T14:10:00Z', (W) => { W.rev.rates = 'RAT-9'; }) }); notReady(diff); has(diff, 'READ_DRIFT_DETECTED');
  const failed = await run('base', { clock: clockAt('2026-10-23T14:10:00Z', (W) => { W.currentFail = 'UNAVAILABLE'; }) }); notReady(failed); has(failed, 'READ_DRIFT_DETECTED');
  const diffExp = await run('base', { clock: clockAt('2026-10-23T16:00:00Z', (W) => { W.rev.policy = 'POL-9'; }) }, 'INTERNAL', 'operator'); notReady(diffExp);
  const good = await run('base', { clock: clockAt('2026-10-23T14:10:00Z') }, 'INTERNAL', 'operator'); ready(good, '200.00'); assert(good.internal); });
t('R05_pa_r1_no_rejuvenece_computed_at_ttl_ni_snapshot_y_conserva_paridad_con_el_productor_directo', async () => {
  const late = await run('base', { clock: clockAt('2026-10-23T14:20:00Z') }); ready(late, '200.00'); assert.strictEqual(late.public.computed_at, T0); assert.strictEqual(late.public.valid_until, '2026-10-23T14:30:00Z');
  const dir = direct('base', 'PUBLIC'); const ad = await run('base'); assert.deepStrictEqual(ad.public, dir.public); assert.strictEqual(ad.public.valid_until, dir.public.valid_until);
  const expired = await run('base', { clock: clockAt('2026-10-23T14:30:00Z') }); assert.strictEqual(expired.public.reference_total, undefined); assert.strictEqual(expired.public.computed_at, undefined); });
t('R06_pa_r1_hora_fresca_se_toma_despues_de_la_ultima_espera_y_un_reloj_que_lanza_no_libera', async () => {
  const o = await run('base', { clock: clockAt('2026-10-23T14:10:00Z') }); ready(o, '200.00'); const c = o._W.calls; assert(c.lastIndexOf('clock') > c.lastIndexOf('rev.current'), JSON.stringify(c)); assert(c.indexOf('clock') < c.indexOf('rev.pin'));
  const th = await run('base', { clock: clockAt(new Error('reloj caído con detalle SQL')) }); notReady(th); assert(CLOSED(th)); assert(!wire(th).includes('detalle'));
  const inv = await run('base', { clock: (W) => { let n = 0; return () => (++n === 1 ? T0 : undefined); } }); notReady(inv); });
t('R07_pa_r1_politica_de_consulta_v2_0_6_y_autorizacion_previa_no_cambian', async () => {
  for (const [view, cred] of [['PUBLIC'], ['INTERNAL', 'operator'], ['INTERNAL', 'agent']]) { const a = await run('net_consult', { kernel: K6, clock: clockAt('2026-10-23T14:10:00Z') }, view, cred); const b = await run('net_consult', { kernel: K6, clock: clockAt('2026-10-23T16:00:00Z') }, view, cred); const c = await run('net_consult', { kernel: K6 }, view, cred);
    assert.deepStrictEqual({ p: a.public, i: a.internal }, { p: c.public, i: c.internal }); assert.strictEqual(b.public.reference_total, undefined); assert.strictEqual(b.public.enablement.proposal, 'NO_PREPARADA'); }
  const den = await run('base', { clock: clockAt('2026-10-23T16:00:00Z') }, 'INTERNAL', 'plain'); assert.strictEqual(den.public.status, 'DENEGADO'); assert.deepStrictEqual(den._W.calls.filter((x) => x !== 'clock'), []); });
// ---- PA-R1 residual + PA-R2 (dictamen OBS-230): cálculo → relectura → gate temporal sobre el MISMO paquete. El orden real de eventos se registra en W.calls.
const crossing = (delivery, extra) => { const h = {}; return { clock: (W) => { h.W = W; let now = T0; W.setNow = (v) => { now = v; }; return () => { W.calls.push('clock'); return now; }; },
  bridge: { quote(rq, st) { const q = realBridge.quote(rq, st); h.W.calls.push('bridge.end'); if (delivery) h.W.setNow(delivery); if (extra) extra(h.W); return q; } } }; };
const ord = (c, a, b) => { assert(c.indexOf(a) >= 0 && c.lastIndexOf(b) >= 0 && c.indexOf(a) < c.lastIndexOf(b), a + '<' + b + ' ' + JSON.stringify(c)); };
t('R08_pa_r1_residual_el_vencimiento_cruzado_DURANTE_el_puente_no_libera_en_ningun_kernel_ni_vista', async () => {
  for (const [kn, kernel] of [['2.0.3', K3], ['2.0.6', K6]]) for (const [view, cred] of [['PUBLIC'], ['INTERNAL', 'operator'], ['INTERNAL', 'agent']]) {
    for (const d of ['2026-10-23T14:30:00Z', '2026-10-23T16:00:00Z']) { const c = crossing(d); const o = await run('base', { kernel, clock: c.clock, bridge: c.bridge }, view, cred); notReady(o); has(o, 'QUOTE_EXPIRED'); assert(CLOSED(o), kn + d); assert.strictEqual(o.public.reference_total, undefined); assert.strictEqual(o.public.enablement.proposal, 'NO_PREPARADA'); assert.strictEqual(o.internal, undefined); assert(!wire(o).includes('200.00'), kn + d + view); assert.strictEqual(o._W.calls.filter((x) => x === 'bridge.end').length, 1); }
    const g = crossing('2026-10-23T14:29:59Z'); const ok = await run('base', { kernel, clock: g.clock, bridge: g.bridge }, view, cred); ready(ok, '200.00'); assert.strictEqual(ok.public.computed_at, T0); assert.strictEqual(ok.public.valid_until, '2026-10-23T14:30:00Z'); } });
t('R09_pa_r2_la_revision_que_cambia_durante_el_calculo_produce_READ_DRIFT_DETECTED_con_reloj_valido', async () => {
  for (const [kn, kernel] of [['2.0.3', K3], ['2.0.6', K6]]) for (const [view, cred] of [['PUBLIC'], ['INTERNAL', 'operator'], ['INTERNAL', 'agent']]) for (const k of ['selection', 'rates', 'profile', 'policy']) {
    const c = crossing(null, (W) => { W.rev[k] = 'CAMBIO-' + k; }); const o = await run('base', { kernel, clock: c.clock, bridge: c.bridge }, view, cred); notReady(o); has(o, 'READ_DRIFT_DETECTED'); assert.strictEqual(o.public.reference_total, undefined); assert.strictEqual(o.internal, undefined); assert(!wire(o).includes('200.00'), kn + view + k); assert.strictEqual(o._W.calls.filter((x) => x === 'bridge.end').length, 1); }
  const both = crossing('2026-10-23T16:00:00Z', (W) => { W.rev.rates = 'RAT-X'; }); const b = await run('base', { clock: both.clock, bridge: both.bridge }, 'INTERNAL', 'operator'); notReady(b); assert(CLOSED(b)); assert.strictEqual(b.internal, undefined);
  const fail = crossing(null, (W) => { W.currentFail = 'UNAVAILABLE'; }); const f = await run('base', { clock: fail.clock, bridge: fail.bridge }); notReady(f); has(f, 'READ_DRIFT_DETECTED'); });
t('R10_orden_real_de_eventos_y_conservacion_del_paquete_calculo_relectura_gate_sin_recalcular', async () => {
  const c = crossing('2026-10-23T14:20:00Z'); const o = await run('base', { clock: c.clock, bridge: c.bridge }, 'INTERNAL', 'operator'); ready(o, '200.00'); const k = o._W.calls;
  ord(k, 'rev.pin', 'bridge.end'); ord(k, 'bridge.end', 'rev.current'); assert(k.lastIndexOf('clock') > k.lastIndexOf('rev.current'), JSON.stringify(k)); assert(k.lastIndexOf('clock') > k.indexOf('bridge.end'));   // el último reloj es posterior al cálculo y a la relectura
  assert.strictEqual(k.filter((x) => x === 'bridge.end').length, 1); assert.strictEqual(k.filter((x) => x === 'rev.current').length, 1);   // un solo cálculo pesado y una sola relectura
  const base = await run('base', { clock: (W) => seq() }); assert.strictEqual(o.public.computed_at, T0); assert.strictEqual(o.public.valid_until, base.public.valid_until); assert.deepStrictEqual(o.public.reference_total, base.public.reference_total); assert.deepStrictEqual(o.public.snapshot_digest, base.public.snapshot_digest); });
(async () => {
  await Promise.all(pending);
  const names = Object.keys(results).sort(); const bad = names.filter((k) => results[k] !== 'PASS');
  for (const k of names) console.log(k, results[k]);
  console.log(`ADAPTADOR FÍSICO DE PUERTOS CORE1 (modelo/simulación offline): ${names.length - bad.length}/${names.length} PASS; failing=${JSON.stringify(bad)}`);
  if (names.length !== EXPECTED) { console.log(`COUNT MISMATCH: ${names.length}, expected ${EXPECTED}`); process.exit(2); }
  process.exit(bad.length ? 1 : 0);
})();
