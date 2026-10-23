# Mapa de versiones — Core 1 precio de referencia
Una versión publicada **no se edita**. Mecanismo modificado => versión nueva. Estado de todas: **INERTE / no adoptada / no desplegada / SQL nunca ejecutado**.

## Vocabulario de estado (VLT-03)
**Histórico** = superado, se conserva. **Candidata de referencia** = la mejor propuesta técnica actual, sin decisión del Director/Curador. **Adoptada** = decisión formal registrada (ninguna lo está). **Desplegada** = ejecutada en una base de datos/Admin/web (ninguna lo está). **Probada offline** = el modelo/simulación pasa sus vectores sintéticos (no prueba SQL ni producción). Las etiquetas "vigente", "adoptada" o "desplegada" **no** se usan para estas versiones.

| Versión | Carpeta | Histórico | Candidata de referencia | Adoptada | Desplegada | Probada offline | Qué es | Vectores (modelo) | Sustituida por |
|---|---|---|---|---|---|---|---|---|---|
| v1 | `versions/v1` | sí | no | no | no | sí (legacy) | Primer changeset de precio base (mapeo + precio). Corregido por dictamen OBS-202. | 36 (fixtures legacy) | v2 |
| v2 | `versions/v2` | sí | no | no | no | sí | Correcciones CS-R1..CS-R10: procedencia, unidades, FX, capacidad. | 43 | v2.1 |
| v2.1 | `versions/v2.1` | sí | no (base del adaptador v1) | no | no | sí | Correcciones pre-SQL (OBS-203): schema, ACL, rollback, FX con tope 24 h. Aún suma suplementos y bloquea por impuestos desconocidos. | 61 (+36 legacy) | v2.2 |
| v2.2 | `versions/v2.2` | sí | no | no | no | sí | Reglas del Director 23-Oct: base por adultos, bandas de edad, niño sobre DBL, sin valores por defecto, suplementos/impuestos como notas, condiciones con estado. | 97 | v2.2.1 |
| v2.2.1 | `versions/v2.2.1` | sí | no | no | no | sí | v2.2 + precedencia de rangos solapados: manda la tarifa vigente de ingesta más reciente (`received_on`); la anterior caduca, no se borra. | 107 | v2.2.2 |
| **v2.2.2** | `versions/v2.2.2` | no | **sí** | no | no | sí | v2.2.1 con desempate por instante de ingesta (`received_at`, UTC); `received_on` ya no ordena. Moneda del monto fijo probada (J01/J02). | **115** | — (candidata de referencia) |
| consumer-adapter-v1 | `versions/consumer-adapter-v1` | no | no (sigue contexto/motor v2.1) | no | no | sí (simulado) | Diseño del adaptador de consumo (servidor simulado, DTO público, cliente). Debe evolucionar a v1.1 para edades/condiciones. | 31 + 28 (simulados) | pendiente v1.1 |

## No homologaciones (VLT-03)
- El **adaptador v1** sigue el contexto y el motor **v2.1**; no está homologado con el contexto v2.2.2 ni con sus 115 vectores. Requiere v1.1.
- El **SQL v2.1** no está homologado con el modelo v2.2.1 (107 vectores). No existe SQL v2.2/v2.2.1, y el SQL v2.1 nunca se ejecutó.

## Contratos de contexto
`CORE1-PRICE-CONTEXT-v2` → `…-v2.1`(compat. legacy) → `…-v2.2` → `…-v2.2.1` → `…-v2.2.2`. Cada contexto nuevo **no** es retrocompatible con el anterior.

## Notas de la última versión
- v2.2.2 desempata por `received_at` (instante UTC; candidato `rates.created_at`). Un empate exacto o la ausencia del instante responde "Consultar". El campo de base de datos definitivo y su mapeo los fija quien implemente el SQL (no existe aún).
- No existe versión SQL de v2.2/v2.2.1: depende de la decisión del Curador sobre fuente única (extender tablas existentes con procedencia vs. tablas cerradas).

## Procedencia
Copias exactas (hash en `../MANIFEST.sha256`) de `atlas-curator-office`, rama `atlas-tech/core1-price-changeset-v2`, commit `74c7262`. Los informes y dictámenes (Curador y ATLAS-TECH) permanecen en `atlas-curator-office/reports` y `specs`.
