# core1-consumer-adapter-v1.1.1 (INERTE, SIMULADO, NO ADOPTADO) — ATLAS-TECH 2026-10-23
Paquete nuevo para `CORE1-PRICE-CONTEXT-v2.2.3` / `CORE1-PRICE-ENGINE-v2.2.3` (OBS-207 §4.5). **Adaptador v1 se conserva intacto** (simulación de v2.1). No es endpoint, RPC, SQL ni código de apps; no usa red ni BD.
## Qué cambia respecto de v1
| Tema | v1.1.1 |
|---|---|
| Versiones | Contrato `…-ADAPTER-v1.1.1`; solo motor/contexto v2.2.3. Petición v1, contexto de otra versión o motor con otra `engine_version` ⇒ rechazo/"Consultar", sin traducir en silencio |
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
`server/consumer_server_sim.py.inert` · `client/core1PriceAdapter.mjs.inert` · `CORE1-PRICE-PUBLIC-DTO-v1.1.1.schema.json.inert` · `tests/run_server_scenarios.py.inert` (43 escenarios) · `tests/run_client_tests.mjs.inert` (24 pruebas).
## Cómo se prueba
`npm run test:core1:all` (runner `core1-price/runners/run_core1_checks.py`): copia v2.2.3 y este paquete a un layout temporal, ejecuta servidor (43/43) y cliente (27/27) con salida distinta de 0 ante fallo y conteos exactos; no escribe fixtures en el repositorio. Los DTO se generan en el temporal.
## Límites
Los 120 vectores de v2.2.3 y estos escenarios **no** prueban SQL, RPC real, permisos, Admin, portal ni venta. Retiro de fallbacks 100/58.5/50 %/0: ver `../consumer-adapter-v1/LEGACY-RETIREMENT-LIST-v1.json.inert` (no se duplica). A/B §253 y F-SEC-01 siguen abiertos.

## Correcciones OBS-208 (V11-R1…R5) sobre v1.1 — v1.1 se conserva sin cambios
| ID | Defecto en v1.1 | Corrección en v1.1.1 | Pruebas |
|---|---|---|---|
| V11-R1 | La rama NET perdía condiciones, suplementos, sustitución y procedencia | Modelo v2.2.3 conserva `conditions`, `supplement_notes`, `superseded_rates`, `sources_used` (con `price_basis`, `taxes_included`); la vista de operador los muestra; el público sigue ciego | S31, S32, C27, vectores V22-K01..K05 |
| V11-R2 | Una fila DOP fuera de fechas + deriva de tasa ⇒ `FX_DRIFT` aunque se cotizara en USD | La tasa solo bloquea si la conversión (o un mínimo/depósito aplicable) se usa de verdad; filas fuera de fechas, inactivas, sustituidas o de otro plan no crean dependencia | S33, S34, S35 (sonda exacta del Curator ⇒ `PRICE_REFERENCE` 200.00 USD) |
| V11-R3 | `child_ages={}` (u otros no-arreglo) se normalizaba a "sin niños" | `child_ages` es obligatorio y debe ser arreglo; `ages_confirmed` debe ser booleano; el cliente igual | S36, S37, C25 |
| V11-R4 | Un subtotal de fila `CLIENT_FINAL` se rotulaba "monto proveedor" | `provider_amount` solo si **toda** fila usada declara `NET_PROVIDER`; si no, `source_subtotal` + `provider_amount_status` (`NOT_ACCREDITED_CLIENT_FINAL/UNKNOWN/MIXED`); sin margen, tasa ni precio final inventados | S38, S39, S11, S23, C22, C26 |
| V11-R5 | Esquema DTO abierto en objetos anidados; sin validación real | Esquema cerrado y recursivo (dos ramas: con precio / sin precio), validación con `jsonschema` si está disponible (declarado en la salida; si no, validador de subconjunto declarado), mutaciones anidadas rechazadas, auditoría de cierre del propio esquema | S40–S43 |

Validador usado en esta ejecución: ver línea `SCHEMA VALIDATOR:` de la salida del servidor (jsonschema 4.26.0 en el entorno de ATLAS-TECH; el Curator no lo tenía instalado, por eso existe el respaldo declarado).
