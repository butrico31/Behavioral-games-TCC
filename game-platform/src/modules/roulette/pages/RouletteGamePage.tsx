import { Suspense, lazy, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { RoundPopupModal } from '../components/RoundPopupModal'
import { toTableLayout, type TableLayoutId } from '../config/tableLayouts'
import { useRouletteMatch } from '../hooks/useRouletteMatch'
import { TableOne } from '../tables/mesa1/TableOne'
import type { RouletteTableProps } from '../tables/types'
import type { RouletteEndedReason } from '../types/roulette'
import type { ComponentType } from 'react'

// A mesa 2 traz o Phaser: só é baixada quando a sessão usa essa mesa.
const TableTwo = lazy(() => import('../tables/mesa2/TableTwo').then((m) => ({ default: m.TableTwo })))

const TABLES: Record<TableLayoutId, ComponentType<RouletteTableProps>> = {
  mesa1: TableOne,
  mesa2: TableTwo,
}

const ENDED_COPY: Record<RouletteEndedReason, { kicker: string; title: string; text: string; tone: string }> = {
  meta: {
    kicker: 'Meta alcançada',
    title: 'Meta alcançada!',
    text: 'A sessão terminou com a meta de fichas atingida.',
    tone: 'text-success',
  },
  saldo: {
    kicker: 'Sessão encerrada',
    title: 'Saldo zerado',
    text: 'As fichas acabaram antes da meta ser atingida.',
    tone: 'text-destructive',
  },
  tempo: {
    kicker: 'Tempo encerrado',
    title: 'Ensaio finalizado',
    text: 'O tempo limite da sessão foi atingido.',
    tone: 'text-foreground',
  },
  jogador: {
    kicker: 'Sessão encerrada',
    title: 'Ensaio finalizado',
    text: 'A sessão foi encerrada.',
    tone: 'text-foreground',
  },
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell flex h-dvh w-full flex-col overflow-hidden">
      <main className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 text-center sm:px-8">
        {children}
      </main>
    </div>
  )
}

export function RouletteGamePage() {
  const location = useLocation()
  const navigate = useNavigate()

  const search_params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const matchId =
    search_params.get('matchId') || sessionStorage.getItem('matchId') || localStorage.getItem('matchId') || ''
  const playerId =
    search_params.get('playerId') || sessionStorage.getItem('playerId') || localStorage.getItem('playerId') || ''

  const match = useRouletteMatch(matchId, playerId)
  const { view } = match

  if (!matchId || !playerId) {
    const missing = [!matchId ? 'matchId' : null, !playerId ? 'playerId' : null].filter(Boolean).join(', ')
    return (
      <Centered>
        <div className="surface-panel w-full p-6 sm:p-10">
          <h1 className="mb-4 text-3xl text-foreground">Parâmetros ausentes</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Não foi possível iniciar a sessão da roleta porque faltam:{' '}
            <strong className="text-foreground">{missing}</strong>.
          </p>
          <p className="mt-3 font-data text-xs text-muted-foreground">Exemplo: /roulette/game?matchId=...&playerId=...</p>
        </div>
      </Centered>
    )
  }

  if (match.loadError) {
    return (
      <Centered>
        <div className="surface-panel w-full p-6 sm:p-10">
          <h1 className="mb-4 text-3xl text-foreground">Não foi possível iniciar o ensaio</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{match.loadError}</p>
        </div>
      </Centered>
    )
  }

  if (!view) {
    return (
      <Centered>
        <p className="text-sm text-muted-foreground">Preparando mesa de roleta...</p>
      </Centered>
    )
  }

  const Table = TABLES[toTableLayout(view.tableLayout)]
  const finished = view.status === 'finished'
  const ended = ENDED_COPY[view.endedReason ?? 'jogador']

  return (
    <div className="app-shell min-h-dvh w-full">
      <Suspense fallback={<p className="p-8 text-center text-sm text-muted-foreground">Preparando mesa de roleta...</p>}>
      <Table
        view={view}
        busy={match.busy}
        locked={match.popup !== null}
        lastSpin={match.lastSpin}
        actionError={match.actionError}
        remainingSeconds={match.remainingSeconds}
        elapsedSeconds={match.elapsedSeconds}
        onSpin={match.spin}
        onFinish={() => void match.finish()}
      />
      </Suspense>

      {match.popup && !finished && (
        <RoundPopupModal round={match.popup.round} message={match.popup.message} onClose={match.closePopup} />
      )}

      {finished && !match.busy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
          <div className="surface-panel max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto p-6 text-center sm:p-8">
            <p className="heading-kicker mb-3">{ended.kicker}</p>
            <h2 className={`mb-3 text-3xl ${ended.tone}`}>{ended.title}</h2>
            <p className="mb-6 text-sm text-muted-foreground">{ended.text}</p>
            <div className="surface-subtle mb-6 grid grid-cols-2 gap-4 p-5 text-left">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Fichas finais</p>
                <p className="font-display text-2xl text-foreground">{view.coins}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Meta</p>
                <p className="font-display text-2xl text-foreground">{view.pointsLimit}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Rodadas</p>
                <p className="font-display text-2xl text-foreground">{view.round}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Match</p>
                <p className="break-all font-data text-xs text-muted-foreground">{view.matchId}</p>
              </div>
            </div>
            <button type="button" onClick={() => navigate('/sessions')} className="btn-primary w-full">
              Voltar às sessões
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
