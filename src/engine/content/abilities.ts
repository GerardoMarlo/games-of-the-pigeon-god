import { equal } from '../hex';
import type { GameAction,GameState } from '../types';
import { ability,bonusAction,note } from './state';
export function diceBonus(state:GameState,id:string,kind:'ATTACK'|'DODGE'):number {
 const c=state.combat!,a=ability(state,id);
 if(kind==='ATTACK')return (a==='weak_enemy_die'&&state.players[c.defenderId]?.currentRat.health===1?1:0)+(a==='moved_attack_die'&&state.content?.players[id].moved?1:0)+(state.content?.combat?.attackDice??0);
 return (a==='cat_dodge'&&c.attackerId==='cat'?1:0)+(state.content?.combat?.dodgeDice??0);
}
export function dieModifier(state:GameState,id:string):number {
 const c=state.combat,ctx=state.content?.combat,p=state.players[id];if(!c||!ctx||!p)return 0;
 const attack=c.stage==='ATTACK'&&c.attackerId===id,dodge=c.stage==='DODGE'&&c.defenderId===id;
 if(!attack&&!dodge||attack&&ctx.attackAbilityUsed||dodge&&ctx.dodgeAbilityUsed)return 0;
 const a=ability(state,id),moved=state.content!.players[id].moved;
 if(a==='cat_die'&&(attack?c.defenderId:c.attackerId)==='cat')return 2;
 if(a==='center_die'&&equal(p.currentRat.position,state.board.catSpawn))return 1;
 if(attack&&(a==='last_health_attack'&&p.currentRat.health===1||a==='moved_attack'&&moved||(a==='stationary_attack'||a==='stationary_turn_attack')&&!moved))return 1;
 return 0;
}
export function abilityActions(state:GameState,id:string):GameAction[] {
 if(!dieModifier(state,id))return [];
 const dice=state.combat!.stage==='ATTACK'?state.combat!.attackerRoll:state.combat!.defenderRoll;
 return dice.flatMap((d,dieIndex)=>d<6?[{type:'USE_ABILITY' as const,playerId:id,dieIndex}]:[]);
}
export function applyAbility(state:GameState,action:Extract<GameAction,{type:'USE_ABILITY'}>):void {
 if(!abilityActions(state,action.playerId).some(a=>a.type==='USE_ABILITY'&&a.dieIndex===action.dieIndex))throw new Error('Illegal ability');
 const c=state.combat!,ctx=state.content!.combat!,dice=c.stage==='ATTACK'?c.attackerRoll:c.defenderRoll;
 dice[action.dieIndex]=Math.min(6,dice[action.dieIndex]+dieModifier(state,action.playerId));
 if(c.stage==='ATTACK')ctx.attackAbilityUsed=true;else ctx.dodgeAbilityUsed=true;
 note(state,`${action.playerId} modifies die ${action.dieIndex+1} with their Rat ability.`);
}
export function combatRewards(state:GameState):void {
 const c=state.combat!,data=state.content;if(!data)return;
 const atk=state.players[c.attackerId],def=state.players[c.defenderId];
 if(atk){
  if(c.defenderId==='cat'){data.players[atk.id].catDamage+=c.attackerDamage;if(!state.cat.alive)data.players[atk.id].catFinishes++;}
  if(ability(state,atk.id)==='twins_action'&&new Set(c.attackerRoll).size<c.attackerRoll.length)bonusAction(state,atk.id,true);
  if(ability(state,atk.id)==='finish_action'&&(c.defenderId==='cat'?!state.cat.alive:!def.currentRat.alive))bonusAction(state,atk.id,true);
  if(ability(state,atk.id)==='attack_move')data.effects.push({playerId:atk.id,entityId:atk.id,steps:1,reason:'Ratón Sigiloso'});
 }
 if(def){
  if(c.attackerId==='cat'){data.players[def.id].catDamage+=c.defenderDamage;if(!state.cat.alive)data.players[def.id].catFinishes++;}
  if(c.attackerId==='cat'?!state.cat.alive:!atk.currentRat.alive){data.players[def.id].counterFinishes++;if(ability(state,def.id)==='finish_action')bonusAction(state,def.id,true);}
  if(ability(state,def.id)==='dodge_move'&&c.defenderRoll.some(d=>d>=5))data.effects.push({playerId:def.id,entityId:def.id,steps:2,reason:'Ratón Esquivo'});
 }
}
