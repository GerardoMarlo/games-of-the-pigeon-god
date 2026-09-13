export interface HexCoordinate { q: number; r: number }
export const directions: readonly HexCoordinate[] = [{q:1,r:0},{q:1,r:-1},{q:0,r:-1},{q:-1,r:0},{q:-1,r:1},{q:0,r:1}];
export const key = (h: HexCoordinate): string => `${h.q},${h.r}`;
export const equal = (a: HexCoordinate, b: HexCoordinate): boolean => a.q === b.q && a.r === b.r;
export const neighbors = (h: HexCoordinate): HexCoordinate[] => directions.map(d => ({q:h.q+d.q,r:h.r+d.r}));
export const distance = (a: HexCoordinate,b: HexCoordinate): number => (Math.abs(a.q-b.q)+Math.abs(a.r-b.r)+Math.abs(a.q+a.r-b.q-b.r))/2;
export function hexagon(radius: number): HexCoordinate[] {
  if (!Number.isInteger(radius) || radius < 0) throw new Error('Invalid radius');
  const result: HexCoordinate[] = [];
  for(let q=-radius;q<=radius;q++) for(let r=Math.max(-radius,-q-radius);r<=Math.min(radius,-q+radius);r++) result.push({q,r});
  return result;
}
