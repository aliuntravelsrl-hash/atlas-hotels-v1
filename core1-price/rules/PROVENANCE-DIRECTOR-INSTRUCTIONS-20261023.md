# Procedencia literal de las instrucciones del Director — 23-Oct-2026 (VLT-05)
**Registro:** ATLAS-TECH (AP-03) · **Estado:** CONSOLIDACIÓN ATRIBUIDA AL DIRECTOR · **NO adoptada** como decisión constitucional ni como autorización de implementación.
**Puntero de fuente:** chat Director ↔ ATLAS-TECH, sesión https://claude.ai/code/session_017puGQutBeic9N2xsSsXJ8i (hora local America/La_Paz, UTC-4). La transcripción completa vive en esa sesión; este archivo transcribe el texto exacto de cada mensaje relevante (ortografía original) para trazabilidad literal. Los mensajes con capturas pegadas de la interfaz se transcriben solo en su parte textual de instrucción.
**Efecto de este archivo:** ninguno sobre producción, Admin, base de datos ni tarifas. `DIRECTOR-RULES-CORE1-20261023.md` es una lectura de ATLAS-TECH de estos textos; **este** archivo es la fuente que se contrasta. Ningún archivo de reglas actúa como acto de sellado global.

## 1. Texto exacto de los mensajes
| ID | Hora | Texto (literal) |
|---|---|---|
| M01 | 08:39 | "los cargos de suplementos llegaran en nota en el voucher , si existe algun impuesto llegara en notas no en el calculo , todos los servicios por lo general son con impuestos incluidos , si hay algun impuesto lo dira la factura , y la politica del hotel no es para calcular en precios por persona por noches , tipo de ocupacion , precios de niños , esto si es lo unico que se debe calcular , ocupacion , tipo de ocupacion , tipo de habitacion cantidad de personas" |
| M02 | 08:42 | "esto es lo que debes tomar en cuenta , es sobre hotel maestro de aqui llega el consumo si no esta aqui no existe …" (sigue la captura pegada de la pestaña Tarifas de un hotel; solo se transcribe la instrucción) |
| M03 | 08:44 | "si tenemos que colocar algun dato para nosotros de niños gratis entonces tu lo propones , ahora te pregunto , hotel maestro a que esta conectado ?" |
| M04 | 08:51 | "no deberia ser cualquiera que cambie las tarifas , de hecho estas tarifas son de consultas no es que son aceptadas para pagar e ir al hotel , son asicrono manuales , si la tarifa tiene error simple no se vende , para no dejar la web vacia por falta de datos una vez propusimos llenar por inferencia 100 us de ahi sale el dato harcoreado que queremos eliminar con fuente real" |
| M05 | 08:54 | "origenes confiables los que yo te paso por chat , y la web oficial de la propiedad" |
| M06 | 08:58 | "si tenemos una ingesta manual ,individual y manual masivo es para hacerlo via telegram que de hecho el parce gemini wf de ingesta no quedo 100 % corregido pero si esta contemplado en ingesta marketing oferts , diferente a sales oferts , creo que tenemos 2 mecanismos" |
| M07 | 09:12 | "dejalo en delta , o como tarea para ti mismo , tenemos 2 fuentes que a mi me permiten visualizar desde el admin que esta en la web sin yo ir a la web publica y son , HOTEL MAESTRO Y MONITOR INTEGRITY , quiero saber de donde salen las tarifas que presenta core 1 en la web publica …" |
| M08 | 09:26 | "correcto vamos en la linea correcta , como sabes este es para mi el supabase visual , es mi ssoot , por lo que no tengo que ir a codigo , eso lo haces tu , entonces lo que estoy proponiendo es que los datos pasen por estas rutas para saber lo que refleja la web, que es justo para lo que fueron diseñados uno edita el otro visual monitor , pero consumen lo mismo ." |
| M09 | 09:34 | "hasta ahi vamos bien , el calculo de habitaciones por noches y tipo de ocupacion si cargos extras quedo claro y corregido" |
| M10 | 09:41 | "si es correcto aunque es particular de cada propiedad , podemos ir avanzando con este standard que propones correctamente ,  a partir de 13 años el sistema los calcula como adultos , pues el hotel bookig form debe ademas de sumar el niño debe gestionar la edad del mismo ," |
| M11 | 09:51 | "SGL , DBL ,TPL  varia , no es el mismo  , hotel maestro debe ser quien controle estas tarifas , al igual que las reglas de ocupacion maxima , por tipo de habitacion ,  si la solicitud en el hotel booking form es para 1 adultos la base es SGL , si es 2 adultos la base es dbl ,  si es 3 adultos o el niño , elegido 2 adultos + adolecente de 15 años calcula 3 adultos , al pasar el tope maximo de edad permitida , regla niños ,  infante , niños , adolecente o adultos ,  hotel maestro debe poder manejar esto . con las politica de regla de ocupacion y edad no existe en hotel maestro no puedo colocar la edad maxima necesito esta casilla visual" |
| M12 | 09:55 | "por lo regular 1 adulto y 1 niño es la misma tarifa de 2 adultos . es decir ,  dbl es 100 por adulto 200 us  , cuando el niño generalmente paga 50 %   serian 50  ,   cuando es SGL  la proiedad usa  150 SGL 50 CHILD dando como resultado los mismos 200" |
| M13 | 10:00 | "es correcto sobre la base DBL ,   se calculan los niños salvo exepciones que indiquen lo contrario , por eso hotel maestro debe controlar el calculo matematico  ,  si la propiedad coloca el niño a pagar 35  no debemos colocar 50 por defecto ,   es como usamos la tarifa base de conversion de mision control debemos tener desde donde poder tener control de lo que hace  la calculadora de donde usa sus numeros" |
| M14 | 10:07 | "correcto es importante conocer cuando un hotel cambia la regla de 50 %  debemos tener si es una fecha de oferta por tiempo limitado ,  esto es importante generar una nota delta de revicion a la fecha de caducidad , esto nos servira para poder controlar las ofertas  y la caducidad de las mismas como las que presenta viva miches que te envie ayer ,  estas notas no se deben perder debemos saber como las gestionaremos" |
| M15 | 10:17 | "los precios estaran registrados ,solo que a nosotros humanos  o vendedor ia debemos poder visualizar esas condiciones si la tarifa base esta vigente pero la nota dice que la fecha de la oferta caduco , no cambiamos el tarifario hasta no remplazar por nuevo vigente la nota se conserva como base de consulta y esta notificacion de vencimiento de la condicion para consultar con el proveedor en algun tiempo ops que es quien tiene el encargo y la relacion con proveedores si no esta presente el humano debe ser capaz de tener estos datos" |
| M16 | 10:20 | "si confirmado referencia sujeta a confirmacion ,  todo lo que propones es correcto el flujo" |
| M17 | 10:31 | "no te preocupes por eso de cortes , si el cliente dice que tiene 12 se cobra como 12  que debe estar claro , en aceptar terminos y condiciones nosotros aceptamos que estos datos son fieles entragados por el usuario  si el niño es mayor de la edad que dice nosotros estamos excentos de esta responsabilidad ,  ni nosotros ni el proveedor es responsable .  esos cargos aplican al cliente ,  esto va en las politicas , de cada propiedad aun no estamos en este tramo seguimos con tarifas ," |
| M18 | 10:39 | "que es solapar , coloca 7 dias antes no 14  si la base de 13 a 17 paga como adulto hasta que las hoteles maestro diga lo contrario de hecho no tengo casilla para colocar edad esto lo necesito agregar sin cambiar el diseñp no acepto modificacion extra que agregar modal de edad de niños , el hotel bookig form hereda la misma casilla  , sync" |
| M19 | 10:45 | "si , en el caso de solapamiento , la mas reciente manda" |
| M20 | 10:53 | "si mas reciente es el dato mas reciente de ingesta ,  la vieja no se borra simplemente caduca la nueva pasa a ser la que manda ,  con relacion a la carga si la base cuenta si el hotel la declara , en muchos 4 adultos es el maximo pero en los solo adultos y en algunos familiares la ocupacion maxima de adultos es 3  esto es lo normal ,  los tipos de habitacion dicen claramente esta capacidad ,  que entiedo que debemos inventariar hotel por hotel , que tenemos que nos falta , y tener 1 hotel modelo  ,  el nucleo no cambia cambia el conocimiento" |
| M21 | 10:56 | "si ahora mira aqui es donde se debe guardar los mecanismos la logica y todo lo relacionado con este producto https://github.com/aliuntravelsrl-hash/atlas-hotels-v1" |

