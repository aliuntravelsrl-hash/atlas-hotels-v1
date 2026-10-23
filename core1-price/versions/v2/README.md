# core1-price-v2 (INERTE) — correcciones CS-R1..CS-R10 al paquete v1
Nada aquí se aplica ni se ejecuta contra base alguna. v1 se conserva en `../core1-price-v1`.
- `core1_reference_model_v2.py.inert` modelo offline v2 · `02-core1-price-pure-v2.sql.inert` función SQL v2 (solo parseada)
- `01-schema-core1-base-rates-v2.sql.inert` · `04-rollback-v2.sql.inert` (por fases con compuertas)
- `CORE1-BASE-PRICE-REGRESSION-v2.0-ATLAS-TECH.json` (43 vectores) · `tests/legacy-fixtures-v1.json` (36, con `--upgrade-legacy`)
- `tests/run_disposable_db.py.inert` (solo base desechable) · `06-isolated-test-plan.md` · `07-consumption-and-supersession-plan.md`
Reproducción offline: `python3 -I core1_reference_model_v2.py.inert CASES.json [--upgrade-legacy]` (copiar a `.py`).
