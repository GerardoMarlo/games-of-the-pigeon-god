import { combatActor } from '../engine/combat';
import type { GameAction, GameState } from '../engine/types';
interface Props { state:GameState; actions:GameAction[]; dispatch:(action:GameAction)=>void }
export function CombatPanel({state,actions,dispatch}:Props) {
  const c=state.combat;
  if(!c)return null;
  return <section className="combat" aria-label="Combat resolution"><h2>{c.attackerId.toUpperCase()} attacks {c.defenderId.toUpperCase()}</h2>
    <p>{c.stage==='PUSHBACK'?`${combatActor(state).toUpperCase()} chooses where to push ${c.attackerId==='cat'&&c.winnerId!=='cat'?'the Cat':c.defenderId.toUpperCase()}. Select an outlined board hex.`:`${combatActor(state).toUpperCase()} · ${c.stage.replaceAll('_',' ')}`}</p>
    {(['ATTACK','DODGE'] as const).map(kind=><div key={kind}><h3>{kind==='ATTACK'?'Attack':'Dodge'} dice {kind==='ATTACK'&&c.attackerConfirmed?'· locked':''}</h3><div className="dice">{(kind==='ATTACK'?c.attackerRoll:c.defenderRoll).map((die,index)=>{const action=c.stage===kind?actions.find(a=>a.type==='SPEND_FERVOR'&&a.dieIndex===index):undefined;return <button key={index} aria-label={`${kind} die ${index+1}: ${die}${action?', reroll for 1 Fervor':''}`} disabled={!action} onClick={()=>action&&dispatch(action)}>{die}</button>;})}</div></div>)}
    {c.stage!=='PUSHBACK'&&<p>Fervor: {state.players[c.stage==='ATTACK'?c.attackerId:c.defenderId]?.fervor??0}. Select an enabled die to reroll for 1 Fervor.</p>}
    {actions.filter(a=>a.type==='CONFIRM_ATTACK'||a.type==='CONFIRM_DODGE').map(action=><button key={action.type} onClick={()=>dispatch(action)}>{action.type==='CONFIRM_ATTACK'?'Confirm Attack':'Confirm Dodge'}</button>)}
  </section>;
}
