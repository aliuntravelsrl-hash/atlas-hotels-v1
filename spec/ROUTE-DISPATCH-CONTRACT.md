# 🚦 Contrato de Despacho de Rutas Hoteleras
**Documento:** `spec/ROUTE-DISPATCH-CONTRACT.md`  

---

### Canales de Consumo:
1. **B2C Booking (`atlas-booking-frontend-v2`):** Solo consume hoteles con `route_status == 'ACTIVE'`.
2. **Hermes Commercial Swarm (`hermes-commercial`):** Puede consultar hoteles `ACTIVE` y `DEGRADED` (con advertencia explicita).
3. **Ariadne Data Telemetry:** Recibe notificaciones inmediatas de cualquier hotel que caiga a `DEGRADED` o `BLOCKED`.
