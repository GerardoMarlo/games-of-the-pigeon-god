import type { GameAction, GameState } from '../engine/types';
interface Props { state:GameState; actions:GameAction[]; dispatch:(action:GameAction)=>void }
export function CombatPanel({state,actions,dispatch}:Props) {
  const c=state.combat;
  if(!c)return null;
  if(c.stage==='CAT_PENDING')return <section className="combat" role="status">Cat combat is the Milestone 3 boundary. Start a new prototype to resume testing.</section>;
  return <section className="combat" aria-label="Combat resolution"><h2>{c.attackerId.toUpperCase()} attacks {c.defenderId.toUpperCase()}</h2>
    <p>{c.stage==='PUSHBACK'?`${c.winnerId?.toUpperCase()} chooses pushback. Select an outlined board hex.`:`${(c.stage==='ATTACK'?c.attackerId:c.defenderId).toUpperCase()} · ${c.stage==='ATTACK'?'Attack':'Dodge'} decision`}</p>
    {(['ATTACK','DODGE'] as const).map(kind=><div key={kind}><h3>{kind==='ATTACK'?'Attack':'Dodge'} dice {kind==='ATTACK'&&c.attackerConfirmed?'· locked':''}</h3><div className="dice">{(kind==='ATTACK'?c.attackerRoll:c.defenderRoll).map((die,index)=>{const action=c.stage===kind?actions.find(a=>a.type==='SPEND_FERVOR'&&a.dieIndex===index):undefined;return <button key={index} aria-label={`${kind} die ${index+1}: ${die}${action?', reroll for 1 Fervor':''}`} disabled={!action} onClick={()=>action&&dispatch(action)}>{die}</button>;})}</div></div>)}
    {c.stage!=='PUSHBACK'&&<p>Fervor: {state.players[c.stage==='ATTACK'?c.attackerId:c.defenderId].fervor}. Select an enabled die to reroll for 1 Fervor.</p>}
    {actions.filter(a=>a.type==='CONFIRM_ATTACK'||a.type==='CONFIRM_DODGE').map(action=><button key={action.type} onClick={()=>dispatch(action)}>{action.type==='CONFIRM_ATTACK'?'Confirm Attack':'Confirm Dodge'}</button>)}
  </section>;
}
