import { createGame,dispatch,getLegalActions,getVisibleState,simulateForAI } from './engine/game';
import { chooseAI } from './ai/strategy';
import type { GameAction,GameConfig } from './engine/types';
export function createController(config:GameConfig) {
 let state=createGame(config),revision=0;
 const listeners=new Set<()=>void>();
 const send=(action:GameAction)=>{state=dispatch(state,action);revision++;listeners.forEach(fn=>fn());};
 const all=()=>Object.keys(state.players).flatMap(id=>getLegalActions(state,id));
 return {
  getState:()=>structuredClone(state),getRevision:()=>revision,
  getLegalActions:()=>all().filter(a=>state.players[a.playerId].controller==='human'),
  dispatch:send,
  setMode:(mode:'local'|'ai')=>{state.mode=mode;for(const p of Object.values(state.players))p.controller=mode==='ai'&&p.id!=='p1'?'ai':'human';revision++;listeners.forEach(fn=>fn());},
  aiStep:()=>{
   const actions=all(),mandatory=actions.find(a=>!['USE_ITEM','SELECT_BET'].includes(a.type));
   const id=mandatory?.playerId??actions[0]?.playerId;
   if(!id||state.players[id].controller!=='ai')return false;
   const legal=actions.filter(a=>a.playerId===id);send(chooseAI(getVisibleState(state,id),id,legal,a=>simulateForAI(state,id,a)));return true;
  },
  expireTurn:(expected:number)=>{
   if(expected!==revision||state.phase!=='PLAYER_ACTION')return;
   const p=state.players[state.activePlayerId];if(p.actionsRemaining===0&&!p.currentRat.inBurrow)send({type:'END_TURN',playerId:p.id});
  },
  subscribe:(fn:()=>void)=>{listeners.add(fn);return ()=>{listeners.delete(fn);};}
 };
}
