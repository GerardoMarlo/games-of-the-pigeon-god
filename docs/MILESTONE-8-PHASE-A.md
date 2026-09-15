# Milestone 8 — Phase A proposal

Status: archived Phase A proposal, approved by the owner September 14, 2026. Implementation and operational differences are recorded in [Milestone 8 operations](MILESTONE-8-OPERATIONS.md). The proposal below preserves the review history; statements about pending implementation are historical.

## Existing architecture and findings

- React 19 / TypeScript / Vite game, independently deployed to Cloudflare Pages. package.json currently reports 0.1.0.
- MARLO portal and gateway are a separate repository/Worker, marlo-play. marlo.games serves the portal; play.marlo.games/pigeongod proxies the independent Pages origin with a rewritten base URL.
- Gateway currently accepts only GET/HEAD and strips cookies/authorization from game-origin requests. An API must be routed separately BEFORE that static-only check; it cannot be added by merely pointing another slug at Pages.
- src/controller.ts owns live state changes and notifications. It is the appropriate human telemetry integration boundary, including aiStep, random Burrow placement, automatic settlement and setMode.
- src/engine/types.ts has typed damage, rolls, Fervor, Decree claims, combat and lifecycle events. Some Item/Decree reveal details remain CONTENT text; Cat respawns lack explicit reasons, Favor events lack source attribution, and events lack stable sequence/Turn identifiers.
- Trackers reset between Arenas. Final Match state alone cannot produce correct per-Arena metrics. Capture snapshots at transition boundaries, including transitions inside a single dispatch.
- The existing 1,000-Match AI legality test is not an analytics runner: it trims event history and does not export a report.
- Current UI defaults are two local players. There is no player directory, registration, telemetry upload, or profile persistence in the inspected source.
- Current AI configuration exposes one strategy, not an Easy/Normal/Hard selector. Record its actual strategy identifier; do not invent a difficulty or introduce new AI behavior in this scope.
- Rulebook v1.6 has subsequent owner corrections. Its title alone is insufficient to identify a rules dataset.
- Live mode switching is supported. Record controller history so a participant who changes mode is not falsely classified as purely human or AI.

## Recommended architecture

