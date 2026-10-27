'use strict';
const path=require('path');
const root=process.argv[2]||process.cwd();
const {makeWorld,REQ,DEL}=require(path.join(root,'hotel-document-decision-v1.3/tests/world.js'));
const w=makeWorld();w.addGuest('g','B1');const credential={guest:'g'};w.model.handle(REQ(),credential);
const ids=w.ports.ids.next,normalSend=w.ports.channel.deliver;
w.ports.channel.deliver=()=>{w.calls.deliver++;w.guestsTable.g.state='REVOKED';w.ports.ids.next=()=>{throw Error('ids unavailable')};return{ack:{kind:'CHANNEL_ACK'}}};
let first;try{first=w.model.handle(DEL(),credential)}catch(e){first={threw:e.message}}
const afterFirst=w.model.inspect();
w.guestsTable.g.state='VALID';w.ports.ids.next=ids;w.ports.channel.deliver=normalSend;
let second;try{second=w.model.handle(DEL(),credential)}catch(e){second={threw:e.message}}
console.log(JSON.stringify({expected:'one send; preserve operation even if denial fails',first,afterFirst,second,sendCount:w.calls.deliver,final:w.model.inspect()},null,2));
