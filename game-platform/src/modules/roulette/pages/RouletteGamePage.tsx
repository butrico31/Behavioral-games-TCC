import { Suspense, lazy, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FitToScreen, MatchShell } from '../../game-session/components/MatchShell'
import { MATCH_SESSION_STORAGE_KEYS } from '../../../shared/constants/storageKeys'
import { RoundPopupModal } from '../components/RoundPopupModal'
import { RouletteFinalScreen } from '../components/RouletteFinalScreen'
import { RouletteHowToPlayScreen } from '../components/RouletteHowToPlayScreen'
import { toTableLayout, type TableLayoutId } from '../config/tableLayouts'
import { useRouletteMatch } from '../hooks/useRouletteMatch'
import { TableOne } from '../tables/mesa1/TableOne'
import type { RouletteTableProps } from '../tables/types'
import type { ComponentType } from 'react'

// A mesa 2 traz o Phaser: só é baixada quando a sessão usa essa mesa.
const TableTwo = lazy(() => import('../tables/mesa2/TableTwo').then((m) => ({ default: m.TableTwo })))

const TABLES: Record<TableLayoutId, ComponentType<RouletteTableProps>> = {
  mesa1: TableOne,
  mesa2: TableTwo,
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
  const [tutorialDismissed, setTutorialDismissed] = useState(false)
  // O backend manda o relatório sozinho no fim (se houver e-mail); a tela final só avisa.
  const [email] = useState(() => sessionStorage.getItem(MATCH_SESSION_STORAGE_KEYS.playerEmail)?.trim() || null)

  // Mostra o tutorial só na 1ª entrada: se a partida já tem rodadas (recarregou a página) ou já
  // acabou, `view.round`/`status` já chegam refletindo isso, sem precisar de efeito.
  const needsTutorial = view !== null && !tutorialDismissed && view.round === 0 && view.status !== 'finished'

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

  if (needsTutorial) {
    return (
      <MatchShell>
        <RouletteHowToPlayScreen view={view} onReady={() => setTutorialDismissed(true)} />
      </MatchShell>
    )
  }

  // Espera a animação do último giro (busy) antes de trocar a mesa pela tela final.
  if (view.status === 'finished' && !match.busy) {
    return (
      <MatchShell>
        <RouletteFinalScreen view={view} email={email} onExit={() => navigate('/', { replace: true })} />
      </MatchShell>
    )
  }

  const Table = TABLES[toTableLayout(view.tableLayout)]
  const finished = view.status === 'finished'

  return (
    <div className="app-shell flex h-dvh w-screen flex-col overflow-hidden">
      <main className="min-h-0 flex-1">
      <Suspense fallback={<p className="p-8 text-center text-sm text-muted-foreground">Preparando mesa de roleta...</p>}>
      <FitToScreen>
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
      </FitToScreen>
      </Suspense>
      </main>

      {match.popup && !finished && (
        <RoundPopupModal round={match.popup.round} message={match.popup.message} onClose={match.closePopup} />
      )}

    </div>
  )
}
