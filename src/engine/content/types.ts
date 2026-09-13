import type { HexCoordinate } from '../hex';
export type ContentAction =
 | {type:'EFFECT_REQUEST_ITEM'|'RESOLVE_COMBAT'|'REQUEST_ITEM'|'ROLL_ATTACK'|'ACCEPT_ATTACK'|'ROLL_DODGE'|'CONFIRM_CAT_DIRECTION'|'FINISH_CAT_MOVEMENT'|'SKIP_EFFECT';playerId:string}
 | {type:'USE_ITEM';playerId:string;itemId:string;dieIndex?:number;direction?:number;destination?:HexCoordinate}
 | {type:'USE_ABILITY';playerId:string;dieIndex:number}
 | {type:'EFFECT_ACTION_MOVE';playerId:string;path:HexCoordinate[]}
 | {type:'EFFECT_MOVE';playerId:string;destination:HexCoordinate;path?:HexCoordinate[]};
export interface CardPlayerState {
 items:string[]; moved:boolean; bonusGranted:boolean; speedBonus:number;
 brasa:boolean; catDamage:number; catFinishes:number; counterFinishes:number; afterMovement:boolean;
}
export interface CardCombatState {
 attackDice:number; dodgeDice:number; cancelHits:number; cancelAttack:boolean;
 attackAbilityUsed:boolean; dodgeAbilityUsed:boolean;
}
export interface PendingEffect {playerId:string;entityId:string;steps:number;reason:string;bonusAction?:boolean}
export interface ContentState {
 itemDeck:string[];itemDiscard:string[];decreeDeck:string[];decrees:string[];decreeDiscard:string[];
 claims:{cardId:string;playerId:string;arenaNumber:1|2}[];
 players:Record<string,CardPlayerState>;
 combat?:CardCombatState;catStep?:'rolled'|'after';catDie?:number;catRolled?:boolean;catItemMovement?:boolean;
 effects:PendingEffect[];resume?:'actions'|'end_turn'|'player_action';combatRetreat?:boolean;
}
