import { describe,it,expect } from 'vitest';
import { ratCards,itemCards } from '../content/cards';
import { decreeCards } from '../content/decrees';
import { createGame,dispatch,getLegalActions,assertInvariants,getVisibleState } from './game';
import { legacyBoard } from '../tests/fixtures';
import { claimDecrees } from './content/decrees';
import { finishArena } from './lifecycle';
import { occupant } from './movement';
import { distance,key } from './hex';
import type { GameAction,GameState } from './types';
function fixture():GameState {
 const s=createGame({automatic:false,seed:7,playerCount:3,board:legacyBoard()});s.activePlayerId='p1';s.turnOrder=['p1','p2','p3'];s.phase='PLAYER_ACTION';
 for(const p of Object.values(s.players)){p.currentRat.health=6;p.currentRat.inBurrow=false;p.draftedRats[0].maxHealth=6;p.draftedRats[0].attackDice=3;p.draftedRats[0].speed=3;delete p.draftedRats[0].ability;}
 s.players.p1.actionsRemaining=2;s.players.p1.currentRat.position={q:-2,r:0};s.players.p2.currentRat.position={q:-2,r:-1};
 s.content!.decrees=[];s.content!.decreeDeck=[];return s;
}
function setAbility(s:GameState,id:string,ability:string):void {s.players[id].draftedRats[0].ability=ability;}
function item(s:GameState,id:string,itemId:string):void {s.content!.players[id].items=[itemId];s.content!.itemDeck=s.content!.itemDeck.filter(i=>i!==itemId);}
function act(s:GameState,type:GameAction['type'],id?:string):GameState {const a=(id?[id]:s.seatOrder).flatMap(p=>getLegalActions(s,p)).find(a=>a.type===type);expect(a,`missing ${type} in ${s.phase} / ${s.combat?.stage}`).toBeDefined();return dispatch(s,a!);}
function attack(s=fixture()):GameState {return dispatch(s,{type:'MOVE',playerId:'p1',path:[{q:-2,r:-1}]});}
function rolls(s:GameState,a:number[],d:number[]):GameState {s=act(s,'ROLL_ATTACK');s.combat!.attackerRoll=a;s=act(s,'CONFIRM_ATTACK');s=act(s,'ACCEPT_ATTACK');s=act(s,'ROLL_DODGE');s.combat!.defenderRoll=d;return act(s,'CONFIRM_DODGE');}
function finish(s:GameState):GameState {s=act(s,'RESOLVE_COMBAT');if(s.combat?.stage==='PUSHBACK')s=act(s,'SELECT_PUSHBACK');return s;}
function use(s:GameState,id:string,itemId:string,dieIndex?:number):GameState {return dispatch(s,{type:'USE_ITEM',playerId:id,itemId,dieIndex});}

