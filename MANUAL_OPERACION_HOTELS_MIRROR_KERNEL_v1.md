# 📘 Manual de Operación y Mapeo de Versiones: Hotels Mirror Kernel v1.0
**Documento:** `MANUAL_OPERACION_HOTELS_MIRROR_KERNEL_v1.md`  
**Ecosistema:** Commercial Operating System (ATLAS / COS v3.5)  
**Autoridad:** Curator Constitucional / ATLAS-TECH  
**Fecha:** Septiembre 2026  

---

## 1. 🛡️ Protocolo Anti-Descuadre Financiero (FIN-ID-001)

1. **Punto Único de Tasa:** Todo cálculo de conversión monetaria debe invocar obligatoriamente `public.exchange_rates` (`rate_sell`).
2. **Prohibición Expresa:** Queda terminantemente prohibido quemar tasas fijas en código (e.g. `58.50` o `60.00`).
3. **Redondeo Determinístico:** Toda operación se redondea a 2 decimales en USD y enteros en DOP utilizando aritmética de punto fijo (`Math.round((val + Number.EPSILON) * 100) / 100`).

---

## 2. 🖼️ Protocolo Anti-Bloqueo de Multimedia (CORS & Referer)

1. Las fotos de hoteles deben residir en CDN autorizados con cabeceras abiertas (`Access-Control-Allow-Origin: *`).
2. Los vouchers generados por Gotenberg no deben incluir cabeceras `Referer` restrictivas que impidan el renderizado de logotipos y galerías hoteleras.

---

## 3. 🚦 Matriz de Disparo de Rutas Operativas

| Health Score | Estado de Ruta | Acción Operativa | Notificación |
| :--- | :--- | :--- | :--- |
| **7/7 (PASS)** | `ACTIVE` | Habilitado para venta web, Hermes y OTAs. | Log INFO en EventBus |
| **5/7 - 6/7** | `DEGRADED` | Disponible en cotizador interno con advertencia; oculto en web pública. | Alerta WARN a Ariadne Data |
| **< 5/7** | `BLOCKED` | Cuarentena total. Ningún agente puede cotizar este hotel. | Alerta ERROR a War Room |

---

## 4. 🗄️ Protocolo Obligatorio de Conservación de Estado y Versionado

1. **Repositorio Custodio (`atlas-hotels-v1`):** Es el cofre de preservación de estado (*State Vault*) del Integrity Monitor para la vertical de hoteles.
2. **Registro Obligatorio:** Cualquier ajuste en:
   - Umbrales de *Health Score* (e.g. número mínimo de fotos, campos requeridos de habitaciones).
   - Lógica de margen comercial o reglas cambiarias (**FIN-ID-001**).
   - Políticas de despacho de rutas (B2C, B2B, Hermes Swarm).
   - Telemetría hacia Ariadne Data o Atlas Intel.
   debe documentarse inmediatamente en `history/INTEGRITY-STATE-LOG.md` con su fecha, commit, justificación y resultado de auditoría.
3. **Invariante de No-Regresión:** Ningún cambio en el Mirror Kernel puede desplegarse en producción sin que `npm test` pase al 100% y se conserve la copia histórica del estado previo.

---

## 5. 🧮 Core 1 — Precio de referencia (custodia de mecanismos)

1. **Ubicación:** `core1-price/` (lógica versionada, contratos, vectores sintéticos, reglas del Director, prompts para el ejecutor). Ver `core1-price/README.md` y `core1-price/VERSION-MAP.md`.
2. **Autoridad de reglas:** `core1-price/rules/DIRECTOR-RULES-CORE1-20261023.md`. Mandan sobre cualquier versión.
3. **Versionado:** una versión publicada no se edita; un mecanismo modificado genera versión nueva, entrada en `VERSION-MAP.md` y entrada en `history/INTEGRITY-STATE-LOG.md`.
4. **Verificación de custodia:** `sha256sum -c core1-price/MANIFEST.sha256` y `npm run test:core1:all` (modelos, adaptador simulado y 30 comprobaciones del runner: 28 negativas, 1 reproducción del defecto y 1 control positivo (más adaptadores simulados v1.1 30+24 y v1.1.1 43+27; modelos hasta v2.2.3 con 120 vectores); código de salida real; no prueba SQL ni Admin ni web ni ejecuta audit:live).
5. **Sin datos reales:** las tarifas viven en Supabase; este repositorio no guarda tarifas, secretos, JWT, IDs de chat ni PII.
6. **Hallazgo abierto:** `core1-price/KERNEL-ALIGNMENT-FINDINGS.md` (el kernel actual completa datos con valores por defecto; decisión pendiente del Curador).

