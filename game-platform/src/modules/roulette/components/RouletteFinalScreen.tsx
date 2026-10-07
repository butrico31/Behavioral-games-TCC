import { Badge, panelClass } from '../../game-session/components/MatchShell'
import type { RouletteEndedReason, RouletteMatchView } from '../types/roulette'

interface RouletteFinalScreenProps {
  view: RouletteMatchView
  /** E-mail digitado na entrada; null quando o jogador não informou (aí nada é enviado). */
  email: string | null
  onExit: () => void
}

const TITLES: Record<RouletteEndedReason, string> = {
  meta: 'Meta alcançada!',
  saldo: 'As fichas acabaram.',
  tempo: 'O tempo acabou.',
  jogador: 'Partida encerrada.',
}

/** Fim da partida da roleta, no padrão do resultado do prisioneiro. Os números vêm do backend. */
export function RouletteFinalScreen({ view, email, onExit }: RouletteFinalScreenProps) {
  const net = view.coins - view.initMoney
  const stats: Array<[string, string]> = [
    ['Fichas finais', String(view.coins)],
    ['Resultado', net > 0 ? `+${net}` : String(net)],
    ['Jogadas', String(view.round)],
    ['Reposições', String(view.refillsUsed)],
  ]

  return (
    <div className={`${panelClass} flex max-w-[760px] flex-col items-center text-center`}>
      <Badge>Resultado final</Badge>
      <h1 className="mt-[clamp(8px,1.6dvh,16px)] mb-1.5 text-[clamp(26px,4.4dvh,42px)] font-black leading-[1.02] tracking-[-0.04em]">
        {TITLES[view.endedReason ?? 'jogador']}
      </h1>
      <p className="mx-auto max-w-[440px] text-base font-medium leading-relaxed text-[#5C6675]">
        Você começou com {view.initMoney} fichas e a meta era {view.pointsLimit}.
      </p>

      <dl className="mt-[clamp(12px,2.6dvh,24px)] grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-3xl border-[2.5px] border-[#E6EEF6] bg-[#F7FAFD] px-4 py-[clamp(6px,1.8dvh,16px)]">
            <dt className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-[#5C6675]">{label}</dt>
            <dd className="my-1 text-[clamp(24px,4.4dvh,40px)] font-black leading-none tracking-[-0.05em]">{value}</dd>
          </div>
        ))}
      </dl>

      {email && (
        <p className="mt-[clamp(12px,2.6dvh,20px)] rounded-2xl border-2 border-[#BFE2FA] bg-[#F2F8FE] px-4 py-3 text-sm font-semibold text-[#0069C4]">
          O relatório da partida foi enviado para {email}.
        </p>
      )}

      <button
        type="button"
        onClick={onExit}
        className="mt-[clamp(12px,2.6dvh,24px)] rounded-full bg-[#00A3F5] px-12 py-[clamp(12px,2dvh,18px)] text-[19px] font-black tracking-[0.06em] text-[#08243C] transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
      >
        VOLTAR AO INÍCIO
      </button>
    </div>
  )
}
