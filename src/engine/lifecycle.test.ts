import { describe,expect,it } from 'vitest';

import { createGame,dispatch,getLegalActions,assertInvariants } from './game';
import { arenaTwoOrder,checkEliminationEnd,finishArena,rankLiving } from './lifecycle';
import { distance } from './hex';
import { occupant } from './movement';

import { grantActions,endTurn } from './turns';
import type { GameState } from './types';
function placed(s:GameState):GameState {while(s.phase==='ARENA_SETUP')s=dispatch(s,getLegalActions(s,s.activePlayerId)[0]);return s;}
function game():GameState{return placed(createGame({automatic:false,content:false,seed:12345,playerCount:4}));}
function enter(s:GameState,id:string,position={q:0,r:1}):void {s.players[id].currentRat.position=position;s.players[id].currentRat.inBurrow=false;}
function eliminate(s:GameState,id:string):void {const p=s.players[id];p.currentRat.health=0;p.currentRat.alive=false;p.eliminated=true;p.eliminationRound=s.roundNumber;p.actionsRemaining=0;}
function nextArena(s:GameState):GameState {finishArena(s);s=dispatch(s,{type:'CONTINUE_ARENA',playerId:s.activePlayerId});return placed(dispatch(s,{type:'START_ARENA_2',playerId:s.activePlayerId}));}
function duel():GameState {let s=nextArena(game());finishArena(s);s=dispatch(s,{type:'CONTINUE_ARENA',playerId:s.activePlayerId});for(const id of s.finalDuel!.participants)s=dispatch(s,{type:'SELECT_DUEL_RAT',playerId:id,ratId:s.players[id].draftedRats[0].id});return placed(s);}
describe('Arena scoring and transition',()=>{
  it.each(['finishes','attacks','dodges','health'] as const)('ranks living Rats by %s in priority order',criterion=>{const s=game();if(criterion==='health')s.players.p1.currentRat.health=7;else s.players.p1[criterion]=1;expect(rankLiving(s)[0].id).toBe('p1');finishArena(s);expect(s.arenaWinnerId).toBe('p1');expect(s.players.p1.divineFavor).toBe(2);});
  it('Finishes outrank every lower criterion; eliminated players are excluded',()=>{const s=game();s.players.p1.finishes=1;s.players.p2.attacks=100;s.players.p2.dodges=100;s.players.p3.finishes=100;eliminate(s,'p3');finishArena(s);expect(s.arenaWinnerId).toBe('p1');expect(s.arenaResults[0].ranking).not.toContain('p3');});
  it('unbroken four-way tie awards nobody',()=>{const s=game();finishArena(s);expect(s.arenaWinnerId).toBeUndefined();expect(s.arenaResults[0].reason).toBe('unbroken_tie');expect(Object.values(s.players).every(p=>p.divineFavor===0)).toBe(true);});
  it('sole survivor wins immediately and scoring cannot repeat',()=>{const s=game();for(const id of ['p2','p3','p4'])eliminate(s,id);expect(checkEliminationEnd(s)).toBe(true);finishArena(s);expect(s.players.p1.divineFavor).toBe(2);expect(s.arenaResults).toHaveLength(1);});
  it('zero survivors have no winner',()=>{const s=game();for(const id of s.seatOrder)eliminate(s,id);checkEliminationEnd(s);expect(s.arenaResults[0].reason).toBe('no_survivors');expect(s.arenaWinnerId).toBeUndefined();});
  it('retains Favor and Cat Health, resets Arena resources and deploys the reserved Rat',()=>{const f=game();const first=f.players.p1.currentRat.ratId;f.players.p1.divineFavor=3;f.players.p1.attacks=8;f.players.p1.dodges=5;f.players.p1.finishes=1;f.players.p1.fervor=4;f.cat.health=4;eliminate(f,'p1');f.players.p1.betTargetPlayerId='p3';const s=nextArena(f);expect(s.arenaNumber).toBe(2);expect(s.roundNumber).toBe(1);expect(s.players.p1.currentRat.ratId).not.toBe(first);expect(s.players.p1.currentRat.health).toBe(6);expect(s.players.p1.currentRat.inBurrow).toBe(true);expect(s.players.p1.eliminated).toBe(false);expect(s.players.p1.eliminationRound).toBeUndefined();expect(s.players.p1.betTargetPlayerId).toBeUndefined();expect(s.players.p1.attacks+s.players.p1.dodges+s.players.p1.finishes+s.players.p1.fervor).toBe(0);expect(s.players.p1.divineFavor).toBe(3);expect(s.cat.health).toBe(4);assertInvariants(s);});
  it('uses least Favor and latest prior seat, then clockwise seating',()=>{const s=game();s.turnOrder=['p3','p4','p1','p2'];s.players.p1.divineFavor=1;s.players.p3.divineFavor=1;expect(arenaTwoOrder(s)).toEqual(['p2','p3','p4','p1']);s.players.p2.divineFavor=1;expect(arenaTwoOrder(s)).toEqual(['p4','p1','p2','p3']);});
  it('rejects skipping straight to Arena 2 or continuing twice',()=>{const s=game();expect(()=>dispatch(s,{type:'START_ARENA_2',playerId:s.activePlayerId})).toThrow();finishArena(s);const n=dispatch(s,{type:'CONTINUE_ARENA',playerId:s.activePlayerId});expect(()=>dispatch(n,{type:'CONTINUE_ARENA',playerId:n.activePlayerId})).toThrow();});
  it('grants Arena 2 center Fervor when Actions are granted after Cat resolution',()=>{const s=game();s.arenaNumber=2;s.cat.position={q:1,r:0};enter(s,'p1',{q:0,r:0});s.activePlayerId='p1';grantActions(s);expect(s.players.p1.fervor).toBe(1);expect(s.players.p1.actionsRemaining).toBe(2);});
  it('does not give center Fervor in Arena 1 or in a Burrow',()=>{const s=game();grantActions(s);expect(s.players[s.activePlayerId].fervor).toBe(0);s.arenaNumber=2;grantActions(s);expect(s.players[s.activePlayerId].fervor).toBe(0);});
});
describe('public elimination bets',()=>{
  it('accepts one early public bet and pays once if target wins',()=>{let s=game();eliminate(s,'p2');s=dispatch(s,{type:'SELECT_BET',playerId:'p2',targetId:'p1'});expect(()=>dispatch(s,{type:'SELECT_BET',playerId:'p2',targetId:'p3'})).toThrow();s.players.p1.attacks=1;finishArena(s);expect(s.players.p2.divineFavor).toBe(1);finishArena(s);expect(s.players.p2.divineFavor).toBe(1);});
  it('rejects late bets, self bets and eliminated targets',()=>{const s=game();s.roundNumber=4;eliminate(s,'p2');expect(()=>dispatch(s,{type:'SELECT_BET',playerId:'p2',targetId:'p1'})).toThrow();s.players.p2.eliminationRound=1;expect(()=>dispatch(s,{type:'SELECT_BET',playerId:'p2',targetId:'p2'})).toThrow();eliminate(s,'p3');expect(()=>dispatch(s,{type:'SELECT_BET',playerId:'p2',targetId:'p3'})).toThrow();});
});
describe('Match completion and Final Duel',()=>{
  it('unique highest Favor wins Match',()=>{let s=nextArena(game());s.players.p2.divineFavor=5;finishArena(s);s=dispatch(s,{type:'CONTINUE_ARENA',playerId:s.activePlayerId});expect(s.phase).toBe('MATCH_END');expect(s.winnerId).toBe('p2');expect(getLegalActions(s,'p2')).toEqual([]);});
  it('each tied player may select either Rat, and all must choose',()=>{let s=nextArena(game());finishArena(s);s=dispatch(s,{type:'CONTINUE_ARENA',playerId:s.activePlayerId});expect(s.phase).toBe('FINAL_DUEL');expect(getLegalActions(s,'p1')).toHaveLength(2);s=dispatch(s,{type:'SELECT_DUEL_RAT',playerId:'p1',ratId:s.players.p1.draftedRats[1].id});expect(s.phase).toBe('FINAL_DUEL');expect(getLegalActions(s,'p1')).toEqual([]);expect(()=>dispatch(s,{type:'SELECT_DUEL_RAT',playerId:'p2',ratId:s.players.p1.draftedRats[0].id})).toThrow();});
  it('duel resets combat resources, disables Cat and has no five-Round cap',()=>{const s=duel();expect(s.finalDuel!.attempt).toBe(1);expect(s.cat.alive).toBe(false);expect(s.phase).toBe('PLAYER_ACTION');s.roundNumber=5;s.activePlayerId=s.turnOrder.at(-1)!;enter(s,s.activePlayerId);endTurn(s);expect(s.roundNumber).toBe(6);expect(s.phase).toBe('PLAYER_ACTION');expect(getLegalActions(s,s.activePlayerId).some(a=>a.type==='ROLL_CAT_MOVEMENT')).toBe(false);});
  it('last surviving duelist wins without more Favor',()=>{const s=duel();const before=s.players.p1.divineFavor;for(const id of ['p2','p3','p4'])eliminate(s,id);checkEliminationEnd(s);expect(s.phase).toBe('MATCH_END');expect(s.winnerId).toBe('p1');expect(s.players.p1.divineFavor).toBe(before);});
  it('simultaneous elimination restarts the duel with the same chosen Rats',()=>{const s=duel();const choices={...s.finalDuel!.choices};for(const id of s.seatOrder)eliminate(s,id);checkEliminationEnd(s);expect(s.finalDuel!.attempt).toBe(2);expect(s.finalDuel!.choices).toEqual(choices);expect(Object.values(s.players).every(p=>p.currentRat.alive&&p.currentRat.health===6)).toBe(true);assertInvariants(s);});
  it('only tied players enter and dead duelists are skipped',()=>{let s=nextArena(game());s.players.p1.divineFavor=3;s.players.p3.divineFavor=3;finishArena(s);s=dispatch(s,{type:'CONTINUE_ARENA',playerId:s.activePlayerId});for(const id of ['p1','p3'])s=dispatch(s,{type:'SELECT_DUEL_RAT',playerId:id,ratId:s.players[id].draftedRats[0].id});expect(s.turnOrder).toEqual(['p1','p3']);expect(s.players.p2.currentRat.alive).toBe(false);assertInvariants(s);});
  it('duel combat treats a six as one Hit and suppresses Finish Favor',()=>{let s=duel();enter(s,'p1',{q:0,r:1});enter(s,'p2',{q:1,r:0});s.players.p1.finishes=2;s.players.p2.currentRat.health=1;s=dispatch(s,{type:'MOVE',playerId:'p1',path:[{q:1,r:0}]});s.combat!.attackerRoll=[6,1];s=dispatch(s,{type:'CONFIRM_ATTACK',playerId:'p1'});s.combat!.defenderRoll=[1,1,1];s=dispatch(s,{type:'CONFIRM_DODGE',playerId:'p2'});expect(s.players.p1.attacks).toBe(1);expect(s.players.p1.finishes).toBe(3);expect(s.players.p1.divineFavor).toBe(0);expect(s.activePlayerId).toBe('p3');expect(s.cat.alive).toBe(false);});
  it('simultaneous last-duelist combat restarts without Cat respawn',()=>{let s=duel();for(const id of ['p3','p4'])eliminate(s,id);enter(s,'p1',{q:0,r:1});enter(s,'p2',{q:1,r:0});s.players.p1.currentRat.health=1;s.players.p2.currentRat.health=1;s=dispatch(s,{type:'MOVE',playerId:'p1',path:[{q:1,r:0}]});s.combat!.attackerRoll=[4,5,6];s=dispatch(s,{type:'CONFIRM_ATTACK',playerId:'p1'});s.combat!.defenderRoll=[2,5,6];s=dispatch(s,{type:'CONFIRM_DODGE',playerId:'p2'});expect(s.finalDuel!.attempt).toBe(2);expect(s.cat.alive).toBe(false);expect(s.eventLog.filter(e=>e.type==='CAT_RESPAWNED')).toHaveLength(0);assertInvariants(s);});
});
describe('deterministic full Arena lifecycle',()=>{
  it.each([2,3,4] as const)('finishes a %i-player Match on the real board using only legal decisions',playerCount=>{
    let s=createGame({automatic:false,content:false,seed:77,playerCount});
    for(let step=0;step<800&&s.phase!=='MATCH_END';step++){
      const actions=s.seatOrder.flatMap(id=>getLegalActions(s,id)).filter(a=>a.type!=='SELECT_BET');expect(actions.length).toBeGreaterThan(0);
      let action=actions.find(a=>a.type!=='MOVE'&&a.type!=='END_TURN'&&a.type!=='SPEND_FERVOR');
      if(!action){
        const p=s.players[s.activePlayerId],moves=actions.filter(a=>a.type==='MOVE');
        action=moves.find(a=>{const target=occupant(s,a.path.at(-1)!);return target&&target!=='cat';});
        if(!action&&p.actionsRemaining===2&&moves.length){
          const targets=Object.values(s.players).filter(other=>other.id!==p.id&&other.currentRat.alive&&!other.currentRat.inBurrow).map(other=>other.currentRat.position);
          if(!targets.length)targets.push({q:0,r:0});
          moves.sort((a,b)=>Math.min(...targets.map(t=>distance(a.path.at(-1)!,t)))-Math.min(...targets.map(t=>distance(b.path.at(-1)!,t))));action=moves[0];
        }
        action??=actions.find(a=>a.type==='END_TURN')??actions[0];
      }
      s=dispatch(s,action);assertInvariants(s);
    }
    expect(s.phase).toBe('MATCH_END');expect(s.winnerId).toBeDefined();expect(s.arenaResults).toHaveLength(2);
  },30000);
});
