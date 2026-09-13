import { itemCards } from '../../content/cards';
import { decreeCards } from '../../content/decrees';
import type { GameState } from '../types';
import { ability } from './state';
export function assertContent(state:GameState):void {
 const c=state.content;if(!c)return;
 const items=[...c.itemDeck,...c.itemDiscard,...Object.values(c.players).flatMap(p=>p.items)];
 if(items.some(id=>!itemCards.some(card=>card.id===id))||new Set(items).size!==items.length)throw new Error('Invalid Item inventory');
 const decrees=[...c.decrees,...c.decreeDeck,...c.decreeDiscard];
 if(decrees.some(id=>!decreeCards.some(card=>card.id===id))||new Set(decrees).size!==decrees.length||c.decrees.length>4)throw new Error('Invalid Decree inventory');
 for(const [id,p] of Object.entries(c.players)){
  if(p.items.length>(ability(state,id)==='two_items'?2:1))throw new Error('Item capacity exceeded');
  if([p.catDamage,p.catFinishes,p.counterFinishes,p.speedBonus].some(n=>!Number.isSafeInteger(n)||n<0))throw new Error('Invalid card tracker');
 }
}
