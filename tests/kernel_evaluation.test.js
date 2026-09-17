const assert = require('assert');
const { HotelIntegrityEvaluator, HotelRouteDispatcher } = require('../kernel');
const samplePass = require('../fixtures/sample_hotel_full_pass.json');
const sampleDegraded = require('../fixtures/sample_hotel_degraded.json');

console.log('🧪 Iniciando prueba: HotelIntegrityEvaluator');

// Test 1: Caso PASS (7/7)
const resPass = HotelIntegrityEvaluator.evaluate(samplePass, 60.50);
assert.strictEqual(resPass.score, 7, 'El hotel completo debe obtener Health Score 7/7');
assert.strictEqual(resPass.verdict, 'PASS', 'El veredicto debe ser PASS');
assert.strictEqual(resPass.gaps.length, 0, 'No deben existir gaps en hotel completo');
console.log('  ✅ Test 1 (PASS 7/7): OK');

// Test 2: Caso DEGRADED (< 7)
const resDegraded = HotelIntegrityEvaluator.evaluate(sampleDegraded, 60.50);
assert(resDegraded.score < 7, 'El hotel con fotos incompletas debe tener score < 7');
assert.strictEqual(resDegraded.verdict, 'DEGRADED', 'El veredicto debe ser DEGRADED');
assert(resDegraded.gaps.length > 0, 'Deben registrarse gaps');
console.log('  ✅ Test 2 (DEGRADED con gaps de multimedia): OK');

console.log('🎉 Todas las pruebas de evaluacion de integridad pasaron con exito.');
