# Matriz del dominio Hotel — subdominio → datos/evidencia → controles → salida → pruebas → dependencias
ATLAS-TECH (AP-03), 2026-10-23. Estado: **DOCUMENTAL / PROPUESTA**; no implementa nada, no reorganiza carpetas, no mueve versiones congeladas. Árbol del Director: Product Intelligence → Hotel Domain → {hotel_knowledge, habitaciones, restaurantes, actividades, servicios, precios, fulfillment}. Core 1 pertenece a **precios**. Los siete subdominios **no** son siete pilares técnicos: la última columna muestra relaciones.
Convención: **IMPLEMENTADO** = existe código/modelo probado offline en el vault; **PARCIAL** = existe solo como parte de otro mecanismo; **NO INVENTARIADO** = no he inspeccionado datos ni código (no se afirma capacidad alguna).

| Subdominio | Datos / evidencia | Controles (hoy → kernel v2 propuesto) | Salida | Pruebas | Dependencias / relaciones | Estado |
|---|---|---|---|---|---|---|
| hotel_knowledge | Identidad, estrellas, ubicación, multimedia, descripción (fixtures v1 sintéticos; datos reales no inspeccionados) | v1: P1 identidad, P5 multimedia. v2: cada dato `{valor, origen, versión}` o `AUSENTE/NO_VERIFICADO/NO_APLICABLE`; sin estrellas por defecto | Estado A (integridad de contenido) | v1: `tests/kernel_evaluation.test.js`; v2: pruebas de ausentes/no aplicables | Alimenta A; no concede C | PARCIAL (v1) |
| habitaciones | Tipo, capacidad total/adultos/niños, ocupaciones SGL/DBL/TPL/QUAD declaradas, `adult_from_age` | v1: P2 estructura mínima, con `\|\|2`/`\|\|0`. v2: capacidad ausente ⇒ no reservable; sin herencia entre habitaciones; TPL no exigido a DBL | Estado A (parte) y entrada de B por selección | Modelo Core 1 (capacidad, ocupación): vectores v2.2.3 | Entrada de **precios**; Viva Miches como piloto de inventario | PARCIAL |
| restaurantes | — | Sin inspección. v2: `NO_INVENTARIADO` hasta que exista evidencia | — | — | Independiente de precio; informa A cuando exista | NO INVENTARIADO |
| actividades | — | ídem | — | — | Podría vincularse a fulfillment | NO INVENTARIADO |
| servicios | Suplementos obligatorios/opcionales, impuestos, cargos extra (notas de voucher/factura) | Core 1: notas, nunca suma; impuesto desconocido ⇒ nota, no bloquea; cargos extras/daños corren por el usuario | Notas públicas genéricas + detalle interno | Vectores v2.2.2/v2.2.3 (suplementos, impuestos), S12/S13 adaptador v1.1.1 | Depende de **precios**; viaja a fulfillment (voucher) | PARCIAL (como notas) |
| **precios (Core 1)** | Tarifas por proveedor/hotel/habitación/rango/ocupación, niños por edad, FX, condiciones | Un solo motor (Core 1 v2.2.3 candidato). v2: el kernel **consume**, no calcula; datos por selección; FX por autoridad/dirección/vigencia solo si hay conversión | Estado B (preparación de precio por selección) y DTO público/vista interna | 120 vectores + 43/27 adaptador (offline); v2: matriz T1–T10 | Depende de habitaciones, servicios, Hotel Maestro (SSOT), Mission Control (tasa) | IMPLEMENTADO (candidato, no adoptado) |
| fulfillment | Voucher, condiciones de check-in/out, cancelación, reglas del hotel | Hoy: P6 políticas (relleno). v2: `AUSENTE` visible; no entra al cálculo del precio | Notas de voucher/factura | v1 P6; v2 por definir | Consume precios y servicios; propuesta de habilitación C | PARCIAL |
| (transversal) habilitación | — | Estado C: el kernel **propone**; autoridad operativa del servidor verifica; puntuación completa ≠ permiso | Propuesta C | T8, T8b | Depende de A y B | NO IMPLEMENTADO |

## Reglas de la matriz
* Un subdominio sin inventario se marca `NO INVENTARIADO`; no se completa por analogía.
* La extensión de la custodia al producto Hotel no certifica capacidades de subdominios no inspeccionados (acto de custodia).
* Cambiar la estructura de carpetas del vault es un mandato aparte.
