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
  const [countdown,setCountdown]=useState<number|undefined>();
  useEffect(()=>controller.subscribe(()=>refresh(n=>n+1)),[controller]);
  const state=controller.getState(),actions=controller.getLegalActions();
  const revision=controller.getRevision();
  useEffect(()=>{
    const ai=setTimeout(()=>{try{controller.aiStep();}catch(e){setError(String(e));}},500);
    const p=state.players[state.activePlayerId];let timer:ReturnType<typeof setTimeout>|undefined,interval:ReturnType<typeof setInterval>|undefined;
    if(state.phase==='PLAYER_ACTION'&&p.actionsRemaining===0&&!p.currentRat.inBurrow&&p.controller==='human'){
      setCountdown(5);interval=setInterval(()=>setCountdown(n=>n===undefined?undefined:Math.max(0,n-1)),1000);timer=setTimeout(()=>controller.expireTurn(revision),5000);
    }else setCountdown(undefined);
    return ()=>{clearTimeout(ai);if(timer)clearTimeout(timer);if(interval)clearInterval(interval);};
  },[controller,revision]);
  const lastCombat=[...state.eventLog].reverse().find(e=>e.type==='COMBAT_RESOLVED');
  const send=(action:GameAction)=>{try{controller.dispatch(action);setError('');refresh(n=>n+1);}catch(e){setError(String(e));}};
  return <main><header><p>ENGINE PROTOTYPE · MILESTONE 6</p><h1>The Games of the Pigeon God</h1><p>Two-Arena Match prototype. {state.mode==='ai'?'You play P1 against AI opponents.':'Local multiplayer: operate all seats on this device.'} Rat cards, Items and Decrees are active.</p></header>
    <section className="controls"><label>Seed <input value={seed} onChange={e=>setSeed(e.target.value)}/></label><label>Gladiators <select value={count} onChange={e=>setCount(Number(e.target.value) as 2|3|4)}>{[2,3,4].map(n=><option key={n}>{n}</option>)}</select></label><label>Mode <select value={mode} onChange={e=>{const value=e.target.value as 'local'|'ai';setMode(value);controller.setMode(value);}}><option value="local">Local multiplayer</option><option value="ai">Human vs AI</option></select></label><button onClick={()=>{try{setController(createController({seed:Number(seed),playerCount:count,mode}));setError('');}catch(e){setError(String(e));}}}>New prototype</button></section>
    {error && <p role="alert">{error}</p>}<p><strong>{state.finalDuel?'Final Duel':`Arena ${state.arenaNumber}`} · Round {state.roundNumber}{state.finalDuel?'':'/5'} · {state.activePlayerId.toUpperCase()}</strong> · {state.phase}</p>
    <p role="status">{countdown!==undefined?`Turn ends in ${countdown}s — use an Item now or end early.`:state.mode==='ai'?'AI decisions run automatically.':'Local multiplayer'}</p><div className="layout"><Board state={state} actions={actions} send={send}/><aside>{Object.values(state.players).map(p=><article key={p.id}><strong>{p.id.toUpperCase()} {p.id===state.activePlayerId?'← active':''}</strong><p>{p.draftedRats.find(r=>r.id===p.currentRat.ratId)?.name} · Health {p.currentRat.health} · Attack {p.draftedRats.find(r=>r.id===p.currentRat.ratId)?.attackDice} · Speed {p.draftedRats.find(r=>r.id===p.currentRat.ratId)?.speed}</p><p>{p.draftedRats.find(r=>r.id===p.currentRat.ratId)?.description}</p><p>Items: {state.content?.players[p.id].items.map(id=>itemCards.find(c=>c.id===id)?.name).join(', ')||'none'}</p><p>Actions {p.actionsRemaining} · Favor {p.divineFavor} · Fervor {p.fervor}</p><p>Attacks {p.attacks} · Dodges {p.dodges} · Finishes {p.finishes}{p.eliminated?" · Eliminated":""}</p></article>)}<button disabled={!actions.some(a=>a.type==='END_TURN')} onClick={()=>{send({type:'END_TURN',playerId:state.activePlayerId});}}>End Turn</button><p role="status">{lastCombat?describeEvent(lastCombat):"Enter another Rat’s hex to start combat."}</p>{!state.finalDuel&&<p>Cat Health: {state.cat.health}/9</p>}{actions.filter(a=>a.type==='ROLL_CAT_MOVEMENT').map(action=><button key={action.type} onClick={()=>send(action)}>Roll Cat movement</button>)}<CombatPanel state={state} actions={actions} dispatch={send}/><ContentPanel state={state} actions={actions} send={send}/><LifecyclePanel state={state} actions={actions} send={send}/></aside></div><details><summary>Engine event log ({state.eventLog.length})</summary><pre>{state.eventLog.map(describeEvent).join('\n')}</pre></details></main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
