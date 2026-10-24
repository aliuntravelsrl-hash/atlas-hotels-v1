'use strict';
// Productor servidor de cotización Core 1 — CANDIDATO INERTE/OFFLINE (OBS-221). No desplegado, no adoptado. Sin conectores, credenciales, SQL ni efectos comerciales.
const PRODUCER_VERSION = 'CORE1-SERVER-QUOTE-PRODUCER-v1-candidate';
const LABEL = 'MODELO/SIMULACIÓN OFFLINE; NO DESPLEGADO; NO ADOPTADO';
const CONTRACT = 'CORE1-PRICE-CONSUMER-ADAPTER-v1.1.1';
const CONTEXT_SCHEMA = 'CORE1-PRICE-CONTEXT-v2.2.3';
// Huellas de las piezas CONGELADAS que el puente carga (solo lectura). Si cambian, el puente se niega a ejecutar.
const FROZEN_PINS = Object.freeze({
  'core1-price/versions/consumer-adapter-v1.1.1/server/consumer_server_sim.py.inert': '3f8fe14c6425610dfdd6d8d1d2a46e6ffd7b17ef4cad67b831c5f076d86a2319',
  'core1-price/versions/v2.2.3/core1_reference_model_v2_2_3.py.inert': '413c35ed7e0ff632fc10e855fe9c4c91120dfa76eb462412c5d436f91d3f94e5',
  'core1-price/versions/consumer-adapter-v1.1.1/CORE1-PRICE-PUBLIC-DTO-v1.1.1.schema.json.inert': 'c15bedddc58f31e239516b753cfd72216215218cf5040e48db6dd9f13b1a5eca',
});
const CLIENT_FIELDS = Object.freeze(['request_id', 'contract_version', 'channel', 'hotel_ref', 'provider_plan_ref', 'rooms', 'check_in', 'check_out', 'payment_currency']);
const ROOM_FIELDS = Object.freeze(['room_ref', 'adults', 'child_ages', 'ages_confirmed']);
const VIEWS = Object.freeze(['PUBLIC', 'INTERNAL']);
const PORTS = Object.freeze(['selection', 'rates', 'profile', 'policy']); // puertos lógicos de lectura (no son tablas)
const READ_ONLY_METHODS = Object.freeze(['resolveSelection', 'getRates', 'getHotelProfile', 'getPolicyAndFx', 'currentRevisions']);
module.exports = { PRODUCER_VERSION, LABEL, CONTRACT, CONTEXT_SCHEMA, FROZEN_PINS, CLIENT_FIELDS, ROOM_FIELDS, VIEWS, PORTS, READ_ONLY_METHODS };
