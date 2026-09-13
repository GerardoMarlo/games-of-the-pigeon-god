// Serializable 32-bit LCG. Never use Math.random in engine or future AI.
export interface RNGState { seed: number; value: number }
export function seeded(seed: number): RNGState {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed must be a safe integer');
  return {seed:seed >>> 0,value:seed >>> 0};
}
export function next(rng: RNGState): number { rng.value = (Math.imul(1664525,rng.value)+1013904223) >>> 0; return rng.value/4294967296; }
export const rollD6 = (rng: RNGState): number => 1+Math.floor(next(rng)*6);
export function shuffle<T>(rng: RNGState, items: readonly T[]): T[] {
  const result = [...items];
  for(let i=result.length-1;i>0;i--) { const j=Math.floor(next(rng)*(i+1)); [result[i],result[j]]=[result[j],result[i]]; }
  return result;
}
