# Acto de transferencia de custodia — PLANTILLA (NO FIRMADA, NO VIGENTE)
**Preparada por:** ATLAS-TECH (AP-03), 2026-10-23, según matriz del Curador (OBS-206). Esta plantilla **no declara** a `atlas-hotels-v1` como custodio adoptado, **no** elimina nada de Office y **no** es un acto de sellado global. Los campos vacíos los completa el Director/Curador.

## 1. Tupla origen → destino
| Objeto | Origen | Destino | Tratamiento del original |
|---|---|---|---|
| Kernel, motores (v1…v2.2.1), adaptador, contratos, pruebas sintéticas | `atlas-curator-office@74c7262` (`changesets/…`) | `atlas-hotels-v1/core1-price/versions/` (inventario: `INVENTORY-CORE1-COPIES.md`) | Se conserva como EVIDENCIA HISTÓRICA / FROZEN con aviso; no se borra |
| Decisiones del DG, dictámenes, addendums, evidencia | `atlas-curator-office/reports,specs` | permanecen | Sin cambios |
| Datos, precios, reglas de negocio | Hotel Maestro / Supabase | permanecen | Sin cambios |
| Leyes COS | Office | no se migran | — |

## 2. Condiciones previas (todas deben cumplirse antes de firmar)
- [ ] Curador revisa y acepta (o corrige) `VLT-01…06` y el inventario.
- [ ] `npm test` y `npm run test:core1:all` pasan en el commit que se firma (hash: ________).
- [ ] No hay edición activa doble: durante la transición solo UNA copia acepta cambios (cuál: ________); la otra queda con aviso FROZEN.
- [ ] Aviso FROZEN preparado en Office (texto propuesto: "Evidencia histórica. Custodia técnica candidata en atlas-hotels-v1; consultar allí versiones vigentes.").
- [ ] Decisión explícita del Director sobre que el vault sea custodio único.

## 3. Datos del acto (vacíos)
- Custodio designado: ________  · Fecha efectiva: ________ (vacía hasta decisión del Director)
- Commit del vault que se transfiere: ________  · Commit de Office de origen: `74c7262`
- Firma Director: ________  · Firma/ACK Curador: ________

## 4. Limitaciones declaradas
- Ninguna versión queda adoptada ni desplegada por este acto; la adopción de v2.2.1 u otra es una decisión aparte.
- No cierra F-SEC-01 (escritura anónima) ni resuelve la fuente única (Opción A/B, §253).
- El archivo de reglas del Director no sustituye este acto.
