import {expect,it} from 'vitest';
import {resourceTokens} from './coinModel';
it('reflects multi-damage and spending without turning spent Fervor into Health',()=>{
 const a=resourceTokens(4,2,2,[],'p1');expect(a.map(t=>t.face)).toEqual(['health','health','fervor','fervor']);
 expect(resourceTokens(4,2,0,[],'p1').map(t=>t.face)).toEqual(['health','health','spent','spent']);
});
it('bonus Fervor adds tokens beyond max Health, and bonus-first spending removes them',()=>{
 const events=[{type:'FERVOR_CHANGED' as const,playerId:'p1',amount:2,reason:'milestone'}];
 expect(resourceTokens(3,2,3,events,'p1').filter(t=>t.extra)).toHaveLength(2);
 expect(resourceTokens(3,2,2,[...events,{type:'FERVOR_CHANGED',playerId:'p1',amount:-1,reason:'Reroll'}],'p1').filter(t=>t.extra)).toHaveLength(1);
 expect(resourceTokens(3,3,0,[...events,{type:'ARENA_STARTED',arenaNumber:2}],'p1').every(t=>t.face==='health')).toBe(true);
});

