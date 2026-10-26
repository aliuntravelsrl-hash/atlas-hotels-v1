# Composición elegida (SPEC §«Límite de interfaz síncrona») — composición 1
Los puertos del productor v1.1 son **síncronos** (`checked()` lee `r.ok/revision/data`; `currentRevisions` se llama sin `await`). Una Promise no los satisface. El adaptador no cambia el productor, el kernel ni el motor.

```
produce(input) [async]
 1. sonda: el productor v1.1 corre con puertos que lanzan; si llega a resolveSelection, identidad, política y solicitud ya son válidas (se capturan hotel_ref/plan/room_ref).
    Si no llega (DENEGADO / SOLICITUD_INVALIDA) su salida se devuelve tal cual: NINGUNA lectura antes de autorizar.
 2. etapa asíncrona: revisions.pin(sel) fija 4 revisiones INMUTABLES y retenidas (autoridad inyectada). Cada lector lee EN esa revisión.
    selección → tarifas → perfil → política; el primer fallo se normaliza al catálogo cerrado (UNAVAILABLE|NOT_FOUND|REVISION_MISSING|SHAPE_INVALID).
 3. CÁLCULO (PA-R1 residual, OBS-230): una única ejecución del productor v1.1 con la hora original, las revisiones fijadas y un registrador del puente pesado; se captura el paquete (cotización con computed_at/valid_until/snapshot). Esta salida NUNCA se entrega.
 4. relectura asíncrona: revisions.current(...) DESPUÉS del cálculo — ÚLTIMA espera (PA-R2). Si difiere, falla o no tiene forma: se emite la salida de deriva del propio productor (CONSULTAR + READ_DRIFT_DETECTED), sin total, preparación ni proyección interna; el cálculo se descarta y no se repite.
 5. gate temporal sobre el MISMO paquete: solo si la relectura coincide EXACTAMENTE, se toma una hora FRESCA (deps.clock()) tras el cálculo y la relectura, y se reevalúa SINCRÓNICAMENTE con un puente que devuelve el paquete capturado (sin trabajo pesado) usando (hora original, hora fresca):
    la hora original conserva computed_at/valid_until/snapshot (NO se rejuvenece); la fresca es el «ahora» del kernel congelado.
    Vencimiento exacto o posterior ⇒ QUOTE_EXPIRED; hora ausente/inválida/que lanza ⇒ NOW_INVALID; retroceso antes de computed_at ⇒ QUOTE_FROM_FUTURE (códigos existentes). No se entrega LISTO, total, preparación completa ni proyección interna.
    Orden real: pin → lecturas → cálculo (puente) → revisions.current → hora fresca → kernel. Un solo cálculo pesado y una sola relectura.
```
* Sin revisión inmutable acreditada ⇒ no listo (`CONTEXT_REVISION_MISSING`). No hay «revisión 1» por defecto, ni hash de lecturas mutables, ni colección temporal de revisiones, ni caché de autoridad.
* Reloj: la sonda toma la hora original; las ejecuciones internas la reutilizan (salida reproducible) salvo la hora fresca de la frontera de entrega. El id de solicitud se reutiliza.
* Historia del orden: v1 evaluaba y releía después pero entregaba el provisional (PA-R1); la corrección intermedia releía ANTES del cálculo (PA-R2: perdía la deriva durante el cálculo y muestreaba la hora antes del puente). El orden vigente es cálculo → relectura → gate temporal sobre el mismo paquete; ningún resultado provisional se entrega.
* Alternativa 2 (productor asíncrono) no necesaria ⇒ no se creó productor nuevo; v1.1 intacto. Lectura transaccional coherente: no implementada ni expuesta.
