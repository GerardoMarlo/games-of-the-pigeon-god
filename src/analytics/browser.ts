import {createMetrics} from './collector';
import versions from './version.json';
import {queue,flush} from '../persistence/profile';
import type {createController} from '../controller';
import type {GameEvent} from '../engine/types';
type Controller=ReturnType<typeof createController>;
const sessions=new WeakMap<Controller,ReturnType<typeof build>>();
function build(c:Controller,owner:string){
 const id=crypto.randomUUID(),started=Date.now(),metrics=createMetrics();let cursor=0,decisionCursor=0,batch=0,rawSequence=0,finished=false;
 let serial=Promise.resolve();
 const write=(suffix:string,order:string,body:unknown)=>{serial=serial.then(()=>queue({key:id+':'+order,owner,path:'/matches/'+id+suffix,body,created:started}));};
 const state=c.getState();
 write('','0000',{seed:state.rng.seed,playerCount:state.seatOrder.length,mode:state.mode??'local',...versions});
 function capture(){
  const state=c.getState(),events=state.eventLog.slice(cursor),elapsedMs=Date.now()-started;
  metrics.consume(events,elapsedMs);cursor=state.eventLog.length;
  const records:{sequence:number;elapsedMs:number;data:unknown}[]=[];
  for(const event of events){
   if(event.type==='CONTENT')continue;
   const clean={...event} as GameEvent&{name?:string};delete clean.name;
   records.push({sequence:rawSequence++,elapsedMs,data:{event:clean}});
  }
  const decisions=c.getDecisions();for(const d of decisions.slice(decisionCursor))records.push({sequence:rawSequence++,elapsedMs,data:{decision:d}});decisionCursor=decisions.length;
  // Keep uploads small, including automatic transitions with many events.
  let part:typeof records=[],bytes=2;
  const save=()=>{if(!part.length)return;write('/events/'+batch,String(batch+1).padStart(5,'0'),part);batch++;part=[];bytes=2;};
  for(const row of records){const size=JSON.stringify(row).length*3;if(bytes+size>48000||part.length>=80)save();part.push(row);bytes+=size;}save();
  if(state.phase==='MATCH_END'&&!finished){finished=true;write('/complete','99999',{...metrics.report(state),durationMs:elapsedMs});}
 }
 return {owner,capture,async sync(){await serial;return flush(owner);}};
}
export function trackController(c:Controller,owner:string,status:(message:string)=>void){
 let session=sessions.get(c);if(!session||session.owner!==owner){session=build(c,owner);sessions.set(c,session);}
 let active=true;
 const sync=()=>{void session!.sync().then(ok=>{if(active)status(ok?'Statistics synced':'Statistics pending');}).catch(()=>{if(active)status('Statistics could not sync; device storage may be unavailable');});};
 const capture=()=>{session!.capture();status('Statistics pending');if(c.getState().phase==='MATCH_END')sync();};
 capture();const unsubscribe=c.subscribe(capture);sync();
 const timer=setInterval(sync,15000);window.addEventListener('online',sync);
 return ()=>{active=false;unsubscribe();clearInterval(timer);window.removeEventListener('online',sync);};
}
