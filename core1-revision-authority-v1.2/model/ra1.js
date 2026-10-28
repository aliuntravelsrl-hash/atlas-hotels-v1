'use strict';
// RA-1 v1.1 — MODELO DE REFERENCIA de la autoridad de revisión (inerte, sin base de datos, sin red, sin lectores). CS-2 A.
// Contrato: libro append-only por scope; revisión = manifiesto inmutable con cierre de dependencias; publicación atómica;
// current/pin/read por scope+revisión con integridad, retención y horizonte; reloj de autoridad inyectado.
// Estados de salida (internos de la autoridad; el adaptador los mapea a los cuatro existentes y a READ_DRIFT_DETECTED): OK | DRIFT | REVISION_MISSING | NOT_FOUND | SHAPE_INVALID.
const crypto = require('crypto');
const ROLES = Object.freeze({ owner: ['bootstrap'], publisher: ['putObject', 'publish', 'setActive', 'invalidate'], reader: ['pin', 'read', 'current'] });
const STATUSES = Object.freeze(['OK', 'DRIFT', 'REVISION_MISSING', 'NOT_FOUND', 'SHAPE_INVALID']);
class AuthorityError extends Error { constructor(code, detail) { super(code + (detail ? ': ' + detail : '')); this.code = code; } }
const canon = (v) => (Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v));
const sha = (v) => crypto.createHash('sha256').update(canon(v)).digest('hex');
const clone = (v) => JSON.parse(JSON.stringify(v));
const ms = (iso) => { const t = typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(iso) ? Date.parse(iso) : NaN; return t; };
// AC8 / RA-R1: clasificación FX fail-closed (no aprueba ni implementa FX). NORMALIZACIÓN ADMITIDA (idéntica en SQL, c1_ra1.fx_key_norm):
//  1) se parte la clave en palabras por mayúsculas (camelCase/PascalCase/siglas: exchangeRate, ExchangeRate, FXRate, amountDOP) y por todo carácter fuera de [A-Za-z0-9];
//  2) minúsculas SOLO ASCII (sin tablas de locale). Una clave es de conversión si (a) su forma en minúsculas contiene «exchange» o «equivalent» (subcadena), o
//  (b) alguna palabra es exactamente «dop» o «fx». Una clave con palabra «currency» (currency, depositCurrency, deposit_currency) cuyo valor no sea exactamente la cadena "USD" también lo es.
//  NO admitido (límite declarado): abreviaturas sin separador ni mayúsculas internas (p. ej. «fxrate», «dopprice»), otros idiomas/sinónimos y valores de cadena fuera de claves de moneda; no es un scanner universal.
const LOWER = (s) => s.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
const fxKeyNorm = (k) => LOWER(String(k).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2'));
const fxWords = (k) => fxKeyNorm(k).split(/[^a-z0-9]+/).filter((w) => w !== '');
function fxKeyIsConversion(k) { const lk = LOWER(String(k)); if (lk.includes('exchange') || lk.includes('equivalent')) return true; const w = fxWords(k); return w.includes('dop') || w.includes('fx'); }
function fxScan(v) { if (Array.isArray(v)) return v.some(fxScan); if (v && typeof v === 'object') return Object.keys(v).some((k) => fxKeyIsConversion(k) || (fxWords(k).includes('currency') && v[k] !== 'USD') || fxScan(v[k])); return false; }

function createAuthority({ clock }) {
  if (typeof clock !== 'function') throw new AuthorityError('CLOCK_REQUIRED');
  const S = { objects: new Map(), revisions: new Map(), ledger: [], seq: 0, revCounter: 0 };   // contadores nunca retroceden (huecos permitidos)
  const hooks = { failpoint: null };
  const allow = (actor, op) => { if (!ROLES[actor] || !ROLES[actor].includes(op)) throw new AuthorityError('PERMISSION_DENIED', actor + ' → ' + op); };
  const now = () => { const t = ms(clock()); if (Number.isNaN(t)) throw new AuthorityError('CLOCK_INVALID'); return t; };
  const iso = (t) => new Date(t).toISOString().replace('.000Z', 'Z');
  const head = (scope) => { for (let i = S.ledger.length - 1; i >= 0; i--) if (S.ledger[i].scope === scope) return S.ledger[i]; return null; };
  const headState = (scope) => { let rev = null; let active = false; let valid = false; for (const e of S.ledger) { if (e.scope !== scope) continue; if (e.event === 'PUBLISH') { rev = e.revision_id; active = false; valid = true; } else if (e.event === 'ACTIVATE') active = true; else if (e.event === 'DEACTIVATE') active = false; else if (e.event === 'INVALIDATE') { valid = false; active = false; } } return { revision_id: rev, active, valid, seq: (head(scope) || {}).seq || 0 }; };
  const nextSeq = () => ++S.seq;

  function putObject(actor, { kind, id, rev, content }) {
    allow(actor, 'putObject'); if (![kind, id, rev].every((x) => typeof x === 'string' && x)) throw new AuthorityError('SHAPE_INVALID', 'object key');
    const key = `${kind}:${id}@${rev}`; const digest = sha(content); const ex = S.objects.get(key);
    if (ex) { if (ex.digest !== digest) throw new AuthorityError('IMMUTABLE_OBJECT', key); return { key, digest }; }   // put-once: mismo contenido es idempotente; otro contenido, rechazo
    S.objects.set(key, { key, kind, content: clone(content), digest, created_at: iso(now()) }); return { key, digest };
  }
  function publish(actor, a) {
    allow(actor, 'publish'); const t0 = now(); const snap = { objects: S.objects, revisions: new Map(S.revisions), ledger: S.ledger.slice(), seq: S.seq };
    try {
      if (!a || typeof a.scope !== 'string' || !a.scope || typeof a.port !== 'string' || !a.port || !a.content || typeof a.content !== 'object') throw new AuthorityError('SHAPE_INVALID', 'args');
      if (!a.horizon || [a.horizon.public, a.horizon.internal].some((h) => Number.isNaN(ms(h)))) throw new AuthorityError('HORIZON_MISSING');   // AC4: sin horizonte verificable de TODA vista liberable no se publica
      if (Number.isNaN(ms(a.retention_until))) throw new AuthorityError('RETENTION_MISSING');
      const margin = Number.isInteger(a.margin_ms) && a.margin_ms >= 0 ? a.margin_ms : null; if (margin === null) throw new AuthorityError('MARGIN_INVALID');
      if (ms(a.retention_until) < Math.max(ms(a.horizon.public), ms(a.horizon.internal)) + margin) throw new AuthorityError('RETENTION_SHORT');
      if (ms(a.retention_until) <= t0) throw new AuthorityError('RETENTION_SHORT', 'ya vencida');
      const members = Array.isArray(a.members) ? a.members : null; if (!members) throw new AuthorityError('SHAPE_INVALID', 'members');
      const man = members.map((m) => { const o = S.objects.get(m && m.key); if (!o) throw new AuthorityError('DEPENDENCY_MISSING', String(m && m.key)); if (o.digest !== sha(o.content)) throw new AuthorityError('DEPENDENCY_CORRUPT', o.key); return { key: o.key, digest: o.digest }; });
      if (!['NO_CONVERSION_USD', 'FX_BRANCH'].includes(a.fx_policy)) throw new AuthorityError('SHAPE_INVALID', 'fx_policy');   // RA-R1: política ausente/NULL/vacía/desconocida se rechaza ANTES de clasificar
      const fx = fxScan(a.content); if (a.fx_policy === 'NO_CONVERSION_USD' && fx) throw new AuthorityError('FX_CONVERSION_PRESENT');
      const r = a.received || {}; let received_at = null; let imported_at = null;
      if (r.kind === 'SERVER') { if (r.at !== undefined || r.original_received_at !== undefined) throw new AuthorityError('CLIENT_TIME_FORBIDDEN'); received_at = iso(t0); }
      else if (r.kind === 'IMPORTED_HISTORICAL') { imported_at = iso(t0); if (r.at !== undefined) throw new AuthorityError('CLIENT_TIME_FORBIDDEN'); if (r.original_received_at !== undefined) { if (!r.evidence_ref || Number.isNaN(ms(r.original_received_at))) throw new AuthorityError('SHAPE_INVALID', 'evidencia de recepción'); received_at = r.original_received_at; } }   // desconocido ⇒ received_at null; la fecha de importación NUNCA es recepción
      else throw new AuthorityError('SHAPE_INVALID', 'received.kind');
      const h = headState(a.scope); if (a.expect_seq !== undefined && a.expect_seq !== h.seq) throw new AuthorityError('CONFLICT', `cabeza=${h.seq}`);
      const revision_id = 'R' + String(++S.revCounter).padStart(6, '0');   // generado por la autoridad; contador no retrocede ni tras rollback
      const rec = { revision_id, scope: a.scope, port: a.port, content: clone(a.content), content_digest: sha(a.content), members: man, manifest_digest: sha({ man, port: a.port, scope: a.scope }), horizon: { public: a.horizon.public, internal: a.horizon.internal }, retention_until: a.retention_until, margin_ms: margin, fx_class: fx ? 'FX_BRANCH' : 'NO_CONVERSION_USD', received_kind: r.kind, received_at, imported_at, attested_at: iso(t0) };
      S.revisions.set(revision_id, rec); if (hooks.failpoint === 'after-revision-insert') throw new AuthorityError('FAILPOINT');
      const seq = nextSeq(); S.ledger.push({ seq, scope: a.scope, event: 'PUBLISH', revision_id, at: iso(t0) }); return { revision_id, seq };
    } catch (e) { S.revisions = snap.revisions; S.ledger = snap.ledger; S.seq = Math.max(S.seq, snap.seq); throw e; }   // atomicidad: nada parcial; los contadores NO retroceden
  }
  function append(actor, op, scope, event, revision_id) { allow(actor, op); const h = headState(scope); if (!h.revision_id) throw new AuthorityError('NOT_FOUND', scope); if (revision_id !== undefined && revision_id !== h.revision_id) throw new AuthorityError('NOT_HEAD', revision_id); if (!h.valid && event !== 'INVALIDATE') throw new AuthorityError('REVISION_INVALIDATED'); const seq = nextSeq(); S.ledger.push({ seq, scope, event, revision_id: h.revision_id, at: iso(now()) }); return { seq, revision_id: h.revision_id }; }
  const setActive = (actor, scope, revision_id, active) => append(actor, 'setActive', scope, active ? 'ACTIVATE' : 'DEACTIVATE', revision_id);
  const invalidate = (actor, scope) => append(actor, 'invalidate', scope, 'INVALIDATE');
  // Comprobación de integridad/retención de la revisión de la cabeza. Devuelve estado interno.
  function usable(rec, t, deliver) {
    if (!rec) return 'REVISION_MISSING';
    if (rec.content_digest !== sha(rec.content)) return 'REVISION_MISSING';                                   // contenido perdido o alterado
    for (const m of rec.members) { const o = S.objects.get(m.key); if (!o || o.digest !== m.digest || o.digest !== sha(o.content)) return 'REVISION_MISSING'; }   // cierre de dependencias presente e íntegro
    if (t >= ms(rec.retention_until)) return 'REVISION_MISSING';                                                // retención vencida (límite superior exclusivo)
    if (ms(rec.horizon.public) > ms(rec.retention_until) || ms(rec.horizon.internal) > ms(rec.retention_until)) return 'REVISION_MISSING';
    if (deliver) { const vp = ms(deliver.public); const vi = ms(deliver.internal); if (Number.isNaN(vp) || Number.isNaN(vi)) return 'SHAPE_INVALID'; if (vp > ms(rec.horizon.public) || vi > ms(rec.horizon.internal) || vp > ms(rec.retention_until) || vi > ms(rec.retention_until)) return 'REVISION_MISSING'; }   // el resultado excede el horizonte/retención
    return 'OK';
  }
  function pin(actor, scope) { allow(actor, 'pin'); const h = headState(scope); if (!h.revision_id) return { status: 'NOT_FOUND' }; const rec = S.revisions.get(h.revision_id); const st = !h.valid || !h.active ? 'REVISION_MISSING' : usable(rec, now()); return st === 'OK' ? { status: 'OK', revision_id: h.revision_id, seq: h.seq, active: true, retention_until: rec.retention_until, horizon: clone(rec.horizon) } : { status: st, seq: h.seq }; }
  function read(actor, scope, revision_id) { allow(actor, 'read'); const rec = S.revisions.get(revision_id); if (!rec || rec.scope !== scope) return { status: rec ? 'NOT_FOUND' : 'REVISION_MISSING' }; const st = usable(rec, now()); return st === 'OK' ? { status: 'OK', revision: clone(rec) } : { status: st }; }
  function current(actor, scope, expect, deliver) {   // comprobación final: ÚLTIMA espera; el token por sí solo no basta
    allow(actor, 'current'); if (!expect || typeof expect.revision_id !== 'string' || !Number.isInteger(expect.seq)) return { status: 'SHAPE_INVALID' };
    const h = headState(scope); if (!h.revision_id) return { status: 'NOT_FOUND' };
    if (h.seq !== expect.seq || h.revision_id !== expect.revision_id) return { status: 'DRIFT', revision_id: h.revision_id, seq: h.seq };   // cualquier evento (activación, invalidación, nueva publicación) cambia la cabeza
    if (!h.valid || !h.active) return { status: 'REVISION_MISSING', revision_id: h.revision_id, seq: h.seq };
    const st = usable(S.revisions.get(h.revision_id), now(), deliver || null); return { status: st, revision_id: h.revision_id, seq: h.seq };
  }
  const admin = Object.freeze({   // SOLO para simular fallos de almacenamiento en pruebas; no es una operación de rol operativo (no se promete defensa contra administrador)
    dropContent: (id) => { const r = S.revisions.get(id); if (r) r.content = null; }, alterContent: (id, c) => { const r = S.revisions.get(id); if (r) r.content = clone(c); },
    dropObject: (key) => S.objects.delete(key), alterObject: (key, c) => { const o = S.objects.get(key); if (o) o.content = clone(c); }, setFailpoint: (n) => { hooks.failpoint = n; }, counters: () => ({ seq: S.seq, rev: S.revCounter, ledger: S.ledger.length, revisions: S.revisions.size }), ledger: () => clone(S.ledger) });
  return Object.freeze({ putObject, publish, setActive, invalidate, pin, read, current, admin });
}
module.exports = Object.freeze({ createAuthority, AuthorityError, ROLES, STATUSES, fxScan, fxKeyNorm, fxWords, canon, sha });
