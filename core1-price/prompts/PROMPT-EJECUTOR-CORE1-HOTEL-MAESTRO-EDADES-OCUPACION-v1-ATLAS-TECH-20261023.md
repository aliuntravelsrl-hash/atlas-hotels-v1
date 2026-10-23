> **AVISO (VLT-04):** este archivo es un documento guardado, **no un despacho operativo**. No lo convoca el Curador ni este repositorio: el Director lo entrega al ejecutor por su ventana (chat/DIR11). Los alcances aquí descritos se atribuyen a la conversación ATLAS-TECH–Director del 23-Oct-2026 (ver `../rules/PROVENANCE-DIRECTOR-INSTRUCTIONS-20261023.md`), no a una orden del Curador. Estado: NO adoptado, NO ejecutado.

# PROMPT PARA EL EJECUTOR — Hotel Maestro: edades, ocupación, parámetros del cálculo y condiciones (Core 1)
2026-10-23 · America/La_Paz · ATLAS-TECH (AP-03) · v1
**Estado:** PROPUESTA LISTA PARA EJECUTOR. Nada de esto está aplicado. ATLAS-TECH no editó Admin, web, n8n ni Supabase.
**Precedencia:** instrucciones del Director del 23-Oct-2026 (chat), listadas en §1. Si algo de este prompt las contradice, mandan ellas.
**Modelo de referencia:** `changesets/core1-price-v2.2.1/` (107 vectores sintéticos; coherencia modelo↔oráculo, SQL no ejecutado).
**Alcance:** UN solo cambio coherente de superficie. Los problemas separados (seguridad F-SEC-01, ingesta Telegram) NO se mezclan aquí (§9).

## 0. Reglas de ejecución
- No inventar tarifas, edades, porcentajes ni capacidades. Sin dato => "Consultar".
- No crear una segunda fuente de precios. Reutilizar `rates`, `rooms`, `pax_pricing_policy`, `room_occupancy_rules`, `hotels_master`.
- No recalcular precios en el navegador. Toda cifra viene del motor (servidor).
- No exponer ni escribir secretos/JWT/IDs de chat en archivos o commits. Sin PII (las edades de menores solo viajan en la solicitud).
- Cada mecanismo modificado cambia de versión; conservar la versión anterior recuperable.
- Antes de DDL: decisión del Curador sobre Opción A (extender tablas existentes con procedencia) u Opción B (tablas cerradas). El principio del Director favorece A.

## 1. Reglas del Director que este cambio debe cumplir (23-Oct-2026)
1. Core 1 calcula SOLO: tipo de habitación, cantidad de personas, ocupación/tipo de ocupación, precio por persona y noche, y precio de niños por edad.
2. Suplementos (galas, etc.) llegan como **notas de voucher**; impuestos por nota/factura; la política del hotel no entra al cálculo.
3. Hotel Maestro es la fuente del consumo: lo que no está ahí no existe. Hotel Maestro y Monitor Integrity leen **lo mismo** que refleja la web.
4. SGL, DBL y TPL **varían** y las controla Hotel Maestro, igual que las reglas de ocupación máxima por tipo de habitación.
5. Base por número de adultos tras reclasificar: 1=SGL, 2=DBL, 3=TPL (4+ solo si el hotel declara la base). Edad >= tope de niño de la propiedad => se calcula como adulto (estándar 13; excepciones por propiedad con referencia). Ej.: 2 adultos + adolescente de 15 = 3 adultos.
6. El precio del niño se calcula sobre el **DBL por persona** (p. ej. 50 %), salvo monto fijo o excepción declarados por el hotel. Si el hotel pone 35, se usa 35; **50 no es valor por defecto**. Hotel Maestro debe controlar el cálculo matemático y mostrar de dónde toma sus números la calculadora (como la tasa base de conversión en Misión Control).
7. Caducidad de ofertas: una tarifa/condición vencida **no cambia el tarifario** hasta cargar uno nuevo vigente. La nota se conserva como base de consulta y avisa que hay que confirmar con el proveedor (responsable: Ops). Si no hay humano presente, el dato debe estar visible para humanos y para el vendedor IA.
8. La web pública muestra **"referencia sujeta a confirmación"** (sin detalle interno de caducidad).
9. Las tarifas son de consulta (no pagables). Error de tarifa = no se vende (falla cerrada a "Consultar"). Nada de 100 USD / 58.5 / 50 % / 0 inferidos.
10. Orígenes confiables: lo que el Director pasa por chat + web oficial de la propiedad.

