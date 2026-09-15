# The Games of the Pigeon God

Single-player tactical board game prototype. Original title: Los Juegos del Dios Palomo.

## Completed: Milestones 1–7

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

Zero Actions and no Items ends the Turn immediately. Equipped Items give human players a visible five-second window. Legal Item use cancels the previous timer, and bonus effects finish before Turn advance. AI uses only public state, its own Rats, legal actions and shallow engine simulations with hidden information removed. Hard AI remains a later milestone.

Roll-button clarification: Rats explicitly click Roll Attack and Roll Dodge. Applicable pre-roll Items are offered alongside that roll button, without an extra preparation confirmation. After rolling, continue automatically unless a legal Item, ability or Fervor decision remains. The neutral Cat rolls automatically.

## Milestone 7 — illustrated playable UI

The supplied board tiles, Burrows, resource tokens and card illustrations now appear in the playable interface. Divine Favor displays as a circular medallion. The UI includes Rat HUDs and trackers, four public Decrees, equipped Item descriptions, explicit Attack/Dodge controls, legal approach previews, a readable event chronicle, movement transitions and reduced-motion support. Local/AI mode and 2–4-player setup remain available through Match settings.

The rules engine is unchanged. See [artwork provenance](docs/reference/ARTWORK.md). Full drafting, save/resume and Hard AI remain pending.

## Production deployment

See [Cloudflare Pages deployment](docs/DEPLOYMENT.md) for build settings, route fallback and production verification. Build with `npm run build`; publish `dist/`.

## Milestone 8 — tokens, consent and analytics

New Matches default to **one human and two AI opponents**. Match settings still support 2–4 seats and local multiplayer. Health coins flip into Fervor when damaged; additional earned Fervor appears as extra flame-only tokens. Spent tokens dim. These are presentation changes, not new resource rules.

Players can consent to storing their name, any-provider email and gameplay statistics, or play without sharing. The profile can be edited or centrally deleted. Consented telemetry uses a private Cloudflare Worker and D1 through the existing gateway; gameplay continues when uploads fail. See [analytics operations and limitations](docs/MILESTONE-8-OPERATIONS.md).

## Run balance simulations locally

Open a terminal in this repository. Install Node.js 22.12 or newer, then:

```sh
npm install
npm run simulate -- --games=1000
```

No game server or browser is required. The runner uses the existing engine and AI, checks every selected action for legality, and cycles through 2-, 3- and 4-player Matches. Seeds begin at 1 unless specified:

```sh
npm run simulate -- --games=100 --seed=2001
npm run simulate -- --games=10000
```

Results go into a new **`simulation-results/run-<UTC timestamp>/`** directory:

- `balance-simulation.xlsx`: nine readable sheets, including Rat performance and balance findings.
- `simulation.json`: all Match metrics, seeds, versions and accepted decisions.
- Separate CSV files for Matches, Rats, Decrees, Items, Cat and Arena metrics.
- `balance-findings.md`: review signals only; the command never rebalances the game.

Excel generation uses the **Codex bundled `@oai/artifact-tool` runtime**, automatically found in the current user's Codex cache. This is a reporting-only prerequisite, not a production game dependency. If it is installed elsewhere, set `MARLO_REPORT_NODE_MODULES` to that runtime's `node_modules` directory. For the default Windows Codex installation:

```powershell
$env:MARLO_REPORT_NODE_MODULES = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
npm run simulate -- --games=1000
```

If the Excel runtime is unavailable, the command reports that error after saving raw JSON/CSVs. Once configured, regenerate the workbook without rerunning Matches:

```sh
node scripts/report.mjs simulation-results/run-<existing timestamp>
```

Reports are excluded from Git. Preserve the whole run folder for later comparison. Compare matching `rulesVersion`, `aiVersion`, `metricsVersion`, player counts and controller types. The current AI has one strategy; the report does not invent difficulty variants. Rat Match wins describe association with the winning participant, not a causal contribution by one Rat.

Verification commands:

```sh
npm test
npm run test:api
npm run test:telemetry
npm run build
```

The first recorded 1,000-Match findings are in [the balance review](docs/BALANCE-2026-09-15.md). One existing Arena-reset bug was fixed before that run; no stats, rewards or AI weights were changed.
