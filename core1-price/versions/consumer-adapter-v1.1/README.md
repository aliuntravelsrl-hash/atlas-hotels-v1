# core1-consumer-adapter-v1.1 (INERTE, SIMULADO, NO ADOPTADO) — ATLAS-TECH 2026-10-23
Paquete nuevo para `CORE1-PRICE-CONTEXT-v2.2.2` / `CORE1-PRICE-ENGINE-v2.2.2` (OBS-207 §4.5). **Adaptador v1 se conserva intacto** (simulación de v2.1). No es endpoint, RPC, SQL ni código de apps; no usa red ni BD.
## Qué cambia respecto de v1
| Tema | v1.1 |
|---|---|
| Versiones | Contrato `…-ADAPTER-v1.1`; solo motor/contexto v2.2.2. Petición v1, contexto de otra versión o motor con otra `engine_version` ⇒ rechazo/"Consultar", sin traducir en silencio |
| Tres importes separados | `reference_total` (DTO público, referencia sujeta a confirmación, no pagable) · `provider_amount` (vista interna operador/vendedor IA, etiquetado interno) · `final_price_confirmed` (siempre `null`: acto humano/contractual) |
| NET / base desconocida | Público: "Consultar", sin monto. El subtotal del proveedor solo en la vista interna |
| Impuestos desconocidos | Nota pública fija; `total_certified=false`; no se afirma "incluido" |
| Suplementos | Nota pública genérica; detalle solo interno |
| Edades | Enteras 0–17 (cliente y servidor); reclasificación visible como `adults_billed`/`children_billed` y nota pública |
| Capacidades / moneda | Capacidad ausente o excedida ⇒ Consultar. FX solo si **esa selección** requiere conversión; sin tasa válida ⇒ Consultar (nunca inventada); deriva de tasa solo bloquea si hacía falta convertir |
| Condiciones vencidas / por vencer | No filtradas al público. Vista interna: estado, `operator_alerts`, aviso de consultar al proveedor |
| Solapes | `received_at` solo del servidor; instante futuro ⇒ fila ignorada y alerta interna; trazabilidad y supersesión solo internas |
| Habilitación | `booking_enablement.derived_from_reference=false`, `REQUIRES_OPERATOR`; no se expone `may_request_booking`; `collection_allowed=false` siempre |
## Contenido
`server/consumer_server_sim.py.inert` · `client/core1PriceAdapter.mjs.inert` · `CORE1-PRICE-PUBLIC-DTO-v1.1.schema.json.inert` · `tests/run_server_scenarios.py.inert` (30 escenarios) · `tests/run_client_tests.mjs.inert` (24 pruebas).
## Cómo se prueba
`npm run test:core1:all` (runner `core1-price/runners/run_core1_checks.py`): copia v2.2.2 y este paquete a un layout temporal, ejecuta servidor (30/30) y cliente (24/24) con salida distinta de 0 ante fallo y conteos exactos; no escribe fixtures en el repositorio. Los DTO se generan en el temporal.
## Límites
Los 115 vectores de v2.2.2 y estos escenarios **no** prueban SQL, RPC real, permisos, Admin, portal ni venta. Retiro de fallbacks 100/58.5/50 %/0: ver `../consumer-adapter-v1/LEGACY-RETIREMENT-LIST-v1.json.inert` (no se duplica). A/B §253 y F-SEC-01 siguen abiertos.
