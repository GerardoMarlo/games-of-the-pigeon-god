import type { GameState } from './types';
// Read-only snapshots at boundaries that may occur inside automatic settlement.
export function observe(state:GameState,kind:'segment_start'|'segment_end'|'turn_start'|'mode',reason=''):void {
 state.eventLog.push({type:'OBSERVATION',kind,reason,arena:state.arenaNumber,round:state.roundNumber,duel:state.finalDuel?.attempt??0,active:state.activePlayerId,players:Object.values(state.players).map(p=>({id:p.id,ratId:p.currentRat.ratId,controller:p.controller,health:p.currentRat.health,favor:p.divineFavor}))});
}
