import { respawnCat } from './cat';
import { endTurn, grantActions } from './turns';
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
  return c?.stage==='DODGE'?c.defenderId:c?.stage==='PUSHBACK'?(c.winnerId==='cat'?state.activePlayerId:c.winnerId!):state.activePlayerId;
}
function roll(state:GameState,playerId:string,kind:'ATTACK'|'DODGE'):number[] {
  const p=state.players[playerId],card=p?.draftedRats.find(r=>r.id===p.currentRat.ratId);
  const count=playerId==='cat'?RULES.catAttackDice:kind==='ATTACK'?card!.attackDice:card!.speed;
  const dice=Array.from({length:count},()=>rollD6(state.rng));
  state.eventLog.push({type:'ROLL',playerId,kind,dice:[...dice]});return dice;
}
export function startCombat(state:GameState,defenderId:string,sourceHex:HexCoordinate,destinationHex:HexCoordinate,options?:{origin:'cat_turn'|'cat_respawn';resume:'actions'|'end_turn';direction?:HexCoordinate;catCreditPlayerId?:string}):void {
  const attackerId=options?'cat':state.activePlayerId;
  state.combat={attackerId,defenderId,sourceHex,destinationHex,stage:'ATTACK',attackerRoll:[],defenderRoll:[],attackerConfirmed:false,defenderConfirmed:false,attackerDamage:0,defenderDamage:0,origin:options?.origin??'rat_move',resume:options?.resume??'end_turn',direction:options?.direction,catCreditPlayerId:options?.catCreditPlayerId};
  if(!options)state.players[attackerId].actionsRemaining=0;
  state.phase='COMBAT';state.eventLog.push({type:'COMBAT_TRIGGERED',attackerId,defenderId},{type:'PHASE_CHANGED',phase:'COMBAT'});
  state.combat.attackerRoll=roll(state,attackerId,'ATTACK');
  if(attackerId==='cat'){
    state.combat.attackerConfirmed=true;state.combat.stage='DODGE';
    state.eventLog.push({type:'ROLL_CONFIRMED',playerId:'cat',kind:'ATTACK'});
    state.combat.defenderRoll=roll(state,defenderId,'DODGE');
  }
}
export function pushbackHexes(state:GameState):HexCoordinate[] {
  const c=state.combat;
  if(!c || c.stage!=='PUSHBACK')return [];
  // Attacker is still at source until capture: source is occupied, never a push destination.
  return neighbors(c.destinationHex).filter(h=>empty(state,h)||(c.attackerId==='cat'&&c.winnerId!== 'cat'&&!state.cat.offBoard&&equal(h,state.cat.position)));
}
export function combatActions(state:GameState,playerId:string):GameAction[] {
  const c=state.combat;
  if(state.phase!=='COMBAT'||!c||playerId!==combatActor(state))return [];
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
  if(playerId==='cat'){state.cat.position={...to};state.cat.offBoard=false;}else state.players[playerId].currentRat.position={...to};state.eventLog.push({type:'DISPLACED',playerId,to:{...to},reason});
}
function arenaEnded(state:GameState):boolean {
  const living=Object.values(state.players).filter(p=>p.currentRat.alive);
  if(living.length>1)return false;
  state.phase='ARENA_END';state.arenaWinnerId=living[0]?.id;
  state.eventLog.push({type:'ARENA_ENDED',winnerId:living[0]?.id},{type:'PHASE_CHANGED',phase:'ARENA_END'});return true;
}
function complete(state:GameState,c:CombatState):void {
  delete state.combat;
  const ended=arenaEnded(state);
  if(!state.cat.alive && respawnCat(state,true,c.resume??'end_turn',ended,c.catCreditPlayerId))return;
  if(ended)return;
  if(c.resume==='actions')grantActions(state);else endTurn(state);
}
function health(state:GameState,id:string):number {return id==='cat'?state.cat.health:state.players[id].currentRat.health;}
function alive(state:GameState,id:string):boolean {return id==='cat'?state.cat.alive:state.players[id].currentRat.alive;}
function damage(state:GameState,sourceId:string,targetId:string,amount:number):void {
  if(targetId==='cat')state.cat.health=Math.max(0,state.cat.health-amount);
  else state.players[targetId].currentRat.health=Math.max(0,state.players[targetId].currentRat.health-amount);
  state.eventLog.push({type:'DAMAGE',sourceId,targetId,amount});
}
function finish(state:GameState,victimId:string,killerId:string):void {
  if(health(state,victimId)>0)return;
  if(victimId==='cat'){state.cat.alive=false;state.cat.offBoard=true;state.eventLog.push({type:'CAT_FINISHED',sourceId:killerId});}
  else {
    const victim=state.players[victimId];victim.currentRat.alive=false;victim.eliminated=true;victim.eliminationRound=state.roundNumber;victim.actionsRemaining=0;
    state.eventLog.push({type:'RAT_FINISHED',playerId:victimId,sourceId:killerId});
    const credit=state.combat?.catCreditPlayerId;
    if(killerId==='cat' && credit && victimId!==credit){
      state.players[credit].divineFavor++;state.eventLog.push({type:'FAVOR_CHANGED',playerId:credit,amount:1});
    }
  }
}
function resolve(state:GameState,c:CombatState):void {
  const result=rollResult(c.attackerRoll,c.defenderRoll,state.arenaNumber);
  c.attackerDamage=RULES.capDamageToHealth?Math.min(health(state,c.defenderId),result.incoming):result.incoming;
  c.defenderDamage=RULES.capDamageToHealth?Math.min(health(state,c.attackerId),result.counter):result.counter;
  // Both values are computed before either participant loses Health.
  damage(state,c.attackerId,c.defenderId,c.attackerDamage);damage(state,c.defenderId,c.attackerId,c.defenderDamage);
  const attacker=state.players[c.attackerId],defender=state.players[c.defenderId];
  if(attacker){tracker(state,attacker,'attacks',c.attackerDamage);fervor(state,attacker,c.defenderDamage*RULES.fervorPerHealthLost,'Health lost');}
  if(defender){tracker(state,defender,'attacks',c.defenderDamage);tracker(state,defender,'dodges',result.dodges);fervor(state,defender,c.attackerDamage*RULES.fervorPerHealthLost,'Health lost');}
  finish(state,c.attackerId,c.defenderId);finish(state,c.defenderId,c.attackerId);
  if(attacker&&!alive(state,c.defenderId))tracker(state,attacker,'finishes',1);
  if(defender&&!alive(state,c.attackerId))tracker(state,defender,'finishes',1);
  c.winnerId=c.attackerDamage>c.defenderDamage?c.attackerId:c.defenderId;
  state.eventLog.push({type:'COMBAT_RESOLVED',attackerDamage:c.attackerDamage,defenderDamage:c.defenderDamage,winnerId:c.winnerId});
  if(alive(state,c.attackerId)&&!alive(state,c.defenderId))displace(state,c.attackerId,c.destinationHex,'capture');
  else if(alive(state,c.attackerId)&&alive(state,c.defenderId)){
    if(c.winnerId===c.attackerId){
      if(c.attackerId==='cat'&&c.origin==='cat_respawn'){
        c.stage='PUSHBACK';return;
      }else if(c.attackerId==='cat'){
        // Cat Turn movement pushes forward, never swaps on a blocked forward hex.
        const d=c.direction??{q:c.destinationHex.q-c.sourceHex.q,r:c.destinationHex.r-c.sourceHex.r};
        const to={q:c.destinationHex.q+d.q,r:c.destinationHex.r+d.r};
        if(empty(state,to)){displace(state,c.defenderId,to,'pushback');displace(state,'cat',c.destinationHex,'capture');}
        else displace(state,'cat',c.sourceHex,'retreat');
      }else{
        c.stage='PUSHBACK';if(pushbackHexes(state).length)return;
        displace(state,c.defenderId,c.sourceHex,'pushback');displace(state,c.attackerId,c.destinationHex,'capture');
      }
    }else if(c.attackerId==='cat'){c.stage='PUSHBACK';return;}else displace(state,c.attackerId,c.sourceHex,'retreat');
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
    c.attackerConfirmed=true;c.stage='DODGE';state.eventLog.push({type:'ROLL_CONFIRMED',playerId:action.playerId,kind:'ATTACK'});if(c.defenderId==='cat'){c.defenderConfirmed=true;resolve(state,c);}else c.defenderRoll=roll(state,c.defenderId,'DODGE');
  }else if(action.type==='CONFIRM_DODGE'){
    c.defenderConfirmed=true;state.eventLog.push({type:'ROLL_CONFIRMED',playerId:action.playerId,kind:'DODGE'});resolve(state,c);
  }else if(action.type==='SELECT_PUSHBACK'){
    if(c.attackerId==='cat'&&c.winnerId!== 'cat')displace(state,'cat',action.destination,'pushback');
    else {displace(state,c.defenderId,action.destination,'pushback');displace(state,c.attackerId,c.destinationHex,'capture');}
    complete(state,c);
  }
}
