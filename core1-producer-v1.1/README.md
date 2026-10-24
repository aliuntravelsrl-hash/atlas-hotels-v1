# Productor servidor de cotización Core 1 v1.1 — CANDIDATO INERTE (OBS-221 + correcciones OBS-222) — MODELO/SIMULACIÓN OFFLINE; NO DESPLEGADO; NO ADOPTADO
ATLAS-TECH (AP-03), 2026-10-24. Base: vault `main` `a9125e2c6a74b7885a2ff2c242c824824ff2e0bb`; Office `05c5743`; SPEC-CORE1-SERVER-QUOTE-PRODUCER-v1. Reutiliza **sin modificar** Core 1 v2.2.3, adaptador v1.1.1, kernel v2.0.3 y `EVAL-SNAPSHOT-v2`. Kernel v1 sigue como entrada predeterminada.

> **v1.1** corrige P-R1/P-R2/P-R3 sobre `core1-producer/` (v1, PR #8, commit `80f59fe`, **intacta y recuperable**). Cambio de mecanismo ⇒ versión nueva en carpeta nueva.

## Qué es
Una función `produce({view, credential, request})` con dependencias **inyectadas** (repos de solo lectura, identidad, política, reloj, generador de id, puente, kernel). Flujo: identidad/política → validación de la solicitud exacta (campos de autoridad del cliente rechazados; el `request_id` del cliente es solo correlación) → lecturas por puerto con revisión → estado para el motor → **puente** al simulador congelado → `EVAL-SNAPSHOT-v2` (huellas canónicas reutilizando `kernel-v2.0.3/canonical.js`) → kernel → comprobación de **no deriva** de revisiones → respuesta pública por lista positiva (y proyección interna propia solo con política comprobada).

## Puente JS↔Python (reproducible)
`bridge/core1_bridge.py.inert` se ejecuta con `python3 -I -B` en subproceso. Antes de cargar el simulador verifica el SHA-256 de las tres piezas congeladas (`constants.js: FROZEN_PINS`); si cambian, se niega (`FROZEN_PIN_MISMATCH`). Prueba de paridad P01: los 11 escenarios producen paquetes **idénticos** (DTO, vista, evidencia, snapshot) a los del generador candidato de `kernel-v2.0.3/fixtures`.

## Coherencia de lectura (estrategia elegida)
Revisiones inmutables direccionadas + comprobación de no deriva tras evaluar. **No** se afirma lectura transaccional de BD. Puerto sin revisión inmutable ⇒ `CONTEXT_REVISION_MISSING`; deriva ⇒ `READ_DRIFT_DETECTED`; ambos sin total ni preparación.

## Reglas clave
- `rates.created_at` ≠ `received_at`: toda fila sin evidencia `PROVEN` ⇒ `RECEIVED_AT_UNPROVEN` (no hay referencia lista).
- FX solo cuando se convierte (total o mínimo de depósito); una aprobación inválida innecesaria no contamina.
- Perfil ambiguo entre filas elegibles ⇒ no se afirma perfil ⇒ sin snapshot ⇒ no listo.
- Salida pública cerrada; proyección interna con catálogos cerrados (`UNRECOGNIZED` ante lo desconocido), sin trazabilidad ni precio final. `grants` siempre false.
- Sin red, SQL, RPC de negocio, pagos, reservas ni webhooks (prueba por Proxy de métodos y escaneo del código).

## Límites (la simulación NO certifica)
Autenticación real, grants/RLS, SQL, firma o autenticidad del emisor, host, Admin, portal. La política y la identidad son **simuladas**. El snapshot prueba consistencia, no autenticidad. Mapeo físico de fuentes: UNK (`docs/SOURCE-MATRIX.md`). Hospedaje no elegido (`docs/HOSTING-COMPARISON.md`). Sin datos reales ni Viva Miches.

## Pruebas
Datos sintéticos en `synthetic/`. (Cifras de v1 en `core1-producer/README.md`.)

## Correcciones OBS-222
- **P-R1** catálogos cerrados de códigos públicos por frontera (`publicCodes.js`): policy, puertos, puente, solicitud, productor y kernel. Un código desconocido —aunque tenga formato válido— se sustituye por un respaldo fijo; los conocidos se conservan. El actor devuelto por la política debe estar en el catálogo (`OPERATOR`/`AI_SELLER`). Prueba de deriva H01: si el kernel agrega códigos, la suite falla hasta revisar el catálogo.
- **P-R2** la afirmación «sin bytecode» ahora es falsable: inventario antes/después en una copia aislada con las mismas huellas (Y01) y en el repo (Y02), con dos controles negativos (artefacto sintético Y03; `.pyc` real generado por este Python Y04), independientes de la versión de Python. **`-I`/`-B` aíslan la importación y evitan bytecode; no son un sandbox de seguridad, red ni sistema operativo.**
- **P-R3** las filas «realmente usadas» salen de la `traceability` del propio motor (contrato existente), cotejada por `row_id` y `revision` con las filas leídas; otras temporadas, inactivas, de recepción futura o reemplazadas por precedencia no contaminan. Una fila **usada** sin recepción probada cierra (`RECEIVED_AT_UNPROVEN`); perfiles discrepantes entre filas usadas o un perfil usado incompatible con el local no se ignoran (`USED_PROFILE_UNRESOLVED`, `PROFILE_SNAPSHOT_DIVERGES`). Sin `traceability` verificable: `USED_ROWS_UNVERIFIED` (no se adivina). **Límite:** la `traceability` es salida del simulador; que un motor real la exponga con el mismo contrato es UNK (puerto pendiente, no inventado).
- **H-E1** `docs/HOSTING-COMPARISON.md`: Node consta en fuente del MCP; host/versión/configuración/Python vivos UNK.
- Hallazgo del kernel (vista interna sin enumeración): contenido en el productor; sonda separada en `kernel-probes/`.

## Pruebas v1.1
`npm run test:producer11` (56) y `npm run test:producer11:faults` (29 mutaciones + control + propagación = 31; 2 en paralelo).
