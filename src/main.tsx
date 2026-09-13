import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createController } from './controller';
import { key } from './engine/hex';
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
  const moves=actions.filter(a=>'path' in a);
  const send=(action:GameAction)=>{try{controller.dispatch(action);setError('');refresh(n=>n+1);}catch(e){setError(String(e));}};
  return <main><header><p>ENGINE PROTOTYPE · MILESTONE 2</p><h1>The Games of the Pigeon God</h1><p>Movement and combat sandbox. All seats are manually controlled. Cards and Arena are test content.</p></header>
    <section className="controls"><label>Seed <input value={seed} onChange={e=>setSeed(e.target.value)}/></label><label>Gladiators <select value={count} onChange={e=>setCount(Number(e.target.value) as 2|3|4)}>{[2,3,4].map(n=><option key={n}>{n}</option>)}</select></label><button onClick={()=>{try{setController(createController({seed:Number(seed),playerCount:count}));setError('');}catch(e){setError(String(e));}}}>New prototype</button></section>
    {error && <p role="alert">{error}</p>}<p><strong>Arena {state.arenaNumber} · Round {state.roundNumber}/5 · {state.activePlayerId.toUpperCase()}</strong> · {state.phase}</p>
    <div className="layout"><section><svg viewBox="-230 -220 460 440" aria-label="Hex Arena">{Object.values(state.board.hexes).map(tile=>{const {q,r}=tile.coordinate,x=48*(q+r/2),y=42*r;const action:GameAction|undefined=actions.find(a=>a.type==='SELECT_PUSHBACK'&&key(a.destination)===key(tile.coordinate))??moves.find(a=>key(a.path[a.path.length-1])===key(tile.coordinate));const rat=Object.values(state.players).find(p=>p.currentRat.alive&&key(p.currentRat.position)===key(tile.coordinate));const cat=key(state.cat.position)===key(tile.coordinate);const label=rat?rat.id.toUpperCase():cat?'CAT':tile.terrain==='normal'?'':tile.terrain.toUpperCase();const activate=()=>{if(action){send(action);}};return <g key={key(tile.coordinate)} transform={`translate(${x},${y})`} role="button" tabIndex={action?0:-1} aria-label={`${q},${r} ${label}${action?' legal move':''}`} aria-disabled={!action} onClick={activate} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}}}><polygon className={`${tile.terrain} ${action?'legal':''}`} points="0,-27 24,-14 24,14 0,27 -24,14 -24,-14"/><text textAnchor="middle" dy="4">{label}</text></g>;})}</svg><p>Combat costs both Actions and ends your Turn after pushback. Losing attackers retreat one hex; blocked pushback swaps positions.</p></section><aside>{Object.values(state.players).map(p=><article key={p.id}><strong>{p.id.toUpperCase()} {p.id===state.activePlayerId?'← active':''}</strong><p>{p.draftedRats.find(r=>r.id===p.currentRat.ratId)?.name} · Health {p.currentRat.health} · Speed {p.draftedRats.find(r=>r.id===p.currentRat.ratId)?.speed}</p><p>Actions {p.actionsRemaining} · Favor {p.divineFavor} · Fervor {p.fervor}</p><p>Attacks {p.attacks} · Dodges {p.dodges} · Finishes {p.finishes}{p.eliminated?" · Eliminated":""}</p></article>)}<button disabled={!actions.some(a=>a.type==='END_TURN')} onClick={()=>{send({type:'END_TURN',playerId:state.activePlayerId});}}>End Turn</button><p role="status">{lastCombat?describeEvent(lastCombat):"Enter another Rat’s hex to start combat."}</p><CombatPanel state={state} actions={actions} dispatch={send}/>{state.phase==='ARENA_END'&&<p role="status">Arena complete. {state.arenaWinnerId?`${state.arenaWinnerId.toUpperCase()} is the sole survivor. `:""}Arena scoring arrives in Milestone 4.</p>}</aside></div><details><summary>Engine event log ({state.eventLog.length})</summary><pre>{state.eventLog.map(describeEvent).join('\n')}</pre></details></main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
