# Hallazgo separado — Mirror Kernel actual vs. reglas del Director (Core 1)
**Fecha:** 2026-10-23 · **Autor:** ATLAS-TECH (AP-03) · **Naturaleza:** lectura de código. **No se modificó el kernel** (`kernel/`), ni `tests/`, ni la lógica de `scripts/`.
**Estado:** HALLAZGO ABIERTO — requiere dictamen técnico del Curator y convocatoria del Director. Cambiar el kernel exige entrada en `history/INTEGRITY-STATE-LOG.md`, versión nueva y `npm test` al 100 % (Manual §4).
**Verificación hecha:** `npm test` pasa con el kernel sin cambios; esto solo prueba que sus pruebas actuales pasan, no que su lógica cumpla las reglas del Director.

## Contexto
`rules/DIRECTOR-RULES-CORE1-20261023.md` establece: sin valores por defecto, sin inferencia, "Consultar" ante dato faltante, y cálculo solo de habitación/personas/ocupación/precio por persona-noche/niños por edad. El kernel fue escrito antes (v1.0.0, 17-Sep-2026) con otro criterio: **completa** datos faltantes.

## Desalineaciones (cada una es un punto distinto)
| # | Dónde | Qué hace hoy | Regla del Director que contradice |
|---|---|---|---|
| K1 | `HotelVariableAccumulator.js:10-11` | `max_adults \|\| 2`, `max_children \|\| 0`: si la capacidad falta, asume 2 adultos y 0 niños | Sin valores por defecto (R4, R12). Capacidad ausente => "Consultar". La base de datos también tiene ese default (`rooms.capacity_adults=2`), por lo que el dato "2" puede no ser conocimiento. |
| K2 | `HotelVariableAccumulator.js:3,12-13` | Si una habitación no tiene precio, usa el precio base del hotel (o de la primera habitación) | Una habitación sin precio no se vende; no hereda el precio de otra (R4). |
| K3 | `HotelVariableAccumulator.js:4` | `exchangeRateSell \|\| 1.0`: sin tasa, convierte con 1.0 | FIN-ID-001 prohíbe tasas fijas en código (Manual §1); sin tasa vigente => "Consultar" en DOP. El pilar P7 ya exige `> 1`, pero el acumulador igual convierte con 1.0. |
| K4 | `HotelVariableAccumulator.js:2,29` | `marginPct = 15.0` por defecto | Core 1 es precio de referencia del dato cargado; un margen inventado por defecto no es un dato (R4). Decidir si el margen pertenece a Core 1 o a otra capa. |
| K5 | `HotelVariableAccumulator.js:21` | `stars \|\| 4` | Dato inventado cuando falta. |
| K6 | `HotelVariableAccumulator.js:34-36` | `check_in '15:00'`, `check_out '12:00'`, `'Cancelacion estandar 48h'` por defecto | Dato de política del hotel inventado cuando falta. La política no entra al cálculo (R2), pero tampoco debe fabricarse. |
| K7 | `HotelIntegrityEvaluator.js:28` | P3 (tarifas) pasa con `base_price_usd > 0` o cualquier tarifa en el arreglo | No exige ocupación (SGL/DBL/TPL), precio de niño ni vigencia ni origen verificado. Un hotel con un solo precio "Adulto" cuenta como PASS. |
| K8 | `HotelIntegrityEvaluator.js:21` | P2 (habitaciones) pasa si hay nombre y `max_adults >= 1` | No exige capacidad máxima real ni reglas de edad. |
| K9 | pilares (spec) | No existe un pilar de **ocupación y edades** | Reglas 8-10: la base, la edad y la capacidad son parte del conocimiento mínimo de un hotel. |
| K10 | `README.md:16` | Cita tablas `hotel_rooms` / `hotel_rates` | La lectura en vivo de Supabase muestra `rooms` y `rates`. Verificar si las tablas citadas existen o es nomenclatura desactualizada. |
| K11 | `scripts/audit_live_supabase_hotels.js` | Usa `SUPABASE_SERVICE_ROLE_KEY` desde el entorno | Correcto no embeberla; recordar que ejecutar esta auditoría requiere esa clave y no debe guardarse en el repositorio. |

## Consecuencia práctica
Con el kernel actual, un hotel puede salir `ACTIVE` (7/7) con capacidad, precio por habitación, margen, estrellas y políticas **rellenados por defecto**, no cargados. Eso es lo que Core 1 evita. Mientras el kernel no se alinee, el estado `ACTIVE` del kernel **no debe leerse** como "datos completos para Core 1".

## Opciones para el Curador (no ejecutadas)
- **A.** Versionar el kernel (v1.1): quitar defaults K1-K6 (propagar "sin dato"), añadir el pilar de ocupación y edades (K9) y endurecer P2/P3 (K7-K8). Requiere vectores nuevos y entrada de bitácora.
- **B.** Dejar el kernel como está y que Core 1 sea la autoridad de precio; el kernel quedaría solo como indicador de presencia de contenido (identidad, multimedia, divisa), con la lectura "ACTIVE" renombrada para no inducir a error.
- La opción A es la coherente con "el núcleo no cambia, cambia el conocimiento" solo si el núcleo se entiende como el flujo, no como estos defaults. Decisión del Director/Curador.
