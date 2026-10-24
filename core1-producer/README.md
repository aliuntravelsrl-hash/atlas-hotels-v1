# Productor servidor de cotización Core 1 — CANDIDATO INERTE (OBS-221) — MODELO/SIMULACIÓN OFFLINE; NO DESPLEGADO; NO ADOPTADO
ATLAS-TECH (AP-03), 2026-10-24. Base: vault `main` `a9125e2c6a74b7885a2ff2c242c824824ff2e0bb`; Office `05c5743`; SPEC-CORE1-SERVER-QUOTE-PRODUCER-v1. Reutiliza **sin modificar** Core 1 v2.2.3, adaptador v1.1.1, kernel v2.0.3 y `EVAL-SNAPSHOT-v2`. Kernel v1 sigue como entrada predeterminada.

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
`npm run test:producer` (40) y `npm run test:producer:faults` (20 mutaciones + control + propagación = 22; tarda varios minutos). Datos sintéticos en `synthetic/`.
