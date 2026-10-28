'use strict';
// Dependencias REALES para tests/lab/lifecycle.js (instancia PostgreSQL propia del laboratorio). Solo lectura de /proc/<pid> y `pg_ctl -D <directorio propio>`; nunca señales ni búsqueda por patrón.
const fs = require('fs');
function makeRealDeps({ BIN, asUser }) {
  const procState = (pid) => { let txt; try { txt = fs.readFileSync('/proc/' + pid + '/stat', 'utf8'); } catch (e) { return e.code === 'ENOENT' || e.code === 'ESRCH' ? 'GONE' : 'UNKNOWN'; } const st = txt.split(') ')[1]; return st && st[0] === 'Z' ? 'ZOMBIE' : 'ALIVE'; };
  const identity = (pid) => { try {   // identidad EXACTA: exe, cwd, argv con límites NUL preservados e instante de inicio (campo 22 de /proc/<pid>/stat)
    const raw = fs.readFileSync('/proc/' + pid + '/cmdline', 'utf8'); const argv = raw.includes('\0') ? raw.split('\0').slice(0, raw.endsWith('\0') ? -1 : undefined) : null;
    const stat = fs.readFileSync('/proc/' + pid + '/stat', 'utf8'); const starttime = Number(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19]);
    return { exe: fs.readlinkSync('/proc/' + pid + '/exe'), cwd: fs.readlinkSync('/proc/' + pid + '/cwd'), argv, starttime }; } catch (_) { return null; } };
  return {
    run: (cmd, args) => { const r = asUser(BIN + '/' + cmd, args); return { status: r.status }; },
    readFile: (p) => fs.readFileSync(p, 'utf8'), identity, procState,
    sleep: (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms), exists: (p) => fs.existsSync(p), rmDir: (p) => fs.rmSync(p, { recursive: true, force: true }),
  };
}
module.exports = Object.freeze({ makeRealDeps });
