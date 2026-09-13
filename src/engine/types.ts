import type { ContentAction,ContentState } from './content/types';
import type { HexCoordinate } from './hex';
import type { RNGState } from './rng';
export type GamePhase = 'CONTENT_EFFECT'|'SETUP'|'RAT_DRAFT'|'ARENA_SETUP'|'ROUND_START'|'TURN_START'|'CAT_MOVEMENT'|'PLAYER_ACTION'|'COMBAT'|'TURN_END'|'ROUND_END'|'ARENA_END'|'BETTING_RESOLUTION'|'BETWEEN_ARENAS'|'MATCH_END'|'FINAL_DUEL';
export type PlayerId = string;
export interface RatCard { id:string; name:string; maxHealth:number; attackDice:number; speed:number; artwork:string; ability?:string; description?:string }
export interface RatState { ratId:string; ownerId:PlayerId; health:number; position:HexCoordinate; alive:boolean; inBurrow?:boolean; forcedBurrow?:boolean }
export interface PlayerState { id:PlayerId; controller:'human'|'ai'; divineFavor:number; draftedRats:RatCard[]; currentRat:RatState; eliminated:boolean; eliminationRound?:number; betTargetPlayerId?:PlayerId; attacks:number; dodges:number; finishes:number; fervor:number; actionsRemaining:number }
export type HexTerrain = 'normal'|'rock'|'crate'|'sewer'|'spawn'|'center';
export interface HexState { coordinate:HexCoordinate; terrain:HexTerrain; sewerId?:string }
export interface BoardState { hexes:Record<string,HexState>; spawns:HexCoordinate[]; catSpawn:HexCoordinate; burrows?:{position:HexCoordinate;entry:HexCoordinate;playerId?:PlayerId}[] }
export interface CombatState { attackerId:string; defenderId:string; sourceHex:HexCoordinate; destinationHex:HexCoordinate; stage:'AFTER_DAMAGE'|'BEFORE_ATTACK'|'ATTACK_RESPONSE'|'BEFORE_DODGE'|'ATTACK'|'DODGE'|'PUSHBACK'; attackerRoll:number[]; defenderRoll:number[]; attackerConfirmed:boolean; defenderConfirmed:boolean; attackerDamage:number; defenderDamage:number; winnerId?:string; origin?:'rat_move'|'cat_turn'|'cat_respawn'; resume?:'actions'|'end_turn'; direction?:HexCoordinate; catCreditPlayerId?:string }
export type GameEvent = {type:'CONTENT';message:string} | {type:'BURROW_PLACED';playerId:PlayerId;position:HexCoordinate} | { type:'PHASE_CHANGED'; phase:GamePhase } | { type:'RAT_MOVED'; playerId:string; from:HexCoordinate; to:HexCoordinate; cost:number } | { type:'COMBAT_TRIGGERED'; attackerId:string; defenderId:string }
  | {type:'ROLL';playerId:string;kind:'ATTACK'|'DODGE';dice:number[]}
  | {type:'REROLL';playerId:string;kind:'ATTACK'|'DODGE';index:number;before:number;after:number}
  | {type:'ROLL_CONFIRMED';playerId:string;kind:'ATTACK'|'DODGE'}
  | {type:'DAMAGE';sourceId:string;targetId:string;amount:number;healthRemaining?:number}
  | {type:'FERVOR_CHANGED';playerId:string;amount:number;reason:string}
  | {type:'TRACKER_CHANGED';playerId:string;tracker:'attacks'|'dodges'|'finishes';amount:number}
  | {type:'FAVOR_CHANGED';playerId:string;amount:number}
  | {type:'RAT_FINISHED';playerId:string;sourceId:string}
  | {type:'COMBAT_RESOLVED';attackerDamage:number;defenderDamage:number;winnerId:string}
  | {type:'DISPLACED';playerId:string;to:HexCoordinate;reason:'pushback'|'retreat'|'capture'}
  | {type:'CAT_MOVED';die:number;from:HexCoordinate;to:HexCoordinate;blocked:boolean}
  | {type:'CAT_RESPAWNED';health:number;occupied:boolean}
  | {type:'CAT_FINISHED';sourceId:string}
  | {type:'ARENA_STARTED';arenaNumber:1|2}
  | {type:'BET_PLACED';playerId:string;targetId:string}
  | {type:'MATCH_ENDED';winnerId:string}
  | {type:'DUEL_STARTED';attempt:number}
  | {type:'ARENA_ENDED';winnerId?:string};
export interface GameState { automatic?:boolean;mode?:'local'|'ai'; content?:ContentState; phase:GamePhase; arenaNumber:1|2; roundNumber:number; activePlayerId:PlayerId; turnOrder:PlayerId[]; players:Record<PlayerId,PlayerState>; board:BoardState; cat:{maxHealth:9;health:number;position:HexCoordinate;spawnPosition:HexCoordinate;alive:boolean;offBoard?:boolean}; rng:RNGState; eventLog:GameEvent[]; combat?:CombatState; arenaWinnerId?:string; seatOrder:PlayerId[]; arenaResults:ArenaResult[]; arenaTemplate?:BoardState; burrowPlacement?:{order:PlayerId[];placed:PlayerId[]}; winnerId?:PlayerId; finalDuel?:{participants:PlayerId[];choices:Record<PlayerId,string>;stage:'selection'|'combat';attempt:number} }
export interface ArenaResult {arenaNumber:1|2;winnerId?:PlayerId;reason:'round_limit'|'last_survivor'|'no_survivors'|'unbroken_tie';ranking:PlayerId[];favor:Record<PlayerId,number>}
export type GameAction = ContentAction | {type:'PLACE_BURROW';playerId:PlayerId;destination:HexCoordinate} | {type:'MOVE';playerId:PlayerId;path:HexCoordinate[]} | {type:'CONTINUE_ARENA'|'START_ARENA_2'|'ROLL_CAT_MOVEMENT'|'END_TURN'|'CONFIRM_ATTACK'|'CONFIRM_DODGE';playerId:PlayerId} | {type:'SPEND_FERVOR';playerId:PlayerId;dieIndex:number} | {type:'SELECT_PUSHBACK';playerId:PlayerId;destination:HexCoordinate} | LifecycleAction;
export type LifecycleAction = {type:'SELECT_DUEL_RAT';playerId:PlayerId;ratId:string} | {type:'SELECT_BET';playerId:PlayerId;targetId:PlayerId};
export interface GameConfig { seed:number; playerCount:2|3|4; board?:BoardState; content?:boolean; automatic?:boolean; mode?:'local'|'ai' }
