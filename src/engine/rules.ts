export const RULES = { actionsPerTurn:2, roundsPerArena:5, catHealth:9 } as const;
// Milestone boundary: draft, Cat movement and combat resolution are deferred.
export const PROTOTYPE = { manualOpponentControl:true, endTurnAllowed:true } as const;
