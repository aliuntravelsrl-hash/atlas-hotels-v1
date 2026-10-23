'use strict';
// Catálogos LOCALES del contrato público Core 1 v1.1.1 (adaptador candidato). Nada externo se publica fuera de estos catálogos.
const REASONS = Object.freeze({
  SELECTION_UNAVAILABLE: 'Esta selección no está disponible para cotizar en línea.', NO_RATE_FOR_DATES: 'No hay tarifa vigente para esas fechas.',
  OCCUPANCY_NOT_SUPPORTED: 'La ocupación elegida no se puede cotizar.', AGE_PRICE_UNAVAILABLE: 'No se puede cotizar con esas edades.',
  CURRENCY_CONVERSION_UNAVAILABLE: 'No hay conversión de moneda vigente.', CURRENCY_NOT_ALLOWED: 'Esa moneda no está disponible.',
  DATES_INVALID: 'Las fechas no son válidas.', REQUEST_INVALID: 'La solicitud no es válida.', PRICE_UNAVAILABLE: 'Precio no disponible por ahora; consulte.',
  SERVICE_PAUSED: 'La cotización en línea está en pausa; consulte.', PENDING_REVIEW: 'Tarifa en revisión; consulte.', SELECTION_INVALID: 'La selección no es válida.',
  PRODUCT_NOT_SUPPORTED: 'Este producto se cotiza por otro camino.', FX_DRIFT: 'No hay conversión de moneda vigente.', AGES_NOT_CONFIRMED: 'Confirme las edades de los niños.',
  AGE_INVALID: 'Las edades deben ser números enteros de 0 a 17.', ROOM_NOT_SELECTED: 'Elija una habitación.', FORBIDDEN_FIELD: 'La solicitud no es válida.',
  CONTRACT_VERSION_UNSUPPORTED: 'Versión no soportada.', VERSION_MISMATCH: 'Precio no disponible por ahora; consulte.',
});
const CONDITIONS = Object.freeze({
  TAX_NOTE: 'Impuestos y cargos extra, si aplican, se indican en el voucher o la factura; este monto no certifica un total con impuestos.',
  SUPPLEMENT_NOTE: 'Pueden aplicar suplementos; se indican en el voucher.',
  AGE_RECLASSIFIED_AS_ADULT: 'Los menores desde la edad de adulto del hotel se cotizan como adultos.',
  REFERENCE_SUBJECT_TO_CONFIRMATION: 'Referencia sujeta a confirmación. No es una reserva ni un cobro.',
});
const BOOKING_STATUS = Object.freeze(['REQUIRES_OPERATOR']);
const CHANNEL_MODES = Object.freeze(['ASSISTED', 'NONE']);
const CHANNEL_STATUS = Object.freeze(['ACCREDITED', 'PENDING_NOT_ACCREDITED']);
const NO_PRICE_STATUS = Object.freeze(['CONSULT', 'REQUEST_INVALID']);
const UNIT = Object.freeze(['STAY_TOTAL']);
const has = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
module.exports = { REASONS, CONDITIONS, BOOKING_STATUS, CHANNEL_MODES, CHANNEL_STATUS, NO_PRICE_STATUS, UNIT, has };
