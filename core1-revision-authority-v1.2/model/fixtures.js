'use strict';
// Fixtures 100 % SINTÉTICOS (ningún dato comercial, PDF, PII ni lote). Nombres genéricos; importes de prueba sin relación con tarifas reales.
const T0 = '2026-10-26T12:00:00Z';
const clockAt = (iso) => { const c = { t: iso }; c.now = () => c.t; c.set = (x) => { c.t = x; }; return c; };
const contentUSD = () => ({ currency: 'USD', unit: 'PERSON_NIGHT', rows: [{ stay_from: '2027-01-10', stay_until_exclusive: '2027-01-17', adult: 100 }], deposit: { currency: 'USD', pct: 30 } });
const contentDepositDOP = () => ({ currency: 'USD', unit: 'PERSON_NIGHT', rows: [{ adult: 100 }], deposit: { currency: 'DOP', min: 5000 } });
const contentCompareFx = () => ({ currency: 'USD', unit: 'PERSON_NIGHT', rows: [{ adult: 100 }], compare: { exchange_rate: 60.2 } });
const pubArgs = (o = {}) => Object.assign({ scope: 'S-1|rates', port: 'rates', content: contentUSD(), members: [{ key: 'doc:D1@1' }, { key: 'map:M1@1' }], horizon: { public: '2026-10-26T13:00:00Z', internal: '2026-10-26T13:30:00Z' }, retention_until: '2026-10-26T15:00:00Z', margin_ms: 60000, fx_policy: 'NO_CONVERSION_USD', received: { kind: 'SERVER' } }, o);
function seeded(createAuthority, clk) { const A = createAuthority({ clock: clk.now }); A.putObject('publisher', { kind: 'doc', id: 'D1', rev: '1', content: { sha: 'synthetic-doc-1' } }); A.putObject('publisher', { kind: 'map', id: 'M1', rev: '1', content: { room: 'synthetic-room-1', hotel: 'synthetic-hotel-1' } }); return A; }
module.exports = Object.freeze({ T0, clockAt, contentUSD, contentDepositDOP, contentCompareFx, pubArgs, seeded });
