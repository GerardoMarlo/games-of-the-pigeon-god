import { key } from '../engine/hex';
import type { GameAction,GameState } from '../engine/types';
interface Props {state:GameState;actions:GameAction[];send:(a:GameAction)=>void}
const points='0,-27 24,-14 24,14 0,27 -24,14 -24,-14';
export function Board({state,actions,send}:Props){
  const seats=state.finalDuel?.stage==='combat'?state.turnOrder:state.seatOrder;
  const count=Object.keys(state.board.hexes).length;
  const candidates=actions.filter((a):a is Extract<GameAction,{type:'PLACE_BURROW'}>=>a.type==='PLACE_BURROW'&&!state.board.hexes[key(a.destination)]);
  const tiles=[...Object.values(state.board.hexes),...candidates.map(a=>({coordinate:a.destination,terrain:'normal' as const}))];
  return <section><svg viewBox="-210 -175 420 350" aria-label={`${count}-hex Arena with one-way Burrows`}>
    {tiles.map(tile=>{
      const {q,r}=tile.coordinate;
      const action=actions.find(a=>a.type==='MOVE'&&key(a.path[a.path.length-1])===key(tile.coordinate)||(a.type==='SELECT_PUSHBACK'||a.type==='PLACE_BURROW')&&key(a.destination)===key(tile.coordinate));
      const rat=Object.values(state.players).find(p=>p.currentRat.alive&&!p.currentRat.inBurrow&&key(p.currentRat.position)===key(tile.coordinate));
      const cat=state.cat.alive&&!state.cat.offBoard&&key(state.cat.position)===key(tile.coordinate);
      const label=rat?rat.id.toUpperCase():cat?'CAT':tile.terrain==='normal'?'':tile.terrain.toUpperCase();
      const activate=()=>{if(action)send(action);};
      return <g data-arena-hex={state.board.hexes[key(tile.coordinate)]?'':undefined} key={key(tile.coordinate)} transform={`translate(${48*(q+r/2)},${42*r})`} role="button" tabIndex={action?0:-1} aria-disabled={!action} aria-label={`${q},${r} ${label}${action?' legal move':''}`} onClick={activate} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}}}>
        <polygon className={`${tile.terrain} ${action?'legal':''}`} points={points}/><text textAnchor="middle" dy="4">{label}</text>
      </g>;
    })}
    {state.board.burrows?.slice(0,seats.length).map((b,i)=>{
      const {q,r}=b.position,p=state.players[b.playerId??seats[i]],present=p.currentRat.alive&&p.currentRat.inBurrow;
      return <g key={key(b.position)} data-burrow transform={`translate(${48*(q+r/2)},${42*r})`} aria-label={`${p.id} Burrow${present?' occupied':' empty'}`}><polygon points={points} className="burrow"/><text textAnchor="middle" dy="-3">{p.id.toUpperCase()}</text><text textAnchor="middle" dy="9">{present?'IN BURROW':'BURROW'}</text></g>;
    })}
  </svg><p>{count} Arena hexes; Burrows {count===19?'sit outside the perimeter':'occupy outer-ring hexes'}. Exit on your first Turn. You cannot voluntarily end a Turn in your Burrow. An entrance occupied by the Cat starts combat; a failed attack returns you to retry next Turn.</p><p>Combat costs both Actions and ends your Turn after displacement.</p></section>;
}
