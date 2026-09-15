import {API_PATH,CONSENT_VERSION,checkProfile,checkStart,checkSummary,checkEvents,digest,boundedJSON} from './validation.mjs';
const cookieName='pigeon_profile';
const json=(value,status=200,headers={})=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const cookie=token=>cookieName+'='+token+'; Secure; HttpOnly; SameSite=Strict; Path='+API_PATH+'/; Max-Age=31536000';
async function limited(env,key,limit){
 const now=Date.now(),bucket=Math.floor(now/60000);
 const row=await env.DB.prepare('INSERT INTO rate_buckets(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key+':'+bucket,now+120000).first();
 return row.count>limit;
}
async function session(req,env){
 const token=(req.headers.get('Cookie')??'').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 if(!token||! /^[a-f0-9]{64}$/.test(token))return null;
 return env.DB.prepare('SELECT p.* FROM players p JOIN sessions s ON s.player_id=p.id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(token),Date.now()).first();
}
export async function handleAPI(req,env){
 const url=new URL(req.url),route=url.pathname.slice(API_PATH.length);
 if(url.hostname!=='play.marlo.games'||!url.pathname.startsWith(API_PATH+'/'))return json({error:'Not found'},404);
 if(req.method!=='GET'&&req.headers.get('Origin')!=='https://play.marlo.games')return json({error:'Invalid origin'},403);
 if(req.method==='GET'&&route==='/config')return json({sitekey:env.TURNSTILE_SITE_KEY,consentVersion:CONSENT_VERSION});
 try{
  if(route==='/players'&&req.method==='POST'){
   if(!req.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON required'},415);
   const body=await boundedJSON(req,4096),profile=checkProfile(body);
   const rateKey=await digest(env.RATE_LIMIT_KEY_SECRET+':'+new Date().toISOString().slice(0,10)+':'+(req.headers.get('CF-Connecting-IP')??'unknown'));
   if(await limited(env,rateKey,5))return json({error:'Please try again in a minute.'},429);
   if(typeof body.turnstileToken!=='string'||body.turnstileToken.length>2048)return json({error:'Complete the verification.'},400);
   const verified=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:body.turnstileToken})}).then(r=>r.json());
   if(!verified.success||verified.hostname!=='play.marlo.games'||verified.action!=='register')return json({error:'Verification expired. Please retry.'},400);
   const id=crypto.randomUUID(),token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''),now=Date.now();
   await env.DB.batch([
    env.DB.prepare('INSERT INTO players(id,name,email,consent_version,consent_at,created_at) VALUES(?,?,?,?,?,?)').bind(id,profile.name,profile.email,CONSENT_VERSION,now,now),
    env.DB.prepare('INSERT INTO sessions(token_hash,player_id,expires_at) VALUES(?,?,?)').bind(await digest(token),id,now+31536000000)
   ]);
   return json({playerId:id,name:profile.name,consentVersion:CONSENT_VERSION},201,{'Set-Cookie':cookie(token)});
  }
  const player=await session(req,env);
  if(!player)return json({error:'Profile required'},401);
  if(await limited(env,'session:'+player.id,60))return json({error:'Retry shortly'},429);
  if(route==='/profile'){
   if(req.method==='GET')return json({playerId:player.id,name:player.name,email:player.email,consentVersion:player.consent_version});
   if(req.method==='DELETE'){
    await env.DB.prepare('DELETE FROM players WHERE id=?').bind(player.id).run();
    return json({deleted:true},200,{'Set-Cookie':cookie('')+'; Max-Age=0'});
   }
   if(req.method==='PATCH'){
    const p=checkProfile(await boundedJSON(req,4096));
    await env.DB.prepare('UPDATE players SET name=?,email=? WHERE id=?').bind(p.name,p.email,player.id).run();
    return json({playerId:player.id,name:p.name,consentVersion:player.consent_version});
   }
  }
  const match=route.match(/^\/matches\/([0-9a-f-]{36})(?:\/(complete|events)(?:\/(\d+))?)?$/);
  if(!match||req.method!=='PUT')return json({error:'Not found'},404);
  const [,id,operation,batchText]=match;
  const existing=await env.DB.prepare('SELECT * FROM matches WHERE id=?').bind(id).first();
  if(existing&&existing.player_id!==player.id)return json({error:'Forbidden'},403);
  if(!operation){
   const v=checkStart(await boundedJSON(req,4096)),config=JSON.stringify(v);
   if(existing)return existing.config_json===config?json({accepted:true}):json({error:'Conflicting Match'},409);
   const now=Date.now();
   await env.DB.batch([
    env.DB.prepare("INSERT INTO matches(id,player_id,source,started_at,game_version,rules_version,ai_version,metrics_version,seed,config_json) VALUES(?,?,'human',?,?,?,?,?,?,?)").bind(id,player.id,now,v.gameVersion,v.rulesVersion,v.aiVersion,v.metricsVersion,v.seed,config),
    env.DB.prepare('UPDATE players SET first_played_at=COALESCE(first_played_at,?),last_played_at=?,total_matches_started=total_matches_started+1 WHERE id=?').bind(now,now,player.id)
   ]);return json({accepted:true},201);
  }
  if(!existing)return json({error:'Start Match first'},409);
  const payload=await boundedJSON(req),encoded=JSON.stringify(payload),hash=await digest(encoded);
  if(operation==='events'){
   const batch=Number(batchText);if(!Number.isInteger(batch)||batch<0||batch>2000||!Array.isArray(payload)||payload.length>100)return json({error:'Invalid event batch'},400);
   checkEvents(payload);
   const old=await env.DB.prepare('SELECT payload_hash FROM event_batches WHERE match_id=? AND batch=?').bind(id,batch).first();
   if(old)return old.payload_hash===hash?json({accepted:true}):json({error:'Conflicting batch'},409);
   if(existing.completed_at)return json({error:'Match already completed'},409);
   await env.DB.prepare('INSERT INTO event_batches(match_id,batch,payload_json,payload_hash,created_at) VALUES(?,?,?,?,?)').bind(id,batch,encoded,hash,Date.now()).run();return json({accepted:true});
  }
  if(existing.complete_hash)return existing.complete_hash===hash?json({accepted:true}):json({error:'Conflicting completion'},409);
  const summary=checkSummary(payload),config=JSON.parse(existing.config_json);
  if(summary.rngSeed!==existing.seed||summary.playerCount!==config.playerCount||summary.metricsVersion!==existing.metrics_version||summary.winnerDivineFavor!==summary.divineFavor[summary.winnerId])return json({error:'Inconsistent Match'},400);
  const participants=Object.entries(summary.divineFavor);
  if(participants.length!==config.playerCount)return json({error:'Wrong participants'},400);
  const now=Date.now();
  await env.DB.batch([
   env.DB.prepare('UPDATE matches SET summary_json=?,complete_hash=?,completed_at=? WHERE id=?').bind(encoded,hash,now,id),
   ...participants.map(([pid,favor])=>{
    const types=new Set(summary.rats.filter(r=>r.participantId===pid).map(r=>r.controllerType));
    return env.DB.prepare('INSERT INTO participants(match_id,participant_id,known_player_id,controller_type,final_favor) VALUES(?,?,?,?,?)').bind(id,pid,pid==='p1'?player.id:null,types.size===1?[...types][0]:'mixed',favor);
   }),
   env.DB.prepare('UPDATE players SET last_played_at=? WHERE id=?').bind(now,player.id)
  ]);
  return json({accepted:true});
 }catch(e){
  // Do not log request bodies, credentials or contact details.
  const validation=/Invalid|Unknown|Missing|Enter |required|Request too large|Completed Match/.test(e.message??'');
  return json({error:validation?e.message:'Storage is temporarily unavailable. Your game can continue.'},validation?400:503);
 }
}
export default {
 fetch:handleAPI,
 async scheduled(_event,env){
  const now=Date.now();
  await env.DB.batch([
   env.DB.prepare('DELETE FROM rate_buckets WHERE expires_at<?').bind(now),
   env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now),
   env.DB.prepare('DELETE FROM event_batches WHERE created_at<?').bind(now-90*86400000),
   env.DB.prepare('DELETE FROM matches WHERE completed_at IS NULL AND started_at<?').bind(now-30*86400000),
   env.DB.prepare('DELETE FROM matches WHERE completed_at<?').bind(now-730*86400000),
   env.DB.prepare('DELETE FROM players WHERE COALESCE(last_played_at,created_at)<?').bind(now-730*86400000)
  ]);
 }
};
