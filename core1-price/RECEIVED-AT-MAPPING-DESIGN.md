# Diseño de mapeo de `received_at` — NO afirma ningún hecho sobre la base de datos
**Autor:** ATLAS-TECH (AP-03) · **Fecha:** 2026-10-23 · **Estado:** DISEÑO CANDIDATO (OBS-207 §4.2). Sin SQL, sin lectura ni escritura de BD en este tramo.

## 1. Especificación del campo (aprobada solo como especificación candidata)
`received_at` = instante UTC (con `Z`) en que el sistema **recibió/ingirió esa revisión de tarifa**, asignado por el servidor. Lo usa v2.2.2 para el desempate (mayor instante gana; empate exacto o ausencia en solape ⇒ "Consultar").
**No es un hecho** que `rates.created_at` sea ese instante: su semántica es **UNK** hasta tener la evidencia de §2. No se reconstruye desde `received_on`, no se usa `updated_at` (mutable) como sustituto y el cliente nunca lo elige.

## 2. Evidencias mínimas antes de cualquier SQL
| # | Evidencia necesaria | Por qué |
|---|---|---|
| E1 | Esquema real: nombre de columna, tipo (`timestamptz` vs `timestamp`), zona, nulabilidad, default | un `timestamp` sin zona no es un instante UTC |
| E2 | Escritor(es): qué rol/flujo inserta o modifica filas (Admin, ingesta Telegram/Gemini, importaciones, procesos masivos) | define quién puede afectar el orden |
| E3 | Inserción nueva por revisión **vs** UPDATE/upsert que conserve la fecha antigua | si una revisión nueva reescribe la fila, `created_at` no la ordena |
| E4 | Procedencia del reloj: `now()` del servidor de BD vs valor enviado por el cliente/flujo | un reloj controlado por el cliente no sirve de desempate |
| E5 | Importaciones/migraciones: si preservan o regeneran el instante original | una carga masiva puede igualar miles de filas |
| E6 | Rechazo de instante futuro: regla de contexto (`received_at > server_now` ⇒ fila inelegible o contexto inválido) | evita ganar el desempate con una hora inventada |
| E7 | Unicidad/empate: frecuencia de filas con el mismo instante en el mismo alcance | define cuánto "Consultar" provocaría |
Si E3 o E4 fallan: crear un campo explícito (p. ej. `received_at` asignado por trigger de inserción del servidor) en el changeset candidato elegido; no modificar la BD ahora.

## 3. Selección y supersesión (por alcance y noche)
- Alcance de comparación: misma identidad hotel / proveedor / tipo de habitación / plan, noche cubierta por ambas, filas **elegibles** (activa, no placeholder, VERIFIED con evidencia y documento).
- Gana el mayor `received_at`; empate o ausencia en solape ⇒ "Consultar". Una revisión inválida no desplaza a una válida.
- **Se conserva el historial:** la fila antigua y su documento permanecen. La supersesión se registra **por noche/alcance** (qué noches cede), no desactivando globalmente la fila antigua si aún cubre noches fuera del solape parcial. La función pura **informa** (`superseded_rates`); no ejecuta DML de caducidad.
- Construcción del contexto (servidor): `server_now` de servidor; rechazar `received_at` futuro; nunca aceptar el campo desde el cliente.

## 4. Pruebas futuras (cuando exista entorno desechable; hoy no)
Solape parcial (noches fuera del solape siguen cubiertas por la fila antigua), mismo instante, ausencia, futuro, reimportación masiva, upsert que reescribe fecha. Los 115 vectores del modelo no prueban nada de esto en BD.
