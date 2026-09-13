import { describe,it,expect } from 'vitest';
import { createGame,dispatch,getLegalActions,getVisibleState,simulateForAI,assertInvariants } from '../engine/game';
import { chooseAI } from './strategy';
import { ratCards } from '../content/cards';
import { finishArena } from '../engine/lifecycle';
import { createController } from '../controller';
import type { GameState } from '../engine/types';
function ready():GameState {let s=createGame({seed:12,playerCount:3});while(s.phase==='ARENA_SETUP')s=dispatch(s,getLegalActions(s,s.activePlayerId)[0]);return s;}
describe('Milestone 6 automatic flow',()=>{
 it('skips Cat confirmations and empty pre-roll windows',()=>{const s=ready();expect(s.phase).toBe('PLAYER_ACTION');expect(s.content?.catStep).toBeUndefined();expect(s.eventLog.filter(e=>e.type==='CAT_MOVED')).toHaveLength(1);});
 it('keeps the complete Arena layout for Arena 2',()=>{let s=ready();const board=structuredClone(s.board);finishArena(s);s=dispatch(s,{type:'CONTINUE_ARENA',playerId:s.activePlayerId});s=dispatch(s,{type:'START_ARENA_2',playerId:s.activePlayerId});expect(s.board).toEqual(board);expect(s.arenaNumber).toBe(2);expect(s.phase).not.toBe('ARENA_SETUP');});
 it('removes all movement-dependent Rats',()=>{expect(ratCards).toHaveLength(14);expect(ratCards.some(r=>['moved_attack','stationary_attack','stationary_turn_attack','moved_attack_die'].includes(r.ability))).toBe(false);});
 it('mode can switch live without changing Match state or RNG',()=>{const c=createController({seed:9,playerCount:3});const old=c.getState();c.setMode('ai');expect(c.getState().players.p2.controller).toBe('ai');expect(c.getState().rng).toEqual(old.rng);c.setMode('local');expect(Object.values(c.getState().players).every(p=>p.controller==='human')).toBe(true);});
 it('stale timeout cannot end a different decision',()=>{const c=createController({seed:9,playerCount:2});const revision=c.getRevision();c.dispatch(c.getLegalActions()[0]);const state=c.getState();c.expireTurn(revision);expect(c.getState()).toEqual(state);});
 it('AI decisions do not depend on hidden reserve identities or actual RNG',()=>{const a=ready(),b=structuredClone(a),id=a.activePlayerId;for(const p of Object.values(b.players))if(p.id!==id){const reserve=p.draftedRats.find(r=>r.id!==p.currentRat.ratId)!;reserve.name='SECRET';reserve.attackDice=999;reserve.speed=999;}b.rng.value=1;const legal=getLegalActions(a,id);expect(getVisibleState(a,id)).toEqual(getVisibleState(b,id));expect(chooseAI(getVisibleState(a,id),id,legal,x=>simulateForAI(a,id,x))).toEqual(chooseAI(getVisibleState(b,id),id,legal,x=>simulateForAI(b,id,x)));});
});
it('AI completes 1,000 seeded Matches using only engine-legal decisions',async()=>{
 for(let seed=0;seed<1000;seed++){
  if(seed%10===0)await new Promise(resolve=>setTimeout(resolve,0));
  let state=createGame({seed,playerCount:(2+seed%3) as 2|3|4,mode:'ai'});
  for(let n=0;n<1500&&state.phase!=='MATCH_END';n++){
   const all=state.seatOrder.flatMap(id=>getLegalActions(state,id));
   expect(all.length,`no actions seed ${seed}, ${state.phase}`).toBeGreaterThan(0);
   const id=all.find(a=>!['USE_ITEM','SELECT_BET'].includes(a.type))?.playerId??all[0].playerId;
   const legal=all.filter(a=>a.playerId===id);
   const action=chooseAI(getVisibleState(state,id),id,legal,a=>simulateForAI(state,id,a));
   expect(legal).toContainEqual(action);state=dispatch(state,action);assertInvariants(state);
   // Retaining bounded log history speeds stress tests; no rule depends on past log text.
   state.eventLog=state.eventLog.slice(-30);
  }
  expect(state.phase,`unfinished seed ${seed}`).toBe('MATCH_END');
 }
},300000);
