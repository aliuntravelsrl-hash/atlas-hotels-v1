# HOTEL-INTEGRITY v2.0.3-candidate — MODELO/SIMULACIÓN OFFLINE; NO DESPLEGADO; NO ADOPTADO
ATLAS-TECH (AP-03), 2026-10-23. Revisión candidata de `kernel-v2.0.2/` (v2.0.2-candidate, commit `cea97296e72b32e1817aa3cb04484823d1368556`, **intacta** y recuperable). `kernel-v2.0.1/`, `kernel-v2/`, `kernel/` (v1) y las versiones Core 1 congeladas, sin cambios. Origen: dictamen del Curator sobre PR #5 (OBS-218): único residual de G1. Core 1 no se reabrió. Entrada predeterminada del producto: sigue v1.
## Residual y corrección
| Residual en v2.0.2 (reproducido) | Causa | Corrección v2.0.3 |
|---|---|---|
| Cambiar total y promedio del DTO de 200 a 9999 USD, conservando snapshot, `fingerprint`, solicitud y vista, devolvía LISTO 9999 | el snapshot comparaba el `fingerprint` (opaco), no el contenido del DTO. **Fe de erratas:** el README y la bitácora de v2.0.2 describían "huellas del DTO"; eso era solo el `fingerprint` opaco, no una huella recalculada | contrato `EVAL-SNAPSHOT-v2` con `dto_digest` = SHA-256 del JSON canónico del `public_dto` completo, emitido junto con el paquete por el generador y **recalculado** por el kernel. Ausente/malformada ⇒ `SNAPSHOT_SHAPE_INVALID` (RECHAZADO); no coincide ⇒ `SNAPSHOT_DTO_DIGEST_MISMATCH` (RECHAZADO); snapshot del contrato anterior `EVAL-SNAPSHOT-v1` ⇒ CONSULTAR `EVALUATION_SNAPSHOT_CONTRACT_OUTDATED` (sin total, C `NO_PREPARADA`) |
## Límites
1. Consistencia del paquete, no autenticidad del emisor ni permisos: UNK (backend). Sin firmas ficticias ni booleano "firmado".
2. Core 1 no emite el snapshot; lo genera el simulador sintético (`tools/gen_paired_quotes_v203.py.inert`). Sin recalcular precio ni añadir librerías.
3. Datos sintéticos; no es Viva Miches ni hotel real.
## Pruebas
`npm run test:kernel203` (88: incluye D_01…D_06, regresión v1 y v2.0.0) y `npm run test:kernel203:faults` (36 mutaciones + control + propagación = 38). Los tests de forma del DTO re-sellan el paquete como lo habría emitido el servidor, para que la huella no enmascare al validador.
