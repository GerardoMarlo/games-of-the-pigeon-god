import { finishArena } from './lifecycle';
import { equal } from './hex';
import { RULES } from './rules';
import type { GameState, GamePhase } from './types';
export function phase(state:GameState,value:GamePhase):void {state.phase=value;state.eventLog.push({type:'PHASE_CHANGED',phase:value});}
export function beginTurn(state:GameState):void {
  phase(state,'TURN_START');
  const player=state.players[state.activePlayerId];
  player.actionsRemaining=0;
  if(state.finalDuel){grantActions(state);return;}
  phase(state,'CAT_MOVEMENT');
}
export function endTurn(state:GameState,combatRetreat=false):void {
  const player=state.players[state.activePlayerId];
  if(player.currentRat.alive&&player.currentRat.inBurrow&&!combatRetreat)throw new Error('Must exit Burrow before ending Turn');
  player.actionsRemaining=0;phase(state,'TURN_END');
  const index=state.turnOrder.indexOf(player.id);
  if(index===state.turnOrder.length-1){
    phase(state,'ROUND_END');
    if(!state.finalDuel&&state.roundNumber===RULES.roundsPerArena){finishArena(state);return;}
    state.roundNumber++;phase(state,'ROUND_START');
  }
  let next=(index+1)%state.turnOrder.length;
  while(state.finalDuel&&state.players[state.turnOrder[next]].eliminated){next=(next+1)%state.turnOrder.length;if(next===0)state.roundNumber++;}
  state.activePlayerId=state.turnOrder[next];beginTurn(state);
}

// Cat resolution returns here without a second Cat roll.
export function grantActions(state:GameState):void {
  const p=state.players[state.activePlayerId];
  if(p.eliminated){endTurn(state);return;}
  if(state.arenaNumber===2&&!state.finalDuel&&!p.currentRat.inBurrow&&equal(p.currentRat.position,state.board.catSpawn)){p.fervor++;state.eventLog.push({type:'FERVOR_CHANGED',playerId:p.id,amount:1,reason:'Arena 2 center'});}
  p.actionsRemaining=RULES.actionsPerTurn;phase(state,'PLAYER_ACTION');
}
