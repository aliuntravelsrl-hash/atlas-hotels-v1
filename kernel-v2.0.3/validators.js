'use strict';
const { CURRENCIES } = require('./constants');
const ISO_TZ = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;
function parseInstant(s) { // instante ISO-8601 ESTRICTO con zona horaria; si no, NaN
  if (typeof s !== 'string' || !ISO_TZ.test(s)) return NaN;
  const t = Date.parse(s); if (Number.isNaN(t)) return NaN;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number); const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? t : NaN; // rechaza 2026-02-31
}
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
const isStr = (s) => typeof s === 'string' && s.trim().length > 0;
const isAmount = (s) => typeof s === 'string' && /^\d{1,12}\.\d{2}$/.test(s) && Number(s) > 0; // importe de referencia: positivo, 2 decimales
const isCurrency = (s) => CURRENCIES.includes(s);
const isInt = (n, lo, hi) => Number.isInteger(n) && n >= lo && n <= hi;
const isDecimalPos = (s) => typeof s === 'string' && /^\d+(\.\d+)?$/.test(s) && Number(s) > 0;
const isTime = (s) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const isHttpsUrl = (s) => { if (typeof s !== 'string') return false; try { const u = new URL(s); return u.protocol === 'https:' && !!u.hostname; } catch (e) { return false; } };
const isProv = (s) => typeof s === 'string' && s === s.trim() && /^[\w .:\/@#-]{1,64}$/.test(s);
const plainObject = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
function closed(o, allowed, required) { // objeto cerrado: sin claves extra, con las requeridas
  if (!plainObject(o)) return 'NO_ES_OBJETO';
  for (const k of Object.keys(o)) if (!allowed.includes(k)) return 'CLAVE_NO_PERMITIDA:' + k;
  for (const k of required) if (!(k in o)) return 'FALTA:' + k;
  return null;
}
module.exports = { parseInstant, isDate, isStr, isAmount, isCurrency, isInt, isDecimalPos, isTime, isHttpsUrl, isProv, plainObject, closed };
