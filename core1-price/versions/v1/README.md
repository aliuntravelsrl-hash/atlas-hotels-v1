# changesets/core1-price-v1 — INERTE / NO APLICADO
Autor: ATLAS-TECH (AP-03) · 2026-10-22 · responde a OBS-199 / §250 · informe: `reports/REPORT-ATLAS-TECH-CORE1-MAPPING-AND-PRICE-CHANGESET-v1-20261022.md`

Todos los archivos son propuestas. Ninguno se ejecutó contra producción ni contra ninguna base de datos. Las extensiones `.inert` impiden ejecutarlos por accidente.

| Archivo | Contenido | Estado |
|---|---|---|
| `01-schema-core1-base-rates.sql.inert` | Tablas cerradas `core1_source_documents` y `core1_base_rates` | PROPOSED; sintaxis analizada con pglast |
| `02-core1-price-pure-v1.sql.inert` | Función pura `core1_price_pure_v1` (+ auxiliar) | PROPOSED; sintaxis analizada con pglast; no ejecutada |
| `03-room-and-load-template.sql.inert` | Plantilla comentada de alta de habitación y filas; sin dataset | TEMPLATE |
| `04-rollback.sql.inert` | Reversión de objetos nuevos | PROPOSED |
| `core1_reference_model.py.inert` | Modelo de referencia offline (sin red ni base de datos) | ejecutado offline: 36/36 y 9/9 |
| `CORE1-BASE-PRICE-REGRESSION-v1.1-ATLAS-TECH.json` | 9 vectores de regresión sintéticos (aditivos a los 36 del fixture v1) | NO EJECUTADO contra SQL |

## Cómo repetir la verificación offline
```
cp core1_reference_model.py.inert /tmp/core1_reference_model.py
python3 -I /tmp/core1_reference_model.py ../../fixtures/CORE1-BASE-PRICE-v1-20261022.json
python3 -I /tmp/core1_reference_model.py CORE1-BASE-PRICE-REGRESSION-v1.1-ATLAS-TECH.json
```
Resultado esperado: `TOTAL 36/36 PASS` y `TOTAL 9/9 PASS`. Prueba coherencia de los oráculos con la especificación; **no** prueba el SQL.

## Plan de prueba aislada del SQL (pendiente, requiere autorización)
1. Crear una base **desechable** (sin datos de producción ni secretos): rama de Supabase o Postgres local.
2. Aplicar `01` y `02` (las tablas de `01` no son necesarias para la función pura).
3. Para cada caso: `SELECT public.core1_price_pure_v1(case->'request', case->'context');` y comparar con `case->'expected'` (campos presentes). Esperado: 45/45.
4. Registrar el resultado en un informe posterior; solo entonces el SQL puede pasar de PROPOSED a verificado en entorno aislado.
5. La aplicación productiva requiere un changeset exacto revisado por separado y una autorización explícita; no la concede este directorio.
