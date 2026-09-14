import type { CombatState,GameState } from '../engine/types';
export const ROLL_ANIMATION_MS=650;
export const COMBAT_RESULT_MS=3000;
export function humanCombat(state:GameState,c:CombatState|undefined):boolean{return !!c&&[c.attackerId,c.defenderId].some(id=>state.players[id]?.controller==='human');}
// Reconstruct presentation from engine events, including rolls already auto-confirmed.
export function combatRecord(state:GameState,end=state.eventLog.length):CombatState|undefined{
 const events=state.eventLog.slice(0,end);const start=events.map(e=>e.type).lastIndexOf('COMBAT_TRIGGERED');
 const trigger=events[start];if(!trigger||trigger.type!=='COMBAT_TRIGGERED')return;
 const c:CombatState={attackerId:trigger.attackerId,defenderId:trigger.defenderId,sourceHex:{q:0,r:0},destinationHex:{q:0,r:0},stage:'ATTACK',attackerRoll:[],defenderRoll:[],attackerConfirmed:false,defenderConfirmed:false,attackerDamage:0,defenderDamage:0};
 for(const e of events.slice(start+1)){
  if(e.type==='ROLL'){if(e.kind==='ATTACK')c.attackerRoll=[...e.dice];else c.defenderRoll=[...e.dice];}
  if(e.type==='REROLL')(e.kind==='ATTACK'?c.attackerRoll:c.defenderRoll)[e.index]=e.after;
  if(e.type==='ROLL_CONFIRMED'){if(e.kind==='ATTACK')c.attackerConfirmed=true;else c.defenderConfirmed=true;}
  if(e.type==='COMBAT_RESOLVED'){Object.assign(c,e);c.stage='AFTER_DAMAGE';}
 }
 return c;
}
export function diceStyle(value:number,kind:'ATTACK'|'DODGE',arena:1|2,reroll:boolean){return [value>=(kind==='ATTACK'?4:5)?'die-success':'',value===6&&(kind==='DODGE'||arena===2)?'die-six':'',reroll?'die-ember':''].filter(Boolean).join(' ');}

export interface RollingDice {kind:'ATTACK'|'DODGE';indices:number[]}
export function rollingDice(events:GameState['eventLog']):RollingDice|undefined{
 const e=[...events].reverse().find(e=>e.type==='ROLL'||e.type==='REROLL');
 if(e?.type==='ROLL')return {kind:e.kind,indices:e.dice.map((_,i)=>i)};
 if(e?.type==='REROLL')return {kind:e.kind,indices:[e.index]};
}
