import { describe,expect,it } from 'vitest';
import { createGame,dispatch,getLegalActions,assertInvariants } from './game';
import { carryCatToArena,respawnCat } from './cat';
import { attackHits,combatActor,startCombat } from './combat';
import { directions,key } from './hex';
import { rollD6,seeded } from './rng';
import type { GameState } from './types';
function fixture():GameState {return createGame({seed:12345,playerCount:3});}
function forceDirection(s:GameState,die:number):void {for(let seed=0;;seed++){const rng=seeded(seed);if(rollD6(rng)===die){s.rng=seeded(seed);return;}}}
function catFight(s=fixture()):GameState {
  s.players.p2.currentRat.position={q:1,r:0};forceDirection(s,1);
  return dispatch(s,{type:'ROLL_CAT_MOVEMENT',playerId:s.activePlayerId});
}
function resolveCat(attack:number[],dodge:number[],s=fixture()):GameState {
  const c=catFight(s);c.combat!.attackerRoll=attack;c.combat!.defenderRoll=dodge;
  return dispatch(c,{type:'CONFIRM_DODGE',playerId:'p2'});
}
describe('Attack stat clarification',()=>{
  it.each([1,2,3,4,5])('Attack %i rolls exactly that many dice',count=>{const s=fixture();s.phase='PLAYER_ACTION';s.players.p1.actionsRemaining=2;s.players.p1.currentRat.position={q:2,r:0};s.players.p1.draftedRats[0].attackDice=count;const c=dispatch(s,{type:'MOVE',playerId:'p1',path:[{q:3,r:0}]});expect(c.combat!.attackerRoll).toHaveLength(count);});
  it('4 is a hit, 3 is a miss, Arena 2 six is two hits',()=>{expect(attackHits([4],1)).toBe(1);expect(attackHits([3],1)).toBe(0);expect(attackHits([4,5,6],1)).toBe(3);expect(attackHits([4,5,6],2)).toBe(4);});
});
describe('Cat Turn lifecycle',()=>{
  it('requires one Cat roll before granting Actions',()=>{const s=fixture();expect(s.phase).toBe('CAT_MOVEMENT');expect(s.players.p1.actionsRemaining).toBe(0);expect(getLegalActions(s,'p1')).toEqual([{type:'ROLL_CAT_MOVEMENT',playerId:'p1'}]);forceDirection(s,1);const a=dispatch(s,{type:'ROLL_CAT_MOVEMENT',playerId:'p1'});expect(a.phase).toBe('PLAYER_ACTION');expect(a.players.p1.actionsRemaining).toBe(2);expect(a.cat.position).toEqual({q:1,r:0});expect(()=>dispatch(a,{type:'ROLL_CAT_MOVEMENT',playerId:'p1'})).toThrow();});
  it('rejects wrong player and premature movement',()=>{const s=fixture();expect(()=>dispatch(s,{type:'ROLL_CAT_MOVEMENT',playerId:'p2'})).toThrow();expect(()=>dispatch(s,{type:'MOVE',playerId:'p1',path:[{q:-2,r:0}]})).toThrow();});
  it.each([1,2,3,4,5,6])('maps die %i to one axial step',die=>{const s=fixture();for(const tile of Object.values(s.board.hexes))if(tile.terrain==='rock'||tile.terrain==='crate')tile.terrain='normal';forceDirection(s,die);const a=dispatch(s,{type:'ROLL_CAT_MOVEMENT',playerId:'p1'});expect(a.cat.position).toEqual(directions[die-1]);});
  it('blocked direction consumes roll without moving Cat',()=>{const s=fixture();forceDirection(s,4);const a=dispatch(s,{type:'ROLL_CAT_MOVEMENT',playerId:'p1'});expect(a.cat.position).toEqual({q:0,r:0});expect(a.phase).toBe('PLAYER_ACTION');});
  it('out-of-bounds respawn preserves surviving Health',()=>{const s=fixture();s.cat.position={q:3,r:-1};s.cat.health=4;forceDirection(s,1);const a=dispatch(s,{type:'ROLL_CAT_MOVEMENT',playerId:'p1'});expect(a.cat.position).toEqual({q:0,r:0});expect(a.cat.health).toBe(4);});
  it('eliminated player moves Cat exactly once and ends Turn',()=>{const s=fixture();s.players.p1.currentRat.alive=false;s.players.p1.currentRat.health=0;s.players.p1.eliminated=true;forceDirection(s,1);const a=dispatch(s,{type:'ROLL_CAT_MOVEMENT',playerId:'p1'});expect(a.activePlayerId).toBe('p2');expect(a.phase).toBe('CAT_MOVEMENT');expect(a.eventLog.filter(e=>e.type==='CAT_MOVED')).toHaveLength(1);expect(a.players.p1.actionsRemaining).toBe(0);});
});
describe('shared Cat combat',()=>{
  it('Cat rolls three Attack dice, locks attack and uses Rat Speed for Dodge',()=>{const s=catFight();expect(s.combat!.attackerRoll).toHaveLength(3);expect(s.combat!.attackerConfirmed).toBe(true);expect(s.combat!.defenderRoll).toHaveLength(s.players.p2.draftedRats[0].speed);expect(combatActor(s)).toBe('p2');expect(()=>dispatch(s,{type:'SPEND_FERVOR',playerId:'cat',dieIndex:0})).toThrow();});
  it('winning Cat pushes forward and living roller then receives two Actions',()=>{const s=resolveCat([4,4,4],[1,1,1]);expect(s.cat.position).toEqual({q:1,r:0});expect(s.players.p2.currentRat.position).toEqual({q:2,r:0});expect(s.phase).toBe('PLAYER_ACTION');expect(s.players.p1.actionsRemaining).toBe(2);});
  it('blocked forward push makes Cat retreat instead of swapping',()=>{const f=fixture();f.board.hexes['2,0'].terrain='rock';const s=resolveCat([4,4,4],[1,1,1],f);expect(s.cat.position).toEqual({q:0,r:0});expect(s.players.p2.currentRat.position).toEqual({q:1,r:0});});
  it('counterattacks damage Cat and winning Rat chooses its pushback',()=>{let s=resolveCat([1,1,1],[6,1,1]);expect(s.cat.health).toBe(8);expect(s.players.p2.attacks).toBe(1);expect(s.combat!.stage).toBe('PUSHBACK');const action=getLegalActions(s,'p2')[0];expect(action.type).toBe('SELECT_PUSHBACK');s=dispatch(s,action);expect(s.phase).toBe('PLAYER_ACTION');expect(s.players.p1.actionsRemaining).toBe(2);assertInvariants(s);});
  it('Rat attacking Cat rolls its own Attack and Cat never Dodges',()=>{const f=fixture();f.phase='PLAYER_ACTION';f.players.p1.actionsRemaining=2;f.players.p1.currentRat.position={q:0,r:1};let s=dispatch(f,{type:'MOVE',playerId:'p1',path:[{q:0,r:0}]});expect(s.combat!.attackerRoll).toHaveLength(2);s.combat!.attackerRoll=[4,4];s=dispatch(s,{type:'CONFIRM_ATTACK',playerId:'p1'});expect(s.cat.health).toBe(7);expect(s.eventLog.some(e=>e.type==='ROLL'&&e.playerId==='cat'&&e.kind==='DODGE')).toBe(false);expect(s.combat!.stage).toBe('PUSHBACK');s=dispatch(s,getLegalActions(s,'p1')[0]);expect(s.activePlayerId).toBe('p2');expect(s.phase).toBe('CAT_MOVEMENT');expect(s.players.p1.actionsRemaining).toBe(0);});
  it('killing Cat by counterattack grants Finish and respawns at nine',()=>{const f=fixture();f.cat.health=1;const s=resolveCat([1,1,1],[6,1,1],f);expect(s.players.p2.finishes).toBe(1);expect(s.cat.health).toBe(9);expect(s.cat.position).toEqual({q:0,r:0});expect(s.cat.alive).toBe(true);});
  it('eliminated roller earns Favor for a Cat Finish',()=>{const f=fixture();f.players.p1.eliminated=true;f.players.p1.currentRat.alive=false;f.players.p1.currentRat.health=0;f.players.p2.currentRat.health=1;const s=resolveCat([4,4,4],[1,1,1],f);expect(s.players.p1.divineFavor).toBe(1);expect(s.players.p2.eliminated).toBe(true);expect(s.phase).toBe('ARENA_END');});
  it('living roller receives no Cat Finish Favor',()=>{const f=fixture();f.players.p2.currentRat.health=1;const s=resolveCat([4,4,4],[1,1,1],f);expect(s.players.p1.divineFavor).toBe(0);});
  it('Cat uses brutal sixes in Arena 2',()=>{const f=fixture();f.arenaNumber=2;const s=resolveCat([6,1,1],[1,1,1],f);expect(s.players.p2.currentRat.health).toBe(4);});
});
describe('respawn and persistence',()=>{
  it('does not grant eliminated-player Favor when the roller was alive before the roll',()=>{const f=fixture();f.players.p1.currentRat.position={q:1,r:0};f.players.p1.currentRat.health=1;forceDirection(f,1);let s=dispatch(f,{type:'ROLL_CAT_MOVEMENT',playerId:'p1'});s.combat!.attackerRoll=[4,4,4];s.combat!.defenderRoll=[1,1,1];s=dispatch(s,{type:'CONFIRM_DODGE',playerId:'p1'});expect(s.players.p1.divineFavor).toBe(0);expect(s.activePlayerId).toBe('p2');});
  it('surviving Health carries into repositioning for another Arena',()=>{const s=fixture();s.cat.health=4;s.cat.position={q:1,r:0};carryCatToArena(s);expect(s.cat.health).toBe(4);expect(s.cat.position).toEqual(s.board.catSpawn);});
  it('occupied respawn triggers combat and Rat chooses losing Cat pushback',()=>{const s=fixture();s.players.p2.currentRat.position={q:0,r:0};s.cat.health=0;s.cat.alive=false;expect(respawnCat(s,true,'actions')).toBe(true);expect(s.cat.health).toBe(9);expect(s.cat.offBoard).toBe(true);s.combat!.attackerRoll=[1,1,1];s.combat!.defenderRoll=[1,1,1];let a=dispatch(s,{type:'CONFIRM_DODGE',playerId:'p2'});const legal=getLegalActions(a,'p2');expect(legal.length).toBeGreaterThan(0);a=dispatch(a,legal[0]);expect(a.cat.offBoard).toBe(false);expect(key(a.cat.position)).not.toBe('0,0');assertInvariants(a);});
  it('occupied respawn winning Cat offers Rat displacement before capture',()=>{const s=fixture();s.players.p2.currentRat.position={q:0,r:0};respawnCat(s,true,'actions');s.combat!.attackerRoll=[4,4,4];s.combat!.defenderRoll=[1,1,1];let a=dispatch(s,{type:'CONFIRM_DODGE',playerId:'p2'});expect(a.combat!.winnerId).toBe('cat');a=dispatch(a,getLegalActions(a,'p1')[0]);expect(a.cat.position).toEqual({q:0,r:0});assertInvariants(a);});
  it('Cat death from a Rat Move can respawn into another Rat without replaying movement',()=>{const s=fixture();s.phase='PLAYER_ACTION';s.players.p1.actionsRemaining=2;s.players.p1.currentRat.position={q:1,r:0};s.cat.position={q:2,r:0};s.cat.health=1;s.players.p2.currentRat.position={q:0,r:0};startCombat(s,'cat',{q:1,r:0},{q:2,r:0});s.combat!.attackerRoll=[4,4];let a=dispatch(s,{type:'CONFIRM_ATTACK',playerId:'p1'});expect(a.players.p1.finishes).toBe(1);expect(a.combat!.origin).toBe('cat_respawn');expect(a.players.p1.currentRat.position).toEqual({q:2,r:0});a.combat!.attackerRoll=[1,1,1];a.combat!.defenderRoll=[1,1,1];a=dispatch(a,{type:'CONFIRM_DODGE',playerId:'p2'});a=dispatch(a,getLegalActions(a,'p2')[0]);expect(a.activePlayerId).toBe('p2');expect(a.eventLog.filter(e=>e.type==='CAT_MOVED')).toHaveLength(0);assertInvariants(a);});
});
describe('integrated seeded legality',()=>{
  it('replays 100 sequences of Cat and Rat actions without missing decisions',()=>{
    for(let seed=0;seed<100;seed++){
      let s=createGame({seed,playerCount:4});
      for(let step=0;step<60&&s.phase!=='ARENA_END';step++){
        const actions=getLegalActions(s,combatActor(s));expect(actions.length).toBeGreaterThan(0);
        const action=actions[seed%actions.length];const before=structuredClone(s);
        const next=dispatch(s,action);expect(dispatch(before,action)).toEqual(next);assertInvariants(next);s=next;
      }
    }
  },30000);
});
