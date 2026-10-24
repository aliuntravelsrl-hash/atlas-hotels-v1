'use strict';
// Política de acceso SIMULADA (inyectable). No es autorización real: auth física, RLS/grants y límites de abuso son pendientes verificables (UNK).
// El cliente NUNCA aporta autoridad: la identidad sale de identity.verify(credencial) inyectado; etiquetas de actor/rol/slug de la solicitud se rechazan.
function createPolicy(cfg = {}) {
  const c = Object.freeze({ publicAnonymous: cfg.publicAnonymous === true, internalRoles: cfg.internalRoles || ['OPERATOR'], internalScope: cfg.internalScope || 'core1.quote.internal', agentScope: cfg.agentScope || 'core1.quote.agent' });
  const verified = (p) => p && typeof p === 'object' && p.verified === true && typeof p.id === 'string' && p.id.length > 0 && (p.kind === 'USER' || p.kind === 'SERVICE');
  return Object.freeze({
    authorize(principal, view) {
      if (view === 'PUBLIC') return verified(principal) || c.publicAnonymous ? { allowed: true, actor: null } : { allowed: false, code: 'AUTH_REQUIRED' };
      if (view !== 'INTERNAL') return { allowed: false, code: 'VIEW_UNKNOWN' };
      if (!verified(principal)) return { allowed: false, code: 'AUTH_REQUIRED' };
      const scopes = Array.isArray(principal.scopes) ? principal.scopes : []; const roles = Array.isArray(principal.roles) ? principal.roles : [];
      if (principal.kind === 'USER' && scopes.includes(c.internalScope) && roles.some((r) => c.internalRoles.includes(r))) return { allowed: true, actor: 'OPERATOR' };
      if (principal.kind === 'SERVICE' && scopes.includes(c.agentScope)) return { allowed: true, actor: 'AI_SELLER' };
      return { allowed: false, code: 'NOT_AUTHORIZED' };   // usuario autenticado ≠ rol interno
    },
  });
}
module.exports = { createPolicy };
