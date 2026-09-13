import { isBurrow } from './burrows';
import { startCombat } from './combat';
import { directions, equal, key } from './hex';
import { occupant } from './movement';
import { rollD6 } from './rng';
import { endTurn, grantActions } from './turns';
import type { GameState } from './types';

// Reposition between Arenas without resetting surviving Cat Health (§43).
export function carryCatToArena(state:GameState):void {
  state.cat.spawnPosition={...state.board.catSpawn};
  state.cat.position={...state.board.catSpawn};state.cat.offBoard=false;
}
export function respawnCat(state:GameState,killed:boolean,resume:'actions'|'end_turn',arenaEnded=false,catCreditPlayerId?:string):boolean {
  if(killed)state.cat.health=state.cat.maxHealth;
  state.cat.alive=true;state.cat.offBoard=true;
  const spawn={...state.cat.spawnPosition},defenderId=occupant(state,spawn);
  state.cat.position=spawn;
  state.eventLog.push({type:'CAT_RESPAWNED',health:state.cat.health,occupied:!!defenderId});
  if(defenderId){
    // A spawning Cat is staged off-board until combat establishes its legal position.
    if(!arenaEnded)startCombat(state,defenderId,spawn,spawn,{origin:'cat_respawn',resume,catCreditPlayerId});
    return !arenaEnded;
  }
  state.cat.offBoard=false;return false;
}
export function moveCat(state:GameState):void {
  const die=rollD6(state.rng),direction=directions[die-1],from={...state.cat.position};
  const to={q:from.q+direction.q,r:from.r+direction.r},tile=state.board.hexes[key(to)];
  const resume=state.players[state.activePlayerId].eliminated?'end_turn':'actions';
  const catCreditPlayerId=resume==='end_turn'?state.activePlayerId:undefined;
  state.eventLog.push({type:'CAT_MOVED',die,from,to,blocked:isBurrow(state,to)||!!tile&&['rock','crate'].includes(tile.terrain)});
  if(!tile){if(respawnCat(state,false,resume,false,catCreditPlayerId))return;}
  else if(!isBurrow(state,to)&&!['rock','crate'].includes(tile.terrain)){
    const defenderId=occupant(state,to);
    if(defenderId && defenderId!=='cat'){startCombat(state,defenderId,from,to,{origin:'cat_turn',resume,direction,catCreditPlayerId});return;}
    state.cat.position=to;
  }
  if(resume==='actions')grantActions(state);else endTurn(state);
}
export function catAtSpawn(state:GameState):boolean {return !state.cat.offBoard&&equal(state.cat.position,state.cat.spawnPosition);}
