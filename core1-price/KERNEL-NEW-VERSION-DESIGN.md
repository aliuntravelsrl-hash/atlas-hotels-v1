# Diseño de versión nueva del Mirror Kernel — Core 1 (NO IMPLEMENTADO)
**Autor:** ATLAS-TECH (AP-03) · **Fecha:** 2026-10-23 · **Estado:** PROPUESTA (refinada según OBS-207; no implementada, no adoptada). El kernel v1 (`kernel/`, `tests/`, `spec/`) queda **intacto y recuperable** (`custody/KERNEL-V1-RECOVERY-MANIFEST.md`).
**Referencia:** `SPEC-HOTEL-INTEGRITY-CORE1-ALIGNMENT-v1-20261023` (Office, Curador). **Identificador de versión reservado, no creado:** `HOTEL-INTEGRITY v2.0.0-candidate`. "1.1.0-draft" de la bitácora designa la custodia Core 1, **no** el kernel, y no se recicla.

## 1. Principios
1. Cada dato observado se guarda con `{valor, origen, versión/ref}` o con un estado explícito: `AUSENTE`, `NO_VERIFICADO`, `NO_APLICABLE`. Nunca se completa con otro cuarto, otro hotel ni valor por defecto (elimina K1–K6).
2. Tres estados lógicos independientes:
   - **A. Integridad de contenido** (identidad, multimedia, políticas presentes).
   - **B. Preparación de precio Core 1**, por selección (hotel/habitación/proveedor/rango/ocupación/niños/divisa).
   - **C. Habilitación** (consultar / reservar / pagar). Una puntuación perfecta en A no implica C.
3. Pilar nuevo **ocupación y edades**: perfil por habitación (SGL/DBL/TPL/QUAD solo si el hotel lo declara), `adult_from_age`, bandas de edad, capacidad total/adultos/niños.
4. Cobertura por hotel, habitación, proveedor, rango, selección y divisa: el pilar de tarifas deja de pasar con "algún precio".
5. **Un solo motor de precio:** el kernel no calcula precios ni concede permiso de cobro; consume la salida de Core 1 (`status`, `warnings`, `conditions`) y solo la clasifica y **emite una propuesta de habilitación**. El servidor/autoridad operativa verifica reserva y pago; no basta un score del kernel ni una bandera del Admin. Sin segundo calculador.
7. **Datos requeridos por selección, no universales:** solo se exige lo aplicable a la selección evaluada. TPL no es necesario para una selección DBL; las reglas de edad no son necesarias sin menores; la tasa de cambio no es necesaria si la divisa de pago coincide con la de la fila y no hay mínimo en otra divisa. `FREE` explícito es válido; la falta de tarifa no es cero.
8. **Tasa válida por autoridad, no por valor:** una tasa se acepta si tiene autoridad (aprobador/fuente gobernada), dirección (`DOP_PER_USD`) y vigencia. No se rechaza ni se acepta por ser distinta de 1 (el pilar P7 actual, `> 1`, es un proxy a retirar). Mission Control es la autoridad de la tasa; esto no resuelve FIN-ID-001 ni acredita permisos del runtime.
9. **Margen fuera del kernel:** pertenece a un contexto de precio gobernado. Las tablas físicas siguen abiertas (A/B §253); este diseño no las fija.
6. Los 7 pilares de v1 se conservan como historial y como subconjunto del estado A.

## 2. Cambios por desalineación
| ID | Hoy | Versión nueva |
|---|---|---|
| K1 capacidad | `||2 / ||0` | `AUSENTE` ⇒ habitación no reservable (B = Consultar) |
| K2 precio heredado | usa precio base del hotel | sin precio propio ⇒ sin precio |
| K3 tasa 1.0 / 60.25 | convierte con 1.0 | sin tasa vigente ⇒ DOP "Consultar" |
| K4 margen 15 % | por defecto | fuera del kernel, o dato declarado con origen |
| K5/K6 estrellas, horarios, cancelación | rellenados | `AUSENTE` visible |
| K7/K8 P3/P2 | pasa con un precio / nombre+adultos | exige perfil de ocupación, edades, vigencia, origen |
| K9 | sin pilar | pilar ocupación y edades |

## 3. Pruebas de aceptación (cada una = un caso del conjunto nuevo, con caso negativo)
| # | Caso | Resultado esperado |
|---|---|---|
| T1 | Falta, uno a uno, cada dato **aplicable a la selección** (capacidad; la base que corresponde a los adultos pedidos; `adult_from_age` y banda solo con menores; tasa solo si hay conversión; divisa; origen) | B = no listo para esa selección; motivo explícito; nunca valor por defecto |
| T1b | Falta un dato **no** aplicable (TPL en selección DBL; edades sin menores; tasa en misma divisa) | B = listo; no se exige |
| T2 | Dos habitaciones, una sin precio | la otra evaluada por separado; la sin precio no hereda |
| T3 | Fila única "Adulto" sin tarifa y `b2c_booking=true` | no puede pasar a habilitación |
| T4 | Ocupación SGL/DBL/TPL/4+ desconocida | "Consultar" para esa selección |
| T5 | `FREE` explícito con tope por habitación | válido; `0` implícito rechazado |
| T6 | Tasa sin autoridad/aprobador, con dirección errónea o vencida, cuando la conversión aplica | "Consultar" en la otra divisa. Una tasa con autoridad, dirección y vigencia válidas **no** se rechaza por su valor |
| T7 | Inyección de fallo en cada runner | el runner sale ≠ 0 |
| T8 | Puntuación A perfecta con B no listo | C no propone habilitación |
| T8b | B listo | el kernel solo propone; el cobro lo verifica la autoridad operativa (no se prueba aquí) |
| T9 | Auditoría en vivo | **no** forma parte de `npm test` |
| T10 | Regresión de kernel v1 | los 7 pilares y sus pruebas de v1 siguen pasando sobre su copia congelada |

## 4. Plan de implementación (requiere decisión del Curador; nada ejecutado)
Carpeta `kernel-v2/` nueva (sin tocar `kernel/`), entrada de bitácora, manual §4 actualizado, `npm test` 100 % + pruebas nuevas, tag de v1 antes de empezar. Sin conexión a Supabase en pruebas.

## 5. Cerrado por OBS-207 / pendiente
Margen fuera del kernel (cerrado). Habilitación: el kernel propone, la autoridad operativa del servidor verifica (cerrado). Nombre y ubicación de tablas físicas (`rooms`/`rates` vs `hotel_rooms`/`hotel_rates` vs nuevas): abiertos hasta la decisión A/B §253. La implementación futura va aislada en `kernel-v2/` con v1 congelada, tag v1 previo (solo propuesto), bitácora, manual y negativos, y requiere nueva convocatoria del Director; el diseño offline no espera a Antigravity.