## 6. 🧱 Kernel v2 aislado (candidato, offline)
`kernel-v2/` contiene `HOTEL-INTEGRITY v2.0.0-candidate` (no desplegado, no adoptado; `kernel/` v1 intacto y es la entrada del producto). Verificación: `npm run test:kernel2:all` (38 pruebas + 12 mutaciones y control). Son pruebas del kernel sobre fixtures sintéticos y salidas simuladas de Core 1; no prueban SQL, Admin, portal ni producción. Preservación de v1: manifiesto de recuperación + `core1-price/evidence/V1-RECOVERY-EQUIVALENCE-GATE-20261023.md`; el tag v1 sigue pendiente de publicación.

### 6.1 Kernel v2.0.1-candidate (correcciones OBS-216)
`kernel-v2.0.1/` revisa v2.0.0-candidate sin editarlo. Verificación: `npm run test:kernel201:all` (61 pruebas + 19 mutaciones, control y propagación de salida). Modelo/simulación offline con fixtures sintéticos y cotizaciones emparejadas del candidato Core 1; no prueba SQL, Admin, portal, backend ni producción. Contrato de entrada y GAPs: `kernel-v2.0.1/README.md`.

### 6.2 Kernel v2.0.2-candidate (residuales OBS-217)
`kernel-v2.0.2/` revisa v2.0.1 sin editarla: vínculo completo por snapshot de evaluación (edades exactas, hotel y perfil usado; consistencia, no autenticidad) y contrato público completo (catálogos, valores anidados, motivos externos genéricos). Verificación: `npm run test:kernel202:all` (82 pruebas + 32 mutaciones, control y propagación). Modelo/simulación offline; no prueba SQL, Admin, portal, backend ni producción. Detalle y GAPs: `kernel-v2.0.2/README.md`.

### 6.3 Kernel v2.0.3-candidate (huella completa del DTO, OBS-218)
`kernel-v2.0.3/` revisa v2.0.2 sin editarla: el snapshot (`EVAL-SNAPSHOT-v2`) incluye `dto_digest`, SHA-256 canónico del DTO completo, recalculado por el kernel. **Fe de erratas:** §6.2 y el README de v2.0.2 hablan de "huellas del DTO"; en v2.0.2 solo se comparaba el `fingerprint` opaco. Verificación: `npm run test:kernel203:all` (88 pruebas + 36 mutaciones, control y propagación). Consistencia, no autenticidad (UNK backend). Detalle: `kernel-v2.0.3/README.md`.

## 7. Productor servidor de cotización Core 1 (candidato inerte, OBS-221)
`core1-producer/` integra Core 1 v2.2.3, adaptador v1.1.1, kernel v2.0.3 y `EVAL-SNAPSHOT-v2` con dependencias inyectadas (repos de solo lectura, identidad, política, reloj) y un puente reproducible a Python con huellas de las piezas congeladas. Verificación: `npm run test:producer:all` (40 pruebas + 20 mutaciones, control y propagación; la segunda parte tarda varios minutos). Simulación offline: no certifica autenticación real, grants/RLS, SQL, firma de emisor, host, Admin ni portal. Matriz de fuentes y comparación de hospedaje en `core1-producer/docs/`. Kernel v1 sigue como entrada predeterminada.

