import { describe, expect, it } from 'vitest';
import { attackHits, combatActor, pushbackHexes, rollResult } from './combat';
import { assertInvariants, createGame, dispatch, getLegalActions, getVisibleState } from './game';
import { neighbors, key } from './hex';
import type { GameState } from './types';

function fixture(count:2|3|4=3):GameState {
  const s=createGame({seed:12345,playerCount:count});
  s.activePlayerId='p1';s.players.p1.actionsRemaining=2;
  s.players.p1.currentRat.position={q:-2,r:0};s.players.p2.currentRat.position={q:-2,r:-1};
  return s;
}
function attack(s=fixture()):GameState {return dispatch(s,{type:'MOVE',playerId:'p1',path:[{q:-2,r:-1}]});}
// Fixed rolls are test fixtures only, never an action accepted from the UI.
function resolve(attackDice:number[],dodgeDice:number[],s=fixture()):GameState {
  let result=attack(s);result.combat!.attackerRoll=attackDice;
  result=dispatch(result,{type:'CONFIRM_ATTACK',playerId:'p1'});result.combat!.defenderRoll=dodgeDice;
  return dispatch(result,{type:'CONFIRM_DODGE',playerId:'p2'});
}
describe('combat dice (spec §§20–29, rulebook §§12–17)',()=>{
  it('4,5,6 are three hits in Arena 1 and four in Arena 2',()=>{expect(attackHits([4,5,6],1)).toBe(3);expect(attackHits([4,5,6],2)).toBe(4);});
  it('three hits versus 2,5,6 gives one damage each and two Dodges',()=>{expect(rollResult([4,5,6],[2,5,6],1)).toEqual({incoming:1,counter:1,dodges:2});const s=resolve([4,5,6],[2,5,6]);expect(s.players.p1.currentRat.health).toBe(5);expect(s.players.p2.currentRat.health).toBe(5);expect(s.players.p1.attacks).toBe(1);expect(s.players.p2.attacks).toBe(1);expect(s.players.p2.dodges).toBe(2);expect(s.players.p1.currentRat.position).toEqual({q:-2,r:0});});
  it('zero/zero and equal damage favor the defender',()=>{for(const [a,d] of [[[1,2,3],[1,2,3]],[[4,5,6],[2,5,6]]]){const s=resolve(a,d);expect(s.eventLog.find(e=>e.type==='COMBAT_RESOLVED')).toMatchObject({winnerId:'p2'});expect(s.combat).toBeUndefined();}});
  it('Dodge dice use Speed, not Attack',()=>{const s=fixture();s.players.p2.draftedRats[0].speed=5;s.players.p2.draftedRats[0].attackDice=1;const a=dispatch(attack(s),{type:'CONFIRM_ATTACK',playerId:'p1'});expect(a.combat!.defenderRoll).toHaveLength(5);});
  it('counterattacks still occur when there are no incoming hits',()=>{expect(rollResult([1,2,3],[6,6,5],1)).toEqual({incoming:0,counter:2,dodges:3});});
  it('rolls deterministically and only advances RNG for rolls',()=>{const a=attack(),b=attack();expect(a).toEqual(b);expect(a.rng.value).not.toBe(fixture().rng.value);expect(dispatch(a,{type:'CONFIRM_ATTACK',playerId:'p1'})).toEqual(dispatch(b,{type:'CONFIRM_ATTACK',playerId:'p1'}));});
});
describe('Fervor and confirmation (§§24–28; rulebook §24)',()=>{
  it('rerolls the same die repeatedly, each for one Fervor',()=>{const f=fixture();f.players.p1.fervor=2;let s=attack(f);const before=structuredClone(s);s=dispatch(s,{type:'SPEND_FERVOR',playerId:'p1',dieIndex:0});s=dispatch(s,{type:'SPEND_FERVOR',playerId:'p1',dieIndex:0});expect(s.players.p1.fervor).toBe(0);expect(s.eventLog.filter(e=>e.type==='REROLL')).toHaveLength(2);expect(before.players.p1.fervor).toBe(2);expect(()=>dispatch(s,{type:'SPEND_FERVOR',playerId:'p1',dieIndex:0})).toThrow();});
  it('rejects wrong actor, bad die indices, early Dodge and End Turn',()=>{const f=fixture();f.players.p1.fervor=3;const s=attack(f);for(const dieIndex of [-1,3,0.5,NaN])expect(()=>dispatch(s,{type:'SPEND_FERVOR',playerId:'p1',dieIndex})).toThrow();expect(()=>dispatch(s,{type:'CONFIRM_ATTACK',playerId:'p2'})).toThrow();expect(()=>dispatch(s,{type:'CONFIRM_DODGE',playerId:'p2'})).toThrow();expect(()=>dispatch(s,{type:'END_TURN',playerId:'p1'})).toThrow();});
  it('locks Attack and transfers decision to defender',()=>{const f=fixture();f.players.p1.fervor=3;f.players.p2.fervor=1;let s=dispatch(attack(f),{type:'CONFIRM_ATTACK',playerId:'p1'});const dice=[...s.combat!.attackerRoll];expect(combatActor(s)).toBe('p2');expect(getLegalActions(s,'p1')).toEqual([]);expect(()=>dispatch(s,{type:'SPEND_FERVOR',playerId:'p1',dieIndex:0})).toThrow();s=dispatch(s,{type:'SPEND_FERVOR',playerId:'p2',dieIndex:1});expect(s.combat!.attackerRoll).toEqual(dice);expect(s.players.p2.fervor).toBe(0);});
  it('awards both crossed Attack milestones exactly once',()=>{const f=fixture();f.players.p1.attacks=3;let s=resolve([4,4,4],[1,1,1],f);expect(s.players.p1.attacks).toBe(6);expect(s.players.p1.fervor).toBe(2);s=dispatch(s,getLegalActions(s,'p1')[0]);expect(s.players.p1.fervor).toBe(2);expect(()=>dispatch(s,{type:'CONFIRM_DODGE',playerId:'p2'})).toThrow();});
  it('awards Dodge milestones and Fervor for actual lost Health',()=>{const f=fixture();f.players.p2.dodges=3;const s=resolve([4,4,4],[5,5,1],f);expect(s.players.p2.dodges).toBe(5);expect(s.players.p2.fervor).toBe(3);});
  it('does not award provisional Dodge results before confirmation',()=>{const s=dispatch(attack(),{type:'CONFIRM_ATTACK',playerId:'p1'});expect(s.players.p2.dodges).toBe(0);expect(s.players.p2.fervor).toBe(0);});
});
describe('death and Finish (§§26,32–33)',()=>{
  it('both die simultaneously and both receive Finish credits',()=>{const f=fixture(2);f.players.p1.currentRat.health=1;f.players.p2.currentRat.health=1;f.players.p1.finishes=1;f.players.p2.finishes=2;const s=resolve([4,5,6],[2,5,6],f);expect(s.phase).toBe('ARENA_END');expect(s.arenaWinnerId).toBeUndefined();expect(s.players.p1.finishes).toBe(2);expect(s.players.p2.finishes).toBe(3);expect(s.players.p1.fervor).toBe(2);expect(s.players.p2.divineFavor).toBe(1);for(const p of Object.values(s.players)){expect(p.eliminated).toBe(true);expect(p.currentRat.alive).toBe(false);expect(p.actionsRemaining).toBe(0);}assertInvariants(s);});
  it('one survivor immediately stops the Arena',()=>{const f=fixture(2);f.players.p2.currentRat.health=1;const s=resolve([4,4,4],[1,1,1],f);expect(s.phase).toBe('ARENA_END');expect(s.arenaWinnerId).toBe('p1');expect(s.players.p1.finishes).toBe(1);expect(s.players.p1.divineFavor).toBe(0);expect(getLegalActions(s,'p1')).toEqual([]);});
  it('caps overkill damage, Attack credit and Health-loss Fervor',()=>{const f=fixture();f.players.p2.currentRat.health=1;const s=resolve([4,4,4],[1,1,1],f);expect(s.players.p1.attacks).toBe(1);expect(s.players.p2.fervor).toBe(1);expect(s.players.p2.currentRat.health).toBe(0);});
  it('dead attacker cannot continue and survivor keeps position',()=>{const f=fixture();f.players.p1.currentRat.health=1;const s=resolve([1,1,1],[6,1,1],f);expect(s.players.p2.finishes).toBe(1);expect(getLegalActions(s,'p1')).toEqual([]);expect(s.activePlayerId).toBe('p2');});
});
describe('corrected pushback and combat Turn completion',()=>{
  it('combat uses both Actions immediately and a tie ends the Turn',()=>{const c=attack();expect(c.players.p1.actionsRemaining).toBe(0);const s=resolve([1,1,1],[1,1,1]);expect(s.activePlayerId).toBe('p2');expect(s.players.p1.actionsRemaining).toBe(0);expect(s.players.p2.actionsRemaining).toBe(2);expect(getLegalActions(s,'p1')).toEqual([]);expect(()=>dispatch(s,{type:'MOVE',playerId:'p1',path:[{q:-3,r:0}]})).toThrow();});
  it('cannot start Rat or Cat combat with only one Action',()=>{for(const target of ['rat','cat']){const f=fixture();f.players.p1.actionsRemaining=1;if(target==='cat'){f.players.p2.currentRat.position={q:3,r:0};f.cat.position={q:-2,r:-1};}expect(()=>attack(f)).toThrow('both Actions');expect(getLegalActions(f,'p1').some(a=>a.type==='MOVE'&&key(a.path[a.path.length-1])==='-2,-1')).toBe(false);expect(getLegalActions(f,'p1').some(a=>a.type==='MOVE')).toBe(true);}});
  it('retreats just one hex on a multi-step approach, not to Move origin',()=>{const f=fixture();f.players.p1.currentRat.position={q:-3,r:1};let s=dispatch(f,{type:'MOVE',playerId:'p1',path:[{q:-3,r:0},{q:-2,r:0},{q:-2,r:-1}]});s.combat!.attackerRoll=[1,1,1];s=dispatch(s,{type:'CONFIRM_ATTACK',playerId:'p1'});s.combat!.defenderRoll=[1,1,1];s=dispatch(s,{type:'CONFIRM_DODGE',playerId:'p2'});expect(s.players.p1.currentRat.position).toEqual({q:-2,r:0});expect(s.activePlayerId).toBe('p2');});
  it('holds Turn ownership until winner selects pushback',()=>{const s=resolve([4,4,4],[1,1,1]);expect(s.activePlayerId).toBe('p1');expect(s.players.p1.actionsRemaining).toBe(0);expect(()=>dispatch(s,{type:'END_TURN',playerId:'p1'})).toThrow();const next=dispatch(s,getLegalActions(s,'p1')[0]);expect(next.activePlayerId).toBe('p2');expect(next.eventLog.filter(e=>e.type==='PHASE_CHANGED'&&e.phase==='TURN_END')).toHaveLength(1);});
  it('combat on the last seat advances the Round only once',()=>{const f=fixture();f.turnOrder=['p2','p3','p1'];const s=resolve([1,1,1],[1,1,1],f);expect(s.roundNumber).toBe(2);expect(s.activePlayerId).toBe('p2');});
  it('last-seat combat in Round five ends the Arena',()=>{const f=fixture();f.turnOrder=['p2','p3','p1'];f.roundNumber=5;const s=resolve([1,1,1],[1,1,1],f);expect(s.phase).toBe('ARENA_END');expect(s.roundNumber).toBe(5);expect(getLegalActions(s,'p1')).toEqual([]);});
  it('winner selects a legal hex and occupies the contested hex',()=>{let s=resolve([4,4,4],[1,1,1]);expect(s.combat?.stage).toBe('PUSHBACK');expect(getLegalActions(s,'p2')).toEqual([]);const action=getLegalActions(s,'p1')[0];expect(action.type).toBe('SELECT_PUSHBACK');s=dispatch(s,action);expect(s.players.p1.currentRat.position).toEqual({q:-2,r:-1});expect(s.activePlayerId).toBe('p2');expect(s.players.p1.actionsRemaining).toBe(0);assertInvariants(s);});
  it('rejects occupied, blocked, distant, sewer and outside pushback',()=>{const s=resolve([4,4,4],[1,1,1]);for(const destination of [{q:-2,r:0},{q:0,r:0},{q:-1,r:0},{q:-2,r:1},{q:-4,r:0}])expect(()=>dispatch(s,{type:'SELECT_PUSHBACK',playerId:'p1',destination})).toThrow();});
  it('Rats swap when winning attacker has no legal pushback hex',()=>{const f=fixture();for(const h of neighbors(f.players.p2.currentRat.position)){const tile=f.board.hexes[key(h)];if(tile&&key(h)!==key(f.players.p1.currentRat.position))tile.terrain='rock';}const s=resolve([4,4,4],[1,1,1],f);expect(s.combat).toBeUndefined();expect(s.players.p1.currentRat.position).toEqual({q:-2,r:-1});expect(s.players.p2.currentRat.position).toEqual({q:-2,r:0});expect(s.activePlayerId).toBe('p2');});
  it('views include public combat but never expose reserve cards or RNG',()=>{const s=attack();const view=getVisibleState(s,'p2');expect(view.combat?.attackerRoll).toEqual(s.combat?.attackerRoll);expect(view.players.find(p=>p.id==='p1')!.draftedRats).toHaveLength(1);expect(view).not.toHaveProperty('rng');view.combat!.attackerRoll[0]=99;expect(s.combat!.attackerRoll[0]).not.toBe(99);});
  it('every generated pushback remains legal on simulation',()=>{const s=resolve([4,4,4],[1,1,1]);expect(pushbackHexes(s).length).toBeGreaterThan(0);for(const action of getLegalActions(s,'p1'))assertInvariants(dispatch(s,action));});
  it('replays 200 seeded combat sequences including legal rerolls',()=>{
    for(let seed=0;seed<200;seed++){
      const f=fixture();f.rng={seed,value:seed};f.players.p1.fervor=2;f.players.p2.fervor=2;
      let a=attack(f),b=attack(f);
      for(let step=0;step<8&&a.phase==='COMBAT';step++){
        const actions=getLegalActions(a,combatActor(a));
        const action=actions.find(x=>x.type==='SPEND_FERVOR')??actions[0];
        expect(action).toBeDefined();
        a=dispatch(a,action);b=dispatch(b,action);assertInvariants(a);expect(a).toEqual(b);
      }
      expect(a.phase).not.toBe('COMBAT');
    }
  });
});
