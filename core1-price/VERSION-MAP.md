# Mapa de versiones — Core 1 precio de referencia
Una versión publicada **no se edita**. Mecanismo modificado => versión nueva. Estado de todas: **INERTE / no adoptada / no desplegada / SQL nunca ejecutado**.

| Versión | Carpeta | Qué es | Vectores (modelo) | Sustituida por |
|---|---|---|---|---|
| v1 | `versions/v1` | Primer changeset de precio base (mapeo + precio). Corregido por dictamen OBS-202. | 36 (fixtures legacy) | v2 |
| v2 | `versions/v2` | Correcciones CS-R1..CS-R10: procedencia, unidades, FX, capacidad. | 43 | v2.1 |
| v2.1 | `versions/v2.1` | Correcciones pre-SQL (OBS-203): schema, ACL, rollback, FX con tope 24 h. Aún suma suplementos y bloquea por impuestos desconocidos. | 61 (+36 legacy) | v2.2 |
| v2.2 | `versions/v2.2` | Reglas del Director 23-Oct: base por adultos, bandas de edad, niño sobre DBL, sin valores por defecto, suplementos/impuestos como notas, condiciones con estado. | 97 | v2.2.1 |
| **v2.2.1** | `versions/v2.2.1` | v2.2 + precedencia de rangos solapados: manda la tarifa vigente de ingesta más reciente (`received_on`); la anterior caduca, no se borra. | **107** | — (vigente de referencia) |
| consumer-adapter-v1 | `versions/consumer-adapter-v1` | Diseño del adaptador de consumo (servidor simulado, DTO público, cliente). Debe evolucionar a v1.1 para edades/condiciones. | 31 + 28 (simulados) | pendiente v1.1 |

## Contratos de contexto
`CORE1-PRICE-CONTEXT-v2` → `…-v2.1`(compat. legacy) → `…-v2.2` → `…-v2.2.1`. Cada contexto nuevo **no** es retrocompatible con el anterior.

## Notas de la última versión
- v2.2.1 usa `received_on` (fecha) para el desempate; la fecha de ingesta real (`rates.created_at`) tiene precisión de instante. Si dos ingestas ocurren el mismo día hoy responde "Consultar". Ajuste previsto en una versión posterior cuando se fije el campo definitivo.
- No existe versión SQL de v2.2/v2.2.1: depende de la decisión del Curador sobre fuente única (extender tablas existentes con procedencia vs. tablas cerradas).

## Procedencia
Copias exactas (hash en `../MANIFEST.sha256`) de `atlas-curator-office`, rama `atlas-tech/core1-price-changeset-v2`, commit `74c7262`. Los informes y dictámenes (Curador y ATLAS-TECH) permanecen en `atlas-curator-office/reports` y `specs`.
