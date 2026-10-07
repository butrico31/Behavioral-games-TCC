import { Badge, panelClass } from '../../game-session/components/MatchShell'
import { CONDITION_COLORS } from '../config/conditions'
import type { RouletteMatchView } from '../types/roulette'

interface RouletteHowToPlayScreenProps {
  view: RouletteMatchView
  onReady: () => void
}

/**
 * Tela de regras antes da partida, no mesmo padrão do "Como jogar" do dilema do prisioneiro
 * (MatchShell/HowToPlayScreen) — a roleta não tem adversário, então não há sala de espera: só
 * esta etapa antes da mesa.
 */
export function RouletteHowToPlayScreen({ view, onReady }: RouletteHowToPlayScreenProps) {
  return (
    <div className={`${panelClass} flex max-w-[1100px] flex-col gap-[clamp(10px,1.8dvh,24px)]`}>
      <header className="shrink-0">
        <Badge>Como jogar</Badge>
        <h1 className="mt-3 text-[clamp(26px,3.7dvh,40px)] font-black leading-[1.05] tracking-[-0.04em]">
          Escolha uma cor, aposte fichas, gire a roleta.
        </h1>
        <p className="mt-2 max-w-[640px] text-[clamp(14px,1.9dvh,16.5px)] font-medium leading-relaxed text-[#5C6675]">
          Você começa com {view.initMoney} fichas. A partida termina quando o saldo chega a {view.pointsLimit} (meta)
          {view.timeLimit !== null ? ' ou o tempo acabar.' : '.'}
        </p>
      </header>

      <section className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
        {view.conditions.map((condition) => (
          <div
            key={condition.id}
            className="flex flex-col gap-2 rounded-[20px] border-2 border-[#E6EEF6] bg-[#F7FAFD] p-4"
          >
            <span
              className="h-4 w-4 rounded-[4px]"
              style={{ background: CONDITION_COLORS[condition.id] }}
            />
            <p className="text-lg font-black tracking-[-0.02em]">{condition.label}</p>
            <p className="text-sm font-medium text-[#5C6675]">
              {condition.payoutLabel} · {Math.round(condition.chance * 100)}% de chance
            </p>
          </div>
        ))}
      </section>

      <section className="flex min-h-0 flex-col gap-2 rounded-[20px] border-2 border-[#E6EEF6] bg-[#F7FAFD] p-4 text-sm font-medium leading-relaxed text-[#3C4654]">
        <p>Escolha uma condição, defina a magnitude (fichas ou digite o valor) e execute o ensaio.</p>
        <p>
          Se ganhar, a aposta volta pra você junto com o lucro: "paga 2×" devolve a aposta e soma o mesmo valor de
          lucro. Se perder, a aposta fica com a banca.
        </p>
        <p>
          Se o saldo zerar, ele é reposto automaticamente às fichas iniciais até {view.maxRefills}{' '}
          {view.maxRefills === 1 ? 'vez' : 'vezes'} antes da partida encerrar.
        </p>
        {view.allowGiveUp && <p>Você pode encerrar a partida a qualquer momento e manter o saldo atual.</p>}
      </section>

      <footer className="flex shrink-0 items-center justify-between gap-4">
        <p className="max-w-[320px] text-[13px] font-semibold leading-snug text-[#5C6675]">
          Suas jogadas ficam registradas pra análise do professor.
        </p>
        <button
          type="button"
          onClick={onReady}
          className="shrink-0 animate-[dpGlow_2.2s_ease-in-out_infinite] rounded-full bg-[#00A3F5] px-12 py-[clamp(12px,2.2dvh,19px)] text-xl font-black tracking-[0.06em] text-[#08243C] transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
        >
          ESTOU PRONTO
        </button>
      </footer>
    </div>
  )
}
