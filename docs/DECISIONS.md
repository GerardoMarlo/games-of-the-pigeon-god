# Rule reconciliation and decisions

The owner's technical specification v1.0 governs architecture and milestones. The complete supplied Rulebook v1.1 is preserved verbatim in RULEBOOK-v1.1.txt and adds the following rule context.

## Owner correction overrides earlier interpretations

See [COMBAT-CORRECTION.md](COMBAT-CORRECTION.md): combat requires and consumes both Actions, automatically ends the Turn after displacement, and never allows movement continuation. Losing attacker retreats one hex along the approach path. No legal defender pushback means the Rats swap positions.

## Resolved in Milestone 2

- Rulebook §§4/14: Dodge dice equal Speed. Attack dice equal Attack. Implemented in the engine.
- Rulebook §24: lost Health can become Fervor. The digital implementation automatically flips each lost Health token, granting one Fervor per actual Health lost. Isolated as RULES.fervorPerHealthLost; this resolves the optional physical token language without requiring a redundant UI click.
- Technical §§24/29 and rulebook §§13/17/22: damage successfully dealt is interpreted as actual Health removed, capped at remaining Health. That value determines Attack credit and combat comparison. Overkill gives no extra damage credit or Health-loss Fervor. Isolated as RULES.capDamageToHealth for designer revision.
- Defender wins every damage tie. An attacker killed by counters cannot capture a hex. A dead defender needs no pushback; a living attacker captures the vacated hex.
- Pushback is to an adjacent empty non-Sewer hex. The attacker stays at source during unresolved combat, so its source is occupied until capture and is not a legal pushback destination. If all other neighbors are blocked/occupied, the living Rats swap positions (latest owner correction).
- Finish damage is simultaneous. Both eliminated Rats receive applicable Finish credits; active player's simultaneous Finish rewards are recorded first (rulebook §53). Elimination Round is recorded for later betting.
- Early Arena termination at zero/one survivors is implemented because combat must stop immediately; Milestone 4 now adds Arena victory Favor, scoring, bets and transitions.
- Health-loss and tracker rewards resolve on final confirmed dice, never provisional dice. A confirmed Attack cannot be rerolled during Dodge. Dice may be rerolled repeatedly before confirmation.

## Prototype boundaries

- The owner confirmed exactly 19 interior hexes, random Sewers/rock/crate and exterior tangent Burrows. Milestone 4 implements this. Seeded terrain is limited to outer-ring non-entry hexes to maintain connectivity and clear center pushback; Burrows are not part of the 19.
- Rat stats are still placeholders; no draft. Two test Rats assigned per seat, only the deployed opponent Rat is visible.
- All seats manually controlled; controller labels do not imply implemented AI.
- End Turn remains a configurable prototype control (PROTOTYPE.endTurnAllowed); confirm whether passing unused Actions is allowed in the final game.
- Cat behavior is implemented in Milestone 3. Its neutral Attack is automatically confirmed; players retain explicit Dodge confirmation and legal Fervor choices.
- Five Rounds score the Arena and stop at the results view. Explicit continuation advances to Arena 2 or resolves the Match; scoring cannot repeat.
- Sewers require an empty adjacent mandatory exit, with teleport/exit free. Whether exit may directly challenge an occupied hex remains unspecified.

## Later questions

- Cat cases above are resolved by the owner-approved clarifications in RULEBOOK-v1.2.txt §54. Future custom Arenas must provide legal pushback space at the Cat spawn; a fully enclosed occupied spawn still needs a designer rule. The current test Arena has six open spawn neighbors for at most four Rats.
- Owner confirmed: an unbroken Arena tie after Health has no winner and no victory Favor.
- Owner confirmed: full-Health duel Rats, reset trackers/Fervor, Arena 1 dice, no Round limit, and a restart with the same choices if all duelists die. No Favor awards.
- Actual Rat cards, board geometry and artwork can now be shared for content work; abilities and card effects belong to Milestone 5.

## Milestone 3 approved clarifications

The owner approved blocked Cat movement staying in place, occupied respawn triggering combat, and normal Rat-initiated Cat pushback/swap. They explicitly chose player-selected legal Cat pushback after a lost respawn combat; no deterministic nearest-hex rule is used. Active player controls neutral winner displacement when respawn has no movement direction.

Attack dice already used the Rat card stat; identical placeholder cards concealed that behavior. Owner approved varied test Attack stats 2/3/4. Attack 4+ hits in Arena 1; there is no universal Rat Attack count. The full consolidated rulebook is now v1.2.

Cat Health carry is now wired into the Arena 2 transition. Completed Arenas do not start new respawn combat; a Cat respawning into an occupied end-of-Arena spawn remains staged until next Arena setup.

## Milestone 4 owner decisions

Burrow entry must be empty; this avoids a combat retreat violating the one-way rule. Living Rats in Burrows count as participants; the owner has not set a mandatory deployment deadline. Burrow entry costs one movement, and further travel can use the same Move's remaining Speed.

Duel seating preserves clockwise order among tied participants. A fresh seeded 19-hex layout is generated for Arena 2 and the Final Duel, including a restarted duel. The duel has no Cat/start-of-Turn center reward and skips eliminated duelists.

Public early-elimination bets can be selected outside unresolved combat while the Arena continues; a correct bet pays once at scoring. Full Item/Decree systems remain Milestone 5. The Decree reference grid is saved unchanged, with Cat-Dodge objectives excluded in its review catalog and Doma al gato retained.
