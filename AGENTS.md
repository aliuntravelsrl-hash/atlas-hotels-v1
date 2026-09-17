# Reglas y Pautas Operativas de Desarrollo (Ecosistema ATLAS)

## 📌 Manuales de Operación y Control de Versiones Obligatorios
* **Componentes Nuevos o Modificados:** Cada vez que se toquen, modifiquen, refactoren o implementen nuevos componentes lógicos en el frontend (`atlas-booking-frontend-v2`), en el panel administrativo (`-atlas-admin-v2`), en los workflows de n8n o en los kernels de producto (`atlas-hotels-v1`), es **estrictamente obligatorio** crear o actualizar el correspondiente **Manual de Operación y Mapeo de Versiones**.
* **Propósito:** Prevenir y neutralizar de forma proactiva:
  * Descuadres financieros por conversión o etiqueta DOP vs USD (**FIN-ID-001**).
  * Bloqueos CORS y cabeceras de red restrictivas (`Referer`) en el renderizado de imágenes y generación de vouchers.
  * Inconsistencias de despliegues y control de dependencias entre repositorios.
