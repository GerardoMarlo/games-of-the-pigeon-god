import {it,expect} from 'vitest';
import {createGame,dispatch,getLegalActions} from '../engine/game';
import {createMetrics} from './collector';
it('preserves metrics across reset boundaries without mutating state or RNG',()=>{
 let s=createGame({seed:99,playerCount:3});const m=createMetrics(),before=structuredClone(s);
 m.consume(s.eventLog);expect(s).toEqual(before);
 s.eventLog=[];
 for(let i=0;i<100&&s.phase!=='MATCH_END';i++){
  const actions=s.seatOrder.flatMap(id=>getLegalActions(s,id));
  const a=actions.find(a=>a.type==='END_TURN')??actions[0];s=dispatch(s,a);
  m.consume(s.eventLog);s.eventLog=[];
 }
 const r=m.report(s);expect(r.rats.filter(r=>r.segment==='arena-1')).toHaveLength(3);
 expect(r.turns.length).toBeGreaterThan(0);
 expect(r.decrees.length).toBeGreaterThanOrEqual(4);
 expect(r.rats.every(r=>r.fervorSpent>=0&&r.fervorGenerated>=0)).toBe(true);
});
