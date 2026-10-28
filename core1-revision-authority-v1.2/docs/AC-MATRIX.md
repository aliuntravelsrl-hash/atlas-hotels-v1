# Matriz AC1–AC10 (RA-1 v1.1)

Cada AC: observable · positivo · negativo · mutación · resultado. Modelo = `tests/run_ra1_model_tests.js` (+ `run_fault_injection_model.js`). Lab = `tests/lab/run_lab.js` (PostgreSQL aislado; incluye mutantes SQL en bases desechables separadas). Equivalentes declarados en los ejecutores.

| AC | Observable | Modelo | Laboratorio SQL |
|---|---|---|---|
| AC1 activación/invalidación cambian la cabeza | `current` ⇒ `DRIFT`; token fabricado de no activa ⇒ `REVISION_MISSING` | AC1a–d; M01, M19, M24 | AC1; S15 |
| AC2 dependencias put-once | `IMMUTABLE_OBJECT`, `DEPENDENCY_MISSING/CORRUPT` | AC2a–d; M02, M23 | AC2, AC3c; S13 |
| AC3 integridad/retención en cálculo, última espera y gate | `REVISION_MISSING`, vencimiento real | AC3a–e; M04, M15, M16, M22, M32 | AC3a–c, AC3d; S02 (detectado desde v1.1) |
| AC4 horizonte de toda vista | `HORIZON_MISSING`, `RETENTION_SHORT` | AC4a–b; M03, M05, M06 | AC4, AC3a; S01, S10, S16 |
| AC5 reloj/recepción/importación | `received_at` NULL en histórico; cliente prohibido | AC5a–b; M07, M08, M21 | AC5; S08, S09 |
| AC6 atomicidad, ids no reutilizables, concurrencia | rollback sin huecos de cabeza; una gana, otra `CONFLICT` | AC6a–b; M09, M10, M18, M20 | AC6a–c; S06, S14 |
| AC7 lectura exacta | `NOT_FOUND`, `REVISION_MISSING`, `SHAPE_INVALID` | AC7; M17 | AC7 |
| AC8 FX no aprobado | `FX_CONVERSION_PRESENT`; `FX_BRANCH` solo clasifica | AC8, AC8b, AC8c; M11, M26–M31 | AC8, AC8b, AC8c; S07, S19–S24 |
| AC9 permisos por rol | privilegios efectivos y operaciones reales denegadas | AC9, AC9b; M12, M13, M14 | AC9a–e; S05, S11, S12, S17, S18 |
| AC10 regresión/congelados | `git diff` de carpetas congeladas vacío; sin catálogos públicos | AC10a–d | AC10 |
