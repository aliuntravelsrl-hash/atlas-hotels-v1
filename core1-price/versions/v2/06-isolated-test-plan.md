# 06 — Plan de pruebas aislado (Core 1 price v2) · ATLAS-TECH · 2026-10-22
Estado: **propuesto, no ejecutado**. No hay base ni credenciales en esta sesión; el SQL v2 solo fue analizado sintácticamente (pglast).

## Precondiciones (STOP si falta alguna)
1. Base **desechable** creada para esta prueba (nombre `c1_disposable_*`, PostgreSQL de la misma versión mayor que producción), sin datos reales, sin acceso a producción.
2. Autorización explícita del Director/Curador para ejecutar en esa base. Nada contra producción.
3. Extensión `pgcrypto`/`gen_random_uuid` disponible; `btree_gist` solo para el esquema (fase 2).

## Fases
| Fase | Qué | Criterio de paso | Si falla |
|---|---|---|---|
| 1 | Aplicar `02-core1-price-pure-v2.sql.inert` en una transacción y ejecutar `tests/run_disposable_db.py.inert` con `CORE1-BASE-PRICE-REGRESSION-v2.0-ATLAS-TECH.json` (43) y `legacy-fixtures-v1.json --upgrade-legacy` (36) | Cada caso: campos esperados iguales **y** salida igual al modelo; 0 diferencias; ROLLBACK al final | Corregir SQL o modelo; no avanzar |
| 2 | Esquema `01-schema-core1-base-rates-v2.sql.inert` en la base desechable con tablas mínimas simuladas `hotels_master`, `rooms` | Constraints rechazan: activar sin verificación; sala de otro hotel (FK compuesta); solape activo; FX >24h o solapada | Corregir DDL |
| 3 | Permisos: como `anon` y `authenticated` intentar SELECT/INSERT/EXECUTE | Todos denegados; `service_role` permitido | Corregir GRANT/REVOKE |
| 4 | Rollback por fases `04-rollback-v2.sql.inert` | Compuertas bloquean con datos; fase 2 reversible re-aplicando 02 | Corregir |
| 5 | Propiedades: determinismo (misma entrada, misma salida 100 repeticiones), `STABLE` sin escritura, sin lectura de tablas | Idéntico | Corregir |

## Qué NO prueba este plan
Portal, motor de reservas, callers legacy, datos reales, rendimiento. Un PASS aquí es evidencia de la **función aislada**, no de conformidad global.
## Evidencia a devolver al Curador
Salida completa por caso (sin secretos), versión de PostgreSQL, hash de los archivos aplicados, fecha, quién ejecutó.
