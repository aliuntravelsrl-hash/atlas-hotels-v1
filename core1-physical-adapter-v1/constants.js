'use strict';
// Adaptador físico de puertos Core 1 — CANDIDATO INERTE/OFFLINE. No desplegado, no adoptado. Sin cliente Supabase, red, SQL, RPC, credenciales ni escritura.
// Lecturas SOLO por dependencias inyectadas (asíncronas). Este paquete no importa ningún cliente de base de datos.
const ADAPTER_VERSION = 'CORE1-PHYSICAL-PORT-ADAPTER-v1-candidate';
const LABEL = 'MODELO/SIMULACIÓN OFFLINE; NO DESPLEGADO; NO ADOPTADO';
const SPEC_REF = 'SPEC-CORE1-PHYSICAL-PORT-ADAPTER-v1-20261025 (Office fd8762e)';
// Estados de fallo de puerto = catálogo CERRADO existente del productor v1.1 (publicCodes: CONTEXT_<estado>). Nada más cruza la frontera.
const PORT_STATUSES = Object.freeze(['UNAVAILABLE', 'NOT_FOUND', 'REVISION_MISSING', 'SHAPE_INVALID']);
const PORTS = Object.freeze(['selection', 'rates', 'profile', 'policy']);
module.exports = { ADAPTER_VERSION, LABEL, SPEC_REF, PORT_STATUSES, PORTS };
