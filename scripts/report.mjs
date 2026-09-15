import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {homedir} from 'node:os';
import path from 'node:path';
const avg=(xs)=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
const sum=(xs,k)=>xs.reduce((s,x)=>s+(x[k]??0),0);
const safe=v=>typeof v==='string'&&/^[=+@-]/.test(v)?"'"+v:v;
function csv(rows){return rows.map(r=>r.map(v=>'"'+String(safe(v??'')).replaceAll('"','""')+'"').join(',')).join('\n');}
export async function report(dir){
 const run=JSON.parse(await fs.readFile(dir+'/simulation.json','utf8')),matches=run.matches;
 const rawRats=matches.flatMap(m=>m.rats.filter(r=>r.segment.startsWith('arena-')).map(r=>({...r,matchId:m.matchId,seed:m.rngSeed,playerCount:m.playerCount})));
 const ratRows=run.ratCards.map(card=>{
  const rows=rawRats.filter(r=>r.ratId===card.id);
  return [card.name,rows.length,sum(rows,'arenaWon'),sum(rows,'matchWon'),rows.length?sum(rows,'matchWon')/rows.length:0,...['damageDealt','damageReceived','health','finishes','attacks','dodges','fervorGenerated','fervorSpent','divineFavor'].map(k=>avg(rows.map(r=>r[k])))];
 });
 const decreeRows=run.decreeCards.map(c=>{const rows=matches.flatMap(m=>m.decrees).filter(d=>d.cardId===c.id);return [c.name,rows.length,rows.filter(r=>r.claimedAt!==undefined).length,rows.length?rows.filter(r=>r.claimedAt!==undefined).length/rows.length:0,sum(rows,'favor')];});
 const itemRows=run.itemCards.map(c=>{const rows=matches.flatMap(m=>m.items).filter(i=>i.cardId===c.id);return [c.name,rows.length,rows.filter(r=>r.usedAt!==undefined).length,rows.length?rows.filter(r=>r.usedAt!==undefined).length/rows.length:0,rows.filter(r=>r.usedAt===undefined).length];});
 const matchRows=matches.map(m=>[m.matchId,m.rngSeed,m.playerCount,m.winnerId,m.winnerDivineFavor,m.divineFavor.p1,m.divineFavor.p2,m.divineFavor.p3??null,m.divineFavor.p4??null,m.finalDuelOccurred,m.arenas.filter(a=>!a.duel).reduce((n,a)=>n+a.rounds,0),m.gameVersion,m.rulesVersion,m.aiVersion]);
 const catRows=matches.flatMap(m=>m.cats.filter(c=>c.segment.startsWith('arena-')).map(c=>[m.matchId,c.segment,c.damageDealt,c.damageReceived,c.finishes,c.timesFinished,c.outOfBoundsRespawns,c.finishedRespawns,c.eliminatedPlayerFinishes,c.eliminatedPlayerFavor]));
 const arenaRows=matches.flatMap(m=>m.arenas.map(a=>[m.matchId,a.segment,a.rounds,a.turns,a.winnerId??'',a.reason,['last_survivor','no_survivors'].includes(a.reason),sum(m.rats.filter(r=>r.segment===a.segment),'damageDealt'),sum(m.rats.filter(r=>r.segment===a.segment),'finishes')]));
 const allBets=matches.flatMap(m=>m.bets),wins=matches.map(m=>m.winnerDivineFavor);
 const warnings=[];
 const overall=avg(rawRats.map(r=>Number(r.matchWon)));
 for(const r of ratRows)if(r[1]>=50&&Math.abs(r[3]/r[1]-overall)>.08)warnings.push(r[0]+': Match-win association '+(100*r[3]/r[1]).toFixed(1)+'% vs overall '+(overall*100).toFixed(1)+'%. Inspect by player count and Arena before changing balance.');
 for(const d of decreeRows)if(d[1]&&d[2]/d[1]<.05)warnings.push(d[0]+': claimed in fewer than 5% of exposures ('+d[2]+'/'+d[1]+').');
 for(const d of decreeRows)if(d[1]>=50&&d[2]/d[1]>.9)warnings.push(d[0]+': claimed in more than 90% of exposures ('+d[2]+'/'+d[1]+'). Check reward against difficulty; exposure timing affects this rate.');
 for(const i of itemRows)if(i[1]>=30&&(i[2]/i[1]<.1||i[2]/i[1]>.9))warnings.push(i[0]+': usage '+(100*i[2]/i[1]).toFixed(1)+'% ('+i[2]+'/'+i[1]+'). Usage is not causal value.');
 const overview=[
 ['Completed Matches',matches.length],['Minimum winning Favor',Math.min(...wins)],['Maximum winning Favor',Math.max(...wins)],['Average winning Favor',avg(wins)],
 ['Final Duel frequency',avg(matches.map(m=>Number(m.finalDuelOccurred)))],['Cat Finishes per Match',sum(matches.flatMap(m=>m.cats),'finishes')/matches.length],['Bets placed',allBets.length],['Successful bets',allBets.filter(b=>b.successful).length],['Bet Favor',sum(allBets,'favor')],
 ['Rules version',run.rulesVersion],['AI version',run.aiVersion],['Metrics version',run.metricsVersion],
 ['Cohort','AI only; player counts cycle 2, 3, 4; no difficulty variants'],['Rat Match wins','Association with winning participant; two Rats may share one Match win'],['Balance policy','No balance changes. Stale Cat Item state reset bug fixed before this run.'],['Source','Deterministic engine, seeds '+run.firstSeed+'–'+(run.firstSeed+run.games-1)]
 ];
 const sheets=[
 ['Balance Overview',['Metric','Value'],overview],
 ['Match Summary',['Match ID','Seed','Players','Winner','Winning Favor','P1 Favor','P2 Favor','P3 Favor','P4 Favor','Final Duel','Arena Rounds','Game version','Rules version','AI version'],matchRows],
 ['Rat Performance',['Rat','Appearances','Arena Wins','Match Wins','Match Win Rate','Avg Damage','Avg Received','Avg Health','Avg Finishes','Avg Attacks','Avg Dodges','Avg Fervor Earned','Avg Fervor Spent','Avg Favor'],ratRows],
 ['Decrees',['Decree','Shown','Claimed','Completion Rate','Favor'],decreeRows],
 ['Cat Metrics',['Match ID','Segment','Damage Dealt','Damage Received','Finishes','Times Finished','Out-of-bounds Respawns','Finish Respawns','Eliminated-player Finishes','Eliminated-player Favor'],catRows],
 ['Arena Metrics',['Match ID','Segment','Rounds','Turns','Winner','End Reason','Early Ending','Rat Damage','Finishes'],arenaRows],
 ['Items',['Item','Drawn','Used','Usage Rate','Unused'],itemRows],
 ['Rat Appearances',['Match ID','Seed','Players','Segment','Rat ID','Participant','Controller','Arena Win','Match Win','Damage','Received','Health','Finishes','Attacks','Dodges','Fervor Earned','Fervor Spent','Favor'],rawRats.map(r=>[r.matchId,r.seed,r.playerCount,r.segment,r.ratId,r.participantId,r.controllerType,r.arenaWon,r.matchWon,r.damageDealt,r.damageReceived,r.health,r.finishes,r.attacks,r.dodges,r.fervorGenerated,r.fervorSpent,r.divineFavor])],
 ['Balance Findings',['Finding'],warnings.length?warnings.map(w=>[w]):[['No heuristic warning thresholds crossed. This is not proof of balance.']]]
 ];
 for(const [name,heads,rows] of sheets)await fs.writeFile(dir+'/'+name.replaceAll(' ','-')+'.csv',csv([heads,...rows]));
 await fs.writeFile(dir+'/balance-findings.md','# Balance findings\n\n'+warnings.map(w=>'- '+w).join('\n')+'\n\nThese are exploratory AI-only signals, not causal balance conclusions. Compare player-count strata, Arena 1/2 and future human data within matching rules/AI versions. No automatic rebalance.\n');
 let library;
 const modules=process.env.MARLO_REPORT_NODE_MODULES??path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
 try{const require=createRequire(pathToFileURL(path.join(modules,'__loader.cjs')));library=await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);}
 catch{throw Error('Excel reporting requires the Codex bundled @oai/artifact-tool runtime. Set MARLO_REPORT_NODE_MODULES to its node_modules folder. Raw JSON and CSV have already been saved.');}
 const {Workbook,SpreadsheetFile}=library,wb=Workbook.create();
 for(const [name,heads,rows] of sheets){
  const s=wb.worksheets.add(name);s.showGridLines=false;
  s.getRange('A1').values=[[name]];s.getRange('A1').format.font={name:'Arial',size:16,bold:true};
  s.getRange('A2').values=[['Pigeon God • '+run.games+' seeded Matches • '+run.createdAt.slice(0,10)]];
  const matrix=[heads,...rows.map(r=>r.map(safe))];s.getRangeByIndexes(3,0,matrix.length,heads.length).values=matrix;
  const used=s.getRangeByIndexes(3,0,matrix.length,heads.length);used.format.font={name:'Arial',size:11};used.format.columnWidth=18;used.format.rowHeight=22;
  s.getRangeByIndexes(3,0,1,heads.length).format={fill:'#263E34',font:{name:'Arial',bold:true,color:'#FFFFFF'},wrapText:true,rowHeight:44};
  s.getRangeByIndexes(3,0,matrix.length,1).format.columnWidth=30;
  if(name==='Balance Overview'){s.getRange('B4:B25').format.columnWidth=85;s.getRange('B4:B25').format.wrapText=true;s.getRange('B17:B21').format.rowHeight=40;s.getRange('B8').setNumberFormat('0.00');s.getRange('B9').setNumberFormat('0.0%');s.getRange('B10').setNumberFormat('0.00');}
  else if(name==='Balance Findings'){s.getRange('A4:A'+(rows.length+4)).format.columnWidth=115;s.getRange('A5:A'+(rows.length+4)).format.wrapText=true;s.getRange('A5:A'+(rows.length+4)).format.rowHeight=45;}
  else s.freezePanes.freezeRows(4);
  if(name==='Rat Performance'){
   for(let i=0;i<rows.length;i++)s.getCell(i+4,4).formulas=[['=IF(B'+(i+5)+'=0,0,D'+(i+5)+'/B'+(i+5)+')']];
   s.getRange('E5:E'+(rows.length+4)).setNumberFormat('0.0%');s.getRange('F5:N'+(rows.length+4)).setNumberFormat('0.00');
  }
  if(name==='Decrees'||name==='Items'){
   for(let i=0;i<rows.length;i++)s.getCell(i+4,3).formulas=[['=IF(B'+(i+5)+'=0,0,C'+(i+5)+'/B'+(i+5)+')']];
   s.getRange('D5:D'+(rows.length+4)).setNumberFormat('0.0%');
  }
 }
 const errors=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!',options:{useRegex:true,maxResults:10},summary:'Formula errors'});
 await fs.writeFile(dir+'/verification.txt',errors.ndjson);
 const out=await SpreadsheetFile.exportXlsx(wb);await out.save(dir+'/balance-simulation.xlsx');
 if(process.env.MARLO_REPORT_PREVIEWS==='1')for(const [name] of sheets){const img=await wb.render({sheetName:name,range:name==='Balance Findings'?'A1:A10':'A1:F12',scale:1,format:'png'});await fs.writeFile(dir+'/'+name.replaceAll(' ','-')+'.png',new Uint8Array(await img.arrayBuffer()));}
 return {games:matches.length,warnings};
}
if(process.argv[1]?.endsWith('report.mjs')){await report(process.argv[2]);process.exit(0);}
