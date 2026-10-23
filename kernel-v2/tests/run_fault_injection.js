'use strict';
// Inyección de fallos del kernel v2: cada mutación de una COPIA temporal debe hacer fallar la suite (código != 0). Control positivo incluido.
const fs = require('fs'); const path = require('path'); const os = require('os'); const cp = require('child_process');
const root = path.join(__dirname, '..', '..');
function layout() {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'kv2-fault-'));
  for (const d of ['kernel', 'tests', 'spec', 'scripts', 'fixtures', 'kernel-v2']) fs.cpSync(path.join(root, d), path.join(t, d), { recursive: true });
  fs.mkdirSync(path.join(t, 'core1-price'), { recursive: true }); fs.cpSync(path.join(root, 'core1-price/custody'), path.join(t, 'core1-price/custody'), { recursive: true });
  fs.copyFileSync(path.join(root, 'package.json'), path.join(t, 'package.json')); return t;
}
const runSuite = (t) => cp.spawnSync(process.execPath, [path.join(t, 'kernel-v2/tests/run_kernel_v2_tests.js')], { encoding: 'utf8' });
const MUT = [
  ['C: concede reservar', 'kernel-v2/enablementProposal.js', "reserve: false", "reserve: true"],
  ['C: propone con B no listo', 'kernel-v2/enablementProposal.js', "else if (B.verdict !== 'LISTO')", "else if (false)"],
  ['B: acepta DTO de otra habitación', 'kernel-v2/priceReadiness.js', "dtoRoom.room_ref !== selection.room_ref", "false"],
  ['B: FX validada solo por valor (ignora autoridad)', 'kernel-v2/priceReadiness.js', "if (!FX.AUTHORITIES.includes(fx.authority))", "if (false)"],
  ['B: capacidad ausente se rellena', 'kernel-v2/priceReadiness.js', "reasons.push('CAPACITY_ADULTS_' + classify(cap.adults_max).status)", "void 0"],
  ['B: regla infantil implícita aceptada', 'kernel-v2/priceReadiness.js', "if (!rule || !CHILD_RULE_KINDS.includes(rule.kind))", "if (false)"],
  ['B: contrato incompatible aceptado', 'kernel-v2/priceReadiness.js', "if (dto.dto_version !== CORE1.DTO_VERSION) return 'DTO_VERSION_INCOMPATIBLE';", ""],
  ['B: exige TPL a selección DBL', 'kernel-v2/priceReadiness.js', "if (other !== occ) notApplicable.push", "if (other !== occ && other === 'TPL') reasons.push('OCCUPANCY_TPL_AUSENTE'); if (other !== occ) notApplicable.push"],
  ['index: fallo interno pasa como LISTO', 'kernel-v2/index.js', "B = { verdict: 'RECHAZADO', reasons: ['EVALUATION_ERROR'], applicable: [], not_applicable: [] }", "B = { verdict: 'LISTO', reasons: [], applicable: [], not_applicable: [] }"],
  ['index: vista pública filtra datos internos', 'kernel-v2/index.js', "enablement: result.C };", "enablement: result.C, internal: result.internal };"],
  ['index: cualquier actor ve la vista interna', 'kernel-v2/index.js', "INTERNAL_ACTORS.includes(ctx.actor)", "true"],
  ['A: dato sin procedencia aceptado', 'kernel-v2/dataState.js', "if (!f.origin || !f.version) return", "if (false) return"],
];
let ok = 0; const total = MUT.length + 1; const fails = [];
let t = layout(); let r = runSuite(t); fs.rmSync(t, { recursive: true, force: true });
if (r.status === 0) ok++; else fails.push('CONTROL positivo falló');
for (const [name, rel, needle, repl] of MUT) {
  t = layout(); const f = path.join(t, rel); const src = fs.readFileSync(f, 'utf8');
  if (!src.includes(needle)) { fails.push(name + ' (objetivo de mutación ausente)'); fs.rmSync(t, { recursive: true, force: true }); continue; }
  fs.writeFileSync(f, src.replace(needle, repl)); r = runSuite(t); fs.rmSync(t, { recursive: true, force: true });
  if (r.status !== 0) ok++; else fails.push(name + ' NO DETECTADA');
}
console.log(`INYECCIÓN DE FALLOS KERNEL V2: ${ok}/${total} comportamientos esperados (${MUT.length} mutaciones + control positivo)`);
for (const f of fails) console.log('FALLA:', f);
process.exit(fails.length ? 1 : 0);