### 7.1 Productor v1.1 (correcciones OBS-222)
`core1-producer-v1.1/` corrige sobre `core1-producer/` (v1, PR #8 `80f59fe`, intacta): catálogos cerrados de códigos públicos, prueba falsable de ausencia de bytecode (`-I`/`-B` no son un sandbox) y evidencia de tarifas según las filas realmente usadas (`traceability` del motor). Verificación: `npm run test:producer11:all`. La sonda del kernel (vista interna sin enumeración) está separada en `kernel-probes/`.

## 8. Kernel v2.0.4-candidate — cierre de enumeraciones de la vista interna (ATLAS-TECH, 2026-10-24)
* **Versión:** `kernel-v2.0.4/` (candidato, offline, NO desplegado, NO adoptado). `kernel-v2.0.3/` congelado e intacto; kernel v1 (`kernel/index.js`) sigue por defecto; productores v1 y v1.1 sin cambios.
* **Mecanismo modificado ⇒ versión nueva:** `validateInternalView` cierra por catálogo `calculation_status` (COMPLETE, SOURCE_SUBTOTAL_ONLY, INCOMPLETE, INVALID) y `provider_amount_status` (ACCREDITED, NOT_ACCREDITED_CLIENT_FINAL/MIXED/UNKNOWN/NOT_EVALUATED). Valor ausente, nulo, de tipo incorrecto o desconocido ⇒ B RECHAZADO con `INTERNAL_VIEW_SHAPE_INVALID` (código existente; sin interpolar el valor). Procedencia: `kernel-v2.0.4/docs/ENUM-PROVENANCE.md`.
* **Pruebas:** `npm run test:kernel204:all` (101 + mutaciones + 6 de compatibilidad con el productor v1.1 por inyección aislada). Sin SQL, n8n, apps, producción ni adopción.
* **Addendum A5 (coherencia mínima):** con vista interna presente, DTO `PRICE_REFERENCE` y `calculation_status` ∈ {SOURCE_SUBTOTAL_ONLY, INCOMPLETE, INVALID} ⇒ B RECHAZADO con `INTERNAL_VIEW_SHAPE_INVALID` (existente), sin total ni preparación completa. Pruebas: `test:kernel204:all` (107 + mutaciones + 7 de compatibilidad). Sin matriz general; provider_amount_status ↔ DTO sigue abierto.

## 9. Kernel v2.0.5-candidate — coherencia base ↔ estado ↔ importe del proveedor ↔ DTO (ATLAS-TECH, 2026-10-24)
* **Versión:** `kernel-v2.0.5/` (candidato, offline, NO desplegado, NO adoptado). `kernel-v2.0.4/` (ya integrado en main), `kernel-v2.0.3/`, `core1-price/`, productores v1/v1.1 y sonda histórica intactos; kernel v1 (`kernel/index.js`) sigue por defecto.
* **Mecanismo modificado ⇒ versión nueva:** R1/R2 en `validateInternalView` (también para consultas) y R3 en `priceReadiness` (PRICE_REFERENCE exige base CLIENT_FINAL, NOT_ACCREDITED_CLIENT_FINAL, `provider_amount`=null, subtotal CLIENT_FINAL). Contradicción ⇒ B RECHAZADO con `INTERNAL_VIEW_SHAPE_INVALID` (existente). `ACCREDITED` = importe interno de fuentes NET_PROVIDER, no precio cliente ni autoridad. Matriz: `kernel-v2.0.5/docs/MATRIX-PROVIDER-AMOUNT.md`.
* **Pruebas:** `npm run test:kernel205:all` (116 + mutaciones + 9 de compatibilidad con el productor v1.1 por inyección aislada). Sin SQL, n8n, apps, producción ni adopción.
* **Suplemento PA8 (v2.0.5):** consultas con snapshot actual y válido verifican las huellas del paquete antes de proyectar la vista interna (`SNAPSHOT_*_MISMATCH`, sin proyección). Snapshot ausente/antiguo/malformado en consulta conserva su política (decisión abierta). Pruebas: `test:kernel205:all` (122 + mutaciones + 9).

## 10. Kernel v2.0.6-candidate — política de snapshot en consultas, alternativa A (ATLAS-TECH, 2026-10-25)
- **Qué cambia (delta autorizado vs v2.0.5):** para un DTO de consulta admitido por el contrato, snapshot **realmente ausente** (contexto omitido/null o sin la propiedad propia `evaluation_snapshot`) ⇒ `CONSULTAR` básico con el motivo comercial legítimo + señal fija `EVALUATION_SNAPSHOT_ABSENT`, `internal=null` para todo actor, sin importe interno, total de referencia ni preparación completa. Snapshot v1 ⇒ `RECHAZADO EVALUATION_SNAPSHOT_CONTRACT_OUTDATED`. Versión desconocida o snapshot/contexto presentado mal formado (null, tipo erróneo, claves/tipos/digests inválidos) ⇒ `RECHAZADO SNAPSHOT_SHAPE_INVALID`. Snapshot actual con huella incorrecta ⇒ `RECHAZADO SNAPSHOT_*_MISMATCH`. Snapshot actual consistente ⇒ `CONSULTAR` y proyección interna solo bajo la política de actor vigente y R1/R2.
- **Qué no cambia:** `PRICE_REFERENCE` y puertas A5/R3, R1/R2 (también sin snapshot), `kernel/index.js` por defecto, v2.0.5 y demás versiones congeladas. Sin códigos nuevos ni interpolación de valores recibidos. Consistencia de huellas ≠ autenticidad.
- **Compatibilidad:** la rama «ausente» NO es idéntica a v2.0.5 (antes proyectaba el importe interno); es un cambio deliberado y medido en `npm run test:kernel206:beforeafter`.
- **Evidencia:** `npm run test:kernel206:all` (suite, mutaciones, productor v1.1 por inyección aislada, antes/después). Informe en Office. Sin fusión, adopción ni despliegue.

## 11. Adaptador físico de puertos Core 1 v1 — candidato inerte (ATLAS-TECH, 2026-10-25)
* **Versión nueva:** `core1-physical-adapter-v1/` (candidato, offline, NO desplegado, NO adoptado). Productor v1.1, kernel v2.0.3…v2.0.6, motor v2.2.3, adaptador v1.1.1 y kernel v1 por defecto sin cambios. Origen: SPEC-CORE1-PHYSICAL-PORT-ADAPTER-v1 (Office `fd8762e`).
* **Mapa de versiones (mecanismos):** kernel v1 (default) · kernel-v2 … v2.0.6 (inertes) · core1-producer v1 / v1.1 (inertes) · **core1-physical-adapter v1** (nuevo, inerte). `core1-price/VERSION-MAP.md` versiona solo el modelo de precio y no se toca.
* **Composición:** etapa asíncrona con revisiones fijadas por autoridad inyectada → evaluación pura síncrona → relectura asíncrona que bloquea el provisional si hay deriva. Detalle en `core1-physical-adapter-v1/docs/COMPOSITION.md`.
* **PA-R1 (dictamen OBS-229):** tras la última relectura asíncrona se toma una hora fresca y se evalúa con ella como «ahora» del kernel, conservando computed_at/TTL/snapshot; vencimiento (`QUOTE_EXPIRED`), hora inválida (`NOW_INVALID`) o retroceso (`QUOTE_FROM_FUTURE`) ⇒ sin LISTO, total, preparación ni proyección. Corrección en el mismo candidato (commits adicionales), sin tocar kernel ni productor.
* **PA-R1 residual + PA-R2 (dictamen OBS-230):** el orden es cálculo (único, paquete capturado) → relectura de revisiones → hora fresca → gate del kernel sobre ese mismo paquete, sin recalcular ni rejuvenecer (computed_at/valid_until/snapshot intactos). Un vencimiento cruzado durante el puente ⇒ `QUOTE_EXPIRED`; una revisión que cambia durante el cálculo ⇒ `READ_DRIFT_DETECTED`; sin total ni proyección en ambos casos. Códigos existentes; política de consulta v2.0.6 y criterio conservador de términos sin cambio.
* **Límites:** 11 vínculos siguen sin fuente acreditada; sin cliente real, SQL, red ni autenticación; evidencia sintética ≠ E2E. Verificación: `npm run test:physical-adapter:all`.

