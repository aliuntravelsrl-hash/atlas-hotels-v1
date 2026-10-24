'use strict';
const { STATES } = require('./constants');
// Un dato es {value, origin, version} o {state: AUSENTE|NO_VERIFICADO|NO_APLICABLE}. Nada se completa por defecto.
function classify(f) {
  if (f === undefined || f === null) return { status: STATES.ABSENT };
  if (typeof f !== 'object' || Array.isArray(f)) return { status: STATES.UNVERIFIED, why: 'SIN_ESTRUCTURA_DE_PROCEDENCIA' };
  if (f.state !== undefined) {
    if ([STATES.ABSENT, STATES.UNVERIFIED, STATES.NOT_APPLICABLE].includes(f.state)) return { status: f.state };
    return { status: STATES.UNVERIFIED, why: 'ESTADO_DESCONOCIDO' };
  }
  if (!('value' in f) || f.value === undefined || f.value === null) return { status: STATES.ABSENT };
  if (!f.origin || !f.version) return { status: STATES.UNVERIFIED, why: 'FALTA_PROCEDENCIA_O_VERSION' };
  return { status: STATES.PRESENT, value: f.value, origin: f.origin, version: f.version };
}
const isPresent = (f) => classify(f).status === STATES.PRESENT;
const valueOf = (f) => (isPresent(f) ? f.value : undefined);
module.exports = { classify, isPresent, valueOf };
