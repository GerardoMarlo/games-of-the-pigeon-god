// Exact supplied card content. Effect resolution belongs to the engine.
export interface RatDefinition {
  id:string; name:string; maxHealth:number; attackDice:number; speed:number;
  ability:string; description:string;
}
export const suppliedRatCards:readonly RatDefinition[]=[
  {id:'furioso',name:'Ratón Furioso',maxHealth:3,attackDice:3,speed:1,ability:'last_health_attack',description:'Si tienes exactamente 1 Vida restante, sube +1 a un dado de Ataque.'},
  {id:'esquivo',name:'Ratón Esquivo',maxHealth:2,attackDice:1,speed:3,ability:'dodge_move',description:'Cuando haces una Esquiva completa, mueve 2 hexágonos.'},
  {id:'centro',name:'Ratón del Centro',maxHealth:3,attackDice:2,speed:2,ability:'center_die',description:'Mientras estés en el hexágono central, sube +1 a un dado de Ataque o de Esquiva.'},
  {id:'ingeniero',name:'Ratón Ingeniero',maxHealth:3,attackDice:1,speed:2,ability:'two_items',description:'Puede llevar 2 objetos a la Arena.'},
  {id:'mercader',name:'Ratón Mercader',maxHealth:3,attackDice:1,speed:2,ability:'bet_favor',description:'Cuando ganas una Apuesta, obtienes +1 Oro adicional.'},
  {id:'defensor',name:'Ratón Defensor',maxHealth:4,attackDice:1,speed:1,ability:'double_cancel',description:'Tus 6 en Esquiva cancelan 2 impactos en lugar de 1.'},
  {id:'veloz',name:'Ratón Veloz',maxHealth:2,attackDice:2,speed:3,ability:'moved_attack',description:'Si te moviste este turno antes de atacar, sube +1 a un dado de Ataque.'},
  {id:'mistico',name:'Ratón Místico',maxHealth:2,attackDice:2,speed:2,ability:'twins_three',description:'Si obtienes dados gemelos al atacar, este ataque genera 3 impactos que se pueden Esquivar y Contraatacar.'},
  {id:'sigiloso',name:'Ratón Sigiloso',maxHealth:2,attackDice:2,speed:3,ability:'attack_move',description:'Después de atacar, puedes mover 1 hexágono.'},
  {id:'guerrero',name:'Ratón Guerrero',maxHealth:3,attackDice:2,speed:2,ability:'stationary_attack',description:'Si no te moviste antes de atacar, sube +1 a un dado de Ataque.'},
  {id:'domagatos',name:'Ratón Domagatos',maxHealth:3,attackDice:2,speed:2,ability:'cat_die',description:'Contra el Gato, sube +2 a un dado de Ataque o de Esquiva.'},
  {id:'temerario',name:'Ratón Temerario',maxHealth:2,attackDice:2,speed:3,ability:'twins_action',description:'Si obtienes dados gemelos al atacar, obtienes 1 acción adicional. Máximo 1 acción adicional por turno.'},
  {id:'verdugo',name:'Ratón Verdugo',maxHealth:3,attackDice:2,speed:1,ability:'finish_action',description:'Cuando haces un Remate, obtienes 1 acción adicional. Máximo 1 acción adicional por turno.'},
  {id:'contragolpe',name:'Ratón Contragolpe',maxHealth:3,attackDice:1,speed:2,ability:'double_counter',description:'Tus Contraataques hacen 2 de daño en lugar de 1.'},
  {id:'oportunista',name:'Ratón Oportunista',maxHealth:3,attackDice:2,speed:2,ability:'weak_enemy_die',description:'Si atacas a una rata que tiene exactamente 1 Vida, tira +1 dado de Ataque.'},
  {id:'nueve-vidas',name:'Ratón de Nueve Vidas',maxHealth:3,attackDice:1,speed:3,ability:'cat_dodge',description:'Contra ataques del Gato, tira +1 dado de Esquiva.'},
  {id:'palomar',name:'Ratón del Palomar',maxHealth:3,attackDice:1,speed:1,ability:'decree_action',description:'Cuando cumples tu Decreto, obtienes 1 acción adicional.'},
  {id:'gato',name:'Ratón del Gato',maxHealth:3,attackDice:1,speed:2,ability:'round_five_favor',description:'Si sobrevives al final del turno 5 de la Arena, obtienes 3 Oro.'},
  {id:'murmillo',name:'Ratón Murmillo',maxHealth:4,attackDice:2,speed:1,ability:'stationary_turn_attack',description:'Si no te moviste este turno, sube +1 a un dado de Ataque.'},
  {id:'tracio',name:'Ratón Tracio',maxHealth:3,attackDice:2,speed:3,ability:'moved_attack_die',description:'Si te moviste antes de atacar, tira +1 dado de Ataque.'},
];
export interface ItemDefinition {id:string;name:string;description:string}
export const itemCards:readonly ItemDefinition[]=[
  {id:'clavo',name:'Clavo torcido',description:'Si tu Ataque causa al menos 1 daño, empuja al objetivo 1 hexágono a una casilla válida.'},
  {id:'brasa',name:'Brasa',description:'Tu próximo Contraataque hace +1 daño.'},
  {id:'arena',name:'Arena en los ojos',description:'Después de que te ataquen, obliga al atacante a repetir 1 dado exitoso de Ataque.'},
  {id:'patines',name:'Patines',description:'Durante una acción de Movimiento, mueve +2 hexágonos.'},
  {id:'chile',name:'Chile',description:'Obtén 1 Fervor. No caduca al final del turno.'},
  {id:'tapa',name:'Tapa de botella',description:'Cancela 1 impacto recibido.'},
  {id:'hueso',name:'Hueso pulido',description:'Después de realizar una acción de Movimiento, mueve 1 hexágono adicional.'},
  {id:'silbato',name:'Silbato',description:'Antes de tirar el movimiento del Gato, muévelo 1 hexágono a una casilla vacía adyacente. Después resuelve su movimiento normalmente.'},
  {id:'migajas',name:'Migajas',description:'Después de resolver el movimiento del Gato, muévelo 1 hexágono adicional en cualquier dirección válida.'},
  {id:'escudo',name:'Escudo de corcholata',description:'Después de que un ataque consiga al menos 1 impacto contra ti, cancela completamente ese ataque.'},
  {id:'piedra',name:'Piedra afilada',description:'Después de tirar Ataque, aumenta +1 el resultado de uno de tus dados.'},
  {id:'sardina',name:'Sardina',description:'Antes de mover al Gato, elige la dirección de su movimiento en lugar de tirar el dado.'},
  {id:'moneda',name:'Moneda brillante',description:'Después de realizar una tirada, repite 1 dado.'},
  {id:'cascabel',name:'Cascabel',description:'Después de tirar el dado de movimiento del Gato, repite la tirada y usa el nuevo resultado.'},
  {id:'pluma',name:'Pluma',description:'Antes de tirar Esquiva, tira +1 dado de Esquiva.'},
  {id:'red',name:'Red',description:'Antes de atacar, el defensor tira 1 dado menos de Esquiva contra este ataque.'},
  {id:'aguja',name:'Aguja',description:'Antes de atacar, tira +1 dado de Ataque.'},
];

// Owner removed every card containing the retired Oro mechanic.
export const excludedRatIds=['mercader','gato'] as const;
export const ratCards=suppliedRatCards.filter(card=>!excludedRatIds.some(id=>id===card.id));
