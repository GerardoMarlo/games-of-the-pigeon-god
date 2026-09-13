import { distance,equal,hexagon,key } from '../engine/hex';
import { shuffle,type RNGState } from '../engine/rng';
import type { BoardState } from '../engine/types';

// 19 interior hexes. Burrows are exterior locations, never added to hexes.
export function generateArena(rng:RNGState):BoardState {
  const spawns=[{q:-3,r:0},{q:3,r:0},{q:0,r:-3},{q:0,r:3}];
  const entries=[{q:-2,r:0},{q:2,r:0},{q:0,r:-2},{q:0,r:2}];
  const center={q:0,r:0};
  const hexes:BoardState['hexes']=Object.fromEntries(hexagon(2).map(coordinate=>[key(coordinate),{coordinate,terrain:'normal'}]));
  hexes['0,0'].terrain='center';
  // Keep entries and the center's neighbors clear. Random outer-ring terrain
  // preserves connectivity and legal occupied-spawn pushback for 2–4 Rats.
  const terrain=shuffle(rng,hexagon(2).filter(h=>distance(h,center)===2&&!entries.some(e=>equal(e,h))));
  for(const h of terrain.slice(0,2)){hexes[key(h)].terrain='sewer';hexes[key(h)].sewerId='pair-a';}
  hexes[key(terrain[2])].terrain='rock';hexes[key(terrain[3])].terrain='crate';
  return {hexes,spawns,catSpawn:center,burrows:spawns.map((position,i)=>({position,entry:entries[i]}))};
}
