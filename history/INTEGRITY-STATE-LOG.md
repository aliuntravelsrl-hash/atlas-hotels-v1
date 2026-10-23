# 📜 Bitácora de Estados y Versionado de Integridad: Mirror Kernel Hoteles
**Ecosistema:** Commercial Operating System (ATLAS / COS v3.5)  
**Repositorio SSOT de Estado:** `atlas-hotels-v1`  
**Autoridad:** Director General Aldo Hilario / Curator Constitucional  

---

## 🧭 Directiva Constitucional de Conservación de Estado
Cada vez que se modifique, refine, recalibre o audite una regla, umbral, esquema o lógica de cálculo en el **Integrity Monitor** (Mirror Kernel) o en los datos maestros de hoteles, se debe asentar una entrada inmutable en esta bitácora y versionar el estado del repositorio mediante un commit/tag semántico.

---

## 📋 Registro Histórico de Versiones y Estados

### 🏷️ Versión 1.0.0 — Baseline Canónico de Integridad Hotelera
* **Fecha:** 17 de Septiembre de 2026
* **Commit:** `e58880e`
* **Estado de Integridad:** `BASELINE ESTABLECIDO (Health Score 7/7)`
* **Cambios / Contratos:**
  * Formalización de los 7 Pilares de Integridad Hotelera (`spec/MIRROR-KERNEL-HOTEL-SPEC-v1.md`).
  * Implementación del `HotelIntegrityEvaluator`, `HotelVariableAccumulator` y `HotelRouteDispatcher`.
  * Integración obligatoria con `public.exchange_rates.rate_sell` (**FIN-ID-001**) para eliminar descuadres DOP/USD.
  * Definición de puentes de telemetría hacia `ariadne-data` y `atlas-intel`.
  * Suite de pruebas unitarias automatizadas con cobertura del 100% PASS.
* **Autor:** Curator Constitucional & Director General Aldo Hilario

### 🏷️ Versión 1.1.0-draft — Custodia de mecanismos Core 1 (precio de referencia)
* **Fecha:** 23 de Octubre de 2026
* **Commit:** rama `atlas-tech/core1-price-mechanisms` (hash definitivo = commit de la rama; no hay tag)
* **Estado de Integridad:** `KERNEL SIN CAMBIOS` — `kernel/`, `tests/` y `spec/` no se tocaron; `npm test` pasa igual que en 1.0.0.
* **Cambios / Contratos:**
  * Se incorpora `core1-price/` con las versiones v1, v2, v2.1, v2.2, v2.2.1 del mecanismo de precio de referencia y el diseño del adaptador de consumo, copiados sin alterar (manifiesto sha256). Todos INERTES, no adoptados, SQL nunca ejecutado.
  * Se registran las reglas del Director del 23-Oct-2026 como autoridad (`core1-price/rules/`).
  * Se documenta, como hallazgo separado y abierto, la desalineación entre el kernel actual y esas reglas (`core1-price/KERNEL-ALIGNMENT-FINDINGS.md`). No se corrige en este cambio.
  * Se agrega la sección 5 del Manual de Operación y el script `npm run test:core1`.
* **Resultado de auditoría:** v2.2.1 107/107 y v2.2 97/97 contra sus propios vectores sintéticos (solo modelo).
* **Autor:** ATLAS-TECH (AP-03), a instrucción del Director General Aldo Hilario. Pendiente de revisión del Curator Constitucional.

### 🛠️ Corrección aclaratoria — Alcance de "Versión 1.1.0-draft" (VLT-06)
* **Fecha:** 23 de Octubre de 2026
* **Naturaleza:** entrada correctiva; la entrada anterior no se reescribe.
* **Aclaración:** "1.1.0-draft" designa el **candidato de custodia de mecanismos Core 1**, **no** una versión del kernel. El kernel permanece en v1.0.0 sin cambios (ver `core1-price/custody/KERNEL-V1-RECOVERY-MANIFEST.md`).
* **Identificador reservado, no creado:** una futura alineación del kernel se llamará `HOTEL-INTEGRITY v2.0.0-candidate` (diseño en `core1-price/KERNEL-NEW-VERSION-DESIGN.md`, sin implementar).
* **COS:** cualquier texto COS v3.5 presente en el repositorio no altera la línea base global COS-v3.4.
* **Estado de integridad:** `KERNEL SIN CAMBIOS`; `npm test` y `npm run test:core1:all` (offline) pasan. Sin auditoría en vivo.
* **Rastros añadidos:** runners con código de salida real y prueba de inyección de fallos (VLT-01/02), etiquetas de estado (VLT-03), aviso del prompt (VLT-04), procedencia literal (VLT-05), inventario y plantilla de custodia.
* **Autor:** ATLAS-TECH (AP-03). Pendiente de revisión del Curator Constitucional; custodia no transferida.

