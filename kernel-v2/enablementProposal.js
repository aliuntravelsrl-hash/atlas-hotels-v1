'use strict';
// Resultado C — PROPUESTA de habilitación operativa. El kernel propone; nunca concede reservar, cobrar ni confirmar.
function proposeEnablement(A, B) {
  const grants = Object.freeze({ reserve: false, collect: false, confirm: false });
  let proposal; const reasons = [];
  if (B.verdict === 'RECHAZADO') { proposal = 'NO_PROPONE'; reasons.push('B_RECHAZADO'); }
  else if (A.verdict !== 'COMPLETO') { proposal = 'NO_PROPONE'; reasons.push('A_INCOMPLETO'); }
  else if (B.verdict !== 'LISTO') { proposal = 'NO_PROPONE'; reasons.push('B_CONSULTAR'); }
  else proposal = 'CANDIDATA_A_SOLICITUD_ASISTIDA';
  return {
    proposal, reasons, grants,
    next_step: B.verdict === 'CONSULTAR' ? 'CONSULTA_ASINCRONA_AL_PROVEEDOR' : (proposal === 'NO_PROPONE' ? 'NINGUNO' : 'VERIFICACION_POR_AUTORIDAD_OPERATIVA'),
    human_assistance: 'NO_DETERMINADA', // consultar/asíncrono no implica asistencia humana obligatoria por defecto
    verified_by_operational_authority: false,
  };
}
module.exports = { proposeEnablement };
