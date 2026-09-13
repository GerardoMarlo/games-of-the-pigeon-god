export const RULES = { actionsPerTurn:2, roundsPerArena:5, catHealth:9, arenaWinnerFavor:2, earlyBetLastRound:3, catAttackDice:4,
  attackFervorMilestones:[4,5], dodgeFervorMilestones:[4,5], finishFervorMilestone:2, finishFavorMilestone:3,
  // Rulebook v1.1 §24: automatically flip each lost Health token to Fervor.
  fervorPerHealthLost:1,
  // Damage successfully dealt means actual Health removed; excludes overkill.
  capDamageToHealth:true,
} as const;
// Prototype boundary: full draft remains deferred.
export const PROTOTYPE = { manualOpponentControl:true, endTurnAllowed:true } as const;
