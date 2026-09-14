# The Games of the Pigeon God — Technical Game Specification v1.0

Original title: Los Juegos del Dios Palomo. Source: owner's specification supplied September 12, 2026 in the project task. This durable reference transcribes the requirements in condensed form, retaining section numbers. The original supplied document takes precedence if wording differs. Prototype decisions do not amend these rules.

## Current rulebook and Attack clarification

Read [RULEBOOK-v1.6.txt](RULEBOOK-v1.6.txt), the consolidated rulebook with session corrections integrated into the actual rule sections. Each Rat rolls exactly its card attackDice: Attack 2 rolls two dice, Attack 4 rolls four. Arena 1 Attack results 4, 5 and 6 each cause one Hit. Prototype stats are not official Rat designs. Milestone 3 implements Cat Turn movement, shared combat, respawn, persistent Health and eliminated-player interaction; all dice remain seeded.

## Latest owner correction takes precedence

Read [COMBAT-CORRECTION.md](COMBAT-CORRECTION.md) before implementing combat. Combat now costs both Actions and ends the Turn; no movement continuation. A losing attacker retreats one approach hex. Blocked defender pushback causes a position swap. Conflicting historical sections below are superseded.

## Rulebook clarification received for Milestone 2

The full owner-supplied [Rulebook v1.1](RULEBOOK-v1.1.txt) is preserved verbatim. Its §§4/14 establish Speed as the Dodge dice count; §24 adds Fervor from lost Health. Consult [DECISIONS.md](DECISIONS.md) for reconciliation and explicitly isolated prototype interpretations. The technical milestone sequence remains unchanged.

## Product and architecture (§§1–8)
1. Primary reference. Prioritize rule correctness, deterministic state, logic/UI separation, testability, equal AI rules and expansion.
2. Browser single-player versus AI: one human, 1–3 AI, 2–4 gladiators, two Arenas, local save/resume, difficulties, modular Arenas, combat, Decrees, Items, neutral Cat, final duel. Approximately 30 minutes.
3. Exclude online multiplayer, accounts, matchmaking, ranked ladders, cloud saves, monetization, networking, mobile packaging, ML AI, procedural Rats and campaigns.
4. React, TypeScript, Vite; lightweight UI wrapper optional; Vitest and React Testing Library. Engine owns authoritative state.
5. UI → Controller → Rules Engine → Game State. Human and AI select engine Legal Actions; AI never modifies state directly.
6. Separate engine state/actions/combat/movement/cat/decrees/items/arena/scoring/rng/validation; AI legalActions/evaluator/strategies/difficulty/simulation; content rats/items/decrees/arenas; UI board/hud/cards/dialogs/combat/animations; persistence saves/settings; feature tests.
7. UI asks getLegalActions(playerId). Engine validates every selected action again. UI never decides legality.
8. Match = two Arenas. Arena = at most five Rounds. Round = one Turn per participating player. Living Rat normally gets two Actions per Turn. Move and Request Item are Actions; combat normally follows movement.

