'use strict';
// Puente reproducible: ejecuta el simulador congelado en un subproceso Python aislado (-I), con huellas verificadas. Sin red, sin escritura de bytecode.
const cp = require('child_process'); const path = require('path');
const { FROZEN_PINS } = require('../constants');
const ROOT = path.join(__dirname, '..', '..'); const SCRIPT = path.join(__dirname, 'core1_bridge.py.inert');
function createBridge(opts = {}) {
  const pins = opts.pins || FROZEN_PINS; const python = opts.python || 'python3';
  return Object.freeze({ quote(req, state) {
    const r = cp.spawnSync(python, ['-I', '-B', SCRIPT], { input: JSON.stringify({ root: ROOT, pins, req, state }), encoding: 'utf8', env: { PATH: process.env.PATH, PYTHONDONTWRITEBYTECODE: '1' }, maxBuffer: 16 * 1024 * 1024, timeout: 30000 });
    if (r.status !== 0) return { ok: false, code: 'BRIDGE_FAILED' };
    try { const o = JSON.parse(r.stdout); return o; } catch (e) { return { ok: false, code: 'BRIDGE_BAD_OUTPUT' }; }
  } });
}
module.exports = { createBridge };
