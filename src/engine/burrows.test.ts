import { describe,expect,it } from 'vitest';
import { createGame,dispatch,getLegalActions,assertInvariants } from './game';
import { burrowEntrances,placementActions } from './burrows';
import { distance,equal,key,neighbors } from './hex';
import { empty,traceMovement } from './movement';
import type { GameState } from './types';

function placed(count:2|3|4=2,seed=7):GameState {
  let s=createGame({automatic:false,content:false,seed,playerCount:count});
  while(s.phase==='ARENA_SETUP')s=dispatch(s,getLegalActions(s,s.activePlayerId)[0]);
  return s;
}
function ready(s:GameState):void {s.phase='PLAYER_ACTION';s.players[s.activePlayerId].actionsRemaining=2;}

describe('owner-selected Burrows and board size',()=>{
  it.each([2,3,4] as const)('%i players place in Turn order on the correct board',count=>{
    let s=createGame({automatic:false,content:false,seed:7,playerCount:count});
    expect(Object.keys(s.board.hexes)).toHaveLength(count===2?19:37);
    const order=[...s.turnOrder];
    for(const id of order){
      expect(s.activePlayerId).toBe(id);expect(s.phase).toBe('ARENA_SETUP');
      expect(getLegalActions(s,order.find(other=>other!==id)!)).toEqual([]);
      const choices=getLegalActions(s,id);expect(choices.length).toBeGreaterThan(1);
      for(const a of choices){expect(a.type).toBe('PLACE_BURROW');if(a.type!=='PLACE_BURROW')continue;
        expect(distance(a.destination,{q:0,r:0})).toBe(3);
        expect(!!s.board.hexes[key(a.destination)]).toBe(count!==2);
      }
      const a=choices.at(-1)!;const before=structuredClone(s);s=dispatch(s,a);
      expect(dispatch(before,a)).toEqual(s);assertInvariants(s);
    }
    expect(s.phase).toBe('CAT_MOVEMENT');expect(s.activePlayerId).toBe(order[0]);
    expect(s.board.burrows).toHaveLength(count);
    expect(new Set(s.board.burrows!.map(b=>key(b.position))).size).toBe(count);
  });
  it('rejects wrong seat, nonperimeter and duplicate placement without mutating state',()=>{
    let s=createGame({automatic:false,content:false,seed:3,playerCount:4});const original=structuredClone(s);
    expect(()=>dispatch(s,{type:'PLACE_BURROW',playerId:s.activePlayerId,destination:{q:0,r:0}})).toThrow();
    expect(s).toEqual(original);
    const a=getLegalActions(s,s.activePlayerId)[0];s=dispatch(s,a);
    expect(()=>dispatch(s,a)).toThrow();
    if(a.type==='PLACE_BURROW')expect(()=>dispatch(s,{...a,playerId:s.activePlayerId})).toThrow();
  });
  it('allows one blocked entrance but rejects all entrances blocked',()=>{
    const s=createGame({automatic:false,content:false,seed:4,playerCount:2}),position={q:-3,r:1};
    const entrances=neighbors(position).filter(h=>s.board.hexes[key(h)]);
    expect(entrances).toHaveLength(2);
    for(const h of entrances)s.board.hexes[key(h)].terrain='normal';
    s.board.hexes[key(entrances[0])].terrain='rock';
    const allowed=()=>placementActions(s,s.activePlayerId).some(a=>a.type==='PLACE_BURROW'&&equal(a.destination,position));
    expect(allowed()).toBe(true);
    s.board.hexes[key(entrances[1])].terrain='crate';expect(allowed()).toBe(false);
  });
  it('retains connected terrain, two Sewers, rock/crate and valid entrances over 100 seeds',()=>{
    for(let seed=0;seed<100;seed++)for(const count of [2,3,4] as const){
      const s=placed(count,seed),tiles=Object.values(s.board.hexes);
      expect(tiles.filter(t=>t.terrain==='sewer')).toHaveLength(2);
      expect(tiles.filter(t=>t.terrain==='rock')).toHaveLength(1);
      expect(tiles.filter(t=>t.terrain==='crate')).toHaveLength(1);
      for(const b of s.board.burrows!)expect(burrowEntrances(s,b.position).length).toBeGreaterThan(0);
      const seen=new Set(['0,0']),queue=[s.board.catSpawn];
      while(queue.length)for(const h of neighbors(queue.shift()!)){const t=s.board.hexes[key(h)];if(t&&!['rock','crate'].includes(t.terrain)&&!seen.has(key(h))){seen.add(key(h));queue.push(h);}}
      expect(seen.size).toBe(tiles.length-2);
      for(const h of neighbors(s.board.catSpawn))expect(s.board.hexes[key(h)].terrain).toBe('normal');
      assertInvariants(s);
    }
  });
});
describe('mandatory exit and one-way movement',()=>{
  it.each([2,3,4] as const)('cannot pass in a Burrow; %i-player exits cost one Move and forbid return',count=>{
    let s=placed(count);ready(s);const id=s.activePlayerId,source={...s.players[id].currentRat.position};
    expect(getLegalActions(s,id).some(a=>a.type==='END_TURN')).toBe(false);
    expect(()=>dispatch(s,{type:'END_TURN',playerId:id})).toThrow('Must exit Burrow');
    const destination=burrowEntrances(s,source).find(h=>empty(s,h))!;
    s=dispatch(s,{type:'MOVE',playerId:id,path:[destination]});
    expect(s.players[id].actionsRemaining).toBe(1);expect(s.players[id].currentRat.inBurrow).toBe(false);
    expect(()=>dispatch(s,{type:'MOVE',playerId:id,path:[source]})).toThrow();
    expect(getLegalActions(s,id).some(a=>a.type==='END_TURN')).toBe(true);
  });
  it('Cat at the entrance permits combat; a zero-hit tie returns to Burrow and ends Turn',()=>{
    let s=placed();ready(s);const id=s.activePlayerId,source={...s.players[id].currentRat.position};
    const exit=burrowEntrances(s,source)[0];s.cat.position={...exit};
    s=dispatch(s,{type:'MOVE',playerId:id,path:[exit]});expect(s.phase).toBe('COMBAT');
    expect(s.players[id].actionsRemaining).toBe(0);s.combat!.attackerRoll=[1,1];
    s=dispatch(s,{type:'CONFIRM_ATTACK',playerId:id});
    expect(s.players[id].currentRat.position).toEqual(source);expect(s.players[id].currentRat.inBurrow).toBe(true);
    expect(s.activePlayerId).not.toBe(id);assertInvariants(s);
  });
  it('a successful attack leaves the Burrow after legal Cat pushback',()=>{
    let s=placed();ready(s);const id=s.activePlayerId,source={...s.players[id].currentRat.position};
    const exit=burrowEntrances(s,source)[0];s.cat.position={...exit};
    s=dispatch(s,{type:'MOVE',playerId:id,path:[exit]});s.combat!.attackerRoll=[4,4];
    s=dispatch(s,{type:'CONFIRM_ATTACK',playerId:id});
    const push=getLegalActions(s,id).find(a=>a.type==='SELECT_PUSHBACK');expect(push).toBeDefined();
    s=dispatch(s,push!);expect(s.players[id].currentRat.inBurrow).toBe(false);
    expect(s.players[id].currentRat.position).toEqual(exit);expect(s.activePlayerId).not.toBe(id);assertInvariants(s);
  });
  it('revalidates generated departures over 50 seeds for every board size',()=>{
    for(let seed=0;seed<50;seed++)for(const count of [2,3,4] as const){const s=placed(count,seed);ready(s);
      for(const a of getLegalActions(s,s.activePlayerId))if(a.type==='MOVE'){traceMovement(s,a.playerId,a.path);assertInvariants(dispatch(s,a));}
    }
  });
});

it('a Rat blocking the Burrow entrance can be challenged and a tie returns the attacker',()=>{
 let s=placed();ready(s);const id=s.activePlayerId,other=s.seatOrder.find(p=>p!==id)!,source={...s.players[id].currentRat.position},exit=burrowEntrances(s,source)[0];
 s.players[other].currentRat.position=exit;s.players[other].currentRat.inBurrow=false;
 s=dispatch(s,{type:'MOVE',playerId:id,path:[exit]});expect(s.combat!.defenderId).toBe(other);s.combat!.attackerRoll=[1];s=dispatch(s,{type:'CONFIRM_ATTACK',playerId:id});s.combat!.defenderRoll=[1];s=dispatch(s,{type:'CONFIRM_DODGE',playerId:other});
 expect(s.players[id].currentRat.inBurrow).toBe(true);expect(s.players[id].currentRat.position).toEqual(source);expect(s.activePlayerId).not.toBe(id);assertInvariants(s);
});
