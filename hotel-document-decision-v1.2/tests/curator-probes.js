'use strict';
const path=require('path');
const root=process.argv[2]||process.cwd();
const {makeWorld,REQ,DEL,CUST,M}=require(path.join(root,'hotel-document-decision-v1/tests/world.js'));
const out=[];
for(const locator of ['', 'PENDIENTE']){const w=makeWorld();w.setEvidence('B1',[w.mkEvidence('B1',{kind:'PROVIDER_LOCATOR',locator})]);const r=w.model.handle(REQ({document_type:'VOUCHER'}),CUST);out.push({id:'locator_'+(locator||'empty'),expected:'not ALLOW',observed:r.response.decision,render:w.calls.render});}
{const w=makeWorld();w.priceExpires='INVALID';const r=w.model.handle(REQ({document_type:'QUOTE'}),CUST);out.push({id:'price_expiry_invalid',expected:'not ALLOW',observed:r.response.decision,render:w.calls.render});}
{const w=makeWorld();const r=w.model.handle(REQ(),CUST).response;delete r.decision_expires_at;out.push({id:'allow_missing_expiry',expected:'invalid/no action',validator:M.validatePublic(r),consumer:M.consumePublic(r)});}
{const w=makeWorld();const r=w.model.handle(REQ(),CUST).response;r.allowed_actions=['NONE','RENDER'];out.push({id:'exclusive_none',expected:'invalid/no action',validator:M.validatePublic(r),consumer:M.consumePublic(r)});}
{const w=makeWorld();const r=w.model.handle(REQ(),CUST).response;r.decision='DENY';r.reason_codes=[];out.push({id:'deny_empty_reason',expected:'invalid',validator:M.validatePublic(r)});}
{const w=makeWorld();w.setEvidence('B1',[w.mkEvidence('B1')]);const req=REQ({document_type:'VOUCHER'});w.model.handle(req,CUST);w.setBooking('B1',{cancelled:true});w.model.sweep();w.setBooking('B1',{cancelled:false});const r=w.model.handle(req,CUST);out.push({id:'replay_voided',expected:'no actionable ALLOW on voided artifact',observed:r.response.decision,state:r.document.state});}
{const w=makeWorld();const original=w.ports.renderer.render;w.ports.renderer.render=s=>{w.bump('B1');return original(s)};const r=w.model.handle(REQ(),CUST);out.push({id:'drift_during_render',expected:'not release stale RENDERED as current',observed:r.response.decision,sourceRevision:w.bookings.get('B1').revision,decisionRevision:r.response.booking_revision,state:r.document.state});}
{const w=makeWorld();const r=w.model.handle(REQ(),CUST);out.push({id:'positive_control',expected:'ALLOW/RENDERED',observed:r.response.decision,state:r.document.state});}
console.log(JSON.stringify(out,null,2));
