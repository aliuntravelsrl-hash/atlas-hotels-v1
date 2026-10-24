# Procedencia de catálogos — vista interna del kernel v2.0.5-candidate

Alcance: SCOPE-CORE1-KERNEL-INTERNAL-ENUM-HARDENING-20261024 (Office 2ba101e). Base: atlas-hotels-v1 main 928c745132b2b0cb15cd56edf46876db37ebb6bb. Modelo/simulación offline; los valores son los alcanzables en las fuentes congeladas, no prueba de acreditación comercial real ni del motor real.

Fuentes congeladas leídas (sin modificar): `core1-price/versions/v2.2.3/core1_reference_model_v2_2_3.py.inert` (motor) y `core1-price/versions/consumer-adapter-v1.1.1/server/consumer_server_sim.py.inert` (adaptador).

## calculation_status
| Valor admitido | Emisor / rama | Caso reproducible (`fixtures/paired-quotes.json`) | Resultado esperado en el kernel |
|---|---|---|---|
| COMPLETE | motor `evaluate`, `out.update({"calculation_status": "COMPLETE"…})` (línea 555) | `base`, `adults3`, `child12`, … | vista válida; con DTO `PRICE_REFERENCE` y el resto de comprobaciones, LISTO |
| SOURCE_SUBTOTAL_ONLY | motor, base NET/desconocida (línea 536); DTO público `CONSULT/PENDING_REVIEW` | `net_consult`, `enum_basis_unknown`, `enum_mixed_probe` | vista válida; CONSULTAR; nunca LISTO |
| INCOMPLETE | motor, `Stop(code)` con estado por defecto → `e.status` (línea 575); `Stop` por defecto es "INCOMPLETE" (línea 51) | `enum_incomplete_no_rate` (RATE_COVERAGE_GAP), `enum_incomplete_placeholder` (PLACEHOLDER_RATE) | vista válida; CONSULTAR; nunca LISTO |
| INVALID | motor, `bad()` y `Stop(…, "INVALID")` (líneas 55-56, 366) | `enum_invalid_probe` (STAY_INVALID) | vista válida por contrato; en el kernel la solicitud con fechas iguales ya se rechaza con INPUT_INVALID antes (igual que v2.0.3) |
Todo otro valor (ausente, null, no cadena, vacío, con espacios, otra capitalización, desconocido): vista inválida ⇒ B RECHAZADO con el código existente `INTERNAL_VIEW_SHAPE_INVALID`.

`Stop` solo se instancia con estado por defecto (INCOMPLETE) o "INVALID" (barrido de `Stop(` y `bad(` en el motor). El adaptador conserva `result.get("calculation_status")` sin traducirlo. El catálogo NO copia los dos valores del `INT_CAT.calc` del productor: es una lista distinta y más amplia.

## provider_amount_status
Construcción en el adaptador (línea 196): `"ACCREDITED" if basis_status == "NET_PROVIDER" else "NOT_ACCREDITED_" + basis_status`; `basis_status` ∈ {NOT_EVALUATED (sin fuentes), CLIENT_FINAL, NET_PROVIDER, MIXED, UNKNOWN}.
| Valor | Rama | Caso reproducible |
|---|---|---|
| ACCREDITED | todas las filas usadas NET_PROVIDER | `net_consult` |
| NOT_ACCREDITED_CLIENT_FINAL | todas CLIENT_FINAL | `base` y demás |
| NOT_ACCREDITED_MIXED | bases distintas entre filas usadas | `enum_mixed_probe` (estancia de 2 noches con dos filas) |
| NOT_ACCREDITED_UNKNOWN | base única fuera de CLIENT_FINAL/NET_PROVIDER | `enum_basis_unknown` |
| NOT_ACCREDITED_NOT_EVALUATED | sin fuentes usadas (error) | `enum_incomplete_*`, `enum_invalid_probe` |

## Prueba de procedencia
La prueba `E05` exige que el conjunto observado en los escenarios generados por el adaptador congelado sea IGUAL al catálogo del kernel (ni sobran ni faltan valores). Los 5 escenarios `enum_*` se añadieron al generador de v2.0.5 (`tools/gen_paired_quotes_v204.py.inert`); los 11 anteriores son byte a byte idénticos a v2.0.3.

## Límites declarados
1. Vista emitida por el modelo `.py.inert`; que un motor real emita estos mismos valores es UNK.
2. Coherencia: solo la regla del addendum A5 (PRICE_REFERENCE + SOURCE_SUBTOTAL_ONLY/INCOMPLETE/INVALID ⇒ rechazo). No hay matriz general: `provider_amount_status` ↔ base ↔ DTO (p. ej. ACCREDITED + PRICE_REFERENCE) sigue siendo un hallazgo separado y abierto.
3. Una vista de motor previo (`pre_engine_status`, sin `engine_version`) ya se rechazaba con `ENGINE_INCOMPATIBLE` y sigue rechazándose.
4. El productor v1.1 conserva su catálogo interno propio (`INT_CAT`) y muestra `UNRECOGNIZED` para INCOMPLETE/INVALID; no se modificó.

## Nota v2.0.5
La relación base → estado → importe → DTO está en `MATRIX-PROVIDER-AMOUNT.md`. El límite 2 anterior queda superado: ACCREDITED + PRICE_REFERENCE y las demás contradicciones de importe del proveedor se rechazan (R1–R4).
