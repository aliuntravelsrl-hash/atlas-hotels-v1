'use strict';
// Cobertura por vínculo: cómo trata el adaptador candidato cada M01–M25. NO cierra ningún UNKNOWN: «accredited» = el dato solo entra por un lector inyectado con fuente acreditada;
// «physical_structure» = columna observada usada solo como estructura (con verificación cruzada); «ignored_by_design» = nunca se consume. Ningún vínculo pasa a production_ready.
const C = (handling, effect) => Object.freeze({ handling, effect });
module.exports = Object.freeze({
  M01: C('accredited', 'registro autorizado hotel_ref→hotel_id; hotels_master.id/slug solo verifican existencia'),
  M02: C('accredited', 'sin registro de plan/proveedor ⇒ CONTEXT_NOT_FOUND'),
  M03: C('physical_structure', 'rooms.id verifica la habitación del registro; rooms.room_type/type no se homologan'),
  M04: C('physical_structure', 'rooms.hotel_id ⇒ room_row_hotel_id tal cual (el motor detecta la contradicción)'),
  M05: C('accredited', 'map_hotel_id solo del registro; sin él ⇒ CONTEXT_NOT_FOUND'),
  M06: C('accredited', 'product solo del registro'),
  M07: C('physical_structure', 'rates.id'),
  M08: C('accredited', 'revisión por fila solo del lector de términos; sin ella ⇒ CONTEXT_UNAVAILABLE'),
  M09: C('physical_structure', 'rates.room_id + rooms.hotel_id; provider_id solo de términos acreditados'),
  M10: C('accredited', 'valid_from/valid_to + convención TO_EXCLUSIVE|TO_INCLUSIVE acreditada; sin convención ⇒ CONTEXT_UNAVAILABLE'),
  M11: C('accredited', 'unit/price_basis/precios por ocupación solo de términos acreditados'),
  M12: C('physical_structure', 'rates.currency'),
  M13: C('ignored_by_design', 'rates.created_at NUNCA es received_at'),
  M14: C('accredited', 'received_at solo con recibo PROVEN acreditado; si no, RECEIVED_AT_UNPROVEN en la frontera del productor'),
  M15: C('accredited', 'source_document/verification_status solo de términos acreditados'),
  M16: C('accredited', 'bandas/modo/adult_from_age solo de perfil de fila acreditado; room_occupancy_rules solo verifica coherencia'),
  M17: C('accredited', 'capacidad solo acreditada, con precedencia explícita si capacity_kids≠capacity_children'),
  M18: C('physical_structure', 'hotels_master + hotel_profiles verifican identidad del perfil acreditado'),
  M19: C('accredited', 'profile_version solo acreditado; sin él ⇒ CONTEXT_REVISION_MISSING'),
  M20: C('accredited', 'deposit_policy solo de política gobernada; hotel_profiles.politica_deposito y hotel_policies.content no se parsean'),
  M21: C('accredited', 'monedas/TTL/aviso solo de política gobernada'),
  M22: C('accredited', 'FX solo de política gobernada'),
  M23: C('accredited', 'revisiones fijadas e inmutables por autoridad inyectada; sin ellas ⇒ CONTEXT_REVISION_MISSING'),
  M24: C('ignored_by_design', 'room_type_synonyms: la sinonimia no acredita código de proveedor'),
  M25: C('ignored_by_design', '_audit_rates_snapshots: superficie de lote; snapshot_at no es received_at'),
});
