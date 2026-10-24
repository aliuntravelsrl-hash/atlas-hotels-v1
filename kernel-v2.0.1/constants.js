'use strict';
// HOTEL-INTEGRITY v2.0.1-candidate — MODELO/SIMULACIÓN OFFLINE; NO DESPLEGADO; NO ADOPTADO. Revisión de v2.0.0-candidate (snapshot 8c6f5b9, carpeta kernel-v2/ intacta).
const KERNEL_VERSION = 'HOTEL-INTEGRITY v2.0.1-candidate';
const SUPERSEDES = 'HOTEL-INTEGRITY v2.0.0-candidate (kernel-v2/, commit 8c6f5b993261b94f2aa464e332fd499d7ff0c80d)';
const LABEL = 'MODELO/SIMULACIÓN OFFLINE; NO DESPLEGADO';
const STATES = Object.freeze({ ABSENT: 'AUSENTE', UNVERIFIED: 'NO_VERIFICADO', NOT_APPLICABLE: 'NO_APLICABLE', PRESENT: 'PRESENTE' });
const CORE1 = Object.freeze({ DTO_VERSION: 'CORE1-PRICE-PUBLIC-DTO-v1.1.1', MECHANISM: 'core1_price_pure_v2_2_3', VIEW_VERSION: 'CORE1-PRICE-INTERNAL-VIEW-v1.1.1', ENGINE: 'CORE1-PRICE-ENGINE-v2.2.3', REQUEST_CONTRACT: 'CORE1-PRICE-CONSUMER-ADAPTER-v1.1.1' });
const CURRENCIES = Object.freeze(['USD', 'DOP']);
const FX = Object.freeze({ PAIR: 'USD_DOP', DIRECTION: 'DOP_PER_USD' });
const OCCUPANCY_BY_ADULTS = Object.freeze({ 1: 'SGL', 2: 'DBL', 3: 'TPL', 4: 'QUAD' });
const CHILD_RULE_KINDS = Object.freeze(['PERCENT', 'FIXED', 'FREE']);
const INTERNAL_ACTORS = Object.freeze(['OPERATOR', 'AI_SELLER']); // etiqueta de simulación; NO acredita autorización real del backend
module.exports = { KERNEL_VERSION, SUPERSEDES, LABEL, STATES, CORE1, CURRENCIES, FX, OCCUPANCY_BY_ADULTS, CHILD_RULE_KINDS, INTERNAL_ACTORS };