describe('supplied content and state',()=>{
 it('excludes both Oro Rats and only the Cat-Dodge Decree',()=>{expect(ratCards).toHaveLength(14);expect(itemCards).toHaveLength(17);expect(decreeCards).toHaveLength(19);expect(ratCards.some(c=>/oro/i.test(c.description))).toBe(false);expect(decreeCards.some(c=>c.id==='doma')).toBe(true);});
 it('deals unique real Rats and four public Decrees deterministically',()=>{const a=createGame({automatic:false,seed:9,playerCount:4});expect(createGame({automatic:false,seed:9,playerCount:4})).toEqual(a);expect(new Set(Object.values(a.players).flatMap(p=>p.draftedRats.map(r=>r.id))).size).toBe(8);expect(a.content!.decrees).toHaveLength(4);expect(a.content!.itemDeck).toHaveLength(17);expect(JSON.stringify(getVisibleState(a,'p1'))).not.toContain('itemDeck');});
 it('draw costs one Action, is mandatory keep, and capacity is one or two for Ingeniero',()=>{let s=fixture();s=act(s,'REQUEST_ITEM');expect(s.players.p1.actionsRemaining).toBe(1);expect(s.content!.players.p1.items).toHaveLength(1);expect(()=>act(s,'REQUEST_ITEM','p1')).toThrow();setAbility(s,'p1','two_items');s=act(s,'REQUEST_ITEM','p1');expect(s.content!.players.p1.items).toHaveLength(2);expect(s.players.p1.actionsRemaining).toBe(0);});
 it('rejects Item use at an illegal timing and after consumption',()=>{let s=fixture();item(s,'p1','aguja');expect(()=>use(s,'p1','aguja')).toThrow();s=attack(s);s=use(s,'p1','aguja');expect(()=>use(s,'p1','aguja')).toThrow();s=act(s,'ROLL_ATTACK');expect(s.combat!.attackerRoll).toHaveLength(4);});
 it('Chile supplies ordinary persistent Fervor, including on another player decision',()=>{let s=attack();item(s,'p2','chile');s=use(s,'p2','chile');expect(s.players.p2.fervor).toBe(1);expect(s.content!.itemDiscard).toContain('chile');});
});
describe('combat Item timing and effects',()=>{
 it('Pluma and Red change Dodge dice before rolling, floor at zero',()=>{let s=attack();item(s,'p1','red');s=use(s,'p1','red');s=act(s,'ROLL_ATTACK');s=act(s,'CONFIRM_ATTACK');s=act(s,'ACCEPT_ATTACK');item(s,'p2','pluma');s=use(s,'p2','pluma');s=act(s,'ROLL_DODGE');expect(s.combat!.defenderRoll).toHaveLength(3);});
 it('Piedra adds one, caps at six, and Moneda rerolls through seeded RNG',()=>{let s=act(attack(),'ROLL_ATTACK');s.combat!.attackerRoll=[5,2,1];item(s,'p1','piedra');s=use(s,'p1','piedra',0);expect(s.combat!.attackerRoll[0]).toBe(6);item(s,'p1','moneda');const before=structuredClone(s);s=use(s,'p1','moneda',1);expect(use(before,'p1','moneda',1)).toEqual(s);expect(s.rng.value).not.toBe(before.rng.value);});
 it('Arena forces an opponent successful die reroll only in the response window',()=>{let s=act(attack(),'ROLL_ATTACK');s.combat!.attackerRoll=[4,1,2];s=act(s,'CONFIRM_ATTACK');item(s,'p2','arena');expect(()=>use(s,'p2','arena',1)).toThrow();s=use(s,'p2','arena',0);expect(s.combat!.attackerConfirmed).toBe(true);expect(()=>dispatch(s,{type:'SPEND_FERVOR',playerId:'p1',dieIndex:0})).toThrow();});
 it.each(['tapa','escudo'])('%s cancels incoming Hits but preserves normal Dodge counters',itemId=>{let s=act(attack(),'ROLL_ATTACK');s.combat!.attackerRoll=[4,5,6];s=act(s,'CONFIRM_ATTACK');item(s,'p2',itemId);s=use(s,'p2',itemId);s=act(s,'ACCEPT_ATTACK');s=act(s,'ROLL_DODGE');s.combat!.defenderRoll=[6,1,1];s=act(s,'CONFIRM_DODGE');expect(s.combat!.attackerDamage).toBe(itemId==='tapa'?1:0);expect(s.combat!.defenderDamage).toBe(1);});
 it('Brasa boosts the next counter once, not each six',()=>{let s=fixture();item(s,'p2','brasa');s=use(s,'p2','brasa');s=rolls(attack(s),[1,1,2],[6,6,1]);expect(s.combat!.defenderDamage).toBe(3);expect(s.content!.players.p2.brasa).toBe(false);});
 it('Clavo queues an extra push after normal displacement',()=>{let s=rolls(attack(),[4,4,4],[1,1,1]);item(s,'p1','clavo');s=use(s,'p1','clavo');s=finish(s);expect(s.phase).toBe('CONTENT_EFFECT');expect(s.content!.effects[0]).toMatchObject({entityId:'p2',steps:1});s=act(s,'EFFECT_MOVE');expect(s.activePlayerId).toBe('p2');assertInvariants(s);});
});
describe('movement and Cat Items',()=>{
 it('Patines extends only the next Move and Hueso supplies optional movement at zero Actions',()=>{let s=fixture();s.players.p1.draftedRats[0].speed=1;item(s,'p1','patines');s=use(s,'p1','patines');s=dispatch(s,{type:'MOVE',playerId:'p1',path:[{q:-3,r:0},{q:-3,r:1}]});expect(s.content!.players.p1.speedBonus).toBe(0);s.players.p1.actionsRemaining=0;item(s,'p1','hueso');s=use(s,'p1','hueso');expect(s.phase).toBe('CONTENT_EFFECT');s=act(s,'EFFECT_MOVE');expect(s.players.p1.actionsRemaining).toBe(0);expect(s.phase).toBe('PLAYER_ACTION');});
 it('Sardina chooses direction without advancing RNG',()=>{let s=fixture();s.phase='CAT_MOVEMENT';s.players.p1.actionsRemaining=0;item(s,'p1','sardina');const before=s.rng.value;s=dispatch(s,{type:'USE_ITEM',playerId:'p1',itemId:'sardina',direction:1});s=act(s,'CONFIRM_CAT_DIRECTION');expect(s.cat.position).toEqual({q:1,r:0});expect(s.rng.value).toBe(before);s=act(s,'FINISH_CAT_MOVEMENT');expect(s.players.p1.actionsRemaining).toBe(2);});
 it('Cascabel rerolls before any Cat movement, exactly once per consumed Item',()=>{let s=fixture();s.phase='CAT_MOVEMENT';s.players.p1.actionsRemaining=0;item(s,'p1','cascabel');s=act(s,'ROLL_CAT_MOVEMENT');const position={...s.cat.position},rng=s.rng.value;s=use(s,'p1','cascabel');expect(s.rng.value).not.toBe(rng);expect(s.cat.position).toEqual(position);s=act(s,'CONFIRM_CAT_DIRECTION');s=act(s,'FINISH_CAT_MOVEMENT');expect(s.eventLog.filter(e=>e.type==='CAT_MOVED')).toHaveLength(1);expect(s.players.p1.actionsRemaining).toBe(2);});
 it.each(['silbato','migajas'])('%s moves the Cat in its correct window',itemId=>{let s=fixture();s.phase='CAT_MOVEMENT';s.players.p1.actionsRemaining=0;item(s,'p1',itemId);if(itemId==='migajas'){s=act(s,'ROLL_CAT_MOVEMENT');s=act(s,'CONFIRM_CAT_DIRECTION');}const legal=getLegalActions(s,'p1').find(a=>a.type==='USE_ITEM'&&a.itemId===itemId);expect(legal).toBeDefined();const before=key(s.cat.position);s=dispatch(s,legal!);expect(key(s.cat.position)).not.toBe(before);});
});
describe('Rat abilities',()=>{
 it.each(['last_health_attack','stationary_attack','stationary_turn_attack','moved_attack','center_die','cat_die'])('%s offers one capped die modification',ability=>{let s=fixture();setAbility(s,'p1',ability);if(ability==='last_health_attack')s.players.p1.currentRat.health=1;if(ability==='moved_attack')s.content!.players.p1.moved=true;s=attack(s);s=act(s,'ROLL_ATTACK');s.combat!.attackerRoll=[5,2,1];if(ability==='center_die')s.board.catSpawn={...s.players.p1.currentRat.position};if(ability==='cat_die'){s.combat!.defenderId='cat';}s=dispatch(s,{type:'USE_ABILITY',playerId:'p1',dieIndex:0});expect(s.combat!.attackerRoll[0]).toBe(6);expect(getLegalActions(s,'p1').some(a=>a.type==='USE_ABILITY')).toBe(false);});
 it.each(['weak_enemy_die','moved_attack_die'])('%s adds an Attack die',ability=>{const s=fixture();setAbility(s,'p1',ability);s.players.p2.currentRat.health=1;s.content!.players.p1.moved=true;expect(act(attack(s),'ROLL_ATTACK').combat!.attackerRoll).toHaveLength(4);});
 it('Místico matches misses too: three Hits can be Dodged and countered',()=>{const s=fixture();setAbility(s,'p1','twins_three');const r=rolls(attack(s),[1,1],[5,6]);expect(r.combat!.attackerDamage).toBe(1);expect(r.combat!.defenderDamage).toBe(1);});
 it('Defensor six cancels two and Contragolpe doubles counter damage',()=>{const s=fixture();setAbility(s,'p2','double_cancel');let r=rolls(attack(s),[4,4,4],[6,1]);expect(r.combat!.attackerDamage).toBe(1);setAbility(s,'p2','double_counter');r=rolls(attack(s),[4,4,4],[6,1]);expect(r.combat!.defenderDamage).toBe(2);});
 it('Temerario keeps one bonus Action after combat and only once per Turn',()=>{const s=fixture();setAbility(s,'p1','twins_action');const r=finish(rolls(attack(s),[1,1],[1]));expect(r.activePlayerId).toBe('p1');expect(r.phase).toBe('PLAYER_ACTION');expect(r.players.p1.actionsRemaining).toBe(1);expect(r.content!.players.p1.bonusGranted).toBe(true);});
 it('Sigiloso and Esquivo receive legal optional movement after displacement',()=>{const s=fixture();setAbility(s,'p1','attack_move');setAbility(s,'p2','dodge_move');let r=finish(rolls(attack(s),[4,4,4],[5]));expect(r.phase).toBe('CONTENT_EFFECT');r=act(r,'SKIP_EFFECT');expect(r.content!.effects[0].playerId).toBe('p2');expect(r.content!.effects[0].steps).toBe(2);r=act(r,'SKIP_EFFECT');expect(r.activePlayerId).toBe('p2');assertInvariants(r);});
});
describe('Decrees and Arena lifecycle',()=>{
 it('claims and replaces immediately with one claimant, including replacement chains',()=>{const s=fixture();s.content!.decrees=['sangre','cuchillas','remata-uno','doma'];s.content!.decreeDeck=['gloria'];s.players.p1.attacks=3;s.players.p1.finishes=1;claimDecrees(s,'immediate');expect(s.content!.claims.map(c=>c.cardId)).toEqual(['sangre','remata-uno','gloria']);expect(s.players.p1.divineFavor).toBe(4);claimDecrees(s,'immediate');expect(s.players.p1.divineFavor).toBe(4);});
 it('Pacifista means zero dealt damage and competitive ties award nobody',()=>{const s=fixture();s.content!.decrees=['pacifista','mas-sangre'];s.players.p1.attacks=0;s.players.p2.attacks=1;s.players.p3.attacks=1;finishArena(s);expect(s.content!.claims).toEqual([{cardId:'pacifista',playerId:'p1',arenaNumber:1}]);});
 it('Arena-end Decrees award at an early ending and Cat Finishes meet generic thresholds',()=>{const s=fixture();s.content!.decrees=['herido','remata-uno'];s.players.p1.finishes=1;s.players.p1.currentRat.health=1;claimDecrees(s,'immediate');finishArena(s);expect(s.content!.claims.map(c=>c.cardId)).toEqual(['remata-uno','herido']);});
 it('Palomar grants an Action on immediate claim; Arena end discards unused Items',()=>{const s=fixture();setAbility(s,'p1','decree_action');s.content!.decrees=['sangre'];s.players.p1.attacks=3;item(s,'p1','pluma');claimDecrees(s,'immediate');expect(s.players.p1.actionsRemaining).toBe(3);finishArena(s);expect(s.content!.players.p1.items).toEqual([]);expect(s.content!.itemDiscard).toContain('pluma');expect(s.players.p1.actionsRemaining).toBe(0);});
});

