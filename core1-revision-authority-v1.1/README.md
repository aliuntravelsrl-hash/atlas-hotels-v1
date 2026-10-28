# core1-revision-authority-v1.1 — RA-1 v1.1 (CS-2 A+B + RA-R1/R2/R3) — INERTE, SIN DESPLIEGUE

Modelo de referencia ejecutable + SQL candidato inerte + laboratorio PostgreSQL local aislado, todo con datos sintéticos.
No toca kernel, productores, core1-price v2.1 ni adaptador PR14 (congelados). No se fusiona, adopta ni despliega. Ver `docs/RA1-CONTRACT.md` y `docs/AC-MATRIX.md`.

- `npm run test:ra1:model` — AC1–AC10 contra `model/ra1.js` (sin BD/red).
- `npm run test:ra1:faults` — mutantes del modelo (control positivo, exit code, equivalentes declarados).
- `npm run test:ra1:lab` — crea un clúster PostgreSQL 16 NUEVO en un directorio temporal propio (socket privado 0700, sin TCP), verifica identidad antes de DDL, aplica `sql/01-…inert` como `c1_owner`, ejecuta la suite por rol, mutantes SQL en bases `c1_disposable_*` separadas, reversa, y lo detiene/elimina (solo su PID y directorio). Si falta un gate de aislamiento: NO EJECUTADO (exit 4). Separado de `npm test`.
- `tests/lab/evidence/` — log y JSON sintéticos del último laboratorio (sin secretos ni PII).
- `MANIFEST.sha256` — `cd core1-revision-authority-v1 && sha256sum -c MANIFEST.sha256`.

Límites: PASS acredita solo el modelo/esquema en aislamiento. No acredita ninguno de los once vínculos; D1/D2/D3, FIN-ID-001, F-SEC-01 y A-B §253 siguen abiertos. Sin defensa prometida contra superusuario/administrador del SO.

**v1.1 (delta sobre v1 @4224e66; v1 queda intacta):** ver `docs/RA1-V11-DELTA.md`. Scripts: `test:ra1v11:model|faults|lifecycle|lifecycle:faults|lab|lab:lifecycle-real|all` (el lab y los fallos reales usan el mismo puerto: ejecutar en secuencia). Códigos de salida del lab: 0 · 1 · 4 gate (NO EJECUTADO) · 5 limpieza pendiente.
