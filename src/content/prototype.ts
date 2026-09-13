import type { RatCard } from '../engine/types';
// Designer placeholders, not official cards or Arena geometry (spec §§12,15,95).
export const prototypeRats: RatCard[] = Array.from({length:8},(_,i)=>({id:`prototype-${i+1}`,name:`Test Rat ${i+1}`,maxHealth:6,attackDice:[2,3,4][Math.floor(i/2)%3],speed:3,artwork:''}));