describe('card interactions and deterministic integration',()=>{
 it('Verdugo grants an immediate bonus Action to an off-Turn counterattacker',()=>{
  const s=fixture();setAbility(s,'p2','finish_action');s.players.p1.currentRat.health=1;
  let r=finish(rolls(attack(s),[1,2,3],[6,1]));expect(r.phase).toBe('CONTENT_EFFECT');
  expect(r.content!.effects[0]).toMatchObject({playerId:'p2',bonusAction:true});
  const a=getLegalActions(r,'p2').find(a=>a.type==='EFFECT_ACTION_MOVE');expect(a).toBeDefined();
  r=dispatch(r,a!);assertInvariants(r);expect(r.activePlayerId).toBe('p2');expect(r.phase).toBe('CAT_MOVEMENT');
 });
 it('Nueve Vidas rolls an additional Dodge die against the Cat',()=>{
  let s=fixture();setAbility(s,'p1','cat_dodge');s.phase='CAT_MOVEMENT';s.players.p1.actionsRemaining=0;s.cat.position={q:-3,r:0};s.content!.catStep='rolled';s.content!.catDie=1;
  s=act(s,'CONFIRM_CAT_DIRECTION');s=act(s,'ROLL_ATTACK');s=act(s,'ACCEPT_ATTACK');s=act(s,'ROLL_DODGE');expect(s.combat!.defenderRoll).toHaveLength(4);
 });
 it('Migajas can trigger Cat combat without an extra random roll',()=>{
  let s=fixture();s.phase='CAT_MOVEMENT';s.content!.catStep='after';s.cat.position={q:-3,r:0};item(s,'p1','migajas');const rng=s.rng.value;
  s=dispatch(s,{type:'USE_ITEM',playerId:'p1',itemId:'migajas',destination:{q:-2,r:0},direction:1});expect(s.phase).toBe('COMBAT');expect(s.combat!.attackerId).toBe('cat');expect(s.rng.value).toBe(rng);
 });
 it('Místico matching misses can still be blocked with Escudo',()=>{
  const f=fixture();setAbility(f,'p1','twins_three');let s=act(attack(f),'ROLL_ATTACK');s.combat!.attackerRoll=[1,1];s=act(s,'CONFIRM_ATTACK');item(s,'p2','escudo');s=use(s,'p2','escudo');s=act(s,'ACCEPT_ATTACK');s=act(s,'ROLL_DODGE');s.combat!.defenderRoll=[6];s=act(s,'CONFIRM_DODGE');expect(s.combat!.attackerDamage).toBe(0);expect(s.combat!.defenderDamage).toBe(1);
 });
 it.each([2,3,4] as const)('completes seeded %i-player Matches with real cards and legal actions',playerCount=>{
  for(let seed=1;seed<=10;seed++){
   let s=createGame({automatic:false,seed,playerCount});
   for(let step=0;step<1600&&s.phase!=='MATCH_END';step++){
    const legal=s.seatOrder.flatMap(id=>getLegalActions(s,id));expect(legal.length,`deadlock seed ${seed} ${s.phase} ${JSON.stringify({active:s.activePlayerId,player:s.players[s.activePlayerId],content:s.content?.players[s.activePlayerId],effects:s.content?.effects,cat:s.cat,log:s.eventLog.slice(-8)})}`).toBeGreaterThan(0);
    let action=legal.find(a=>!['MOVE','END_TURN','SPEND_FERVOR','USE_ITEM','USE_ABILITY','REQUEST_ITEM','SELECT_BET','EFFECT_MOVE','EFFECT_ACTION_MOVE','EFFECT_REQUEST_ITEM'].includes(a.type));
    if(!action){
     const moves=legal.filter(a=>a.type==='MOVE');
     action=moves.find(a=>{const id=occupant(s,a.path.at(-1)!);return id&&id!=='cat';});
     if(!action&&s.players[s.activePlayerId].actionsRemaining===2&&moves.length){
      const targets=Object.values(s.players).filter(p=>p.id!==s.activePlayerId&&p.currentRat.alive&&!p.currentRat.inBurrow).map(p=>p.currentRat.position);if(!targets.length)targets.push({q:0,r:0});
      moves.sort((a,b)=>Math.min(...targets.map(t=>distance(a.path.at(-1)!,t)))-Math.min(...targets.map(t=>distance(b.path.at(-1)!,t))));action=moves[0];
     }
     action??=legal.find(a=>a.type==='END_TURN')??legal[0];
    }
    const before=structuredClone(s);s=dispatch(s,action);assertInvariants(s);if(step%20===0)expect(dispatch(before,action)).toEqual(s);
   }
   expect(s.phase,`seed ${seed}`).toBe('MATCH_END');expect(s.arenaResults).toHaveLength(2);
  }
 },60000);
});

