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
| v2.2.2 | `versions/v2.2.2` | sí | no (se conserva; base del adaptador v1.1) | no | no | sí | v2.2.1 con desempate por instante de ingesta (`received_at`, UTC); `received_on` ya no ordena. Moneda del monto fijo probada (J01/J02). | 115 | v2.2.3 |
| **v2.2.3** | `versions/v2.2.3` | no | **sí** | no | no | sí | v2.2.2 + la rama NET conserva notas, suplementos, condiciones, sustitución y procedencia; `sources_used` declara `price_basis` y `taxes_included` (OBS-208 V11-R1). | **120** | — (candidata de referencia) |
| consumer-adapter-v1 | `versions/consumer-adapter-v1` | sí | no (simulación de contexto/motor v2.1; se conserva) | no | no | sí (simulado) | Diseño del adaptador de consumo (servidor simulado, DTO público, cliente). Debe evolucionar a v1.1 para edades/condiciones. | 31 + 28 (simulados) | consumer-adapter-v1.1 |
| consumer-adapter-v1.1 | `versions/consumer-adapter-v1.1` | sí | no (se conserva; contiene los defectos V11-R1..R5 de OBS-208) | no | no | sí (simulado) | Adaptador inerte: tres importes separados (referencia pública / monto proveedor interno / precio final no confirmado), edades enteras, moneda por selección, vista interna operador/vendedor IA, rechazo de versiones incompatibles. | 30 + 24 (simulados) | consumer-adapter-v1.1.1 |
| **consumer-adapter-v1.1.1** | `versions/consumer-adapter-v1.1.1` | no | **sí** (para contexto/motor v2.2.3) | no | no | sí (simulado) | Corrige V11-R1..R5: vista de operador sin pérdida de metadatos en NET; tasa solo si se usa de verdad; `child_ages` estricto; monto proveedor solo con base acreditada (`NET_PROVIDER`), si no `source_subtotal`; esquema DTO cerrado y recursivo con validación real. | 43 + 27 (simulados; no sustituyen los 120 vectores ni prueban SQL/UI) | — |

## No homologaciones (VLT-03)
- El **adaptador v1** sigue el contexto y el motor **v2.1** y se conserva como simulación; no está homologado con v2.2.2. El **adaptador v1.1** simula v2.2.2 y se conserva; el candidato es el **adaptador v1.1.1** para v2.2.3 (inerte, simulado).
- El **SQL v2.1** no está homologado con el modelo v2.2.1 (107 vectores). No existe SQL v2.2, v2.2.1 ni v2.2.2, y el SQL v2.1 nunca se ejecutó.

## Contratos de contexto
`CORE1-PRICE-CONTEXT-v2` → `…-v2.1`(compat. legacy) → `…-v2.2` → `…-v2.2.1` → `…-v2.2.2` → `…-v2.2.3` (el modelo v2.2.3 y el servidor del adaptador v1.1.1 exigen `CORE1-PRICE-CONTEXT-v2.2.3`; un contexto v2.2.2 se rechaza con `CONTEXT_VERSION_MISMATCH`, igual que v1.1 rechaza contextos de otras versiones). Cada contexto nuevo **no** es retrocompatible con el anterior.

## Notas de la última versión
- v2.2.3 sube el contrato de contexto a `CORE1-PRICE-CONTEXT-v2.2.3` (no retrocompatible con v2.2.2); no cambia el cálculo del precio base; la rama NET deja de perder metadatos (V11-R1). 120 vectores.
- v2.2.2 desempata por `received_at` (instante UTC; candidato `rates.created_at`). Un empate exacto o la ausencia del instante responde "Consultar". El campo de base de datos definitivo y su mapeo los fija quien implemente el SQL (no existe aún).
- No existe versión SQL de v2.2/v2.2.1/v2.2.2/v2.2.3: depende del dictamen técnico del Curator y convocatoria del Director sobre fuente única (extender tablas existentes con procedencia vs. tablas cerradas).

## Procedencia
Copias exactas (hash en `../MANIFEST.sha256`) de `atlas-curator-office`, rama `atlas-tech/core1-price-changeset-v2`, commit `74c7262`. Los informes y dictámenes (Curador y ATLAS-TECH) permanecen en `atlas-curator-office/reports` y `specs`.
