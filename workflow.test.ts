import assert from 'node:assert/strict';
// @ts-ignore Node test runner resolves TypeScript source directly.
import {seed,mutate,types,flows,modules} from '../lib/erp.ts';
let state=seed();
const doIt=(module:string,action:string,id?:string,data:any={},role='Operations')=>{state=mutate(state,{module,action,recordId:id,data,role})};
const fails=(module:string,action:string,id:string,data:any={},role='Operations')=>{const before=JSON.stringify(state);assert.throws(()=>mutate(state,{module,action,recordId:id,data,role}));assert.equal(JSON.stringify(state),before)};
// Guard quality release and verify receipt creates stock, test and finance.
fails('batches','Release','BTH-2602',{},'Quality');
doIt('procurement','Receive','PO-001');const received=state.records.inventory[0];assert.equal(received.status,'Quarantine');assert.equal(state.records.finance[0].kind,'Payable');
fails('inventory','Release',received.id,{},'Quality');
let test=state.records.qc.find(x=>x.target===received.id)!;doIt('qc','Edit',test.id,{...test,result:'Conforms',specification:'Demo checks'});fails('qc','Pass',test.id);doIt('qc','Pass',test.id,{},'Quality');doIt('inventory','Release',received.id,{},'Quality');
// All five production workflows must consume stock, complete steps, release, dispatch and recall.
for(let i=0;i<types.length;i++){
 const product=state.records.products[i],equipment=state.records.equipment[i];
 doIt('batches','Create',undefined,{name:'Test '+types[i],product:product.id,equipment:equipment.id,quantity:1000,expiry:'2028-12-31',labour:20,overhead:10});
 const b=state.records.batches[0];doIt('batches','Start production',b.id);assert.equal(state.records.equipment.find(e=>e.id===equipment.id)!.status,'In use');
 for(let step=0;step<flows[types[i]].length;step++)doIt('batches','Record next step',b.id,{result:'Demo process verified',actual:980});
 assert.equal(state.records.batches.find(x=>x.id===b.id)!.status,'Awaiting QC');fails('batches','Release',b.id,{},'Quality');
 test=state.records.qc.find(t=>t.target===b.id)!;doIt('qc','Edit',test.id,{...test,result:'Conforms'});doIt('qc','Pass',test.id,{},'Quality');
 const pack=state.records.packaging.find(p=>p.batch===b.id)!;doIt('packaging','Edit',pack.id,{...pack,artwork:'ART-test',clearance:'CLN-test'});doIt('packaging','Start packaging',pack.id);doIt('packaging','Complete packaging',pack.id);doIt('batches','Release',b.id,{},'Quality');
 doIt('sales','Create',undefined,{name:'Demo customer',product:product.id,batch:b.id,quantity:100,price:2,credit:10000,minShelf:90});const sale=state.records.sales[0];doIt('sales','Dispatch',sale.id);assert.equal(state.records.finance[0].amount,200);
 doIt('recalls','Create',undefined,{name:'Demo recall',batch:b.id,reason:'Test workflow'});doIt('recalls','Activate recall',state.records.recalls[0].id);assert.equal(state.records.batches.find(x=>x.id===b.id)!.status,'Recalled');
 doIt('sales','Create',undefined,{name:'Blocked order',product:product.id,batch:b.id,quantity:1,price:2,credit:100,minShelf:1});fails('sales','Dispatch',state.records.sales[0].id);
}
assert.ok(state.audit.length>50);
for(const module of Object.keys(modules))assert.ok(state.records[module]);
console.log('PASS: receipt, quality guards, five manufacturing routes, material consumption, packaging, dispatch, invoicing, recall block and audit history.');
