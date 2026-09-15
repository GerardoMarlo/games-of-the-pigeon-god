const API='/api/v1/pigeongod';
export async function api(path:string,method='GET',body?:unknown){
 const response=await fetch(API+path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
 const result=await response.json().catch(()=>({error:'Registration is unavailable on this host. You can play without sharing data.'}));
 if(!response.ok||result.error)throw new Error(result.error??'Please try again later.');
 return result;
}
export interface Profile {playerId:string;name:string;consentVersion:string;email?:string}
export function rememberProfile(p:Profile|null){try{localStorage.setItem('pigeongod.profile',JSON.stringify(p?{playerId:p.playerId,name:p.name,consentVersion:p.consentVersion}:{guest:true}));}catch{/* Storage disabled: play still works. */}}
export function choseGuest(){try{return JSON.parse(localStorage.getItem('pigeongod.profile')??'null')?.guest===true;}catch{return false;}}
export async function outboxStore(){return new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('pigeongod.telemetry',1);req.onupgradeneeded=()=>req.result.createObjectStore('outbox',{keyPath:'key'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
export interface Pending {key:string;owner:string;path:string;body:unknown;created:number}
export async function queue(row:Pending){const db=await outboxStore();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('outbox','readwrite');tx.objectStore('outbox').put(row);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
let flushing=false;
export async function flush(owner:string){
 if(flushing)return false;flushing=true;
 let db:IDBDatabase|undefined;
 try{
  db=await outboxStore();
  const rows=await new Promise<Pending[]>((resolve,reject)=>{const req=db!.transaction('outbox').objectStore('outbox').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  for(const row of rows.sort((a,b)=>a.key.localeCompare(b.key))){
   if(row.owner!==owner||Date.now()-row.created>30*86400000){db.transaction('outbox','readwrite').objectStore('outbox').delete(row.key);continue;}
   await api(row.path,'PUT',row.body);
   await new Promise<void>((resolve,reject)=>{const tx=db!.transaction('outbox','readwrite');tx.objectStore('outbox').delete(row.key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
  }
  return true;
 }finally{db?.close();flushing=false;}
}
export async function clearOutbox(){const db=await outboxStore();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('outbox','readwrite');tx.objectStore('outbox').clear();tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
