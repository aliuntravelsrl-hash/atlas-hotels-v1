# 🏛️ Arquitectura Técnica — ATLAS HOTELS v1

## 1. Topología en el Commercial Operating System (COS v3.5)

El producto hotelero se integra dentro de la capa de **Product Intelligence** conectando armónicamente con los enjambres de metainteligencia y el runtime de conversión:

```text
                         ALIUN TRAVEL SRL
                                │
                COMMERCIAL OPERATING SYSTEM (v3.5)
                                │
      ┌─────────────────────────┼─────────────────────────┐
      │                         │                         │
      ▼                         ▼                         ▼
   CUSTOMER                  PRODUCT                    EVENT
 INTELLIGENCE              INTELLIGENCE              INTELLIGENCE
 (CRM Pipeline)                 │                     (EventBus)
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
             HOTELS        EXCURSIONES       CRUCEROS
        (hotels_master) (atlas_excurs.)   (cruceros v1)
                │
                ▼
      ┌───────────────────────────────────┐
      │ INTEGRITY MONITOR (MIRROR KERNEL) │
      │   • 7 Pilares de Integridad       │
      │   • Normalizador FIN-ID-001       │
      │   • Route Dispatcher (B2C / B2B)  │
      └─────────────────┬─────────────────┘
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
   ARIADNE SWARM                 ATLAS SWARM
(Introspección Interna)       (Percepción Externa)
   • Health Telemetry            • Paridad Tarifas
   • Schema Consistency          • Arbitraje OTAs
         │                             │
         └──────────────┬──────────────┘
                        ▼
                COMMERCIAL RUNTIME
            (PRODUCT + CONTEXT + STATE)
                        │
                HERMES COMMERCIAL
            (Cotizaciones & Cierres)
```

---

## 2. Flujo de Datos y Pipeline de Validación

1. **Ingesta desde SSOT:** El módulo consulta `public.hotels_master` y tablas relacionales en Supabase.
2. **Evaluación de Pilares (`HotelIntegrityEvaluator`):** Se verifica que el hotel cumpla los 7 pilares obligatorios.
3. **Acumulación de Variables (`HotelVariableAccumulator`):** Se cruza con la tasa cambiaria oficial (`FIN-ID-001`) y se estructuran las tipologías de habitación con sus márgenes netos.
4. **Despacho de Rutas (`HotelRouteDispatcher`):**
   - Si Health Score == 7/7 $\rightarrow$ Ruta `ACTIVE` (disponible para B2C Booking, Cotizador Hermes y Comparador).
   - Si Health Score < 7/7 $\rightarrow$ Ruta `BLOCKED / QUARANTINE` y se dispara evento a Ariadne Data.
