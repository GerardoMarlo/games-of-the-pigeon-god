import type { GameEvent,GameState } from '../engine/types';
export const METRICS_VERSION='1';
export interface Totals {damageDealt:number;damageReceived:number;finishes:number;attacks:number;dodges:number;fervorGenerated:number;fervorSpent:number;divineFavor:number}
export interface RatMetrics extends Totals {participantId:string;ratId:string;segment:string;controllerType:string;health:number;arenaWon:boolean;matchWon:boolean}
export interface TurnMetrics {sequence:number;segment:string;round:number;participantId:string;normalActions:number;bonusActions:number;ratCombats:number;catCombats:number}
export interface ArenaMetrics {segment:string;arena:number;duel:number;rounds:number;turns:number;reason:string;winnerId?:string;elapsedMs:number|null}
export interface DecreeMetrics {cardId:string;shownAt:number;claimedAt?:number;participantId?:string;controllerType?:string;favor:number}
export interface ItemMetrics {cardId:string;participantId:string;ratId:string;segment:string;drawnAt:number;usedAt?:number;discardedAt?:number}
export interface BetMetrics {segment:string;participantId:string;target:string;successful:boolean;favor:number}
export interface CatMetrics {segment:string;damageDealt:number;damageReceived:number;finishes:number;timesFinished:number;outOfBoundsRespawns:number;finishedRespawns:number;eliminatedPlayerFinishes:number;eliminatedPlayerFavor:number}
const totals=():Totals=>({damageDealt:0,damageReceived:0,finishes:0,attacks:0,dodges:0,fervorGenerated:0,fervorSpent:0,divineFavor:0});
export function createMetrics(){
 let segment='arena-1',sequence=0,turn:TurnMetrics|undefined,startMs:number|null=null;
 const rats:RatMetrics[]=[],arenas:ArenaMetrics[]=[],turns:TurnMetrics[]=[],decrees:DecreeMetrics[]=[],items:ItemMetrics[]=[],bets:BetMetrics[]=[],cats:CatMetrics[]=[];
 const controllers:Record<string,string>={};let initialHumanCount=0;
 const rat=(id:string)=>rats.find(r=>r.participantId===id&&r.segment===segment);
 const cat=()=>cats.find(c=>c.segment===segment)!;
 function consume(events:readonly GameEvent[],elapsedMs:number|null=null){
  for(const e of events){sequence++;
   if(e.type==='OBSERVATION'){
    const next=e.duel?'duel-'+e.duel:'arena-'+e.arena;
    if(e.kind==='segment_start'){
     segment=next;startMs=elapsedMs;turn=undefined;if(segment==='arena-1')initialHumanCount=e.players.filter(p=>p.controller==='human').length;
     arenas.push({segment,arena:e.arena,duel:e.duel,rounds:0,turns:0,reason:'incomplete',elapsedMs:null});
     cats.push({segment,damageDealt:0,damageReceived:0,finishes:0,timesFinished:0,outOfBoundsRespawns:0,finishedRespawns:0,eliminatedPlayerFinishes:0,eliminatedPlayerFavor:0});
     for(const p of e.players){controllers[p.id]=p.controller;rats.push({...totals(),participantId:p.id,ratId:p.ratId,segment,controllerType:p.controller,health:p.health,arenaWon:false,matchWon:false});}
    }
    for(const p of e.players){const r=rat(p.id);if(r){r.health=p.health;if(controllers[p.id]!==p.controller)r.controllerType='mixed';}controllers[p.id]=p.controller;}
    const a=arenas.find(a=>a.segment===segment);
    if(e.kind==='segment_end'&&a){a.reason=e.reason;a.elapsedMs=elapsedMs===null||startMs===null?null:Math.max(0,elapsedMs-startMs);}
    if(e.kind==='turn_start'&&a){a.rounds=Math.max(a.rounds,e.round);a.turns++;turn={sequence,segment,round:e.round,participantId:e.active,normalActions:0,bonusActions:0,ratCombats:0,catCombats:0};turns.push(turn);}
    continue;
   }
   if(e.type==='DAMAGE'){
    const source=rat(e.sourceId),target=rat(e.targetId);if(source)source.damageDealt+=e.amount;if(target){target.damageReceived+=e.amount;target.health=e.healthRemaining??Math.max(0,target.health-e.amount);}
    if(e.sourceId==='cat')cat().damageDealt+=e.amount;if(e.targetId==='cat')cat().damageReceived+=e.amount;
   }else if(e.type==='FERVOR_CHANGED'){const r=rat(e.playerId);if(r){if(e.amount>0)r.fervorGenerated+=e.amount;else r.fervorSpent-=e.amount;}}
   else if(e.type==='TRACKER_CHANGED'){const r=rat(e.playerId);if(r)r[e.tracker]+=e.amount;}
   else if(e.type==='FAVOR_CHANGED'){
    const r=rat(e.playerId);if(r)r.divineFavor+=e.amount;
    if(e.source==='eliminated_cat'){cat().eliminatedPlayerFavor+=e.amount;cat().eliminatedPlayerFinishes++;}
    if(e.source==='bet'){const b=bets.find(b=>b.segment===segment&&b.participantId===e.playerId);if(b){b.successful=true;b.favor+=e.amount;}}
   }else if(e.type==='RAT_FINISHED'&&e.sourceId==='cat')cat().finishes++;
   else if(e.type==='CAT_FINISHED')cat().timesFinished++;
   else if(e.type==='CAT_RESPAWNED'){if(e.reason==='finished')cat().finishedRespawns++;if(e.reason==='out_of_bounds')cat().outOfBoundsRespawns++;}
   else if(e.type==='COMBAT_TRIGGERED'&&turn){if([e.attackerId,e.defenderId].includes('cat'))turn.catCombats++;else turn.ratCombats++;}
   else if(e.type==='ACTION_SPENT'&&turn){if(e.bonus)turn.bonusActions+=e.amount;else turn.normalActions+=e.amount;}
   else if(e.type==='DECREE_REVEALED')decrees.push({cardId:e.cardId,shownAt:sequence,favor:0});
   else if(e.type==='DECREE_CLAIMED'){
    const d=decrees.find(d=>d.cardId===e.cardId&&d.claimedAt===undefined);if(d)Object.assign(d,{claimedAt:sequence,participantId:e.playerId,controllerType:controllers[e.playerId],favor:e.reward});
    const r=rat(e.playerId);if(r)r.divineFavor+=e.reward;
   }else if(e.type==='ITEM_DRAWN')items.push({cardId:e.cardId,participantId:e.playerId,ratId:rat(e.playerId)?.ratId??'',segment,drawnAt:sequence});
   else if(e.type==='ITEM_USED'||e.type==='ITEM_DISCARDED'){
    const item=items.find(i=>i.cardId===e.cardId&&i.participantId===e.playerId&&i.usedAt===undefined&&i.discardedAt===undefined);if(item){if(e.type==='ITEM_USED')item.usedAt=sequence;else item.discardedAt=sequence;}
   }else if(e.type==='BET_PLACED')bets.push({segment,participantId:e.playerId,target:e.targetId,successful:false,favor:0});
   else if(e.type==='ARENA_ENDED'){const a=arenas.find(a=>a.segment===segment);if(a)a.winnerId=e.winnerId;const r=rat(e.winnerId??'');if(r)r.arenaWon=true;}
  }
 }
 return {consume,report(state:GameState){
  const result=structuredClone({rats,arenas,turns,decrees,items,bets,cats});
  for(const r of result.rats)r.matchWon=r.participantId===state.winnerId;
  return {...result,metricsVersion:METRICS_VERSION,rngSeed:state.rng.seed,playerCount:state.seatOrder.length,humanPlayerCount:initialHumanCount,aiPlayerCount:state.seatOrder.length-initialHumanCount,aiDifficulty:'single_strategy',winnerId:state.winnerId,winnerControllerType:state.winnerId?state.players[state.winnerId].controller:undefined,winnerDivineFavor:state.winnerId?state.players[state.winnerId].divineFavor:undefined,divineFavor:Object.fromEntries(Object.values(state.players).map(p=>[p.id,p.divineFavor])),finalDuelOccurred:!!state.finalDuel,completed:state.phase==='MATCH_END',eventCount:sequence};
 }};
}
export type MatchMetrics=ReturnType<ReturnType<typeof createMetrics>['report']>;
