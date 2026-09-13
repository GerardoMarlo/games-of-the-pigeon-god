import type { HexCoordinate } from './hex';
import type { RNGState } from './rng';
export type GamePhase = 'SETUP'|'RAT_DRAFT'|'ARENA_SETUP'|'ROUND_START'|'TURN_START'|'CAT_MOVEMENT'|'PLAYER_ACTION'|'COMBAT'|'TURN_END'|'ROUND_END'|'ARENA_END'|'BETTING_RESOLUTION'|'BETWEEN_ARENAS'|'MATCH_END'|'FINAL_DUEL';
export type PlayerId = string;
export interface RatCard { id:string; name:string; maxHealth:number; attackDice:number; speed:number; artwork:string }
export interface RatState { ratId:string; ownerId:PlayerId; health:number; position:HexCoordinate; alive:boolean }
export interface PlayerState { id:PlayerId; controller:'human'|'ai'; divineFavor:number; draftedRats:RatCard[]; currentRat:RatState; eliminated:boolean; attacks:number; dodges:number; finishes:number; fervor:number; actionsRemaining:number }
export type HexTerrain = 'normal'|'rock'|'crate'|'sewer'|'spawn'|'center';
export interface HexState { coordinate:HexCoordinate; terrain:HexTerrain; sewerId?:string }
export interface BoardState { hexes:Record<string,HexState>; spawns:HexCoordinate[]; catSpawn:HexCoordinate }
export interface CombatState { attackerId:string; defenderId:string; sourceHex:HexCoordinate; destinationHex:HexCoordinate; movementRemaining:number }
export type GameEvent = { type:'PHASE_CHANGED'; phase:GamePhase } | { type:'RAT_MOVED'; playerId:string; from:HexCoordinate; to:HexCoordinate; cost:number } | { type:'COMBAT_TRIGGERED'; attackerId:string; defenderId:string };
export interface GameState { phase:GamePhase; arenaNumber:1|2; roundNumber:number; activePlayerId:PlayerId; turnOrder:PlayerId[]; players:Record<PlayerId,PlayerState>; board:BoardState; cat:{maxHealth:9;health:number;position:HexCoordinate;spawnPosition:HexCoordinate;alive:boolean}; rng:RNGState; eventLog:GameEvent[]; combat?:CombatState }
export type GameAction = {type:'MOVE';playerId:PlayerId;path:HexCoordinate[]} | {type:'END_TURN';playerId:PlayerId};
export interface GameConfig { seed:number; playerCount:2|3|4; board?:BoardState }
