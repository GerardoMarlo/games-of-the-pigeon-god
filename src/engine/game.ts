import { prototypeBoard, prototypeRats } from '../content/prototype';
import { equal, key } from './hex';
import { movementPaths, traceMovement } from './movement';
import { next, seeded } from './rng';
import { RULES, PROTOTYPE } from './rules';
import type { GameAction, GameConfig, GamePhase, GameState } from './types';
function phase(state:GameState,value:GamePhase):void {state.phase=value;state.eventLog.push({type:'PHASE_CHANGED',phase:value});}
function beginTurn(state:GameState):void {
  phase(state,'TURN_START');
  const player=state.players[state.activePlayerId];
  player.actionsRemaining=player.eliminated?0:RULES.actionsPerTurn;
  // §36 Cat movement belongs to Milestone 3; do not consume its RNG here.
  phase(state,'PLAYER_ACTION');
}
export function assertInvariants(state:GameState):void {
  const occupied=new Set<string>();
  for(const p of Object.values(state.players)) {
    const rat=p.currentRat;
    if(rat.health<0 || p.actionsRemaining<0 || p.divineFavor<0 || p.fervor<0) throw new Error('Negative resource');
    if(rat.alive) {
      const tile=state.board.hexes[key(rat.position)];
      if(!tile || ['rock','crate','sewer'].includes(tile.terrain) || occupied.has(key(rat.position)) || (state.cat.alive && equal(rat.position,state.cat.position))) throw new Error('Invalid occupancy');
      occupied.add(key(rat.position));
    }
  }
  if(state.cat.health<0 || state.cat.health>9) throw new Error('Invalid Cat health');
}
export function createGame(config:GameConfig):GameState {
  if(![2,3,4].includes(config.playerCount)) throw new Error('Requires 2–4 gladiators');
  const rng=seeded(config.seed),board=structuredClone(config.board??prototypeBoard());
  if(board.spawns.length<config.playerCount) throw new Error('Insufficient spawns');
  const ids=Array.from({length:config.playerCount},(_,i)=>`p${i+1}`);
  const first=Math.floor(next(rng)*ids.length),turnOrder=[...ids.slice(first),...ids.slice(0,first)];
  const state:GameState={phase:'ARENA_SETUP',arenaNumber:1,roundNumber:1,activePlayerId:turnOrder[0],turnOrder,players:{},board,cat:{maxHealth:9,health:9,position:{...board.catSpawn},spawnPosition:{...board.catSpawn},alive:true},rng,eventLog:[]};
  ids.forEach((id,i)=>{const cards=structuredClone(prototypeRats.slice(i*2,i*2+2));state.players[id]={id,controller:i===0?'human':'ai',divineFavor:0,draftedRats:cards,currentRat:{ratId:cards[0].id,ownerId:id,health:cards[0].maxHealth,position:{...board.spawns[i]},alive:true},eliminated:false,attacks:0,dodges:0,finishes:0,fervor:0,actionsRemaining:0};});
  phase(state,'ROUND_START');beginTurn(state);assertInvariants(state);return state;
}
export function getLegalActions(state:GameState,playerId:string):GameAction[] {
  if(state.phase!=='PLAYER_ACTION' || state.activePlayerId!==playerId || !state.players[playerId]) return [];
  const actions:GameAction[]=movementPaths(state,playerId).map(path=>({type:'MOVE',playerId,path}));
  if(PROTOTYPE.endTurnAllowed) actions.push({type:'END_TURN',playerId});
  return actions;
}
export function dispatch(input:GameState,action:GameAction):GameState {
  action=structuredClone(action);
  const state=structuredClone(input);
  if(state.phase!=='PLAYER_ACTION' || action.playerId!==state.activePlayerId) throw new Error('Wrong phase or player');
  const player=state.players[action.playerId];
  if(action.type==='MOVE') {
    const steps=traceMovement(state,action.playerId,action.path);
    player.actionsRemaining--;
    let remaining=player.draftedRats.find(r=>r.id===player.currentRat.ratId)!.speed;
    for(const step of steps) {
      remaining-=step.cost;
      const from={...player.currentRat.position};
      if(step.defenderId) {
        state.combat={attackerId:player.id,defenderId:step.defenderId,sourceHex:from,destinationHex:step.to,movementRemaining:remaining};
        state.eventLog.push({type:'COMBAT_TRIGGERED',attackerId:player.id,defenderId:step.defenderId});phase(state,'COMBAT');break;
      }
      player.currentRat.position={...step.to};state.eventLog.push({type:'RAT_MOVED',playerId:player.id,from,to:step.to,cost:step.cost});
    }
  } else if(action.type==='END_TURN' && PROTOTYPE.endTurnAllowed) {
    player.actionsRemaining=0;phase(state,'TURN_END');
    const index=state.turnOrder.indexOf(player.id);
    if(index===state.turnOrder.length-1) {
      phase(state,'ROUND_END');
      if(state.roundNumber===RULES.roundsPerArena) {phase(state,'ARENA_END');assertInvariants(state);return state;}
      state.roundNumber++;phase(state,'ROUND_START');
    }
    state.activePlayerId=state.turnOrder[(index+1)%state.turnOrder.length];beginTurn(state);
  } else throw new Error('Unsupported action');
  assertInvariants(state);return state;
}
export const cloneState=(state:GameState):GameState=>structuredClone(state);
export const simulate=dispatch;
export function getVisibleState(state:GameState,viewerId:string) {
  if(!state.players[viewerId]) throw new Error('Unknown viewer');
  // Deliberately exclude RNG and full draft data from opponent views (§§13,62).
  return {phase:state.phase,arenaNumber:state.arenaNumber,roundNumber:state.roundNumber,activePlayerId:state.activePlayerId,turnOrder:[...state.turnOrder],board:structuredClone(state.board),cat:structuredClone(state.cat),players:Object.values(state.players).map(p=>({...structuredClone(p),draftedRats:structuredClone(p.draftedRats.filter(r=>p.id===viewerId || r.id===p.currentRat.ratId))}))};
}
