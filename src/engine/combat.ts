import { ability } from './content/state';
import { combatRewards,diceBonus } from './content/abilities';
import { claimDecrees } from './content/decrees';
import { resumeEffects } from './content/effects';
import { finishCatStep } from './cat';
import { isBurrow } from './burrows';
import { checkEliminationEnd } from './lifecycle';
import { respawnCat } from './cat';
import { endTurn, grantActions } from './turns';
import { distance, equal, key, neighbors, type HexCoordinate } from './hex';
import { empty,occupant } from './movement';
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
  if(c?.stage==='CAT_RETREAT')return c.catPushWinnerId!;
  return c&&['ATTACK_RESPONSE','BEFORE_DODGE'].includes(c.stage)?c.defenderId:c?.stage==='DODGE'?c.defenderId:c?.stage==='PUSHBACK'?(c.winnerId==='cat'?state.activePlayerId:c.winnerId!):state.activePlayerId;
}
function roll(state:GameState,playerId:string,kind:'ATTACK'|'DODGE'):number[] {
  const p=state.players[playerId],card=p?.draftedRats.find(r=>r.id===p.currentRat.ratId);
  const base=playerId==='cat'?RULES.catAttackDice:kind==='ATTACK'?card!.attackDice:card!.speed;
  const count=Math.max(0,base+(state.content&&playerId!=='cat'?diceBonus(state,playerId,kind):0));
  const dice=Array.from({length:count},()=>rollD6(state.rng));
  state.eventLog.push({type:'ROLL',playerId,kind,dice:[...dice]});return dice;
}
export function startCombat(state:GameState,defenderId:string,sourceHex:HexCoordinate,destinationHex:HexCoordinate,options?:{origin:'cat_turn'|'cat_respawn'|'cat_push';resume:'actions'|'end_turn';direction?:HexCoordinate;catCreditPlayerId?:string;catPushWinnerId?:string}):void {
  const attackerId=options?'cat':state.activePlayerId;
  state.combat={attackerId,defenderId,sourceHex,destinationHex,stage:'ATTACK',attackerRoll:[],defenderRoll:[],attackerConfirmed:false,defenderConfirmed:false,attackerDamage:0,defenderDamage:0,origin:options?.origin??'rat_move',resume:options?.resume??'end_turn',direction:options?.direction,catCreditPlayerId:options?.catCreditPlayerId,catPushWinnerId:options?.catPushWinnerId};
  if(!options)state.players[attackerId].actionsRemaining=Math.max(0,state.players[attackerId].actionsRemaining-1);
  state.phase='COMBAT';state.eventLog.push({type:'COMBAT_TRIGGERED',attackerId,defenderId},{type:'PHASE_CHANGED',phase:'COMBAT'});
  if(state.content){state.content.combat={attackDice:0,dodgeDice:0,cancelHits:0,cancelAttack:false,attackAbilityUsed:false,dodgeAbilityUsed:false};state.combat.stage='BEFORE_ATTACK';return;}
  state.combat.attackerRoll=roll(state,attackerId,'ATTACK');
  if(attackerId==='cat'){
    state.combat.attackerConfirmed=true;state.combat.stage='DODGE';
    state.eventLog.push({type:'ROLL_CONFIRMED',playerId:'cat',kind:'ATTACK'});
    state.combat.defenderRoll=roll(state,defenderId,'DODGE');
  }
}
export function pushbackHexes(state:GameState):HexCoordinate[] {
  const c=state.combat;
  if(!c || !['PUSHBACK','CAT_RETREAT'].includes(c.stage))return [];
  if(c.stage==='CAT_RETREAT')return neighbors(c.destinationHex).filter(h=>empty(state,h));
  // Attacker is still at source until capture: source is occupied, never a push destination.
  return neighbors(c.destinationHex).filter(h=>catPushTarget(state,h)||empty(state,h)||(c.attackerId==='cat'&&c.winnerId!== 'cat'&&!state.cat.offBoard&&equal(h,state.cat.position)));
}
// A defeated Cat can be pushed onto an adjacent rival to start another combat.
function catPushTarget(state:GameState,h:HexCoordinate):boolean {
 const c=state.combat!;if(c.winnerId==='cat'||![c.attackerId,c.defenderId].includes('cat'))return false;
 const id=occupant(state,h);if(!id||id==='cat'||id===c.winnerId)return false;
 const tile=state.board.hexes[key(h)];
 return !!tile&&!isBurrow(state,h)&&!['rock','crate','sewer'].includes(tile.terrain);
}
export function combatActions(state:GameState,playerId:string):GameAction[] {
  const c=state.combat;
  if(state.phase!=='COMBAT'||!c||playerId!==combatActor(state))return [];
  if(c.stage==='BEFORE_ATTACK')return [{type:'ROLL_ATTACK',playerId}];
  if(c.stage==='ATTACK_RESPONSE')return [{type:'ACCEPT_ATTACK',playerId}];
  if(c.stage==='BEFORE_DODGE')return [{type:'ROLL_DODGE',playerId}];
  if(c.stage==='AFTER_DAMAGE')return [{type:'RESOLVE_COMBAT',playerId}];
  if(c.stage==='PUSHBACK'||c.stage==='CAT_RETREAT')return pushbackHexes(state).map(destination=>({type:'SELECT_PUSHBACK',playerId,destination}));
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
  if(!state.finalDuel&&kind==='finishes' && before<RULES.finishFavorMilestone && p.finishes>=RULES.finishFavorMilestone){p.divineFavor++;state.eventLog.push({type:'FAVOR_CHANGED',playerId:p.id,amount:1});}
}
function displace(state:GameState,playerId:string,to:HexCoordinate,reason:'pushback'|'retreat'|'capture'):void {
  if(playerId==='cat'){state.cat.position={...to};state.cat.offBoard=false;}else {state.players[playerId].currentRat.position={...to};state.players[playerId].currentRat.inBurrow=isBurrow(state,to);if(isBurrow(state,to)&&reason==='pushback')state.players[playerId].currentRat.forcedBurrow=true;}state.eventLog.push({type:'DISPLACED',playerId,to:{...to},reason});
}
function complete(state:GameState,c:CombatState):void {
  delete state.combat;
  const ended=checkEliminationEnd(state);
  if(!state.finalDuel&&!state.cat.alive && respawnCat(state,true,c.resume??'end_turn',ended,c.catCreditPlayerId))return;
  if(ended)return;
  if(state.content){
    delete state.content.combat;
    state.content.resume=c.resume==='actions'?'actions':'end_turn';state.content.combatRetreat=c.origin==='rat_move'&&isBurrow(state,c.sourceHex);
    if(c.resume==='actions'&&!state.content.effects.length){finishCatStep(state);return;}
    resumeEffects(state);return;
  }
  if(c.resume==='actions')grantActions(state);else endTurn(state,c.origin==='rat_move'&&isBurrow(state,c.sourceHex));
}
function health(state:GameState,id:string):number {return id==='cat'?state.cat.health:state.players[id].currentRat.health;}
function alive(state:GameState,id:string):boolean {return id==='cat'?state.cat.alive:state.players[id].currentRat.alive;}
function damage(state:GameState,sourceId:string,targetId:string,amount:number):void {
  if(targetId==='cat')state.cat.health=Math.max(0,state.cat.health-amount);
  else state.players[targetId].currentRat.health=Math.max(0,state.players[targetId].currentRat.health-amount);
  state.eventLog.push({type:'DAMAGE',sourceId,targetId,amount,healthRemaining:health(state,targetId)});
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
  const result=rollResult(c.attackerRoll,c.defenderRoll,state.finalDuel?1:state.arenaNumber);
  if(state.content){
    const ctx=state.content.combat!;
    const hits=ability(state,c.attackerId)==='twins_three'&&new Set(c.attackerRoll).size<c.attackerRoll.length?3:attackHits(c.attackerRoll,state.finalDuel?1:state.arenaNumber);
    const sixes=c.defenderRoll.filter(d=>d===6).length;
    result.incoming=ctx.cancelAttack?0:Math.max(0,hits-result.dodges-(ability(state,c.defenderId)==='double_cancel'?sixes:0)-ctx.cancelHits);
    result.counter=sixes*(ability(state,c.defenderId)==='double_counter'?2:1);
    if(sixes&&state.content.players[c.defenderId]?.brasa){result.counter++;state.content.players[c.defenderId].brasa=false;}
  }
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
  if(state.content){combatRewards(state);claimDecrees(state,'immediate');if(Object.values(state.players).filter(p=>p.currentRat.alive).length<=1){complete(state,c);return;}c.stage='AFTER_DAMAGE';return;}
  finishDisplacement(state,c);
}
// Owner correction: a surrounded chained-combat defender goes to Cat spawn.
function sendDefenderToSpawn(state:GameState,c:CombatState):void {
 const spawn=state.cat.spawnPosition;
 const nearestEmpty=()=>Object.values(state.board.hexes).map(h=>h.coordinate).filter(h=>empty(state,h)).sort((a,b)=>distance(a,spawn)-distance(b,spawn)||a.q-b.q||a.r-b.r)[0];
 // TODO owner ruling for occupied spawn: isolated collision policy, never overlap entities.
 if(equal(spawn,c.destinationHex)){
   const retreat=nearestEmpty();if(!retreat)throw new Error('No space for Cat spawn fallback');
   displace(state,'cat',retreat,'retreat');
 }else{
   const blocker=occupant(state,spawn);
   if(blocker&&blocker!=='cat'){
     const relocation=nearestEmpty();if(!relocation)throw new Error('No space for Cat spawn fallback');
     displace(state,blocker,relocation,'pushback');
     state.eventLog.push({type:'CONTENT',message:`Occupied Cat spawn: ${blocker.toUpperCase()} relocates to the nearest empty hex (provisional collision rule).`});
   }
   displace(state,c.defenderId,spawn,'pushback');displace(state,'cat',c.destinationHex,'capture');
 }
 state.eventLog.push({type:'CONTENT',message:`${c.defenderId.toUpperCase()} is sent to the Cat spawn because no adjacent pushback hex is available.`});
}
function finishDisplacement(state:GameState,c:CombatState):void {
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
        else if(c.origin==='cat_push'&&!neighbors(c.destinationHex).some(h=>empty(state,h))){sendDefenderToSpawn(state,c);}
        else if(c.origin==='cat_push'&&!empty(state,c.sourceHex)){c.stage='CAT_RETREAT';return;}
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
  if(action.type==='ROLL_ATTACK'){
    c.attackerRoll=roll(state,c.attackerId,'ATTACK');c.stage=c.attackerId==='cat'?'ATTACK_RESPONSE':'ATTACK';c.attackerConfirmed=c.attackerId==='cat';
  }else if(action.type==='ACCEPT_ATTACK'){c.stage='BEFORE_DODGE';
  }else if(action.type==='ROLL_DODGE'){c.defenderRoll=roll(state,c.defenderId,'DODGE');c.stage='DODGE';
  }else if(action.type==='RESOLVE_COMBAT'){finishDisplacement(state,c);
  }else if(action.type==='SPEND_FERVOR'){
    const dice=c.stage==='ATTACK'?c.attackerRoll:c.defenderRoll,kind=c.stage==='ATTACK'?'ATTACK':'DODGE',before=dice[action.dieIndex];
    fervor(state,state.players[action.playerId],-1,'Reroll');dice[action.dieIndex]=rollD6(state.rng);
    state.eventLog.push({type:'REROLL',playerId:action.playerId,kind,index:action.dieIndex,before,after:dice[action.dieIndex]});
  }else if(action.type==='CONFIRM_ATTACK'){
    c.attackerConfirmed=true;c.stage='DODGE';state.eventLog.push({type:'ROLL_CONFIRMED',playerId:action.playerId,kind:'ATTACK'});if(c.defenderId==='cat'){c.defenderConfirmed=true;resolve(state,c);}else if(state.content)c.stage='ATTACK_RESPONSE';else c.defenderRoll=roll(state,c.defenderId,'DODGE');
  }else if(action.type==='CONFIRM_DODGE'){
    c.defenderConfirmed=true;state.eventLog.push({type:'ROLL_CONFIRMED',playerId:action.playerId,kind:'DODGE'});resolve(state,c);
  }else if(action.type==='SELECT_PUSHBACK'){
    if(c.stage==='CAT_RETREAT'){displace(state,'cat',action.destination,'retreat');complete(state,c);return;}
    const target=catPushTarget(state,action.destination)?occupant(state,action.destination):undefined;
    if(target){
      const source={...c.destinationHex};
      if(c.attackerId!=='cat')displace(state,c.attackerId,c.destinationHex,'capture');
      state.cat.position={...action.destination};state.cat.offBoard=true;
      state.eventLog.push({type:'CONTENT',message:`${action.playerId.toUpperCase()} pushes the Cat into ${target.toUpperCase()}: chained combat.`});
      startCombat(state,target,source,action.destination,{origin:'cat_push',resume:c.resume??'end_turn',direction:{q:action.destination.q-source.q,r:action.destination.r-source.r},catCreditPlayerId:c.catCreditPlayerId,catPushWinnerId:action.playerId});
      return;
    }

    if(c.attackerId==='cat'&&c.winnerId!== 'cat')displace(state,'cat',action.destination,'pushback');
    else {displace(state,c.defenderId,action.destination,'pushback');displace(state,c.attackerId,c.destinationHex,'capture');}
    complete(state,c);
  }
}
