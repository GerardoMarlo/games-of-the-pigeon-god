import type { GameEvent } from './types';
export function describeEvent(e:GameEvent):string {
  switch(e.type){
    case 'PHASE_CHANGED':return e.phase.replaceAll('_',' ');
    case 'RAT_MOVED':return `${e.playerId} moved to (${e.to.q}, ${e.to.r}); ${e.cost} movement.`;
    case 'COMBAT_TRIGGERED':return `${e.attackerId} challenges ${e.defenderId}.`;
    case 'ROLL':return `${e.playerId} rolled ${e.kind.toLowerCase()}: ${e.dice.join(', ')}.`;
    case 'REROLL':return `${e.playerId} rerolled die ${e.index+1}: ${e.before} → ${e.after}.`;
    case 'ROLL_CONFIRMED':return `${e.playerId} confirmed ${e.kind.toLowerCase()}.`;
    case 'DAMAGE':return `${e.sourceId} dealt ${e.amount} damage to ${e.targetId}.`;
    case 'FERVOR_CHANGED':return `${e.playerId}: ${e.amount>0?'+':''}${e.amount} Fervor (${e.reason}).`;
    case 'TRACKER_CHANGED':return `${e.playerId}: +${e.amount} ${e.tracker}.`;
    case 'FAVOR_CHANGED':return `${e.playerId}: +${e.amount} Divine Favor.`;
    case 'RAT_FINISHED':return `${e.sourceId} Finished ${e.playerId}.`;
    case 'COMBAT_RESOLVED':return `${e.winnerId} wins combat (${e.attackerDamage} attack damage / ${e.defenderDamage} counter damage).`;
    case 'DISPLACED':return `${e.playerId}: ${e.reason} to (${e.to.q}, ${e.to.r}).`;
    case 'ARENA_ENDED':return e.winnerId?`Arena ends: ${e.winnerId} is the sole survivor. Scoring is deferred.`:'Arena ends with no survivor and no winner.';
  }
}
