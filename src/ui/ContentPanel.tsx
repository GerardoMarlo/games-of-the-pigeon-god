import { itemCards } from '../content/cards';
import { decreeCards,decreeDescription } from '../content/decrees';
import type { GameAction,GameState } from '../engine/types';
interface Props {state:GameState;actions:GameAction[];send:(action:GameAction)=>void}
const labels:Record<string,string>={EFFECT_REQUEST_ITEM:'Request Item with bonus Action',REQUEST_ITEM:'Request Item (1 Action)',ROLL_ATTACK:'Roll Attack',ACCEPT_ATTACK:'Accept Attack / prepare Dodge',ROLL_DODGE:'Roll Dodge',RESOLVE_COMBAT:'Resolve displacement',CONFIRM_CAT_DIRECTION:'Confirm Cat direction',FINISH_CAT_MOVEMENT:'Finish Cat movement',SKIP_EFFECT:'Skip remaining bonus movement'};
export function ContentPanel({state,actions,send}:Props){
 if(!state.content)return null;
 return <section aria-label="Cards and effects">
  {!state.finalDuel&&<><h2>Public Decrees</h2><div className="decrees">{state.content.decrees.map(id=>{const card=decreeCards.find(c=>c.id===id)!;return <article key={id}><strong>{card.name}</strong><p>{decreeDescription(card)}</p><p>+{card.reward} Divine Favor · {card.timing.replaceAll('_',' ')}</p></article>;})}</div><p>Items remaining: {state.content.itemDeck.length}</p></>}
  {state.content.catStep==='rolled'&&<p>Cat direction: {state.content.catDie}</p>}
  {state.content.effects[0]&&state.phase==='CONTENT_EFFECT'&&<p>{state.content.effects[0].playerId.toUpperCase()}: {state.content.effects[0].reason}, {state.content.effects[0].steps} hex(es) remaining.</p>}
  {actions.map((a,i)=>{
   let label=labels[a.type];
   if(a.type==='USE_ITEM')label=`Use ${itemCards.find(c=>c.id===a.itemId)?.name}${a.dieIndex!==undefined?` · die ${a.dieIndex+1}`:''}${a.direction?` · direction ${a.direction}`:''}${a.destination?` · (${a.destination.q}, ${a.destination.r})`:''}`;
   if(a.type==='USE_ABILITY')label=`Rat ability · die ${a.dieIndex+1}`;
   if(!label)return null;
   return <button title={a.type==='USE_ITEM'?itemCards.find(c=>c.id===a.itemId)?.description:undefined} key={i} onClick={()=>send(a)}>{a.playerId.toUpperCase()}: {label}</button>;
  })}
 </section>;
}
