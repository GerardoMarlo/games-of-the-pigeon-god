import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
mkdirSync('backend/dist',{recursive:true});
writeFileSync('backend/dist/worker.mjs',readFileSync('backend/validation.mjs','utf8')+'\n'+readFileSync('backend/worker.mjs','utf8').replace(/^import .*;\r?\n/,''));
