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
