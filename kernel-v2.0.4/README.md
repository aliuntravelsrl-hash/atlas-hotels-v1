# HOTEL-INTEGRITY v2.0.4-candidate — MODELO/SIMULACIÓN OFFLINE; NO DESPLEGADO; NO ADOPTADO
ATLAS-TECH (AP-03), 2026-10-24. Revisión candidata de `kernel-v2.0.3/` (v2.0.3-candidate, **intacta**), a partir de main 928c745. Origen: SCOPE-CORE1-KERNEL-INTERNAL-ENUM-HARDENING-20261024 (Office 2ba101e) y hallazgo DECLARADO-AT contrastado por el Curator (OBS-223). Kernel v1 sigue siendo la entrada predeterminada (`package.json` main = `kernel/index.js`). Productores v1 y v1.1 sin cambios.
## Cambio de comportamiento (único)
`validateInternalView` cierra por catálogo `calculation_status` y `provider_amount_status` (ver `docs/ENUM-PROVENANCE.md`). Campo ausente, nulo, de tipo incorrecto, vacío, con espacios, otra capitalización o desconocido ⇒ vista inválida ⇒ B `RECHAZADO` con el código existente `INTERNAL_VIEW_SHAPE_INVALID` (fijo; nunca interpola el valor recibido) y sin proyección interna. No se añadieron códigos nuevos. Vista ausente: comportamiento de v2.0.3. Pertenecer al catálogo NO implica LISTO.
## Pruebas
- `npm run test:kernel204` — 101 (los 88 de v2.0.3 + E01…E13).
- `npm run test:kernel204:faults` — mutaciones del kernel (36 heredadas + 17 de catálogo) + control + propagación; un equivalente declarado, no contado como detectado.
- `npm run test:kernel204:producer` — 6 de compatibilidad: v2.0.4 inyectado en el productor v1.1 sin editarlo.
## Límites
Consistencia y vocabulario, no autenticidad ni autorización (backend UNK). Sin matriz de coherencia entre campos (hallazgo separado). Modelo offline sobre `.py.inert`.