describe('remaining content boundaries',()=>{
 it('Chile can be used on another living player Turn and remains after Turn end',()=>{let s=fixture();item(s,'p2','chile');expect(getLegalActions(s,'p2').some(a=>a.type==='USE_ITEM')).toBe(true);s=use(s,'p2','chile');s=act(s,'END_TURN');expect(s.players.p2.fervor).toBe(1);});
 it('chosen Sardina direction is not a rolled die for Cascabel',()=>{let s=fixture();setAbility(s,'p1','two_items');s.phase='CAT_MOVEMENT';s.content!.players.p1.items=['sardina','cascabel'];s.content!.itemDeck=s.content!.itemDeck.filter(id=>!['sardina','cascabel'].includes(id));s=dispatch(s,{type:'USE_ITEM',playerId:'p1',itemId:'sardina',direction:1});expect(()=>use(s,'p1','cascabel')).toThrow();});
 it('Red never creates a negative Dodge count',()=>{const f=fixture();f.players.p2.draftedRats[0].speed=0;let s=attack(f);item(s,'p1','red');s=use(s,'p1','red');s=act(s,'ROLL_ATTACK');s=act(s,'CONFIRM_ATTACK');s=act(s,'ACCEPT_ATTACK');s=act(s,'ROLL_DODGE');expect(s.combat!.defenderRoll).toEqual([]);});
 it('Rat content is reset between Arenas while deck order and Favor persist',()=>{let s=fixture();item(s,'p1','brasa');s=use(s,'p1','brasa');s.content!.players.p1.catDamage=3;s.content!.players.p1.moved=true;s.players.p1.divineFavor=4;const deck=[...s.content!.itemDeck];finishArena(s);s=act(s,'CONTINUE_ARENA');s=act(s,'START_ARENA_2');expect(s.content!.players.p1.catDamage).toBe(0);expect(s.content!.players.p1.brasa).toBe(false);expect(s.content!.itemDeck).toEqual(deck);expect(s.players.p1.divineFavor).toBe(4);});
 it('Arena-end strict comparison and center/Health conditions',()=>{const s=fixture();s.roundNumber=5;s.players.p1.currentRat.position={q:0,r:0};s.cat.position={q:1,r:0};s.players.p1.currentRat.health=1;s.players.p2.currentRat.health=1;s.players.p3.currentRat.health=1;s.content!.decrees=['centro','dueno','maltrecho'];finishArena(s);expect(s.content!.claims.map(c=>c.cardId)).toContain('centro');expect(s.content!.claims.map(c=>c.cardId)).not.toContain('dueno');expect(s.content!.claims.filter(c=>c.cardId==='maltrecho')).toHaveLength(1);});
 it('Cat counter-Finish claims Doma and Vengeance and generic Finish objectives',()=>{
  let s=fixture();s.phase='CAT_MOVEMENT';s.players.p1.actionsRemaining=0;s.cat.position={q:-3,r:0};s.cat.health=1;s.content!.catStep='rolled';s.content!.catDie=1;s.content!.decrees=['doma','venganza','remata-uno'];
  s=act(s,'CONFIRM_CAT_DIRECTION');s=act(s,'ROLL_ATTACK');s.combat!.attackerRoll=[1,2,3];s=act(s,'ACCEPT_ATTACK');s=act(s,'ROLL_DODGE');s.combat!.defenderRoll=[6];s=act(s,'CONFIRM_DODGE');expect(s.content!.claims.map(c=>c.cardId)).toEqual(['doma','venganza','remata-uno']);expect(s.players.p1.divineFavor).toBe(8);
 });
});

