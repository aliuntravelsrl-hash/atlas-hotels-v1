'use strict';
// RA-R1 — vectores SINTÉTICOS compartidos por el modelo (tests/run_ra1_model_tests.js) y el laboratorio SQL (tests/lab/run_lab.js): misma tabla, mismo resultado esperado.
// Esquema/normalización admitidos: ver cabecera de model/ra1.js. «limit» = formas NO admitidas, fijadas como límite DECLARADO (no son pruebas de cobertura).
const k = (key, value, expect_fx, id) => ({ id: id || key, content: { currency: 'USD', unit: 'PERSON_NIGHT', rows: [{ adult: 100 }], compare: { [key]: value } }, expect_fx });
const CONTENT_VECTORS = [
  // conversión: claves con conversión en las formas admitidas (snake, camel, Pascal, kebab, espacio, mayúsculas, siglas, anidadas)
  k('exchange_rate', 60.2, true), k('exchangeRate', 60.2, true), k('ExchangeRate', 60.2, true), k('exchange-rate', 60.2, true), k('exchange rate', 60.2, true), k('EXCHANGE_RATE', 60.2, true), k('exchangeRates', 60.2, true),
  k('fxRate', 1, true), k('fx_rate', 1, true), k('FXRate', 1, true), k('FX', 1, true), k('usdFx', 1, true), k('amountDOP', 1, true), k('dop', 1, true), k('DOP_amount', 1, true), k('dopPrice', 1, true), k('equivalentDop', 1, true), k('equivalent_usd', 1, true), k('Equivalents', 1, true),
  { id: 'anidada-en-arreglo', content: { currency: 'USD', rows: [{ adult: 100, extra: [{ deep: { exchangeRate: 1 } }] }] }, expect_fx: true },
  { id: 'deposito-moneda-DOP', content: { currency: 'USD', rows: [{ adult: 100 }], deposit: { currency: 'DOP', min: 5000 } }, expect_fx: true },
  { id: 'depositCurrency-EUR', content: { currency: 'USD', rows: [{ adult: 100 }], deposit: { depositCurrency: 'EUR' } }, expect_fx: true },
  { id: 'deposit_currency-null', content: { currency: 'USD', rows: [{ adult: 100 }], deposit: { deposit_currency: null } }, expect_fx: true },
  { id: 'Currency-numero', content: { currency: 'USD', rows: [{ adult: 100 }], deposit: { Currency: 1 } }, expect_fx: true },
  { id: 'currency-minuscula-usd', content: { currency: 'usd', rows: [{ adult: 100 }] }, expect_fx: true },
  { id: 'currency-raiz-EUR', content: { currency: 'EUR', rows: [{ adult: 100 }] }, expect_fx: true },
  // controles USD genuinos (no deben clasificarse como conversión)
  { id: 'control-usd-base', content: { currency: 'USD', unit: 'PERSON_NIGHT', rows: [{ stay_from: '2027-01-10', stay_until_exclusive: '2027-01-17', adult: 100 }], deposit: { currency: 'USD', pct: 30 } }, expect_fx: false },
  { id: 'control-depositCurrency-USD', content: { currency: 'USD', rows: [{ adult: 100 }], deposit: { depositCurrency: 'USD' } }, expect_fx: false },
  k('adopt', 1, false), k('adoption', 1, false), k('dopamine', 1, false), k('rates', 1, false), k('rate', 1, false), k('index', 1, false), k('fixed', 1, false), k('fxi', 1, false), k('indop', 1, false), k('Mixture', 1, false),
];
// Límites DECLARADOS (esperado = no detectado). Se prueban en modelo y SQL para que cualquier cambio de alcance sea visible, NO como cobertura.
const LIMIT_VECTORS = [
  k('fxrate', 1, false, 'limit-fxrate-sin-separador'), k('dopprice', 1, false, 'limit-dopprice-sin-separador'), k('tasaCambio', 1, false, 'limit-otro-idioma'), k('conversionRate', 1, false, 'limit-termino-conversion-no-admitido'),
  { id: 'limit-valor-DOP-en-clave-no-moneda', content: { currency: 'USD', rows: [{ adult: 100 }], unit: 'DOP' }, expect_fx: false },
];
// Política (RA-R1): valores NO admitidos deben rechazarse como SHAPE_INVALID en modelo y SQL; «sql:false» = no expresable como texto SQL.
const POLICY_VECTORS = [
  { id: 'pol-null', policy: null, sql: true }, { id: 'pol-ausente', policy: undefined, sql: true }, { id: 'pol-vacia', policy: '', sql: true }, { id: 'pol-minuscula', policy: 'no_conversion_usd', sql: true },
  { id: 'pol-espacio', policy: ' NO_CONVERSION_USD', sql: true }, { id: 'pol-desconocida', policy: 'OTRA', sql: true }, { id: 'pol-numero', policy: 7, sql: false },
];
// Claves pseudoaleatorias deterministas (LCG fijo) para paridad exhaustiva-parcial modelo↔SQL de la normalización.
function fuzzKeys(n = 600) {
  const P = ['ex', 'change', 'Exchange', 'FX', 'fx', 'Fx', 'DOP', 'dop', 'Dop', 'a', 'A', 'b', '_', '-', ' ', '1', 'Rate', 'rate', 'x', 'X', 'equi', 'valent', 'Currency', 'currency', 'ñ', 'K', 'I', 'ı'];
  let s = 20261028; const next = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s; }; const out = [];
  for (let i = 0; i < n; i++) { let key = ''; const len = 1 + (next() % 6); for (let j = 0; j < len; j++) key += P[next() % P.length]; out.push(key); }
  return Array.from(new Set(out));
}
module.exports = Object.freeze({ CONTENT_VECTORS, LIMIT_VECTORS, POLICY_VECTORS, fuzzKeys });
