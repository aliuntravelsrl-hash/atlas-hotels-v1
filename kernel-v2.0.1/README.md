# HOTEL-INTEGRITY v2.0.1-candidate — MODELO/SIMULACIÓN OFFLINE; NO DESPLEGADO; NO ADOPTADO
ATLAS-TECH (AP-03), 2026-10-23. Revisión candidata de `kernel-v2/` (v2.0.0-candidate, snapshot `8c6f5b993261b94f2aa464e332fd499d7ff0c80d`, **intacto** y recuperable). `kernel/` (v1), sus pruebas/spec/scripts y las versiones Core 1 congeladas, sin cambios. Origen: dictamen OBS-216 (K2-R1…R7). Entrada predeterminada del producto: sigue v1.
## Contrato de entrada
`evaluate(hotel, request, quote, ctx)`: `request` = la misma petición enviada a Core 1 (adaptador v1.1.1, una sola habitación); `quote` = `{public_dto, internal_view, context_evidence}` **de esa cotización**; `ctx` = `{now (reloj de servidor ISO con zona), fx_authorities (lista acreditada por el servidor), actor?}`.
## Qué corrige
| ID | Corrección |
|---|---|
| K2-R1 | Vínculo de selección↔cotización: request_id (DTO, vista, evidencia), hotel, plan, fechas, habitación, adultos, cantidad de menores, moneda; multihabitación rechazada explícitamente; sin recomputar precio |
| K2-R2 | Reloj de servidor estricto (ISO con zona, fecha real); `computed_at` no futuro, `valid_until` vigente (en el límite = vencida); vencida ⇒ no LISTO; condición comercial vencida solo es nota interna |
| K2-R3 | Aplicabilidad de FX acreditada con vista interna + política de depósito **de la misma cotización**; evidencia FX ligada (request, par, dirección, versión, autoridad acreditada por el servidor, ventana que contiene `computed_at`); `NO_VERIFICADO` ⇒ no LISTO; incluye mínimo de depósito en otra moneda; misma moneda no exige FX |
| K2-R4 | Validación cerrada de DTO/vista (claves, tipos, versiones, importe positivo 2 decimales, moneda USD/DOP); proyección pública positiva con campos explícitos |
| K2-R5 | Ocupación/capacidad con conteos **efectivos** (tras reclasificar); capacidad total/adultos/niños; divergencia entre perfil local y cotización ⇒ no LISTO |
| K2-R6 | Validación semántica por campo (no vacíos tras `trim`, horas HH:MM, URLs https, enteros/rangos, bandas ordenadas); procedencia de forma válida; FREE exige procedencia de la regla |
| K2-R7 | C neutral: `PREPARACION_COMPLETA_SUJETA_A_AUTORIDAD`/`NO_PREPARADA`; acciones sugeridas por motivo con `route_status: NO_ESTABLECIDA`; sin ejecutor ni asistencia impuesta; `grants` siempre false |
## GAPs declarados (no resueltos aquí; no se reabrió Core 1)
1. Core 1 v2.2.3/adaptador v1.1.1 no exporta evidencia de uso de FX ni un indicador de aplicabilidad sin costos: el kernel exige vista interna vinculada y `context_evidence` del servidor (política de depósito y FX usada). Su emisión real es de backend/Core 1 futuro.
2. El DTO no incluye edades ni versión de perfil: el vínculo usa cantidades y se reconcilia con el perfil local.
3. La autenticidad del `fingerprint`/DTO no es verificable por el kernel (autorización y firma del backend: fuera de alcance, UNK).
## Pruebas
`npm run test:kernel201` (61, con cotizaciones emparejadas genuinas; incluye regresión v1 y v2.0.0) y `npm run test:kernel201:faults` (19 mutaciones + control + propagación de salida). Generador de fixtures: `tools/gen_paired_quotes.py.inert` (lee el simulador Core 1; no lo modifica).