it('bonus voluntary movement uses free Sewer teleportation and mandatory exit',()=>{
 let s=fixture();item(s,'p1','hueso');s.content!.players.p1.afterMovement=true;s=use(s,'p1','hueso');
 const sewer=getLegalActions(s,'p1').find(a=>a.type==='EFFECT_MOVE'&&a.path&&a.path.length===3);expect(sewer).toBeDefined();
 s=dispatch(s,sewer!);expect(s.phase).toBe('PLAYER_ACTION');expect(s.board.hexes[key(s.players.p1.currentRat.position)].terrain).not.toBe('sewer');assertInvariants(s);
});
it('mixed legal Item/ability decisions preserve invariants across seeded sequences',()=>{
 for(let seed=21;seed<=25;seed++){
  let s=createGame({automatic:false,seed,playerCount:4});
  for(let step=0;step<400&&s.phase!=='MATCH_END';step++){
   const legal=s.seatOrder.flatMap(id=>getLegalActions(s,id));expect(legal.length,`mixed ${seed} ${s.phase}`).toBeGreaterThan(0);
   const items=legal.filter(a=>a.type==='USE_ITEM'||a.type==='USE_ABILITY'||a.type==='REQUEST_ITEM');
   const action=items.length?items[(step+seed)%items.length]:legal[(step*17+seed)%legal.length];
   s=dispatch(s,action);assertInvariants(s);
  }
 }
},60000);

