'use strict';
// CS-2 B — laboratorio PostgreSQL LOCAL, NUEVO y AISLADO para probar SOLO el SQL candidato RA-1 con datos/roles sintéticos.
// Aislamiento: directorio temporal nuevo propio del mandato, socket unix privado (0700), sin TCP, sin variables PG*/URL heredadas,
// cada conexión indica explícitamente socket/puerto/rol/base de la instancia creada; verificación de identidad antes de todo DDL.
// No instala paquetes, no crea cuentas del SO, no busca credenciales ni hosts alternativos, no usa Supabase/VPS. Limpieza: solo PID y directorio creados.
const fs = require('fs'); const os = require('os'); const path = require('path'); const cp = require('child_process');
const BIN = '/usr/lib/postgresql/16/bin'; const OSUSER = 'ubuntu'; const PORT = '54329'; const MARKER = 'C1-RA1-CS2-MANDATE-DG-CORE1-RA1-CS2-ISOLATED-20261026';
const HERE = __dirname; const SQLDIR = path.join(HERE, '..', '..', 'sql'); const EVID = path.join(HERE, 'evidence');
const SCHEMA_SQL = fs.readFileSync(path.join(SQLDIR, '01-schema-ra1-v1.sql.inert'), 'utf8');
const log = []; const L = (s) => { log.push(s); console.log(s); };
const sh = (cmd, args, o = {}) => cp.spawnSync(cmd, args, Object.assign({ encoding: 'utf8' }, o));
const asUser = (cmd, args) => sh('runuser', ['-u', OSUSER, '--', 'env', '-i', 'PATH=/usr/bin:/bin', 'LANG=C', cmd, ...args]);
let DIR = null; let SOCK = null; let PID = null; let EXPECT = null;

function psql({ role, db, sql }) {   // conexión SIEMPRE explícita: socket/puerto/rol/base; entorno vacío (env -i)
  return new Promise((res) => {
    const p = cp.spawn('runuser', ['-u', OSUSER, '--', 'env', '-i', 'PATH=/usr/bin:/bin', 'LANG=C', BIN + '/psql', '-X', '-h', SOCK, '-p', PORT, '-U', role, '-d', db, '-v', 'ON_ERROR_STOP=1', '-Atq', '-f', '-']);
    let out = ''; let err = ''; p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => res({ code, out, err })); p.stdin.end(sql);
  });
}
const B = (db, sql) => psql({ role: 'c1_bootstrap', db, sql });

async function gate(db, why) {   // identidad de la instancia nueva ANTES de DDL
  const r = await B(db, `select current_setting('data_directory')||'|'||current_database()||'|'||(select system_identifier from pg_control_system())||'|'||current_setting('listen_addresses')||'|'||current_setting('unix_socket_directories')||'|'||current_setting('unix_socket_permissions')||'|'||coalesce(shobj_description((select oid from pg_database where datname=current_database()),'pg_database'),'');`);
  if (r.code !== 0) throw new Error('GATE ' + why + ': sin conexión a la instancia creada');
  const [dd, dbn, sysid, la, sd, perm, marker] = r.out.trim().split('|');
  const okId = dd === path.join(DIR, 'data') && (dbn === 'postgres' || (/^c1_disposable_/.test(dbn) && marker === MARKER)) && la === '' && sd === path.join(DIR, 'sock') && perm === '0700' && (!EXPECT || sysid === EXPECT.sysid) && fs.existsSync(path.join(DIR, 'MANDATE.marker'));
  if (!okId) throw new Error('GATE ' + why + ': identidad/aislamiento no verificados (' + [dbn, la, sd, perm].join(',') + ')');
  return { data_directory: dd, database: dbn, system_identifier: sysid, listen_addresses: la, socket_directory: sd, socket_permissions: perm, marker_ok: dbn === 'postgres' ? null : marker === MARKER };
}

function suiteHelpers(db) {
  const P = (sql) => psql({ role: 'c1_publisher', db, sql }); const R = (sql) => psql({ role: 'c1_reader', db, sql });
  const okq = (r, re) => { if (r.code !== 0) throw new Error('exit ' + r.code + ': ' + r.err.trim().slice(0, 170)); const o = r.out.trim(); if (re !== undefined && !(re instanceof RegExp ? re.test(o) : o === re)) throw new Error('salida ' + JSON.stringify(o.slice(0, 170)) + ' ≠ ' + re); return o; };
  const errq = (r, re) => { if (r.code === 0) throw new Error('debía fallar'); if (!re.test(r.err)) throw new Error('error inesperado: ' + r.err.trim().slice(0, 170)); };
  const pubArgs = (scope, o = {}) => `'${scope}','rates',${o.content || `'{"currency":"USD","rows":[{"adult":100}],"deposit":{"currency":"USD","pct":30}}'::jsonb`},${o.members || "array['doc:D1@1','map:M1@1']"},${o.hp || "clock_timestamp()+interval '1 hour'"},${o.hi || "clock_timestamp()+interval '90 minutes'"},${o.ret || "clock_timestamp()+interval '3 hours'"},${o.margin === undefined ? 60000 : o.margin},'${o.fx || 'NO_CONVERSION_USD'}','${o.kind || 'SERVER'}',${o.orig || 'null'},${o.ev || 'null'},${o.expect || 'null'}`;
  const pubSql = (scope, o) => `select revision_id||'|'||seq from c1_ra1.publish(${pubArgs(scope, o)});`;
  const pubAct = (scope, o) => `select revision_id as rid from c1_ra1.publish(${pubArgs(scope, o)}) \\gset\nselect seq as aq from c1_ra1.set_active('${scope}', :'rid', true) \\gset\nselect :'rid';`;
  const tok = async (scope, o) => { okq(await P(pubAct(scope, o))); const p = okq(await R(`select status||'|'||coalesce(revision_id,'')||'|'||seq from c1_ra1.pin('${scope}');`), /^OK\|R\d+\|\d+$/); const [, rid, seq] = p.split('|'); return { rid, seq: Number(seq) }; };
  const cur = async (scope, t, extra = '') => okq(await R(`select status from c1_ra1.current('${scope}','${t.rid}',${t.seq}${extra});`));
  return { P, R, okq, errq, pubArgs, pubSql, pubAct, tok, cur };
}