Nota sobre M16: confirma la propuesta inmediatamente anterior de ATLAS-TECH (la web pública muestra "referencia sujeta a confirmación"; flujo de notas/condiciones). Nota sobre M20: la frase "si mas reciente es…" responde a la interpretación de ATLAS-TECH sobre qué es "más reciente".

## 2. Lectura de ATLAS-TECH → instrucción → dónde se refleja
| Tema | Mensajes | Lectura de ATLAS-TECH (no adoptada) | Reflejo técnico (candidato) |
|---|---|---|---|
| Alcance del cálculo / suplementos / impuestos | M01, M09 | Solo habitación, personas, ocupación, precio por persona-noche, niños por edad; suplementos e impuestos son notas | v2.2: `supplement_notes`, `TAX_NOTE_SEE_INVOICE` |
| Fuente de consumo | M02, M07, M08 | Hotel Maestro = fuente del consumo y vista SSOT; Monitor Integrity lee lo mismo | Prompt ejecutor §7; sin implementar |
| Referencia, no pago; error = no se vende; sin inferencias | M04 | Falla cerrada a "Consultar"; sin 100/58.5/50 %/0 | Sin valores por defecto en v2.2/v2.2.1 |
| Orígenes confiables | M05 | Chat del Director + web oficial de la propiedad | `source_document_id`/`review_evidence_ref` obligatorios (heredado de v2) |
| Dos mecanismos | M06 | Ingesta de tarifas ≠ ofertas de marketing | Fuera de alcance de Core 1 v2.2.x |
| Base por adultos | M11, M12 | 1=SGL, 2=DBL, 3=TPL; adolescente cuenta como adulto | `occupancy_rates`, `adult_from_age` |
| Niño | M10, M12, M13 | Sobre DBL por persona salvo monto/excepción; 35 no es 50 | `PERCENT_OF_DBL`/`FIXED_AMOUNT`/`FREE` |
| Edad declarada | M17 | Se cobra la edad declarada; cláusula de veracidad después | Sin verificación en el motor; cláusula diferida |
| Adolescentes 13–17 | M18 | Pagan como adulto hasta que Hotel Maestro indique otra cosa | `adult_from_age` como dato de la propiedad |
| Caducidad | M14, M15, M18 | La condición vencida no cambia el tarifario; nota para confirmar con proveedor; aviso 7 días | `conditions[].status`; `review_notice_days` |
| Solape | M19, M20 | Manda el dato vigente de ingesta más reciente; el viejo caduca, no se borra | v2.2.1 R8 con `received_on` |
| 4+ adultos | M20 | La base cuenta si el hotel la declara; capacidad por tipo de habitación | `QUAD` solo declarado; `capacity` obligatoria |
| UI | M18 | Solo el modal "Edad de niños"; booking form hereda la casilla | Prompt ejecutor §4 (fase 1) |
| Inventario / hotel modelo | M20 | Inventariar hotel por hotel; un hotel modelo | Pendiente de decisión del Director sobre el hotel modelo |
| Custodia | M21 | `atlas-hotels-v1` es donde se guardan los mecanismos y la lógica | Rama candidata; transferencia sin ejecutar |

