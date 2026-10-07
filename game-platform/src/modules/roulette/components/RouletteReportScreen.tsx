import type { ReactNode } from 'react'
import { CircleDot, Mail, MessageSquareText, UserCircle } from 'lucide-react'
import { CONDITION_COLORS } from '../config/conditions'
import type { RouletteReport } from '../types/roulette'

interface RouletteReportScreenProps {
  report: RouletteReport | null
  error: string | null
  onBack: () => void
  backLabel?: string
  /** O aviso do envio por e-mail só faz sentido para o jogador. */
  showEmailStatus?: boolean
  /** Seções extras depois dos popups (o relatório do professor põe os gráficos aqui). */
  children?: ReactNode
}

const fmtSeconds = (value: number | null) => (value === null ? '—' : `${value.toLocaleString('pt-BR')} s`)

const fmtTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

const fmtDateTime = (iso: string | null) =>
  iso
    ? `${new Date(iso).toLocaleDateString('pt-BR')} ${new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : '—'

const signed = (n: number) => (n > 0 ? `+${n}` : String(n))

const fmtPct = (value: number | null) => (value === null ? '—' : `${Math.round(value * 100)}%`)

const EMAIL_COPY: Record<RouletteReport['email']['status'], (to: string | null) => string> = {
  sent: (to) => `Relatório enviado para ${to ?? 'o seu e-mail'}.`,
  pending: () => 'Enviando o relatório por e-mail…',
  failed: () => 'Não foi possível enviar o relatório por e-mail.',
  none: () => 'Nenhum e-mail informado na entrada: o relatório não foi enviado.',
}

/**
 * Tela final da roleta, no mesmo modelo da "Detalhes da Partida" do professor: cabeçalho,
 * cartões (jogador e resultado), tabela de jogadas com linha de Total e popups. O jogador vê sem
 * gráfico; o relatório do professor reaproveita esta tela e passa os gráficos em `children`.
 * Todos os números vêm prontos do backend.
 */
export function RouletteReportScreen({
  report,
  error,
  onBack,
  backLabel = 'Voltar às sessões',
  showEmailStatus = true,
  children,
}: RouletteReportScreenProps) {
  if (!report) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="surface-panel py-12 text-center text-sm text-muted-foreground">
          {error ?? 'Gerando o relatório da partida…'}
        </div>
        <div className="mt-4 flex justify-center">
          <button type="button" onClick={onBack} className="btn-secondary">
            {backLabel}
          </button>
        </div>
      </main>
    )
  }

  const { summary } = report
  const stats: Array<[string, string]> = [
    ['Fichas iniciais', String(summary.initMoney)],
    ['Meta', String(summary.goal)],
    ['Resultado líquido', signed(summary.netResult)],
    ['Motivo do fim', report.match.endedReasonLabel],
    ['Reposições de saldo', String(summary.refillsUsed)],
    ['Jogadas', String(summary.totalRounds)],
    ['Vitórias / derrotas', `${summary.wins} / ${summary.losses}`],
    ['Reforçado / punido', `${summary.reinforcedPercent}% / ${summary.punishedPercent}%`],
    ['Total apostado', String(summary.totalBet)],
    ['Aposta média', summary.averageBet.toLocaleString('pt-BR')],
    ['Maior / menor aposta', `${summary.maxBet} / ${summary.minBet}`],
    ['Tempo médio entre jogadas', fmtSeconds(summary.averageSecondsBetween)],
    ['Duração da partida', fmtSeconds(report.match.durationSeconds)],
  ]

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 md:py-10">
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="surface-panel flex items-center gap-3 px-6 py-5 lg:w-1/3">
          <CircleDot className="h-8 w-8 shrink-0 text-primary" />
          <h1 className="text-2xl text-foreground md:text-3xl">Relatório da Partida</h1>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="surface-subtle p-4">
            <p className="heading-kicker mb-1">Sessão</p>
            <p className="text-base font-semibold text-foreground">{report.session.name}</p>
          </div>
          <div className="surface-subtle p-4">
            <p className="heading-kicker mb-1">Jogo</p>
            <p className="text-base font-semibold text-foreground">Roleta</p>
          </div>
          <div className="surface-subtle p-4">
            <p className="heading-kicker mb-1">Iniciada em</p>
            <p className="text-base font-semibold text-foreground">{fmtDateTime(report.match.startedAt)}</p>
          </div>
        </div>
      </section>

      {showEmailStatus && (
      <div
        className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
          report.email.status === 'failed'
            ? 'border-destructive/40 bg-destructive/10 text-destructive'
            : 'border-primary/30 bg-primary/10 text-foreground'
        }`}
        aria-live="polite"
      >
        <Mail className="h-4 w-4 shrink-0" />
        {EMAIL_COPY[report.email.status](report.email.to)}
      </div>
      )}

      <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="surface-panel p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-primary/35 bg-primary/10 p-2 text-primary">
                <UserCircle className="h-7 w-7" />
              </div>
              <div>
                <p className="heading-kicker">Participante</p>
                <h2 className="text-2xl text-foreground">Jogador</h2>
              </div>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-right">
              <p className="heading-kicker">Fichas</p>
              <p className="text-3xl font-bold text-foreground">{summary.finalCoins}</p>
            </div>
          </div>
          <div className="surface-subtle p-4">
            <p className="heading-kicker mb-3">Dados do jogador</p>
            {report.player.fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados informados.</p>
            ) : (
              <dl className="grid grid-cols-2 gap-3">
                {report.player.fields.map((field) => (
                  <div key={field.key}>
                    <dt className="text-xs text-muted-foreground">{field.label}</dt>
                    <dd className="text-sm font-semibold text-foreground">{field.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        <div className="surface-panel p-6">
          <p className="heading-kicker mb-3">Resultado</p>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {stats.map(([label, value]) => (
              <div key={label} className="surface-subtle p-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-base font-semibold text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {summary.betsByCondition.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs text-muted-foreground"
              >
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CONDITION_COLORS[c.id] }} />
                {c.label}: {c.count} {c.count === 1 ? 'aposta' : 'apostas'} · {c.total} fichas
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="surface-panel mb-6 p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl text-foreground md:text-3xl">Registro das apostas</h2>
            <p className="mt-1 text-sm font-semibold text-foreground">{summary.reinforcementSummary}</p>
          </div>
          <span className="rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs font-semibold text-muted-foreground">
            {summary.totalRounds} {summary.totalRounds === 1 ? 'jogada' : 'jogadas'}
          </span>
        </div>

        {report.rounds.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma jogada registrada nesta partida.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/80">
            <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
              <thead className="bg-secondary/35 text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 font-semibold">Rodada</th>
                  <th className="px-3 py-3 font-semibold">Frase</th>
                  <th className="px-3 py-3 font-semibold">Valor na mesa</th>
                  <th className="px-3 py-3 font-semibold">Valor apostado</th>
                  <th className="px-3 py-3 font-semibold">Cor selecionada</th>
                  <th className="px-3 py-3 font-semibold">Prob. cor selecionada</th>
                  <th className="px-3 py-3 font-semibold">Cor certa</th>
                  <th className="px-3 py-3 font-semibold">Prob. cor certa</th>
                  <th className="px-3 py-3 font-semibold">Total</th>
                  <th className="px-3 py-3 font-semibold">Resultado</th>
                  <th className="px-3 py-3 font-semibold">Casa</th>
                  <th className="px-3 py-3 font-semibold">Horário</th>
                  <th className="px-3 py-3 font-semibold">Desde a última</th>
                  <th className="px-3 py-3 font-semibold">Leitura da frase</th>
                </tr>
              </thead>
              <tbody>
                {report.rounds.map((r) => (
                  <tr key={r.round} className="border-t border-border/70 bg-card/35">
                    <td className="px-3 py-3 font-medium text-foreground">{r.round}</td>
                    <td className="max-w-[220px] px-3 py-3 text-foreground">
                      {r.popupMessage ? (
                        <span title={r.popupMessage} className="line-clamp-2 whitespace-pre-line break-words">
                          {r.popupMessage}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-foreground">{r.coinsBefore}</td>
                    <td className="px-3 py-3 text-foreground">{r.aposta}</td>
                    <td className="px-3 py-3 text-foreground">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CONDITION_COLORS[r.opcao] }} />
                        {r.opcaoLabel.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-foreground">{fmtPct(r.winProbability)}</td>
                    <td className="px-3 py-3 text-foreground">
                      {r.resultado ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CONDITION_COLORS[r.resultado] }} />
                          {r.resultadoLabel?.toLowerCase()}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-3 text-foreground">{fmtPct(r.resultProbability)}</td>
                    <td className="px-3 py-3 font-semibold text-foreground">
                      {r.coinsAfter}
                      {r.refilled && (
                        <span
                          title="Saldo zerou e foi reposto às fichas iniciais"
                          className="ml-2 inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary"
                        >
                          Reposição
                        </span>
                      )}
                    </td>
                    <td className={`px-3 py-3 font-semibold ${r.won ? 'text-success' : 'text-destructive'}`}>
                      {r.won ? 'Reforçado' : 'Punido'}
                    </td>
                    <td className="px-3 py-3 text-foreground">{r.pocket ?? '—'}</td>
                    <td className="px-3 py-3 font-data text-xs text-muted-foreground">{fmtTime(r.playedAt)}</td>
                    <td className="px-3 py-3 text-foreground">{fmtSeconds(r.secondsSinceLast)}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {r.popupMessage ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MessageSquareText className="h-3.5 w-3.5 text-primary" />
                          {fmtSeconds(r.popupReadSeconds)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-secondary/45 font-semibold text-foreground">
                  <td className="px-3 py-3">Total</td>
                  <td className="px-3 py-3">{summary.popupsShown} frases</td>
                  <td className="px-3 py-3 text-muted-foreground">—</td>
                  <td className="px-3 py-3">{summary.totalBet}</td>
                  <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                    —
                  </td>
                  <td className="px-3 py-3">{summary.finalCoins}</td>
                  <td className="px-3 py-3">
                    {summary.reinforcedPercent}% / {summary.punishedPercent}%
                  </td>
                  <td className="px-3 py-3 text-muted-foreground" colSpan={2}>
                    —
                  </td>
                  <td className="px-3 py-3">
                    {summary.averageSecondsBetween !== null ? `média ${fmtSeconds(summary.averageSecondsBetween)}` : '—'}
                  </td>
                  <td className="px-3 py-3">
                    {summary.averagePopupReadSeconds !== null ? `média ${fmtSeconds(summary.averagePopupReadSeconds)}` : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {report.popups.length > 0 && (
        <section className="surface-panel mb-6 p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MessageSquareText className="h-6 w-6 text-primary" />
              <h2 className="text-2xl text-foreground md:text-3xl">Popups</h2>
            </div>
            <span className="rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs font-semibold text-muted-foreground">
              {summary.popupsShown} de {summary.popupsConfigured} exibidos · leitura média{' '}
              {fmtSeconds(summary.averagePopupReadSeconds)}
            </span>
          </div>
          <ul className="space-y-3">
            {report.popups.map((p) => (
              <li key={p.round} className="surface-subtle flex flex-col gap-2 p-4 sm:flex-row sm:items-start">
                <span className="heading-kicker shrink-0 sm:w-24">Rodada {p.round}</span>
                <p className="flex-1 whitespace-pre-line break-words text-sm text-foreground">{p.message}</p>
                <span className="shrink-0 text-xs text-muted-foreground sm:text-right">
                  {p.shown ? `Exibido · leitura ${fmtSeconds(p.readSeconds)}` : 'Não chegou à rodada'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {children}

      <div className="flex justify-end">
        <button type="button" onClick={onBack} className="btn-primary">
          {backLabel}
        </button>
      </div>
    </main>
  )
}
