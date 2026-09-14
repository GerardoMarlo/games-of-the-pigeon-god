import { ItemArt,DecreeArt,FavorIcon } from './Art';
import { itemCards } from '../content/cards';
import { decreeCards,decreeDescription } from '../content/decrees';
import type { GameAction,GameState } from '../engine/types';
interface Props {state:GameState;actions:GameAction[];send:(action:GameAction)=>void;view?:'decrees'|'actions'}
const labels:Record<string,string>={EFFECT_REQUEST_ITEM:'Request Item with bonus Action',REQUEST_ITEM:'Request Item (1 Action)',ROLL_ATTACK:'Roll Attack',ACCEPT_ATTACK:'Accept Attack / prepare Dodge',ROLL_DODGE:'Roll Dodge',RESOLVE_COMBAT:'Resolve displacement',CONFIRM_CAT_DIRECTION:'Keep rolled direction',FINISH_CAT_MOVEMENT:'Continue',SKIP_EFFECT:'Skip remaining bonus movement'};
export function ContentPanel({state,actions,send,view}:Props){
 if(!state.content)return null;
 return <section aria-label="Cards and effects">
  {view!=='actions'&&!state.finalDuel&&<><h2>Public Decrees</h2><div className="decrees">{state.content.decrees.map(id=>{const card=decreeCards.find(c=>c.id===id)!;return <article key={id}><DecreeArt id={id}/><strong>{card.name}</strong><p>{decreeDescription(card)}</p><p className="decree-reward"><FavorIcon/>+{card.reward} Divine Favor · {card.timing.replaceAll('_',' ')}</p></article>;})}</div><p>Items remaining: {state.content.itemDeck.length}</p></>}
  {view!=='decrees'&&state.content.catStep==='rolled'&&<p>Cat direction: {state.content.catDie}</p>}
  {view!=='decrees'&&state.content.effects[0]&&state.phase==='CONTENT_EFFECT'&&<p>{state.content.effects[0].playerId.toUpperCase()}: {state.content.effects[0].reason}, {state.content.effects[0].steps} hex(es) remaining.</p>}
  {view!=='decrees'&&actions.map((a,i)=>{
   let label=labels[a.type];
   if(a.type==='USE_ITEM')label=`Use ${itemCards.find(c=>c.id===a.itemId)?.name}${a.dieIndex!==undefined?` · die ${a.dieIndex+1}`:''}${a.direction?` · direction ${a.direction}`:''}${a.destination?` · (${a.destination.q}, ${a.destination.r})`:''}`;
   if(a.type==='USE_ABILITY')label=`Rat ability · die ${a.dieIndex+1}`;
   if(!label)return null;
   return <button className={a.type==='USE_ITEM'?'item-action':'action-button'} title={a.type==='USE_ITEM'?itemCards.find(c=>c.id===a.itemId)?.description:undefined} key={i} onClick={()=>send(a)}>{a.type==='USE_ITEM'&&<ItemArt id={a.itemId}/>}<span>{a.playerId.toUpperCase()}: {label}</span></button>;
  })}
 </section>;
}
