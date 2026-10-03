/** Centro da casa `index` em graus, a partir do topo, sentido horário. */
export function pocketCenterDeg(index: number, count: number): number {
  return (index + 0.5) * (360 / count)
}
