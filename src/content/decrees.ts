export interface DecreeCard {id:string;name:string;reward:number;timing:'immediate'|'end_of_arena';condition:DecreeCondition}
export type DecreeCondition=
 | {kind:'threshold';stat:'attacks'|'dodges'|'finishes'|'catDamage'|'catFinishes'|'counterFinishes';value:number}
 | {kind:'all';attacks:number;dodges:number;finishes:number}
 | {kind:'winner';health?:number;finishes?:number}
 | {kind:'pacifist'}
 | {kind:'most';stat:'attacks'|'dodges'}
 | {kind:'round_five';healthMax?:number;healthExact?:number;center?:boolean;highestHealth?:boolean;sole?:boolean};
export const decreeCards:readonly DecreeCard[]=[
 {id:'presion',name:'Bajo presión',reward:2,timing:'end_of_arena',condition:{kind:'winner',health:1}},
 {id:'venganza',name:'Venganza',reward:3,timing:'immediate',condition:{kind:'threshold',stat:'counterFinishes',value:1}},
 {id:'pacifista',name:'Pacifista del palomo',reward:3,timing:'end_of_arena',condition:{kind:'pacifist'}},
 {id:'gana-remata',name:'Gana y remata',reward:2,timing:'end_of_arena',condition:{kind:'winner',finishes:1}},
 {id:'mas-sangre',name:'Más sangre',reward:2,timing:'end_of_arena',condition:{kind:'most',stat:'attacks'}},
 {id:'elusivo',name:'Elusivo',reward:2,timing:'end_of_arena',condition:{kind:'most',stat:'dodges'}},
 {id:'ultimo',name:'Último en pie',reward:2,timing:'end_of_arena',condition:{kind:'round_five',sole:true}},
 {id:'doma',name:'Doma al gato',reward:4,timing:'immediate',condition:{kind:'threshold',stat:'catFinishes',value:1}},
 {id:'desafia',name:'Desafía al gato',reward:2,timing:'immediate',condition:{kind:'threshold',stat:'catDamage',value:2}},
 {id:'gloria',name:'Sangre y gloria',reward:2,timing:'immediate',condition:{kind:'all',attacks:1,dodges:0,finishes:1}},
 {id:'completo',name:'Gladiador completo',reward:2,timing:'immediate',condition:{kind:'all',attacks:1,dodges:1,finishes:1}},
 {id:'herido',name:'Sobrevive herido',reward:2,timing:'end_of_arena',condition:{kind:'round_five',healthMax:2}},
 {id:'maltrecho',name:'Sobrevive maltrecho',reward:3,timing:'end_of_arena',condition:{kind:'round_five',healthExact:1}},
 {id:'dueno',name:'Dueño del centro',reward:3,timing:'end_of_arena',condition:{kind:'round_five',center:true,highestHealth:true}},
 {id:'centro',name:'Toma el centro',reward:2,timing:'end_of_arena',condition:{kind:'round_five',center:true}},
 {id:'remata-dos',name:'Remata 2 ratas',reward:2,timing:'immediate',condition:{kind:'threshold',stat:'finishes',value:2}},
 {id:'remata-uno',name:'Remata 1 rata',reward:1,timing:'immediate',condition:{kind:'threshold',stat:'finishes',value:1}},
 {id:'sangre',name:'Quiero sangre',reward:1,timing:'immediate',condition:{kind:'threshold',stat:'attacks',value:3}},
 {id:'cuchillas',name:'Bailar entre cuchillas',reward:1,timing:'immediate',condition:{kind:'threshold',stat:'dodges',value:3}},
];

export function decreeDescription(card:DecreeCard):string {
 const c=card.condition;
 switch(c.kind){
  case 'threshold':return `Reach ${c.value} ${({attacks:'damage dealt',dodges:'successful Dodges',finishes:'Finishes (Rats or Cat)',catDamage:'damage dealt to the Cat',catFinishes:'Cat Finish',counterFinishes:'Finish by counterattack'})[c.stat]}.`;
  case 'all':return `Reach ${c.attacks} damage dealt, ${c.dodges} successful Dodges and ${c.finishes} Finish(es).`;
  case 'winner':return `Win the Arena${c.health?` with exactly ${c.health} Health`:''}${c.finishes?` and at least ${c.finishes} Finish`:''}.`;
  case 'pacifist':return 'End the Arena alive with zero damage dealt (including counterattacks).';
  case 'most':return `End the Arena with strictly more ${c.stat} than every other surviving Rat. Ties award nobody.`;
  case 'round_five':return `Survive to the end of Round 5${c.healthMax?` with at most ${c.healthMax} Health`:''}${c.healthExact?` with exactly ${c.healthExact} Health`:''}${c.center?' on the center hex':''}${c.highestHealth?' with more Health than every other surviving Rat':''}${c.sole?' as the only survivor':''}.`;
 }
}
