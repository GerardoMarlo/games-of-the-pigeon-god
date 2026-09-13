import { hexagon, key } from '../engine/hex';
import type { BoardState, RatCard } from '../engine/types';
// Designer placeholders, not official cards or Arena geometry (spec §§12,15,95).
export const prototypeRats: RatCard[] = Array.from({length:8},(_,i)=>({id:`prototype-${i+1}`,name:`Test Rat ${i+1}`,maxHealth:6,attackDice:3,speed:3,artwork:''}));
export function prototypeBoard(): BoardState {
  const hexes: BoardState['hexes'] = Object.fromEntries(hexagon(3).map(coordinate=>[key(coordinate),{coordinate,terrain:'normal'}]));
  const spawns = [{q:-3,r:0},{q:3,r:0},{q:0,r:-3},{q:0,r:3}];
  for(const h of spawns) hexes[key(h)].terrain='spawn';
  hexes['0,0'].terrain='center'; hexes['-1,0'].terrain='rock'; hexes['1,-1'].terrain='crate';
  for(const k of ['-2,1','2,-1']) {hexes[k].terrain='sewer';hexes[k].sewerId='pair-a';}
  return {hexes,spawns,catSpawn:{q:0,r:0}};
}
