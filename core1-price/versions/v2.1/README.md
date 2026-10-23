# core1-price-v2.1 (INERTE) — correcciones OBS-203 V2-T1..T6 sobre v2
v1 y v2 se conservan intactos. Nada se aplica ni ejecuta. Aplicar v2.1 **en lugar de** v2 (comparten nombres de funciones auxiliares).
- `core1_reference_model_v2_1.py.inert` · `02-core1-price-pure-v2_1.sql.inert` (`core1_price_pure_v2_1`) · `01-schema-…-v2_1.sql.inert` · `04-rollback-v2_1.sql.inert`
- `CORE1-BASE-PRICE-REGRESSION-v2.1-ATLAS-TECH.json` (61) · `tests/legacy-fixtures-v1.json` (36, `--upgrade-legacy`)
- `tests/run_disposable_db_v2_1.py.inert` + `tests/schema_acl_probes_v2_1.py.inert` + `tests/ANTIGRAVITY-LOCAL-PG-MANIFEST-v2_1.json`
- `06-isolated-test-plan.md` · `07-consumption-and-supersession-plan.md` · `DIFF-*-v2-v2.1.txt`
Reproducción offline: copiar el modelo a `.py` y `python3 -I core1_reference_model_v2_1.py CASES.json [--upgrade-legacy]`.
