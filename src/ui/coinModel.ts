import type { GameEvent } from '../engine/types';
export interface ResourceToken { id:string; face:'health'|'fervor'|'spent'; extra:boolean }
// Presentation convention: spend bonus tokens first, then flipped Health tokens.
// This does not decide spending or mutate the engine's resources.
export function resourceTokens(maxHealth:number,health:number,fervor:number,events:readonly GameEvent[],playerId:string):ResourceToken[] {
 const base:ResourceToken[]=Array.from({length:maxHealth},(_,i)=>({id:`health-${i}`,face:i<health?'health':'spent',extra:false}));
 let bonus=0;
 for(const e of events){
  if(e.type==='ARENA_STARTED'||e.type==='DUEL_STARTED')bonus=0;
  if(e.type==='FERVOR_CHANGED'&&e.playerId===playerId){
   if(e.amount>0&&e.reason!=='Health lost')bonus+=e.amount;
   else if(e.amount<0)bonus=Math.max(0,bonus+e.amount);
  }
 }
 bonus=Math.min(bonus,fervor);
 const converted=Math.min(maxHealth-health,fervor-bonus);
 base.forEach((t,i)=>{if(i>=health&&i<health+converted)t.face='fervor';});
 // Reconciliation supports old snapshots without a complete event history.
 const extras=fervor-converted;
 return [...base,...Array.from({length:extras},(_,i):ResourceToken=>({id:`bonus-${i}`,face:'fervor',extra:true}))];
}