Browser: play.marlo.games/pigeongod
  -> same-origin /api/v1/pigeongod/*
  -> existing marlo-play gateway
  -> private service binding PIGEONGOD_API
  -> new Worker pigeongod-api
  -> new D1 database pigeongod-data

The portal, game Pages project and game API remain independently deployable. Keep API source/migrations under backend/ in the game repository with an explicit backend deployment workflow; existing Pages build remains unchanged. No new repository is needed.

The new Worker has no public route, Custom Domain, workers.dev endpoint or preview URL. Only the gateway invokes it through a service binding. API routing is an exact hostname/path allowlist, independent of game asset prefix rewriting. Future games receive their own API bindings only when needed.

API requests must preserve their method, bounded body, profile credential and response cookie. Static game-origin requests retain current isolation behavior. All API responses use Cache-Control: no-store and bypass HTML rewriting. Do not forward API credentials to Pages.

Cloudflare supports private Worker-to-Worker service bindings:
https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/

## Resources to approve

| Resource | Proposed name / change | Purpose |
|---|---|---|
| One Worker | pigeongod-api | Registration, session validation, telemetry ingestion |
| One D1 database | pigeongod-data; binding DB | Identity tables and separate analytics tables |
| Existing gateway | PIGEONGOD_API service binding and /api/v1/pigeongod route handler | Same-origin access |
| One Turnstile widget | Pigeon God registration; production hostname play.marlo.games | Registration abuse protection |
| Worker secrets | TURNSTILE_SECRET_KEY, RATE_LIMIT_KEY_SECRET | Server-only validation and ephemeral abuse keys |
| Rate-limit bindings | Registration and ingestion namespaces | Practical throttling, not globally exact quotas |

No new DNS, paid plan upgrade, R2, KV, Queues, Durable Objects, admin dashboard or email service is proposed initially. D1 and Workers usage must be monitored; this is a small design, not a promise of unlimited free storage. Development uses local D1 and test Turnstile settings; production data must never be used in public preview builds.

One database is sufficient initially. Separate tables keep email out of metrics, but are not separate access-control boundaries. Only the API and authorized administrative tooling can access D1; the gateway has no direct DB binding.

## Proposed schema

IDs are opaque random identifiers, never emails. Timestamps are UTC; server receipt timestamps are distinct from client timing. Use foreign keys, CHECK constraints, indexes and unique idempotency keys. Counts are nonnegative; unknown measurements remain NULL rather than zero.

| Table | Keys and stored fields |
|---|---|
| players | player_id PK, name, email, consent_given, consent_version, consent_timestamp, withdrawn_at, registered_at, first_played_at, last_played_at, total_matches_started |
| player_sessions | session_id PK, player_id FK, token_hash UNIQUE, created_at, expires_at, revoked_at |
| consent_events | consent_event_id PK, player_id FK, consent_version, action (grant/withdraw), server_timestamp |
| matches | match_id PK, source (human/simulation), simulation_run_id nullable FK, uploader_player_id nullable FK, started_at, completed_at, received_at, status, game_version, rules_version, metrics_version, ai_version, rng_seed, initial_config_json, player_count, human_player_count, ai_player_count, ai_difficulty nullable, controller_mode (human/ai/mixed), winner_participant_id, winner_controller_type, winner_divine_favor, final_duel_occurred, elapsed_ms, active_ms, payload_hash |
| match_players | (match_id, participant_id) PK, known_player_id nullable FK, initial_controller, final_controller, controller_history_json, rat_arena1, rat_arena2, final_divine_favor; Match totals for damage, Finishes, Attacks, Dodges, Fervor generated/spent, Arena wins |
| arena_results | (match_id, arena_number) PK, winner_participant_id nullable, reason, ended_early, rounds_started, turns_started, elapsed_ms, active_ms, damage_total, finishes_total |
| rat_appearances | (match_id, arena_number, participant_id) PK, rat_id, controller_type/mixed, health_remaining, damage_dealt/received, finishes, attacks, dodges, fervor_generated/spent, arena_won, match_won, favor_by_source_json |
| decree_exposures | (match_id, exposure_id) PK, card_id, revealed_sequence, revealed_arena, claimed_sequence nullable, claimant_participant_id/controller nullable, reward; unclaimed exposures are retained |
| item_instances | (match_id, draw_id) PK, card_id, participant_id, rat_id, arena_number, drawn_sequence, used_sequence nullable, discarded_sequence nullable, discard_reason |
| bets | (match_id, arena_number, participant_id) PK, target_participant_id, placed_sequence, successful, favor_awarded |
| cat_metrics | (match_id, arena_number) PK, damage_dealt/received, rat_finishes, times_finished, out_of_bounds_respawns, finished_respawns, eliminated_player_finishes, favor_awarded |
| turn_metrics | (match_id, turn_sequence) PK, arena_number, round_number, participant_id, controller_type, normal_actions_spent, bonus_actions_spent, combats, rat_combats, cat_combats |
| match_event_batches | (match_id, first_sequence) PK, last_sequence, payload_hash, events_json, received_at |
| simulation_runs | simulation_run_id PK, created_at, game_version, rules_version, metrics_version, ai_version, requested_games, completed_games, seed_range, configuration_json, report_manifest_json |

Final Duel activity uses separately identified duel segments/attempts, not Arena 2 totals. The implementation should use a segment key on event/appearance rows for these, or a dedicated duel table; do not overwrite normal Arena appearances.

Shared matches tables with source and simulation_run_id avoid duplicate metric definitions. Provide simulation_matches and human_matches SQL views. Only trusted admin import can write simulation source rows; public ingestion forces source=human and derives uploader identity from the session.

Email is indexed for administrative searching, not a public lookup key. Do not merge or authenticate profiles merely because an unverified email matches. No email verification/recovery service is included: after clearing cookies, a new registration may create a duplicate record. This is a contact directory, not an authenticated-email account system.

## Registration, identity and consent

1. Before the first Match, present name, any-provider valid email, and an unchecked consent box. Record the exact consent text version.
2. Submit to POST /api/v1/pigeongod/players with a Turnstile token and registration idempotency key.
3. Server validates consent, fields and Turnstile, stores the profile and issues an opaque session cookie. Store only its hash server-side. Cookie: Secure, HttpOnly, SameSite=Strict, host-only, Path=/api/v1/pigeongod/.
4. Browser stores only playerId, display name, profile schema version and consent version in a game-namespaced local profile. Email need not be persisted locally. Local playerId is not an authorization credential.
5. GET /profile validates the cookie to restore the profile; PATCH /profile edits it. No repeated form while consent and session remain valid.
6. A proposed one-year renewable browser credential supports returning players; expiration or cleared cookies requires registration again. This is a proposal, not an existing guarantee.
7. DELETE /profile revokes sessions, deletes identity and associated identifiable raw data, and removes/nulls analytic links according to the approved retention policy. Distinguish “clear this browser” from central deletion.
8. In local multiplayer, register only the consenting browser owner initially. Other human seats use anonymous participant IDs, not the owner's identity. Do not attribute their Rats to the owner. State that match statistics include local participants; do not collect their contact details without separate consent.
9. Proposed outage/decline UX: allow untracked play, with no personal-data submission. This needs owner approval because the brief otherwise places registration before first play.

Suggested text: “I agree that MARLO may store my name, email and gameplay statistics to improve this game and contact me about this project.” Link a short privacy explanation with edit/delete controls and the actual operator contact before launch. No newsletter integration or messages are sent by this scope.

## API and abuse controls

Proposed routes: POST /players; GET/PATCH/DELETE /profile; POST /matches; PUT /matches/:id/events/:firstSequence; PUT /matches/:id/complete.

Every write requires JSON, a valid browser Origin, an exact production hostname/path and appropriate session ownership (except new registration). Do not enable wildcard CORS. Origin checks are CSRF defenses, not authentication. The shared play origin means future games must be trusted; cookie paths are not a security sandbox against same-origin scripts.

Validate name length, email syntax without provider restrictions, consent=true, enum membership, versions, known cards, participants, safe integer seeds, sequence continuity, finite numeric ranges and payload size. Prepared statements only. Reject unknown identity fields in telemetry. Recompute aggregate totals server-side from accepted structured events where feasible; cross-check supplied summaries. Local browser outcomes are still untrusted, not competitive authoritative results.

Suggested initial limits for implementation review: registration 5/minute per ephemeral abuse key; ingestion 60/minute per session; 64 KiB per event batch with at most 200 events; summary 64 KiB. These are application defaults, not Cloudflare platform limits. Batch by size, retry with backoff, and impose a generous documented total Match ceiling with a “truncated” flag rather than silent loss.

Use Turnstile server validation including expected hostname/action. Never ship its secret to the browser.
https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

Workers rate limiting is approximate and location-local; it is not a strict global cap. Use D1 uniqueness/idempotency for data integrity. Before registration, use a rotating HMAC of the infrastructure-provided IP solely as an ephemeral rate key, without storing raw IP or that key in gameplay/identity tables. Do not log bodies, emails, cookies or credentials.
https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

D1 transactional batches make completion insertion and directory count updates atomic. A repeated same payload returns the original result; conflicting reuse returns 409. Match-start counts increment only on first accepted Match creation. Server checks ownership and consent on every retry, including after withdrawal.
https://developers.cloudflare.com/d1/worker-api/d1-database/

## Reliable collection and metric definitions

Create a pure shared analytics reducer in src/analytics, reused by controller instrumentation and the engine-only simulation runner. No React, network, clock or randomness inside the reducer. Network/timing stay in adapters. Observe accepted state transitions, not rendered frames; never call RNG to collect metrics.

Add structured observation events at existing rule outcomes for Item draw/use/discard, Decree reveal, Cat respawn reason/credit, Favor source, Turn start/end and controller changes. These additions must not change legal actions, RNG consumption or outcomes. Handle multiple automatic Turn/Arena transitions within one dispatch. Attach match-local sequence numbers and transition/action IDs.

Use engine seed + original configuration + ordered accepted decisions + version to support replay. Also record special seeded setup operations and mode changes, which currently bypass normal dispatch. A seed alone cannot reconstruct human decisions. Keep timing metadata outside deterministic state.

Persist consented pending batches in IndexedDB, flush on sensible boundaries and completion, and retry next visit. UI shows pending/synced status. A closed browser or cleared storage can still lose unsent telemetry: do not claim every abandoned/offline Match is recoverable. Retain explicit started/incomplete/completed states; completed-match analytics exclude incomplete/truncated records by default.

Definitions:
- Attacks means successfully dealt damage, not attack attempts. Track combat count separately.
- Arena duration has both Rounds/Turns and human elapsed/active time; simulations have logical durations, with human timing NULL.
- Early ending uses ArenaResult.reason, not a guessed Round count. Preserve no-survivor and unbroken-tie reasons.
- Fervor generated/spent are summed events before resets; remaining Fervor is a separate snapshot.
- Decree frequency uses exposures as denominator, including cards remaining public between Arenas.
- Rat Match win rate is wins among appearances belonging to winning participants; both drafted Rats may receive a Match-win association. Label this as association, not causal contribution. Arena win rate is separate.
- Rat Favor contribution is attributed to the Rat active when the source event occurs, with arena/bet/eliminated-Cat/decree/milestone categories. No invented causal attribution.
- Human/AI grouping uses controller at each event and Rat segment. Mixed-control Matches are separately labeled, not silently pooled.
- Preserve per-Arena metrics and explicit resets; unused Items are tracked by instance, not only card ID.

gameVersion should combine package version and immutable build commit. rulesVersion should fingerprint the approved rule constants/content plus rules implementation; document intentional changes. metricsVersion versions definitions/schema; aiVersion fingerprints strategy/weights. Reports group by all relevant versions and player count/difficulty. Never silently combine different rule versions.

## Export, retention and later analysis

No public export endpoint. An authorized local admin command uses a scoped Cloudflare credential from the environment to query D1, then writes directory CSV and analytics CSV/JSON. The same reporting library later produces Excel. Directory export is separate from pseudonymous analytics export, and spreadsheet formulas in user-entered cells must be escaped.

D1 native export provides SQL backup, not a finished Excel report:
https://developers.cloudflare.com/d1/best-practices/import-export-data/

Phase D simulations run locally via the pure engine, not the UI or a request-duration-limited Worker. They write a run-ID directory with raw JSON/CSV and workbook. Trusted optional D1 import shares the same schema without a public simulation endpoint. No large report files are committed to Git by default.

Proposed retention for owner approval: raw event batches 90 days, pending browser uploads 30 days, incomplete central Matches 30 days, pseudonymous summaries 24 months, contacts 24 months after last activity unless consent is withdrawn sooner. An API scheduled cleanup can implement this without another service. Retention is an operational proposal, not legal advice or an already applied policy.

## Phase B issue to resolve without changing rules

Health and Fervor are independent values: Fervor can be spent, earned from milestones or obtained through Chile. Therefore maxHealth - health is not necessarily current Fervor. Proposed visual: exactly maxHealth coins; lost-Health coins flip to a flame motif, while a separately labeled spendable Fervor counter always shows engine Fervor. Do not imply every displayed flame remains spendable after rerolls. Owner should approve this interpretation before Phase B.

## Delivery responsibilities and approval boundary

Cloudflare configuration after approval: create Worker/D1/Turnstile; configure secrets, private service binding and throttles; inspect quotas. No DNS change.
Repository implementation: schema migrations, validation, collector, consent/profile UI, upload retry, admin export and automated tests. Keep backend credentials out of Vite.
Repository automation: independent API deploy workflow, migration review, gateway deploy for routing, Pages deploy for UI, local simulation/report commands. Never run simulations in normal game builds.

Phase A ends here. Approval requested for the resource design and proposed consent/local-player/retention choices before Phase C. Phase B visual/default changes, Phase C backend, Phase D reports and Phase E balance findings remain unimplemented.

Validation: read-only code review and official Cloudflare documentation review. No executable source changed, so no new test/build run is necessary for this proposal. The immediately preceding verified baseline was 214 passing tests and a successful production build.

## Owner correction and cost gate

Owner clarification: represent additional Fervor earned from other sources as extra flame-only tokens in the row, never as a numeric counter. Extra Fervor tokens never convert to Health. The display must still reflect actual spendable Fervor after spending; no changes to engine rules.

Proceed only with no extra infrastructure cost. Do not upgrade any Cloudflare plan or enable paid usage. Current published Workers/D1 Free tiers support the proposed products, but the account subscription lookup returned Cloudflare authentication error 10000. The zone Free plan does not establish the account Workers billing plan. Resource creation remains pending verification of Workers Free; no new resources were created.

Sources checked September 14, 2026:
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/d1/platform/pricing/
D1 Free quota exhaustion rejects further operations rather than charging paid overages. Paid-plan overages are billable, so no zero-cost guarantee should be inferred without account plan verification.
