const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/auth');
const { User } = require('../models');
const Wheel = require('../models/DecisionWheel');
const routes = require('../routes/decisionWheels');
const mine='111111111111111111111111', partner='222222222222222222222222', outsider='333333333333333333333333';
const coupleId=[mine,partner].sort().join('_');
let server,url,docs,events,reciprocal,failWrite,race,queries;
const original={user:User.findById,find:Wheel.find,one:Wheel.findOne,update:Wheel.findOneAndUpdate};
const query=fn=>({select(){return this},lean:async()=>structuredClone(await fn())});
const matches=(d,f)=>Object.entries(f).every(([k,v])=>d[k]===v);
async function request(path='',body,actor=mine,method=body?'PATCH':'GET') {
 const response=await fetch(url+path,{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:'Bearer '+jwt.sign({userId:actor},JWT_SECRET,{expiresIn:'5m'})}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,...await response.json()};
}
const add=(label='烤肉',extra={})=>({action:'add',id:'entry-00000000001',label,revision:0,...extra});
test.before(async()=>{const app=express();app.use(express.json());app.locals.broadcastToCouple=(scope,event)=>events.push({scope,event,saved:structuredClone(docs)});app.use('/w',routes);server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));url=`http://127.0.0.1:${server.address().port}/w`;});
test.beforeEach(()=>{
 docs=[];events=[];reciprocal=true;failWrite=false;race=false;queries=[];
 User.findById=id=>query(()=>({_id:id,partnerId:id===mine?partner:id===partner?(reciprocal?mine:null):id===outsider?'444444444444444444444444':outsider}));
 Wheel.find=f=>query(()=>{queries.push(f);return docs.filter(d=>matches(d,f))});
 Wheel.findOne=f=>query(()=>{queries.push(f);return docs.find(d=>matches(d,f))||null});
 Wheel.findOneAndUpdate=(f,u,o)=>query(()=>{
  queries.push(f);if(failWrite)throw Error('synthetic write failure');
  if(race && !o.upsert){race=false;docs[0].revision++;return null}
  let d=docs.find(d=>matches(d,f));if(!d&&o.upsert){d={...u.$setOnInsert,lastDraw:null};docs.push(d)}
  if(!d)return null;Object.assign(d,u.$set||{});d.revision+=u.$inc?.revision||0;return d;
 });
});
test.after(async()=>{User.findById=original.user;Wheel.find=original.find;Wheel.findOne=original.one;Wheel.findOneAndUpdate=original.update;server.closeAllConnections();await new Promise(r=>server.close(r));});
test('requires JWT and reciprocal current couple before any database read',async()=>{assert.equal((await request('',null,null)).status,401);reciprocal=false;assert.equal((await request()).status,403);assert.equal(queries.length,0);});
test('returns three empty categories without inventing entries or writing records',async()=>{const r=await request();assert.deepEqual(r.data.categories.map(c=>c.label),['吃点好的','随便吃点','出去玩时想做的事']);assert.ok(r.data.wheels.every(w=>!w.entries.length));assert.equal(docs.length,0);assert.equal(events.length,0);});
test('ignores spoofed identity and saves before notifying only current couple',async()=>{const r=await request('/special',add('烤肉',{userId:outsider,coupleId:'fake',createdBy:outsider}));assert.equal(r.status,200);assert.equal(docs[0].coupleId,coupleId);assert.equal(docs[0].entries[0].createdBy,mine);assert.equal(events[0].scope,coupleId);assert.equal(events[0].saved[0].entries.length,1);assert.equal(r.data.entries[0].canManage,true);assert.equal('coupleId' in r.data,false);});
test('add retries do not duplicate, categories remain separate and labels are unique',async()=>{await request('/special',add());assert.equal((await request('/special',add())).status,200);assert.equal(docs[0].entries.length,1);assert.equal((await request('/special',add('烤肉',{id:'entry-00000000002',revision:1}))).status,400);assert.equal((await request('/everyday',add('面条'))).status,200);assert.equal(docs.length,2);});
test('partner sees entries but cannot edit or remove creator entries; outsider cannot read them',async()=>{await request('/special',add());const p=await request('',null,partner);assert.equal(p.data.wheels[0].entries[0].canManage,false);for(const action of ['edit','remove'])assert.equal((await request('/special',add('改名',{action,revision:1}),partner)).status,403);assert.ok((await request('',null,outsider)).data.wheels.every(w=>w.entries.length===0));});
test('owner can edit and delete; stale versions and concurrent writes cannot overwrite',async()=>{await request('/special',add());assert.equal((await request('/special',add('火锅',{action:'edit'}))).status,409);assert.equal((await request('/special',add('火锅',{action:'edit',revision:1}))).status,200);race=true;assert.equal((await request('/special',add('',{action:'remove',revision:2}))).status,409);assert.equal(docs[0].entries[0].label,'火锅');assert.equal((await request('/special',add('',{action:'remove',revision:3}))).status,200);assert.equal(docs[0].entries.length,0);});
test('rejects malformed category, IDs, revisions, labels and full wheels',async()=>{assert.equal((await request('/fake',add())).status,400);for(const extra of [{label:''},{label:'x'.repeat(41)},{label:'a\nb'},{id:'$bad'},{revision:'0'},{revision:-1}])assert.equal((await request('/special',add('x',extra))).status,400);await request('/special',add());docs[0].entries=Array.from({length:30},(_,i)=>({id:'entry-'+i,label:'x'+i,createdBy:mine}));assert.equal((await request('/special',add('new',{id:'entry-00000000002',revision:1}))).status,400);});
test('spin selects only actual entries, persists result, and retries do not draw twice',async()=>{assert.equal((await request('/special/spin',{requestId:'spin-00000000001',revision:0},mine,'POST')).status,400);await request('/special',add());const body={requestId:'spin-00000000001',revision:1};const r=await request('/special/spin',body,mine,'POST');assert.equal(r.status,200);assert.equal(r.data.lastDraw.label,'烤肉');assert.equal(r.data.lastDraw.entryId,r.data.entries[0].id);const saved=structuredClone(docs[0]);assert.equal((await request('/special/spin',body,mine,'POST')).status,200);assert.deepEqual(docs[0],saved);assert.equal((await request('',null,partner)).data.wheels[0].lastDraw.isMine,false);});
test('spin conflicts and persistence failures never emit false success',async()=>{await request('/special',add());events=[];race=true;assert.equal((await request('/special/spin',{requestId:'spin-00000000001',revision:1},mine,'POST')).status,409);assert.equal(events.length,0);failWrite=true;assert.equal((await request('/special',add('x',{revision:2}))).status,500);assert.equal(events.length,0);});
