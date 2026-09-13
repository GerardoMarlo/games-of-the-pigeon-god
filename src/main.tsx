import React, { useState } from 'react';
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
  const state=controller.getState(),actions=controller.getLegalActions();
  const lastCombat=[...state.eventLog].reverse().find(e=>e.type==='COMBAT_RESOLVED');
  const send=(action:GameAction)=>{try{controller.dispatch(action);setError('');refresh(n=>n+1);}catch(e){setError(String(e));}};
  return <main><header><p>ENGINE PROTOTYPE · MILESTONE 4</p><h1>The Games of the Pigeon God</h1><p>Two-Arena Match prototype. All seats are manually controlled; Rat cards are test content.</p></header>
    <section className="controls"><label>Seed <input value={seed} onChange={e=>setSeed(e.target.value)}/></label><label>Gladiators <select value={count} onChange={e=>setCount(Number(e.target.value) as 2|3|4)}>{[2,3,4].map(n=><option key={n}>{n}</option>)}</select></label><button onClick={()=>{try{setController(createController({seed:Number(seed),playerCount:count}));setError('');}catch(e){setError(String(e));}}}>New prototype</button></section>
    {error && <p role="alert">{error}</p>}<p><strong>{state.finalDuel?'Final Duel':`Arena ${state.arenaNumber}`} · Round {state.roundNumber}{state.finalDuel?'':'/5'} · {state.activePlayerId.toUpperCase()}</strong> · {state.phase}</p>
    <div className="layout"><Board state={state} actions={actions} send={send}/><aside>{Object.values(state.players).map(p=><article key={p.id}><strong>{p.id.toUpperCase()} {p.id===state.activePlayerId?'← active':''}</strong><p>{p.draftedRats.find(r=>r.id===p.currentRat.ratId)?.name} · Health {p.currentRat.health} · Attack {p.draftedRats.find(r=>r.id===p.currentRat.ratId)?.attackDice} · Speed {p.draftedRats.find(r=>r.id===p.currentRat.ratId)?.speed}</p><p>Actions {p.actionsRemaining} · Favor {p.divineFavor} · Fervor {p.fervor}</p><p>Attacks {p.attacks} · Dodges {p.dodges} · Finishes {p.finishes}{p.eliminated?" · Eliminated":""}</p></article>)}<button disabled={!actions.some(a=>a.type==='END_TURN')} onClick={()=>{send({type:'END_TURN',playerId:state.activePlayerId});}}>End Turn</button><p role="status">{lastCombat?describeEvent(lastCombat):"Enter another Rat’s hex to start combat."}</p>{!state.finalDuel&&<p>Cat Health: {state.cat.health}/9</p>}{actions.filter(a=>a.type==='ROLL_CAT_MOVEMENT').map(action=><button key={action.type} onClick={()=>send(action)}>Roll Cat movement</button>)}<CombatPanel state={state} actions={actions} dispatch={send}/><LifecyclePanel state={state} actions={actions} send={send}/></aside></div><details><summary>Engine event log ({state.eventLog.length})</summary><pre>{state.eventLog.map(describeEvent).join('\n')}</pre></details></main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
