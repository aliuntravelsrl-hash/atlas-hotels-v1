# CORE1-PRICE v2.2 — modelo de referencia (INERTE, no adoptado, no desplegado)

Autor: ATLAS-TECH (AP-03) · 2026-10-23 · Fuente normativa: mensajes del Director del 23-Oct-2026 (chat).
v2 y v2.1 se conservan **intactos** (hashes de v2.1 verificados antes y después). Un mecanismo modificado => versión nueva.

## Qué cambia respecto de v2.1

| Tema | v2.1 | v2.2 (regla del Director) |
|---|---|---|
| Alcance del cálculo | habitación + adultos + niños + **suplementos** + bloqueo por impuestos | solo habitación, personas, ocupación, precio por persona y noche, niños por edad |
| Suplementos | se suman al total o bloquean | **notas** (`supplement_notes`), nunca al total |
| Impuestos desconocidos | bloquean (SOURCE_SUBTOTAL_ONLY) | aviso `TAX_NOTE_SEE_INVOICE`; se cotiza. La base NET (comisión) sigue sin ser precio al cliente |
| Precio adulto | `TIER_PER_ADULT` / `BASE_PLUS_EXTRA` / unidades ROOM_* y *_STAY | `occupancy_rates` SGL/DBL/TPL(/QUAD) por persona y noche; otras unidades => `UNIT_NOT_SUPPORTED_V2_2` |
| Base | declarada por tarifa | **por adultos tras reclasificar**: 1=SGL, 2=DBL, 3=TPL, 4=QUAD solo si el hotel lo declara |
| Niños | bandas por edad decimal `[from,to)` | bandas de edad **entera** `from_age..to_age` inclusiva; precio `FREE` explícito, `PERCENT_OF_DBL` o `FIXED_AMOUNT` |
| Adolescente | no existía | edad >= `adult_from_age` (dato de la propiedad; estándar 13) cuenta como adulto **por noche, según la fila** |
| Valores por defecto | 0 admitido en importes | **ninguno**: 0 no es precio (`PRICE_ZERO_NOT_ACCEPTED`); sin dato => Consultar |
| Capacidad | `max_adults`/`max_children` | `capacity.max_total/max_adults/max_children` obligatorias; excedida => `CAPACITY_EXCEEDED` |
| Edad del niño | decimal admitido | entero 0..17 obligatorio; `children_count` sin edades => `CHILD_AGE_MISSING` |
| Ventana de venta / ofertas | `SALE_WINDOW_CLOSED` bloquea | **no bloquea**: condición con estado VIGENTE/POR_VENCER/VENCIDA que no altera el monto |
| Etiqueta | — | toda cotización completa: `REFERENCE_SUBJECT_TO_CONFIRMATION` |
| Trazabilidad | `sources` implícitas | `room_breakdown` por noche (fila, revisión, base, línea por niño) y `sources_used` |
| FX / depósito / mínimo de grupo / firma | — | sin cambios |
| `--upgrade-legacy` | sí | no aplica (contexto `CORE1-PRICE-CONTEXT-v2.2`, no retrocompatible) |

## Archivos
- `core1_reference_model_v2_2.py.inert` — modelo de referencia (Python, Fraction, sin red ni DB).
- `CORE1-BASE-PRICE-REGRESSION-v2.2-ATLAS-TECH.json` — 97 vectores sintéticos (cifras 100/150/50 % del ejemplo del Director; el resto, inventado).
- `tests/build_v2_2_cases.py.inert` — generador de los vectores.
- `EXECUTOR-PROMPT` en `reports/PROMPT-EJECUTOR-CORE1-HOTEL-MAESTRO-EDADES-OCUPACION-v1-ATLAS-TECH-20261023.md`.

## Ejecutar (solo modelo)
```
python3 -I core1_reference_model_v2_2.py.inert CORE1-BASE-PRICE-REGRESSION-v2.2-ATLAS-TECH.json
```

## Lo que NO prueba
Coherencia modelo↔oráculo únicamente. **No** prueba SQL, Admin, web ni adaptador. No hay versión SQL v2.2 todavía: se
construye cuando el Curador decida Opción A/B de fuente única (ver prompt, §3) para no duplicar tablas.

## Decisiones del Director aplicadas (23-Oct-2026)
SGL/DBL/TPL varían y los controla Hotel Maestro · base por número de adultos · 13+ = adulto como estándar, excepciones por
propiedad con referencia · porcentaje de niño sobre el DBL por persona salvo monto fijo declarado · el motor no lleva
números propios · la caducidad de una oferta no cambia el tarifario hasta cargar uno nuevo vigente · la web pública muestra
"referencia sujeta a confirmación".

## Pendiente de decisión
Precedencia de rangos solapados (hoy => Consultar) · plazo de aviso previo = **7 días** (decidido; es dato de política, no código del motor) ·
adolescente con tarifa propia (decidido: paga como adulto hasta que Hotel Maestro indique otra cosa) · base de 4+ adultos (QUAD solo si el hotel lo declara).

## Efecto secundario a tener presente
La reclasificación se evalúa **por noche con la fila vigente esa noche**: si un cambio de temporada cambia `adult_from_age`,
una misma persona puede ser niño una noche y adulto la siguiente (vector V22-G02). Es coherente con "cada propiedad fija su regla",
pero conviene que el Director lo confirme.