## State, cards and movement (§§9–19)
9. Explicit phases: SETUP, RAT_DRAFT, ARENA_SETUP, ROUND_START, TURN_START, CAT_MOVEMENT, PLAYER_ACTION, COMBAT, TURN_END, ROUND_END, ARENA_END, BETTING_RESOLUTION, BETWEEN_ARENAS, MATCH_END, FINAL_DUEL. Reject actions outside allowed phases.
10. GameState: phase, arenaNumber (1|2), roundNumber, activePlayerId, turnOrder, players, board, cat, decrees, decreeDeck, itemDeck, RNG, optional winner/finalDuel, eventLog.
11. Player: id, controller human|ai, optional difficulty, Divine Favor, drafted Rats, current Rat, eliminated, elimination Round, bet target, Attacks, Dodges, Finishes, Fervor, equipped Item, Actions remaining.
12. Each Rat rolls its individual Attack stat as its Attack dice count (Attack 2 = two dice); Speed is its Dodge dice count. Data-driven Rat card: id/name/maxHealth/attackDice/speed/optional ability/artwork. Runtime: ratId/ownerId/health/axial position/alive.
13. Two drafted Rats hidden until used. Human sees both own cards; AI sees only own unrevealed cards.
14. Receive three Rats, keep one, pass two right, receive two from left, keep one, discard remainder. Select Arena 1 Rat; reserve other for Arena 2.
15. Standard Arena: two players use 19 radius-2 hexes with exterior adjacent Burrows; three/four players use 37 radius-3 hexes with Burrows on the outermost Arena ring. Players choose distinct legal Burrows in Turn order at setup. At least one entrance must remain clear of blocking terrain. Burrows are one-way on both board sizes. Voluntary End Turn is forbidden while in a Burrow. A direct attack against an entrance-blocking Rat or Cat is allowed; losing/tying returns the Rat to its Burrow, ends the Turn, and requires retry next Turn. Two connected Sewers, one rock and one crate use seeded placement that preserves legal entries and connectivity. Axial q,r; s=-q-r. Standard neighbors, distance, paths and directions.
16. Terrain: normal, rock, crate, sewer, spawn, center. Hex coordinate, optional sewerId, Rat/Cat occupancy.
17. One Move allows one through Speed hexes; may stop early.
18. Rocks and large crates block traversal. Rat/Cat entry requires and consumes both Actions, triggers combat and ends the Turn after resolution.
19. Occupied-hex entry automatically starts combat. No separate Attack Action.

## Combat and rewards (§§20–34)
20. Moving Rat attacks occupant. Attack roll → attacker Fervor window → explicit confirmation → Dodge roll → defender Fervor window → confirmation → hits/Dodges/counters → simultaneous damage → death → combat winner → pushback.
21. Arena 1 Attack die 1–3 miss; 4–6 one hit. Each uncancelled hit causes one damage.
22. Dodge die 1–4 fails; 5 cancels one hit; 6 cancels one hit and counters for one damage. Each 5/6 adds one Dodge tracker.
23. Counter damage counts as Attacks. Example three hits versus 2,5,6: one incoming damage, one counter damage, two Dodges.
24. Attacks count damage successfully dealt, including counters. Reaching four and five Attacks grants one Fervor each, immediately.
25. Each successful Dodge increments tracker. Reaching four and five Dodges grants one Fervor each.
26. Causing Rat Health to reach zero adds one Finish. First: no bonus. Second: one Fervor. Third: one Divine Favor.
27. Spend one Fervor to reroll one Attack or Dodge die. May reroll same die repeatedly with sufficient Fervor.
28. Explicit Attack and Dodge confirmation locks each roll; Attack cannot change after Dodge phase starts.
29. Compare damage dealt in this combat. Attacker wins only if greater; defender wins every tie, including zero/zero.
30. Losing defender is pushed to a winner-chosen adjacent legal empty hex. If none, living participants swap positions. Losing/tied Rat attacker retreats exactly one approach hex.
31. Normally end the attacking Rat's Turn after displacement. Supplied card-granted Actions and movement explicitly override that normal ending; resolve their effects before advancing Turn order.
32. Simultaneous damage can kill both; remove both and award both Finish credits. If last two die, Arena ends without winner.
33. Exactly one living Rat at any moment ends Arena immediately with that winner.
34. After Round 5 rank only living Rats by Finishes, Attacks, Dodges, then remaining Health. Winner gets two Divine Favor. If all four ranking criteria remain tied for first, no winner or victory Favor is awarded.