async function suite(db) {
  const H = suiteHelpers(db); const { P, R, okq, errq, pubSql, pubAct, tok, cur } = H; const RES = {};
  const T = async (n, f) => { try { await f(); RES[n] = 'PASS'; } catch (e) { RES[n] = 'FAIL ' + String(e.message).split('\n')[0].slice(0, 220); } };
  const seed = await P(`select c1_ra1.put_object('doc','D1','1','{"sha":"synthetic-doc-1"}'::jsonb); select c1_ra1.put_object('map','M1','1','{"room":"synthetic-room-1"}'::jsonb); select c1_ra1.put_object('doc','D2','1','{"sha":"synthetic-doc-2"}'::jsonb); select c1_ra1.put_object('map','M2','1','{"room":"synthetic-room-2"}'::jsonb); select c1_ra1.put_object('doc','D3','1','{"sha":"synthetic-doc-3"}'::jsonb);`);
  await T('L00_semilla_sintetica_por_interfaz_del_publicador', async () => okq(seed));
  await T('L00b_control_positivo_el_arnes_detecta_exito_y_fallo_reales', async () => { errq(await P('select 1/0;'), /division by zero/); let thrown = false; try { okq({ code: 3, out: '', err: 'x' }); } catch (e) { thrown = true; } if (!thrown) throw new Error('okq no detecta exit≠0'); thrown = false; try { okq({ code: 0, out: 'A', err: '' }, 'B'); } catch (e) { thrown = true; } if (!thrown) throw new Error('okq no detecta salida distinta'); });
  // AC9 — permisos efectivos y operaciones reales por rol (no solo como administrador)
  await T('AC9a_privilegios_efectivos_tablas_secuencias_esquema_miembros_ninguno_para_roles_operativos', async () => {
    okq(await B(db, `select coalesce(string_agg(r||':'||t||':'||p, ','),'NONE') from (values('c1_publisher'),('c1_reader')) a(r), (values('c1_ra1.objects'),('c1_ra1.revisions'),('c1_ra1.ledger')) b(t), (values('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) c(p) where has_table_privilege(r,t,p);`), 'NONE');
    okq(await B(db, `select coalesce(string_agg(r||':'||s||':'||p, ','),'NONE') from (values('c1_publisher'),('c1_reader')) a(r), (values('c1_ra1.rev_seq'),('c1_ra1.ledger_seq')) b(s), (values('USAGE'),('SELECT'),('UPDATE')) c(p) where has_sequence_privilege(r,s,p);`), 'NONE');
    okq(await B(db, `select coalesce(string_agg(r,','),'NONE') from (values('c1_publisher'),('c1_reader')) a(r) where has_schema_privilege(r,'c1_ra1','CREATE') or has_schema_privilege(r,'public','CREATE') or has_database_privilege(r, current_database(), 'CREATE') or has_database_privilege(r, current_database(), 'TEMPORARY');`), 'NONE');
    okq(await B(db, `select pg_has_role('c1_publisher','c1_owner','member')::text||pg_has_role('c1_publisher','c1_owner','usage')::text||pg_has_role('c1_reader','c1_owner','member')::text||pg_has_role('c1_reader','c1_publisher','member')::text||pg_has_role('c1_publisher','c1_reader','member')::text;`), 'falsefalsefalsefalsefalse');
    okq(await B(db, `select rolsuper::text||rolcreaterole::text||rolcreatedb::text||rolbypassrls::text||rolinherit::text from pg_roles where rolname='c1_publisher';`), /^falsefalsefalsefalse/);
    okq(await B(db, `select (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='c1_ra1' and c.relkind in ('r','S') and pg_get_userbyid(c.relowner)<>'c1_owner')::text;`), '0');
  });
  await T('AC9b_funciones_ejecutables_exactas_por_rol_la_interfaz_es_el_unico_camino', async () => {
    okq(await B(db, `select string_agg(proname,',' order by proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='c1_ra1' and has_function_privilege('c1_publisher',p.oid,'EXECUTE');`), 'invalidate,publish,put_object,set_active');
    okq(await B(db, `select string_agg(proname,',' order by proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='c1_ra1' and has_function_privilege('c1_reader',p.oid,'EXECUTE');`), 'current,pin,read');
    okq(await B(db, `select count(*)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='c1_ra1' and p.prosecdef and pg_get_userbyid(p.proowner)<>'c1_owner';`), '0');
  });
  await T('AC9c_publicador_operaciones_reales_denegadas_update_delete_truncate_ddl_lectura_directa_set_role', async () => {
    for (const [s, re] of [["update c1_ra1.revisions set port='x';", /permission denied for table revisions/], ["delete from c1_ra1.ledger;", /permission denied for table ledger/], ["truncate c1_ra1.revisions;", /permission denied for table revisions/], ["truncate c1_ra1.ledger;", /permission denied for table ledger/],
      ["select * from c1_ra1.ledger;", /permission denied for table ledger/], ["insert into c1_ra1.ledger(seq,scope,event,revision_id) values (999,'x','PUBLISH','R000001');", /permission denied for table ledger/], ["create table c1_ra1.x(a int);", /permission denied for schema c1_ra1/], ["create function c1_ra1.f() returns int language sql as 'select 1';", /permission denied for schema c1_ra1/],
      ["alter table c1_ra1.ledger disable trigger all;", /must be owner of table ledger/], ["alter table c1_ra1.revisions owner to c1_publisher;", /must be owner of table revisions/], ["drop table c1_ra1.revisions;", /must be owner of table revisions/], ["set role c1_owner;", /permission denied to set role/], ["select nextval('c1_ra1.rev_seq');", /permission denied for sequence rev_seq/],
      ["select * from c1_ra1.pin('S-X');", /permission denied for function pin/], ["select c1_ra1.sha('{}'::jsonb);", /permission denied for function sha/], ["select * from c1_ra1.append_event('S','R1','ACTIVATE');", /permission denied for function append_event/]]) errq(await P(s), re);
  });
  await T('AC9d_lector_no_atesta_ni_escribe_operaciones_reales_denegadas', async () => {
    for (const [s, re] of [["select * from c1_ra1.publish('S','p','{}'::jsonb,array[]::text[],now(),now(),now()+interval '1 day',0,'NO_CONVERSION_USD','SERVER',null,null,null);", /permission denied for function publish/], ["select c1_ra1.put_object('doc','Z','1','{}'::jsonb);", /permission denied for function put_object/], ["select * from c1_ra1.set_active('S','R1',true);", /permission denied for function set_active/], ["select * from c1_ra1.invalidate('S');", /permission denied for function invalidate/],
      ["select * from c1_ra1.revisions;", /permission denied for table revisions/], ["update c1_ra1.ledger set event='X';", /permission denied for table ledger/], ["truncate c1_ra1.objects;", /permission denied for table objects/], ["create table c1_ra1.x(a int);", /permission denied for schema c1_ra1/], ["set role c1_owner;", /permission denied to set role/]]) errq(await R(s), re);
  });
  await T('AC9e_propietario_no_operativo_tampoco_puede_UPDATE_DELETE_TRUNCATE_por_disparador', async () => {
    errq(await B(db, `set role c1_owner; update c1_ra1.ledger set event='INVALIDATE';`), /IMMUTABLE_STORE: UPDATE/); errq(await B(db, `set role c1_owner; delete from c1_ra1.revisions;`), /IMMUTABLE_STORE: DELETE/);
    errq(await B(db, `set role c1_owner; truncate c1_ra1.objects;`), /IMMUTABLE_STORE: TRUNCATE/); errq(await B(db, `set role c1_owner; truncate c1_ra1.ledger;`), /IMMUTABLE_STORE: TRUNCATE/); errq(await B(db, `set role c1_owner; truncate c1_ra1.revisions, c1_ra1.ledger;`), /IMMUTABLE_STORE: TRUNCATE/); errq(await B(db, `set role c1_owner; update c1_ra1.objects set kind='x';`), /IMMUTABLE_STORE: UPDATE/);
  });
  // AC2
  await T('AC2_objetos_put_once_idempotente_cambio_rechazado_dependencia_ausente', async () => {
    okq(await P(`select c1_ra1.put_object('doc','D1','1','{"sha":"synthetic-doc-1"}'::jsonb);`), 'doc:D1@1');
    errq(await P(`select c1_ra1.put_object('doc','D1','1','{"sha":"CAMBIADO"}'::jsonb);`), /IMMUTABLE_OBJECT/); errq(await P(`select c1_ra1.put_object('map','M1','1','{"room":"otra"}'::jsonb);`), /IMMUTABLE_OBJECT/);
    errq(await P(pubSql('S-DEP', { members: "array['doc:D9@1']" })), /DEPENDENCY_MISSING/); errq(await P(`select c1_ra1.put_object('','x','1','{}'::jsonb);`), /SHAPE_INVALID/);
    const rid = okq(await P(pubSql('S-DEP2'))).split('|')[0]; okq(await R(`select (revision->'members'->0->>'key')||','||(revision->'members'->1->>'key') from c1_ra1.read('S-DEP2','${rid}');`), 'doc:D1@1,map:M1@1');
  });
  // AC1
  await T('AC1_activacion_o_invalidacion_cambian_la_cabeza_current_detecta_DRIFT_y_token_fabricado_no_es_OK', async () => {
    const t = await tok('S-A1'); if ((await cur('S-A1', t, ",clock_timestamp()+interval '30 minutes',clock_timestamp()+interval '1 hour',true")) !== 'OK') throw new Error('OK esperado con ambas vistas');
    okq(await P(`select seq from c1_ra1.set_active('S-A1','${t.rid}',false);`)); if ((await cur('S-A1', t)) !== 'DRIFT') throw new Error('DRIFT esperado tras desactivar');
    okq(await R(`select status from c1_ra1.pin('S-A1');`), 'REVISION_MISSING');
    const u = okq(await P(pubSql('S-A1b'))).split('|'); if ((await cur('S-A1b', { rid: u[0], seq: Number(u[1]) })) !== 'REVISION_MISSING') throw new Error('token fabricado de revisión no activa debe ser REVISION_MISSING');
    const t2 = await tok('S-A1c'); okq(await P(`select seq from c1_ra1.invalidate('S-A1c');`)); if ((await cur('S-A1c', t2)) !== 'DRIFT') throw new Error('DRIFT tras invalidar'); errq(await P(`select * from c1_ra1.set_active('S-A1c','${t2.rid}',true);`), /REVISION_INVALIDATED|NOT_HEAD/);
    errq(await P(`select * from c1_ra1.set_active('S-A1c','R999999',true);`), /NOT_HEAD|REVISION_INVALIDATED/); errq(await P(`select * from c1_ra1.set_active('S-NOEXISTE','R1',true);`), /NOT_FOUND/);
  });
  // AC4
  await T('AC4_horizonte_de_TODA_vista_retencion_corta_y_valores_invalidos', async () => {
    errq(await P(pubSql('S-H1', { hp: 'null' })), /HORIZON_MISSING/); errq(await P(pubSql('S-H2', { hi: 'null' })), /HORIZON_MISSING/); errq(await P(pubSql('S-H3', { ret: 'null' })), /RETENTION_MISSING/);
    errq(await P(pubSql('S-H4', { hi: "clock_timestamp()+interval '3 hours'", ret: "clock_timestamp()+interval '3 hours'", margin: 60000 })), /RETENTION_SHORT/); errq(await P(pubSql('S-H5', { margin: 'null' })), /MARGIN_INVALID/); errq(await P(pubSql('S-H6', { margin: -1 })), /MARGIN_INVALID/);
    errq(await P(pubSql('S-H7', { hp: "clock_timestamp()-interval '3 hours'", hi: "clock_timestamp()-interval '2 hours'", ret: "clock_timestamp()-interval '1 hour'" })), /RETENTION_SHORT/);
    okq(await P(pubSql('S-H8', { hi: "clock_timestamp()+interval '2 hours'", ret: "clock_timestamp()+interval '3 hours'" })), /^R\d+\|\d+$/);
  });
  await T('AC3a_entrega_fuera_de_horizonte_publico_o_interno_y_verificable_ausente', async () => {
    const t = await tok('S-D1'); const e = (dp, di, chk = 'true') => `,${dp},${di},${chk}`;
    if ((await cur('S-D1', t, e("clock_timestamp()+interval '59 minutes'", "clock_timestamp()+interval '89 minutes'"))) !== 'OK') throw new Error('dentro de horizonte debe ser OK');
    if ((await cur('S-D1', t, e("clock_timestamp()+interval '61 minutes'", "clock_timestamp()+interval '89 minutes'"))) !== 'REVISION_MISSING') throw new Error('pública excede'); if ((await cur('S-D1', t, e("clock_timestamp()+interval '59 minutes'", "clock_timestamp()+interval '91 minutes'"))) !== 'REVISION_MISSING') throw new Error('interna excede');
    if ((await cur('S-D1', t, e('null', "clock_timestamp()+interval '59 minutes'"))) !== 'SHAPE_INVALID') throw new Error('verificable ausente');
  });
  await T('AC3b_retencion_vence_entre_pin_y_ultima_espera_current_ya_no_devuelve_OK', async () => {
    const o = { hp: "clock_timestamp()+interval '1 second'", hi: "clock_timestamp()+interval '2 seconds'", ret: "clock_timestamp()+interval '4 seconds'", margin: 100 };
    const t = await tok('S-X1', o); if ((await cur('S-X1', t)) !== 'OK') throw new Error('antes de vencer debe ser OK');
    okq(await R(`select pg_sleep(4.3);`)); if ((await cur('S-X1', t)) !== 'REVISION_MISSING') throw new Error('vencida debe ser REVISION_MISSING (no DRIFT: token coincide)');
    okq(await R(`select status from c1_ra1.pin('S-X1');`), 'REVISION_MISSING'); okq(await R(`select status from c1_ra1.read('S-X1','${t.rid}');`), 'REVISION_MISSING');
  });
  // AC5
  await T('AC5_recepcion_por_servidor_historico_desconocido_importacion_separada_y_valores_de_cliente', async () => {
    const a = okq(await P(pubSql('S-T1'))).split('|')[0]; okq(await R(`select ((revision->>'received_at') is not null)::text||((revision->>'imported_at') is null)::text||(revision->>'received_kind') from c1_ra1.read('S-T1','${a}');`), 'truetrueSERVER');
    errq(await P(pubSql('S-T2', { orig: "'2020-01-01T00:00:00Z'::timestamptz" })), /CLIENT_TIME_FORBIDDEN/); errq(await P(pubSql('S-T2', { ev: "'EVID'" })), /CLIENT_TIME_FORBIDDEN/);
    const b = okq(await P(pubSql('S-T3', { kind: 'IMPORTED_HISTORICAL' }))).split('|')[0]; okq(await R(`select ((revision->>'received_at') is null)::text||((revision->>'imported_at') is not null)::text from c1_ra1.read('S-T3','${b}');`), 'truetrue');
    const c = okq(await P(pubSql('S-T4', { kind: 'IMPORTED_HISTORICAL', orig: "'2026-09-01T00:00:00Z'::timestamptz", ev: "'EVID-SINTETICA-1'" }))).split('|')[0]; okq(await R(`select (revision->>'received_at')::timestamptz::text from c1_ra1.read('S-T4','${c}');`), /^2026-09-01 00:00:00\+00$/);
    errq(await P(pubSql('S-T5', { kind: 'IMPORTED_HISTORICAL', orig: "'2026-09-01T00:00:00Z'::timestamptz" })), /SHAPE_INVALID/); errq(await P(pubSql('S-T6', { kind: 'OTRO' })), /SHAPE_INVALID/);
  });
  // AC8
  await T('AC8_conversion_se_rechaza_en_NO_CONVERSION_USD_y_se_clasifica_FX_BRANCH_sin_implementar_FX', async () => {
    errq(await P(pubSql('S-F1', { content: `'{"currency":"USD","deposit":{"currency":"DOP","min":5000}}'::jsonb` })), /FX_CONVERSION_PRESENT/); errq(await P(pubSql('S-F2', { content: `'{"currency":"USD","compare":{"exchange_rate":60.2}}'::jsonb` })), /FX_CONVERSION_PRESENT/); errq(await P(pubSql('S-F3', { content: `'{"currency":"USD","rows":[{"equivalent_dop":1}]}'::jsonb` })), /FX_CONVERSION_PRESENT/);
    const a = okq(await P(pubSql('S-F4'))).split('|')[0]; okq(await R(`select revision->>'fx_class' from c1_ra1.read('S-F4','${a}');`), 'NO_CONVERSION_USD');
    const b = okq(await P(pubSql('S-F5', { content: `'{"currency":"USD","deposit":{"currency":"DOP","min":5000}}'::jsonb`, fx: 'FX_BRANCH' }))).split('|')[0]; okq(await R(`select revision->>'fx_class' from c1_ra1.read('S-F5','${b}');`), 'FX_BRANCH'); errq(await P(pubSql('S-F6', { fx: 'OTRA' })), /SHAPE_INVALID/);
  });
  // AC7
  await T('AC7_lectura_exacta_scope_distinto_ausente_forma', async () => {
    const a = okq(await P(pubSql('S-R1'))).split('|')[0]; okq(await R(`select status from c1_ra1.read('S-R1','${a}');`), 'OK'); okq(await R(`select status from c1_ra1.read('S-OTRO','${a}');`), 'NOT_FOUND'); okq(await R(`select status from c1_ra1.read('S-R1','R999999');`), 'REVISION_MISSING');
    okq(await R(`select status from c1_ra1.current('S-NOEXISTE','R1',1);`), 'NOT_FOUND'); okq(await R(`select status from c1_ra1.current('S-R1',null,null);`), 'SHAPE_INVALID'); okq(await R(`select status from c1_ra1.pin('S-NOEXISTE');`), 'NOT_FOUND');
  });
  // AC6
  await T('AC6a_rollback_no_deja_cabeza_parcial_ids_no_se_reutilizan_secuencia_con_huecos', async () => {
    const before = Number(okq(await B(db, `select coalesce(pg_sequence_last_value('c1_ra1.rev_seq'),0);`))); const cnt = () => B(db, `select (select count(*) from c1_ra1.revisions where scope='S-RB')||'|'||(select count(*) from c1_ra1.ledger where scope='S-RB');`);
    okq(await P(`begin;\n${pubSql('S-RB')}\nrollback;`)); okq(await cnt(), '0|0'); const mid = Number(okq(await B(db, `select coalesce(pg_sequence_last_value('c1_ra1.rev_seq'),0);`))); if (!(mid > before)) throw new Error('la secuencia debe avanzar (hueco) tras rollback');
    const r = okq(await P(pubSql('S-RB'))).split('|')[0]; if (Number(r.slice(1)) <= mid) throw new Error('id reutilizado: ' + r + ' ≤ ' + mid);
    const ab = await P(`begin;\nselect revision_id from c1_ra1.publish(${H.pubArgs('S-AB')});\nselect 1/0;\ncommit;`); errq(ab, /division by zero/); okq(await B(db, `select (select count(*) from c1_ra1.revisions where scope='S-AB')||'|'||(select count(*) from c1_ra1.ledger where scope='S-AB');`), '0|0');
    const ab2 = await P(`begin;\nselect * from c1_ra1.publish(${H.pubArgs('S-AB2', { members: "array['doc:NOPE@1']" })});\ncommit;`); errq(ab2, /DEPENDENCY_MISSING/); okq(await B(db, `select count(*) from c1_ra1.revisions where scope='S-AB2';`), '0');
  });
  await T('AC6b_concurrencia_misma_cabeza_exactamente_una_gana_la_otra_CONFLICT', async () => {
    const h = okq(await P(pubSql('S-RACE'))).split('|')[1]; const one = () => P(`begin;\nselect revision_id||'|'||seq from c1_ra1.publish(${H.pubArgs('S-RACE', { expect: h })});\nselect pg_sleep(1.2);\ncommit;`);
    const [x, y] = await Promise.all([one(), one()]); const wins = [x, y].filter((r) => r.code === 0); const losers = [x, y].filter((r) => r.code !== 0);
    if (wins.length !== 1 || losers.length !== 1 || !/CONFLICT/.test(losers[0].err)) throw new Error(`ganadoras=${wins.length} perdedoras=${losers.length} ${losers[0] ? losers[0].err.trim().slice(0, 100) : ''}`);
    okq(await B(db, `select count(*) from c1_ra1.ledger where scope='S-RACE' and event='PUBLISH';`), '2');
  });
  await T('AC6c_publicaciones_paralelas_ids_y_secuencia_distintos_cabeza_consistente', async () => {
    const one = () => P(`begin;\nselect revision_id||'|'||seq from c1_ra1.publish(${H.pubArgs('S-PAR')});\nselect pg_sleep(0.2);\ncommit;`); const rs = await Promise.all([1, 2, 3, 4, 5, 6].map(one));
    if (rs.some((r) => r.code !== 0)) throw new Error('fallo: ' + rs.find((r) => r.code !== 0).err.trim().slice(0, 100)); const vals = rs.map((r) => r.out.trim().split('\n')[0].split('|')); const ids = new Set(vals.map((v) => v[0])); const seqs = vals.map((v) => Number(v[1]));
    if (ids.size !== 6 || new Set(seqs).size !== 6) throw new Error('ids/secuencias repetidos'); okq(await B(db, `select (select max(seq) from c1_ra1.ledger where scope='S-PAR')||'|'||(select seq from c1_ra1.head_state('S-PAR'))||'|'||(select count(*) from c1_ra1.ledger where scope='S-PAR');`), `${Math.max(...seqs)}|${Math.max(...seqs)}|6`);
  });
  // AC10
  await T('AC10_no_se_alteran_catalogos_publicos_solo_existe_el_esquema_propio', async () => {
    okq(await B(db, `select (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public')||'|'||(select string_agg(nspname,',' order by nspname) from pg_namespace where nspname not like 'pg\\_%' and nspname<>'information_schema');`), '0|c1_ra1,public');
  });
  // AC3 — pérdida/alteración de almacenamiento (simulada por el superusuario del laboratorio; no se promete defensa contra superusuario)
  await T('AC3c_perdida_o_alteracion_de_contenido_o_dependencia_current_no_devuelve_OK', async () => {
    const t1 = await tok('S-L1'); okq(await B(db, `set session_replication_role=replica; update c1_ra1.revisions set content='{"currency":"USD","rows":[{"adult":999}]}'::jsonb where revision_id='${t1.rid}';`)); if ((await cur('S-L1', t1)) !== 'REVISION_MISSING') throw new Error('contenido alterado debe ser REVISION_MISSING');
    const t2 = await tok('S-L2', { members: "array['doc:D2@1','map:M2@1']" }); okq(await B(db, `alter table c1_ra1.objects drop constraint objects_digest_ck; set session_replication_role=replica; update c1_ra1.objects set content='{"room":"alterado"}'::jsonb where key='map:M2@1';`)); if ((await cur('S-L2', t2)) !== 'REVISION_MISSING') throw new Error('dependencia alterada debe ser REVISION_MISSING');
    errq(await P(pubSql('S-L3', { members: "array['doc:D1@1','map:M2@1']" })), /DEPENDENCY_CORRUPT/);
    const t3 = await tok('S-L4', { members: "array['doc:D3@1','map:M1@1']" }); okq(await B(db, `set session_replication_role=replica; delete from c1_ra1.objects where key='doc:D3@1';`)); if ((await cur('S-L4', t3)) !== 'REVISION_MISSING') throw new Error('dependencia perdida debe ser REVISION_MISSING');
    okq(await R(`select status from c1_ra1.read('S-L1','${t1.rid}');`), 'REVISION_MISSING');
  });
  return RES;
}

