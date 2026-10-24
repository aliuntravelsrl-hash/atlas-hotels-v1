# Procedencia de los fixtures Core 1 (SINTÉTICOS)
Generados el 2026-10-23 ejecutando `core1-price/versions/consumer-adapter-v1.1.1/tests/run_server_scenarios.py.inert --dump` (43/43) sobre el contexto/motor v2.2.3, en layout temporal. Son salidas **simuladas** del candidato Core 1 v2.2.3 / adaptador v1.1.1 (no adoptado); no son datos reales de proveedor ni de cliente. El kernel v2 los **consume**; no los recalcula.
* `public-dtos.json` — DTO públicos por escenario (`base`, `child12`, `reclass`, `fx_ok`, `cap_unknown`, `net`, `context_mismatch`, …).
* `internal-views.json` — vistas internas de operador (`client_final`, `net`, `net_expired`, `expired_condition`).
Las pruebas del kernel componen a veces un DTO con una vista interna distinta (p. ej. `fx_ok` + `client_final`) solo para ejercitar la regla de conversión; está declarado en cada prueba.
SHA-256 de los archivos: se verifican con `core1-price/MANIFEST.sha256` y `kernel-v2/MANIFEST.sha256`.
