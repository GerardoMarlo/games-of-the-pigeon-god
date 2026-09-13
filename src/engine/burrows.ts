import { distance,equal,hexagon,key,neighbors,type HexCoordinate } from './hex';
import { beginTurn,phase } from './turns';
import type { GameAction,GameState } from './types';

export function isBurrow(state:GameState,h:HexCoordinate):boolean {
  return !!state.board.burrows?.some(b=>equal(b.position,h));
}
export function burrowEntrances(state:GameState,position:HexCoordinate):HexCoordinate[] {
  return neighbors(position).filter(h=>{
    const t=state.board.hexes[key(h)];
    return t&&!['rock','crate','sewer'].includes(t.terrain)&&!isBurrow(state,h);
  });
}
export function placementActions(state:GameState,playerId:string):GameAction[] {
  if(state.phase!=='ARENA_SETUP'||!state.burrowPlacement||playerId!==state.activePlayerId)return [];
  const radius=state.burrowPlacement.order.length===2?2:3;
  return hexagon(3).filter(h=>{
    if(distance(h,state.board.catSpawn)!==(radius===2?3:radius)||isBurrow(state,h))return false;
    const tile=state.board.hexes[key(h)];
    if(radius===3&&(!tile||tile.terrain!=='normal'))return false;
    if(!burrowEntrances(state,h).length)return false;
    // A new perimeter Burrow must not seal an earlier player's last entrance.
    return (state.board.burrows??[]).every(b=>burrowEntrances(state,b.position).some(e=>!equal(e,h)));
  }).map(destination=>({type:'PLACE_BURROW',playerId,destination}));
}
export function beginPlacement(state:GameState):void {
  state.board.burrows=[];state.board.spawns=[];
  state.burrowPlacement={order:[...state.turnOrder],placed:[]};
  for(const id of state.turnOrder){state.players[id].currentRat.inBurrow=true;state.players[id].actionsRemaining=0;}
  state.activePlayerId=state.turnOrder[0];phase(state,'ARENA_SETUP');
}
export function placeBurrow(state:GameState,action:Extract<GameAction,{type:'PLACE_BURROW'}>):void {
  if(!placementActions(state,action.playerId).some(a=>a.type==='PLACE_BURROW'&&equal(a.destination,action.destination)))throw new Error('Illegal Burrow placement');
  const position={...action.destination},entry=burrowEntrances(state,position)[0];
  state.board.burrows!.push({position,entry,playerId:action.playerId});
  const seats=state.finalDuel?state.turnOrder:state.seatOrder;
  state.board.spawns[seats.indexOf(action.playerId)]=position;
  state.players[action.playerId].currentRat.position={...position};
  state.eventLog.push({type:'BURROW_PLACED',playerId:action.playerId,position});
  const setup=state.burrowPlacement!;setup.placed.push(action.playerId);
  if(setup.placed.length===setup.order.length){delete state.burrowPlacement;state.activePlayerId=state.turnOrder[0];beginTurn(state);}
  else state.activePlayerId=setup.order[setup.placed.length];
}
