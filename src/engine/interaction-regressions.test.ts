import { it,expect } from 'vitest';
import { createGame,dispatch,getLegalActions,settle } from './game';
import { legacyBoard } from '../tests/fixtures';
import { startCombat } from './combat';
import { seeded } from './rng';
function fixture(){const s=createGame({automatic:false,seed:12345,playerCount:3,board:legacyBoard(),mode:'ai'});s.automatic=true;s.activePlayerId='p2';s.phase='PLAYER_ACTION';s.cat.position={q:0,r:0};s.players.p2.currentRat.position={q:-2,r:0};s.players.p1.currentRat.position={q:-2,r:-1};s.players.p2.actionsRemaining=2;s.content!.decrees=[];s.content!.decreeDeck=[];for(const p of Object.values(s.players)){p.fervor=0;delete p.draftedRats[0].ability;}return s;}
it('pauses legal actions and automatic Cat movement until an eliminated player bets',()=>{const s=fixture();s.phase='CAT_MOVEMENT';s.players.p1.currentRat.alive=false;s.players.p1.currentRat.health=0;s.players.p1.eliminated=true;s.players.p1.eliminationRound=2;const rng=structuredClone(s.rng);expect(getLegalActions(s,'p2')).toEqual([]);expect(getLegalActions(s,'p1').every(a=>a.type==='SELECT_BET')).toBe(true);expect(settle(s).rng).toEqual(rng);expect(()=>dispatch(s,{type:'ROLL_CAT_MOVEMENT',playerId:'p2'})).toThrow(/bet/);const r=dispatch(s,{type:'SELECT_BET',playerId:'p1',targetId:'p2'});expect(r.players.p1.betTargetPlayerId).toBe('p2');expect(r.eventLog.some(e=>e.type==='CAT_MOVED')).toBe(true);});
it('never auto-confirms a human lethal Dodge while existing Fervor can reroll it',()=>{let s=fixture();s.players.p1.currentRat.health=1;s.players.p1.fervor=1;startCombat(s,'p1',{q:-2,r:0},{q:-2,r:-1});s.combat!.attackerRoll=[6];s.combat!.attackerConfirmed=true;s.combat!.stage='BEFORE_DODGE';s.players.p1.draftedRats[0].speed=1;s.rng=seeded(0);s=dispatch(s,{type:'ROLL_DODGE',playerId:'p1'});expect(s.combat!.stage).toBe('DODGE');expect(s.players.p1.currentRat.alive).toBe(true);expect(getLegalActions(s,'p1')).toContainEqual({type:'SPEND_FERVOR',playerId:'p1',dieIndex:0});expect(s.combat!.defenderRoll).toEqual([2]);s.rng=seeded(1500);s=dispatch(s,{type:'SPEND_FERVOR',playerId:'p1',dieIndex:0});expect(s.players.p1.currentRat.health).toBe(1);expect(s.players.p1.currentRat.alive).toBe(true);expect(s.eventLog).toContainEqual({type:'REROLL',playerId:'p1',kind:'DODGE',index:0,before:2,after:5});});
it.each([1,2] as const)('explains the pictured six versus 5,3,4 in Arena %i',arena=>{let s=fixture();s.automatic=false;s.arenaNumber=arena;s.players.p1.currentRat.health=3;startCombat(s,'p1',{q:-2,r:0},{q:-2,r:-1});s.combat!.attackerRoll=[6];s.combat!.attackerConfirmed=true;s.combat!.defenderRoll=[5,3,4];s.combat!.stage='DODGE';s=dispatch(s,{type:'CONFIRM_DODGE',playerId:'p1'});expect(s.players.p1.currentRat.health).toBe(arena===2?2:3);expect(s.eventLog).toContainEqual({type:'COMBAT_MATH',arena,hits:arena===2?2:1,canceled:1,counter:0});});


import {finishArena} from './lifecycle';
it('clears Item Cat movement at Arena transition so the next Rat receives its Actions',()=>{
 let s=createGame({seed:716,playerCount:3,mode:'ai'});
 while(s.phase==='ARENA_SETUP')s=dispatch(s,getLegalActions(s,s.activePlayerId)[0]);
 s.content!.catItemMovement=true;
 finishArena(s);
 s=dispatch(s,{type:'CONTINUE_ARENA',playerId:s.activePlayerId});
 s=dispatch(s,{type:'START_ARENA_2',playerId:s.activePlayerId});
 expect(s.content!.catItemMovement).toBeUndefined();
 expect(s.players[s.activePlayerId].actionsRemaining).toBe(2);
 expect(getLegalActions(s,s.activePlayerId).length).toBeGreaterThan(0);
});
