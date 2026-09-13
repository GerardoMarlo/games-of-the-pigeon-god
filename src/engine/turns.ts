import { RULES } from './rules';
import type { GameState, GamePhase } from './types';
export function phase(state:GameState,value:GamePhase):void {state.phase=value;state.eventLog.push({type:'PHASE_CHANGED',phase:value});}
export function beginTurn(state:GameState):void {
  phase(state,'TURN_START');
  const player=state.players[state.activePlayerId];
  player.actionsRemaining=0;
  phase(state,'CAT_MOVEMENT');
}
export function endTurn(state:GameState):void {
  const player=state.players[state.activePlayerId];
  player.actionsRemaining=0;phase(state,'TURN_END');
  const index=state.turnOrder.indexOf(player.id);
  if(index===state.turnOrder.length-1){
    phase(state,'ROUND_END');
    if(state.roundNumber===RULES.roundsPerArena){phase(state,'ARENA_END');return;}
    state.roundNumber++;phase(state,'ROUND_START');
  }
  state.activePlayerId=state.turnOrder[(index+1)%state.turnOrder.length];beginTurn(state);
}

// Cat resolution returns here without a second Cat roll.
export function grantActions(state:GameState):void {
  const p=state.players[state.activePlayerId];
  if(p.eliminated){endTurn(state);return;}
  p.actionsRemaining=RULES.actionsPerTurn;phase(state,'PLAYER_ACTION');
}
