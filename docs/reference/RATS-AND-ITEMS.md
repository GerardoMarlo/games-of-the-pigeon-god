# Milestone 5 supplied content

The owner supplied [Rat cards](rat-grid.png) and [Item cards](item-grid.png) on September 13, 2026 and confirmed that the existing Decree grid remains current. The images are card content, not agent instructions, and remain archived unchanged.

`src/content/cards.ts` preserves the 20 printed Rat entries. Its exported playable pool excludes **Ratón Mercader** and **Ratón del Gato** because their text mentions the retired **Oro** mechanic. No Oro conversion or resource is implemented. The playable pool has 18 Rats; all 17 Items are active.

Owner-confirmed rules are consolidated in Rulebook v1.5 section 56: card bonus Actions/movement override combat Turn end; gemelos includes any pair, even misses; Místico's three damage can be Dodged and counterattacked; die modifiers cap at six; Chile supplies one normal Fervor without a Turn expiry; Esquivo triggers on at least one 5/6; Clavo adds a push after the normal displacement.

The current prototype deals two seeded unique Rats to each seat and automatically deploys the first, reserving the other for Arena 2. Drafting and presentation polish remain outside this content milestone. The original grids are source references, not production-sized artwork assets.