## Cat and betting (§§35–45)
35. Cat has maxHealth nine, current Health, position, spawnPosition, alive.
36. Start of every player's Turn: one d6 picks one of six directions; Cat moves exactly one hex.
37. Eliminated player still has a Turn: roll and resolve Cat movement/combat, then end Turn. No additional Cat move.
38. Cat leaving Arena respawns at spawn, default center, preserving surviving Health. Occupied respawn triggers Cat combat.
39. Cat rolls four Attack dice, normal Arena 1 hit rule. Cannot Dodge. Defending Rat uses normal Dodge and may counterattack Cat.
40. Rat voluntarily entering Cat hex attacks normally; Cat cannot Dodge; then Cat combat pushback rules.
41. Winning moving Cat pushes Rat one hex along its direction; illegal destination makes Cat retreat. If Cat loses or ties, the winning Rat chooses legal Cat pushback. Respawn has no approach direction: active player chooses Rat pushback if Cat wins.
42. Killing Cat grants responsible Rat one Finish. Cat respawns. Configurable explicit assumption: killed Cat respawns at full nine Health.
43. Current Cat Health carries between Arenas, including post-respawn Health.
44. A player already eliminated at the time of the Cat movement roll gains one Divine Favor for a Rat Finished by that Cat movement/combat. Preserve this credit through respawn resolution.
45. Players eliminated Rounds 1–3 may make one public bet on another player's Arena victory. Correct bet grants one Divine Favor. No bets for Round 4/5 eliminations.

## Sewers, Decrees and Items (§§46–54)
46. Default two connected Sewers: enter A, teleport B, immediately exit to adjacent legal hex. Cannot end on Sewer.
47. Teleport and mandatory exit cost zero additional movement. One entry uses one Speed.
48. Four public active Decrees while enough deck cards remain. Claim, reward, discard and replace. Each card claimed by only one player.
49. Immediate thresholds (Attacks/Dodges/Finishes): first qualifying player claims. Replacement immediately active.
50. End-Arena conditions include most Attacks, most Health, exactly one Health, specific hex. Comparisons require strict superiority over all other eligible players; tie awards nobody, no secondary tie-break.
51. Decree data: id/name/description/timing immediate|end_of_arena/rewardDivineFavor/data-driven condition.
52. Maximum one equipped Item. Request only when none equipped and not sharing Rat/Cat hex. Spend one Action, draw exactly one, must keep.
53. Item use normally costs zero Actions. Item timings: during_turn, before_attack_roll, after_attack_roll, before_dodge_roll, after_dodge_roll, after_movement. Discard consumed Items and all unused Items at Arena end.
54. Item data: id/name/description/timing/effect/consumable true. No UI effect logic.

## Arena 2 and match completion (§§55–61)
55. Arena 2 retains rules plus two global modifiers.
56. Living Rat starting Turn on center gains one Fervor each Turn, naturally once per Round.
57. Arena 2 Attack: 1–3 miss, 4/5 one hit, 6 two hits. Applies to Rats and Cat. Dodge unchanged.
58. Between Arenas preserve Divine Favor and Cat Health. Reset trackers, Fervor, Items, eliminated state, bets, Actions. Replace Arena 1 Rat with reserved Rat.
59. Arena 1 random first player, clockwise order. Arena 2 least Favor starts; tied least uses latest seat in previous Arena's Turn order, then clockwise.
60. After Arena 2 highest Divine Favor wins.
61. Tied highest players each choose either used Rat at full Health, with reset trackers and Fervor, for sudden-death Final Duel; all tied players share duel, last surviving wins. Use Arena 1 combat, no center bonus and no Round limit. If no duelist survives, restart with the same choices. No Favor awards (including milestones), Decrees, Items, Bets or Cat.

## AI (§§62–67)
62. AI consumes getVisibleGameState(aiPlayerId) and getLegalActions(aiPlayerId); no hidden information.
63. Heuristic plus shallow simulation: generate legal actions, simulate, evaluate, score, select. No ML.
64. Tuneable starting weights: Finish +100; survive +80; immediate Arena win +150; damage +15; avoid damage +12; Decree +40 times reward; Favor +60/point; Fervor +8; Attack milestone +12; Dodge milestone +10; Finish milestone +20; approach weak enemy +5; Arena 2 center +15; Cat danger -10; elimination risk -80; certain elimination -150.
65. Future Aggressive/Tactical/Chaotic personalities via weights; v1 may be balanced.
66. Easy 70% strategy/30% random legal variation; Normal full heuristic; Hard adds one opponent-response simulation layer. Same information restrictions.
67. AI explicitly evaluates reroll versus Fervor value, considering Health, Decrees, milestones, Arena and Rounds left. Never automatically spends all Fervor.

