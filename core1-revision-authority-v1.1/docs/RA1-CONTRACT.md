# RA-1 v1.1 — Contrato de la autoridad de revisión (modelo + SQL candidato INERTE)

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

## FX (AC8, RA-R1)
No se aprueba ni implementa FX (sin tasa, sin conversión). Con política `NO_CONVERSION_USD` se rechaza (`FX_CONVERSION_PRESENT`) el contenido con clave de conversión o moneda ≠ USD; con `FX_BRANCH` solo se **clasifica**.
**Política obligatoria:** ausente, `NULL`, vacía o fuera de `{NO_CONVERSION_USD, FX_BRANCH}` ⇒ `SHAPE_INVALID: fx_policy` explícito, ANTES de clasificar, en modelo y SQL (en SQL `NULL NOT IN (...)` es desconocido, no verdadero: por eso la guarda `IS NULL` es explícita).
**Normalización admitida (idéntica en modelo y SQL):** la clave se parte por mayúsculas (camelCase, PascalCase, siglas: `exchangeRate`, `ExchangeRate`, `FXRate`, `amountDOP`) y por todo carácter fuera de `[A-Za-z0-9]`; minúsculas solo ASCII. Es conversión si la clave en minúsculas contiene `exchange` o `equivalent`, o alguna palabra es exactamente `dop` o `fx`; y una palabra `currency` (`currency`, `depositCurrency`, `deposit_currency`) con valor distinto de la cadena `"USD"` (incluye `null`, números y `"usd"`).
**Límites declarados (no admitidos, probados como límite, no como cobertura):** `fxrate`/`dopprice` sin separador ni mayúscula interna, `tasaCambio`, `conversionRate` (término `conversion` no admitido), y valores como `"DOP"` en claves que no son de moneda. No es un scanner universal; ampliar el esquema admitido requiere decisión del Curator.
`fx_class` conserva su regla: `FX_BRANCH` si el contenido tiene conversión, si no `NO_CONVERSION_USD` (una política `FX_BRANCH` sin conversión en el contenido queda clasificada `NO_CONVERSION_USD`; no es una decisión FX).

## Límite de retención (RA-R2)
`usable(r, t, …)` recibe el tiempo explícito. Antes del límite ⇒ `OK`; igual o después ⇒ `REVISION_MISSING` (exclusivo). En SQL se prueba con la fila sintética y `t = retention_until ± 1 µs`, como `c1_owner` (dueño no operativo) sobre el auxiliar interno; ni lector ni publicador pueden ejecutarlo ni elegir reloj. No se añade API pública.

## Ciclo de vida del laboratorio (RA-R3)
Parada desconocida ≠ parada confirmada. El directorio propio solo se elimina si nunca se intentó arrancar, o si el PID propio fue **acreditado** (entero > 1 leído de su `postmaster.pid`, con `/proc/<pid>/cmdline` que contiene su directorio de datos) y se **observó** que desapareció. Si falla la lectura del PID tras el arranque, el PID no es propio, el estado es desconocido o sigue vivo: se retiene el directorio, se declara `STOP_PENDING_*` y la salida es 5. Solo se usa `pg_ctl -D <directorio propio>`; nunca búsqueda ni parada por nombre. Códigos: 0 correcto · 1 fallo · 4 gate de aislamiento (NO EJECUTADO) · 5 limpieza pendiente (precedencia).
