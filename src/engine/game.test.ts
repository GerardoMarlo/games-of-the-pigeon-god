import { legacyBoard } from '../tests/fixtures';
import { describe, expect, it } from 'vitest';
import { assertInvariants, createGame, dispatch, getLegalActions, getVisibleState, simulate } from './game';
import { distance, equal, hexagon, key, neighbors } from './hex';
import { next, rollD6, seeded, shuffle } from './rng';
import { traceMovement } from './movement';
import type { GameState } from './types';
function fixture():GameState {const s=createGame({board:legacyBoard(),seed:12345,playerCount:2});s.phase='PLAYER_ACTION';s.activePlayerId='p1';s.players.p1.actionsRemaining=2;return s;}
describe('hex math (§15)',()=>{
  it('generates 37 unique hexes at radius 3',()=>{expect(new Set(hexagon(3).map(key)).size).toBe(37);});
  it('has six adjacent neighbors',()=>{const h={q:-2,r:1};expect(neighbors(h)).toHaveLength(6);for(const n of neighbors(h)) expect(distance(h,n)).toBe(1);});
  it('calculates cube distance and rejects invalid radius',()=>{expect(distance({q:-3,r:0},{q:3,r:0})).toBe(6);expect(()=>hexagon(-1)).toThrow();});
});
describe('RNG (§§68–69)',()=>{
  it('has a stable known sequence and accepts zero',()=>{const r=seeded(12345);next(r);expect(r.value).toBe(87628868);expect(next(seeded(0))).toBeGreaterThan(0);});
  it('restores serialized state exactly',()=>{const r=seeded(123);rollD6(r);const copy=JSON.parse(JSON.stringify(r));expect(Array.from({length:100},()=>rollD6(r))).toEqual(Array.from({length:100},()=>rollD6(copy)));});
  it('shuffles deterministically without changing input',()=>{const input=[1,2,3,4,5];expect(shuffle(seeded(8),input)).toEqual(shuffle(seeded(8),input));expect(input).toEqual([1,2,3,4,5]);});
  it('rolls only 1–6',()=>{const r=seeded(5);for(let i=0;i<1000;i++){const d=rollD6(r);expect(d).toBeGreaterThanOrEqual(1);expect(d).toBeLessThanOrEqual(6);}});
});
describe('setup and Turns (§§7–14,59)',()=>{
  it.each([2,3,4] as const)('creates %i seats and clockwise seeded order',playerCount=>{const s=createGame({board:legacyBoard(),seed:41,playerCount});expect(Object.keys(s.players)).toHaveLength(playerCount);expect(Object.values(s.players).filter(p=>p.controller==='human')).toHaveLength(1);expect(s).toEqual(createGame({board:legacyBoard(),seed:41,playerCount}));assertInvariants(s);});
  it('rejects invalid seeds',()=>expect(()=>createGame({board:legacyBoard(),seed:NaN,playerCount:2})).toThrow());
  it('provides two Actions at Turn start',()=>expect(fixture().players.p1.actionsRemaining).toBe(2));
  it('advances a Round only after all seats and stops at five',()=>{let s=fixture();for(let turn=0;turn<10;turn++){expect(s.roundNumber).toBe(Math.floor(turn/2)+1);s=dispatch(s,{type:'END_TURN',playerId:s.activePlayerId});if(s.phase==='CAT_MOVEMENT'){s.phase='PLAYER_ACTION';s.players[s.activePlayerId].actionsRemaining=2;}}expect(s.phase).toBe('ARENA_END');expect(getLegalActions(s,s.activePlayerId)).toEqual([{type:'CONTINUE_ARENA',playerId:s.activePlayerId}]);});
  it('retains eliminated seats with zero Actions',()=>{let s=fixture();s.players.p2.eliminated=true;s.players.p2.currentRat.alive=false;s.players.p2.currentRat.health=0;s=dispatch(s,{type:'END_TURN',playerId:'p1'});expect(s.activePlayerId).toBe('p2');expect(s.players.p2.actionsRemaining).toBe(0);expect(getLegalActions(s,'p2')).toEqual([{type:'ROLL_CAT_MOVEMENT',playerId:'p2'}]);});
  it('hides unrevealed Rats and RNG',()=>{const view=getVisibleState(fixture(),'p2');expect(view.players.find(p=>p.id==='p1')!.draftedRats).toHaveLength(1);expect(view.players.find(p=>p.id==='p2')!.draftedRats).toHaveLength(2);expect(view).not.toHaveProperty('rng');});
});
describe('movement (§§17–19,31,46–47,82)',()=>{
  it('allows stopping early, costs one Action and leaves input unchanged',()=>{const s=fixture(),before=structuredClone(s);const after=dispatch(s,{type:'MOVE',playerId:'p1',path:[{q:-2,r:0}]});expect(after.players.p1.currentRat.position).toEqual({q:-2,r:0});expect(after.players.p1.actionsRemaining).toBe(1);expect(s).toEqual(before);});
  it.each(['rock','crate'] as const)('cannot enter or cross %s',terrain=>{const s=fixture();s.board.hexes['-2,0'].terrain=terrain;expect(()=>traceMovement(s,'p1',[{q:-2,r:0}])).toThrow();expect(()=>traceMovement(s,'p1',[{q:-2,r:0},{q:-2,r:-1}])).toThrow();});
  it('rejects empty, distant, outside or excessive paths',()=>{for(const path of [[],[{q:2,r:0}],[{q:-4,r:0}],[{q:-2,r:0},{q:-2,r:-1},{q:-1,r:-1},{q:0,r:-1}]]) expect(()=>traceMovement(fixture(),'p1',path)).toThrow();});
  it('rejects wrong player, phase and unavailable Actions',()=>{const s=fixture();expect(()=>dispatch(s,{type:'MOVE',playerId:'p2',path:[{q:2,r:0}]})).toThrow();s.players.p1.actionsRemaining=0;expect(()=>traceMovement(s,'p1',[{q:-2,r:0}])).toThrow();s.phase='COMBAT';expect(()=>dispatch(s,{type:'END_TURN',playerId:'p1'})).toThrow();});
  it.each(['rat','cat'])('pauses at %s, keeps source and consumes both Actions, cannot cross',entity=>{const s=fixture();if(entity==='rat')s.players.p2.currentRat.position={q:-2,r:0};else s.cat.position={q:-2,r:0};const a=dispatch(s,{type:'MOVE',playerId:'p1',path:[{q:-2,r:0}]});expect(a.phase).toBe('COMBAT');expect(a.players.p1.actionsRemaining).toBe(0);expect(a.players.p1.currentRat.position).toEqual({q:-3,r:0});expect(()=>traceMovement(s,'p1',[{q:-2,r:0},{q:-2,r:-1}])).toThrow();expect(getLegalActions(a,'p1')).toEqual([{type:'CONFIRM_ATTACK',playerId:'p1'}]);});
  it('teleports and exits at no additional cost',()=>{const s=fixture();s.players.p1.currentRat.position={q:-3,r:1};const path=[{q:-2,r:1},{q:2,r:-1},{q:2,r:0},{q:1,r:1},{q:0,r:1}];expect(traceMovement(s,'p1',path).reduce((sum,step)=>sum+step.cost,0)).toBe(3);const a=dispatch(s,{type:'MOVE',playerId:'p1',path});expect(a.players.p1.currentRat.position).toEqual({q:0,r:1});expect(a.players.p1.actionsRemaining).toBe(1);});
  it('requires correct portal and legal mandatory exit',()=>{const s=fixture();s.players.p1.currentRat.position={q:-3,r:1};for(const path of [[{q:-2,r:1}],[{q:-2,r:1},{q:2,r:-1}],[{q:-2,r:1},{q:2,r:-1},{q:1,r:-1}],[{q:-2,r:1},{q:2,r:-1},{q:3,r:0}]])expect(()=>traceMovement(s,'p1',path)).toThrow();});
  it('simulation and visible views cannot mutate authority',()=>{const s=fixture(),before=structuredClone(s);const a=getLegalActions(s,'p1')[0];simulate(s,a);const view=getVisibleState(s,'p1');view.players[0].currentRat.health=0;expect(s).toEqual(before);});
  it('validates every generated action across 100 seeds and 2–4 seats',()=>{for(let seed=0;seed<100;seed++)for(const playerCount of [2,3,4] as const){let s=createGame({board:legacyBoard(),seed,playerCount});for(let i=0;i<6;i++){const legal=getLegalActions(s,s.activePlayerId);for(const action of legal)assertInvariants(simulate(s,action));const move=legal.find(a=>a.type==='MOVE' && !equal(a.path[a.path.length-1],s.cat.position));s=dispatch(s,move??legal[legal.length-1]);if(s.phase==='COMBAT')break;}}},30000);
  it('replays the same action stream identically',()=>{let a=fixture(),b=fixture();for(let i=0;i<10;i++){const action=getLegalActions(a,a.activePlayerId).at(-1)!;a=dispatch(a,action);b=dispatch(b,action);}expect(a).toEqual(b);});
});

