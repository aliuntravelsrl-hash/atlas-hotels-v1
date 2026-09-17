# 📜 Especificación Canónica: Mirror Kernel para Hoteles v1.0
**Documento:** `spec/MIRROR-KERNEL-HOTEL-SPEC-v1.md`  
**Ecosistema:** Commercial Operating System (ATLAS / COS v3.5)  

---

## Los 7 Pilares de Integridad Hotelera

| Pilar | Campo Requerido en SSOT | Criterio de Aceptación (PASS) |
| :--- | :--- | :--- |
| **1. Identidad** | `id`, `name`, `slug`, `zone`, `stars`, `is_active` | ID unívoco, slug URL-safe, zona válida, 1-5 estrellas, `is_active == true`. |
| **2. Habitaciones** | `rooms` (array) | Al menos 1 tipología activa con capacidad de adultos >= 1 y descripción. |
| **3. Tarifas** | `rates` (array) / `base_price_usd` | Al menos 1 tarifa vigente > 0 con margen comercial neto definido. |
| **4. Temporadas** | `seasons` (array) | Rangos de fecha definidos sin solapamientos inválidos y min_stay >= 1. |
| **5. Multimedia** | `photos` (array) | Mínimo 3 fotos en CDN seguro con URL HTTPS accesible. |
| **6. Políticas** | `policies` (object) | Check-in, check-out y reglas de cancelación expresadas explícitamente. |
| **7. Divisa (FIN-ID-001)**| `exchange_rate` | Tasa de cambio oficial vinculada a `public.exchange_rates.rate_sell`. |