## 3. Mapa de supersesiones y tensiones con decisiones anteriores de Office
Fuentes de Office consultadas por ATLAS-TECH (lectura; el Curador debe confirmar la lectura): `reports/DICTAMEN-CURATOR-CORE1-PRICE-CHANGESET-v1-20261022.md` (filas CS-R3, CS-R4, CS-R5), `reports/DICTAMEN-CURATOR-CORE1-PRICE-CHANGESET-v2-20261023.md` (filas R4, R5 y tabla de pruebas), `reports/ADDENDUM-DG-VIVA-MICHES-OFFICIAL-TARIFF-CORE1-MASTER-20261022.md` (§2), y el dictamen OBS-206 (§5, VLT-05). Esta tabla **no** declara cuál prevalece: lo decide el Director/Curador.

| # | Tema | Antes (Office / versiones v2–v2.1) | Instrucción 23-Oct | Relación | Reserva |
|---|---|---|---|---|---|
| S1 | Suplementos | Se suman como cargos con reglas de edad y dedupe (CS-R5; R5 v2) | Notas de voucher, fuera del cálculo (M01) | v2.2 **sustituye** el cálculo por notas | El Curador debe confirmar la adopción. La aplicabilidad de galas sigue UNK por rama. |
| S2 | Impuestos | `taxes_included` desconocido ⇒ subtotal fuente, no cotización final (CS-R4) | Impuestos en notas/factura; servicios suelen incluir impuestos (M01) | **Tensión**: v2.2.1 devuelve COMPLETE con aviso `TAX_NOTE_SEE_INVOICE` | Mantiene el bloqueo por base **NET/comisión** (`price_basis ≠ CLIENT_FINAL`), que es otro concepto. Decisión pendiente: ¿un impuesto desconocido puede ser COMPLETE? |
| S3 | Edad del niño | Admitía decimales en bandas `[from,to)` (vector V2-X7, 11.5) | El formulario gestiona la edad del niño (M10); se cobra la edad declarada (M17) | v2.2 **exige enteros 0–17** | Cambio de contrato; el adaptador v1 conserva su contrato anterior. |
| S4 | Niño gratis | "No niño gratis ni reglas universales" (CS-R3) | Gratis solo si lo declara la propiedad (M03, M12) | **Consistente**: `FREE` explícito, tope por habitación; 0 no es gratis | — |
| S5 | Reclasificación | No existía | 13+ ⇒ adulto como estándar; dato de la propiedad (M10, M18) | **Nuevo** | El 13 no es del motor. Impacta la base SGL/DBL/TPL. |
| S6 | Caducidad | Ventana de venta cerrada ⇒ `SALE_WINDOW_CLOSED` (bloquea) | La condición vencida no cambia el tarifario (M15) | v2.2 **sustituye** el bloqueo por estado `VENCIDA` | Efecto comercial de mostrar una oferta vencida como referencia: decisión del Director/Curador. |
| S7 | Solapes | Varias filas aplicables ⇒ `RATE_AMBIGUOUS` | Manda la ingesta vigente más reciente (M19, M20) | v2.2.1 **sustituye** el rechazo por R8 | `received_on` es una fecha; la ingesta real (`rates.created_at`) es un instante. Empate el mismo día ⇒ "Consultar". |
| S8 | Precio adulto | Modos `TIER_PER_ADULT` / `BASE_PLUS_EXTRA`, unidades ROOM/STAY | `SGL/DBL/TPL` por persona-noche (M11) | v2.2 **sustituye** el modelo de precio adulto | Cambio de esquema: depende de Opción A/B (§253). |
| S9 | Fuente única / esquema | Opción B (tablas cerradas) = dirección candidata condicionada §253 | Principio de un solo camino de datos desde Hotel Maestro (M08, M20) | **Sin resolver** | No se reabre por preferencia de formulario (VLT-05). |
| S10 | Firma | No acredita; no bloquea el registro referencial (Addendum §247 §2) | — | Consistente | `signature_required_for_sale` sigue limitando `may_request_booking`. |
| S11 | Escritura anónima | F-SEC-01 abierto | M04 ("no debería ser cualquiera…") | Consistente; **problema separado** | Esta custodia no cierra F-SEC-01. |
| S12 | FX / depósito | FIN-ID-001 en borrador/suspendido | — | Sin cambios | v2.2.x hereda el código FX de v2.1 sin cambiar semántica. |

