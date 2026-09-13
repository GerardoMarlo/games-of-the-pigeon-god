import { hexagon,key } from '../engine/hex';
import type { BoardState } from '../engine/types';
// Static radius-3 board retained only for earlier combat/movement regression tests.
export function legacyBoard(): BoardState {
  const hexes: BoardState['hexes'] = Object.fromEntries(hexagon(3).map(coordinate=>[key(coordinate),{coordinate,terrain:'normal'}]));
  const spawns = [{q:-3,r:0},{q:3,r:0},{q:0,r:-3},{q:0,r:3}];
  for(const h of spawns) hexes[key(h)].terrain='spawn';
  hexes['0,0'].terrain='center'; hexes['-1,0'].terrain='rock'; hexes['1,-1'].terrain='crate';
  for(const k of ['-2,1','2,-1']) {hexes[k].terrain='sewer';hexes[k].sewerId='pair-a';}
  return {hexes,spawns,catSpawn:{q:0,r:0}};
}