### 🏷️ Core 1 v2.2.2 — Desempate por instante de ingesta (candidata)
* **Fecha:** 23 de Octubre de 2026 · **Naturaleza:** mecanismo modificado ⇒ versión nueva (`core1-price/versions/v2.2.2`); v2.2.1 queda intacta como histórica.
* **Cambio:** el solape se resuelve por `received_at` (instante UTC) en lugar de `received_on` (fecha). Sin instante o empate exacto ⇒ "Consultar". Decisión del Director (23-Oct 10:45 y 11:39); el campo lo delegó a ATLAS-TECH.
* **Pruebas:** 115/115 vectores sintéticos del modelo; mutación (min en vez de max) detectada 110/115. `test:core1:all` actualizado. Sin SQL, sin Supabase, sin cambios en el kernel.
* **Estado:** candidata, NO adoptada, NO desplegada. Autor: ATLAS-TECH (AP-03). Pendiente de revisión del Curator.

### 🛠️ Cierre de OBS-207 — erratas documentales y adaptador v1.1 (candidato)
* **Fecha:** 23 de Octubre de 2026 · **Naturaleza:** mecanismo nuevo ⇒ versión nueva (`core1-price/versions/consumer-adapter-v1.1`); adaptador v1 y versiones congeladas intactas.
* **Documentación corregida:** convocatoria del Director por chat/DIR11 (no del Curador); conteo del runner (12→19 negativas + reproducción + control); "sin SQL v2.2.2"; actualización fechada de procedencia; plantilla de custodia (3 conjuntos, canon COS en `atlas-cos-v1`, commits completos, custodia solo propuesta); manifiesto de recuperación del kernel con baseline `21dfd63a9edbdf76962cb4170f3177de2c6176df`, blobs y SHA256 completos (tag solo propuesto, no creado).
* **Diseño:** `KERNEL-NEW-VERSION-DESIGN.md` refinado (datos por selección, tasa por autoridad/dirección/vigencia, margen fuera del kernel, el kernel propone y no cobra); `RECEIVED-AT-MAPPING-DESIGN.md` (evidencias E1–E7 antes de cualquier SQL; `rates.created_at` sigue UNK).
* **Pruebas (offline):** adaptador v1.1 servidor 30/30 y cliente 24/24 simulados; runner con 21 comprobaciones propias; v2.2.2 115/115, v2.2.1 107/107, v2.2 97/97; `npm test` sin cambios. Sin SQL, Supabase, red, audit:live ni apps.
* **Estado:** candidato, NO adoptado, NO desplegado; custodia no transferida; kernel v1 sin cambios. Autor: ATLAS-TECH (AP-03). Pendiente de revisión del Curator.

## 2026-10-23 — ATLAS-TECH (AP-03): OBS-208 / §259 / STATE106 — motor v2.2.3 y adaptador v1.1.1 (candidatos, inertes)
* **Hallazgos atendidos (V11-R1…R5):** NET perdía metadatos; deriva de tasa por fila fuera de fechas; `child_ages={}` aceptado; subtotal rotulado como monto proveedor sin base acreditada; esquema DTO no cerrado en anidados.
* **Versiones nuevas (nada publicado se editó):** `versions/v2.2.3` (120 vectores) y `versions/consumer-adapter-v1.1.1` (43 servidor + 27 cliente, simulados). v2.2.2 y adaptador v1.1 se conservan como históricos; v1, v2.1, adaptador v1, kernel v1 y etiquetas sin cambios.
* **Documentación:** K3 ahora "tasa por selección, solo si se usa"; diseño del kernel §4/§5 con "dictamen técnico del Curator + convocatoria del Director"; mapa de versiones, README y manual §5 actualizados (30 comprobaciones del runner: 28 negativas + reproducción + control).
* **Estado:** candidatos, NO adoptados, NO desplegados; sin SQL, sin acto de custodia firmado, sin tag, sin implementación de kernel. A/B §253 y F-SEC-01 siguen abiertos; la custodia es un acto independiente que requiere decisión del DG.