## 2. Hallazgo base (AS-IS, lectura del commit cd629b5 del repo Admin; no re-verificado hoy)
- El Admin solo maneja precios "Adulto/Niño"; no hay pantalla para edades máximas ni capacidad.
- `room_occupancy_rules` (edades infante/niño/adolescente, máx. niños) y `pax_pricing_policy` (2 filas) existen casi vacías; ambas duplican campos de edad.
- Pestaña de tarifas: etiqueta 'Manual Range' engañosa, fecha con desfase de un día, `child_rate || 0` muestra 0 donde hay nulo.
- Monitor Integrity cuenta "tarifas" de tres formas distintas.
**Verificar por lectura antes de tocar** (el AS-IS puede haber cambiado) y reportar diferencias al Curador.

## 3. Datos (decisión previa del Curador — no ejecutar DDL sin ella)
Propuesta de ubicación, sin tabla de precios nueva:
| Dato | Dónde | Nivel |
|---|---|---|
| `adult_from_age`, bandas de edad (`from_age`,`to_age` enteros, inclusivos), precio de banda (`FREE`/`PERCENT_OF_DBL`/`FIXED_AMOUNT`), `max_per_room`, `min_adults` | `pax_pricing_policy` (una sola ubicación para edades) | propiedad, por rango de estancia u oferta |
| `max_total`, `max_adults`, `max_children` | `room_occupancy_rules` | tipo de habitación |
| SGL, DBL, TPL, (QUAD) por persona y noche | `rates` (columnas por ocupación) | tipo de habitación × rango de estancia |
| Origen (chat/web oficial/documento), fecha de recepción, referencia | cada regla/tarifa | por registro |
| Condición con caducidad: texto, `expires_on`, estado, responsable | asociada a la fila de tarifa | por condición |
| Registro de notas de revisión (abierta/vencida/resuelta + evidencia de cierre) | tabla nueva de **registro** (no de precios) — requiere decisión del Curador | por nota |
- Cada edad vive en **un solo lugar** (resolver la duplicación entre las dos tablas).
- `FREE` es un modo explícito; un `0.00` en `rates` **no** equivale a gratis.
- Las notas no se borran: se cierran con evidencia (confirmación del proveedor / tarifario nuevo cargado / confirmación de que la oferta terminó).

## 4. Hotel Maestro (Admin) — ALCANCE APROBADO DE ESTA FASE: UN SOLO MODAL "Edad de niños"
**Instrucción del Director (23-Oct, 10:39):** no cambiar el diseño existente; no se acepta ninguna modificación extra aparte de agregar el modal de edad de niños. El booking form hereda la misma casilla (sincronizados).
- Un único modal "Edad de niños", abierto desde un control mínimo en la pantalla existente de la propiedad, con el estilo de los modales ya usados (p. ej. HotelDetailsModal). Sin reordenar pestañas, sin cambiar estilos ni otros formularios.
- Campos propuestos (mapean a columnas **ya existentes** de `pax_pricing_policy`: `infant_max_age`, `child_max_age`, `children_free_max_age`, `children_free_count`; confirmar por lectura antes de tocar, sin DDL):
  - Infante hasta N años.
  - Niño hasta N años.
  - Gratis hasta N años y máximo de niños gratis por habitación (si aplica).
  - "Adulto desde" se **muestra calculado** (niño hasta + 1). Regla del Director: de 13 a 17 pagan como adulto mientras Hotel Maestro no diga otra cosa.
- El precio del niño sigue cargándose donde ya se carga (campo Niño de la tarifa). El modal no lo duplica.
- Sin campos adicionales (ni origen, ni fechas, ni notas) en esta fase.
- **DIFERIDO, NO APROBADO:** pantalla de capacidad, columnas SGL/DBL/TPL en el formulario de tarifas, panel "De dónde sale cada número", simulador, campo de condiciones con caducidad, y las correcciones visuales del §2. Quedan como propuesta para cuando el Director las apruebe.
- Pendiente de decisión del Director: hoy el formulario de tarifas solo carga Adulto/Niño; sin SGL/DBL/TPL cargables el motor no puede cotizar 1 o 3 adultos (respondería "Consultar").

## 5. Hotel booking form (hereda la misma casilla; sync con el modal)
Los límites de edad salen de los mismos datos que edita el modal; un cambio en Hotel Maestro se refleja en el formulario sin otra configuración. Interpretación de ATLAS-TECH a confirmar con el Director.
1. Por cada niño pedir **edad entera 0–17**; sin edad => no cotiza ("Consultar").
2. Edad = edad cumplida en la fecha de entrada; si cumple años durante la estadía, nota (no recalcular).
3. El formulario **envía** adultos y edades; la reclasificación a adulto (>= `adult_from_age`) la hace el **servidor** y el formulario solo la muestra (ocupación resultante, p. ej. doble + niño → triple).
4. Validar capacidad con la ocupación ya reclasificada; si no cabe => "Consultar".
5. Mostrar "referencia sujeta a confirmación"; no exponer el estado interno de caducidad.
6. Las edades viajan en la solicitud de reserva (el hotel las necesita para la gratuidad) y no se publican.

