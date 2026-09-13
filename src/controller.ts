import { combatActor } from './engine/combat';
import { createGame, dispatch, getLegalActions } from './engine/game';
import type { GameAction, GameConfig } from './engine/types';
export function createController(config:GameConfig) {
  let state=createGame(config);
  const listeners=new Set<()=>void>();
  return {getState:()=>structuredClone(state),getLegalActions:()=>getLegalActions(state,combatActor(state)),dispatch:(action:GameAction)=>{state=dispatch(state,action);listeners.forEach(fn=>fn());},subscribe:(fn:()=>void)=>{listeners.add(fn);return ()=>{listeners.delete(fn);};}};
}
