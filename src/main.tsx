import { CombatOverlay } from './ui/CombatOverlay';
import { useCombatPresentation } from './ui/useCombatPresentation';
import { humanCombat } from './ui/combatPresentation';
import { useCelebrations,Celebrations } from './ui/useCelebrations';
import { PlayerHUD } from './ui/PlayerHUD';
import { ItemArt,FavorIcon } from './ui/Art';
import { ContentPanel } from './ui/ContentPanel';
import { itemCards } from './content/cards';
import React, { useState,useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createController } from './controller';
import { Board } from './ui/Board';
import { LifecyclePanel } from './ui/LifecyclePanel';
import './style.css';
import { CombatPanel } from './ui/CombatPanel';
import { describeEvent } from './engine/log';
import type { GameAction } from './engine/types';
function App() {
  const [controller,setController]=useState(()=>createController({seed:12345,playerCount:2}));
  const [,refresh]=useState(0);
  const [seed,setSeed]=useState('12345'),[count,setCount]=useState<2|3|4>(2),[error,setError]=useState('');
  const [mode,setMode]=useState<'local'|'ai'>('local');
  const [selected,setSelected]=useState('p1'),[settings,setSettings]=useState(false),[help,setHelp]=useState(false);
  useEffect(()=>{
    if(!settings&&!help)return;
    const previous=document.activeElement as HTMLElement|null;
    const modal=document.querySelector<HTMLElement>('[role="dialog"]');
    modal?.querySelector<HTMLElement>('button')?.focus();
    const keyboard=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){setHelp(false);setSettings(false);}
      if(e.key!=='Tab'||!modal)return;
      const controls=Array.from(modal.querySelectorAll<HTMLElement>('button,input,select,[tabindex="0"]'));
      const first=controls[0],last=controls[controls.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    };
    document.addEventListener('keydown',keyboard);
    return ()=>{document.removeEventListener('keydown',keyboard);previous?.focus();};
  },[settings,help]);
  const [countdown,setCountdown]=useState<number|undefined>();
  useEffect(()=>controller.subscribe(()=>refresh(n=>n+1)),[controller]);
  const state=controller.getState(),actions=controller.getLegalActions();
  const revision=controller.getRevision();
  const celebrations=useCelebrations(state);
  const presentation=useCombatPresentation(state,controller);
  const overlayState=presentation.display?.state??(humanCombat(state,state.combat)?state:undefined);
  const boardActions=overlayState||presentation.busy?[]:actions;
  useEffect(()=>{
    if(presentation.busy){setCountdown(undefined);return;}
    const ai=setTimeout(()=>{try{controller.aiStep();}catch(e){setError(String(e));}},1100);
    const p=state.players[state.activePlayerId];let timer:ReturnType<typeof setTimeout>|undefined,interval:ReturnType<typeof setInterval>|undefined;
    if(state.phase==='PLAYER_ACTION'&&p.actionsRemaining===0&&!p.currentRat.inBurrow&&p.controller==='human'){
      setCountdown(5);interval=setInterval(()=>setCountdown(n=>n===undefined?undefined:Math.max(0,n-1)),1000);timer=setTimeout(()=>controller.expireTurn(revision),5000);
    }else setCountdown(undefined);
    return ()=>{clearTimeout(ai);if(timer)clearTimeout(timer);if(interval)clearInterval(interval);};
  },[controller,revision,presentation.busy]);
  const send=(action:GameAction)=>{try{controller.dispatch(action);setError('');refresh(n=>n+1);}catch(e){setError(String(e));}};
  const current=state.players[selected]??state.players.p1;
  const recent=state.eventLog.slice(-5);
  const phaseText=state.phase==='ARENA_SETUP'?`${state.activePlayerId.toUpperCase()}, choose your Burrow`:state.phase==='PLAYER_ACTION'?`${state.activePlayerId.toUpperCase()}'s Turn`:state.phase==='COMBAT'?'Clash in the Arena':state.phase.replaceAll('_',' ').toLowerCase();
  return <main><Celebrations claims={celebrations.claims}/>{overlayState&&<CombatOverlay state={overlayState} actions={presentation.busy?[]:actions} send={send} rolling={presentation.display?.rolling??presentation.busy} result={presentation.display?.result}/> }
    <header className="masthead"><div className="brand"><FavorIcon/><div><span className="eyebrow">THE GAMES OF THE</span><h1>Pigeon God</h1></div></div><nav><button onClick={()=>setHelp(true)}>How to play</button><button onClick={()=>setSettings(true)}>Match settings</button><span className="mode-tag">{state.mode==='ai'?'Human vs AI':'Local multiplayer'}</span></nav></header>
    <div className="match-bar"><div><span className="eyebrow">{state.finalDuel?'SUDDEN DEATH':'THE ARENA AWAITS'}</span><h2>{state.finalDuel?'Final Duel':`Arena ${state.arenaNumber}`} <span>/ {state.finalDuel?'Last Rat standing':'2'}</span></h2></div><div className="rounds"><span>ROUND {state.roundNumber} / {state.finalDuel?'∞':'5'}</span><div>{[1,2,3,4,5].map(n=><i key={n} className={n<=state.roundNumber?'filled':''}/>)}</div></div><div className="turn-order"><span>TURN ORDER</span><p>{state.turnOrder.map(id=><b className={id===state.activePlayerId?'active':''} key={id}>{id.toUpperCase()}</b>)}</p></div><div className="cat-status"><img src="/art/cat.webp" alt="Cat"/><span>THE CAT<br/><b>{state.cat.health} / 9 Health</b><small>4 Attack dice</small></span></div></div>
    <ContentPanel state={state} actions={actions} send={send} view="decrees"/>
    {error&&<p role="alert" className="error">{error}</p>}
    <div className="game-layout"><PlayerHUD state={state} selected={selected} onSelect={setSelected}/><div className="arena-column"><div className="turn-banner"><div><span className="eyebrow">{state.mode==='ai'&&state.players[state.activePlayerId].controller==='ai'?'AI OPPONENT':'YOUR NEXT DECISION'}</span><h2>{phaseText}</h2></div><span className="action-count">{state.players[state.activePlayerId].actionsRemaining} Actions</span></div>
    <Board winners={celebrations.winners} state={state} actions={boardActions} send={send} selected={selected} onSelect={setSelected}/>
    <div className="decision-panel"><p className="countdown" role="status">{countdown!==undefined?`Turn ends in ${countdown}s — use an Item or end early.`:state.phase==='PLAYER_ACTION'?'Choose a highlighted hex to move. Hover to preview the approach.':state.phase==='ARENA_SETUP'?'Choose a highlighted location. Burrows are one-way; leave on your first Turn.':''}</p>{!overlayState&&<><CombatPanel state={state} actions={actions} dispatch={send}/><ContentPanel state={state} actions={actions} send={send} view="actions"/></>}<LifecyclePanel state={state} actions={actions} send={send}/>{!overlayState&&actions.some(a=>a.type==='END_TURN')&&<button className="end-turn" onClick={()=>send({type:'END_TURN',playerId:state.activePlayerId})}>End Turn →</button>}</div></div>
    <aside className="side-panel"><span className="eyebrow">SELECTED GLADIATOR</span><h2>{current.draftedRats.find(r=>r.id===current.currentRat.ratId)?.name}</h2><p>{current.draftedRats.find(r=>r.id===current.currentRat.ratId)?.description}</p><h3>Equipped Items</h3>{state.content?.players[current.id].items.length?state.content.players[current.id].items.map(id=><article className="inventory-card" key={id}><ItemArt id={id}/><strong>{itemCards.find(c=>c.id===id)?.name}</strong><p>{itemCards.find(c=>c.id===id)?.description}</p></article>):<p className="empty-slot">No Item equipped<br/><small>Request one for 1 Action.</small></p>}<h3>Arena chronicle</h3><div className="chronicle" aria-live="polite">{recent.map((e,i)=><p key={`${state.eventLog.length}-${i}`}>{describeEvent(e)}</p>)}</div><details><summary>Full game log · {state.eventLog.length}</summary><pre>{state.eventLog.map(describeEvent).join('\n')}</pre></details></aside></div>
    <footer><span>THE GAMES OF THE PIGEON GOD</span><span>Milestone 7 · Playtest edition · Seed {seed}</span></footer>
    {settings&&<div className="modal-backdrop"><section role="dialog" aria-modal="true" aria-label="Match settings" className="modal"><button className="close" onClick={()=>setSettings(false)} aria-label="Close settings">×</button><span className="eyebrow">ENTER THE ARENA</span><h2>Match settings</h2><label>Seed <input value={seed} onChange={e=>setSeed(e.target.value)}/></label><label>Gladiators <select value={count} onChange={e=>setCount(Number(e.target.value) as 2|3|4)}>{[2,3,4].map(n=><option key={n}>{n}</option>)}</select></label><label>Mode <select value={mode} onChange={e=>{const value=e.target.value as 'local'|'ai';setMode(value);controller.setMode(value);}}><option value="local">Local multiplayer</option><option value="ai">Human vs AI</option></select></label><p>Mode switches immediately. A new Match replaces the current Match and deals two Rats to each player.</p><button className="primary" onClick={()=>{try{setController(createController({seed:Number(seed),playerCount:count,mode}));setSelected('p1');setError('');setSettings(false);}catch(e){setError(String(e));}}}>Start new Match</button></section></div>}
    {help&&<div className="modal-backdrop"><section role="dialog" aria-modal="true" aria-label="How to play" className="modal"><button className="close" onClick={()=>setHelp(false)} aria-label="Close help">×</button><span className="eyebrow">A RAT'S GUIDE TO GLORY</span><h2>Win the Pigeon God's favor</h2><p>Play two Arenas of up to five Rounds. The highest Divine Favor wins. Ties enter a Final Duel.</p><ol><li>Place your Burrow, then leave on your first Turn.</li><li>Each Turn grants two Actions. Move up to your Rat's Speed, or request an Item for one Action.</li><li>Enter an opponent's hex with two Actions to fight. Click Roll Attack, then Roll Dodge. Attack 4–6 Hits; Dodge 5–6 cancels a Hit, and a six counters.</li><li>Spend Fervor to reroll. The defender wins ties. A victorious attacker chooses the defender's pushback.</li><li>Claim the four public Decrees for Favor. The Arena winner gains two Favor. In Arena 2, Attack sixes count twice and the center grants Fervor.</li></ol><p>Items and Rat abilities can grant extra Actions or movement. Legal choices are highlighted. The Cat moves automatically once per Turn and attacks with four dice.</p><button onClick={()=>setHelp(false)}>Back to the Arena</button></section></div>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
