import { useEffect,useRef,useState } from 'react';
import type { GameState } from '../engine/types';
import { combatRecord,humanCombat,ROLL_ANIMATION_MS,COMBAT_RESULT_MS } from './combatPresentation';
export function useCombatPresentation(state:GameState,identity:object){
 const seen=useRef(state.eventLog.length),owner=useRef(identity);
 const [display,setDisplay]=useState<{state:GameState;rolling:boolean;result:boolean}|undefined>();
 const [busy,setBusy]=useState(false);
 const [processed,setProcessed]=useState(state.eventLog.length);
 useEffect(()=>{
  if(owner.current!==identity){owner.current=identity;seen.current=0;setDisplay(undefined);setBusy(false);}
  const from=seen.current;seen.current=state.eventLog.length;setProcessed(state.eventLog.length);
  const events=state.eventLog.slice(from);const resolvedOffset=events.findIndex(e=>e.type==='COMBAT_RESOLVED');
  const record=resolvedOffset>=0?combatRecord(state,from+resolvedOffset+1):state.combat;
  if(!humanCombat(state,record)){setDisplay(undefined);setBusy(false);return;}
  const rolled=events.some(e=>e.type==='ROLL'||e.type==='REROLL');const result=resolvedOffset>=0;
  if(!rolled&&!result){setDisplay(undefined);setBusy(false);return;}
  const nextTrigger=result?state.eventLog.findIndex((e,i)=>i>from+resolvedOffset&&e.type==='COMBAT_TRIGGERED'):-1;
  const snapshot={...state,eventLog:nextTrigger>=0?state.eventLog.slice(0,nextTrigger):state.eventLog,phase:'COMBAT' as const,combat:structuredClone(record)};
  setBusy(true);setDisplay({state:snapshot,rolling:rolled,result:false});
  let close:ReturnType<typeof setTimeout>|undefined;
  const reveal=()=>{setDisplay({state:snapshot,rolling:false,result});if(result)close=setTimeout(()=>{setDisplay(undefined);setBusy(false);},COMBAT_RESULT_MS);else{setDisplay(undefined);setBusy(false);}};
  const timer=setTimeout(reveal,rolled?ROLL_ANIMATION_MS:0);
  return ()=>{clearTimeout(timer);clearTimeout(close);};
 },[state.eventLog.length,identity]);
 // Hide fresh results synchronously until the effect starts the animation.
 const pending=processed!==state.eventLog.length&&humanCombat(state,state.combat??combatRecord(state));
 return {display,busy:busy||pending};
}
