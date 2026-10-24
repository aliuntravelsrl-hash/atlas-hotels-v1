'use strict';
const { KERNEL_VERSION, LABEL, INTERNAL_ACTORS, CORE1 } = require('./constants');
const { evaluateContent } = require('./contentIntegrity');
const { evaluatePriceReadiness, checkContract } = require('./priceReadiness');
const { proposeEnablement } = require('./enablementProposal');
/**
 * evaluate(hotel, selection, core, ctx)
 *  hotel: registro con datos {value,origin,version} o estados explícitos; selection: {room_ref, adults, child_ages};
 *  core: {public_dto, internal_view?} producidos por Core 1 v2.2.3 / adaptador v1.1.1 (candidatos; este kernel no los calcula);
 *  ctx: {now, fx?, actor?}. actor es solo una etiqueta de simulación: NO acredita autorización del backend.
 */
function evaluate(hotel, selection, core, ctx = {}) {
  let A, B;
  try { A = evaluateContent(hotel); } catch (e) { A = { verdict: 'INCOMPLETO', checks: [], gaps: [{ id: 'EVALUATION_ERROR', status: 'ERROR' }] }; }
  try { B = evaluatePriceReadiness(hotel, selection, core, ctx); } catch (e) { B = { verdict: 'RECHAZADO', reasons: ['EVALUATION_ERROR'], applicable: [], not_applicable: [] }; } // los fallos se propagan como estado explícito, nunca como pasa
  const C = proposeEnablement(A, B);
  const out = { kernel_version: KERNEL_VERSION, label: LABEL, A, B, C, internal: null };
  const compatible = core && core.internal_view && !checkContract(core);
  if (compatible && INTERNAL_ACTORS.includes(ctx.actor)) {
    const v = core.internal_view;
    out.internal = {
      authz_accredited: false, note: 'La etiqueta de actor es de simulación; la autorización real corresponde al backend (fuera de alcance).',
      calculation_status: v.calculation_status, provider_amount_status: v.provider_amount_status,
      source_subtotal: v.source_subtotal || null, provider_amount: v.provider_amount || null,
      operator_alerts: v.operator_alerts || [], conditions: v.conditions || [], supplement_notes: v.supplement_notes || [],
      superseded_rates: v.superseded_rates || [], traceability: v.traceability || [], final_price_confirmed: null,
    };
  }
  return out;
}
/** Vista pública: A y B resumidos y C, sin datos internos. */
function publicView(result) {
  return { kernel_version: result.kernel_version, label: result.label, content: { verdict: result.A.verdict, gaps: result.A.gaps },
           price_readiness: { verdict: result.B.verdict, reasons: result.B.reasons, ...(result.B.reference_total ? { reference_total: result.B.reference_total } : {}) },
           enablement: result.C };
}
module.exports = { evaluate, publicView, KERNEL_VERSION, LABEL, CORE1 };
