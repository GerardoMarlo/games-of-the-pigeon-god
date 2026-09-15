export const CONSENT_VERSION='2026-09-14-v1';
export const API_PATH='/api/v1/pigeongod';
export function checkProfile(v){
 if(!v||typeof v!=='object'||typeof v.name!=='string'||typeof v.email!=='string'||v.consent!==true)throw Error('Name, email and explicit consent are required.');
 const name=v.name.trim(),email=v.email.trim();
 if(name.length<1||name.length>80||email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Enter a name and a valid email address.');
 return {name,email};
}
export function checkStart(v){
 if(!v||!Number.isSafeInteger(v.seed)||v.seed<0||v.seed>4294967295||![2,3,4].includes(v.playerCount)||!['local','ai'].includes(v.mode))throw Error('Invalid Match configuration');
 for(const key of ['gameVersion','rulesVersion','aiVersion','metricsVersion'])if(typeof v[key]!=='string'||! /^[a-zA-Z0-9.+_-]{1,80}$/.test(v[key]))throw Error('Invalid version');
 return {seed:v.seed,playerCount:v.playerCount,mode:v.mode,gameVersion:v.gameVersion,rulesVersion:v.rulesVersion,aiVersion:v.aiVersion,metricsVersion:v.metricsVersion};
}
const numeric=new Set(['damageDealt','damageReceived','finishes','attacks','dodges','fervorGenerated','fervorSpent','divineFavor','health','sequence','arena','duel','rounds','turns','elapsedMs','round','normalActions','bonusActions','ratCombats','catCombats','shownAt','claimedAt','favor','drawnAt','usedAt','discardedAt','timesFinished','outOfBoundsRespawns','finishedRespawns','eliminatedPlayerFinishes','eliminatedPlayerFavor','rngSeed','playerCount','winnerDivineFavor','eventCount','durationMs','humanPlayerCount','aiPlayerCount']);
const textKeys=new Set(['participantId','ratId','segment','controllerType','reason','winnerId','cardId','target','winnerControllerType','metricsVersion','aiDifficulty']);
const boolKeys=new Set(['arenaWon','matchWon','successful','finalDuelOccurred','completed']);
export function checkSummary(v){
 if(!v||v.completed!==true||!/^p[1-4]$/.test(v.winnerId??''))throw Error('Completed Match required');
 const arrays=['rats','arenas','turns','decrees','items','bets','cats'];
 const allowed=new Set([...arrays,...numeric,...textKeys,...boolKeys,'divineFavor']);
 for(const [k,val] of Object.entries(v)){
  if(!allowed.has(k))throw Error('Unknown metric');
  if(arrays.includes(k)){if(!Array.isArray(val)||val.length>5000)throw Error('Invalid metric list');for(const row of val)for(const [rk,rv] of Object.entries(row))checkScalar(rk,rv);}
  else if(k==='divineFavor'){if(!val||Object.keys(val).length>4)throw Error('Invalid Favor');for(const [id,n] of Object.entries(val)){if(!/^p[1-4]$/.test(id)||!Number.isSafeInteger(n)||n<0||n>10000)throw Error('Invalid Favor');}}
  else checkScalar(k,val);
 }
 for(const a of arrays)if(!Array.isArray(v[a]))throw Error('Missing metric list');
 return v;
}
function checkScalar(k,v){
 if(numeric.has(k)){if(v!==null&&(!Number.isFinite(v)||v<0||v>1e10))throw Error('Invalid numeric metric');}
 else if(textKeys.has(k)){if(typeof v!=='string'||v.length>100||! /^[a-zA-Z0-9._ -]+$/.test(v))throw Error('Invalid label');}
 else if(boolKeys.has(k)){if(typeof v!=='boolean')throw Error('Invalid boolean');}
 else throw Error('Unknown metric field');
}
export async function digest(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function boundedJSON(request,max=65536){
 const reader=request.body?.getReader();if(!reader)throw Error('JSON body required');
 let size=0;const chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw Error('Request too large');}chunks.push(value);}
 const bytes=new Uint8Array(size);let off=0;for(const b of chunks){bytes.set(b,off);off+=b.length;}
 return JSON.parse(new TextDecoder().decode(bytes));
}
const eventTypes=new Set(['OBSERVATION','ITEM_DRAWN','ITEM_USED','ITEM_DISCARDED','DECREE_REVEALED','ACTION_SPENT','COMBAT_MATH','DECREE_CLAIMED','BURROW_PLACED','PHASE_CHANGED','RAT_MOVED','COMBAT_TRIGGERED','ROLL','REROLL','ROLL_CONFIRMED','DAMAGE','FERVOR_CHANGED','TRACKER_CHANGED','FAVOR_CHANGED','RAT_FINISHED','COMBAT_RESOLVED','DISPLACED','CAT_MOVED','CAT_RESPAWNED','CAT_FINISHED','ARENA_STARTED','BET_PLACED','MATCH_ENDED','DUEL_STARTED','ARENA_ENDED']);
const actionTypes=new Set(['MODE','RANDOM_BURROW','CHOOSE_CAT_DIRECTION','PLACE_BURROW','MOVE','CONTINUE_ARENA','START_ARENA_2','ROLL_CAT_MOVEMENT','END_TURN','CONFIRM_ATTACK','CONFIRM_DODGE','SPEND_FERVOR','SELECT_PUSHBACK','SELECT_DUEL_RAT','SELECT_BET','EFFECT_REQUEST_ITEM','RESOLVE_COMBAT','REQUEST_ITEM','ROLL_ATTACK','ACCEPT_ATTACK','ROLL_DODGE','CONFIRM_CAT_DIRECTION','FINISH_CAT_MOVEMENT','SKIP_EFFECT','USE_ITEM','USE_ABILITY','EFFECT_ACTION_MOVE','EFFECT_MOVE']);
const eventKeys=new Set(['type','kind','reason','arena','round','duel','active','players','id','ratId','controller','health','favor','playerId','cardId','amount','bonus','hits','canceled','counter','reward','slot','position','q','r','phase','from','to','cost','attackerId','defenderId','dice','index','before','after','sourceId','targetId','healthRemaining','tracker','source','attackerDamage','defenderDamage','winnerId','chosenBy','die','blocked','occupied','arenaNumber','attempt','mode','direction','destination','path','dieIndex','itemId']);
export function checkEvents(rows){
 if(!Array.isArray(rows)||rows.length>100)throw Error('Invalid event batch');
 function walk(v,depth=0){
  if(depth>7)throw Error('Invalid nesting');
  if(v===null)return;
  if(typeof v==='number'){if(!Number.isFinite(v)||Math.abs(v)>1e10)throw Error('Invalid event number');return;}
  if(typeof v==='boolean')return;
  if(typeof v==='string'){if(v.length>120||v.includes('@')||/[<>\u0000-\u001f]/.test(v))throw Error('Invalid event label');return;}
  if(Array.isArray(v)){if(v.length>64)throw Error('Invalid event array');for(const a of v)walk(a,depth+1);return;}
  if(!v||typeof v!=='object')throw Error('Invalid event value');
  for(const [k,val] of Object.entries(v)){if(!eventKeys.has(k))throw Error('Unknown event field');walk(val,depth+1);}
 }
 for(const row of rows){
  if(!row||Object.keys(row).some(k=>!['sequence','elapsedMs','data'].includes(k))||!Number.isInteger(row.sequence)||row.sequence<0||!Number.isFinite(row.elapsedMs)||row.elapsedMs<0||row.elapsedMs>1e10)throw Error('Invalid event envelope');
  if(!row.data||Object.keys(row.data).length!==1)throw Error('Invalid event data');
  if(row.data.event){if(!eventTypes.has(row.data.event.type))throw Error('Invalid event type');walk(row.data.event);}
  else if(row.data.decision){if(!actionTypes.has(row.data.decision.type))throw Error('Invalid action type');walk(row.data.decision);}
  else throw Error('Invalid event data');
 }
 return rows;
}