## Determinism, events and persistence (§§68–73)
68. Single RNG abstraction for dice, order, all decks and Easy randomness; next, rollD6, shuffle.
69. Fixed seed reproduces exact sequence; development and testing must support seeds.
70. Meaningful changes emit events: movement, attack/Dodge rolls, damage, Finish, Cat movement/respawn, Decree, Item, Fervor, Arena end. UI animates events.
71. Readable log includes Round, movement, challenges, rolls, damage, winner and pushback.
72. localStorage or IndexedDB saves complete state, RNG state/seed, version and timestamp.
73. SaveFile version/timestamp/state supports future migration.

## UI and APIs (§§74–84)
74. Menu PLAY/CONTINUE/HOW TO PLAY/SETTINGS; configure 1/2/3 AI and Easy/Normal/Hard.
75. Board displays hexes, terrain, Rats, Cat, Sewers, center, legal moves, active player, selected Rat, combat targets.
76. HUD: portrait/name/Health/Fervor/Attack stat/Speed/Actions/Attacks/Dodges/Finishes/Favor/equipped Item.
77. Public Decrees (four), Favor, revealed Rats, Health, trackers, Items, Round, Arena, order and Cat Health always visible.
78. Dedicated combat panel with Attack/Dodge dice, reroll and explicit confirmations, then results.
79. Highlight engine legal destinations. Engine validation remains authoritative.
80. Recommended API createGame/getState/getVisibleState/getLegalActions/dispatch/simulate/cloneState/isGameOver.
81. Actions include Move/RequestItem/UseItem/SpendFervor/ConfirmAttack/ConfirmDodge/SelectPushback/SelectBet/SelectRat.
82. MOVE {playerId,path}. Validate player, phase, alive, Actions, adjacency, Speed, terrain, occupancy, Sewers.
83. Explicit combat context: attacker/defender/source/destination/rolls/confirmations/damage/movement remaining.
84. Central rule config: two Arenas, five Rounds, two Actions; Cat nine Health/four dice; four Decrees; Arena winner two Favor; early bet last Round three; Attack/Dodge milestones four/five; Finish Fervor at two/Favor at three.

## Verification and delivery (§§85–101)
85. Test priority engine, combat, movement, lifecycle, AI legality, UI integration.
86. Required combat cases: 4/5/6 = three Arena 1 hits; three hits versus 2/5/6 = one incoming/one counter/two Dodges; one/one damage = defender wins/attacker retreats; simultaneous deaths and both Finish credits.
87. Movement tests: blockers, stop early, combat requires both Actions, no post-combat continuation, free Sewer exit, legal empty pushback, blocked-pushback swap, automatic Turn end.
88. Cat tests: once per Turn including eliminated players, four dice, no Dodge, Rat counter, out-of-bounds respawn, killed Cat Finish/respawn, Health persistence.
89. Arena tests: one survivor immediate win, zero survivors no winner, living-only ranking Finishes→Attacks→Dodges→Health.
90. Decree tests: four active, immediate claim/replacement, first claimant only, comparative tie nobody, correct end-Arena timing.
91. Arena 2 tests: center start Fervor, six causes two hits for Rat and Cat.
92. At least 1,000 simulated complete AI Matches; each chosen action legal. No unavailable actions, obstacles crossed, secret Rats seen, unavailable Fervor, illegal Items, excess Speed or post-elimination actions.
93. Invariants: nonnegative Health/Actions/Favor/Fervor, no shared Rat Turn-ending hexes, no living Rat blocked terrain, Cat Health zero through nine.
94. Development-only debug controls: seed, forced dice, Fervor, Health, teleport, Item/Decree spawn, Round advance, kill Rat, damage Cat, skip AI. Never production gameplay.
95. Structured content definitions for Rats/Items/Decrees/Arenas.
96. Milestones: (1) hex board, players, Rats, Turns, Rounds, movement, unit tests, no polish; (2) combat rolls/Dodge/counters/Fervor/damage/trackers/Finish/pushback; (3) Cat; (4) five Rounds/early win/scoring/transitions/Arena 2/match/duel; (5) content systems/abilities; (6) basic legal heuristic AI/rerolls; (7) playable board/HUD/dice/combat/cards/animation UI; (8) Hard AI/threat/difficulties/tutorial/save/audio/visual polish.
97. Strict TypeScript, no any, small functions, React-independent engine, feature tests, single combat rule implementation, pure functions preferred, document nonobvious rules, separate content.
98. Complete v1 requires 2–4 players versus AI, draft, both Arenas, correct Turns/Actions/movement/combat/Fervor/pushback/Cat/elimination/betting/Decrees/Items/Arena 2/Favor/duel, legal complete AI Matches, save/resume, passing core tests and seeded reproducibility.
99. Order: rules → tests → AI → functional UI → animation → polish.
100. First pass only React/TS/Vite, pure engine, hex math, models, Turn/Round machine, movement validation, seeded RNG and Vitest. Deterministic playable movement prototype. No Items, Decrees or advanced AI. Combat after reliable Milestone 1 and user continuation.
101. Always use this specification. Identify rule section, implement engine, add/run tests, fix regressions. Never silently invent missing rules; isolate them in configurable constants or TODOs. Engine stays deterministic, testable and UI independent.

