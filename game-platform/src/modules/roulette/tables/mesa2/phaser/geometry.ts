/** Medidas da cena (px lógicos). O canvas é escalado para caber no container. */
export const SIZE = 800;
export const C = SIZE / 2;

export const R = {
  bowl: 394, // borda externa de madeira
  bowlInner: 352, // fim da madeira, começo do aro de latão
  trackOuter: 344, // parede da pista da bola
  trackInner: 300, // fim da pista
  deflector: 308, // losangos de latão
  wheel: 292, // borda da roda que gira
  numberIn: 252, // anel dos números
  pocketIn: 206, // anel das casas (onde a bola cai)
  cone: 200,
  turret: 96,
  hub: 34,
  ballRim: 324, // raio da bola rodando na pista
  ballPocket: 229, // raio da bola parada na casa
  ball: 10,
} as const;

export const TAU = Math.PI * 2;

/** Ângulo (no referencial da roda) do centro da casa i. A casa 0 começa no topo. */
export function pocketCenter(i: number, count: number): number {
  return -Math.PI / 2 + (i + 0.5) * (TAU / count);
}

export function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}