## 4. Reservas generales
- **Adaptador v1** sigue el contexto y el motor v2.1; **no** se homologa con el contexto v2.2.1. Necesita versión nueva (v1.1) para edades por niño, condiciones y `received_on`.
- **SQL v2.1** no se homologa con el modelo v2.2.1 (107 vectores). No existe SQL v2.2/v2.2.1.
- Las cifras 100/150/50 % son del ejemplo del Director (M12); el resto de los vectores es sintético. No son tarifas reales.
- Las reglas se atribuyen al Director a partir del chat; su adopción como decisión (§) corresponde al Curador.

## 5. Decisiones posteriores del Director (23-Oct, 11:33) — cierran reservas S2 y S3
**M22 (extracto fiel de la instrucción, sin el voucher pegado):** "considero podemos usar edades enteras , impuesto tenemos si toca como agregar , pero los impuestos o extra cargos llegan en nota en voucher , en la factura del cliente , nosotros seguimos con el monto a pagar al proveedor , cargos extras o daños hechos a la propiedad corren por el usuario  nosotros nos regimos por estas reglas que aporta el proveedor por lo general es un standard"
Adjuntó como ejemplo un voucher de proveedor (reglas del hotel, horarios, tarifas opcionales, calendario de cancelación). Se trata como **muestra de notas de voucher**, no como tarifa ni como fuente de cálculo.
| Reserva | Resultado |
|---|---|
| S3 edades enteras vs decimales | **Cerrada por el Director:** enteras (0–17). Coincide con v2.2/v2.2.1; no requiere versión nueva. |
| S2 impuestos | **Cerrada en lo esencial:** impuestos y cargos extra viajan como nota de voucher/factura; el monto de Core 1 es el que se paga al proveedor. Un impuesto desconocido no bloquea; se conserva `TAX_NOTE_SEE_INVOICE`. El bloqueo por base NET/comisión es otro concepto y sigue. Si hace falta, el impuesto se agrega como dato declarado en una versión posterior. |
| Cargos extra y daños | Responsabilidad del usuario según las reglas del proveedor; pertenece a políticas por propiedad (tramo posterior), no al cálculo. |
Reservas S1, S6, S7, S9, S11 siguen como estaban. La adopción formal sigue siendo del Curador.

