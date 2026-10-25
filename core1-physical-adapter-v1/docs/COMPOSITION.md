# Composición elegida (SPEC §«Límite de interfaz síncrona») — composición 1
Los puertos del productor v1.1 son **síncronos** (`checked()` lee `r.ok/revision/data`; `currentRevisions` se llama sin `await`). Una Promise no los satisface. El adaptador no cambia el productor, el kernel ni el motor.

```
produce(input) [async]
 1. sonda: el productor v1.1 corre con puertos que lanzan; si llega a resolveSelection, identidad, política y solicitud ya son válidas (se capturan hotel_ref/plan/room_ref).
    Si no llega (DENEGADO / SOLICITUD_INVALIDA) su salida se devuelve tal cual: NINGUNA lectura antes de autorizar.
 2. etapa asíncrona: revisions.pin(sel) fija 4 revisiones INMUTABLES y retenidas (autoridad inyectada). Cada lector lee EN esa revisión.
    selección → tarifas → perfil → política; el primer fallo se normaliza al catálogo cerrado (UNAVAILABLE|NOT_FOUND|REVISION_MISSING|SHAPE_INVALID).
 3. evaluación PURA síncrona: productor v1.1 con repos de valores ya resueltos (nunca Promises). Su currentRevisions es la fijación y NO es prueba de no deriva.
 4. relectura asíncrona: revisions.current(...). Solo si coincide EXACTAMENTE con la fijación se entrega el resultado.
    Si difiere, falla o no tiene forma: el provisional se DESCARTA y se emite la salida de deriva del propio productor (CONSULTAR + READ_DRIFT_DETECTED), sin total, preparación ni proyección interna.
```
* Sin revisión inmutable acreditada ⇒ no listo (`CONTEXT_REVISION_MISSING`). No hay «revisión 1» por defecto, ni hash de lecturas mutables, ni colección temporal de revisiones, ni caché de autoridad.
* Reloj e id de solicitud se reutilizan entre ejecuciones internas ⇒ salida reproducible.
* Alternativa 2 (productor asíncrono) no necesaria ⇒ no se creó productor nuevo; v1.1 intacto. Lectura transaccional coherente: no implementada ni expuesta.