it('Clavo extra displacement precedes Sigiloso post-combat movement',()=>{
 const f=fixture();setAbility(f,'p1','attack_move');let s=rolls(attack(f),[4,4,4],[1]);item(s,'p1','clavo');s=use(s,'p1','clavo');s=finish(s);
 expect(s.content!.effects[0].reason).toBe('Bent Nail');expect(getLegalActions(s,'p1').some(a=>a.type==='SKIP_EFFECT')).toBe(false);
 s=act(s,'EFFECT_MOVE');expect(s.content!.effects[0].reason).toBe('Stealthy Rat');
});

it('Hueso can extend a combat-triggering Move after normal displacement',()=>{
 let s=rolls(attack(),[4,4,4],[1]);item(s,'p1','hueso');s=use(s,'p1','hueso');expect(s.phase).toBe('COMBAT');s=finish(s);expect(s.phase).toBe('CONTENT_EFFECT');expect(s.content!.effects[0].reason).toBe('Polished Bone');s=act(s,'EFFECT_MOVE');expect(s.activePlayerId).toBe('p2');assertInvariants(s);
});

it.each(['ultimo','herido','maltrecho','dueno','centro'])('early Arena ending evaluates %s for the sole surviving Rat',id=>{const s=fixture();s.roundNumber=2;s.players.p1.currentRat.position={q:0,r:0};s.players.p1.currentRat.health=1;s.cat.position={q:1,r:0};for(const id of ['p2','p3']){s.players[id].currentRat.alive=false;s.players[id].currentRat.health=0;s.players[id].eliminated=true;}s.content!.decrees=[id];claimDecrees(s,'immediate');expect(s.content!.claims).toHaveLength(0);finishArena(s);expect(s.content!.claims).toContainEqual({cardId:id,playerId:'p1',arenaNumber:1});});
it('dead Rats do not qualify for Arena-end survival cards',()=>{const s=fixture();s.content!.decrees=['herido','maltrecho','centro'];for(const p of Object.values(s.players)){p.currentRat.alive=false;p.currentRat.health=0;p.eliminated=true;}finishArena(s);expect(s.content!.claims).toHaveLength(0);});
