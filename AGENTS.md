# Project instructions

Read docs/COMBAT-CORRECTION.md first: the latest owner correction overrides conflicting combat cost, continuation and pushback rules. Use docs/SPECIFICATION.md (owner technical specification v1.0 reference) and docs/RULEBOOK-v1.6.txt (current consolidated rulebook; v1.1 is archived verbatim) as rule sources. Consult docs/DECISIONS.md for explicitly isolated interpretations and milestone boundaries. Preserve rule references when adding features; do not silently invent unspecified rules.

Keep rules independent of React and deterministic. Human and AI use the same engine action generation and validation; never expose unrevealed opponent Rats or RNG to AI. Add meaningful engine regression tests and run pnpm test and pnpm build before delivery. Do not implement later milestones unless requested.

Use 19 hexes with exterior Burrows for two players, and 37 hexes with outer-ring Burrows for three/four. Players place in Turn order. Burrows are one-way; voluntary End Turn in a Burrow is forbidden. See current rulebook section 6 for the approved direct entrance-combat retreat exception (Rat or Cat). Decree reference filtering is recorded in docs/reference/DECREES.md: exclude Cat-specific Dodge objectives, retain Cat defeat. Milestone 5 implements card effects. Exclude every Oro card, including Mercader and Ratón del Gato. Current card clarifications are in rulebook section 56.

Milestone 6 owner correction: English cards only; retire movement-conditioned Rats; Cat rolls four Attack dice; Arena 2 preserves the entire Arena 1 layout. Use automatic decision settlement and a controller-owned four-second exhausted-Turn Item window. Maintain local multiplayer and public-information-only AI. See current rulebook section 57.
