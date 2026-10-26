# RA-1 v1 — Contrato de la autoridad de revisión (modelo + SQL candidato INERTE)

**Estado:** CS-2 A+B, mandato `MANDATE-DG-CORE1-RA1-CS2-ISOLATED-20261026`. Solo acredita el modelo y el esquema candidato **en aislamiento** con datos sintéticos.
**No acredita** ninguno de los once vínculos (M02, M05, M06, M08, M11, M14, M15, M19, M21, M22, M23: siguen sin fuente suficiente). D1/D2/D3, FIN-ID-001, F-SEC-01 y A-B §253 siguen abiertos.
**Excluido:** PDF/PII/lote/tarifas reales, lectores, adaptador v1.1, cargas, producción, apps, host, credenciales, Supabase, n8n/VPS, adopción o activación.

## Entidades
- **objects** (put-once, `key = kind:id@rev`): documento, mapa, verificación… Mismo contenido ⇒ idempotente; otro contenido ⇒ `IMMUTABLE_OBJECT`.
- **revisions** (inmutable): manifiesto que cierra dependencias (`members` con digest), contenido, horizonte público e interno, `retention_until`, `margin_ms`, clase FX, tiempos.
- **ledger** (append-only por scope): `PUBLISH | ACTIVATE | DEACTIVATE | INVALIDATE`. La cabeza del scope (seq) cambia con **cualquier** evento ⇒ `current` detecta `DRIFT`.

## Tiempos (AC5)
`received_at` lo fija el servidor al publicar. `IMPORTED_HISTORICAL` conserva `received_at` desconocido (NULL) salvo evidencia explícita (`original_received_at` + `evidence_ref`); `imported_at` es distinto. Cualquier valor de tiempo del cliente en `SERVER` ⇒ `CLIENT_TIME_FORBIDDEN`.

## Retención y horizonte (AC3/AC4)
Se exige horizonte verificable de **toda** vista liberable (pública e interna) y `retention_until ≥ max(horizontes) + margen`. Límite superior **exclusivo**. `current` (última espera) falla con `REVISION_MISSING` si: contenido o dependencia ausente/alterada, retención vencida, o la entrega pedida excede horizonte/retención; `SHAPE_INVALID` si se pide verificar la entrega sin horizontes válidos.

## Estados de salida
`OK | DRIFT | REVISION_MISSING | NOT_FOUND | SHAPE_INVALID`. El mapeo a los cuatro estados del puerto del adaptador y a `READ_DRIFT_DETECTED` queda **pendiente** (adaptador v1.1 excluido). No se añade ningún catálogo público.

## Atomicidad (AC6)
Publicación atómica por scope bajo bloqueo asesor hasta el commit; `revision_id` generado por la autoridad y **no reutilizable** (secuencia no transaccional ⇒ huecos permitidos); secuencia de libro monótona. Conflicto optimista con `expect_seq` ⇒ `CONFLICT`.

## Roles (AC9)
| Rol | Puede | No puede |
|---|---|---|
| `c1_owner` (propietario no operativo, NOLOGIN) | ser dueño de objetos | operar; UPDATE/DELETE/TRUNCATE tampoco (disparadores) |
| `c1_publisher` | `put_object`, `publish`, `set_active`, `invalidate` (SECURITY DEFINER, append-only) | leer tablas, UPDATE/DELETE/TRUNCATE, DDL, ser miembro del propietario, usar secuencias, `pin/read/current` |
| `c1_reader` | `pin`, `read`, `current` | publicar, atestar, escribir, DDL |

Bootstrap (superusuario del clúster) separado del propietario y de los roles operativos. **No se promete defensa contra superusuario ni administrador del SO.**

## FX (AC8)
No se aprueba ni implementa FX. Con política `NO_CONVERSION_USD` se rechaza cualquier moneda ≠ USD o clave de conversión/equivalente (`FX_CONVERSION_PRESENT`); con `FX_BRANCH` solo se **clasifica**.
