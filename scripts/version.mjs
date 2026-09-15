import { readFileSync,writeFileSync,readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(f=>f.isDirectory()?files(dir+'/'+f.name):[dir+'/'+f.name]).filter(f=>/\.tsx?$/.test(f)&&!f.endsWith('.test.ts')).sort();
// Git may check out CRLF on Windows and LF on Pages; identical rules need identical IDs.
const hash=paths=>{const h=createHash('sha256');for(const p of paths)h.update(p).update(readFileSync(p,'utf8').replace(/\r\n/g,'\n'));return h.digest('hex').slice(0,16)};
let commit='local';try{commit=execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim()}catch{}
const data={gameVersion:JSON.parse(readFileSync('package.json')).version+'+'+commit+'.'+hash(files('src')),rulesVersion:hash([...files('src/engine'),...files('src/content')]),aiVersion:hash(files('src/ai')),metricsVersion:'1'};
writeFileSync('src/analytics/version.json',JSON.stringify(data,null,2)+'\n');
