import {mkdir,writeFile} from 'node:fs/promises';
const {CLOUDFLARE_API_TOKEN:token,CLOUDFLARE_ACCOUNT_ID:account}=process.env;
if(!token||!account)throw Error('Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in your shell. Never commit credentials.');
const mode=process.argv[2]??'analytics';if(!['players','analytics'].includes(mode))throw Error('Choose players or analytics');
const database='ec91c3cb-4e94-4056-bad8-bfb266eb85c4',dir='exports/'+mode+'-'+new Date().toISOString().replace(/[:.]/g,'-');
const rows=[];for(let offset=0;;offset+=100){
 const sql=mode==='players'?'SELECT id,name,email,consent_version,consent_at,first_played_at,last_played_at,total_matches_started FROM players ORDER BY id LIMIT 100 OFFSET ?':'SELECT id,source,run_id,started_at,completed_at,game_version,rules_version,ai_version,metrics_version,seed,config_json,summary_json FROM matches ORDER BY id LIMIT 100 OFFSET ?';
 const res=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+'/d1/database/'+database+'/query',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({sql,params:[offset]})});
 const data=await res.json();if(!res.ok||!data.success)throw Error('Export failed: check the scoped D1 read permission.');const page=data.result[0].results;rows.push(...page);if(page.length<100)break;
}
await mkdir(dir,{recursive:true});
const safe=v=>{const text=String(v??'');return /^[=+@-]/.test(text)?"'"+text:text;};
const cols=Object.keys(rows[0]??{}),csv=[cols,...rows.map(r=>cols.map(k=>r[k]))].map(row=>row.map(v=>'"'+safe(v).replaceAll('"','""')+'"').join(',')).join('\n');
await writeFile(dir+'/'+mode+'.csv',csv);
if(mode==='analytics')await writeFile(dir+'/analytics.json',JSON.stringify(rows.map(r=>({...r,config:JSON.parse(r.config_json),metrics:r.summary_json?JSON.parse(r.summary_json):null,config_json:undefined,summary_json:undefined})),null,2));
console.log('Exported '+rows.length+' records to '+dir+'. Treat directory exports as private.');
