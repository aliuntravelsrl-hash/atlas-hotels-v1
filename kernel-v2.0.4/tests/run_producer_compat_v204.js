'use strict';
// A10 — Compatibilidad por inyección AISLADA: kernel v2.0.4 inyectado en el productor v1.1 (sin editarlo). Solo en pruebas; el productor sigue usando su kernel por defecto.
const assert = require('assert'); const path = require('path'); const root = path.join(__dirname, '..', '..');
const P = (r) => require(path.join(root, 'core1-producer-v1.1', r));
const { createProducer } = P('producer'); const { createBridge } = P('bridge/bridge'); const { createPolicy } = P('policy'); const { createSyntheticRepos } = P('synthetic/repos'); const F = P('synthetic/fixtures');
const K3 = require(path.join(root, 'kernel-v2.0.3')), K4 = require(path.join(root, 'kernel-v2.0.4'));
const clone = F.clone; const realBridge = createBridge(); const SENT = 'SYNTH_PROBE_VALUE';
const IDS = { operator: { id: 'u-op', kind: 'USER', verified: true, roles: ['OPERATOR'], scopes: ['core1.quote.internal'] }, agent: { id: 's-ai', kind: 'SERVICE', verified: true, roles: [], scopes: ['core1.quote.agent'] } };
const identity = { verify: (c) => (typeof c === 'string' && IDS[c]) || null };
const run = (K, name, view, cred, bridge) => { const [rq, data] = F.SC[name](); const clocks = ['2026-10-23T14:00:00Z', '2026-10-23T14:10:00Z']; let i = 0;
  const p = createProducer({ repos: createSyntheticRepos(data), identity, policy: createPolicy({ publicAnonymous: true }), clock: () => clocks[Math.min(i++, 1)], newRequestId: () => rq.request_id, bridge: bridge || realBridge, kernel: K, assistedChannelAccredited: true });
  return p.produce({ view, credential: cred, request: rq }); };
const bridgeWith = (f) => ({ quote: (rq, st) => { const q = clone(realBridge.quote(rq, st)); f(q); return q; } });
const wire = (o) => JSON.stringify({ public: o.public, internal: o.internal });
const results = {}; const t = (n, fn) => { try { fn(); results[n] = 'PASS'; } catch (e) { results[n] = 'FAIL ' + String(e.message).split('\n')[0].slice(0, 300); } };
const EXPECTED = 6;
t('I01_los_11_escenarios_validos_dan_la_misma_salida_publica_e_interna_con_v2_0_3_y_v2_0_4', () => { const strip = (o) => JSON.parse(JSON.stringify({ public: o.public, internal: o.internal }).replace(/HOTEL-INTEGRITY v2\.0\.[34]-candidate/g, 'K')); for (const n of Object.keys(F.SC)) for (const [view, cred] of [['PUBLIC'], ['INTERNAL', 'operator'], ['INTERNAL', 'agent']]) assert.deepStrictEqual(strip(run(K4, n, view, cred)), strip(run(K3, n, view, cred)), n + ':' + view + ':' + cred); });
t('I02_base_sigue_listo_con_v2_0_4', () => { const o = run(K4, 'base', 'PUBLIC'); assert.strictEqual(o.public.status, 'LISTO'); assert.strictEqual(o.public.reference_total.amount, '200.00'); });
t('I03_vista_con_centinela_en_v2_0_3_pasa_y_en_v2_0_4_se_cierra', () => { for (const f of ['calculation_status', 'provider_amount_status']) { const br = bridgeWith((q) => { q.internal_view[f] = SENT; }); const o3 = run(K3, 'base', 'INTERNAL', 'operator', br), o4 = run(K4, 'base', 'INTERNAL', 'operator', br); assert.strictEqual(o4.public.status !== 'LISTO', true, f); assert(!wire(o4).includes(SENT), f); assert(o4.public.reasons.includes('INTERNAL_VIEW_SHAPE_INVALID') || o4.public.reasons.includes('B_RECHAZADO'), JSON.stringify(o4.public.reasons)); assert.strictEqual(o3.public.status, 'LISTO', 'referencia: v2.0.3 deja pasar ' + f); } });
t('I04_publico_y_agente_ia_no_filtran_el_centinela_en_ninguna_ruta', () => { const br = bridgeWith((q) => { q.internal_view.calculation_status = SENT; q.internal_view.provider_amount_status = SENT; }); for (const [view, cred] of [['PUBLIC'], ['INTERNAL', 'operator'], ['INTERNAL', 'agent']]) { const o = run(K4, 'base', view, cred, br); assert(!wire(o).includes(SENT), view + cred); assert.notStrictEqual(o.public.status, 'LISTO'); } });
t('I05_estados_de_error_legitimos_siguen_sin_listo_en_el_productor', () => { for (const n of Object.keys(F.SC)) { const a = run(K4, n, 'PUBLIC'), b = run(K3, n, 'PUBLIC'); assert.strictEqual(a.public.status, b.public.status, n); } assert.notStrictEqual(run(K4, 'net_consult', 'PUBLIC').public.status, 'LISTO'); });
t('I06_productor_v1_1_sin_editar_sigue_importando_kernel_v2_0_3_por_defecto', () => { const src = require('fs').readFileSync(path.join(root, 'core1-producer-v1.1/producer.js'), 'utf8'); assert(src.includes("require('../kernel-v2.0.3/canonical')")); assert(!/kernel-v2\.0\.4/.test(src)); });
const names = Object.keys(results); const bad = names.filter((k) => results[k] !== 'PASS');
for (const k of names) console.log(k, results[k]);
console.log(`COMPATIBILIDAD KERNEL V2.0.4 EN PRODUCTOR V1.1 (inyección aislada): ${names.length - bad.length}/${names.length} PASS; failing=${JSON.stringify(bad)}`);
if (names.length !== EXPECTED) { console.log('COUNT MISMATCH'); process.exit(2); }
process.exit(bad.length ? 1 : 0);
