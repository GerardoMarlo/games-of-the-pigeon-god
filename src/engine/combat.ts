import { equal, neighbors, type HexCoordinate } from './hex';
import { empty } from './movement';
import { rollD6 } from './rng';
import { RULES } from './rules';
import type { CombatState, GameAction, GameState, PlayerState } from './types';

export function attackHits(dice:readonly number[],arena:1|2):number {
  return dice.reduce((sum,die)=>sum+(die<4?0:die===6 && arena===2?2:1),0);
}
export function rollResult(attack:readonly number[],dodge:readonly number[],arena:1|2) {
  const dodges=dodge.filter(d=>d>=5).length;
  return {incoming:Math.max(0,attackHits(attack,arena)-dodges),counter:dodge.filter(d=>d===6).length,dodges};
}
export function combatActor(state:GameState):string {
  const c=state.combat;
  return c?.stage==='DODGE'?c.defenderId:c?.stage==='PUSHBACK'?c.winnerId!:state.activePlayerId;
}
function roll(state:GameState,playerId:string,kind:'ATTACK'|'DODGE'):number[] {
  const p=state.players[playerId],card=p.draftedRats.find(r=>r.id===p.currentRat.ratId)!;
  const dice=Array.from({length:kind==='ATTACK'?card.attackDice:card.speed},()=>rollD6(state.rng));
  state.eventLog.push({type:'ROLL',playerId,kind,dice:[...dice]});return dice;
}
export function startCombat(state:GameState,defenderId:string,sourceHex:HexCoordinate,destinationHex:HexCoordinate,remaining:number):void {
  const attackerId=state.activePlayerId;
  state.combat={attackerId,defenderId,sourceHex,destinationHex,movementRemaining:remaining,stage:defenderId==='cat'?'CAT_PENDING':'ATTACK',attackerRoll:[],defenderRoll:[],attackerConfirmed:false,defenderConfirmed:false,attackerDamage:0,defenderDamage:0};
  delete state.movement;
  state.phase='COMBAT';state.eventLog.push({type:'COMBAT_TRIGGERED',attackerId,defenderId},{type:'PHASE_CHANGED',phase:'COMBAT'});
  if(defenderId!=='cat')state.combat.attackerRoll=roll(state,attackerId,'ATTACK');
}
export function pushbackHexes(state:GameState):HexCoordinate[] {
  const c=state.combat;
  if(!c || c.stage!=='PUSHBACK')return [];
  // Attacker is still at source until capture: source is occupied, never a push destination.
  return neighbors(c.destinationHex).filter(h=>empty(state,h));
}
export function combatActions(state:GameState,playerId:string):GameAction[] {
  const c=state.combat;
  if(state.phase!=='COMBAT'||!c||c.stage==='CAT_PENDING'||playerId!==combatActor(state))return [];
  if(c.stage==='PUSHBACK')return pushbackHexes(state).map(destination=>({type:'SELECT_PUSHBACK',playerId,destination}));
  const actions:GameAction[]=[{type:c.stage==='ATTACK'?'CONFIRM_ATTACK':'CONFIRM_DODGE',playerId}];
  if(state.players[playerId].fervor>0)(c.stage==='ATTACK'?c.attackerRoll:c.defenderRoll).forEach((_,dieIndex)=>actions.push({type:'SPEND_FERVOR',playerId,dieIndex}));
  return actions;
}
function fervor(state:GameState,p:PlayerState,amount:number,reason:string):void {
  if(!amount)return;p.fervor+=amount;state.eventLog.push({type:'FERVOR_CHANGED',playerId:p.id,amount,reason});
}
function tracker(state:GameState,p:PlayerState,kind:'attacks'|'dodges'|'finishes',amount:number):void {
  if(!amount)return;
  const before=p[kind];p[kind]+=amount;state.eventLog.push({type:'TRACKER_CHANGED',playerId:p.id,tracker:kind,amount});
  const milestones=kind==='attacks'?RULES.attackFervorMilestones:kind==='dodges'?RULES.dodgeFervorMilestones:[RULES.finishFervorMilestone];
  for(const threshold of milestones)if(before<threshold && p[kind]>=threshold)fervor(state,p,1,`${kind} milestone ${threshold}`);
  if(kind==='finishes' && before<RULES.finishFavorMilestone && p.finishes>=RULES.finishFavorMilestone){p.divineFavor++;state.eventLog.push({type:'FAVOR_CHANGED',playerId:p.id,amount:1});}
}
function displace(state:GameState,playerId:string,to:HexCoordinate,reason:'pushback'|'retreat'|'capture'):void {
  state.players[playerId].currentRat.position={...to};state.eventLog.push({type:'DISPLACED',playerId,to:{...to},reason});
}
function complete(state:GameState,c:CombatState):void {
  delete state.combat;
  const living=Object.values(state.players).filter(p=>p.currentRat.alive);
  if(living.length<=1){state.phase='ARENA_END';state.arenaWinnerId=living[0]?.id;delete state.movement;state.eventLog.push({type:'ARENA_ENDED',winnerId:living[0]?.id},{type:'PHASE_CHANGED',phase:'ARENA_END'});return;}
  if(state.players[c.attackerId].currentRat.alive && c.movementRemaining>0)state.movement={playerId:c.attackerId,remaining:c.movementRemaining};
  state.phase='PLAYER_ACTION';state.eventLog.push({type:'PHASE_CHANGED',phase:'PLAYER_ACTION'});
}
function resolve(state:GameState,c:CombatState):void {
  const attacker=state.players[c.attackerId],defender=state.players[c.defenderId];
  const result=rollResult(c.attackerRoll,c.defenderRoll,state.arenaNumber);
  c.attackerDamage=RULES.capDamageToHealth?Math.min(defender.currentRat.health,result.incoming):result.incoming;
  c.defenderDamage=RULES.capDamageToHealth?Math.min(attacker.currentRat.health,result.counter):result.counter;
  // Compute both damages first; neither death can suppress the other damage or Finish.
  attacker.currentRat.health=Math.max(0,attacker.currentRat.health-c.defenderDamage);
  defender.currentRat.health=Math.max(0,defender.currentRat.health-c.attackerDamage);
  state.eventLog.push({type:'DAMAGE',sourceId:attacker.id,targetId:defender.id,amount:c.attackerDamage},{type:'DAMAGE',sourceId:defender.id,targetId:attacker.id,amount:c.defenderDamage});
  tracker(state,attacker,'attacks',c.attackerDamage);tracker(state,defender,'attacks',c.defenderDamage);tracker(state,defender,'dodges',result.dodges);
  fervor(state,attacker,c.defenderDamage*RULES.fervorPerHealthLost,'Health lost');fervor(state,defender,c.attackerDamage*RULES.fervorPerHealthLost,'Health lost');
  for(const [victim,killer] of [[attacker,defender],[defender,attacker]])if(victim.currentRat.health===0){victim.currentRat.alive=false;victim.eliminated=true;victim.eliminationRound=state.roundNumber;victim.actionsRemaining=0;state.eventLog.push({type:'RAT_FINISHED',playerId:victim.id,sourceId:killer.id});}
  // Rulebook §53: active player's simultaneous rewards resolve first.
  if(!defender.currentRat.alive)tracker(state,attacker,'finishes',1);
  if(!attacker.currentRat.alive)tracker(state,defender,'finishes',1);
  c.winnerId=c.attackerDamage>c.defenderDamage?attacker.id:defender.id;
  state.eventLog.push({type:'COMBAT_RESOLVED',attackerDamage:c.attackerDamage,defenderDamage:c.defenderDamage,winnerId:c.winnerId});
  if(attacker.currentRat.alive && !defender.currentRat.alive)displace(state,attacker.id,c.destinationHex,'capture');
  else if(attacker.currentRat.alive && defender.currentRat.alive){
    if(c.winnerId===attacker.id){c.stage='PUSHBACK';if(pushbackHexes(state).length)return;}
    displace(state,attacker.id,c.sourceHex,'retreat');
  }
  complete(state,c);
}
export function applyCombatAction(state:GameState,action:GameAction):void {
  const c=state.combat;
  const legal=combatActions(state,action.playerId).some(a=>a.type===action.type && (a.type!=='SPEND_FERVOR'||action.type==='SPEND_FERVOR'&&a.dieIndex===action.dieIndex) && (a.type!=='SELECT_PUSHBACK'||action.type==='SELECT_PUSHBACK'&&equal(a.destination,action.destination)));
  if(!c||!legal)throw new Error('Illegal combat action');
  if(action.type==='SPEND_FERVOR'){
    const dice=c.stage==='ATTACK'?c.attackerRoll:c.defenderRoll,kind=c.stage==='ATTACK'?'ATTACK':'DODGE',before=dice[action.dieIndex];
    fervor(state,state.players[action.playerId],-1,'Reroll');dice[action.dieIndex]=rollD6(state.rng);
    state.eventLog.push({type:'REROLL',playerId:action.playerId,kind,index:action.dieIndex,before,after:dice[action.dieIndex]});
  }else if(action.type==='CONFIRM_ATTACK'){
    c.attackerConfirmed=true;c.stage='DODGE';state.eventLog.push({type:'ROLL_CONFIRMED',playerId:action.playerId,kind:'ATTACK'});c.defenderRoll=roll(state,c.defenderId,'DODGE');
  }else if(action.type==='CONFIRM_DODGE'){
    c.defenderConfirmed=true;state.eventLog.push({type:'ROLL_CONFIRMED',playerId:action.playerId,kind:'DODGE'});resolve(state,c);
  }else if(action.type==='SELECT_PUSHBACK'){
    displace(state,c.defenderId,action.destination,'pushback');displace(state,c.attackerId,c.destinationHex,'capture');complete(state,c);
  }
}
