'use strict';
// Datos SINTÉTICOS (no es Viva Miches ni hotel real). Replican los escenarios del generador candidato de kernel-v2.0.3 para demostrar paridad byte a byte.
const fs = require('fs'); const path = require('path');
const clone = (o) => JSON.parse(JSON.stringify(o));
const ROW = { id: 'R1', revision: 1, hotel_id: 'H1', provider_id: 'P1', room_type_id: 'RT1', stay_from: '2027-03-01', stay_until_exclusive: '2027-04-01', currency: 'USD', unit: 'PERSON_NIGHT', placeholder: false, is_active: true,
  verification_status: 'VERIFIED', review_evidence_ref: 'SYNTH-REVIEW', source_document_id: 'SYNTH-DOC', price_basis: 'CLIENT_FINAL', taxes_included: true, occupancy_rates: { SGL: '150', DBL: '100', TPL: '90' },
  age_policy: { adult_from_age: 13, bands: [{ label: 'INFANT', from_age: 0, to_age: 2, price: { mode: 'FREE' }, max_per_room: 1 }, { label: 'CHILD', from_age: 3, to_age: 12, price: { mode: 'PERCENT_OF_DBL', value: '50' } }] },
  capacity: { max_total: 4, max_adults: 3, max_children: 2 }, received_at: '2026-09-01T09:00:00Z' };
const RT3 = Object.assign(clone(ROW), { id: 'R3', room_type_id: 'RT3', occupancy_rates: { SGL: '120', DBL: '80', TPL: '70' }, capacity: { max_total: 3, max_adults: 2, max_children: 1 } });
const FXA = { id: 'FXA1', pair: 'USD_DOP', exchange_rate_ref: 'FXG1', active: true, effective_from: '2026-10-23T00:00:00Z', effective_until_exclusive: '2026-10-23T23:00:00Z', approved_by_ref: 'SYNTH-APPROVER', source_ref: 'SYNTH-SRC', source_version: 'SYNTH-V1', rate_observed: '62' };
const FXG = { FXG1: { version: 'SYNTH-V1', rate_sell: '62', direction: 'DOP_PER_USD' } };
const DEP_FULL = { type: 'FULL_PAYMENT' };
const DEP_MIN = { type: 'DEFAULT_MAX_PERCENT_OR_ROOM_MIN', percentage: '0.30', minimum_per_room: { amount: '6000', currency: 'DOP' } };
const row = (o) => Object.assign(clone(ROW), o || {});
function baseData() {
  return { hotels: { 'H-REF': { hotel_id: 'H1' } }, provider_plans: { PP1: { hotel_ref: 'H-REF', provider_id: 'P1' } },
    rooms: { RM1: { provider_plan_ref: 'PP1', product: 'CORE1', room_type_id: 'RT1', room_row_hotel_id: 'H1', map_hotel_id: 'H1' }, RM3: { provider_plan_ref: 'PP1', product: 'CORE1', room_type_id: 'RT3', room_row_hotel_id: 'H1', map_hotel_id: 'H1' } },
    rates: [row()], evidence: { R1: 'PROVEN', R3: 'PROVEN' }, source_document: {},
    policy: { deposit_policy: clone(DEP_FULL), accepted_payment_currencies: ['USD', 'DOP'], quote_ttl_minutes: 30, review_notice_days: null, fx_approvals: [], fx_governed: {}, fx_authorities: ['SYNTH-APPROVER'] },
    hotel: JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'kernel-v2.0.3', 'fixtures', 'hotel_synthetic.json'), 'utf8')) };
}
const req = (rid, adults = 2, ages = [], pay = 'USD', room = 'RM1') => { const r = { room_ref: room, adults, child_ages: ages }; if (ages.length) r.ages_confirmed = true;
  return { request_id: rid, contract_version: 'CORE1-PRICE-CONSUMER-ADAPTER-v1.1.1', channel: 'PORTAL', hotel_ref: 'H-REF', provider_plan_ref: 'PP1', rooms: [r], check_in: '2027-03-28', check_out: '2027-03-29', payment_currency: pay }; };
const FX = (d) => { d.policy.fx_approvals = [clone(FXA)]; d.policy.fx_governed = clone(FXG); return d; };
const SC = {   // mismos escenarios y mismos ids que tools/gen_paired_quotes_v203.py.inert
  base: () => [req('Q-base'), baseData()],
  adults3: () => [req('Q-adults3', 3), baseData()],
  child12: () => [req('Q-child12', 2, [12]), baseData()],
  infant1: () => [req('Q-infant1', 2, [1]), baseData()],
  reclass15: () => [req('Q-reclass15', 2, [15]), baseData()],
  fx_total_dop: () => [req('Q-fx-total', 2, [], 'DOP'), FX(baseData())],
  same_ccy_dop: () => { const d = baseData(); d.rates = [row({ currency: 'DOP', occupancy_rates: { SGL: '9000', DBL: '6000', TPL: '5400' } })]; return [req('Q-dop-same', 2, [], 'DOP'), d]; },
  deposit_conv: () => { const d = FX(baseData()); d.policy.deposit_policy = clone(DEP_MIN); return [req('Q-dep-conv'), d]; },
  expired_condition: () => { const d = baseData(); d.rates = [row({ condition_notes: [{ id: 'C1', text: 'Nino a 35 hasta 01-Oct', expires_on: '2026-10-01' }] })]; return [req('Q-expired-cond'), d]; },
  net_consult: () => { const d = baseData(); d.rates = [row({ price_basis: 'NET_PROVIDER' })]; return [req('Q-net'), d]; },
  rm3_dbl: () => { const d = baseData(); d.rates = [row(), clone(RT3)]; return [req('Q-rm3', 2, [], 'USD', 'RM3'), d]; },
};
module.exports = { SC, baseData, req, row, clone, FXA, FXG, DEP_MIN };
