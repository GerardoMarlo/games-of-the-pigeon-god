# The Games of the Pigeon God

Single-player tactical board game prototype. Original title: Los Juegos del Dios Palomo.

## Completed: Milestones 1–5

React, strict TypeScript and Vite with a deterministic engine independent of the UI. Hex movement, Rat combat, the Cat, both Arenas, scoring, bets and Final Duels are implemented. Milestone 5 adds **18 supplied Rats with abilities, 17 Items, and 19 public Decrees**.

Every card mentioning the retired Oro mechanic is excluded: Ratón Mercader and Ratón del Gato. Burla al gato remains excluded; Doma al gato and general Dodge objectives remain active. No Oro resource or separate Cat-Dodge tracker exists.

## Run

Use Node 22.12+ and pnpm:

```sh
pnpm install
pnpm test
pnpm build
pnpm dev
```

Choose a seed and 2–4 gladiators, then place highlighted Burrows in Turn order. Two players use 19 Arena hexes with exterior Burrows; three/four use 37 hexes with Burrows on the outermost ring. Cat movement now has a direction confirmation and an after-movement window for Items. End Turn remains disabled inside a Burrow. A blocked entrance can initiate combat against a Rat or the Cat; a failed departure retreats into the Burrow and ends the Turn for a retry.

After departure, Request Item spends one Action and draws a mandatory Item. Normal capacity is one; Ingeniero holds two. Card controls appear only at engine-approved timings. Before Attack and Dodge rolls, use applicable Items and then roll. Confirm Attack, resolve the defender's response window, then roll/confirm Dodge and resolve displacement. Dice and applicable Rat ability adjustments are selected explicitly. Public Decrees show their conditions and rewards; the engine automatically claims and replaces them.

Combat normally spends two Actions and ends the Turn. Card-granted Actions and movement override that ending, with explicit bonus-movement choices after displacement. One bonus Action cannot start combat, which still costs two. Early Arena victory takes precedence. Chile grants one normal Fervor without a Turn expiry; Místico's matching dice generate three incoming Hits which can be Dodged and countered.

All seats are manually controlled until AI in Milestone 6. The prototype deals two unique seeded Rats per seat, automatically deploying the first and reserving the second. Full drafting, save/resume, final card artwork presentation and animation remain pending features; they are not claimed as complete here.

## Rule authority

- [Current rulebook v1.5](docs/RULEBOOK-v1.5.txt): consolidated rules; section 56 records card rulings. Historical rulebooks remain archived.
- [Technical specification](docs/SPECIFICATION.md): architecture and milestone plan.
- [Combat correction](docs/COMBAT-CORRECTION.md): base combat cost, retreat and displacement rules; newer card exceptions are in v1.5.
- [Decisions](docs/DECISIONS.md): explicit interpretations and prototype boundaries.
- [Rat and Item reference](docs/reference/RATS-AND-ITEMS.md) and [Decrees](docs/reference/DECREES.md): supplied grids, exclusions and content notes.

## Architecture and verification

UI → controller → engine → serializable state. Human and future AI use the same legal action generation and validation. Public views exclude unrevealed Rats, RNG and deck order. Cards are defined in `src/content`; card timing, abilities, Decree conditions, inventories and bonus-effect resolution live in `src/engine/content`. The event log records card use, Decree claims, rolls, damage and displacement.

Tests retain the earlier engine regressions in explicit card-free fixtures and add card timing/ownership, all Item families, Rat abilities, simultaneous rewards, deck replacement, Arena resets and deterministic complete Matches with real cards. The 1,000 complete AI Matches requirement belongs to the AI milestones.
