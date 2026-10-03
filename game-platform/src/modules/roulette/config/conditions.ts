import type { RouletteMoveOption, RoulettePocket } from '../types/roulette'

/** Só apresentação: a cor de cada condição na tela. Quais casas são de qual cor vem do backend. */
export const CONDITION_COLORS: Record<RouletteMoveOption, string> = {
  azul: '#1593d6',
  vermelho: '#d42a2a',
  preto: '#141a24',
}

/** Posição da casa sorteada na roda que o backend mandou. */
export function pocketIndex(wheel: RoulettePocket[], label: string): number {
  const index = wheel.findIndex((pocket) => pocket.label === label)
  if (index < 0) throw new Error(`Casa "${label}" não existe na roda`)
  return index
}

export function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(clamped / 60).toString().padStart(2, '0')
  const seconds = (clamped % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

export function formatSessionCode(matchId: string): string {
  const trimmed = matchId.replace(/-/g, '').slice(-8).toUpperCase()
  return trimmed || matchId
}
