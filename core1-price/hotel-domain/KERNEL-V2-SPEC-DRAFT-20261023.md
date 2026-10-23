# Especificación borrador — HOTEL-INTEGRITY v2.0.0-candidate (SOLO DOCUMENTAL; sin implementación)
ATLAS-TECH (AP-03), 2026-10-23. Convocatoria del Director (OBS-213 / §264 / STATE111). **Puerta de Fase A no satisfecha: TAG REMOTO NO PUBLICADO**, por lo que no se inicia `kernel-v2/` ni código. Este borrador consolida `../KERNEL-NEW-VERSION-DESIGN.md` y la convocatoria; v1 queda intacto.

## 1. Contrato de salida (tres resultados independientes)
1. **A. Integridad del contenido** (identidad, multimedia, políticas presentes).
2. **B. Preparación de precio Core 1 por selección** (hotel/habitación/proveedor/rango/ocupación/niños/divisa): `LISTO | CONSULTAR` + motivo; el kernel consume la salida de Core 1 (v2.2.3, contexto `CORE1-PRICE-CONTEXT-v2.2.3`), no calcula.
3. **C. Propuesta de habilitación operativa**: solo propone; la autoridad operativa verifica reserva/cobro. Puntuación completa de A ⇒ **no** habilita; B listo ⇒ **no** habilita cobro por sí mismo.

## 2. Estados de dato
Cada dato: `{valor, origen, versión}` o `AUSENTE | NO_VERIFICADO | NO_APLICABLE`. Sin valores por defecto de capacidad, precio, tasa, margen, estrellas, horarios, políticas; sin herencia de precio entre habitaciones. `FREE` explícito puede ser válido; ausencia de precio ≠ cero.

## 3. Aplicabilidad por selección
TPL no se exige a DBL; bandas infantiles no sin menores; FX solo cuando se usa una conversión (o un mínimo/depósito aplicable en otra divisa); tasa válida por autoridad, dirección y vigencia, nunca por comparación con 1.

## 4. Fronteras
Salida pública sin NET, costo del proveedor, documentos ni notas internas; esos datos solo en la vista interna autorizable (autorización real del backend fuera de esta simulación). Margen fuera del kernel. Rechazo de contratos incompatibles. Sin SQL, Supabase, n8n, Admin, portal, `audit:live`, producción.

## 5. Plan de pruebas offline (cada una con negativo)
Datos ausentes y no aplicables · separación entre habitaciones · selecciones con/sin menores · FX aplicable/no aplicable · NET y separación público/interno · condiciones vencidas visibles al operador · contenido completo con precio incompleto · precio completo sin habilitación · contratos incompatibles rechazados · propagación de fallos (runner ≠ 0) · regresión v1 sobre copia congelada. Mapeo a T1–T10 del diseño.

## 6. Piloto
Viva Miches: piloto **documental y de inventario**, sin habilitar venta, sin cargar tarifas en producción, sin inventar códigos, capacidades ni condiciones del proveedor.

## 7. Fase B pendiente
Tras publicar y verificar el tag `hotel-integrity-kernel-v1.0.0` → `21dfd63` en el remoto: rama nueva, `kernel-v2/`, pruebas, manual, bitácora, PR en borrador sin fusionar.
