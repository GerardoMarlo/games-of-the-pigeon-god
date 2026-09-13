import { moveCat } from '../cat';
import { isBurrow } from '../burrows';
import { itemCards } from '../../content/cards';
import { directions,equal,key,neighbors,type HexCoordinate } from '../hex';
import { empty } from '../movement';
import { rollD6 } from '../rng';
import type { GameAction,GameState } from '../types';
import { ability,note } from './state';
import { resumeEffects } from './effects';

function catDestinations(state:GameState):HexCoordinate[] {return neighbors(state.cat.position).filter(h=>empty(state,h));}
export function itemActions(state:GameState,id:string):GameAction[] {
 const data=state.content,p=state.players[id];if(!data||state.finalDuel||!p?.currentRat.alive)return [];
 const c=state.combat,active=id===state.activePlayerId,turn=active&&state.phase==='PLAYER_ACTION';
 const result:GameAction[]=[];
 if(turn&&!p.currentRat.inBurrow&&p.actionsRemaining>0&&data.players[id].items.length<(ability(state,id)==='two_items'?2:1)&&data.itemDeck.length)result.push({type:'REQUEST_ITEM',playerId:id});
 if(!['PLAYER_ACTION','COMBAT','CAT_MOVEMENT','CONTENT_EFFECT'].includes(state.phase))return result;
 for(const itemId of data.players[id].items){
  const add=(extra:Partial<Extract<GameAction,{type:'USE_ITEM'}>>={})=>result.push({type:'USE_ITEM',playerId:id,itemId,...extra});
  const attack=c?.attackerId===id,defend=c?.defenderId===id;
  const ownRoll=c&&(attack&&c.stage==='ATTACK'||defend&&c.stage==='DODGE');
  const dice=attack?c?.attackerRoll:c?.defenderRoll;
  switch(itemId){
   case 'chile':add();break;
   case 'brasa':if(!data.players[id].brasa)add();break;
   case 'patines':if(turn&&p.actionsRemaining>0&&!data.players[id].speedBonus)add();break;
   case 'hueso':if(turn&&data.players[id].afterMovement&&!p.currentRat.inBurrow||attack&&c?.stage==='AFTER_DAMAGE'&&c.origin==='rat_move')add();break;
   case 'aguja':case 'red':if(attack&&c?.stage==='BEFORE_ATTACK'&&(itemId!=='red'||c.defenderId!=='cat'))add();break;
   case 'pluma':if(defend&&c?.stage==='BEFORE_DODGE')add();break;
   case 'piedra':if(attack&&c?.stage==='ATTACK')c.attackerRoll.forEach((d,dieIndex)=>{if(d<6)add({dieIndex});});break;
   case 'moneda':if(ownRoll)dice!.forEach((_,dieIndex)=>add({dieIndex}));else if(active&&state.phase==='CAT_MOVEMENT'&&data.catStep==='rolled'&&data.catRolled)add();break;
   case 'arena':if(defend&&c?.stage==='ATTACK_RESPONSE')c.attackerRoll.forEach((d,dieIndex)=>{if(d>=4)add({dieIndex});});break;
   case 'tapa':case 'escudo':if(defend&&c&&['ATTACK_RESPONSE','BEFORE_DODGE','DODGE'].includes(c.stage)&&(c.attackerRoll.some(d=>d>=4)||ability(state,c.attackerId)==='twins_three'&&new Set(c.attackerRoll).size<c.attackerRoll.length))add();break;
   case 'clavo':if(attack&&c?.stage==='AFTER_DAMAGE'&&c.attackerDamage>0&&(c.defenderId==='cat'?state.cat.alive:state.players[c.defenderId].currentRat.alive))add();break;
   case 'sardina':if(active&&(state.automatic?turn:state.phase==='CAT_MOVEMENT'&&!data.catStep))for(let direction=1;direction<=6;direction++)add({direction});break;
   case 'cascabel':if(active&&state.phase==='CAT_MOVEMENT'&&data.catStep==='rolled'&&data.catRolled)add();break;
   case 'silbato':if(active&&(state.automatic?turn:state.phase==='CAT_MOVEMENT'&&!data.catStep))for(const destination of catDestinations(state))add({destination});break;
   case 'migajas':if(active&&(state.automatic?turn:state.phase==='CAT_MOVEMENT'&&data.catStep==='after'))for(const [i,d] of directions.entries()){const h={q:state.cat.position.q+d.q,r:state.cat.position.r+d.r},tile=state.board.hexes[key(h)];if(tile&&!['rock','crate'].includes(tile.terrain)&&!isBurrow(state,h))add({destination:h,direction:i+1});}break;
  }
 }
 return result;
}
export function applyItem(state:GameState,action:GameAction):void {
 const data=state.content!;
 if(!itemActions(state,action.playerId).some(a=>a.type===action.type&&(a.type!=='USE_ITEM'||action.type==='USE_ITEM'&&a.itemId===action.itemId&&a.dieIndex===action.dieIndex&&a.direction===action.direction&&(!a.destination||!!action.destination&&equal(a.destination,action.destination)))))throw new Error('Illegal Item action');
 const p=state.players[action.playerId],owned=data.players[p.id];
 if(action.type==='REQUEST_ITEM'){
  p.actionsRemaining--;const item=data.itemDeck.shift()!;owned.items.push(item);owned.afterMovement=false;
  note(state,`${p.id} requests ${itemCards.find(c=>c.id===item)!.name} (1 Action).`);return;
 }
 if(action.type!=='USE_ITEM')throw new Error('Invalid Item action');
 owned.items.splice(owned.items.indexOf(action.itemId),1);data.itemDiscard.push(action.itemId);
 note(state,`${p.id} uses ${itemCards.find(c=>c.id===action.itemId)!.name}.`);
 const c=state.combat,ctx=data.combat;
 switch(action.itemId){
  case 'chile':p.fervor++;break;
  case 'brasa':owned.brasa=true;break;
  case 'patines':owned.speedBonus=2;break;
  case 'hueso':owned.afterMovement=false;data.effects.push({playerId:p.id,entityId:p.id,steps:1,reason:'Polished Bone'});if(!c){data.resume='player_action';resumeEffects(state);}break;
  case 'aguja':ctx!.attackDice++;break;
  case 'red':ctx!.dodgeDice--;break;
  case 'pluma':ctx!.dodgeDice++;break;
  case 'piedra':c!.attackerRoll[action.dieIndex!]=Math.min(6,c!.attackerRoll[action.dieIndex!]+1);break;
  case 'arena':c!.attackerRoll[action.dieIndex!]=rollD6(state.rng);break;
  case 'moneda':if(data.catStep==='rolled'&&state.phase==='CAT_MOVEMENT')data.catDie=rollD6(state.rng);else (c!.attackerId===p.id?c!.attackerRoll:c!.defenderRoll)[action.dieIndex!]=rollD6(state.rng);break;
  case 'tapa':ctx!.cancelHits++;break;
  case 'escudo':ctx!.cancelAttack=true;break;
  case 'clavo':data.effects.unshift({playerId:p.id,entityId:c!.defenderId,steps:1,reason:'Bent Nail'});break;
  case 'sardina':data.catDie=action.direction;data.catStep='rolled';data.catRolled=false;if(state.automatic){data.catItemMovement=true;moveCat(state);}break;
  case 'cascabel':data.catDie=rollD6(state.rng);break;
  case 'migajas':data.catDie=action.direction;if(state.automatic)data.catItemMovement=true;moveCat(state);break;
  case 'silbato':state.cat.position={...action.destination!};note(state,`Cat moves to (${action.destination!.q}, ${action.destination!.r}).`);break;
 }
 if(action.itemId==='sardina')note(state,`Cat direction chosen: ${directions[action.direction!-1].q}, ${directions[action.direction!-1].r}.`);
}
