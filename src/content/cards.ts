// Exact supplied card content. Effect resolution belongs to the engine.
export interface RatDefinition {
  id:string; name:string; maxHealth:number; attackDice:number; speed:number;
  ability:string; description:string;
}
export const suppliedRatCards:readonly RatDefinition[]=[
  {id:'furioso',name:'Furious Rat',maxHealth:3,attackDice:3,speed:1,ability:'last_health_attack',description:'At exactly 1 Health, increase one Attack die by 1.'},
  {id:'esquivo',name:'Elusive Rat',maxHealth:2,attackDice:1,speed:3,ability:'dodge_move',description:'After rolling at least one successful Dodge, move up to 2 hexes.'},
  {id:'centro',name:'Center Rat',maxHealth:3,attackDice:2,speed:2,ability:'center_die',description:'While on the center hex, increase one Attack or Dodge die by 1.'},
  {id:'ingeniero',name:'Engineer Rat',maxHealth:3,attackDice:1,speed:2,ability:'two_items',description:'You may carry 2 Items.'},
  {id:'mercader',name:'Merchant Rat',maxHealth:3,attackDice:1,speed:2,ability:'bet_favor',description:'Retired: uses the removed Gold mechanic.'},
  {id:'defensor',name:'Defender Rat',maxHealth:4,attackDice:1,speed:1,ability:'double_cancel',description:'Each Dodge six cancels 2 Hits instead of 1.'},
  {id:'veloz',name:'Swift Rat',maxHealth:2,attackDice:2,speed:3,ability:'moved_attack',description:'Retired for movement-ability rework.'},
  {id:'mistico',name:'Mystic Rat',maxHealth:2,attackDice:2,speed:2,ability:'twins_three',description:'Any matching Attack dice replace the Attack with 3 incoming Hits. These can be Dodged and countered.'},
  {id:'sigiloso',name:'Stealthy Rat',maxHealth:2,attackDice:2,speed:3,ability:'attack_move',description:'After attacking, you may move 1 hex.'},
  {id:'guerrero',name:'Warrior Rat',maxHealth:3,attackDice:2,speed:2,ability:'stationary_attack',description:'Retired for movement-ability rework.'},
  {id:'domagatos',name:'Cat Tamer Rat',maxHealth:3,attackDice:2,speed:2,ability:'cat_die',description:'Against the Cat, increase one Attack or Dodge die by 2.'},
  {id:'temerario',name:'Reckless Rat',maxHealth:2,attackDice:2,speed:3,ability:'twins_action',description:'Matching Attack dice grant 1 additional Action, at most once per Turn.'},
  {id:'verdugo',name:'Executioner Rat',maxHealth:3,attackDice:2,speed:1,ability:'finish_action',description:'A Finish grants 1 additional Action, at most once per Turn.'},
  {id:'contragolpe',name:'Counterattack Rat',maxHealth:3,attackDice:1,speed:2,ability:'double_counter',description:'Each counterattack deals 2 damage instead of 1.'},
  {id:'oportunista',name:'Opportunist Rat',maxHealth:3,attackDice:2,speed:2,ability:'weak_enemy_die',description:'Against a Rat with exactly 1 Health, roll 1 additional Attack die.'},
  {id:'nueve-vidas',name:'Nine Lives Rat',maxHealth:3,attackDice:1,speed:3,ability:'cat_dodge',description:'Against a Cat attack, roll 1 additional Dodge die.'},
  {id:'palomar',name:'Dovecote Rat',maxHealth:3,attackDice:1,speed:1,ability:'decree_action',description:'Claiming a Decree grants 1 additional Action.'},
  {id:'gato',name:'Cat Rat',maxHealth:3,attackDice:1,speed:2,ability:'round_five_favor',description:'Retired: uses the removed Gold mechanic.'},
  {id:'murmillo',name:'Murmillo Rat',maxHealth:4,attackDice:2,speed:1,ability:'stationary_turn_attack',description:'Retired for movement-ability rework.'},
  {id:'tracio',name:'Thracian Rat',maxHealth:3,attackDice:2,speed:3,ability:'moved_attack_die',description:'Retired for movement-ability rework.'},
];
export interface ItemDefinition {id:string;name:string;description:string}
export const itemCards:readonly ItemDefinition[]=[
  {id:'clavo',name:'Bent Nail',description:'If your Attack deals damage, add one legal push after normal combat displacement.'},
  {id:'brasa',name:'Ember',description:'Your next counterattack deals 1 additional damage.'},
  {id:'arena',name:'Sand in the Eyes',description:'Before Dodge, force the attacker to reroll one successful Attack die.'},
  {id:'patines',name:'Skates',description:'Move up to 2 additional hexes during your next Move Action.'},
  {id:'chile',name:'Chili',description:'Consume at any time during play to gain 1 normal Fervor token.'},
  {id:'tapa',name:'Bottle Cap',description:'Cancel 1 incoming Hit.'},
  {id:'hueso',name:'Polished Bone',description:'After a Move Action, move up to 1 additional hex, including after combat displacement.'},
  {id:'silbato',name:'Whistle',description:'During your Turn, move the Cat to an adjacent empty hex.'},
  {id:'migajas',name:'Crumbs',description:'During your Turn, move the Cat one legal hex. This can trigger combat.'},
  {id:'escudo',name:'Bottle-Cap Shield',description:'Cancel incoming attack damage. Dodge counters still apply.'},
  {id:'piedra',name:'Sharpened Stone',description:'After rolling Attack, increase one die by 1, capped at 6.'},
  {id:'sardina',name:'Sardine',description:'During your Turn, choose a direction and move the Cat one hex.'},
  {id:'moneda',name:'Shiny Coin',description:'Reroll one die from your Attack or Dodge roll, or your rolled Cat direction.'},
  {id:'cascabel',name:'Jingle Bell',description:'When your Cat direction is rolled, reroll it before movement and use the new result.'},
  {id:'pluma',name:'Feather',description:'Before rolling Dodge, roll 1 additional Dodge die.'},
  {id:'red',name:'Net',description:'Before attacking, reduce the defender’s Dodge dice by 1 (minimum zero).'},
  {id:'aguja',name:'Needle',description:'Before attacking, roll 1 additional Attack die.'},
];

// Owner removed every card containing the retired Oro mechanic.
export const excludedRatIds=['mercader','gato','veloz','guerrero','murmillo','tracio'] as const;
export const ratCards=suppliedRatCards.filter(card=>!excludedRatIds.some(id=>id===card.id));
