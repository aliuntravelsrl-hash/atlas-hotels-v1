# Reglas del Director para Core 1 (precio de referencia hotelero)
**Fuente:** mensajes del Director General Aldo Hilario en el chat con ATLAS-TECH, 23-Oct-2026 (America/La_Paz). **Registro:** ATLAS-TECH.
Estas reglas **mandan sobre cualquier versión** del motor. Si una versión las contradice, esa versión se corrige con versión nueva.

## Alcance del cálculo
1. Core 1 calcula **solo**: tipo de habitación, cantidad de personas, ocupación/tipo de ocupación, precio por persona y noche, y precio de niños por edad.
2. Suplementos (galas, etc.) llegan como **notas de voucher**, fuera del cálculo. Impuestos: por nota o factura; los servicios suelen ser con impuestos incluidos. La política del hotel no entra al cálculo.

## Fuente única
3. **Hotel Maestro** (Admin) es la fuente del consumo y su vista SSOT: lo que no está ahí no existe. **Monitor Integrity** es el monitor visual. Ambos consumen **el mismo camino de datos** que refleja la web.
4. Las tarifas son **de consulta** (no pagables), manuales/asíncronas. Un error de tarifa significa "no se vende": falla cerrada a "Consultar". Prohibido inferir (100 USD, 58.5, niño 50 %, 0 sin precio).
5. Orígenes confiables: lo que el Director pasa por chat y la web oficial de la propiedad.
6. Que cualquiera pueda cambiar tarifas es incorrecto (riesgo técnico F-SEC-01, problema separado).
7. Dos mecanismos distintos: **ingesta de tarifas** (Telegram → parser Gemini → rates) y **ofertas de marketing** (travel_dates → WF-MKT-GENERATE-OFFER), distintos de las ofertas de venta.

## Ocupación y edades
8. SGL, DBL y TPL **varían** y los controla Hotel Maestro, igual que la ocupación máxima por tipo de habitación.
9. Base por **número de adultos** tras reclasificar: 1 = SGL, 2 = DBL, 3 = TPL; 4+ solo si el hotel declara esa base. De 13 a 17 años se calcula como **adulto** mientras Hotel Maestro no indique otra cosa (el 13 es un dato de la propiedad, no del motor).
10. El precio del niño se calcula sobre el **DBL por persona** (p. ej. 50 %), salvo monto fijo o excepción que declare el hotel. Si el hotel fija 35, se usa 35: **50 no es valor por defecto**. Ejemplo: DBL 100 por adulto = 200; 1 adulto + 1 niño = SGL 150 + 50 = 200.
11. Se cobra la **edad que declara el cliente**; no hay verificación propia. (Cláusula de veracidad en términos y condiciones: fase posterior, por propiedad, revisión legal.)
12. El motor **no lleva números propios**: todo número sale de un campo visible en Hotel Maestro con su origen.

## Vigencia y caducidad
13. Una condición con caducidad (oferta) **no cambia el tarifario**: la nota queda como base de consulta y avisa que hay que confirmar con el proveedor (responsable: Ops). Aviso previo: **7 días**. Si no hay un humano presente, el dato debe ser visible para humanos y para el vendedor IA. Las notas no se borran.
14. Rangos de fechas solapados: manda el **dato vigente más reciente de ingesta**; la tarifa vieja no se borra, **caduca**.
15. La web pública muestra **"referencia sujeta a confirmación"**, sin el detalle interno de caducidad.

## Interfaz (alcance aprobado de esta fase)
16. No se modifica el diseño existente. Lo único que se agrega es el **modal "Edad de niños"** en Hotel Maestro; el hotel booking form hereda la misma casilla (sincronizados). El resto de pantallas propuestas queda diferido hasta su aprobación.
17. El núcleo no cambia; cambia el conocimiento: se inventaría hotel por hotel qué hay y qué falta, empezando por un hotel modelo.

## Pendiente de decisión del Director
- Cómo cargar SGL/DBL/TPL sin cambiar el diseño del formulario de tarifas (hoy solo Adulto/Niño).
- Hotel modelo propuesto: Viva Miches (por confirmar).
- Hoja de inventario por hotel (por confirmar).
