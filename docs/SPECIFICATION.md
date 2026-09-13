# The Games of the Pigeon God — Technical Game Specification v1.0

Original title: Los Juegos del Dios Palomo. Source: owner's specification supplied September 12, 2026 in the project task. This durable reference transcribes the requirements in condensed form, retaining section numbers. The original supplied document takes precedence if wording differs. Prototype decisions do not amend these rules.

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
12. Data-driven Rat card: id/name/maxHealth/attackDice/speed/optional ability/artwork. Runtime: ratId/ownerId/health/axial position/alive.
13. Two drafted Rats hidden until used. Human sees both own cards; AI sees only own unrevealed cards.
14. Receive three Rats, keep one, pass two right, receive two from left, keep one, discard remainder. Select Arena 1 Rat; reserve other for Arena 2.
15. Axial q,r; s=-q-r. Standard neighbors, distance, paths and directions.
16. Terrain: normal, rock, crate, sewer, spawn, center. Hex coordinate, optional sewerId, Rat/Cat occupancy.
17. One Move allows one through Speed hexes; may stop early.
18. Rocks, large crates, Rats and Cat block traversal. Attempted Rat/Cat entry triggers combat and pauses movement.
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
30. Losing defender is pushed to winner-chosen adjacent legal empty inside-Arena nonblocked hex without Rat/Cat. If none, winner retreats. Losing/tied attacker returns to entry source.
31. Surviving moving Rat may continue using unused Speed after combat.
32. Simultaneous damage can kill both; remove both and award both Finish credits. If last two die, Arena ends without winner.
33. Exactly one living Rat at any moment ends Arena immediately with that winner.
34. After Round 5 rank only living Rats by Finishes, Attacks, Dodges, then remaining Health. Winner gets two Divine Favor.

## Cat and betting (§§35–45)
35. Cat has maxHealth nine, current Health, position, spawnPosition, alive.
36. Start of every player's Turn: one d6 picks one of six directions; Cat moves exactly one hex.
37. Eliminated player still has a Turn: roll and resolve Cat movement/combat, then end Turn. No additional Cat move.
38. Cat leaving Arena immediately respawns at spawn, default center.
39. Cat rolls three Attack dice, normal Arena 1 hit rule. Cannot Dodge. Defending Rat uses normal Dodge and may counterattack Cat.
40. Rat voluntarily entering Cat hex attacks normally; Cat cannot Dodge; then Cat combat pushback rules.
41. Winning moving Cat pushes Rat one hex along Cat direction. Illegal destination makes Cat retreat. Rat winning through counter damage may force Cat retreat.
42. Killing Cat grants responsible Rat one Finish. Cat respawns. Configurable explicit assumption: killed Cat respawns at full nine Health.
43. Current Cat Health carries between Arenas, including post-respawn Health.
44. Eliminated player's Cat movement causing a Rat Finish grants that eliminated player one Divine Favor.
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
61. Tied highest players each choose either used Rat for sudden-death Final Duel; all tied players share duel, last surviving wins. Normal combat. No Favor awards, Decrees, Items, Bets or Cat unless enabled later.

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
84. Central rule config: two Arenas, five Rounds, two Actions; Cat nine Health/three dice; four Decrees; Arena winner two Favor; early bet last Round three; Attack/Dodge milestones four/five; Finish Fervor at two/Favor at three.

## Verification and delivery (§§85–101)
85. Test priority engine, combat, movement, lifecycle, AI legality, UI integration.
86. Required combat cases: 4/5/6 = three Arena 1 hits; three hits versus 2/5/6 = one incoming/one counter/two Dodges; one/one damage = defender wins/attacker retreats; simultaneous deaths and both Finish credits.
87. Movement tests: rock/Rat/Cat blockers, stop early, occupied target combat, unused movement after combat, free Sewer teleport/mandatory exit/no end on Sewer, legal empty pushback.
88. Cat tests: once per Turn including eliminated players, three dice, no Dodge, Rat counter, out-of-bounds respawn, killed Cat Finish/respawn, Health persistence.
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
