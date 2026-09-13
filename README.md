# The Games of the Pigeon God

Single-player tactical board game prototype. Original title: Los Juegos del Dios Palomo.

## Completed: Milestones 1–4

React + strict TypeScript + Vite, independent seeded engine, 2–4 Rats, axial movement and Sewers, Turns/Rounds, full Rat-versus-Rat combat and the neutral Cat. All seats are manually controlled until AI in Milestone 6.

Combat includes Attack dice, Speed-based Dodge dice, counterattacks, explicit roll confirmation, repeatable Fervor rerolls, simultaneous damage, Health-loss Fervor, trackers and milestones, Finishes, elimination, legal winner-chosen pushback, one-hex retreat and blocked-pushback position swaps. Combat consumes both Actions and automatically ends the Turn. Zero or one survivor ends the Arena immediately. Arena scoring, early elimination bets, both Arenas, Arena 2 modifiers, Match victory and the Final Duel are implemented.

## Run

Use Node 22.12+ and pnpm:

```sh
pnpm install
pnpm test
pnpm build
pnpm dev
```

Open the local Vite URL. Set a seed and 2–4 gladiators. First select each player's highlighted Burrow in Turn order. Two players use 19 Arena hexes plus exterior Burrows; three/four use 37 hexes with Burrows on the outermost ring. Then click Roll Cat movement and leave through a legal adjacent entrance. End Turn is disabled until departure. A direct attack against an entrance-blocking Cat costs both Actions; a failed attack returns the Rat to its Burrow to retry next Turn. Enter another Rat's hex to fight; confirm Attack, operate the defender's Dodge controls, then confirm Dodge. Enabled dice can be rerolled for one Fervor. When prompted, the attacker chooses an outlined pushback hex. Combat requires both Actions and automatically advances the Turn once displacement is complete. No movement follows combat. With only one Action left, you may move to empty hexes but cannot initiate combat. End Turn can end an ordinary noncombat Turn.

Each Turn starts with one Cat movement roll, including eliminated players. Cat Health is shown beside the combat panel. Test Rats now have Attack 2, 3 or 4, displayed separately from their accumulated Attacks tracker. Each Attack die hits on 4, 5 or 6 in Arena 1.

## Rule authority

The latest [owner combat correction](docs/COMBAT-CORRECTION.md) overrides conflicting historical rules.

- [Technical specification reference](docs/SPECIFICATION.md): condensed version of the owner's original technical specification v1.0; authoritative architecture and milestone plan.
- [Current rulebook v1.4](docs/RULEBOOK-v1.4.txt): full consolidated rules including the session corrections, Attack stat examples and approved Cat cases. Original v1.1 is retained unchanged.
- [Reconciliation and decisions](docs/DECISIONS.md): interpretations, prototype boundaries and unresolved questions. Do not silently invent rules.

## Boundaries

Rat cards remain labeled placeholders. Draft, Items, Decrees, abilities, AI and save/resume are later milestones. The supplied Decree grid and the Cat-Dodge exclusion are archived in [docs/reference/DECREES.md](docs/reference/DECREES.md); no Decree objectives are active yet.

After each Arena, use Continue to intermission / Start Arena 2, or Resolve Match. Arena 2 deploys each player's reserved Rat, retains Divine Favor and Cat Health, resets Arena resources and uses least-Favor Turn order. Tied Arena rankings award nobody. Tied Match scores lead to a Final Duel Rat choice for each tied player. Duel Rats start at full Health, use Arena 1 dice, have no Cat or Round limit, and cannot earn more Favor. All-duelist simultaneous death restarts the duel with the same choices.

Terrain varies deterministically by seed on the radius-2 ring while preserving center space and connectivity. Burrow placement cannot block every entrance. Burrows are selected again for Arena 2 and each Final Duel layout. They cannot be re-entered except after a failed direct Cat attack from the Burrow.


## Architecture and verification

UI → controller → engine reducers → serializable state. Engine generates and revalidates legal actions. Defender decisions use the defender's identity without changing Turn ownership. `dispatch` and `simulate` clone inputs; public views exclude hidden reserve Rats and RNG. Combat and movement remain outside React. Event log describes rolls, damage, rewards, Finishes and displacement.

Tests cover the original movement suite plus combat outcomes, confirmation locks, reroll ownership/cost, threshold crossing, simultaneous Finishes, overkill, legal pushback, position swaps, automatic Turn completion and deterministic replay across 200 combat seeds. CI runs tests and builds on pushes. The 1,000 complete AI Matches requirement belongs to later milestones.

New tests cover generated 19/37-hex connectivity over many seeds, one-way Burrows, ranking and scoring idempotence, bets, reset/persistence, Arena 2 center, Match victory, duel damage and restart, and complete 2-, 3- and 4-player Matches using legal decisions.
