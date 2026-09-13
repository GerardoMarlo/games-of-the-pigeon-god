import { equal, key, neighbors, type HexCoordinate } from './hex';
import type { GameState } from './types';
export interface Step { to:HexCoordinate; cost:number; defenderId?:string }
export function occupant(state:GameState,h:HexCoordinate): string|undefined {
  if(state.cat.alive && !state.cat.offBoard && equal(state.cat.position,h)) return 'cat';
  return Object.values(state.players).find(p=>p.currentRat.alive && !p.currentRat.inBurrow && equal(p.currentRat.position,h))?.id;
}
export function empty(state:GameState,h:HexCoordinate):boolean {
  const tile=state.board.hexes[key(h)];
  return !!tile && !['rock','crate','sewer'].includes(tile.terrain) && !occupant(state,h);
}
// Sewer paths explicitly contain entrance, paired exit, and mandatory free exit.
export function traceMovement(state:GameState,playerId:string,path:HexCoordinate[]):Step[] {
  const player=state.players[playerId];
  if(!player || state.phase!=='PLAYER_ACTION' || state.activePlayerId!==playerId || player.eliminated || !player.currentRat.alive || player.actionsRemaining<1) throw new Error('Move unavailable');
  const card=player.draftedRats.find(r=>r.id===player.currentRat.ratId);
  if(!card || !path.length) throw new Error('Empty path or missing Rat');
  let current=player.currentRat.position, spent=0;
  const steps:Step[]=[];
  for(let i=0;i<path.length;i++) {
    const to=path[i],tile=state.board.hexes[key(to)];
    if(!neighbors(current).some(h=>equal(h,to)) || !tile || ['rock','crate'].includes(tile.terrain)) throw new Error('Blocked or nonadjacent path');
    if(i===0&&player.currentRat.inBurrow){
      const entrance=state.board.burrows?.find(b=>equal(b.position,current))?.entry;
      if(!entrance||!equal(to,entrance)||!empty(state,to))throw new Error('Burrow entry must be empty');
    }
    if(++spent>card.speed) throw new Error('Speed exceeded');
    if(tile.terrain==='sewer') {
      const paired=Object.values(state.board.hexes).filter(t=>t.terrain==='sewer' && t.sewerId===tile.sewerId && !equal(t.coordinate,to));
      const portal=path[++i],exit=path[++i];
      if(paired.length!==1 || !portal || !equal(portal,paired[0].coordinate) || !exit || !neighbors(portal).some(h=>equal(h,exit)) || !empty(state,exit)) throw new Error('Sewer requires paired portal and legal empty exit');
      steps.push({to,cost:1},{to:portal,cost:0},{to:exit,cost:0}); current=exit;
    } else {
      const defenderId=equal(to,player.currentRat.position)?undefined:occupant(state,to);
      if(defenderId && player.actionsRemaining<2)throw new Error('Combat requires both Actions');
      if(defenderId && i!==path.length-1) throw new Error('Movement pauses at combat');
      steps.push({to,cost:1,defenderId});current=to;
    }
  }
  return steps;
}
// Return one shortest legal path per destination; callers may submit other valid paths.
export function movementPaths(state:GameState,playerId:string):HexCoordinate[][] {
  const p=state.players[playerId];
  if(!p || state.phase!=='PLAYER_ACTION' || state.activePlayerId!==playerId || p.eliminated || !p.currentRat.alive || p.actionsRemaining<1) return [];
  const speed=p.draftedRats.find(r=>r.id===p.currentRat.ratId)?.speed??0;
  const queue=[{at:p.currentRat.position,path:[] as HexCoordinate[],cost:0}];
  const seen=new Set([key(p.currentRat.position)]), results:HexCoordinate[][]=[];
  while(queue.length) {
    const node=queue.shift()!;
    if(node.cost>=speed) continue;
    for(const to of neighbors(node.at)) {
      if(node.cost===0&&p.currentRat.inBurrow){const entrance=state.board.burrows?.find(b=>equal(b.position,node.at))?.entry;if(!entrance||!equal(to,entrance)||!empty(state,to))continue;}
      const tile=state.board.hexes[key(to)];
      if(!tile || ['rock','crate'].includes(tile.terrain)) continue;
      const extensions:HexCoordinate[][]=[];
      if(tile.terrain==='sewer') {
        const portals=Object.values(state.board.hexes).filter(t=>t.terrain==='sewer' && t.sewerId===tile.sewerId && !equal(t.coordinate,to));
        if(portals.length===1) for(const exit of neighbors(portals[0].coordinate)) if(empty(state,exit)) extensions.push([to,portals[0].coordinate,exit]);
      } else extensions.push([to]);
      for(const extension of extensions) {
        const at=extension[extension.length-1];
        if(seen.has(key(at))) continue;
        const path=[...node.path,...extension];
        if(occupant(state,at)&&p.actionsRemaining<2)continue;
        traceMovement(state,playerId,path);
        seen.add(key(at)); results.push(path);
        if(!occupant(state,at)) queue.push({at,path,cost:node.cost+1});
      }
    }
  }
  return results;
}
