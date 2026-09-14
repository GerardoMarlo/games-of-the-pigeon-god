import { useEffect,useRef,useState } from 'react';
import type { GameState,GameEvent } from '../engine/types';
import { DecreeArt,FavorIcon } from './Art';
import type { CSSProperties } from 'react';
type Claim=Extract<GameEvent,{type:'DECREE_CLAIMED'}>&{left:number;top:number;dx:number;dy:number};
export function useCelebrations(state:GameState){
 const seen=useRef(state.eventLog.length);const [winners,setWinners]=useState<string[]>([]),[claims,setClaims]=useState<Claim[]>([]);
 const timers=useRef<ReturnType<typeof setTimeout>[]>([]);
 const latest=useRef<Record<string,number>>({});
 useEffect(()=>{const events=state.eventLog.slice(seen.current>state.eventLog.length?0:seen.current);seen.current=state.eventLog.length;
 const won=events.filter(e=>e.type==='COMBAT_RESOLVED').map(e=>e.winnerId);
 const claimed=events.filter((e):e is Extract<GameEvent,{type:'DECREE_CLAIMED'}>=>e.type==='DECREE_CLAIMED').map(e=>{const from=document.querySelectorAll('.decrees article')[e.slot]?.getBoundingClientRect();const to=document.querySelector(`[data-entity="${e.playerId}"]`)?.getBoundingClientRect();const left=from?.left??innerWidth/2,top=from?.top??100;return {...e,left,top,dx:(to?.left??left)-left,dy:(to?.top??top+200)-top};});
 if(won.length||claimed.length){const revision=state.eventLog.length;won.forEach(id=>{latest.current[id]=revision;});setWinners(old=>[...new Set([...old,...won])]);setClaims(old=>[...old,...claimed]);timers.current.push(setTimeout(()=>{setWinners(old=>old.filter(id=>!won.includes(id)||latest.current[id]!==revision));setClaims(old=>old.filter(c=>!claimed.includes(c)));},2000));}
 },[state.eventLog.length]);
 useEffect(()=>()=>timers.current.forEach(clearTimeout),[]);
 return {winners,claims};
}
export function Celebrations({claims}:{claims:Claim[]}){return <><div className="claim-notices" role="status">{claims.map(c=><p key={c.cardId}><FavorIcon/><strong>{c.playerId.toUpperCase()} completed {c.name}</strong> · +{c.reward} Divine Favor</p>)}</div>{claims.map(c=><div aria-hidden="true" key={c.cardId} className="flying-decree" style={{left:c.left,top:c.top,'--fly-x':`${c.dx}px`,'--fly-y':`${c.dy}px`} as CSSProperties}><DecreeArt id={c.cardId}/><strong>{c.name}</strong><FavorIcon/></div>)}</>;}
