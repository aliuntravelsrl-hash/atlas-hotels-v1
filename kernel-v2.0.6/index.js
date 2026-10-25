'use strict';
const { KERNEL_VERSION, SUPERSEDES, LABEL, INTERNAL_ACTORS } = require('./constants');
const { evaluateContent } = require('./contentIntegrity');
const { evaluatePriceReadiness } = require('./priceReadiness');
const { proposeEnablement } = require('./enablementProposal');
const C = require('./contracts');
/**
 * evaluate(hotel, request, quote, ctx)
 *  hotel: registro con datos {value,origin,version} o estados explícitos.
 *  request: la MISMA petición enviada a Core 1 (adaptador v1.1.1): request_id, hotel_ref, provider_plan_ref, rooms[1], check_in, check_out, payment_currency.
 *  quote: {public_dto, internal_view, context_evidence} de ESA cotización (Core 1 v2.2.3 / adaptador v1.1.1; candidatos, no adoptados).
 *  ctx: {now (reloj de servidor ISO con zona), fx_authorities (lista acreditada por el servidor), actor?}. actor es etiqueta de simulación; no acredita autorización del backend.
 */
function evaluate(hotel, request, quote, ctx = {}) {
  let A, B;
  try { A = evaluateContent(hotel); } catch (e) { A = { verdict: 'INCOMPLETO', checks: [], gaps: [{ id: 'EVALUATION_ERROR', status: 'ERROR' }] }; }
  try { B = evaluatePriceReadiness(hotel, request, quote, ctx); } catch (e) { B = { verdict: 'RECHAZADO', reasons: ['EVALUATION_ERROR'], applicable: [], not_applicable: [] }; } // un fallo interno nunca pasa como LISTO
  const Cc = proposeEnablement(A, B);
  const out = { kernel_version: KERNEL_VERSION, supersedes: SUPERSEDES, label: LABEL, A, B, C: Cc, internal: null, diagnostics: B.diagnostics || null };
  try {
    if (B.verdict !== 'RECHAZADO' && !B.snapshot_absent && INTERNAL_ACTORS.includes(ctx.actor) && quote && quote.internal_view && C.validateInternalView(quote.internal_view).ok) {
      const v = quote.internal_view;
      out.internal = { authz_accredited: false, note: 'La etiqueta de actor es de simulación; la autorización real corresponde al backend (fuera de alcance).',
        calculation_status: v.calculation_status, provider_amount_status: v.provider_amount_status, source_subtotal: v.source_subtotal || null, provider_amount: v.provider_amount || null,
        operator_alerts: v.operator_alerts || [], conditions: v.conditions || [], supplement_notes: v.supplement_notes || [], superseded_rates: v.superseded_rates || [], traceability: v.traceability || [], final_price_confirmed: null };
    }
  } catch (e) { out.internal = null; }
  return out;
}
/** Vista pública: proyección positiva con campos explícitos; nunca copia objetos externos completos. */
const SAFE_CODE = /^[A-Z0-9_:.]{1,64}$/; // los códigos públicos solo salen de constantes del kernel; esto es una defensa adicional
const safeCode = (c) => (typeof c === 'string' && SAFE_CODE.test(c) ? c : 'CODIGO_NO_PUBLICABLE');
function publicView(r) {
  const gaps = r.A.gaps.map((g) => ({ id: safeCode(g.id), status: safeCode(g.status) }));
  const pr = { verdict: r.B.verdict, reasons: r.B.reasons.map(safeCode) };
  if (r.B.reference_total) pr.reference_total = { amount: String(r.B.reference_total.amount), currency: String(r.B.reference_total.currency) };
  const e = r.C;
  return { kernel_version: r.kernel_version, label: r.label, content: { verdict: r.A.verdict, gaps }, price_readiness: pr,
           enablement: { proposal: e.proposal, grants: { reserve: false, collect: false, confirm: false }, routes: e.routes.map((x) => ({ reason: safeCode(x.reason), suggested_action: safeCode(x.suggested_action), route_status: safeCode(x.route_status) })), executor: e.executor, verified_by_operational_authority: false } };
}
module.exports = { evaluate, publicView, KERNEL_VERSION };
