import { distance,hexagon,key } from '../engine/hex';
import { shuffle,type RNGState } from '../engine/rng';
import type { BoardState } from '../engine/types';

// Owner layout correction: two seats use radius 2; three/four use radius 3.
export function generateArena(rng:RNGState,playerCount=2):BoardState {
  const radius=playerCount===2?2:3,center={q:0,r:0};
  const hexes:BoardState['hexes']=Object.fromEntries(hexagon(radius).map(coordinate=>[key(coordinate),{coordinate,terrain:'normal'}]));
  hexes['0,0'].terrain='center';
  const terrain=shuffle(rng,hexagon(radius).filter(h=>distance(h,center)===2));
  for(const h of terrain.slice(0,2)){hexes[key(h)].terrain='sewer';hexes[key(h)].sewerId='pair-a';}
  hexes[key(terrain[2])].terrain='rock';hexes[key(terrain[3])].terrain='crate';
  return {hexes,spawns:[],catSpawn:center,burrows:[]};
}
