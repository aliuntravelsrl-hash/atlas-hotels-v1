# Core 1 — precio de referencia v2.2.2 (INERTE, candidata, no adoptada)
**Base:** v2.2.1 (carpeta intacta). **Cambio único de mecanismo:** el desempate de rangos solapados usa `received_at` (instante UTC de ingesta; candidato natural: `rates.created_at`) en vez de `received_on` (solo fecha). Decisión del Director 23-Oct 10:45 y 11:39: manda la ingesta más reciente; la vieja caduca, no se borra. El campo exacto lo delegó a ATLAS-TECH.
- Sin `received_at` en alguna fila elegible, o empate exacto del instante ⇒ "Consultar" (`RATE_AMBIGUOUS`). `received_on` ya no ordena; no se infiere hora.
- `received_at` debe ser UTC con `Z`; sin zona o inválido ⇒ `INPUT_INVALID`.
- Una fila más reciente no vigente (inactiva, placeholder, no verificada) no desplaza a la anterior (heredado).
- Contexto: `CORE1-PRICE-CONTEXT-v2.2.2` (no retrocompatible con v2.2.1). Motor: `CORE1-PRICE-ENGINE-v2.2.2`.
- Vectores: 115 (107 de v2.2.1 con instantes en lugar de fechas + G15–G20 de desempate horario + J01/J02 de moneda del monto fijo: la fila dicta la moneda; sin FX no se convierte).
- Alcance: coherencia modelo↔oráculos sintéticos. No prueba SQL (no existe), Admin ni portal. Cifras 100/150/50 % del ejemplo del Director; el resto inventado.
- La tasa de cambio no es de este modelo: llega en el contexto desde el núcleo Mission Control (FIN-ID-001).
Uso: `python3 -I core1_reference_model_v2_2_2.py.inert CORE1-BASE-PRICE-REGRESSION-v2.2.2-ATLAS-TECH.json`
