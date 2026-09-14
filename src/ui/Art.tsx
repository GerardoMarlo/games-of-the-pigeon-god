import { artUrl } from '../assets';
import { decreeCards } from '../content/decrees';
import { suppliedRatCards,itemCards } from '../content/cards';
export const colors=['#c5604c','#5c96b3','#79a179','#caa948'];
export const burrows=['red','blue','green','yellow'];
export function Portrait({id,className=''}:{id:string;className?:string}){const i=suppliedRatCards.findIndex(r=>r.id===id);return <svg preserveAspectRatio="xMidYMid slice" className={`portrait ${className}`} viewBox={`${(i%10)*600+42} ${Math.floor(i/10)*840+200} 516 340`} aria-label="Rat portrait"><image href={artUrl('rats.webp')} width="6000" height="5880"/></svg>;}
export function ItemArt({id}:{id:string}){const i=itemCards.findIndex(r=>r.id===id);return <svg preserveAspectRatio="xMidYMid slice" className="item-art" viewBox={`${(i%10)*464+55} ${Math.floor(i/10)*650+155} 354 270`} aria-hidden="true"><image href={artUrl('items.webp')} width="4640" height="4550"/></svg>;}
export function FavorIcon(){return <svg preserveAspectRatio="xMidYMid slice" className="favor-icon" viewBox="302 257 650 700" role="img" aria-label="Divine Favor"><image href={artUrl('favor.webp')} width="1254" height="1254"/></svg>;}
export function DecreeArt({id}:{id:string}){let i=decreeCards.findIndex(c=>c.id===id);if(i>=8)i++;return <svg preserveAspectRatio="xMidYMid slice" className="decree-art" viewBox={`${i%10*464+40} ${Math.floor(i/10)*650+175} 384 265`} aria-hidden="true"><image href={artUrl('decrees.webp')} width="4640" height="4550"/></svg>;}
export function Resource({kind,value}:{kind:'health'|'fervor'|'favor';value:number}){return <span className="resource">{kind==='favor'?<FavorIcon/>:<img src={artUrl(`${kind}.webp`)} alt={kind}/>}<b>{value}</b></span>;}
