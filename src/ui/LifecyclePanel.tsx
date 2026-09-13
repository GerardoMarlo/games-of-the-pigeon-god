import type { GameAction,GameState } from '../engine/types';
interface Props {state:GameState;actions:GameAction[];send:(a:GameAction)=>void}
export function LifecyclePanel({state,actions,send}:Props){
  return <section aria-label="Match progress">
    {state.phase==='ARENA_END'&&<p role="status">Arena {state.arenaNumber} complete. {state.arenaWinnerId?`${state.arenaWinnerId.toUpperCase()} wins +2 Divine Favor.`:'No winner; no victory Favor.'}</p>}
    {state.phase==='BETWEEN_ARENAS'&&<p>Deploy the reserved Rats for Arena 2. Favor and Cat Health carry over; trackers and Fervor reset. Center grants Fervor after Cat movement, and Attack sixes cause two Hits.</p>}
    {state.phase==='FINAL_DUEL'&&<p>Favor is tied. Each tied player chooses either of their Rats for the Final Duel.</p>}
    {state.phase==='MATCH_END'&&<h2 role="status">{state.winnerId?.toUpperCase()} wins the Match!</h2>}
    {actions.map(action=>{
      let label:string;
      switch(action.type){
        case 'CONTINUE_ARENA':label=state.arenaNumber===1?'Continue to intermission':'Resolve Match';break;
        case 'START_ARENA_2':label='Start Arena 2';break;
        case 'SELECT_DUEL_RAT':label=`${action.playerId.toUpperCase()}: choose ${state.players[action.playerId].draftedRats.find(r=>r.id===action.ratId)?.name}`;break;
        case 'SELECT_BET':label=`${action.playerId.toUpperCase()}: bet on ${action.targetId.toUpperCase()}`;break;
        default:return null;
      }
      return <button key={JSON.stringify(action)} onClick={()=>send(action)}>{label}</button>;
    })}
    {state.arenaResults.map(r=><p key={r.arenaNumber}>Arena {r.arenaNumber}: {r.winnerId?.toUpperCase()??'no winner'} · {r.reason.replaceAll('_',' ')}</p>)}
  </section>;
}
