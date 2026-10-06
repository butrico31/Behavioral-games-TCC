import type { PresentSpin } from '../hooks/useRouletteMatch'
import type { RouletteMatchView, RouletteMoveOption, RouletteSpinResponse } from '../types/roulette'

/** O que toda mesa recebe da página. A mesa só desenha; as regras vêm em `view` do backend. */
export interface RouletteTableProps {
  view: RouletteMatchView
  busy: boolean
  /** Bloqueia apostas enquanto o popup do professor está aberto. */
  locked: boolean
  lastSpin: RouletteSpinResponse | null
  actionError: string | null
  remainingSeconds: number | null
  elapsedSeconds: number
  onSpin: (opcao: RouletteMoveOption, aposta: number, present: PresentSpin) => Promise<RouletteSpinResponse | null>
  onFinish: () => void
}

/** Texto do resultado montado só com o que o servidor devolveu. */
export function describeSpin(spin: RouletteSpinResponse, conditionLabel: (id: RouletteMoveOption) => string): string {
  const where = `Casa ${spin.pocket} (${conditionLabel(spin.resultado)})`
  const outcome = spin.won
    ? `${where}. Reforço: +${spin.delta} fichas.`
    : `${where}. Sem reforço: −${spin.aposta} fichas.`
  return spin.refilled ? `${outcome} Fichas zeraram e foram repostas (reposição ${spin.refillsUsed}).` : outcome
}
