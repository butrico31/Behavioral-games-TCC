import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Mail,
  RefreshCw,
  Swords,
  Users
} from 'lucide-react'
import { Header } from '../../../shared/components/Header'
import { Toast } from '../../../shared/components/Toast'
import { useToast } from '../../../shared/hooks/useToast'
import { useSessionResults } from '../hooks/useSessionResults'
import { useGsapReveal } from '../../../shared/hooks/useGsapReveal'
import { sendSessionReportByEmail } from '../services/mailReportService'
import { validateEmail } from '../../../shared/utils/validation'
import { compute_totals, format_date, format_datetime } from '../utils/format'
import { get_session_label } from '../../game-session/utils/session-label'

// Backend MatchStatus enum: aguardando | em_partida | finalizada | cancelada
const MATCH_STATUS: Record<string, { label: string; class_name: string }> = {
  finalizada: { label: 'Finalizada', class_name: 'border-success/40 bg-success/15 text-success' },
  em_partida: { label: 'Em andamento', class_name: 'border-amber-400/40 bg-amber-400/15 text-amber-400' },
  aguardando: { label: 'Aguardando', class_name: 'border-primary/40 bg-primary/15 text-primary' },
  cancelada: { label: 'Cancelada', class_name: 'border-destructive/40 bg-destructive/15 text-destructive' }
}
const MATCH_STATUS_FALLBACK = { label: '—', class_name: 'border-border bg-secondary/40 text-muted-foreground' }

