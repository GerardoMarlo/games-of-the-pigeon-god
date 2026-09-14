import { combatActor } from '../engine/combat';
import type { GameAction, GameState } from '../engine/types';
interface Props { state:GameState; actions:GameAction[]; dispatch:(action:GameAction)=>void }
export function CombatPanel({state,actions,dispatch}:Props) {
  const c=state.combat;
  if(!c){
    const start=state.eventLog.map(e=>e.type).lastIndexOf('COMBAT_TRIGGERED');
    const rolls=state.eventLog.slice(start).filter(e=>e.type==='ROLL');
    return start<0?null:<section aria-label="Last combat dice"><h3>Last combat dice</h3>{rolls.map((e,i)=><p key={i}>{e.playerId.toUpperCase()} {e.kind.toLowerCase()}: {e.dice.join(', ')||'no dice'}</p>)}</section>;
  }
  return <section className="combat" aria-label="Combat resolution"><h2>{c.attackerId.toUpperCase()} attacks {c.defenderId.toUpperCase()}</h2>
    <p>{c.stage==='CAT_RETREAT'?`${combatActor(state).toUpperCase()} chooses an empty adjacent hex for the Cat to retreat.`:c.stage==='PUSHBACK'?`${combatActor(state).toUpperCase()} chooses where to push ${c.attackerId==='cat'&&c.winnerId!=='cat'?'the Cat':c.defenderId.toUpperCase()}. Select an outlined board hex.`:`${combatActor(state).toUpperCase()} · ${(c.stage==='BEFORE_ATTACK'?'ROLL ATTACK':c.stage==='BEFORE_DODGE'?'ROLL DODGE':c.stage.replaceAll('_',' '))}`}</p>
    {(['ATTACK','DODGE'] as const).map(kind=><div key={kind}><h3>{kind==='ATTACK'?'Attack':'Dodge'} dice {kind==='ATTACK'&&c.attackerConfirmed?'· locked':''}</h3><div className="dice">{(kind==='ATTACK'?c.attackerRoll:c.defenderRoll).map((die,index)=>{const action=c.stage===kind?actions.find(a=>a.type==='SPEND_FERVOR'&&a.dieIndex===index):undefined;return <button key={index} aria-label={`${kind} die ${index+1}: ${die}${action?', reroll for 1 Fervor':''}`} disabled={!action} onClick={()=>action&&dispatch(action)}>{die}</button>;})}</div></div>)}
    {c.stage!=='PUSHBACK'&&<p>Fervor: {state.players[c.stage==='ATTACK'?c.attackerId:c.defenderId]?.fervor??0}. Select an enabled die to reroll for 1 Fervor.</p>}
    {actions.filter(a=>a.type==='CONFIRM_ATTACK'||a.type==='CONFIRM_DODGE').map(action=><button key={action.type} onClick={()=>dispatch(action)}>{action.type==='CONFIRM_ATTACK'?'Confirm Attack':'Confirm Dodge'}</button>)}
  </section>;
}
