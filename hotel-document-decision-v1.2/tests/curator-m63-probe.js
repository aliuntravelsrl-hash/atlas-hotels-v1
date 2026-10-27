'use strict';
// Copia de la sonda del Curator (OBS-248). ÚNICO cambio AT: realpathSync de world.js, porque require.cache se indexa por ruta real y la ruta montada por enlace simbólico no invalidaba la caché.
const fs=require('fs'),os=require('os'),path=require('path');
const root=process.argv[2]||process.cwd();
const src=fs.readFileSync(path.join(root,'hotel-document-decision-v1.1/model/hotel-doc-decision.js'),'utf8');
const before="if (!b || b.cancelled === true) { doc.state = 'VOIDED'; doc.void_reason = 'BOOKING_CANCELLED_OR_INVALID'; continue; }";
const after="if (!b) { doc.state = 'VOIDED'; doc.void_reason = 'BOOKING_CANCELLED_OR_INVALID'; continue; }";
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'curator-m63-')),file=path.join(dir,'mutant.js');
const W=fs.realpathSync(path.join(root,'hotel-document-decision-v1.1/tests/world.js')),old=process.env.DOC_MODEL,out=[];
try{if(src.split(before).length!==2)throw Error('needle mismatch');fs.writeFileSync(file,src.replace(before,after));
for(const mode of ['base','M63']){delete require.cache[W];if(mode==='M63')process.env.DOC_MODEL=file;else delete process.env.DOC_MODEL;
const {makeWorld,REQ,CUST}=require(W);const w=makeWorld();w.model.handle(REQ(),CUST);w.setBooking('B1',{cancelled:true,revision:2});w.model.sweep();out.push({mode,documents:w.model.inspect().docs});}
console.log(JSON.stringify(out,null,2));}finally{if(old===undefined)delete process.env.DOC_MODEL;else process.env.DOC_MODEL=old;fs.rmSync(dir,{recursive:true,force:true});}
