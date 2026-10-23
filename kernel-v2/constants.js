'use strict';
// HOTEL-INTEGRITY v2.0.0-candidate — MODELO/SIMULACIÓN OFFLINE; NO DESPLEGADO; NO ADOPTADO. Aislado de kernel/ (v1).
const KERNEL_VERSION = 'HOTEL-INTEGRITY v2.0.0-candidate';
const LABEL = 'MODELO/SIMULACIÓN OFFLINE; NO DESPLEGADO';
const STATES = Object.freeze({ ABSENT: 'AUSENTE', UNVERIFIED: 'NO_VERIFICADO', NOT_APPLICABLE: 'NO_APLICABLE', PRESENT: 'PRESENTE' });
// Contratos Core 1 candidatos que este kernel sabe consumir (no implica adopción).
const CORE1 = Object.freeze({
  DTO_VERSION: 'CORE1-PRICE-PUBLIC-DTO-v1.1.1',
  MECHANISM: 'core1_price_pure_v2_2_3',
  VIEW_VERSION: 'CORE1-PRICE-INTERNAL-VIEW-v1.1.1',
  ENGINE: 'CORE1-PRICE-ENGINE-v2.2.3',
});
const FX = Object.freeze({ AUTHORITIES: ['MISSION_CONTROL'], DIRECTIONS: ['DOP_PER_USD'] });
const OCCUPANCY_BY_ADULTS = Object.freeze({ 1: 'SGL', 2: 'DBL', 3: 'TPL', 4: 'QUAD' });
const CHILD_RULE_KINDS = Object.freeze(['PERCENT', 'FIXED', 'FREE']);
const INTERNAL_ACTORS = Object.freeze(['OPERATOR', 'AI_SELLER']); // etiqueta de simulación; NO acredita autorización real del backend
module.exports = { KERNEL_VERSION, LABEL, STATES, CORE1, FX, OCCUPANCY_BY_ADULTS, CHILD_RULE_KINDS, INTERNAL_ACTORS };
