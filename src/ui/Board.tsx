import { key } from '../engine/hex';
import type { GameAction,GameState } from '../engine/types';
interface Props {state:GameState;actions:GameAction[];send:(a:GameAction)=>void}
const points='0,-27 24,-14 24,14 0,27 -24,14 -24,-14';
export function Board({state,actions,send}:Props){
  const seats=state.finalDuel?.stage==='combat'?state.turnOrder:state.seatOrder;
  return <section><svg viewBox="-200 -175 400 350" aria-label="19-hex Arena with exterior Burrows">
    {Object.values(state.board.hexes).map(tile=>{
      const {q,r}=tile.coordinate;
      const action=actions.find(a=>a.type==='MOVE'&&key(a.path[a.path.length-1])===key(tile.coordinate)||a.type==='SELECT_PUSHBACK'&&key(a.destination)===key(tile.coordinate));
      const rat=Object.values(state.players).find(p=>p.currentRat.alive&&!p.currentRat.inBurrow&&key(p.currentRat.position)===key(tile.coordinate));
      const cat=state.cat.alive&&!state.cat.offBoard&&key(state.cat.position)===key(tile.coordinate);
      const label=rat?rat.id.toUpperCase():cat?'CAT':tile.terrain==='normal'?'':tile.terrain.toUpperCase();
      const activate=()=>{if(action)send(action);};
      return <g data-arena-hex key={key(tile.coordinate)} transform={`translate(${48*(q+r/2)},${42*r})`} role="button" tabIndex={action?0:-1} aria-disabled={!action} aria-label={`${q},${r} ${label}${action?' legal move':''}`} onClick={activate} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}}}>
        <polygon className={`${tile.terrain} ${action?'legal':''}`} points={points}/><text textAnchor="middle" dy="4">{label}</text>
      </g>;
    })}
    {state.board.burrows?.slice(0,seats.length).map((b,i)=>{
      const {q,r}=b.position,p=state.players[seats[i]],present=p.currentRat.alive&&p.currentRat.inBurrow;
      return <g key={key(b.position)} data-burrow transform={`translate(${48*(q+r/2)},${42*r})`} aria-label={`${p.id} Burrow${present?' occupied':' empty'}`}><polygon points={points} className="burrow"/><text textAnchor="middle" dy="-3">{p.id.toUpperCase()}</text><text textAnchor="middle" dy="9">{present?'IN BURROW':'BURROW'}</text></g>;
    })}
  </svg><p>19 Arena hexes; Burrows sit outside the perimeter. Enter through an empty entrance. Once inside, Rats cannot return to a Burrow.</p><p>Combat costs both Actions and ends your Turn after displacement.</p></section>;
}
