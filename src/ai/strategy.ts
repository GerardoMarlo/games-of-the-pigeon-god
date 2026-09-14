import type { getVisibleState } from '../engine/game';
import { distance } from '../engine/hex';
import type { GameAction } from '../engine/types';
export type Observation=ReturnType<typeof getVisibleState>;
export const AI_WEIGHTS={damage:15,finish:100,survival:12,decree:40,favor:60,fervor:8,approach:5,center:15,catDanger:10};
function destination(a:GameAction){return a.type==='MOVE'||a.type==='EFFECT_ACTION_MOVE'?a.path.at(-1):'destination' in a?a.destination:undefined;}
export function evaluateAction(view:Observation,id:string,a:GameAction):number {
 const p=view.players.find(p=>p.id===id)!,rat=p.draftedRats.find(r=>r.id===p.currentRat.ratId)!,to=destination(a);
 const enemies=view.players.filter(o=>o.id!==id&&o.currentRat.alive&&!o.currentRat.inBurrow);
 if(a.type==='END_TURN')return p.actionsRemaining? -50:0;
 if(a.type==='SELECT_BET'){const target=view.players.find(p=>p.id===a.targetId)!;return target.currentRat.health+target.finishes*10+target.attacks;}
 if(a.type==='SELECT_DUEL_RAT'){const r=p.draftedRats.find(r=>r.id===a.ratId)!;return r.maxHealth*3+r.attackDice*4+r.speed;}
 if(a.type==='SPEND_FERVOR'){
  const c=view.combat!,attack=c.attackerId===id,die=(attack?c.attackerRoll:c.defenderRoll)[a.dieIndex];
  const opponent=view.players.find(o=>o.id===(attack?c.defenderId:c.attackerId));
  const urgent=p.currentRat.health<=1||opponent?.currentRat.health===1;
  return die>=(attack?4:5)?-100:(urgent||p.fervor>1?20: -5);
 }
 if(a.type==='USE_ABILITY')return 30;
 if(a.type==='USE_ITEM'){
  if(a.itemId==='chile')return p.fervor<2?15:-20;
  if(a.itemId==='brasa')return 4;
  if(['silbato','migajas','sardina','cascabel'].includes(a.itemId))return -5;
  return view.combat?25:6;
 }
 if(a.type==='REQUEST_ITEM')return view.publicContent?.items[id].length? -10: p.actionsRemaining===1?8:2;
 if(a.type==='SKIP_EFFECT')return -10;
 if(to){
  if(a.type==='PLACE_BURROW')return 0; // Live setup uses engine-seeded random placement.
  const enemy=enemies.find(o=>distance(o.currentRat.position,to)===0);
  if(enemy&&a.type==='MOVE'){
   const expected=rat.attackDice*(view.arenaNumber===2?2/3:0.5)-((enemy.draftedRats.find(r=>r.id===enemy.currentRat.ratId)?.speed??1)/3);
   return 30+expected*AI_WEIGHTS.damage+(enemy.currentRat.health<=Math.max(1,expected)?AI_WEIGHTS.finish:0);
  }
  const near=enemies.length?Math.min(...enemies.map(o=>distance(to,o.currentRat.position))):distance(to,{q:0,r:0});
  const cat=view.cat.alive&&distance(to,view.cat.position)<=1?AI_WEIGHTS.catDanger:0;
  if(a.type==='SELECT_PUSHBACK')return distance(to,p.currentRat.position)*3+(distance(to,view.cat.position)<=1?5:0);
  return 10-near*AI_WEIGHTS.approach-cat+(view.arenaNumber===2&&distance(to,{q:0,r:0})===0?AI_WEIGHTS.center:0);
 }
 return 0;
}
// The strategy receives only a public observation, legal actions and public simulation results.
export function chooseAI(view:Observation,id:string,actions:readonly GameAction[],preview?:(a:GameAction)=>Observation):GameAction {
 if(!actions.length)throw new Error('AI has no legal decision');
 const ranked=actions.map((a,i)=>({a,i,score:evaluateAction(view,id,a)})).sort((a,b)=>b.score-a.score||a.i-b.i);
 if(preview){
  for(const candidate of ranked.slice(0,3)){
   if(candidate.a.type!=='MOVE')continue;
   const next=preview(candidate.a),p=next.players.find(p=>p.id===id)!,old=view.players.find(p=>p.id===id)!;
   candidate.score+=(p.divineFavor-old.divineFavor)*AI_WEIGHTS.favor+(p.currentRat.health-old.currentRat.health)*AI_WEIGHTS.survival;
  }
  ranked.sort((a,b)=>b.score-a.score||a.i-b.i);
 }
 return structuredClone(ranked[0].a);
}
