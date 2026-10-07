import { Badge, panelClass } from '../../game-session/components/MatchShell'
import { CONDITION_COLORS } from '../config/conditions'
import { useRouletteReport } from '../hooks/useRouletteReport'
import type { RouletteEndedReason, RouletteMatchView, RouletteReport } from '../types/roulette'

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

const pct = (value: number | null) => (value === null ? '—' : `${Math.round(value * 100)}%`)

function ColorName({ id, label }: { id: keyof typeof CONDITION_COLORS | null; label: string | null }) {
  if (!id || !label) return <>—</>
  return (
    <span className="inline-flex items-center gap-1.5">
      <i className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: CONDITION_COLORS[id] }} />
      {label.toLowerCase()}
    </span>
  )
}

/**
 * Registro de apostas do aluno, no formato do "Modelo registro aposta": rodada, frase, valor na
 * mesa, valor apostado, cor e chance escolhidas, cor e chance sorteadas e total. Sem gráfico —
 * o gráfico fica só no relatório do professor.
 */
function RecordTable({ report }: { report: RouletteReport }) {
  const head = ['Rodada', 'Frase', 'Valor na mesa', 'Valor apostado', 'Cor selecionada', 'Prob. cor selecionada', 'Cor certa', 'Prob. cor certa', 'Total']
  return (
    <div className="-mr-2 min-h-0 overflow-auto pr-2 [scrollbar-width:thin]">
      <table className="w-full min-w-[760px] border-separate border-spacing-y-1.5 text-left text-[13.5px]">
        <thead className="sticky top-0 bg-[#F7FAFD]">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-2.5 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[#5C6675]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {report.rounds.map((r) => (
            <tr key={r.round} className="bg-white font-semibold text-[#12151B]">
              <td className="rounded-l-xl border-y-2 border-l-2 border-[#E6EEF6] px-2.5 py-2 font-black">{r.round}</td>
              <td className="max-w-[180px] border-y-2 border-[#E6EEF6] px-2.5 py-2 text-[12.5px] font-medium text-[#3C4654]">
                <span className="line-clamp-2 whitespace-pre-line break-words" title={r.popupMessage ?? undefined}>
                  {r.popupMessage ?? ''}
                </span>
              </td>
              <td className="border-y-2 border-[#E6EEF6] px-2.5 py-2">{r.coinsBefore}</td>
              <td className="border-y-2 border-[#E6EEF6] px-2.5 py-2">{r.aposta}</td>
              <td className="border-y-2 border-[#E6EEF6] px-2.5 py-2">
                <ColorName id={r.opcao} label={r.opcaoLabel} />
              </td>
              <td className="border-y-2 border-[#E6EEF6] px-2.5 py-2">{pct(r.winProbability)}</td>
              <td className="border-y-2 border-[#E6EEF6] px-2.5 py-2">
                <ColorName id={r.resultado} label={r.resultadoLabel} />
              </td>
              <td className="border-y-2 border-[#E6EEF6] px-2.5 py-2">{pct(r.resultProbability)}</td>
              <td
                className="rounded-r-xl border-y-2 border-r-2 border-[#E6EEF6] px-2.5 py-2 font-black"
                style={{ color: r.won ? '#0B7A43' : '#A3161C' }}
              >
                {r.coinsAfter}
                {r.refilled && <span className="ml-1.5 text-[10.5px] font-extrabold uppercase text-[#B7791F]">reposto</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Fim da partida da roleta, no padrão do resultado do jogo das cartas. Os números vêm do backend. */
export function RouletteFinalScreen({ view, email, onExit }: RouletteFinalScreenProps) {
  const { report, error } = useRouletteReport(view.matchId, view.playerId, true)
  const net = view.coins - view.initMoney
  const stats: Array<[string, string]> = [
    ['Fichas finais', String(view.coins)],
    ['Resultado', net > 0 ? `+${net}` : String(net)],
    ['Rodadas', String(view.round)],
    ['Reposições', String(view.refillsUsed)],
  ]

  return (
    <div className={`${panelClass} flex max-w-[980px] flex-col items-center text-center`}>
      <Badge>Resultado final</Badge>
      <h1 className="mt-[clamp(8px,1.6dvh,16px)] mb-1.5 text-[clamp(26px,4.4dvh,42px)] font-black leading-[1.02] tracking-[-0.04em]">
        {TITLES[view.endedReason ?? 'jogador']}
      </h1>
      <p className="mx-auto max-w-[440px] text-base font-medium leading-relaxed text-[#5C6675]">
        Você começou com {view.initMoney} fichas e a meta era {view.pointsLimit}.
      </p>

      <dl className="mt-[clamp(10px,2dvh,20px)] grid w-full shrink-0 grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-3xl border-[2.5px] border-[#E6EEF6] bg-[#F7FAFD] px-4 py-[clamp(6px,1.4dvh,14px)]">
            <dt className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-[#5C6675]">{label}</dt>
            <dd className="my-1 text-[clamp(22px,3.8dvh,36px)] font-black leading-none tracking-[-0.05em]">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-[clamp(10px,2dvh,20px)] flex min-h-0 w-full flex-col rounded-3xl border-2 border-[#E6EEF6] bg-[#F7FAFD] p-3.5 text-left">
        <div className="mb-1 flex shrink-0 flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-[#5C6675]">Registro das apostas</p>
          {report && report.rounds.length > 0 && (
            <p className="text-[13px] font-bold text-[#3C4654]">{report.summary.reinforcementSummary}</p>
          )}
        </div>
        {report ? (
          report.rounds.length > 0 ? (
            <RecordTable report={report} />
          ) : (
            <p className="py-6 text-center text-sm font-semibold text-[#5C6675]">Nenhuma rodada jogada.</p>
          )
        ) : (
          <p className="py-6 text-center text-sm font-semibold text-[#5C6675]">{error ?? 'Carregando o registro…'}</p>
        )}
      </section>

      {email && (
        <p className="mt-[clamp(10px,2dvh,16px)] shrink-0 rounded-2xl border-2 border-[#BFE2FA] bg-[#F2F8FE] px-4 py-2.5 text-sm font-semibold text-[#0069C4]">
          {report?.email.status === 'failed'
            ? `Não foi possível enviar o relatório para ${email}.`
            : `O relatório da partida foi enviado para ${email}.`}
        </p>
      )}

      <button
        type="button"
        onClick={onExit}
        className="mt-[clamp(10px,2dvh,20px)] shrink-0 rounded-full bg-[#00A3F5] px-12 py-[clamp(12px,2dvh,18px)] text-[19px] font-black tracking-[0.06em] text-[#08243C] transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
      >
        VOLTAR AO INÍCIO
      </button>
    </div>
  )
}
