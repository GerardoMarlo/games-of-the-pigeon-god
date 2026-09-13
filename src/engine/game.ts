import { assertContent } from './content/validation';
import { ratCards } from '../content/cards';
import { initializeContent } from './content/state';
import { itemActions,applyItem } from './content/items';
import { abilityActions,applyAbility } from './content/abilities';
import { effectActions,applyEffect } from './content/effects';
import { grantActions } from './turns';
import { beginPlacement,isBurrow,placeBurrow,placementActions } from './burrows';
import { generateArena } from '../content/arena';
import { applyLifecycleAction, lifecycleActions } from './lifecycle';
import { moveCat } from './cat';
import { beginTurn, endTurn, phase } from './turns';
import { applyCombatAction, combatActions, startCombat } from './combat';
import { prototypeRats } from '../content/prototype';
import { equal, key } from './hex';
import { movementPaths, traceMovement } from './movement';
import { next, seeded, shuffle } from './rng';
import { PROTOTYPE } from './rules';
import type { GameAction, GameConfig, GameState } from './types';
export function assertInvariants(state:GameState):void {
  assertContent(state);
  const occupied=new Set<string>();
  for(const p of Object.values(state.players)) {
    const rat=p.currentRat;
    if(rat.health<0 || p.actionsRemaining<0 || p.divineFavor<0 || p.fervor<0) throw new Error('Negative resource');
    if([rat.health,p.actionsRemaining,p.divineFavor,p.fervor,p.attacks,p.dodges,p.finishes].some(n=>!Number.isSafeInteger(n)||n<0))throw new Error('Invalid resource');
    if(rat.alive!==(rat.health>0)||p.eliminated===rat.alive)throw new Error('Invalid life state');
    if(rat.alive) {
      if(state.burrowPlacement&&!state.burrowPlacement.placed.includes(p.id))continue;
      if(rat.inBurrow){
        const spawn=state.board.spawns[state.seatOrder.indexOf(p.id)];
        const duelSpawn=state.finalDuel?.stage==='combat'?state.board.spawns[state.turnOrder.indexOf(p.id)]:spawn;
        if(!isBurrow(state,rat.position)||!duelSpawn||(!equal(rat.position,duelSpawn)&&!rat.forcedBurrow))throw new Error('Invalid Burrow');
        if(occupied.has(key(rat.position)))throw new Error('Shared Burrow');occupied.add(key(rat.position));
        continue;
      }
      const tile=state.board.hexes[key(rat.position)];
      if(!tile || isBurrow(state,rat.position) || ['rock','crate','sewer'].includes(tile.terrain) || occupied.has(key(rat.position)) || (state.cat.alive && !state.cat.offBoard && equal(rat.position,state.cat.position))) throw new Error('Invalid occupancy');
      occupied.add(key(rat.position));
    }
  }
  if(state.cat.health<0 || state.cat.health>9) throw new Error('Invalid Cat health');
  if(state.combat && state.phase!=='COMBAT')throw new Error('Combat outside combat phase');
}
export function createGame(config:GameConfig):GameState {
  if(![2,3,4].includes(config.playerCount)) throw new Error('Requires 2–4 gladiators');
  const rng=seeded(config.seed);
  const ids=Array.from({length:config.playerCount},(_,i)=>`p${i+1}`);
  const first=Math.floor(next(rng)*ids.length),turnOrder=[...ids.slice(first),...ids.slice(0,first)];
  const board=structuredClone(config.board??generateArena(rng,config.playerCount));
  if(config.board&&board.spawns.length<config.playerCount)throw new Error('Insufficient spawns');
  const state:GameState={automatic:config.automatic!==false,mode:config.mode??'local',phase:'ARENA_SETUP',arenaNumber:1,roundNumber:1,activePlayerId:turnOrder[0],turnOrder,players:{},seatOrder:ids,arenaResults:[],arenaTemplate:config.board?structuredClone(config.board):undefined,board,cat:{maxHealth:9,health:9,position:{...board.catSpawn},spawnPosition:{...board.catSpawn},alive:true},rng,eventLog:[]};
  const roster=config.content===false?prototypeRats:shuffle(rng,ratCards.map(r=>({...r,artwork:''})));
  ids.forEach((id,i)=>{const cards=structuredClone(roster.slice(i*2,i*2+2));state.players[id]={id,controller:config.mode==='ai'&&i!==0?'ai':'human',divineFavor:0,draftedRats:cards,currentRat:{ratId:cards[0].id,ownerId:id,health:cards[0].maxHealth,position:{...(board.spawns[i]??board.catSpawn)},alive:true,inBurrow:!config.board||!board.hexes[key(board.spawns[i])]},eliminated:false,attacks:0,dodges:0,finishes:0,fervor:0,actionsRemaining:0};});
  if(config.content!==false)state.content=initializeContent(state);
  if(config.board){phase(state,'ROUND_START');beginTurn(state);}else beginPlacement(state);assertInvariants(state);return settle(state);
}
export function getLegalActions(state:GameState,playerId:string):GameAction[] {
  if(!state.players[playerId])return [];
  const items=itemActions(state,playerId);
  if(state.phase==='CONTENT_EFFECT')return [...effectActions(state,playerId),...items];
  if(state.phase==='ARENA_SETUP')return placementActions(state,playerId);
  const extra=lifecycleActions(state,playerId);
  if(extra.length&&extra[0].type!=='SELECT_BET')return extra;
  if(state.phase==='CAT_MOVEMENT'){
    const type=state.content?.catStep==='rolled'?'CONFIRM_CAT_DIRECTION':state.content?.catStep==='after'?'FINISH_CAT_MOVEMENT':'ROLL_CAT_MOVEMENT';
    return [...(playerId===state.activePlayerId?[{type,playerId} as GameAction]:[]),...extra,...items];
  }
  if(state.phase==='COMBAT')return [...combatActions(state,playerId),...abilityActions(state,playerId),...items];
  if(state.phase!=='PLAYER_ACTION' || state.activePlayerId!==playerId || !state.players[playerId]) return [...extra,...items];
  const actions:GameAction[]=movementPaths(state,playerId).map(path=>({type:'MOVE',playerId,path}));
  if(PROTOTYPE.endTurnAllowed&&!state.players[playerId].currentRat.inBurrow) actions.push({type:'END_TURN',playerId});
  return [...actions,...extra,...items];
}
function dispatchRaw(input:GameState,action:GameAction):GameState {
  action=structuredClone(action);
  const state=structuredClone(input);
  if(action.type==='REQUEST_ITEM'||action.type==='USE_ITEM'){applyItem(state,action);assertInvariants(state);return state;}
  if(action.type==='USE_ABILITY'){applyAbility(state,action);assertInvariants(state);return state;}
  if(state.phase==='CONTENT_EFFECT'){applyEffect(state,action);assertInvariants(state);return state;}
  if(action.type==='PLACE_BURROW'){placeBurrow(state,action);assertInvariants(state);return state;}
  if(['CONTINUE_ARENA','START_ARENA_2','SELECT_DUEL_RAT','SELECT_BET'].includes(action.type)){applyLifecycleAction(state,action);assertInvariants(state);return state;}
  if(state.phase==='CAT_MOVEMENT'&&['ROLL_CAT_MOVEMENT','CONFIRM_CAT_DIRECTION','FINISH_CAT_MOVEMENT'].includes(action.type)){
    if(!getLegalActions(state,action.playerId).some(a=>a.type===action.type))throw new Error('Illegal Cat decision');
    if(action.type==='FINISH_CAT_MOVEMENT'){delete state.content!.catStep;delete state.content!.catDie;grantActions(state);}else moveCat(state);
    assertInvariants(state);return state;
  }
  if(state.phase==='COMBAT'){applyCombatAction(state,action);assertInvariants(state);return state;}
  if(state.phase!=='PLAYER_ACTION' || action.playerId!==state.activePlayerId) throw new Error('Wrong phase or player');
  const player=state.players[action.playerId];
  if(action.type==='MOVE') {
    const steps=traceMovement(state,action.playerId,action.path);
    player.actionsRemaining--;
    if(state.content)state.content.players[player.id].afterMovement=false;

    for(const step of steps) {
      const from={...player.currentRat.position};
      if(step.defenderId) {
        startCombat(state,step.defenderId,from,step.to);break;
      }
      if(state.content)state.content.players[player.id].moved=true;
      player.currentRat.position={...step.to};player.currentRat.inBurrow=false;delete player.currentRat.forcedBurrow;state.eventLog.push({type:'RAT_MOVED',playerId:player.id,from,to:step.to,cost:step.cost});
    }
    if(state.content){state.content.players[player.id].speedBonus=0;state.content.players[player.id].afterMovement=state.phase==='PLAYER_ACTION';}
  } else if(action.type==='END_TURN' && PROTOTYPE.endTurnAllowed) {
    endTurn(state);
  } else throw new Error('Unsupported action');
  assertInvariants(state);return state;
}
export function dispatch(input:GameState,action:GameAction):GameState {return settle(dispatchRaw(input,action));}
// Only deterministic engine decisions are automatic. The controller owns wall-clock timers.
export function settle(input:GameState):GameState {
 let state=input;
 if(!state.automatic)return state;
 for(let step=0;step<100;step++){
  const id=state.activePlayerId,p=state.players[id],all=state.seatOrder.flatMap(player=>getLegalActions(state,player));
  let type:GameAction['type']|undefined;
  if(state.phase==='CAT_MOVEMENT'){
   if(!state.content?.catStep)type='ROLL_CAT_MOVEMENT';
   else if(state.content.catStep==='after')type='FINISH_CAT_MOVEMENT';
   else if(!all.some(a=>a.type==='USE_ITEM'&&['cascabel','moneda'].includes(a.itemId)))type='CONFIRM_CAT_DIRECTION';
  }else if(state.combat){
   const stage=state.combat.stage;
   if(stage==='PUSHBACK'&&all.filter(a=>a.type==='SELECT_PUSHBACK').length===1)type='SELECT_PUSHBACK';
   const relevant=stage==='BEFORE_ATTACK'?['aguja','red']:stage==='ATTACK_RESPONSE'?['arena']:stage==='BEFORE_DODGE'?['pluma']:stage==='AFTER_DAMAGE'?['clavo','hueso']:undefined;
   if(relevant&&!all.some(a=>a.type==='USE_ITEM'&&relevant.includes(a.itemId)))type=stage==='BEFORE_ATTACK'?'ROLL_ATTACK':stage==='ATTACK_RESPONSE'?'ACCEPT_ATTACK':stage==='BEFORE_DODGE'?'ROLL_DODGE':'RESOLVE_COMBAT';
   if(['ATTACK','DODGE'].includes(stage)&&!all.some(a=>a.type==='SPEND_FERVOR'||a.type==='USE_ABILITY'||a.type==='USE_ITEM'&&a.playerId===(stage==='ATTACK'?state.combat!.attackerId:state.combat!.defenderId)))type=stage==='ATTACK'?'CONFIRM_ATTACK':'CONFIRM_DODGE';
  }else if(state.phase==='PLAYER_ACTION'&&p.actionsRemaining===0&&!p.currentRat.inBurrow&&!(state.content?.players[id].items.length))type='END_TURN';
  else if(state.phase==='CONTENT_EFFECT'&&!all.some(a=>['EFFECT_MOVE','EFFECT_ACTION_MOVE','EFFECT_REQUEST_ITEM'].includes(a.type)))type='SKIP_EFFECT';
  if(!type)return state;
  const action=all.find(a=>a.type===type);if(!action)return state;
  state=dispatchRaw(state,action);
 }
 throw new Error('Automatic transition limit exceeded');
}
export const cloneState=(state:GameState):GameState=>structuredClone(state);
export const simulate=dispatch;
export function getVisibleState(state:GameState,viewerId:string) {
  if(!state.players[viewerId]) throw new Error('Unknown viewer');
  // Deliberately exclude RNG and full draft data from opponent views (§§13,62).
  return {publicContent:state.content?{decrees:[...state.content.decrees],claims:structuredClone(state.content.claims),items:Object.fromEntries(Object.entries(state.content.players).map(([id,p])=>[id,[...p.items]]))}:undefined,winnerId:state.winnerId,arenaResults:structuredClone(state.arenaResults),finalDuel:state.finalDuel?{participants:[...state.finalDuel.participants],stage:state.finalDuel.stage,attempt:state.finalDuel.attempt}:undefined,combat:structuredClone(state.combat),phase:state.phase,arenaNumber:state.arenaNumber,roundNumber:state.roundNumber,activePlayerId:state.activePlayerId,turnOrder:[...state.turnOrder],board:structuredClone(state.board),cat:structuredClone(state.cat),players:Object.values(state.players).map(p=>({...structuredClone(p),draftedRats:structuredClone(p.draftedRats.filter(r=>p.id===viewerId || r.id===p.currentRat.ratId))}))};
}

// Hidden reserve identities/stats, real RNG and deck order never enter AI simulations.
export function simulateForAI(state:GameState,id:string,action:GameAction):ReturnType<typeof getVisibleState> {
 const model=structuredClone(state);model.rng=seeded(9127);model.eventLog=[];
 for(const p of Object.values(model.players))if(p.id!==id){
  const visible=p.draftedRats.find(r=>r.id===p.currentRat.ratId)!;
  p.draftedRats=[visible,{id:`unknown-${p.id}`,name:'Unknown reserve',maxHealth:3,attackDice:1,speed:1,artwork:''}];
 }
 if(model.content){model.content.itemDeck.sort();model.content.decreeDeck.sort();}
 return getVisibleState(dispatch(model,action),id);
}
