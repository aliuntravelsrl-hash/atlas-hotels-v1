# Manifiesto de recuperación — Mirror Kernel v1 (sin modificar)
**Línea base:** rama `main` @ `21dfd63a9edb` (contiene el kernel v1.0.0, baseline 17-Sep-2026, commit `e58880e`). **Preparado:** ATLAS-TECH, 2026-10-23.
Este manifiesto permite recuperar el kernel v1 aunque se cree una versión nueva. **No se creó ningún tag ni se modificó `kernel/`, `tests/`, `spec/` ni `scripts/`.**
Tag propuesto (NO ejecutado, decisión del Curador): `hotel-integrity-kernel-v1.0.0` sobre el commit baseline. Recuperación: `git checkout <commit> -- kernel tests spec scripts`.

| Ruta | git blob | sha256 |
|---|---|---|
| `kernel/HotelIntegrityEvaluator.js` | `cd02d6b54cf7` | `826ee64b73eb0fb3…` |
| `kernel/HotelRouteDispatcher.js` | `23aac17536ee` | `1d5872ec5aa48870…` |
| `kernel/HotelVariableAccumulator.js` | `37219d81df37` | `7571f202705c801a…` |
| `kernel/index.js` | `79366eb7e001` | `5a98cdcbb8ec55b0…` |
| `tests/kernel_evaluation.test.js` | `e6d1625c49d4` | `1d9e7dd45c4bd389…` |
| `tests/variable_accumulation.test.js` | `a8e35eac65d5` | `a3d3564b2de0cbe2…` |
| `spec/HOTEL-VARIABLE-SCHEMA.json` | `c695009b0826` | `c450feaa787424de…` |
| `spec/MIRROR-KERNEL-HOTEL-SPEC-v1.md` | `42f8028c91bf` | `715ce3d7ea5ecf49…` |
| `spec/ROUTE-DISPATCH-CONTRACT.md` | `82161388eb8a` | `0090a5cf9091f0ee…` |
| `scripts/audit_live_supabase_hotels.js` | `d6237c720728` | `688303435c893dda…` |
