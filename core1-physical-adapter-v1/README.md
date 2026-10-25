# Adaptador físico de puertos Core 1 v1 — CANDIDATO INERTE — MODELO/SIMULACIÓN OFFLINE; NO DESPLEGADO; NO ADOPTADO
ATLAS-TECH (AP-03), 2026-10-25. Origen: SPEC-CORE1-PHYSICAL-PORT-ADAPTER-v1-20261025 y matriz CORE1-PHYSICAL-PORT-MAPPING-v1-20261025 (Office `fd8762e`, OBS-228); catálogo OBS-227 (Office `aaa2716d`). Base: vault `main` `bcca573`.
Compone **sin editarlos** el productor v1.1 (`core1-producer-v1.1/`), Core 1 v2.2.3, el adaptador v1.1.1 y el kernel inyectado (v2.0.3 o v2.0.6). No es productor nuevo, no toca motor ni kernel, y no es una fuente de verdad.

## Qué es / qué no es
* Es: una función `produce(input)` asíncrona con **lectores inyectados** (físicos para estructura, acreditados para semántica, autoridad de revisiones) que entrega al productor puertos síncronos de valores ya resueltos bloquea el resultado si la relectura posterior no coincide y **comprueba una hora fresca (vigencia) tras la última espera antes de liberar** (PA-R1). Ver `docs/COMPOSITION.md`.
* No es: cliente Supabase, SQL, RPC, red, escritura, host, autenticación, mapeo real, ni integración física. No llama `ingestar_tarifa_proveedor` ni lee datos vivos. `tests/` y `synthetic/` usan datos ficticios.
* Tabla existente ≠ autoridad: 14 vínculos con estructura observada se usan solo como estructura/verificación cruzada; los **11 vínculos sin fuente acreditada siguen sin fuente** y su dato solo puede venir de un lector acreditado (si falta ⇒ no listo). `docs/MATRIX-BEFORE-AFTER.md`.

## Reglas clave
Sin revisión inmutable y retenida ⇒ `CONTEXT_REVISION_MISSING`. `rates.created_at` nunca es `received_at`. `politica_deposito`/`hotel_policies.content` no se parsean. Capacidad divergente exige precedencia acreditada. Convención de fin de rango (`valid_to`) exige declaración acreditada. Vencimiento/hora inválida/retroceso ⇒ QUOTE_EXPIRED/NOW_INVALID/QUOTE_FROM_FUTURE (códigos existentes del kernel), sin total, preparación ni proyección. Errores solo por el catálogo cerrado existente (CONTEXT_*, READ_DRIFT_DETECTED, RECEIVED_AT_UNPROVEN, USED_ROWS_UNVERIFIED); los identificadores Mxx y estados de la matriz nunca son públicos. Ningún fallo produce LISTO, total, preparación completa ni proyección interna.

## Pruebas
* `npm run test:physical-adapter` — 38 (A01–A16, PA-R1 R01–R07 + reconciliación 25/36/11, cobertura, paridad de 11 escenarios × 3 vistas con el productor v1.1, autorización antes de lecturas, sin importaciones de BD/red, congelados por manifiesto).
* `npm run test:physical-adapter:faults` — mutaciones del adaptador + control positivo + propagación de salida; equivalentes declarados.
* `docs/EXECUTABILITY.md`: qué es NO EJECUTABLE por fuente real ausente. Evidencia sintética offline ≠ E2E.
## Límites
Fuentes acreditadas, autoridad de revisiones, perfil de precio por edad, recepción, registro de referencias, host y autenticación son pendientes. Sin reservas, cobros ni confirmación. Sin DDL/DML/RLS/n8n/VPS/apps.
