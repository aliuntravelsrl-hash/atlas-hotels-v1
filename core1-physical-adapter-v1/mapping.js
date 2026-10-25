'use strict';
// Carga de la matriz de vínculos (copia fijada de Office fd8762e) y reconciliación contra el catálogo fijado de OBS-227. Solo lectura de archivos locales.
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const SPEC = path.join(__dirname, 'spec');
const MAPPING_FILE = 'CORE1-PHYSICAL-PORT-MAPPING-v1-20261025.json'; const CATALOG_FILE = 'CORE1-LIVE-CATALOG-READONLY-20261025.json';
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(SPEC, f))).digest('hex');
const load = (f) => JSON.parse(fs.readFileSync(path.join(SPEC, f), 'utf8'));
function catalogColumns(cat) { const m = new Map(); for (const q of cat.queries) { const r = q.result && q.result[0]; if (r && Array.isArray(r.columns)) for (const c of r.columns) m.set(c.table + '.' + c.column, { type: c.type, nullable: c.nullable }); } return m; }
// Reconcilia cada referencia de columna con el catálogo FIJADO; no homologa por nombre. Devuelve contadores y hallazgos (no cierra UNKNOWN por inferencia).
function reconcile() {
  const map = load(MAPPING_FILE); const cat = load(CATALOG_FILE); const cols = catalogColumns(cat);
  const refs = []; const missingInCatalog = []; const states = {}; const noSource = [];
  for (const e of map.entries) { states[e.state] = (states[e.state] || 0) + 1; if (!e.sources.length) noSource.push(e.id);
    for (const s of e.sources) { const k = s.relation + '.' + s.column; refs.push({ id: e.id, key: k, type: (cols.get(k) || {}).type || null }); if (!cols.has(k)) missingInCatalog.push(e.id + ':' + k); } }
  const ids = map.entries.map((e) => e.id);
  return { entries: map.entries.length, unique_ids: new Set(ids).size === ids.length, column_refs: refs.length, missing_in_catalog: missingInCatalog, no_source_ids: noSource, no_source_count: noSource.length,
    production_ready: map.entries.filter((e) => e.production_ready !== false).length, states, refs, mapping_sha256: sha(MAPPING_FILE), catalog_sha256: sha(CATALOG_FILE), vault_commit: map.vault_commit, office_base: map.office_base };
}
module.exports = { reconcile, load, MAPPING_FILE, CATALOG_FILE, SPEC };
