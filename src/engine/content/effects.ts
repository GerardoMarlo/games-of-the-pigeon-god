import { finishCatStep } from '../cat';
import { neighbors,equal } from '../hex';
import { itemActions,applyItem } from './items';
import { empty,movementPaths,traceMovement } from '../movement';
import { endTurn,phase } from '../turns';
import type { GameAction,GameState } from '../types';
import { note } from './state';
export function effectActions(state:GameState,id:string):GameAction[] {
 const e=state.content?.effects[0];if(state.phase!=='CONTENT_EFFECT'||!e||id!==e.playerId)return [];
 if(e.bonusAction){
  const preview=actionPreview(state,id);
  return [{type:'SKIP_EFFECT',playerId:id},...movementPaths(preview,id).map(path=>({type:'EFFECT_ACTION_MOVE' as const,playerId:id,path})),...(itemActions(preview,id).some(a=>a.type==='REQUEST_ITEM')?[{type:'EFFECT_REQUEST_ITEM' as const,playerId:id}]:[])];
 }
 if(e.entityId!=='cat'&&e.reason!=='Clavo torcido'){
  const preview=actionPreview(state,id),p=preview.players[id];p.draftedRats.find(r=>r.id===p.currentRat.ratId)!.speed=e.steps;preview.content!.players[id].speedBonus=0;
  return [{type:'SKIP_EFFECT',playerId:id},...movementPaths(preview,id).map(path=>({type:'EFFECT_MOVE' as const,playerId:id,destination:path[path.length-1],path}))];
 }
 const position=e.entityId==='cat'?state.cat.position:state.players[e.entityId].currentRat.position;
 const moves=neighbors(position).filter(h=>empty(state,h)).map(destination=>({type:'EFFECT_MOVE' as const,playerId:id,destination}));
 return e.reason==='Clavo torcido'&&moves.length?moves:[{type:'SKIP_EFFECT',playerId:id},...moves];
}
export function resumeEffects(state:GameState):void {
 const c=state.content!;
 while(c.effects[0]&&(c.effects[0].steps<=0||(c.effects[0].entityId==='cat'?!state.cat.alive:!state.players[c.effects[0].entityId].currentRat.alive)))c.effects.shift();
 if(c.effects.length){phase(state,'CONTENT_EFFECT');return;}
 const resume=c.resume,retreat=c.combatRetreat;delete c.resume;delete c.combatRetreat;
 if(resume==='actions')finishCatStep(state);
 else if(resume==='end_turn'){
  const p=state.players[state.activePlayerId];
  if(p.currentRat.alive&&p.actionsRemaining>0&&!(retreat&&p.currentRat.inBurrow&&!movementPaths(actionPreview(state,p.id),p.id).length))phase(state,'PLAYER_ACTION');else endTurn(state,retreat);
 }else phase(state,'PLAYER_ACTION');
}
function actionPreview(state:GameState,id:string):GameState {const p=structuredClone(state);p.phase='PLAYER_ACTION';p.activePlayerId=id;p.players[id].actionsRemaining=1;return p;}
export function applyEffect(state:GameState,action:GameAction):void {
 if(!effectActions(state,action.playerId).some(a=>a.type===action.type&&(a.type!=='EFFECT_ACTION_MOVE'||action.type==='EFFECT_ACTION_MOVE'&&JSON.stringify(a.path)===JSON.stringify(action.path))&&(a.type!=='EFFECT_MOVE'||action.type==='EFFECT_MOVE'&&equal(a.destination,action.destination)&&JSON.stringify(a.path)===JSON.stringify(action.path))))throw new Error('Illegal bonus movement');
 const c=state.content!,e=c.effects[0];
 if(action.type==='SKIP_EFFECT')c.effects.shift();
 else if(action.type==='EFFECT_REQUEST_ITEM'){
  const preview=actionPreview(state,action.playerId);applyItem(preview,{type:'REQUEST_ITEM',playerId:action.playerId});
  c.itemDeck=preview.content!.itemDeck;c.players[action.playerId].items=preview.content!.players[action.playerId].items;state.eventLog=preview.eventLog;c.effects.shift();
 }else if(action.type==='EFFECT_ACTION_MOVE'){
  const steps=traceMovement(actionPreview(state,action.playerId),action.playerId,action.path);
  const p=state.players[action.playerId];for(const step of steps){const from={...p.currentRat.position};p.currentRat.position={...step.to};p.currentRat.inBurrow=false;state.eventLog.push({type:'RAT_MOVED',playerId:p.id,from,to:step.to,cost:step.cost});}
  c.players[p.id].moved=true;c.effects.shift();
 }else if(action.type==='EFFECT_MOVE'){
  let cost=1;
  if(action.path){const preview=actionPreview(state,e.entityId),p=preview.players[e.entityId];p.draftedRats.find(r=>r.id===p.currentRat.ratId)!.speed=e.steps;preview.content!.players[e.entityId].speedBonus=0;cost=traceMovement(preview,e.entityId,action.path).reduce((n,step)=>n+step.cost,0);}
  if(e.entityId==='cat')state.cat.position={...action.destination};
  else {const p=state.players[e.entityId];p.currentRat.position={...action.destination};p.currentRat.inBurrow=false;if(e.reason!=='Clavo torcido')c.players[p.id].moved=true;}
  note(state,`${e.entityId} moves to (${action.destination.q}, ${action.destination.r}) via ${e.reason}.`);e.steps-=cost;
 }
 resumeEffects(state);
}
