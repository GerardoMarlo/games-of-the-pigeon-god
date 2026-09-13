# The Games of the Pigeon God

Single-player tactical board game prototype. Original title: Los Juegos del Dios Palomo.

## Completed: Milestones 1–6

React, strict TypeScript and Vite with a deterministic engine independent of the UI. Hex movement, Rat combat, the Cat, both Arenas, scoring, bets and Final Duels are implemented. Milestone 5 adds **14 supplied Rats with abilities, 17 Items, and 19 public Decrees**.

Every card mentioning the retired Oro mechanic is excluded: Ratón Mercader and Ratón del Gato. Burla al gato remains excluded; Doma al gato and general Dodge objectives remain active. No Oro resource or separate Cat-Dodge tracker exists.

## Run

Use Node 22.12+ and pnpm:

```sh
pnpm install
pnpm test
pnpm build
pnpm dev
```

Choose a seed and 2–4 gladiators, then place highlighted Burrows in Turn order. Two players use 19 Arena hexes with exterior Burrows; three/four use 37 hexes with Burrows on the outermost ring. Cat movement is automatic, with a conditional reroll window only for an applicable Item. End Turn remains disabled inside a Burrow. A blocked entrance can initiate combat against a Rat or the Cat; a failed departure retreats into the Burrow and ends the Turn for a retry.

After departure, Request Item spends one Action and draws a mandatory Item. Normal capacity is one; Ingeniero holds two. Card controls appear only at engine-approved timings. Before-roll windows appear only when an equipped Item can be used. Rolls and forced displacement otherwise resolve automatically; legal Item, ability and Fervor choices still pause. Dice and applicable Rat ability adjustments are selected explicitly. Public Decrees show their conditions and rewards; the engine automatically claims and replaces them.

Combat normally spends two Actions and ends the Turn. Card-granted Actions and movement override that ending, with explicit bonus-movement choices after displacement. One bonus Action cannot start combat, which still costs two. Early Arena victory takes precedence. Chili grants one normal Fervor without a Turn expiry; Mystic Rat's matching dice generate three incoming Hits which can be Dodged and countered.

Select Local multiplayer for shared-device play or Human vs AI for P1 against balanced AI. The switch also works during a Match. The prototype deals two unique seeded Rats per seat, automatically deploying the first and reserving the second. Full drafting, save/resume, final card artwork presentation and animation remain pending features; they are not claimed as complete here.

## Rule authority

- [Current rulebook v1.6](docs/RULEBOOK-v1.6.txt): consolidated rules; section 56 records card rulings. Historical rulebooks remain archived.
- [Technical specification](docs/SPECIFICATION.md): architecture and milestone plan.
- [Combat correction](docs/COMBAT-CORRECTION.md): base combat cost, retreat and displacement rules; newer card exceptions are in v1.6.
- [Decisions](docs/DECISIONS.md): explicit interpretations and prototype boundaries.
- [Rat and Item reference](docs/reference/RATS-AND-ITEMS.md) and [Decrees](docs/reference/DECREES.md): supplied grids, exclusions and content notes.

## Architecture and verification

UI → controller → engine → serializable state. Human and AI use the same legal action generation and validation. Public views exclude unrevealed Rats, RNG and deck order. Cards are defined in `src/content`; card timing, abilities, Decree conditions, inventories and bonus-effect resolution live in `src/engine/content`. The event log records card use, Decree claims, rolls, damage and displacement.

Tests retain the earlier engine regressions in explicit card-free fixtures and add card timing/ownership, all Item families, Rat abilities, simultaneous rewards, deck replacement, Arena resets and deterministic complete Matches with real cards. The AI test completes 1,000 seeded Matches and verifies each chosen action is engine-legal.

## Milestone 6 changes

The Cat rolls four Attack dice. Arena 2 preserves the exact Arena 1 terrain and Burrows. Active card names and descriptions are English; Swift, Warrior, Murmillo and Thracian Rat are excluded for rework along with the two earlier Gold/Oro cards.

Zero Actions and no Items ends the Turn immediately. Equipped Items give human players a visible four-second window. Legal Item use cancels the previous timer, and bonus effects finish before Turn advance. AI uses only public state, its own Rats, legal actions and shallow engine simulations with hidden information removed. Hard AI remains a later milestone.
