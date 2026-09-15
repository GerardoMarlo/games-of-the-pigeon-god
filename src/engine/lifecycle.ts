import { observe } from './observation';
import { claimDecrees,restockDecrees } from './content/decrees';
import { resetContentArena } from './content/state';
import { beginPlacement } from './burrows';
import { generateArena } from '../content/arena';
import { carryCatToArena } from './cat';
import { key } from './hex';
import { RULES } from './rules';
import { beginTurn,phase } from './turns';
import type { ArenaResult,GameAction,GameState,PlayerState } from './types';

const rankKeys=['finishes','attacks','dodges'] as const;
function compare(a:PlayerState,b:PlayerState):number {
  for(const k of rankKeys)if(a[k]!==b[k])return b[k]-a[k];
  return b.currentRat.health-a.currentRat.health;
}
export function rankLiving(state:GameState):PlayerState[] {
  return Object.values(state.players).filter(p=>p.currentRat.alive).sort(compare);
}
export function awardFavor(state:GameState,playerId:string,amount:number,source:'arena'|'bet'='arena'):void {
  if(state.finalDuel)return;
  state.players[playerId].divineFavor+=amount;
  state.eventLog.push({type:'FAVOR_CHANGED',playerId,amount,source});
}
export function finishArena(state:GameState):void {
  if(state.arenaResults.some(r=>r.arenaNumber===state.arenaNumber))return;
  const ranked=rankLiving(state);
  const winner=ranked.length===1||ranked.length>1&&compare(ranked[0],ranked[1])!==0?ranked[0]:undefined;
  const reason:ArenaResult['reason']=ranked.length===0?'no_survivors':ranked.length===1?'last_survivor':winner?'round_limit':'unbroken_tie';
  state.arenaWinnerId=winner?.id;
  for(const p of Object.values(state.players))p.actionsRemaining=0;
  if(winner)awardFavor(state,winner.id,RULES.arenaWinnerFavor);
  claimDecrees(state,'end_of_arena');
  if(state.content){for(const [playerId,p] of Object.entries(state.content.players)){for(const cardId of p.items)state.eventLog.push({type:'ITEM_DISCARDED',playerId,cardId});state.content.itemDiscard.push(...p.items);p.items=[];p.brasa=false;}state.content.effects=[];delete state.content.combat;}
  for(const p of Object.values(state.players))if(winner&&p.betTargetPlayerId===winner.id)awardFavor(state,p.id,1,'bet');
  state.arenaResults.push({arenaNumber:state.arenaNumber,winnerId:winner?.id,reason,ranking:ranked.map(p=>p.id),favor:Object.fromEntries(Object.values(state.players).map(p=>[p.id,p.divineFavor]))});
  observe(state,'segment_end',reason);
  state.eventLog.push({type:'ARENA_ENDED',winnerId:winner?.id});phase(state,'ARENA_END');
}
function finishMatch(state:GameState,winnerId:string):void {
  state.winnerId=winnerId;if(state.finalDuel)observe(state,'segment_end','duel');delete state.combat;
  for(const p of Object.values(state.players))p.actionsRemaining=0;
  state.eventLog.push({type:'MATCH_ENDED',winnerId});phase(state,'MATCH_END');
}
export function checkEliminationEnd(state:GameState):boolean {
  const living=rankLiving(state);
  if(living.length>1)return false;
  if(state.finalDuel){
    if(living[0])finishMatch(state,living[0].id);
    else {observe(state,'segment_end','duel_restart');startDuel(state);}
  }else finishArena(state);
  return true;
}
function deploy(state:GameState,p:PlayerState,ratId:string,index:number):void {
  const card=p.draftedRats.find(r=>r.id===ratId);
  if(!card)throw new Error('Rat is not owned by this player');
  p.currentRat={ratId,ownerId:p.id,health:card.maxHealth,alive:true,position:{...(state.board.spawns[index]??state.board.catSpawn)},inBurrow:!!state.board.burrows?.some(b=>b.position.q===state.board.spawns[index]?.q&&b.position.r===state.board.spawns[index]?.r)||!state.board.hexes[key(state.board.spawns[index]??state.board.catSpawn)]};
  p.attacks=0;p.dodges=0;p.finishes=0;p.fervor=0;p.actionsRemaining=0;p.eliminated=false;
  delete p.eliminationRound;delete p.betTargetPlayerId;
}
export function arenaTwoOrder(state:GameState):string[] {
  const least=Math.min(...Object.values(state.players).map(p=>p.divineFavor));
  const first=[...state.turnOrder].reverse().find(id=>state.players[id].divineFavor===least)!;
  const index=state.seatOrder.indexOf(first);
  return [...state.seatOrder.slice(index),...state.seatOrder.slice(0,index)];
}
function startArenaTwo(state:GameState):void {
  resetContentArena(state);
  state.turnOrder=arenaTwoOrder(state);state.activePlayerId=state.turnOrder[0];
  // Arena 2 reuses every terrain and Burrow coordinate from Arena 1.
  state.board=structuredClone(state.board);
  for(const [i,id] of state.seatOrder.entries()){
    const p=state.players[id],reserved=p.draftedRats.find(r=>r.id!==p.currentRat.ratId)!;
    deploy(state,p,reserved.id,i);
  }
  state.arenaNumber=2;state.roundNumber=1;delete state.arenaWinnerId;delete state.combat;
  carryCatToArena(state);state.cat.alive=true;
  state.eventLog.push({type:'ARENA_STARTED',arenaNumber:2});observe(state,'segment_start');restockDecrees(state);phase(state,'ROUND_START');beginTurn(state);
}
function startDuel(state:GameState):void {
  resetContentArena(state);
  const duel=state.finalDuel!;duel.stage='combat';duel.attempt++;
  state.board=generateArena(state.rng,duel.participants.length);state.cat.alive=false;state.cat.offBoard=true;
  // Preserve clockwise relative order of tied seats, without revealing reserves.
  state.turnOrder=state.seatOrder.filter(id=>duel.participants.includes(id));
  for(const p of Object.values(state.players)){
    const index=state.turnOrder.indexOf(p.id);
    if(index>=0)deploy(state,p,duel.choices[p.id],index);
    else {p.eliminated=true;p.currentRat.alive=false;p.currentRat.health=0;p.actionsRemaining=0;}
  }
  state.roundNumber=1;state.activePlayerId=state.turnOrder[0];delete state.combat;
  state.eventLog.push({type:'DUEL_STARTED',attempt:duel.attempt});observe(state,'segment_start');beginPlacement(state);
}
export function pendingBettor(state:GameState):string|undefined {
 if(state.finalDuel||!['PLAYER_ACTION','CAT_MOVEMENT'].includes(state.phase))return;
 return state.seatOrder.find(id=>{const p=state.players[id];return p.eliminated&&p.eliminationRound!==undefined&&p.eliminationRound<=RULES.earlyBetLastRound&&!p.betTargetPlayerId&&Object.values(state.players).some(o=>o.id!==id&&o.currentRat.alive);});
}
export function lifecycleActions(state:GameState,playerId:string):GameAction[] {
  if(!state.players[playerId])return [];
  if(state.phase==='ARENA_END'&&playerId===state.activePlayerId)return [{type:'CONTINUE_ARENA',playerId}];
  if(state.phase==='BETWEEN_ARENAS'&&playerId===state.activePlayerId)return [{type:'START_ARENA_2',playerId}];
  if(state.phase==='FINAL_DUEL'&&state.finalDuel?.stage==='selection'&&state.finalDuel.participants.includes(playerId)&&!state.finalDuel.choices[playerId])return state.players[playerId].draftedRats.map(r=>({type:'SELECT_DUEL_RAT',playerId,ratId:r.id}));
  const p=state.players[playerId];
  if(!state.finalDuel&&['PLAYER_ACTION','CAT_MOVEMENT'].includes(state.phase)&&p.eliminated&&p.eliminationRound!==undefined&&p.eliminationRound<=RULES.earlyBetLastRound&&!p.betTargetPlayerId)
    return Object.values(state.players).filter(other=>other.id!==playerId&&other.currentRat.alive).map(other=>({type:'SELECT_BET',playerId,targetId:other.id}));
  return [];
}
export function applyLifecycleAction(state:GameState,action:GameAction):void {
  const legal=lifecycleActions(state,action.playerId).some(a=>a.type===action.type&&(a.type!=='SELECT_DUEL_RAT'||action.type==='SELECT_DUEL_RAT'&&a.ratId===action.ratId)&&(a.type!=='SELECT_BET'||action.type==='SELECT_BET'&&a.targetId===action.targetId));
  if(!legal)throw new Error('Illegal lifecycle action');
  if(action.type==='SELECT_BET'){
    state.players[action.playerId].betTargetPlayerId=action.targetId;
    state.eventLog.push({type:'BET_PLACED',playerId:action.playerId,targetId:action.targetId});
  }else if(action.type==='START_ARENA_2')startArenaTwo(state);
  else if(action.type==='CONTINUE_ARENA'){
    if(state.arenaNumber===1){phase(state,'BETWEEN_ARENAS');return;}
    const max=Math.max(...Object.values(state.players).map(p=>p.divineFavor));
    const tied=state.seatOrder.filter(id=>state.players[id].divineFavor===max);
    if(tied.length===1)finishMatch(state,tied[0]);
    else {state.finalDuel={participants:tied,choices:{},stage:'selection',attempt:0};phase(state,'FINAL_DUEL');}
  }else if(action.type==='SELECT_DUEL_RAT'){
    state.finalDuel!.choices[action.playerId]=action.ratId;
    if(state.finalDuel!.participants.every(id=>state.finalDuel!.choices[id]))startDuel(state);
  }
}
