# The Games of the Pigeon God

Single-player tactical board game prototype based on the owner's Technical Game Specification v1.0 (original title: Los Juegos del Dios Palomo).

## Milestone 1

React + strict TypeScript + Vite; independent deterministic rules engine; axial hex board; 2–4 gladiators; seeded clockwise first-player selection; Turns and five Rounds; movement validation; connected Sewers; combat handoff; Vitest regression tests; minimal manual movement UI.

Run with Node 22.12+ and pnpm:

```sh
pnpm install
pnpm test
pnpm build
pnpm dev
```

Open the local URL printed by Vite. Set a seed and seat count, start a prototype, and click an outlined hex. Each move spends one Action. End Turn advances to the next seat. The prototype lets you control all seats manually; AI is Milestone 6. Entering an occupied hex stops at COMBAT, preserving source and unused movement for Milestone 2. Start a new prototype after testing this boundary. Round 5 ends at ARENA_END without scoring.

## Rule authority and milestone boundaries

The owner's supplied **Technical Game Specification v1.0, sections 1–101** is authoritative. The durable rule reference is [docs/SPECIFICATION.md](docs/SPECIFICATION.md). Decisions and open questions are in [docs/DECISIONS.md](docs/DECISIONS.md). No rule may be inferred from UI behavior.

Placeholder Rats are assigned, not drafted. Cat is a stationary collision target. Combat resolution, scoring, a second Arena, Items, Decrees, abilities, AI, save/resume and polished artwork are deliberately not implemented in this milestone.

## Architecture

UI → controller → pure engine reducers → serializable GameState. `getLegalActions` supplies UI choices; `dispatch` independently validates paths, including valid paths other than the canonical shortest paths shown by the UI. `simulate` never mutates its input. Opponent views exclude unrevealed Rat cards and RNG state. All RNG uses one serializable seeded implementation. Events describe movement and phase transitions.

Content in `src/content/prototype.ts` is replaceable test data. Rat and Cat occupancy are derived from entity positions rather than duplicated in board hexes. Combat records attempted entry without overlapping entities.

Tests cover RNG replay, 2–4 players, turns/rounds, blockers, occupied destinations, sewer costs/exits, immutable dispatch, visibility restrictions, and generated-action validation across 100 seeds for every seat count. The specification's 1,000 complete AI Matches test belongs to Milestone 6 onward.
