import type { PresentSpin } from '../hooks/useRouletteMatch'
import type { RouletteMatchView, RouletteMoveOption, RouletteSpinResponse } from '../types/roulette'
import type { SpinTone } from './TableKit'

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
  const where = `Deu ${spin.pocket} (${conditionLabel(spin.resultado).toLowerCase()})`
  const outcome = spin.won
    ? `${where}. Você ganhou e recebeu ${spin.aposta + spin.delta} fichas (${spin.aposta} da aposta + ${spin.delta} de lucro)!`
    : `${where}. Não foi dessa vez: as ${spin.aposta} ${spin.aposta === 1 ? 'ficha apostada ficou' : 'fichas apostadas ficaram'} com a banca.`
  return spin.refilled ? `${outcome} Suas fichas acabaram e foram repostas (${spin.refillsUsed}ª reposição).` : outcome
}

/** Mensagem e cor da faixa sob a roda, iguais nas duas mesas. */
export function spinStatus(
  { actionError, busy, lastSpin }: Pick<RouletteTableProps, 'actionError' | 'busy' | 'lastSpin'>,
  selectedLabel: string | null,
  conditionLabel: (id: RouletteMoveOption) => string,
): { tone: SpinTone; text: string } {
  if (actionError) return { tone: 'warn', text: actionError }
  if (busy) return { tone: 'busy', text: 'Aposta feita! A roleta está girando…' }
  if (lastSpin) return { tone: lastSpin.won ? 'win' : 'lose', text: describeSpin(lastSpin, conditionLabel) }
  if (selectedLabel) return { tone: 'neutral', text: `Você escolheu ${selectedLabel.toLowerCase()}. Defina o valor e gire a roleta.` }
  return { tone: 'neutral', text: 'Escolha uma cor e o valor da aposta para girar a roleta.' }
}
