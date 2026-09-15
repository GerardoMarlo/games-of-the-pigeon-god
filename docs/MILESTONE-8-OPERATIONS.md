# Milestone 8 operations

## Deployed architecture

The game remains a static Pages deployment at `play.marlo.games/pigeongod`. The independent `marlo-play` gateway forwards only `play.marlo.games/api/v1/pigeongod/*` to its `PIGEONGOD_API` service binding. The private `pigeongod-api` Worker stores consented profiles and telemetry in D1 `pigeongod-data`. Its workers.dev and preview endpoints are disabled. No DNS change or paid-plan upgrade was made. The owner confirmed Workers Free before resource creation; account subscription lookup was unavailable to this integration.

Free quotas are finite. Failed uploads remain pending locally where IndexedDB is available; the game continues. No automatic paid upgrade is configured. Monitor Workers and D1 usage in the Dashboard. Do not switch to a paid plan without reviewing billing implications.

## Actual schema and privacy

`backend/migrations/0001.sql` is the authoritative schema. To reduce writes, detailed metrics are stored as validated JSON in `matches.summary_json`, rather than the many normalized tables proposed in Phase A. `participants` stores seat/controller/Favor associations; only P1 maps to the consenting browser owner. `players` and hashed browser `sessions` are separate. Email is never repeated in event or Match payloads. `event_batches` stores bounded structured event/decision records. `human_matches` and `simulation_matches` views distinguish sources. Local simulation runs remain local; no public simulation import exists.

Name/email and unchecked explicit consent are required for registration, with server-verified Turnstile. Untracked play is available. A secure HttpOnly cookie identifies the browser for one year; local storage holds only the name, opaque ID and consent version. No email ownership verification or recovery service exists. Clearing cookies may create duplicate profiles on re-registration; matching emails are not automatically merged.

Profile deletion removes its sessions and uploaded Matches through foreign-key cascades, and clears the local outbox. Clearing browser storage alone does not delete central data. Daily cleanup retains raw events for 90 days, incomplete Matches for 30 days, completed statistics for 730 days and inactive contacts for 730 days. Browser pending batches expire after 30 days. No contact messages are sent by this implementation.

The Worker validates JSON sizes, event fields/types, finite counters, ownership, versions, participants and completion consistency. It limits registration to five requests per minute per daily hashed infrastructure IP key, and authenticated requests to 60 per minute per profile. Raw IPs are not stored in these tables. Application observability is disabled to avoid logging sensitive payloads. These controls protect a development dataset; client-side Match outcomes are not authoritative competitive results. All games on the shared play origin must be trusted.

## Deploy independently

Game: push `codex/milestone-7`; existing Cloudflare Pages integration runs `npm run build` and publishes `dist/`.

Gateway: the separate `marlo-play` repository deploys its main branch. Its Worker configuration retains the private service binding. Game updates do not require a gateway redeploy.

API: deploy explicitly from this repository using an authenticated Wrangler installation. Keep credentials out of Vite, Git and screenshots:

```sh
npm run test:api
npm run test:telemetry
npm run build:api
npx wrangler@4.131.2 deploy --config backend/wrangler.jsonc
```

The initial schema has already been applied. For a future schema change, add a new numbered migration, review it, and apply it before deploying dependent API code:

```sh
npx wrangler@4.131.2 d1 migrations apply pigeongod-data --remote --config backend/wrangler.jsonc
```

The initial SQL was applied through the Cloudflare API, so Wrangler's migration ledger does not record that bootstrap. `0001.sql` uses `IF NOT EXISTS`, allowing Wrangler to register that baseline without replacing existing tables. Review the pending migration list and back up D1 before schema changes.

Server-only secrets `TURNSTILE_SECRET_KEY` and `RATE_LIMIT_KEY_SECRET` are already configured. The site key in Wrangler configuration is public. Never expose either secret with a `VITE_` prefix. API deployment is intentionally independent of the Pages build.

## Export privately

Set `CLOUDFLARE_ACCOUNT_ID` and a scoped `CLOUDFLARE_API_TOKEN` with D1 read access in your shell. Then:

```sh
npm run export:players
npm run export:analytics
```

Exports go into timestamped `exports/` directories, excluded from Git. The directory CSV contains private contact details. Analytics CSV/JSON excludes uploader identity/email and retains structured metrics. There is no public admin/export route. Store directory exports securely and delete copies when no longer needed.

## Metric definitions and comparison

The same pure collector serves engine-only simulations and consented browser sessions. Structured snapshots preserve Arena reset boundaries; Final Duel attempts are separate segments. Raw decisions plus seed/configuration and version support debugging. Match duration is elapsed wall-clock time, including pauses; simulations use logical Rounds/Turns and null elapsed times. Active-time measurement is not implemented.

Attacks means damage successfully dealt; combat counts are separate. Rat Match wins are an association with the winning seat, so both Arena Rats may share one Match win. Rat/controller history marks mixed control. Initial human/AI counts and the winning controller are recorded. The existing strategy is labeled `single_strategy`; no new difficulty or AI behavior was introduced.

For future human comparisons, filter completed records, then group by rulesVersion, aiVersion, metricsVersion, player count, Arena/duel segment and controller. Join Item participant/segment with Rat appearances to classify Item use. Decree claims record controller directly. Exclude incomplete Matches from win rates. Do not pool mixed-control rows with purely human/AI rows. Version fingerprints distinguish engine/content changes; changing metric definitions requires a metricsVersion increment.

Pending upload failure is visible but never blocks play. Closing the browser, denying storage or clearing it can lose unsent data. Raw records are not a cloud game-save system. Full drafting, save/resume and Hard AI remain outside this owner-approved scope.

## Verification

218 engine/UI tests pass, including 1,000 complete legal-AI Matches. The separate reporting dataset contains another 1,000 seeded complete Matches. API tests exercise ownership, idempotency and deletion; a 30-Match contract check validates actual engine events and summaries against server validation. Production builds omit development seed/debug controls.
