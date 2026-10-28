'use strict';
// Inyección de fallos del modelo RA-1 v1.1 (CS-2 A + RA-R1/RA-R2). Cada mutante cambia UNA propiedad del modelo en una copia temporal; el arnés de AC debe fallar (exit≠0).
// Control positivo: el modelo sin mutar pasa (exit 0). Propagación de exit code: spawnSync.status. Equivalentes declarados con razón.
const fs = require('fs'); const os = require('os'); const path = require('path'); const cp = require('child_process');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'model', 'ra1.js'), 'utf8'); const TEST = path.join(__dirname, 'run_ra1_model_tests.js');
const M = [
 ['M01_drift_no_compara_cabeza', [["h.seq !== expect.seq || h.revision_id !== expect.revision_id", "false"]]],
 ['M02_objeto_mutable', [["if (ex.digest !== digest) throw new AuthorityError('IMMUTABLE_OBJECT', key);", ""]]],
 ['M03_horizonte_interno_ignorado', [["[a.horizon.public, a.horizon.internal].some", "[a.horizon.public].some"]]],
 ['M04_retencion_inclusiva', [["t >= ms(rec.retention_until)", "t > ms(rec.retention_until)"]]],
 ['M05_margen_ignorado', [["+ margin) throw new AuthorityError('RETENTION_SHORT')", ") throw new AuthorityError('RETENTION_SHORT')"]]],
 ['M06_entrega_interna_sin_control', [["vi > ms(rec.horizon.internal) || ", ""]]],
 ['M07_importacion_se_toma_por_recepcion', [["imported_at = iso(t0); if (r.at", "imported_at = iso(t0); received_at = iso(t0); if (r.at"]]],
 ['M08_valor_de_cliente_aceptado', [["if (r.at !== undefined || r.original_received_at !== undefined) throw new AuthorityError('CLIENT_TIME_FORBIDDEN'); received_at = iso(t0);", "received_at = r.at || iso(t0);"]]],
 ['M09_sin_rollback_de_revisiones', [["S.revisions = snap.revisions; ", ""]]],
 ['M10_contador_de_ids_retrocede', [["seq: S.seq };\n    try", "seq: S.seq, rc: S.revCounter };\n    try"], ["S.seq = Math.max(S.seq, snap.seq); throw e;", "S.seq = Math.max(S.seq, snap.seq); S.revCounter = snap.rc; throw e;"]]],
 ['M11_fx_no_se_rechaza', [["a.fx_policy === 'NO_CONVERSION_USD' && fx", "false"]]],
 ['M12_permisos_abiertos', [["!ROLES[actor] || !ROLES[actor].includes(op)", "!ROLES[actor]"]]],
 ['M13_lectura_sin_copia', [["revision: clone(rec)", "revision: rec"]]],
 ['M14_publicacion_sin_copia_de_entrada', [["content: clone(a.content)", "content: a.content"]]],
 ['M15_dependencias_sin_verificar_en_uso', [["!o || o.digest !== m.digest || o.digest !== sha(o.content)", "!o"]]],
 ['M16_contenido_sin_verificar', [["if (rec.content_digest !== sha(rec.content)) return 'REVISION_MISSING';", ""]]],
 ['M17_lectura_ignora_scope', [["rec.scope !== scope) return", "false) return"]]],
 ['M18_sin_conflicto_optimista', [["a.expect_seq !== h.seq", "false"]]],
 ['M19_pin_no_exige_activa', [["const st = !h.valid || !h.active ? 'REVISION_MISSING' : usable(rec, now());", "const st = !h.valid ? 'REVISION_MISSING' : usable(rec, now());"]]],
 ['M20_id_de_revision_reutilizable', [["'R' + String(++S.revCounter)", "'R' + String(S.revCounter + 1)"]]],
 ['M21_historico_sin_evidencia', [["!r.evidence_ref || ", ""]]],
 ['M22_current_ignora_entrega', [["usable(S.revisions.get(h.revision_id), now(), deliver || null)", "usable(S.revisions.get(h.revision_id), now(), null)"]]],
 ['M23_dependencia_corrupta_al_publicar', [["if (o.digest !== sha(o.content)) throw new AuthorityError('DEPENDENCY_CORRUPT', o.key);", ""]]],
 ['M24_current_no_exige_activa', [["if (!h.valid || !h.active) return { status: 'REVISION_MISSING', revision_id: h.revision_id, seq: h.seq };", ""]]],
 ['M25_retencion_vs_horizonte_en_uso', [["if (ms(rec.horizon.public) > ms(rec.retention_until) || ms(rec.horizon.internal) > ms(rec.retention_until)) return 'REVISION_MISSING';", ""]]],
 ['M26_fx_sin_subcadena_exchange_equivalent', [["if (lk.includes('exchange') || lk.includes('equivalent')) return true; ", ""]]],
 ['M27_fx_sin_particion_por_mayusculas', [[".replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')", ""]]],
 ['M28_politica_ausente_o_null_sin_rechazo', [["if (!['NO_CONVERSION_USD', 'FX_BRANCH'].includes(a.fx_policy)) throw new AuthorityError('SHAPE_INVALID', 'fx_policy');", ""]]],
 ['M29_moneda_distinta_de_USD_ignorada', [["(fxWords(k).includes('currency') && v[k] !== 'USD') || ", ""]]],
 ['M30_moneda_solo_clave_exacta_currency', [["fxWords(k).includes('currency')", "k === 'currency'"]]],
 ['M31_fx_palabra_fx_ignorada', [["return w.includes('dop') || w.includes('fx');", "return w.includes('dop');"]]],
 ['M32_pin_retencion_inclusiva_por_reloj_desplazado', [["const st = !h.valid || !h.active ? 'REVISION_MISSING' : usable(rec, now());", "const st = !h.valid || !h.active ? 'REVISION_MISSING' : usable(rec, now() - 1);"]]],
];
const EQUIV = { M25_retencion_vs_horizonte_en_uso: 'Redundante con RETENTION_SHORT en publicación: sin operación de rol que altere horizonte/retención tras publicar; solo el simulador admin alteraría contenido/objetos, no esos campos.', };   // v1.1: M24 se detecta (AC1d); el texto de equivalencia obsoleto de v1 se elimina
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ra1-mut-')); const run = (file) => cp.spawnSync(process.execPath, [TEST], { env: Object.assign({}, process.env, { RA1_MODEL: file }), encoding: 'utf8' });
const base = path.join(dir, 'base.js'); fs.writeFileSync(base, SRC); const ctl = run(base);
const out = { control_positivo_exit: ctl.status, mutants: {} }; let bad = 0;
if (ctl.status !== 0) { console.log('CONTROL POSITIVO FALLA: el modelo sin mutar no pasa'); process.exit(3); }
for (const [name, reps] of M) { let s = SRC; let ok = true; for (const [n, r] of reps) { if (s.split(n).length !== 2) { ok = false; break; } s = s.replace(n, () => r); } if (!ok) { out.mutants[name] = 'NEEDLE_STALE'; bad++; continue; } const f = path.join(dir, name + '.js'); fs.writeFileSync(f, s); const r = run(f); out.mutants[name] = r.status !== 0 ? 'KILLED' : (EQUIV[name] ? 'EQUIVALENT_DECLARED' : 'SURVIVED'); if (out.mutants[name] === 'SURVIVED') bad++; }
fs.rmSync(dir, { recursive: true, force: true });
for (const [k, v] of Object.entries(out.mutants)) console.log(k, v, EQUIV[k] && v !== 'KILLED' ? '— ' + EQUIV[k] : '');
const c = Object.values(out.mutants); console.log(`MUTANTES: killed=${c.filter((x) => x === 'KILLED').length} equivalentes=${c.filter((x) => x === 'EQUIVALENT_DECLARED').length} survivors/stale=${bad} de ${c.length}; control_positivo_exit=${ctl.status}`);
process.exit(bad ? 1 : 0);
