import { useEffect,useRef } from 'react';
import type { GameAction,GameState } from '../engine/types';
import { CombatPanel } from './CombatPanel';
import { ContentPanel } from './ContentPanel';
import { describeEvent } from '../engine/log';
export function CombatOverlay({state,actions,send,rolling=false,result=false}:{state:GameState;actions:GameAction[];send:(a:GameAction)=>void;rolling?:boolean;result?:boolean}){
 const panel=useRef<HTMLElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;panel.current?.focus();return ()=>previous?.focus();},[]);
 const c=state.combat;if(!c)return null;
 const moves=actions.filter(a=>a.type==='SELECT_PUSHBACK');
 const notifications=state.eventLog.slice(state.eventLog.map(e=>e.type).lastIndexOf('COMBAT_TRIGGERED')).filter(e=>['COMBAT_RESOLVED','DECREE_CLAIMED','RAT_FINISHED','CAT_FINISHED','FAVOR_CHANGED','FERVOR_CHANGED','DISPLACED'].includes(e.type));
 return <div className="combat-overlay"><section ref={panel} tabIndex={-1} onKeyDown={e=>{if(e.key!=='Tab')return;const nodes=Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]);const first=nodes[0],last=nodes[nodes.length-1];if(!first){e.preventDefault();return;}if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}} role="dialog" aria-label="Combat" aria-modal="true" className="combat-dialog" aria-busy={rolling}>
 <CombatPanel state={state} actions={rolling||result?[]:actions} dispatch={send} rolling={rolling}/>
 {rolling&&<p role="status">Rolling…</p>}
 {!rolling&&result&&<p className="result-summary" role="status">{c.winnerId?.toUpperCase()} wins · {c.attackerDamage} damage / {c.defenderDamage} counter damage</p>}
 {!rolling&&!result&&<ContentPanel state={state} actions={actions} send={send} view="actions"/>}
 {!rolling&&!result&&moves.length>0&&<div className="pushback-options"><p>Select a legal pushback hex:</p>{moves.map(a=>a.type==='SELECT_PUSHBACK'&&<button key={`${a.destination.q},${a.destination.r}`} onClick={()=>send(a)}>({a.destination.q}, {a.destination.r})</button>)}</div>}
 {!rolling&&<div className="combat-notifications" aria-live="polite">{notifications.map((e,i)=><p key={i}>{describeEvent(e)}</p>)}</div>}
 </section></div>;
}