const MUTANTS = [
  ['S01_sin_horizonte_obligatorio', [["IF p_horizon_public IS NULL OR p_horizon_internal IS NULL THEN RAISE EXCEPTION 'HORIZON_MISSING'; END IF;", ""]]],
  ['S02_retencion_inclusiva', [["IF t >= r.retention_until", "IF t > r.retention_until"]], 'Igualdad exacta de instantes no reproducible con clock_timestamp(); el límite exclusivo se prueba en el modelo (M04) y la expiración real en AC3b.'],
  ['S03_sin_disparador_UPDATE_en_ledger', [["CREATE TRIGGER ledger_ro BEFORE UPDATE OR DELETE ON c1_ra1.ledger FOR EACH STATEMENT EXECUTE FUNCTION c1_ra1.deny_mutation();", ""]]],
  ['S04_sin_disparador_TRUNCATE_en_revisions', [["CREATE TRIGGER revisions_nt BEFORE TRUNCATE ON c1_ra1.revisions FOR EACH STATEMENT EXECUTE FUNCTION c1_ra1.deny_mutation();", ""]], 'Equivalente observable: TRUNCATE de revisions solo es posible junto con ledger (la clave foránea lo impide por separado) y ledger conserva su propio disparador TRUNCATE; el de revisions es defensa en profundidad.'],
  ['S05_publicador_con_SELECT_en_ledger', [], null, "GRANT SELECT ON c1_ra1.ledger TO c1_publisher;"],
  ['S06_sin_bloqueo_por_scope', [["PERFORM pg_advisory_xact_lock(hashtextextended('scope:' || p_scope, 0));     -- serializa publicaciones del scope hasta el commit", ""]]],
  ['S07_FX_no_se_rechaza', [["IF p_fx_policy = 'NO_CONVERSION_USD' AND fx THEN", "IF false AND fx THEN"]]],
  ['S08_importacion_se_toma_por_recepcion', [["imp := t0; recv := NULL;", "imp := t0; recv := t0;"]]],
  ['S09_valor_de_cliente_aceptado', [["IF p_original_received_at IS NOT NULL OR p_evidence_ref IS NOT NULL THEN RAISE EXCEPTION 'CLIENT_TIME_FORBIDDEN'; END IF;\n    recv := t0; imp := NULL;", "recv := coalesce(p_original_received_at, t0); imp := NULL;"]]],
  ['S10_entrega_sin_control_de_horizonte', [["IF dp > r.horizon_public OR di > r.horizon_internal OR", "IF false OR"]]],
  ['S11_publish_sin_SECURITY_DEFINER', [["RETURNS TABLE(revision_id text, seq bigint) LANGUAGE plpgsql SECURITY DEFINER", "RETURNS TABLE(revision_id text, seq bigint) LANGUAGE plpgsql"]]],
  ['S12_lector_con_EXECUTE_invalidate', [], null, "GRANT EXECUTE ON FUNCTION c1_ra1.invalidate(text) TO c1_reader;"],
  ['S13_dependencias_sin_verificar_en_uso', [["OR o.digest <> (m->>'digest') OR o.digest <> c1_ra1.sha(o.content)", ""]]],
  ['S14_sin_conflicto_optimista', [["IF p_expect_seq IS NOT NULL AND p_expect_seq <> h.seq THEN RAISE", "IF false THEN RAISE"]]],
  ['S15_pin_no_exige_activa', [["IF NOT h.valid OR NOT h.active THEN st := 'REVISION_MISSING'", "IF NOT h.valid THEN st := 'REVISION_MISSING'"]]],
  ['S16_sin_control_retencion_corta', [["IF p_retention_until < greatest(p_horizon_public, p_horizon_internal) + p_margin_ms * interval '1 millisecond' OR p_retention_until <= t0 THEN RAISE EXCEPTION 'RETENTION_SHORT'; END IF;", ""]]],
  ['S17_publicador_con_CREATE_en_esquema', [], null, "GRANT CREATE ON SCHEMA c1_ra1 TO c1_publisher;"],
  ['S18_publicador_miembro_de_propietario', [], null, "RESET ROLE; GRANT c1_owner TO c1_publisher;"],
];

