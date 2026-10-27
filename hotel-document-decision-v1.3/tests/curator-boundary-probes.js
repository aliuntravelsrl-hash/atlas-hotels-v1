'use strict';
const path=require('path');
const root=process.argv[2]||process.cwd();
const {makeWorld,REQ,DEL,CUST}=require(path.join(root,'hotel-document-decision-v1.2/tests/world.js'));
const out=[];
{const w=makeWorld();const original=w.ports.renderer.render;w.ports.renderer.render=s=>{s.amounts[0].amount='9999.00';return original(s);};const r=w.model.handle(REQ({document_type:'QUOTE'}),CUST);out.push({id:'RENDER_INPUT_ALIAS',expected:'not release altered amount as authorized',decision:r.response.decision,amounts:r.response.amounts,sourceAmount:w.ports.price.get().amount,state:r.document.state});}
{const w=makeWorld();w.addGuest('g','B1');const credential={guest:'g'};w.model.handle(REQ(),credential);w.ports.channel.deliver=()=>{w.guestsTable.g.state='REVOKED';return{ack:{kind:'CHANNEL_ACK'}};};const r=w.model.handle(DEL(),credential);out.push({id:'UNSCOPED_OUTER_LEAK',expected:'retain internal ack; no document/delivery metadata to actor without scope',response:r.response,outerDelivery:r.delivery,internal:w.model.inspect()});}
{const w=makeWorld();const r=w.model.handle(REQ(),CUST);out.push({id:'POSITIVE_CONTROL',decision:r.response.decision,state:r.document.state});}
console.log(JSON.stringify(out,null,2));
