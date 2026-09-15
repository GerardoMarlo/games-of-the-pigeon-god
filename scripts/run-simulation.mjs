import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const args=Object.fromEntries(process.argv.slice(2).map(v=>v.replace(/^--/,'').split('=')));
const games=Number(args.games??1000),firstSeed=Number(args.seed??1);
if(!Number.isInteger(games)||games<1||games>100000||!Number.isInteger(firstSeed)||firstSeed<0||firstSeed+games>4294967295)throw Error('Use --games=1..100000 and a nonnegative 32-bit --seed.');
execFileSync(process.execPath,['scripts/version.mjs'],{stdio:'inherit'});
const require=createRequire(import.meta.url),viteRequire=createRequire(require.resolve('vite'));
const {build}=viteRequire('esbuild');
mkdirSync('.simulation-build',{recursive:true});
await build({entryPoints:['scripts/simulate.ts'],bundle:true,platform:'node',format:'esm',outfile:'.simulation-build/simulate.mjs'});
const dir='simulation-results/run-'+new Date().toISOString().replace(/[:.]/g,'-');
const {simulate}=await import(pathToFileURL(path.resolve('.simulation-build/simulate.mjs')).href);
await simulate(games,dir,firstSeed);
const {report}=await import('./report.mjs');await report(dir);
console.log('Reports: '+dir);

// Exit explicitly after artifact export; avoids native renderer shutdown crashes on Windows.
process.exit(0);
