'use strict';
// Regresión de las sondas EXACTAS del Curator (OBS-247). La sonda original exige la ruta hotel-document-decision-v1/tests/world.js:
// se monta en un directorio temporal con enlace simbólico a v1.1 (candidato) y a v1 (instantánea, debe REPRODUCIR los contraejemplos).
const fs = require('fs'); const os = require('os'); const path = require('path'); const { execFileSync } = require('child_process'); const assert = require('assert');
const here = path.resolve(__dirname, '..'); const v1 = path.resolve(here, '..', 'hotel-document-decision-v1');
const probe = path.join(__dirname, 'curator-probes.js');
function run(target) { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cur-')); fs.symlinkSync(target, path.join(d, 'hotel-document-decision-v1')); const o = execFileSync('node', [probe, d], { encoding: 'utf8' }); fs.rmSync(d, { recursive: true, force: true }); return JSON.parse(o); }
const by = (a) => Object.fromEntries(a.map((x) => [x.id + (x.locator !== undefined ? ':' + x.locator : ''), x]));
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const N = run(here); const O = fs.existsSync(v1) ? run(v1) : null;
const text = (x) => JSON.stringify(x);
for (const x of N) {
  if (x.id === 'positive_control') { ok(x.observed === 'ALLOW' && x.state === 'RENDERED', 'control positivo'); continue; }
  if (/^locator|^price_expiry/.test(x.id) || x.id.startsWith('locator')) { ok(x.observed !== 'ALLOW' && x.render === 0, x.id + ' no habilita ni renderiza'); continue; }
  if (/allow_missing_expiry|exclusive_none|deny_empty_reason/.test(x.id)) { ok(x.validator && x.validator.valid === false, x.id + ' inválido'); if (x.consumer) ok(!x.consumer.usable || (x.consumer.actions || []).length === 0, x.id + ' sin acciones'); continue; }
  if (x.id === 'replay_voided') { ok(x.observed === 'DENY' && x.state === 'VOIDED', 'replay con documento anulado ⇒ DENY/VOIDED'); continue; }
  if (x.id === 'drift_during_render') { ok(x.observed === 'DENY' && x.state === 'SUPERSEDED', 'deriva durante render ⇒ DENY/SUPERSEDED'); continue; }
  ok(false, 'sonda no reconocida ' + x.id);
}
if (O) { const bad = O.filter((x) => x.id !== 'positive_control' && (x.observed === 'ALLOW' || (x.validator && x.validator.valid === true))); ok(bad.length >= 5, 'la instantánea v1 reproduce los contraejemplos (' + bad.length + ')'); }
console.log('sondas del Curator: ' + n + ' comprobaciones PASS · candidato cierra todos los contraejemplos · instantánea v1 ' + (O ? 'los reproduce' : 'ausente'));
