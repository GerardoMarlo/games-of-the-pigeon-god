import {createGame,dispatch,getLegalActions,getVisibleState,simulateForAI,placeRandomBurrow} from '../src/engine/game';
import {chooseAI} from '../src/ai/strategy';
import {createMetrics} from '../src/analytics/collector';
import {checkEvents,checkSummary} from '../backend/validation.mjs';

// Exercise the server contract against real engine events, not hand-made payloads.
for(let seed=1;seed<=30;seed++){
 let state=createGame({seed,playerCount:(2+seed%3) as 2|3|4,mode:'ai'}),sequence=0;
 const metrics=createMetrics();
 function capture(){
  metrics.consume(state.eventLog,sequence*100);
  for(const event of state.eventLog){
   if(event.type==='CONTENT')continue;
   const clean=JSON.parse(JSON.stringify(event));delete clean.name;
   try{checkEvents([{sequence:sequence++,elapsedMs:100,data:{event:clean}}]);}
   catch(e){throw Error(JSON.stringify(clean)+' '+e);}
  }
  state.eventLog=[];
 }
 capture();let steps=0;
 while(state.phase!=='MATCH_END'&&steps++<3000){
  const all=state.seatOrder.flatMap(id=>getLegalActions(state,id));
  const id=all.find(a=>!['USE_ITEM','SELECT_BET'].includes(a.type))?.playerId??all[0]?.playerId;
  if(!id)throw Error('No legal action');
  const legal=all.filter(a=>a.playerId===id);
  const action=chooseAI(getVisibleState(state,id),id,legal,a=>simulateForAI(state,id,a));
  checkEvents([{sequence:sequence++,elapsedMs:100,data:{decision:JSON.parse(JSON.stringify(action))}}]);
  state=action.type==='PLACE_BURROW'?placeRandomBurrow(state,id):dispatch(state,action);capture();
 }
 checkSummary(JSON.parse(JSON.stringify({...metrics.report(state),durationMs:10000})));
}
console.log('30 complete engine Matches passed the API event and summary contracts.');
