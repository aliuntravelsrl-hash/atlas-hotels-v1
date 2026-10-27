'use strict';
// Regresión de las sondas EXACTAS del Curator: OBS-247 (curator-probes.js), OBS-248 residuales (curator-residual-probes.js) y M63 (curator-m63-probe.js).
// Cada sonda exige una ruta fija de carpeta; se monta en un directorio temporal con enlaces simbólicos al candidato (v1.2) y a la instantánea v1.1 (debe REPRODUCIR los residuales).
const fs = require('fs'); const os = require('os'); const path = require('path'); const { execFileSync } = require('child_process'); const assert = require('assert');
const here = path.resolve(__dirname, '..'); const root = path.resolve(here, '..'); const v11 = path.join(root, 'hotel-document-decision-v1.1'); // here = candidato v1.3
function mount(links) { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cur2-')); for (const [n, t] of Object.entries(links)) fs.symlinkSync(t, path.join(d, n)); return d; }
function run(file, links) { const d = mount(links); try { return JSON.parse(execFileSync('node', [path.join(__dirname, file), d], { encoding: 'utf8' })); } finally { fs.rmSync(d, { recursive: true, force: true }); } }
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const v12 = path.join(root, 'hotel-document-decision-v1.2');
// 1) OBS-247: las sondas anteriores siguen cerradas en v1.2
const P = run('curator-probes.js', { 'hotel-document-decision-v1': here });
for (const x of P) {
  if (x.id === 'positive_control') ok(x.observed === 'ALLOW' && x.state === 'RENDERED', 'control positivo OBS-247');
  else if (/^locator|^price_expiry/.test(x.id)) ok(x.observed !== 'ALLOW' && x.render === 0, x.id);
  else if (/allow_missing_expiry|exclusive_none|deny_empty_reason/.test(x.id)) ok(x.validator && x.validator.valid === false, x.id);
  else if (x.id === 'replay_voided') ok(x.observed === 'DENY' && x.state === 'VOIDED', x.id);
  else if (x.id === 'drift_during_render') ok(x.observed === 'DENY' && x.state === 'SUPERSEDED', x.id);
  else ok(false, 'sonda desconocida ' + x.id);
}
// 2) OBS-248 residuales: v1.2 cierra; v1.1 reproduce
const check = (out, closed) => { const by = Object.fromEntries(out.map((x) => [x.id, x]));
  const a = by.R4_PRICE_DRIFT, b = by.R4_GUEST_SCOPE_REVOKED, c = by.R5_EXPIRED_DURING_DELIVERY, pc = by.POSITIVE_CONTROL;
  const bad = { price: a.decision === 'ALLOW' && JSON.stringify(a.amounts || []).includes('250.00'), guest: b.decision === 'ALLOW', exp: c.decision === 'ALLOW' };
  if (closed) { ok(!bad.price && !bad.guest && !bad.exp, 'v1.2 cierra los tres residuales'); ok(a.decision === 'DENY' && b.decision === 'DENY' && c.decision === 'DENY', 'decisiones DENY'); ok(c.state === 'ACKED_BY_CHANNEL', 'acuse histórico conservado'); ok(pc.decision === 'ALLOW' && pc.state === 'RENDERED', 'control positivo OBS-248'); }
  else ok(bad.price && bad.guest && bad.exp, 'v1.1 reproduce los tres residuales'); };
check(run('curator-residual-probes.js', { 'hotel-document-decision-v1.1': here }), true);
if (fs.existsSync(v11)) check(run('curator-residual-probes.js', { 'hotel-document-decision-v1.1': v11 }), false);
// 2b) OBS-249 fronteras BND-1/BND-2: v1.3 cierra; v1.2 las reproduce
const checkB = (out, closed) => { const by = Object.fromEntries(out.map((x) => [x.id, x]));
  const a = by.RENDER_INPUT_ALIAS, b = by.UNSCOPED_OUTER_LEAK, pc = by.POSITIVE_CONTROL;
  const leak = JSON.stringify(a.amounts || []).includes('9999.00'); const outer = b.outerDelivery !== undefined;
  if (closed) { ok(!leak && a.state !== 'RENDERED', 'BND-1: importe alterado no se libera'); ok(JSON.stringify(a.amounts || []).includes('250.00'), 'BND-1: importe autorizado intacto'); ok(a.sourceAmount === '250.00', 'fuente intacta'); ok(!outer && b.response.form === 'DENIAL_UNSCOPED', 'BND-2: exterior solo denegación'); ok(b.internal.deliveries.length === 1 && b.internal.deliveries[0].state === 'ACKED_BY_CHANNEL', 'BND-2: acuse interno conservado'); ok(pc.decision === 'ALLOW' && pc.state === 'RENDERED', 'control positivo OBS-249'); }
  else ok(leak && outer, 'v1.2 reproduce BND-1 y BND-2'); };
checkB(run('curator-boundary-probes.js', { 'hotel-document-decision-v1.2': here }), true);
if (fs.existsSync(v12)) checkB(run('curator-boundary-probes.js', { 'hotel-document-decision-v1.2': v12 }), false);
// 3) M63: base ⇒ VOIDED; el reemplazo exacto del mutante ⇒ SUPERSEDED (estados públicos distintos; el arnés de mutación debe MATARLO)
const M = run('curator-m63-probe.js', { 'hotel-document-decision-v1.1': here });
ok(M[0].mode === 'base' && M[0].documents[0].state === 'VOIDED', 'M63 base VOIDED'); ok(M[1].mode === 'M63' && M[1].documents[0].state === 'SUPERSEDED', 'M63 mutante SUPERSEDED');
console.log('sondas del Curator (OBS-247 + OBS-248 + OBS-249 + M63): ' + n + ' comprobaciones PASS · v1.3 cierra los residuales y fronteras · v1.1/v1.2 los reproducen');