## 6. Decisiones posteriores del Director (23-Oct, 11:39) — cierran S6 y S7; precisan moneda y tasa
**M23 (extracto fiel):** "condicion vencida no bloquea , se notifica , proveedor corrige en consulta , desempate es por ingesta la mas reciente manda ,  el monto fijo no debe ser en dolares eso lo dicta la naturaleza de la reserva como fue gestionada , y quiero dejar claro que el precio base de todo cambio de tasa en el sistema lo decide el nucleo msion control" (siguió un recorte de la tarjeta "Tasa del Dólar · Owner: finanzas · Tasa Banco Popular hoy").
| Tema | Resultado | Efecto técnico |
|---|---|---|
| S6 condición vencida | **Cerrada:** no bloquea; se notifica; el proveedor corrige en la consulta | Coincide con v2.2/v2.2.1 (estado `VENCIDA`, nota visible, monto sin cambio). Sin versión nueva. |
| S7 desempate | **Cerrada en principio:** manda la ingesta más reciente | v2.2.1 usa `received_on` (fecha); el mismo día da "Consultar". Para cumplirlo por completo hace falta marca de tiempo de ingesta ⇒ **v2.2.2 pendiente** (mecanismo modificado ⇒ versión nueva). No creada aún. |
| Monto fijo | **No es siempre dólares:** la moneda la dicta la naturaleza de la reserva/gestión | El modelo ya toma la moneda de la fila de tarifa (`currency` USD o DOP), sin moneda fija; el monto fijo del niño hereda la de su fila. Pendiente de comprobar con un vector que lo pruebe explícitamente. |
| Tasa de cambio | **Autoridad:** el núcleo Mission Control (tarjeta Tasa del Dólar, owner finanzas, Banco Popular) decide toda tasa del sistema | Coincide con FIN-ID-001 (`exchange_rates.rate_sell`). El modelo no tiene tasa propia: la recibe en el contexto (`fx`) con tope de antigüedad de 24 h; sin tasa vigente ⇒ "Consultar" en la otra moneda. |
Nota: el calendario de cancelación del voucher de muestra con monto en dólares es política de la propiedad (tramo posterior), no un valor de Core 1.

