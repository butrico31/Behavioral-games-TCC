import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import { RouletteReportScreen } from '../../roulette/components/RouletteReportScreen'
import { useRouletteMatchReport } from '../hooks/useRouletteMatchReport'
import { MatchEmailSender } from './MatchEmailSender'
import { PointsChart } from './PointsChart'

interface RouletteMatchDetailProps {
  sessionId: string
  matchId: string
}

/**
 * "Detalhes da Partida" do professor para a roleta: o mesmo relatório que o jogador vê no fim
 * (números vindos do backend), mais os gráficos, que ficam só aqui.
 */
export function RouletteMatchDetail({ sessionId, matchId }: RouletteMatchDetailProps) {
  const navigate = useNavigate()
  const { data: report, is_error } = useRouletteMatchReport(sessionId, matchId)
  const back = () => navigate(`/reports/${sessionId}`)

  const coins = report
    ? [
        { round: 0, points: report.summary.initMoney },
        ...report.rounds.map((r) => ({ round: r.round, points: r.coinsAfter }))
      ]
    : []
  const bets = report ? report.rounds.map((r) => ({ round: r.round, points: r.aposta })) : []
  const times = report
    ? report.rounds
        .filter((r) => r.secondsSinceLast !== null)
        .map((r) => ({ round: r.round, points: r.secondsSinceLast as number }))
    : []

  return (
    <>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 md:pt-10">
        <button
          type="button"
          onClick={back}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para partidas
        </button>
        <MatchEmailSender sessionId={sessionId} matchId={matchId} />
      </div>

      <RouletteReportScreen
        report={report}
        error={is_error ? 'Não foi possível carregar a partida. Tente novamente.' : null}
        onBack={back}
        backLabel="Voltar para partidas"
        showEmailStatus={false}
      >
        {report && (
          <section className="surface-panel mb-6 p-6 md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h2 className="text-2xl text-foreground md:text-3xl">Gráficos</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="surface-subtle p-5 lg:col-span-2">
                <p className="heading-kicker mb-2">Fichas versus Jogadas</p>
                <PointsChart data={coins} valueLabel="Fichas" roundLabel="Jogadas" />
              </div>
              <div className="surface-subtle p-5">
                <p className="heading-kicker mb-2">Aposta por jogada</p>
                <PointsChart data={bets} valueLabel="Aposta" roundLabel="Jogadas" />
              </div>
              <div className="surface-subtle p-5">
                <p className="heading-kicker mb-2">Tempo desde a última jogada (s)</p>
                <PointsChart data={times} valueLabel="Segundos" roundLabel="Jogadas" />
              </div>
            </div>
          </section>
        )}
      </RouletteReportScreen>
    </>
  )
}
