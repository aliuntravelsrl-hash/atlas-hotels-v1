# RA-1 v1.2 — delta RA-R3 residual: identidad exacta y cero acciones sin acreditación (OBS-292 / §343)

**FROM:** RA-1 v1.1 en PR #15 @`ff565fb`. Dictamen REVISE acotado (Curator, `84bf20c`): RA-R1 y RA-R2 incorporados; persiste un residual de RA-R3 reproducido con dependencias simuladas: (A) con PID no acreditado `finalizeCleanup` aún llamaba a `pg_ctl stop`; (B) `accreditPid` acreditaba por subcadena (`data-foreign` aceptado cuando se espera `data`).
**WHY:** retener el directorio no protege al proceso destinatario del intento de parada: `pg_ctl` examina `postmaster.pid` para decidir a quién parar. Una prueba (L02/LM05 de v1.1) exigía precisamente ese intento: su oráculo contradecía el límite y se corrige.
**TO:** carpeta nueva `core1-revision-authority-v1.2/`. **Modelo y SQL idénticos a v1.1 byte a byte** (hashes en el informe): no se cambia clasificador (RA-R1) ni límite de retención (RA-R2). Cambian solo `tests/lab/lifecycle.js`, `tests/lab/realdeps.js` (nuevo), `tests/lab/run_lab.js`, `tests/lab/run_lifecycle_faults.js`, `tests/run_lifecycle_tests.js`, `tests/run_fault_injection_lifecycle.js`, docs. v1 y v1.1 quedan intactas y recuperables (`4224e66`, `ff565fb`). PR #15 sigue en BORRADOR.

| Punto del encargo | Cambio | Prueba |
|---|---|---|
| 1. PID no acreditado/ilegible/ajeno: cero stop/señales/borrado | rama no acreditada sin `stopOwn`; solo `recoverRetained` con NUEVA acreditación positiva | L02, L03, L04, L08, L16; fallos reales F1, F4, F7–F9 con traza `actions=0` |
| 2. Identidad exacta, no subcadena; revalidar en el límite | exe + cwd + argv (`-D` único con valor exacto) + `postmaster.pid` línea 2 exacta + instante de inicio; revalidación antes de actuar | L04 (15 variantes), L13–L15, L17; F7 (data-foreign), F8 (PID reciclado), F9 (pidfile cambia) |
| 3. Sondas del Curator | `evidence/curator-probes/cleanup-probes.curator-verbatim.js` (sha256 `cefc8979…`) reproducida: sobre v1.1 sale 0 con `stopCalls:1` y `accredited:true`; sobre v1.2 su afirmación de defecto falla (0 llamadas) y L18 fija la conducta corregida | `probe-on-v1.1.out`, `probe-on-v1.2.out`, L18 |
| 4. Control normal, fallos focales, mutación | C0 normal; F1–F9; 22 mutantes focales | `run_fault_injection_lifecycle.js` |

**Clasificación honesta:** los casos con PID ajeno son SIMULADOS (dependencias inyectadas) y no tocan procesos reales; los fallos F7–F9 usan el proceso PROPIO con una identidad falseada por inyección, no un PID ajeno real. Mutantes: ninguno equivalente declarado. No se repite la ronda SQL/modelo global; se ejecutó una vez el laboratorio completo porque cambió el arnés que lo envuelve (resultados idénticos en suites).
**No se hace:** FX, SQL ni clasificador; congelados, Supabase, VPS/n8n, apps, fuentes comerciales, lectores; sin merge/adopción/producción.
