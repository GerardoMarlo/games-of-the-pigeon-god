import { itemCards } from '../../content/cards';
import { decreeCards } from '../../content/decrees';
import { shuffle } from '../rng';
import type { GameState } from '../types';
import type { CardPlayerState,ContentState } from './types';
export const cardPlayer=():CardPlayerState=>({items:[],moved:false,bonusGranted:false,speedBonus:0,brasa:false,catDamage:0,catFinishes:0,counterFinishes:0,afterMovement:false});
export function initializeContent(state:GameState):ContentState {
 const decreeDeck=shuffle(state.rng,decreeCards.map(c=>c.id));
 return {itemDeck:shuffle(state.rng,itemCards.map(c=>c.id)),itemDiscard:[],decreeDeck,decrees:decreeDeck.splice(0,4),decreeDiscard:[],claims:[],players:Object.fromEntries(state.seatOrder.map(id=>[id,cardPlayer()])),effects:[]};
}
export function ability(state:GameState,id:string):string|undefined {
 const p=state.players[id];return p?.draftedRats.find(r=>r.id===p.currentRat.ratId)?.ability;
}
export function note(state:GameState,message:string):void {state.eventLog.push({type:'CONTENT',message});}
export function bonusAction(state:GameState,id:string,limited:boolean):void {
 const p=state.players[id],data=state.content?.players[id];
 if(!data||!p.currentRat.alive||limited&&data.bonusGranted)return;
 if(limited)data.bonusGranted=true;
 if(id===state.activePlayerId)p.actionsRemaining++;
 else state.content!.effects.push({playerId:id,entityId:id,steps:1,reason:'Additional Action',bonusAction:true});
 note(state,`${id} gains 1 additional Action.`);
}
export function resetContentArena(state:GameState):void {
 const c=state.content;if(!c)return;
 for(const id of state.seatOrder){c.itemDiscard.push(...c.players[id].items);c.players[id]=cardPlayer();}
 c.effects=[];delete c.combat;delete c.catStep;delete c.catDie;delete c.catRolled;delete c.resume;
}