## 6. Contrato del adaptador de consumo (versión nueva v1.1; v1 intacta)
- Entrada: `rooms[{room_type_id, adults, child_ages:[int], children_count?}]`.
- Salida: lo definido por el modelo v2.2: `display_label`, `room_breakdown` (por noche: base, adultos efectivos, edades reclasificadas, líneas por niño), `conditions[{status, review_required}]`, `supplement_notes`, `warnings`, `sources_used`.
- El vendedor IA recibe `conditions` y puede decir "tarifa de referencia; la condición X venció el <fecha>; confirmar con el proveedor".
- Retirar los cálculos de precio del navegador listados en `LEGACY-RETIREMENT-LIST-v1` conforme el servidor los sustituya.

## 7. Monitor Integrity — DIFERIDO (no aprobado en esta fase)
- Leer la **misma** ruta que Hotel Maestro y la web (una sola definición de "tarifa").
- Nueva lista "Condiciones vencidas / por vencer pendientes de confirmar" (hotel, condición, desde cuándo, responsable).
- Marcar como error una cifra de la web que no se pueda rastrear a un campo cargado.
- Corregir los tres conteos distintos de "tarifas" a una definición única.

## 8. Notificación de caducidad — DIFERIDO (no aprobado en esta fase)
- Aviso previo (plazo **pendiente de decisión del Director**; **7 días** (decidido por el Director, 23-Oct 10:39)) y aviso el día de vencimiento, dirigidos al responsable de proveedores (Ops).
- La lista del §7 debe permitir a cualquier persona con acceso ver y actuar si Ops no está presente.
- Sin plazo configurado, el estado POR_VENCER no existe (solo VIGENTE/VENCIDA).

## 8b. Dato requerido por la regla de solape
Cada tarifa debe guardar su **fecha de recepción** (`received_on`) — ya figura en §3 como "fecha de recepción". Sin ella, un solape responde "Consultar". No se agrega pantalla nueva: se completa al cargar o corregir la tarifa por la vía existente.

## 9. Fuera de alcance (problemas separados — no mezclar)
- **F-SEC-01**: la escritura anónima en `rates`/`rooms`/`hotels_master` debe cerrarse por un changeset propio; este cambio asume edición autenticada y con permisos.
- **Ingesta Telegram → parser Gemini → rates** (corrección incompleta) y **ofertas de marketing** (travel_dates → WF-MKT-GENERATE-OFFER): mecanismos distintos; no tocar aquí.
- Hoteles publicados sin tarifas (10): no se publica tarifa inferida; se cargan desde orígenes confiables en otro trabajo.
- Pagos/PayPal: sin cambios.
- **Veracidad de la edad declarada (fase posterior, políticas/T&C por propiedad)**: el Director indicó (23-Oct, 10:31) que se cobra la edad que declara el cliente, sin verificación propia; que al aceptar términos y condiciones el cliente declara que los datos son fieles; y que si el niño resulta mayor de lo declarado, ni Aliun ni el proveedor asumen responsabilidad y los cargos recaen en el cliente. Va en las políticas de cada propiedad. **No se implementa ahora**; la redacción final debe revisarla quien corresponda legalmente.

## 10. Decisiones del Director
Cerradas (23-Oct): aviso previo de **7 días** · de 13 a 17 años pagan como adulto hasta que Hotel Maestro indique otra cosa · la edad declarada se cobra tal cual · UI limitada al modal de edad de niños.
Cerrada además: **solape de rangos => manda la tarifa vigente más reciente por fecha de recepción** (23-Oct 10:45); sin fecha o con empate => "Consultar".
Abiertas: (1) cómo cargar SGL/DBL/TPL sin cambiar el diseño del formulario · (2) base de 4+ adultos (solo si el hotel la declara).

## 11. Aceptación
1. Los 107 vectores de `changesets/core1-price-v2.2.1/` pasan contra la implementación real (no solo contra el modelo).
2. Simulador y web devuelven la misma cifra para el mismo caso; el Monitor puede trazar cada cifra a su campo.
3. Caso de oro con cifras del Director: 2 adultos DBL 100 = 200; 1 adulto + niño (SGL 150 + 50 % de 100) = 200; niño a 35 => 185 con 1 adulto; adolescente 15 con 2 adultos => TPL.
4. Condición vencida: el monto no cambia y la lista del Monitor la muestra; la web pública solo dice "referencia sujeta a confirmación".
5. Sin valores por defecto: borrar un campo => "Consultar".
6. Evidencia: capturas del Admin, resultado de las pruebas y diff; sin secretos.

## 12. Entregar al Curador
Informe con: qué se leyó/cambió, objetos tocados, diferencias con el AS-IS de §2, resultados de los 107 vectores, riesgos y decisión de Opción A/B aplicada.
