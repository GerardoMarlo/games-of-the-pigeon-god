# Project instructions

Read docs/COMBAT-CORRECTION.md first: the latest owner correction overrides conflicting combat cost, continuation and pushback rules. Use docs/SPECIFICATION.md (owner technical specification v1.0 reference) and docs/RULEBOOK-v1.3.txt (current consolidated rulebook; v1.1 is archived verbatim) as rule sources. Consult docs/DECISIONS.md for explicitly isolated interpretations and milestone boundaries. Preserve rule references when adding features; do not silently invent unspecified rules.

Keep rules independent of React and deterministic. Human and AI use the same engine action generation and validation; never expose unrevealed opponent Rats or RNG to AI. Add meaningful engine regression tests and run pnpm test and pnpm build before delivery. Do not implement later milestones unless requested.

Use the 19-hex standard Arena with exterior one-way Burrows. Decree reference filtering is recorded in docs/reference/DECREES.md: exclude Cat-specific Dodge objectives, retain Cat defeat. Decree execution belongs to Milestone 5.
