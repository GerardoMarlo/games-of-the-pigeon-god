import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleAPI} from './worker.mjs';
import {digest,checkProfile,checkSummary} from './validation.mjs';
function database(){
 const db=new DatabaseSync(':memory:');db.exec(readFileSync('backend/migrations/0001.sql','utf8'));
 const wrap=(sql,args=[])=>({bind:(...values)=>wrap(sql,values),first:async()=>db.prepare(sql).get(...args),run:async()=>db.prepare(sql).run(...args)});
 return {raw:db,prepare:wrap,batch:async statements=>{db.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}};
}
test('profiles accept any email provider and require explicit consent',()=>{
 assert.equal(checkProfile({name:'A',email:'rat@example.org',consent:true}).email,'rat@example.org');
 assert.throws(()=>checkProfile({name:'A',email:'rat@example.org',consent:false}));
 assert.throws(()=>checkProfile({name:'A',email:'not-email',consent:true}));
});
test('registration verifies challenge, stores consent centrally, and returns a private session',async t=>{
 const DB=database(),env={DB,RATE_LIMIT_KEY_SECRET:'unit-test-only',TURNSTILE_SECRET_KEY:'unit-test-only'};
 t.mock.method(globalThis,'fetch',async()=>Response.json({success:true,hostname:'play.marlo.games',action:'register'}));
 const response=await handleAPI(new Request('https://play.marlo.games/api/v1/pigeongod/players',{method:'POST',headers:{Origin:'https://play.marlo.games','Content-Type':'application/json'},body:JSON.stringify({name:'Example','email':'example@outlook.com',consent:true,turnstileToken:'test'})}),env);
 assert.equal(response.status,201);
 const body=await response.json(),cookie=response.headers.get('Set-Cookie');
 assert.ok(body.playerId);assert.equal(body.email,undefined);
 assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Strict/);
 const record=DB.raw.prepare('SELECT * FROM players WHERE id=?').get(body.playerId);
 assert.equal(record.email,'example@outlook.com');assert.ok(record.consent_at>0);
 const restored=await handleAPI(new Request('https://play.marlo.games/api/v1/pigeongod/profile',{headers:{Cookie:cookie.split(';')[0]}}),env);
 assert.equal(restored.status,200);assert.equal((await restored.json()).playerId,body.playerId);
});
test('API denies cross-origin writes and unauthenticated access',async()=>{
 assert.equal((await handleAPI(new Request('https://play.marlo.games/api/v1/pigeongod/players',{method:'POST'}),{})).status,403);
 assert.equal((await handleAPI(new Request('https://play.marlo.games/api/v1/pigeongod/profile'),{DB:database()})).status,401);
});
test('Match start is idempotent, completion owned, and deleting profile deletes its data',async()=>{
 const DB=database(),token='a'.repeat(64),now=Date.now();
 DB.raw.prepare('INSERT INTO players(id,name,email,consent_version,consent_at,created_at) VALUES(?,?,?,?,?,?)').run('owner','Tester','test@example.org','v1',now,now);
 DB.raw.prepare('INSERT INTO sessions VALUES(?,?,?)').run(await digest(token),'owner',now+60000);
 const env={DB},headers={'Cookie':'pigeon_profile='+token,'Origin':'https://play.marlo.games','Content-Type':'application/json'};
 const path='https://play.marlo.games/api/v1/pigeongod/matches/11111111-1111-4111-8111-111111111111';
 const body={seed:1,playerCount:3,mode:'ai',gameVersion:'0.1.0',rulesVersion:'rules1',aiVersion:'ai1',metricsVersion:'1'};
 const start=()=>handleAPI(new Request(path,{method:'PUT',headers,body:JSON.stringify(body)}),env);
 assert.equal((await start()).status,201);assert.equal((await start()).status,200);
 assert.equal(DB.raw.prepare('SELECT total_matches_started AS n FROM players').get().n,1);
 const summary={rats:[],arenas:[],turns:[],decrees:[],items:[],bets:[],cats:[],completed:true,winnerId:'p1',winnerDivineFavor:2,rngSeed:1,playerCount:3,metricsVersion:'1',divineFavor:{p1:2,p2:1,p3:0}};
 const complete=()=>handleAPI(new Request(path+'/complete',{method:'PUT',headers,body:JSON.stringify(summary)}),env);
 assert.equal((await complete()).status,200);assert.equal((await complete()).status,200);
 assert.equal(DB.raw.prepare('SELECT COUNT(*) AS n FROM participants').get().n,3);
 assert.equal((await handleAPI(new Request('https://play.marlo.games/api/v1/pigeongod/profile',{method:'DELETE',headers}),env)).status,200);
 assert.equal(DB.raw.prepare('SELECT COUNT(*) AS n FROM matches').get().n,0);
});
test('invalid analytics cannot add identity or negative counters',()=>{
 assert.throws(()=>checkSummary({completed:true,winnerId:'p1',email:'x@y.com'}));
 assert.throws(()=>checkSummary({completed:true,winnerId:'p1',rats:[{damageDealt:-1}]}));
});
