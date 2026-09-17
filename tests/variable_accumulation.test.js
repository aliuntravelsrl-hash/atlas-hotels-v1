const assert = require('assert');
const { evaluateHotel } = require('../kernel');
const samplePass = require('../fixtures/sample_hotel_full_pass.json');

console.log('🧪 Iniciando prueba: HotelVariableAccumulator & FIN-ID-001');

const exchangeRate = 60.00;
const output = evaluateHotel(samplePass, exchangeRate);

// Verificar Financials
const fin = output.payload.financials;
assert.strictEqual(fin.base_rate_usd, 240.0, 'Base USD debe ser 240.0');
assert.strictEqual(fin.rate_sell_dop, 60.00, 'Tasa sell debe coincidir');
assert.strictEqual(fin.base_rate_dop, 14400.0, 'Base DOP calculada debe ser 240 * 60 = 14400.0');
assert.strictEqual(fin.commercial_margin_pct, 15.0, 'Margen comercial debe ser 15.0%');

// Verificar Despacho de Rutas
assert.strictEqual(output.dispatch.route_status, 'ACTIVE', 'Ruta debe ser ACTIVE');
assert.strictEqual(output.dispatch.channels.b2c_booking, true, 'Canal B2C debe estar habilitado');
assert.strictEqual(output.dispatch.channels.hermes_commercial_quote, true, 'Canal Hermes debe estar habilitado');

console.log('  ✅ Conversion cambiaria deterministica y despacho de rutas: OK');
console.log('🎉 Todas las pruebas de acumulacion pasaron con exito.');
