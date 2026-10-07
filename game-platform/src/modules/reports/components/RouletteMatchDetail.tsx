import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import { RouletteReportScreen } from '../../roulette/components/RouletteReportScreen'
import { useRouletteMatchReport } from '../hooks/useRouletteMatchReport'
import { PointsChart } from './PointsChart'
import { RouletteBetsChart } from './RouletteBetsChart'

interface RouletteMatchDetailProps {
  sessionId: string
  matchId: string
}

/**
 * Relatório do professor para a roleta, só no site (sem planilha): o registro de apostas no
 * formato do modelo, com as colunas de pesquisa a mais, e os gráficos, que ficam só aqui.
 */
export function RouletteMatchDetail({ sessionId, matchId }: RouletteMatchDetailProps) {
  const navigate = useNavigate()
  const { data: report, is_error } = useRouletteMatchReport(sessionId, matchId)
  const back = () => navigate(`/reports/${sessionId}`)

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
                <p className="heading-kicker mb-2">Valor na mesa, valor apostado e total por rodada</p>
                <RouletteBetsChart rounds={report.rounds} />
                <p className="mt-3 text-sm font-semibold text-foreground">{report.summary.reinforcementSummary}</p>
              </div>
              <div className="surface-subtle p-5 lg:col-span-2">
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
