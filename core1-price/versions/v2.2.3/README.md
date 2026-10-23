# Core 1 — precio de referencia v2.2.3 (INERTE, candidata, no adoptada)
**Base:** v2.2.2 (carpeta intacta). **Cambios de mecanismo (OBS-208 V11-R1/R4):**
1. La rama `SOURCE_SUBTOTAL_ONLY` (base NET o desconocida) ya **no pierde** condiciones (con su estado VENCIDA/POR_VENCER), notas de suplemento, fuentes, supersesión ni desglose de las filas realmente usadas. El monto sigue sin ser precio cliente.
2. `sources_used` declara por fila `price_basis` y `taxes_included`, para que ningún consumidor deba suponer qué representa el subtotal.
- Contexto `CORE1-PRICE-CONTEXT-v2.2.3`; motor `CORE1-PRICE-ENGINE-v2.2.3`. No retrocompatible con v2.2.2.
- Vectores: 120 (115 de v2.2.2 + K01–K05). Mutación (quitar condiciones/notas de la rama NET) detectada.
- Alcance: coherencia modelo↔oráculos sintéticos. Sin SQL (no existe), Admin ni portal. Cifras 100/150/50 % del ejemplo del Director; el resto inventado.
Uso: `python3 -I core1_reference_model_v2_2_3.py.inert CORE1-BASE-PRICE-REGRESSION-v2.2.3-ATLAS-TECH.json`