## Milestone status

- Milestones 1–2 complete, including owner combat corrections.
- Milestone 3: Cat movement once per Turn, neutral four-dice attacks, shared combat, respawn, persistent Health helper, eliminated-player movement and Finish credit. Mixed seeded replay and Cat unit tests verify the implementation.
- Milestone 4 complete: 19/37-hex seeded Arenas with ordered Burrow placement and mandatory exit, five-Round/early scoring, public bets, Arena 2 transition and modifiers, Match completion and Final Duel.
- Milestone 5: supplied Rat stats/abilities, Items with explicit timing windows, public Decrees and replacement/scoring are implemented. Oro cards and Cat-Dodge Decrees are excluded.
- Milestone 6 complete: balanced legal-action AI, shallow simulation, reroll decisions and live local/AI mode. Milestones 7–8 remain planned.

The prototype now deals two distinct supplied Rats per seat from the 18-card active pool; the physical draft remains a separate pending feature. Printed Attack, Health and Speed replace test stats.

Milestone 5 content reference: see reference/DECREES.md and the supplied grid. Exclude Cat-specific Dodge objectives; retain Doma al gato (Cat defeat) and general Dodge objectives. Do not create a separate Cat-Dodge tracker.

## Milestone 5 owner rulings

Rulebook v1.6 section 56 governs the card implementation. Card-granted Actions/movement override normal combat Turn end. Remove every Oro card. Pacifista means zero damage dealt. Cat Finishes meet generic Finish objectives. Turno 5 means Round 5. Matching Attack pairs include misses; Místico deals three incoming Hits that remain Dodgeable and counterable. Die modifiers cap at six. Chile grants persistent normal Fervor. Esquivo requires at least one successful Dodge die. Clavo adds an extra push. A Rat blocking a Burrow entrance can be challenged using the same return-and-retry rule as the Cat.

## Milestone 6 owner changes

Milestone 6 implements balanced heuristic AI with shallow public-state simulations and a live local/AI toggle. No Hard opponent-response layer is claimed yet. Automatic settlement skips noninteractive roll, Cat and displacement steps; applicable Item/ability/Fervor decisions still pause. Human exhausted Turns end immediately without Items, or after a cancellable five-second Item window. Wall-clock timing lives in the controller/UI, not the deterministic reducer.

Cat Attack is now four dice. Arena 2 reuses Arena 1's complete terrain, Cat spawn and Burrows. Active cards are translated into English. Retire Swift, Warrior, Murmillo and Thracian Rat for rework, retaining 14 active Rats. Keep the two Oro/Gold cards excluded. Damage logs include remaining Health. Rulebook v1.6 sections 56–57 supersede the earlier wording.

Roll-button clarification: Rats explicitly click Roll Attack and Roll Dodge. Applicable pre-roll Items are offered alongside that roll button, without an extra preparation confirmation. After rolling, continue automatically unless a legal Item, ability or Fervor decision remains. The neutral Cat rolls automatically.
