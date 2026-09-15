import {useEffect,useRef,useState} from 'react';
import {api,choseGuest,rememberProfile,clearOutbox,type Profile} from '../persistence/profile';
interface Turnstile {render:(el:HTMLElement,options:Record<string,unknown>)=>string;remove:(id:string)=>void;reset:()=>void}
declare global {interface Window {turnstile?:Turnstile}}
export function ProfilePanel({initial,onDone}:{initial?:Profile|null;onDone:(p:Profile|null)=>void}){
 const [name,setName]=useState(initial?.name??''),[email,setEmail]=useState(initial?.email??''),[consent,setConsent]=useState(false),[token,setToken]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[checking,setChecking]=useState(initial===undefined);
 const [profile,setProfile]=useState<Profile|null>(initial??null),[sitekey,setSitekey]=useState('');
 const widget=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let live=true;
  async function load(){
   if(initial===undefined&&choseGuest()){onDone(null);return;}
   try{
    const p:Profile=await api('/profile');if(!live)return;
    if(initial===undefined){rememberProfile(p);onDone(p);return;}
    setProfile(p);setName(p.name);setEmail(p.email??'');
   }catch{/* Unregistered browsers can register or continue without tracking. */}
   try{const c=await api('/config');if(live)setSitekey(c.sitekey);}catch(e){if(live)setError(String(e));}
   if(live)setChecking(false);
  }
  void load();return ()=>{live=false;};
 },[]);
 useEffect(()=>{
  if(!sitekey||profile||checking)return;
  let id:string|undefined,live=true;
  const render=()=>{if(live&&widget.current&&window.turnstile)id=window.turnstile.render(widget.current,{sitekey,action:'register',callback:(v:string)=>setToken(v),'expired-callback':()=>setToken('')});};
  const existing=document.querySelector<HTMLScriptElement>('script[data-turnstile]');
  let script=existing;
  if(window.turnstile)render();
  else {if(!script){script=document.createElement('script');script.dataset.turnstile='true';script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;document.head.append(script);}script.addEventListener('load',render);}
  return ()=>{live=false;script?.removeEventListener('load',render);if(id)window.turnstile?.remove(id);};
 },[sitekey,profile,checking]);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{
  const p:Profile=await api(profile?'/profile':'/players',profile?'PATCH':'POST',{name,email,consent,turnstileToken:token});
  rememberProfile(p);onDone(p);
 }catch(e){setError(String(e));setToken('');window.turnstile?.reset();}finally{setBusy(false);}}
 async function remove(){setBusy(true);try{await api('/profile','DELETE');await clearOutbox().catch(()=>{});rememberProfile(null);onDone(null);}catch(e){setError(String(e));}finally{setBusy(false);}}
 return <div className="modal-backdrop profile-backdrop"><section className="modal profile-panel" role="dialog" aria-modal="true" aria-label="Player profile" onKeyDown={e=>{
  if(e.key!=='Tab')return;
  const controls=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input,summary,iframe'));
  const first=controls[0],last=controls[controls.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
 }}>
 <span className="eyebrow">WELCOME TO THE ARENA</span><h2>{checking?'Loading your profile…':profile?'Your MARLO profile':'Meet your gladiator'}</h2>
 {!checking&&<form onSubmit={submit}><p>Share your details to help develop The Games of the Pigeon God, or play without sharing.</p>
 <label>Name<input autoFocus required maxLength={80} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>
 <label>Email<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
 <label className="consent"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/>I agree that MARLO may store my name, email and gameplay statistics to improve this game and contact me about this project.</label>
 <details><summary>Privacy and data choices</summary><p>Contact details are stored separately from Match statistics. Only your seat is linked to your profile; other local players use anonymous seat IDs. We collect no browser fingerprint. Raw events are retained for 90 days; statistics and inactive profiles for up to two years. You can edit or delete your profile here. Deleting it also deletes your uploaded human Matches. Clearing browser storage alone does not delete central data. Contact: marlo.games.contact.mx@gmail.com.</p></details>
 {!profile&&<div ref={widget}/>}
 {error&&<p role="alert">{error}</p>}
 <button className="primary" disabled={busy||!consent||(!profile&&!token)}>{busy?'Saving…':profile?'Save profile':'Agree and enter'}</button>
 <button type="button" disabled={busy} onClick={()=>{rememberProfile(profile);onDone(profile);}}>{profile?'Back to game':'Play without sharing'}</button>
 {profile&&<button type="button" disabled={busy} onClick={remove}>Delete profile and uploaded Matches</button>}
 </form>}
 {checking&&<button onClick={()=>onDone(null)}>Play without sharing</button>}
 </section></div>;
}
