'use strict';
// Resultado C — preparación/candidatura SUJETA A AUTORIDAD. El kernel no concede reservar, cobrar ni confirmar, ni asigna ejecutor, canal, agente o workflow.
const ROUTES = [ // prefijo de motivo -> acción sugerida (no es una ruta verificada)
  [/^EVALUATION_SNAPSHOT_ABSENT/, 'COMPLETAR_EVIDENCIA'],
  [/^(QUOTE_|NOW_|BINDING_|MULTIROOM|EFFECTIVE_COUNTS|PROFILE_|SNAPSHOT_|LOCAL_PROFILE_)/, 'RECOTIZAR_O_RECONCILIAR'],
  [/^(FX_|DEPOSIT_)/, 'REVISAR_FX'],
  [/^(CAPACITY_|OCCUPANCY_|AGE_|ADULT_FROM_|CHILD_RULE|ROOM_NOT_DECLARED)/, 'COMPLETAR_DATOS'],
  [/^CORE1_/, 'RESOLVER_SEGUN_MOTIVO_CORE1'],
  [/.*/, 'REVISAR_ENTRADA'],
];
function proposeEnablement(A, B) {
  const grants = Object.freeze({ reserve: false, collect: false, confirm: false });
  const reasons = []; let proposal = 'PREPARACION_COMPLETA_SUJETA_A_AUTORIDAD';
  if (B.verdict === 'RECHAZADO') { proposal = 'NO_PREPARADA'; reasons.push('B_RECHAZADO'); }
  else if (A.verdict !== 'COMPLETO') { proposal = 'NO_PREPARADA'; reasons.push('A_INCOMPLETO'); }
  else if (B.verdict !== 'LISTO') { proposal = 'NO_PREPARADA'; reasons.push('B_CONSULTAR'); }
  const routes = proposal === 'NO_PREPARADA' ? [...(B.reasons || [])].map((r) => ({ reason: r, suggested_action: ROUTES.find(([re]) => re.test(r))[1], route_status: 'NO_ESTABLECIDA' })) : [];
  if (A.verdict !== 'COMPLETO') for (const g of A.gaps) routes.push({ reason: 'A:' + g.id, suggested_action: 'COMPLETAR_DATOS', route_status: 'NO_ESTABLECIDA' });
  return { proposal, reasons, grants, routes, executor: 'NO_ESTABLECIDO', verified_by_operational_authority: false };
}
module.exports = { proposeEnablement };