async function main() {
  const t0 = Date.now(); const ev = { mandate_marker: MARKER, started_utc: new Date().toISOString(), host_note: 'laboratorio local nuevo; sin red; sin Supabase/VPS' };
  const v = asUser(BIN + '/postgres', ['--version']); ev.postgres_version = v.stdout.trim(); L('PostgreSQL: ' + ev.postgres_version);
  if (asUser('id', ['-u']).stdout.trim() === '0' || asUser('id', ['-u']).status !== 0) { L('GATE: usuario no-root inexistente o ejecución como root'); process.exit(4); }
  const pgenv = Object.keys(process.env).filter((k) => /^PG/.test(k)); ev.pg_env_vars_present = pgenv.length; if (pgenv.length) { L('GATE: variables PG* heredadas presentes (no se usarán): ' + pgenv.join(',')); }
  // directorio nuevo y propio
  DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'c1-ra1-lab-')); sh('chown', [OSUSER + ':' + OSUSER, DIR]); fs.chmodSync(DIR, 0o700); fs.writeFileSync(path.join(DIR, 'MANDATE.marker'), MARKER + '\n'); fs.mkdirSync(path.join(DIR, 'sock'), { mode: 0o700 }); sh('chown', [OSUSER + ':' + OSUSER, path.join(DIR, 'sock'), path.join(DIR, 'MANDATE.marker')]); SOCK = path.join(DIR, 'sock');
  ev.lab_dir = DIR; L('Directorio nuevo del mandato: ' + DIR);
  let started = false;
  try {
    const ini = asUser(BIN + '/initdb', ['-D', path.join(DIR, 'data'), '-U', 'c1_bootstrap', '-A', 'trust', '--locale=C', '--encoding=UTF8', '--no-sync']); if (ini.status !== 0) throw new Error('initdb falló: ' + ini.stderr.slice(0, 200));
    const st = asUser(BIN + '/pg_ctl', ['-D', path.join(DIR, 'data'), '-l', path.join(DIR, 'postgres.log'), '-w', '-o', `-c listen_addresses='' -c unix_socket_directories='${SOCK}' -c unix_socket_permissions=0700 -c port=${PORT} -c fsync=off -c log_connections=on -c log_statement=none`, 'start']); if (st.status !== 0) throw new Error('pg_ctl start falló: ' + st.stderr.slice(0, 200));
    started = true; PID = Number(fs.readFileSync(path.join(DIR, 'data', 'postmaster.pid'), 'utf8').split('\n')[0]); ev.pid = PID;
    const before = await gate('postgres', 'antes-de-DDL'); EXPECT = { sysid: before.system_identifier }; ev.identity_before = before; L('Identidad verificada (antes): ' + JSON.stringify(before));
    ev.catalog_before = (await B('postgres', `select string_agg(nspname,',' order by nspname) from pg_namespace where nspname not like 'pg\\_%' and nspname<>'information_schema';`)).out.trim();
    // roles sintéticos (nivel clúster de la instancia nueva) y base desechable con marca
    const boot = `create role c1_owner nologin; create role c1_publisher login; create role c1_reader login;`; let r = await B('postgres', boot); if (r.code !== 0) throw new Error('roles: ' + r.err);
    const mkdb = async (name) => { await gate('postgres', 'crear-' + name); let x = await B('postgres', `create database ${name} owner c1_bootstrap; comment on database ${name} is '${MARKER}'; grant create on database ${name} to c1_owner; revoke temporary on database ${name} from public;`); if (x.code !== 0) throw new Error(name + ': ' + x.err); await gate(name, 'base-' + name); };
    const apply = async (name, sql) => { await gate(name, 'ddl-' + name); const x = await B(name, `set role c1_owner;\nbegin;\n${sql}\ncommit;`); if (x.code !== 0) throw new Error('DDL en ' + name + ': ' + x.err.trim().slice(0, 300)); };
    const MAIN = 'c1_disposable_main'; await mkdb(MAIN); await apply(MAIN, SCHEMA_SQL); ev.identity_ddl = await gate(MAIN, 'tras-DDL');
    L('Suite principal ...'); const main = await suite(MAIN); ev.suite_main = main; for (const [k, vv] of Object.entries(main)) L(k + ' ' + vv);
    // reversa del candidato
    const rb = fs.readFileSync(path.join(SQLDIR, '02-rollback-ra1-v1.sql.inert'), 'utf8'); await gate(MAIN, 'reversa'); let x = await B(MAIN, `set role c1_owner;\nbegin;\n${rb}\ncommit;`); ev.rollback_script = x.code === 0 ? 'PASS' : 'FAIL ' + x.err.slice(0, 120);
    ev.after_rollback_schema = (await B(MAIN, `select count(*) from pg_namespace where nspname='c1_ra1';`)).out.trim(); L('Reversa: ' + ev.rollback_script + ' (esquemas c1_ra1 restantes: ' + ev.after_rollback_schema + ')');
    // mutaciones SQL en bases desechables separadas
    ev.sql_mutants = {}; let i = 0;
    for (const [name, reps, equiv, append] of MUTANTS) {
      let s = SCHEMA_SQL; let okRep = true; for (const [n, rr] of reps) { if (s.split(n).length !== 2) { okRep = false; break; } s = s.replace(n, () => rr); } if (append) s += '\n' + append;
      if (!okRep) { ev.sql_mutants[name] = 'NEEDLE_STALE'; continue; }
      const db = 'c1_disposable_mut' + (++i); await mkdb(db); await apply(db, s); const res = await suite(db); const fails = Object.entries(res).filter(([, vv]) => vv !== 'PASS').map(([k]) => k);
      ev.sql_mutants[name] = fails.length ? 'KILLED by ' + fails.join(',') : (equiv ? 'EQUIVALENT_DECLARED: ' + equiv : 'SURVIVED'); L(name + ' ' + ev.sql_mutants[name]);
      await B('postgres', `drop database ${db};`);
    }
    ev.catalog_after_main = null;
    ev.identity_after = await gate('postgres', 'final'); L('Identidad verificada (después): ' + JSON.stringify(ev.identity_after));
  } catch (e) { ev.error = String(e.message).slice(0, 400); L('ERROR/GATE: ' + ev.error); }
  finally {
    // limpieza limitada al PID y directorio creados
    if (started && PID) { const stp = asUser(BIN + '/pg_ctl', ['-D', path.join(DIR, 'data'), '-m', 'fast', '-w', 'stop']); ev.stop_status = stp.status; let alive = true; for (let k = 0; k < 50 && alive; k++) { let stt = null; try { stt = fs.readFileSync('/proc/' + PID + '/stat', 'utf8').split(') ')[1][0]; } catch (_) { stt = null; } alive = stt !== null && stt !== 'Z'; if (alive) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200); } ev.pid_alive_after_stop = alive; L(`Parada: pg_ctl=${stp.status}; PID ${PID} vivo=${alive}`); }
    try { fs.copyFileSync(path.join(DIR, 'postgres.log'), path.join(EVID, 'postgres-lab.log')); } catch (_) {}
    const confirmedStop = !ev.pid_alive_after_stop;
    if (DIR && /^\/tmp\/c1-ra1-lab-/.test(DIR) && fs.existsSync(path.join(DIR, 'MANDATE.marker')) && (confirmedStop || !started)) { fs.rmSync(DIR, { recursive: true, force: true }); ev.lab_dir_removed = !fs.existsSync(DIR); } else ev.lab_dir_removed = false;
    L('Directorio del laboratorio eliminado: ' + ev.lab_dir_removed);
  }
  const mainFails = Object.entries(ev.suite_main || {}).filter(([, v]) => v !== 'PASS'); const mut = Object.values(ev.sql_mutants || {}); const survivors = mut.filter((x) => x === 'SURVIVED' || x === 'NEEDLE_STALE');
  ev.summary = { suite_main_total: Object.keys(ev.suite_main || {}).length, suite_main_fail: mainFails.length, mutants_total: mut.length, killed: mut.filter((x) => /^KILLED/.test(x)).length, equivalent: mut.filter((x) => /^EQUIVALENT/.test(x)).length, survivors: survivors.length, rollback: ev.rollback_script, error: ev.error || null, elapsed_s: Math.round((Date.now() - t0) / 1000) };
  fs.writeFileSync(path.join(EVID, 'lab-run.json'), JSON.stringify(ev, null, 2) + '\n'); fs.writeFileSync(path.join(EVID, 'lab-run.log'), log.join('\n') + '\n');
  L('RESUMEN LAB: ' + JSON.stringify(ev.summary));
  if (ev.error) process.exit(/GATE/.test(ev.error) ? 4 : 1); process.exit(mainFails.length || survivors.length || ev.rollback_script !== 'PASS' || ev.pid_alive_after_stop || !ev.lab_dir_removed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
