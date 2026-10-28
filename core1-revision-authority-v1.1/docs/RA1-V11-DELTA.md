# RA-1 v1.1 — delta RA-R1 / RA-R2 / RA-R3 (OBS-238 / §289)

**FROM:** RA-1 v1 en PR #15 @`4224e66` (base `fc3cdb3`), dictamen REVISE acotado del Curator. v1 queda intacta en `core1-revision-authority-v1/` (recuperable en `4224e66`).
**WHY:** (R1) la clasificación NO_CONVERSION_USD solo reconocía claves delimitadas por guion bajo y dejaba pasar `exchangeRate`; el SQL usaba `IF p_fx_policy NOT IN (...)`, que con `NULL` no rechaza. (R2) S02 se declaró equivalente por no poder igualar el reloj real. (R3) el arnés marcaba `started` antes de leer `postmaster.pid`; con PID desconocido `!undefined` daba «parada confirmada» y se borraba el directorio.
**TO:** carpeta nueva `core1-revision-authority-v1.1/` (modelo, SQL inerte, arnés, docs). Precedencia: v1.1 sustituye a v1 solo para efectos de revisión de este delta; v1 no se modifica. PR #15 sigue en BORRADOR, sin fusión, activación ni producción.

| Punto | Cambio | Pruebas nuevas |
|---|---|---|
| RA-R1 | `fxKeyNorm`/`fx_key_norm` (partición por mayúsculas y separadores, minúsculas ASCII); `exchange`/`equivalent` por subcadena, `dop`/`fx` por palabra, `currency` por palabra; política NULL/ausente/vacía/desconocida ⇒ `SHAPE_INVALID` explícito en SQL (el modelo ya la rechazaba) | AC8b (38 vectores compartidos modelo↔SQL + 5 límites declarados + fuzz determinista de ~390 claves, incluidas no ASCII), AC8c; mutantes M26–M31, S19–S24 |
| RA-R2 | sin cambio de SQL: `usable()` ya recibía `t`; prueba determinista antes/igual/después con la fila sintética como `c1_owner`; S02 deja de ser equivalente | AC3d (SQL), AC3e (modelo); M32 |
| RA-R3 | `tests/lab/lifecycle.js`: PID acreditado + parada observada o retención y exit 5; tri-estado; solo directorio/PID propios | `run_lifecycle_tests.js` (12), `run_fault_injection_lifecycle.js` (10 mutantes), `run_lifecycle_faults.js` (7 casos reales con fallo inyectado) |

**Equivalentes (fuera del conteo de muertos, con condiciones):** M25 — redundante con `RETENTION_SHORT` bajo publicación que fija horizonte/retención y sin mutación operativa posterior. S04 — redundante bajo FK activa y disparador TRUNCATE de `ledger` habilitado (`revisions` sola queda bloqueada por la FK; el truncado conjunto incluye `ledger`); no hay promesa frente a propietario que altere DDL ni superusuario; no se cuenta como detectado ni se retira la defensa. Se retira el texto de equivalencia obsoleto de M24 (se detecta, AC1d).

**No se hace:** no se aprueba ni implementa FX; no se amplía a scanner universal; no se tocan congelados, kernel, productores, adaptador PR14, fuentes comerciales, SQL externo, Supabase, VPS/n8n, apps, host ni PII; sin ronda global nueva (solo suites RA-1 v1.1).