## 2026-10-23 — ATLAS-TECH (AP-03): convocatoria OBS-213 — Fase A bloqueada; matriz y especificación documental
* **Fase A:** tag anotado `hotel-integrity-kernel-v1.0.0` → `21dfd63a9edbdf76962cb4170f3177de2c6176df` existe solo localmente (objeto `24cfeb0eb027770193ca706e1ea0c3a65031e045`); el push falló (desconexión del remoto) en dos intentos y la API de refs está denegada. **TAG REMOTO NO PUBLICADO.** No se usaron credenciales alternativas, force ni recreación.
* **Fase B:** no iniciada (puerta no satisfecha). Se entregó solo `core1-price/hotel-domain/HOTEL-DOMAIN-MATRIX-20261023.md` y `KERNEL-V2-SPEC-DRAFT-20261023.md` (documentales). Kernel v1, versiones congeladas y `main` sin cambios.

## 2026-10-23 — ATLAS-TECH (AP-03): OBS-215 — kernel v2 aislado (candidato, offline, NO desplegado)
* **Puerta sustitutiva satisfecha:** recuperación de v1 desde `21dfd63` en directorio temporal, 10/10 rutas con blob y SHA-256 idénticos al manifiesto (`core1-price/evidence/V1-RECOVERY-EQUIVALENCE-GATE-20261023.md`). **Deuda visible:** tag `hotel-integrity-kernel-v1.0.0` sigue sin publicar en el remoto.
* **Versión nueva (no sustituye v1):** `kernel-v2/` = `HOTEL-INTEGRITY v2.0.0-candidate` con resultados A (contenido), B (precio por selección, consumiendo Core 1 v2.2.3 / adaptador v1.1.1) y C (propuesta sin conceder reserva/cobro). `kernel/`, `tests/`, `spec/`, `scripts/` y las versiones congeladas de Core 1 sin cambios; `main` del producto sigue en `kernel/index.js`.
* **Pruebas offline:** `test:kernel2` 38/38 (incluye regresión v1 contra el manifiesto de recuperación); `test:kernel2:faults` 13/13 (12 mutaciones + control). Modelo/simulación; sin SQL, Supabase, n8n, apps, `audit:live`, producción. Sin adopción.

## 2026-10-23 — ATLAS-TECH (AP-03): OBS-216 — kernel v2.0.1-candidate (correcciones K2-R1…R7), offline, NO desplegado
* **Versión nueva (mecanismo modificado ⇒ versión nueva):** `kernel-v2.0.1/` = `HOTEL-INTEGRITY v2.0.1-candidate`. `kernel-v2/` (v2.0.0-candidate, snapshot `8c6f5b9`), `kernel/` v1 y las versiones Core 1 congeladas sin cambios; entrada del producto sigue en v1. Core 1 no se reabrió.
* **Correcciones:** vínculo selección↔cotización, vigencia con reloj de servidor, aplicabilidad/evidencia FX ligada, esquema cerrado y proyección pública positiva, ocupación/capacidad efectivas, validación semántica de valores, propuesta C neutral. GAPs declarados en `kernel-v2.0.1/README.md`.
* **Pruebas offline:** `test:kernel201` 61/61 (cotizaciones emparejadas genuinas; incluye regresión de v1 y de v2.0.0 38/38); `test:kernel201:faults` 21/21 (19 mutaciones + control + propagación de salida). Sin SQL, Supabase, n8n, apps, `audit:live`, producción ni adopción. Tag v1 sigue pendiente de publicación.


## 2026-10-23 — ATLAS-TECH (AP-03): OBS-217 — kernel v2.0.2-candidate (dos grupos residuales), offline, NO desplegado
* **Versión nueva (mecanismo modificado ⇒ versión nueva):** `kernel-v2.0.2/` = `HOTEL-INTEGRITY v2.0.2-candidate`. `kernel-v2.0.1/` (snapshot `ef426b9`), `kernel-v2/` (`8c6f5b9`), `kernel/` v1 y Core 1 congelado sin cambios; entrada del producto sigue en v1. Core 1 no se reabrió.
* **G1 vínculo:** snapshot de evaluación del servidor con huellas canónicas (solicitud con edades exactas, DTO, vista, depósito, FX, perfil usado); hotel local verificado; ausente ⇒ CONSULTAR. Consistencia, no autenticidad (UNK backend).
* **G2 contrato público:** catálogos locales, valores anidados validados, motivo externo desconocido ⇒ `CORE1_REASON_UNRECOGNIZED`, salida pública solo con códigos propios.
* **Pruebas offline:** `test:kernel202` 82/82; `test:kernel202:faults` 34/34 (32 mutaciones + control + propagación). Sin SQL, Supabase, n8n, apps, `audit:live`, producción ni adopción. Tag v1 sigue pendiente de publicación.
