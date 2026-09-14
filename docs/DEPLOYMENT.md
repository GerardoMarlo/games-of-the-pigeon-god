# Cloudflare Pages deployment

This is a static React/Vite application. No server, API, environment secrets, Workers plugin or runtime localhost service is required.

## Git-connected Pages settings

- Framework preset: React (Vite)
- Repository root: this project root
- Build command: `npm run build`
- Build output directory: `dist`
- Node: 24 (pinned by `.node-version`)
- Production branch: select the branch containing these changes (`codex/milestone-7` currently).

The repository uses `pnpm-lock.yaml`; retain pnpm for dependency installation (`pnpm install --frozen-lockfile`). npm can run the build script against those installed dependencies. Do not deploy the repository root or the Vite development server. Upload only `dist` when using a direct upload.

## Routing and assets

Cloudflare Pages automatically serves the root index.html for unmatched SPA routes when there is no top-level 404.html. Do not add a top-level 404.html: it disables that fallback. The application currently has one screen; nested URLs load that screen, and refreshing them must still work. Existing asset files are served normally. Root-relative `/art/` and `/assets/` URLs work on both pages.dev and a custom domain, including nested routes. This configuration assumes deployment at the domain root.

## Production checks

Run `pnpm test`, `npm run build`, and optionally `npm run preview`. Output is explicitly `dist/`; source maps are disabled. Development seed controls and the playtest footer are compiled out using `import.meta.env.DEV`. Production matches get a fresh initial seed from browser crypto; all subsequent game randomness remains in the seeded engine. Local multiplayer and the readable game log are gameplay features and remain available.

After deployment, check `/`, open and refresh `/play/test`, and verify artwork and Match settings. A refresh loads a new match; save/resume is not implemented yet. This repository preparation does not create or publish a Cloudflare project.

References: https://developers.cloudflare.com/pages/configuration/build-configuration/ and https://developers.cloudflare.com/pages/configuration/serving-pages/


## MARLO path gateway

Canonical game URL: https://play.marlo.games/pigeongod. The independent portal/router repository is https://github.com/GerardoMarlo/marlo-play. Origin custom domain: pigeongod-origin.marlo.games, registered on this Pages project with a proxied CNAME to games-of-the-pigeon-god.pages.dev.

Vite emits relative bundle URLs. index.html supplies a root base for direct Pages access. The gateway streams HTML through HTMLRewriter to replace the base with /pigeongod/ and add the public canonical URL; all runtime artwork resolves against document.baseURI. Origin requests strip only the game prefix. Both direct Pages previews and nested public refreshes remain supported. Do not restore hardcoded root artwork URLs.

Deploy this repository as before; the portal does not rebuild when this game changes. No Origin Rules or Transform Rules are required. See the portal repository README for new-game setup and rollback.
