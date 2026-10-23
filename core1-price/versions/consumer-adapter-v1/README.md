# core1-consumer-adapter-v1 (INERTE, SIMULADO) — ATLAS-TECH 2026-10-23
Diseño de consumo servidor → DTO público → adaptadores de cliente para Core 1 (OBS-205). No es endpoint, RPC, SQL ni código de apps. Reutiliza el motor `core1_price_pure_v2_1` (aquí representado por el modelo v2.1 como sustituto); no crea SSOT nueva.
- `server/consumer_server_sim.py.inert` validación de petición cliente, constructor de contexto (solo lecturas servidor), DTO público mínimo, re-aceptación de snapshot.
- `client/core1PriceAdapter.mjs.inert` adaptadores puros para los 6 callers, listado/tarjeta, comparador y Admin.
- `CORE1-PRICE-PUBLIC-DTO-v1.schema.json.inert` · `LEGACY-RETIREMENT-LIST-v1.json.inert`
- `tests/run_all.sh.inert` ejecuta 31 escenarios de servidor + 28 de cliente (A01–A12). **PASS simulado ≠ SQL ni E2E.**
