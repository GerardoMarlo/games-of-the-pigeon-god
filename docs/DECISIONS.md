# Decisions and unresolved design questions

These are prototype boundaries, not changes to the owner's v1.0 rules.

- Board size, geometry, terrain placements, spawn positions and Rat stats are unspecified. `src/content/prototype.ts` contains explicitly labeled test fixtures. Replace after receiving actual board/card data.
- No draft in Milestone 1. Two placeholder Rats assigned per player; only current opponent Rat is revealed.
- End Turn is a configurable prototype control (`PROTOTYPE.endTurnAllowed`), needed to traverse a movement-only sandbox. Confirm whether passing unused Actions is a final rule before shipping gameplay.
- Opponents carry AI controller tags but are manually operated in the sandbox. No AI capability is claimed.
- No Cat movement until Milestone 3. The Cat remains at spawn and triggers a combat handoff when approached.
- Combat handoff leaves the attacker at source, records target and remaining Speed, and locks further actions. Resolution/resumption is Milestone 2.
- Five Rounds end at ARENA_END. No early victory, scoring or Arena transition until Milestone 4.
- Sewer exits use legal empty, non-sewer, unblocked hexes, per §46. The explicit path includes entry, paired portal and exit; only entry consumes Speed. Confirm whether combat should ever be allowed on sewer exit before changing this interpretation.
- Actual Dodge dice count is not specified. Needed before Milestone 2; do not infer it from attackDice or Speed.
- Need clarification later: Cat blocked terrain/occupied respawn, tied Arena rankings after Health, Rat-initiated Cat pushback, optional Cat retreat choice, and Final Duel starting Health/Arena modifiers/layout.
- Existing cards and board artwork can be shared now for archival/reference; authoritative stats and board geometry become useful before replacing test content, artwork before Milestone 7.
