import {createGame,dispatch,getLegalActions,getVisibleState,simulateForAI,assertInvariants,placeRandomBurrow} from '../src/engine/game';
import {chooseAI} from '../src/ai/strategy';
import {createMetrics} from '../src/analytics/collector';
import versions from '../src/analytics/version.json';
import {ratCards,itemCards} from '../src/content/cards';
import {decreeCards} from '../src/content/decrees';
import {mkdirSync,writeFileSync} from 'node:fs';
export async function simulate(games:number,dir:string,firstSeed=1){
 mkdirSync(dir,{recursive:true});const results=[];
 for(let n=0;n<games;n++){
  const seed=firstSeed+n;let state=createGame({seed,playerCount:(2+n%3) as 2|3|4,mode:'ai'});
  for(const p of Object.values(state.players))p.controller='ai';
  for(const e of state.eventLog)if(e.type==='OBSERVATION')for(const p of e.players)p.controller='ai';
  const collector=createMetrics();collector.consume(state.eventLog);state.eventLog=[];
  const decisions=[];let steps=0;
  while(state.phase!=='MATCH_END'&&steps++<3000){
   const all=state.seatOrder.flatMap(id=>getLegalActions(state,id));if(!all.length)throw Error('No legal decisions seed '+seed);
   const id=all.find(a=>!['USE_ITEM','SELECT_BET'].includes(a.type))?.playerId??all[0].playerId;
   const legal=all.filter(a=>a.playerId===id);
   const action=chooseAI(getVisibleState(state,id),id,legal,a=>simulateForAI(state,id,a));
   if(!legal.some(a=>JSON.stringify(a)===JSON.stringify(action)))throw Error('Illegal AI choice seed '+seed);
   decisions.push(action.type==='PLACE_BURROW'?{type:'RANDOM_BURROW',playerId:id}:action);
   state=action.type==='PLACE_BURROW'?placeRandomBurrow(state,id):dispatch(state,action);assertInvariants(state);
   collector.consume(state.eventLog);state.eventLog=[];
  }
  if(state.phase!=='MATCH_END')throw Error('Incomplete seed '+seed);
  results.push({matchId:'simulation-'+seed,source:'simulation',...versions,...collector.report(state),decisions});
  if((n+1)%50===0){console.log((n+1)+' / '+games+' simulated Matches');await new Promise(r=>setTimeout(r,0));}
 }
 const report={runId:dir.split(/[\\/]/).at(-1),createdAt:new Date().toISOString(),games,firstSeed,...versions,ratCards:ratCards.map(r=>({id:r.id,name:r.name})),itemCards:itemCards.map(r=>({id:r.id,name:r.name})),decreeCards:decreeCards.map(r=>({id:r.id,name:r.name})),matches:results};
 writeFileSync(dir+'/simulation.json',JSON.stringify(report));
 return report;
}
