'use strict';
// Puertos lógicos de lectura (interfaces, NO nombres de tablas). Cada lectura devuelve {ok:true, revision, data} o {ok:false, status}. Sin escritura, sin RPC de negocio.
const { canon } = require('../kernel-v2.0.3/canonical');
const isObj = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
const rev = (r) => typeof r === 'string' && /^[A-Za-z0-9._:-]{1,80}$/.test(r);
function checked(name, r, shape) {
  if (!isObj(r) || r.ok !== true) return { ok: false, port: name, status: isObj(r) && typeof r.status === 'string' && /^[A-Z_]{1,32}$/.test(r.status) ? r.status : 'UNAVAILABLE' };
  if (!rev(r.revision)) return { ok: false, port: name, status: 'REVISION_MISSING' };   // sin revisión inmutable no se acredita coherencia
  if (!isObj(r.data) || !shape(r.data)) return { ok: false, port: name, status: 'SHAPE_INVALID' };
  return { ok: true, port: name, revision: r.revision, data: r.data };
}
const SHAPES = {
  selection: (d) => isObj(d.hotels) && isObj(d.provider_plans) && isObj(d.rooms),
  rates: (d) => Array.isArray(d.rates) && isObj(d.received_at_evidence) && isObj(d.source_document),
  profile: (d) => isObj(d.hotel) && typeof d.profile_version === 'string' && d.profile_version.length > 0,
  policy: (d) => isObj(d.deposit_policy) && Array.isArray(d.accepted_payment_currencies) && Array.isArray(d.fx_approvals) && isObj(d.fx_governed) && Array.isArray(d.fx_authorities),
};
const sameRevisions = (a, b) => ['selection', 'rates', 'profile', 'policy'].every((k) => typeof a[k] === 'string' && a[k] === b[k]);
module.exports = { checked, SHAPES, sameRevisions, canon };
