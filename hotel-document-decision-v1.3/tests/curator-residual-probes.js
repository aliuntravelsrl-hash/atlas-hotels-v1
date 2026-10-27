'use strict';
const path=require('path');
const root=process.argv[2]||process.cwd();
const {makeWorld,REQ,DEL,CUST}=require(path.join(root,'hotel-document-decision-v1.1/tests/world.js'));
const out=[];
{const w=makeWorld();const original=w.ports.renderer.render;w.ports.renderer.render=a=>{const r=original(a);w.ports.price.get=()=>({verified:true,amount:'9999.00',currency:'USD',expires_at:'2026-10-28T12:00:00Z'});return r;};const r=w.model.handle(REQ({document_type:'QUOTE'}),CUST);out.push({id:'R4_PRICE_DRIFT',expected:'no release of stale amount as current',decision:r.response.decision,amounts:r.response.amounts,state:r.document.state});}
{const w=makeWorld();w.addGuest('g','B1');const original=w.ports.renderer.render;w.ports.renderer.render=a=>{const r=original(a);w.ports.policy.guestScope=()=>({commands:[],types:[],share_kinds:[]});return r;};const r=w.model.handle(REQ(),{guest:'g'});out.push({id:'R4_GUEST_SCOPE_REVOKED',expected:'no actionable ALLOW',decision:r.response.decision,state:r.document?.state});}
{const w=makeWorld();w.model.handle(REQ(),CUST);w.ports.channel.deliver=()=>{w.advance(16*60*1000);return{ack:{kind:'CHANNEL_ACK'}};};const r=w.model.handle(DEL(),CUST);out.push({id:'R5_EXPIRED_DURING_DELIVERY',expected:'no current ALLOW after original expiry; preserve attempt/ack',decision:r.response.decision,expires:r.response.decision_expires_at,now:w.nowIso(),state:r.delivery.state});}
{const w=makeWorld();const r=w.model.handle(REQ(),CUST);out.push({id:'POSITIVE_CONTROL',decision:r.response.decision,state:r.document.state});}
console.log(JSON.stringify(out,null,2));
