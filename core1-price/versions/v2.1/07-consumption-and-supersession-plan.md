# 07 — Plan de consumo y sustitución (CS-R9) · ATLAS-TECH · 2026-10-22
Principio: **no se cambia ningún lector legacy ahora.** La función v2 es nueva, cerrada y sin consumidores.

1. Consumidor futuro único: una función de servidor (service_role) que arme `p_ctx` desde las tablas cerradas y llame a `core1_price_pure_v2`. Ningún payload de cliente llega a `p_ctx`.
2. UI "Consultar" (naranja) **no** se garantiza hasta que exista un guard de llamadores: los lectores legacy de `rates` (calcular_cotizacion, consultar_disponibilidad(_completa), get_rates_by_hotel_id, get_meta_catalog_feed, calcular_precio_paquete 6/7/8 args) siguen viendo solo `rates`; las tarifas nuevas no están ahí, por lo que fallan cerrado a "consultar" sólo si el llamador trata la ausencia como tal. Eso es **UNK** hasta verificar si el código desplegado coincide con el repo.
3. Sustitución: cuando el Curador adopte, cada dominio afectado versiona su mecanismo (v1→v2) y se retira el uso de `calcular_precio_paquete` por llamador, uno a uno, con prueba de regresión previa. Sin DROP de legacy en este paquete.
4. Pruebas de consumo: tabla llamador→función→estado (pendiente de inventario read-only del Curador/AP-08).
5. Fuera de esta función: PayPal (corte 20 días, sin recargo exclusivo 4% al cliente, comisiones de transferencia distintas) va en el **adendo separado** `ADDENDUM-PAYPAL-SEPARADO`; no entra en el cálculo puro.
