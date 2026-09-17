# 🏨 ATLAS HOTELS v1 — Repositorio Modelo de Producto Hotelero
**Ecosistema:** Commercial Operating System (ATLAS / COS v3.5)  
**Dominio:** Product Intelligence · Experiences & Accommodation  
**Núcleo:** Integrity Monitor Mirror Kernel (SSOT)  
**Autoridad Soberana:** Director General Aldo Hilario / Curator Constitucional  
**Versión:** 1.0.0 · Septiembre 2026  

---

## 🧭 Propósito y Rol en el COS

`atlas-hotels-v1` es el repositorio modelo canónico que define la interfaz, especificación y mecanismos de auditoría para la vertical hotelera en Aliun Travel SRL. 

A diferencia de un repositorio monolítico tradicional, este módulo implementa el **Integrity Monitor Mirror Kernel**, actuando como el acumulador central de variables, normalizador cambiario (**FIN-ID-001**) y enrutador determinístico que conecta:

1. **La Base de Datos Maestra (Supabase SSOT):** `public.hotels_master` (113 hoteles auditados), `public.hotel_rooms`, `public.hotel_rates`, etc.
2. **La Metainteligencia:** Introspección interna vía **Ariadne Data** y arbitraje de mercado exterior vía **Atlas Intel**.
3. **El Commercial Runtime:** Entrega de payloads limpios y verificados hacia **Hermes Commercial**, el cotizador de reservas y el comparador B2C/B2B.

---

## 🏛️ Estructura del Repositorio

```text
atlas-hotels-v1/
├── README.md                                  # Manifiesto y propósito de la vertical
├── ARCHITECTURE.md                            # Topología en Product Intelligence y COS
├── AGENTS.md                                  # Reglas y directivas de desarrollo
├── MANUAL_OPERACION_HOTELS_MIRROR_KERNEL_v1.md# Manual de operación y control de versiones
│
├── spec/                                      # ESPECIFICACIONES Y CONTRATOS
│   ├── MIRROR-KERNEL-HOTEL-SPEC-v1.md         # Definición de los 7 Pilares del Kernel Espejo
│   ├── HOTEL-VARIABLE-SCHEMA.json             # Schema JSON estricto del producto acumulado
│   └── ROUTE-DISPATCH-CONTRACT.md             # Contrato de rutas (B2C, B2B, Swarm, EventBus)
│
├── kernel/                                    # MOTOR DE INTEGRIDAD Y ENRUTAMIENTO
│   ├── HotelIntegrityEvaluator.js             # Validador de Health Score (7/7) por hotel
│   ├── HotelVariableAccumulator.js            # Acumulador de variables (PVP, Net, FIN-ID-001, Rooms)
│   ├── HotelRouteDispatcher.js                # Evaluador de estado de ruta (OK / DEGRADED / BLOCKED)
│   └── index.js                               # Exportador unificado del Mirror Kernel
│
├── telemetry/                                 # PUENTES CON METAINTELIGENCIA
│   ├── ariadne-bridge.json                    # Telemetría forense e integridad relacional
│   └── atlas-intel-bridge.json                # Señales de paridad tarifaria y arbitraje
│
├── fixtures/                                  # FIXTURES Y CASOS DE PRUEBA
│   ├── sample_hotel_full_pass.json            # Hotel canónico con Health Score 7/7
│   └── sample_hotel_degraded.json             # Hotel con anomalías de fotos o tarifas
│
└── tests/                                     # PRUEBAS AUTOMATIZADAS
    ├── kernel_evaluation.test.js              # Validación de los 7 pilares
    └── variable_accumulation.test.js          # Validación de cálculo cambiario y márgenes
```

---

## 🛡️ Los 7 Pilares del Mirror Kernel Hotelero

Todo hotel debe obtener una calificación **PASS (7/7)** antes de habilitar su ruta comercial:

1. **Identidad:** ID único, slug normalizado, estrellas, zona geográfica y estado activo.
2. **Habitaciones:** Tipologías mapeadas con capacidades máximas/mínimas de adultos y niños.
3. **Tarifas & Márgenes:** Costo neto B2B, markup comercial (15% neto) y precios base.
4. **Temporadas:** Rangos de validez activos y mínimos de noches requeridos.
5. **Multimedia:** URLs de fotos CDN válidas, libres de bloqueos CORS/Referer.
6. **Políticas:** Reglas claras de cancelación, penalidades, check-in y check-out.
7. **Divisa (FIN-ID-001):** Conversión obligatoria vinculada a `rate_sell` en `public.exchange_rates`.

---

## 🚀 Uso Rápido

```bash
# Ejecutar suite de pruebas unitarias
npm test

# Auditar un hotel con el Mirror Kernel
node -e "const { evaluateHotel } = require('./kernel'); console.log(evaluateHotel(require('./fixtures/sample_hotel_full_pass.json')))"
```
