import { decreeCards,type DecreeCard } from '../../content/decrees';
import { RULES } from '../rules';
import { equal } from '../hex';
import type { GameState } from '../types';
import { ability,bonusAction } from './state';
export function qualifies(state:GameState,id:string,card:DecreeCard):boolean {
 const p=state.players[id],c=card.condition;
 switch(c.kind){
  case 'threshold':return (c.stat in p? p[c.stat as 'attacks'|'dodges'|'finishes']:state.content!.players[id][c.stat as 'catDamage'|'catFinishes'|'counterFinishes'])>=c.value;
  case 'all':return p.attacks>=c.attacks&&p.dodges>=c.dodges&&p.finishes>=c.finishes;
  case 'winner':return state.arenaWinnerId===id&&(c.health===undefined||p.currentRat.health===c.health)&&(c.finishes===undefined||p.finishes>=c.finishes);
  case 'pacifist':return p.currentRat.alive&&p.attacks===0;
  case 'most':return p.currentRat.alive&&Object.values(state.players).filter(o=>o.id!==id&&o.currentRat.alive).every(o=>p[c.stat]>o[c.stat]);
  case 'arena_end':return p.currentRat.alive&&(c.healthMax===undefined||p.currentRat.health<=c.healthMax)&&(c.healthExact===undefined||p.currentRat.health===c.healthExact)&&(!c.center||!p.currentRat.inBurrow&&equal(p.currentRat.position,state.board.catSpawn))&&(!c.sole||Object.values(state.players).filter(o=>o.currentRat.alive).length===1)&&(!c.highestHealth||Object.values(state.players).filter(o=>o.id!==id&&o.currentRat.alive).every(o=>p.currentRat.health>o.currentRat.health));
 }
}
export function restockDecrees(state:GameState):void {
 const c=state.content;if(!c||state.finalDuel)return;
 while(c.decrees.length<4&&c.decreeDeck.length){const cardId=c.decreeDeck.shift()!;c.decrees.push(cardId);state.eventLog.push({type:'DECREE_REVEALED',cardId});}
}
export function claimDecrees(state:GameState,timing:'immediate'|'end_of_arena'):void {
 const c=state.content;if(!c||state.finalDuel)return;
 const restock=timing==='immediate'&&!['ARENA_END','BETWEEN_ARENAS','MATCH_END'].includes(state.phase)&&Object.values(state.players).filter(p=>p.currentRat.alive).length>1&&!(state.roundNumber===RULES.roundsPerArena&&state.activePlayerId===state.turnOrder.at(-1)&&state.players[state.activePlayerId].actionsRemaining===0);
 const start=state.turnOrder.indexOf(state.activePlayerId),order=[...state.turnOrder.slice(start),...state.turnOrder.slice(0,start)];
 // A finite deck bounds replacement chains. New cards are active immediately.
 let changed=true;
 while(changed){changed=false;
  for(const id of [...c.decrees]){
   const card=decreeCards.find(d=>d.id===id)!;
   if(card.timing!==timing&&!(timing==='end_of_arena'&&card.timing==='immediate'))continue;
   const winner=order.find(playerId=>qualifies(state,playerId,card));if(!winner)continue;
   const slot=c.decrees.indexOf(id);c.decrees.splice(slot,1);c.decreeDiscard.push(id);
   c.claims.push({cardId:id,playerId:winner,arenaNumber:state.arenaNumber});state.players[winner].divineFavor+=card.reward;
   state.eventLog.push({type:'DECREE_CLAIMED',playerId:winner,cardId:id,name:card.name,reward:card.reward,slot});
   if(timing==='immediate'&&ability(state,winner)==='decree_action')bonusAction(state,winner,false);
   if(restock)restockDecrees(state);changed=true;
  }
 }
}
