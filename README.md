# The Games of the Pigeon God

Single-player tactical board game prototype. Original title: Los Juegos del Dios Palomo.

## Completed: Milestones 1–3

React + strict TypeScript + Vite, independent seeded engine, 2–4 Rats, axial movement and Sewers, Turns/Rounds, full Rat-versus-Rat combat and the neutral Cat. All seats are manually controlled until AI in Milestone 6.

Combat includes Attack dice, Speed-based Dodge dice, counterattacks, explicit roll confirmation, repeatable Fervor rerolls, simultaneous damage, Health-loss Fervor, trackers and milestones, Finishes, elimination, legal winner-chosen pushback, one-hex retreat and blocked-pushback position swaps. Combat consumes both Actions and automatically ends the Turn. Only one or zero survivors ends the Arena immediately; scoring remains Milestone 4.

## Run

Use Node 22.12+ and pnpm:

```sh
pnpm install
pnpm test
pnpm build
pnpm dev
```

Open the local Vite URL. Set a seed and 2–4 gladiators. First click Roll Cat movement. Resolve any Cat combat, then click an outlined hex to move. Enter another Rat's hex to fight; confirm Attack, operate the defender's Dodge controls, then confirm Dodge. Enabled dice can be rerolled for one Fervor. When prompted, the attacker chooses an outlined pushback hex. Combat requires both Actions and automatically advances the Turn once displacement is complete. No movement follows combat. With only one Action left, you may move to empty hexes but cannot initiate combat. End Turn can end an ordinary noncombat Turn.

Each Turn starts with one Cat movement roll, including eliminated players. Cat Health is shown beside the combat panel. Test Rats now have Attack 2, 3 or 4, displayed separately from their accumulated Attacks tracker. Each Attack die hits on 4, 5 or 6 in Arena 1.

## Rule authority

The latest [owner combat correction](docs/COMBAT-CORRECTION.md) overrides conflicting historical rules.

- [Technical specification reference](docs/SPECIFICATION.md): condensed version of the owner's original technical specification v1.0; authoritative architecture and milestone plan.
- [Current rulebook v1.2](docs/RULEBOOK-v1.2.txt): full consolidated rules including the session corrections, Attack stat examples and approved Cat cases. Original v1.1 is retained unchanged.
- [Reconciliation and decisions](docs/DECISIONS.md): interpretations, prototype boundaries and unresolved questions. Do not silently invent rules.

## Boundaries

Rats and radius-3 board are labeled test fixtures, not final content. The rulebook's standard radius-2 board with Burrows is recorded for the setup update. Draft, Burrows, Arena scoring/transitions, Items, Decrees, abilities, AI and save/resume remain later milestones. Cat surviving Health is preserved by the Arena carry helper; complete Arena transitions arrive in Milestone 4.

## Architecture and verification

UI → controller → engine reducers → serializable state. Engine generates and revalidates legal actions. Defender decisions use the defender's identity without changing Turn ownership. `dispatch` and `simulate` clone inputs; public views exclude hidden reserve Rats and RNG. Combat and movement remain outside React. Event log describes rolls, damage, rewards, Finishes and displacement.

Tests cover the original movement suite plus combat outcomes, confirmation locks, reroll ownership/cost, threshold crossing, simultaneous Finishes, overkill, legal pushback, position swaps, automatic Turn completion and deterministic replay across 200 combat seeds. CI runs tests and builds on pushes. The 1,000 complete AI Matches requirement belongs to later milestones.