export function SessionMatchesPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const root_ref = useRef<HTMLDivElement | null>(null)
  const { data, is_loading, is_fetching, is_error, refetch } = useSessionResults(sessionId)
  const { toast, showToast } = useToast()
  const [email_prompt_open, setEmailPromptOpen] = useState(false)
  const [report_email, setReportEmail] = useState('')
  const [is_sending_report, setIsSendingReport] = useState(false)

  useGsapReveal('[data-session="header"], [data-session="matches"]', {
    root: root_ref,
    y: 18,
    duration: 0.55,
    stagger: 0.08,
    deps: [data]
  })

  const is_roulette = data?.session.game === 'roulette'

  const handleOpenMatch = (matchId: string) => {
    if (!sessionId) return
    navigate(`/reports/${sessionId}/matches/${matchId}`)
  }

  const handleSendSessionReport = async () => {
    if (!sessionId) return

    if (!validateEmail(report_email.trim())) {
      showToast('error', 'Digite um e-mail válido')
      return
    }

    setIsSendingReport(true)
    try {
      await sendSessionReportByEmail(sessionId, report_email.trim())
      showToast('success', 'Relatório enviado para o e-mail informado')
      setEmailPromptOpen(false)
      setReportEmail('')
    } catch {
      showToast('error', 'Não foi possível enviar o relatório por e-mail')
    } finally {
      setIsSendingReport(false)
    }
  }

  return (
    <div ref={root_ref} className="app-shell">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8 md:py-14">
        <button
          type="button"
          onClick={() => navigate('/reports')}
          className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para relatórios
        </button>

        {is_loading && (
          <div className="surface-panel py-12 text-center text-sm text-muted-foreground">
            Carregando dados da sessão...
          </div>
        )}

        {is_error && (
          <div className="surface-panel py-12 text-center text-sm text-destructive">
            Não foi possível carregar a sessão. Tente novamente.
          </div>
        )}

        {!is_loading && !is_error && data && (
          <>
            <section
              data-session="header"
              className="surface-panel mb-8 px-6 py-7 md:px-10 md:py-8"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <FileText className="h-9 w-9 text-primary" />
                    <h1 className="text-3xl text-foreground md:text-4xl">
                      {get_session_label(data.session)}
                    </h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {data.session.isActive ? (
                      <span className="inline-flex items-center rounded-full border border-success/40 bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                        Ativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-destructive/40 bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                        Finalizada
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/15 px-2.5 py-0.5 text-xs font-semibold capitalize text-primary">
                      {data.session.game}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-border bg-secondary/40 px-2.5 py-0.5 font-mono text-xs font-semibold text-foreground">
                      Código: {data.session.inviteCode}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <button
                    type="button"
                    onClick={() => setEmailPromptOpen((open) => !open)}
                    className="btn-secondary w-full md:w-auto"
                  >
                    <Mail className="h-4 w-4" />
                    Enviar por e-mail
                  </button>

                  <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={is_fetching}
                    className="btn-secondary w-full md:w-auto"
                  >
                    <RefreshCw className={`h-4 w-4 ${is_fetching ? 'animate-spin' : ''}`} />
                    Recarregar
                  </button>
                </div>
              </div>

              {email_prompt_open && (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    value={report_email}
                    onChange={(e) => setReportEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendSessionReport()}
                    placeholder="email@exemplo.com"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                  <button
                    type="button"
                    onClick={handleSendSessionReport}
                    disabled={is_sending_report}
                    className="btn-primary w-full sm:w-auto"
                  >
                    {is_sending_report ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                  <p className="heading-kicker mb-1">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      Participantes
                    </span>
                  </p>
                  <p className="text-3xl font-bold text-foreground">{data.players.length}</p>
                </div>
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                  <p className="heading-kicker mb-1">
                    <span className="inline-flex items-center gap-1.5">
                      <Swords className="h-3.5 w-3.5" />
                      Partidas
                    </span>
                  </p>
                  <p className="text-3xl font-bold text-foreground">{data.matches.length}</p>
                </div>
                <div className="surface-subtle p-4">
                  <p className="heading-kicker mb-1">Docente</p>
                  <p className="text-lg font-semibold text-foreground">
                    {data.session.createdBy?.name ?? '—'}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Criada em {format_datetime(data.session.created_at)}
                {data.session.finished_at && (
                  <> · Finalizada em {format_datetime(data.session.finished_at)}</>
                )}
              </p>
            </section>

            <section data-session="matches" className="surface-panel p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <Swords className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl text-foreground md:text-3xl">Partidas</h2>
                </div>
                <span className="rounded-full border border-primary/40 bg-primary/15 px-3.5 py-1.5 text-sm font-semibold text-primary">
                  {data.matches.length}{' '}
                  {data.matches.length === 1 ? 'partida' : 'partidas'}
                </span>
              </div>

              {data.matches.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Nenhuma partida registrada nesta sessão.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border/80">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-secondary/35 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Partida</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">RA</th>
                        {is_roulette ? (
                          <>
                            <th className="px-4 py-3 font-semibold">Jogador</th>
                            <th className="px-4 py-3 font-semibold">Jogadas</th>
                            <th className="px-4 py-3 font-semibold">Fichas</th>
                            <th className="px-4 py-3 font-semibold">Fim</th>
                          </>
                        ) : (
                          <>
                            <th className="px-4 py-3 font-semibold">Jogador 1</th>
                            <th className="px-4 py-3 font-semibold">Jogador 2</th>
                            <th className="px-4 py-3 font-semibold">Rodadas</th>
                            <th className="px-4 py-3 font-semibold">Placar</th>
                          </>
                        )}
                        <th className="px-4 py-3 text-right font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.matches.map((match, index) => {
                        const totals = compute_totals(match.moves)
                        const rounds_played = Object.keys(match.moves).length

                        return (
                          <tr
                            key={match.id}
                            className="border-t border-border/70 bg-card/35 transition-colors hover:bg-card/60"
                          >
                            <td className="px-4 py-3">
                              <p className="font-semibold text-foreground">Partida {index + 1}</p>
                              <p className="text-xs text-muted-foreground">
                                {format_date(match.created_at)}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                  (MATCH_STATUS[match.status] ?? MATCH_STATUS_FALLBACK).class_name
                                }`}
                              >
                                {(MATCH_STATUS[match.status] ?? MATCH_STATUS_FALLBACK).label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-foreground" />
                            {is_roulette ? (
                              <>
                                <td className="px-4 py-3 font-semibold text-foreground">Jogador</td>
                                <td className="px-4 py-3 text-foreground">
                                  {match.rouletteSummary?.totalRounds ?? rounds_played}
                                </td>
                                <td className="px-4 py-3 text-foreground">
                                  {match.rouletteSummary ? (
                                    <>
                                      <span className="text-lg font-bold">{match.rouletteSummary.finalCoins}</span>{' '}
                                      <span
                                        className={`text-xs font-semibold ${
                                          match.rouletteSummary.netResult >= 0 ? 'text-success' : 'text-destructive'
                                        }`}
                                      >
                                        ({match.rouletteSummary.netResult > 0 ? '+' : ''}
                                        {match.rouletteSummary.netResult})
                                      </span>
                                    </>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                  {match.rouletteSummary?.endedReasonLabel ?? '—'}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3 font-semibold text-foreground">Jogador 1</td>
                                <td className="px-4 py-3 font-semibold text-foreground">Jogador 2</td>
                                <td className="px-4 py-3 text-foreground">{rounds_played}</td>
                                <td className="px-4 py-3 text-lg font-bold text-foreground">
                                  {totals.player1} <span className="text-muted-foreground">x</span>{' '}
                                  {totals.player2}
                                </td>
                              </>
                            )}
                            <td className="px-4 py-3">
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleOpenMatch(match.id)}
                                  className="btn-primary px-3 py-2"
                                >
                                  Detalhes
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="mt-4 text-xs text-muted-foreground">
                Criada em {format_date(data.session.created_at)}
              </p>
            </section>
          </>
        )}
      </main>
      <Toast toast={toast} />
    </div>
  )
}
