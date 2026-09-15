import { artUrl } from '../assets';
import type { GameState } from '../engine/types';
import { resourceTokens } from './coinModel';
export function ResourceTokens({state,playerId}:{state:GameState;playerId:string}){
 const p=state.players[playerId],card=p.draftedRats.find(r=>r.id===p.currentRat.ratId)!;
 const tokens=resourceTokens(card.maxHealth,p.currentRat.health,p.fervor,state.eventLog,playerId);
 return <div className="token-row" role="group" aria-label={`${p.currentRat.health} Health, ${p.fervor} spendable Fervor`}>
 {tokens.map((t,i)=><span key={t.id} className={`coin ${t.face} ${t.extra?'bonus':''}`} title={t.extra?'Bonus Fervor — cannot become Health':t.face==='spent'?'Spent token':t.face==='health'?'Health':'Fervor'} style={{transitionDelay:`${Math.max(0,card.maxHealth-1-i)*55}ms`}} aria-hidden="true"><span className="coin-inner"><img className="coin-front" src={artUrl('health.webp')} alt=""/><img className="coin-back" src={artUrl('fervor.webp')} alt=""/></span>{t.extra&&<i>+</i>}</span>)}
 </div>;
}

