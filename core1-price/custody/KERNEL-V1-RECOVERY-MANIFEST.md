# Manifiesto de recuperación — Mirror Kernel v1 (sin modificar)
**Baseline exacta:** `main` @ `21dfd63a9edbdf76962cb4170f3177de2c6176df` (commit del vault que contiene kernel, pruebas, spec y scripts de v1.0.0). No confundir con `e58880e`, hash citado en la bitácora para la entrada 1.0.0 (referencia histórica distinta; no se usa aquí como destino de tag).
**Preparado:** ATLAS-TECH (AP-03), 2026-10-23, según OBS-207. Origen del kernel: **nativo del vault**; no proviene de los changesets de Office.
**Verificación:** 10 rutas; blob y SHA256 completos calculados desde el commit baseline y comparados byte a byte con el árbol de trabajo actual (todas idénticas: kernel sin modificar).

**Tag solo PROPUESTO, no creado en este mandato:** `hotel-integrity-kernel-v1.0.0` → `21dfd63a9edbdf76962cb4170f3177de2c6176df`. Antes de crearlo confirmar que no existe o que apunta a ese mismo commit; nunca mover un tag existente.
Recuperación: `git checkout 21dfd63a9edbdf76962cb4170f3177de2c6176df -- kernel tests spec scripts`.

| Ruta | git blob (completo) | SHA256 (completo) |
|---|---|---|
| `kernel/HotelIntegrityEvaluator.js` | `cd02d6b54cf771fb4a02ce5eac65c8f7e69bf185` | `826ee64b73eb0fb3e5cb8f208b5e96563a3372c95365df633574c09a564c8a7c` |
| `kernel/HotelRouteDispatcher.js` | `23aac17536ee633ab163b1ce8e4325e2af3b4988` | `1d5872ec5aa488704f90ba6894fabd2a2c383ec599a8160b2c746d8bf2fe745c` |
| `kernel/HotelVariableAccumulator.js` | `37219d81df371f4e1b5f371fc1029074a297e1f0` | `7571f202705c801aa443e46ea35b64ffe7a4cb6ec862671d51e475a319800f77` |
| `kernel/index.js` | `79366eb7e0016129a695ab23131bcdd1df3ce955` | `5a98cdcbb8ec55b09e3a76740b6e37faf17ac5c57bef2d6f09027752c58e526f` |
| `scripts/audit_live_supabase_hotels.js` | `d6237c720728e140cbc32e89011067629ecd43a1` | `688303435c893dda14d366cbd8f2b18686c678425ff2be479d47ddd9d4760163` |
| `spec/HOTEL-VARIABLE-SCHEMA.json` | `c695009b082654e8d9f18e2c372b14292375cf30` | `c450feaa787424dedc56c3a81f75e3e92453a7680e44e4aa49d604dec48c5b0d` |
| `spec/MIRROR-KERNEL-HOTEL-SPEC-v1.md` | `42f8028c91bff499c9a7b92d9219e8227029f0a7` | `715ce3d7ea5ecf49d72efa5c2b690f6ae2e506d4860a387130c6c23be62e5b27` |
| `spec/ROUTE-DISPATCH-CONTRACT.md` | `82161388eb8ac02142866887c6a319187569a96b` | `0090a5cf9091f0ee467c30c04211b9d94c38ef18c4464e25b8305d6f84814eed` |
| `tests/kernel_evaluation.test.js` | `e6d1625c49d4ed816f2d8b7a7cc4de50df1e9106` | `1d9e7dd45c4bd3891724cecf1b289bf0622ff59f86dd2266f1546a239afb10b3` |
| `tests/variable_accumulation.test.js` | `a8e35eac65d5cde3083199164b0fd26e70f388b3` | `a3d3564b2de0cbe22b9cc6c9fbc42978ce68f52b32065a90e145061c25aeef0f` |
