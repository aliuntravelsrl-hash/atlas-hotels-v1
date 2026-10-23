# Diseño de versión nueva del Mirror Kernel — Core 1 (NO IMPLEMENTADO)
**Autor:** ATLAS-TECH (AP-03) · **Fecha:** 2026-10-23 · **Estado:** PROPUESTA. El kernel v1 (`kernel/`, `tests/`, `spec/`) queda **intacto y recuperable** (`custody/KERNEL-V1-RECOVERY-MANIFEST.md`).
**Referencia:** `SPEC-HOTEL-INTEGRITY-CORE1-ALIGNMENT-v1-20261023` (Office, Curador). **Identificador de versión reservado, no creado:** `HOTEL-INTEGRITY v2.0.0-candidate`. "1.1.0-draft" de la bitácora designa la custodia Core 1, **no** el kernel, y no se recicla.

## 1. Principios
1. Cada dato observado se guarda con `{valor, origen, versión/ref}` o con un estado explícito: `AUSENTE`, `NO_VERIFICADO`, `NO_APLICABLE`. Nunca se completa con otro cuarto, otro hotel ni valor por defecto (elimina K1–K6).
2. Tres estados lógicos independientes:
   - **A. Integridad de contenido** (identidad, multimedia, políticas presentes).
   - **B. Preparación de precio Core 1**, por selección (hotel/habitación/proveedor/rango/ocupación/niños/divisa).
   - **C. Habilitación** (consultar / reservar / pagar). Una puntuación perfecta en A no implica C.
3. Pilar nuevo **ocupación y edades**: perfil por habitación (SGL/DBL/TPL/QUAD solo si el hotel lo declara), `adult_from_age`, bandas de edad, capacidad total/adultos/niños.
4. Cobertura por hotel, habitación, proveedor, rango, selección y divisa: el pilar de tarifas deja de pasar con "algún precio".
5. **Un solo motor de precio:** el kernel no calcula precios; consume la salida de Core 1 (`status`, `warnings`, `conditions`) y solo la clasifica. Sin segundo calculador ni defaults de margen/tasa.
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
| T1 | Falta, uno a uno, cada dato (capacidad, SGL, DBL, TPL, edad adulto, banda, tasa, divisa, origen) | B = no listo; motivo explícito; nunca valor por defecto |
| T2 | Dos habitaciones, una sin precio | la otra evaluada por separado; la sin precio no hereda |
| T3 | Fila única "Adulto" sin tarifa y `b2c_booking=true` | no puede pasar a habilitación |
| T4 | Ocupación SGL/DBL/TPL/4+ desconocida | "Consultar" para esa selección |
| T5 | `FREE` explícito con tope por habitación | válido; `0` implícito rechazado |
| T6 | Huecos de FX (sin tasa, tasa vencida, tasa 1.0) | DOP "Consultar" |
| T7 | Inyección de fallo en cada runner | el runner sale ≠ 0 |
| T8 | Puntuación A perfecta con B no listo | C no habilita |
| T9 | Auditoría en vivo | **no** forma parte de `npm test` |
| T10 | Regresión de kernel v1 | los 7 pilares y sus pruebas de v1 siguen pasando sobre su copia congelada |

## 4. Plan de implementación (requiere decisión del Curador; nada ejecutado)
Carpeta `kernel-v2/` nueva (sin tocar `kernel/`), entrada de bitácora, manual §4 actualizado, `npm test` 100 % + pruebas nuevas, tag de v1 antes de empezar. Sin conexión a Supabase en pruebas.

## 5. Preguntas abiertas para el Curador (no para el Director)
Si el margen pertenece al kernel o a otra capa; el nombre de tablas (`rooms`/`rates` vs `hotel_rooms`/`hotel_rates`); si "habilitación" vive en el kernel o en el Admin.
