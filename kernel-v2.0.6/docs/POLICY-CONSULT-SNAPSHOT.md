# Política de snapshot en consultas — kernel v2.0.6-candidate (alternativa A)
Clasificación en `verifyConsultIntegrity(rq, quote)` → `{ fatal, absent }` (orden de decisión):
1. `context_evidence` omitido o null → **ausente**.
2. `context_evidence` no es objeto simple → `SNAPSHOT_SHAPE_INVALID`.
3. Sin propiedad propia `evaluation_snapshot` → **ausente**. (Propiedad propia con `undefined`/null/tipo erróneo ⇒ presentada ⇒ `SNAPSHOT_SHAPE_INVALID`.)
4. `snapshot_version` = `EVAL-SNAPSHOT-v1` → `EVALUATION_SNAPSHOT_CONTRACT_OUTDATED`; distinta de `EVAL-SNAPSHOT-v2` → `SNAPSHOT_SHAPE_INVALID`.
5. Claves cerradas/tipos/hex inválidos → `SNAPSHOT_SHAPE_INVALID`.
6. Huellas en orden: id de solicitud, solicitud, DTO, fingerprint (consulta ⇒ null), vista interna (si existe), depósito (si existe), FX, perfil → `SNAPSHOT_*_MISMATCH`.
7. Consistente → continúa; proyección interna solo con actor interno y R1/R2.
Ausente: `priceReadiness` añade `EVALUATION_SNAPSHOT_ABSENT` y marca `snapshot_absent`; `index.js` no proyecta `internal`.
Un snapshot presentado y no aceptable nunca se degrada a ausencia. Digest consistente ≠ autenticidad.
