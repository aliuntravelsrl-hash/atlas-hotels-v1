'use strict';
// Dato = {value, origin, version} con procedencia de FORMA válida y valor SEMÁNTICAMENTE válido, o estado explícito. La presencia no acredita corrección.
const { STATES } = require('./constants');
const V = require('./validators');
function classify(f, valid) {
  if (f === undefined || f === null) return { status: STATES.ABSENT };
  if (!V.plainObject(f)) return { status: STATES.UNVERIFIED, why: 'SIN_ESTRUCTURA_DE_PROCEDENCIA' };
  if (f.state !== undefined) {
    if (Object.keys(f).length !== 1) return { status: STATES.UNVERIFIED, why: 'ESTADO_CON_CAMPOS_EXTRA' };
    return [STATES.ABSENT, STATES.UNVERIFIED, STATES.NOT_APPLICABLE].includes(f.state) ? { status: f.state } : { status: STATES.UNVERIFIED, why: 'ESTADO_DESCONOCIDO' };
  }
  if (!('value' in f) || f.value === undefined || f.value === null) return { status: STATES.ABSENT };
  if (!V.isProv(f.origin) || !V.isProv(f.version)) return { status: STATES.UNVERIFIED, why: 'PROCEDENCIA_O_VERSION_INVALIDA' };
  if (valid && !valid(f.value)) return { status: STATES.UNVERIFIED, why: 'VALOR_INVALIDO' };
  return { status: STATES.PRESENT, value: f.value, origin: f.origin, version: f.version };
}
const isPresent = (f, valid) => classify(f, valid).status === STATES.PRESENT;
const valueOf = (f, valid) => { const c = classify(f, valid); return c.status === STATES.PRESENT ? c.value : undefined; };
// validadores semánticos por campo
const VAL = {
  text: V.isStr, active: (v) => v === true, photos: (v) => Array.isArray(v) && v.length >= 3 && v.every(V.isHttpsUrl),
  time: V.isTime, capAdults: (v) => V.isInt(v, 1, 20), capChildren: (v) => V.isInt(v, 0, 20), capTotal: (v) => V.isInt(v, 1, 40),
  occ: (v) => v === true, adultFromAge: (v) => V.isInt(v, 1, 18),
};
module.exports = { classify, isPresent, valueOf, VAL };
