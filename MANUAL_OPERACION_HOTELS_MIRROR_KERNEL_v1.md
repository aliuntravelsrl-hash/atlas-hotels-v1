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
4. **Verificación de custodia:** `sha256sum -c core1-price/MANIFEST.sha256` y `npm run test:core1:all` (modelos, adaptador simulado y 21 comprobaciones del runner: 19 negativas, 1 reproducción del defecto y 1 control positivo (más adaptador v1.1 simulado 30+24); código de salida real; no prueba SQL ni Admin ni web ni ejecuta audit:live).
5. **Sin datos reales:** las tarifas viven en Supabase; este repositorio no guarda tarifas, secretos, JWT, IDs de chat ni PII.
6. **Hallazgo abierto:** `core1-price/KERNEL-ALIGNMENT-FINDINGS.md` (el kernel actual completa datos con valores por defecto; decisión pendiente del Curador).
