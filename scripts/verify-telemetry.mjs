import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),viteRequire=createRequire(require.resolve('vite'));
await viteRequire('esbuild').build({entryPoints:['scripts/verify-telemetry.ts'],bundle:true,platform:'node',format:'esm',outfile:'.simulation-build/verify-telemetry.mjs'});
await import('../.simulation-build/verify-telemetry.mjs');
