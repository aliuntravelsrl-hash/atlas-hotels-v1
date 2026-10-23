# 06 — Plan de prueba aislada v2.1 (Core 1 price) · ATLAS-TECH · 2026-10-23
Estado: **propuesto, NO ejecutado.** Responde a V2-T1 de OBS-203. Operador previsto: **Antigravity soberano, solo si el Director lo convoca**. ATLAS-TECH no ejecuta, no tiene PostgreSQL/Docker ni credenciales aquí.

## Entorno (V2-T1)
- Clúster PostgreSQL **local nuevo** (`initdb` en directorio vacío) en la estación del operador, escuchando solo en socket unix o loopback. Versión mayor **observada y registrada**, no supuesta.
- Base `c1_disposable_<id>` con comentario `C1-DISPOSABLE-FIXTURE:<id>`. Sin datos, roles ni secretos reales; sin conexión a producción, Supabase, VPS ni nube.
- **No existe opción de host remoto** (se eliminó `C1_ALLOWED_HOST`). El DSN va por variable de entorno, nunca en repo ni en la salida; los errores de conexión muestran solo la clase de excepción.
- El arnés verifica en la conexión, antes de tocar nada: nombre, comentario-marcador, dueño, no réplica, dirección loopback/socket, clúster sin bases ni roles ajenos, base vacía, hashes de archivos contra el manifiesto. Cualquier falla ⇒ `REFUSED`.
- Transacción única; los archivos aplicables **no contienen BEGIN/COMMIT** (el arnés lo rechaza si aparecen); `ROLLBACK` en `finally`; huella pre/post del catálogo debe ser igual (nada persistió). Los roles `anon/authenticated/service_role` son simulados (NOLOGIN) dentro del clúster privado.

## Fases y criterio de paso
| Fase | Qué | Paso |
|---|---|---|
| 1 | `02` y 61 + 36 casos (97): cada campo esperado **y** la salida del modelo | 0 diferencias por caso |
| 2 | `01` con stubs `hotels_master`/`rooms`: sala de otro hotel rechazada (trigger real), deriva posterior detectada por `core1_room_map_mismatches_v2_1()`, activación sin verificación rechazada, solape activo rechazado, FX >24h y FX activa solapada rechazadas | Todas las sondas PASS |
| 3 | ACL efectiva: `has_table_privilege` × 7 privilegios × 3 roles × 4 tablas (incl. DELETE/TRUNCATE), `has_function_privilege` por firma, ninguna concesión a PUBLIC, toda función con ACL explícita, intento real con `SET ROLE anon` | Solo `service_role` con SELECT/INSERT/UPDATE y EXECUTE |
| 4 | `04`: sin atestaciones el script **levanta ROLLBACK_STOP y no borra nada** | PASS |

## Qué no prueba
Portal, motor, llamadores legacy, datos reales, rendimiento, ni la ACL de producción (los roles reales no se importan). Un PASS es evidencia de la función y el esquema **aislados**.
## Evidencia a devolver
JSON completo del arnés (sin DSN), versión mayor observada, sha256 de cada archivo (`tests/ANTIGRAVITY-LOCAL-PG-MANIFEST-v2_1.json`), operador, fecha y confirmación de que el clúster fue destruido. Los fallos esperables se reportan sin relajar pruebas.
