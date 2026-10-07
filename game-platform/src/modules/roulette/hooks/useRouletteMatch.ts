import { useCallback, useEffect, useRef, useState } from 'react'
import { MATCH_SESSION_STORAGE_KEYS } from '../../../shared/constants/storageKeys'
import {
  RouletteApiError,
  ackRoulettePopup,
  finishRouletteMatch,
  getRouletteMatchState,
  joinRouletteMatch,
  spinRouletteMatch,
  startRouletteMatch,
} from '../api/rouletteClient'
import type {
  RouletteMatchView,
  RouletteMoveOption,
  RouletteSpinResponse,
} from '../types/roulette'

/**
 * Recebe a requisição já disparada e devolve o resultado quando a animação terminar. Cada mesa
 * anima do seu jeito: a mesa 2 lança a bola antes da resposta chegar, a mesa 1 espera e gira.
 */
export type PresentSpin = (pending: Promise<RouletteSpinResponse>) => Promise<RouletteSpinResponse>

export interface RoundPopupState {
  round: number
  message: string
}

export interface RefillNoticeState {
  /** Fichas depois da reposição. */
  coins: number
  /** Reposições já usadas, contando esta. */
  used: number
  max: number
}

const errorMessage =(error: unknown, fallback: string) =>
  error instanceof RouletteApiError ? error.message : fallback

/**
 * Partida da roleta conversando com /roulette/matches. O servidor é a fonte da verdade: casa
 * sorteada, saldo, rodada, aposta máxima, meta, prazo e motivo do fim. Aqui só se guarda o que
 * ele responde e se marca o relógio para exibição.
 */
export function useRouletteMatch(matchId: string, playerId: string) {
  const [view, setView] = useState<RouletteMatchView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [lastSpin, setLastSpin] = useState<RouletteSpinResponse | null>(null)
  const [popup, setPopup] = useState<RoundPopupState | null>(null)
  /** Aviso de que as fichas zeraram e foram repostas; abre depois da animação do giro. */
  const [refill, setRefill] = useState<RefillNoticeState | null>(null)
  const [now, setNow] = useState(() => Date.now())
  /** Relógio do servidor menos o local, medido na chegada do estado. */
  const [clockOffset, setClockOffset] = useState(0)
  const finishingRef = useRef(false)

  const applyView = useCallback((next: RouletteMatchView) => {
    setClockOffset(next.serverNow - Date.now())
    setView(next)
  }, [])

  useEffect(() => {
    if (!matchId || !playerId) return
    let cancelled = false

    // O e-mail digitado na entrada vai para o servidor, que manda o relatório quando a partida
    // terminar (fica só em memória lá, como no envio do Prisioneiro).
    let email: string | undefined
    try {
      email = sessionStorage.getItem(MATCH_SESSION_STORAGE_KEYS.playerEmail)?.trim() || undefined
    } catch {
      email = undefined
    }

    joinRouletteMatch(matchId, playerId, email)
      .then((joined) => {
        if (cancelled) return
        applyView(joined)
        if (joined.status === 'in_progress' && joined.popup) {
          setPopup({ round: joined.round + 1, message: joined.popup })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(errorMessage(error, 'Não foi possível inicializar a partida.'))
      })

    return () => {
      cancelled = true
    }
  }, [matchId, playerId, applyView])

  const inProgress = view?.status === 'in_progress'

  useEffect(() => {
    if (!inProgress) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [inProgress])

  const serverNow = now + clockOffset
  const remainingSeconds =
    view?.endsAt != null ? Math.max(0, Math.ceil((view.endsAt - serverNow) / 1000)) : null
  const elapsedSeconds = view ? Math.max(0, Math.floor((serverNow - view.startedAt) / 1000)) : 0

  // Saída das instruções: o relógio do servidor só começa aqui (antes, status 'waiting').
  const [starting, setStarting] = useState(false)
  const startingRef = useRef(false)
  const start = useCallback(async () => {
    if (!view || view.status !== 'waiting' || startingRef.current) return
    startingRef.current = true
    setStarting(true)
    setActionError(null)
    try {
      const started = await startRouletteMatch(view.matchId, playerId)
      applyView(started)
      if (started.status === 'in_progress' && started.popup) {
        setPopup({ round: started.round + 1, message: started.popup })
      }
    } catch (error) {
      setActionError(errorMessage(error, 'Não foi possível iniciar a partida.'))
    } finally {
      startingRef.current = false
      setStarting(false)
    }
  }, [view, playerId, applyView])

  const finish = useCallback(async () => {
    if (!view || finishingRef.current) return
    finishingRef.current = true
    try {
      applyView(await finishRouletteMatch(view.matchId))
      setPopup(null)
    } catch (error) {
      setActionError(errorMessage(error, 'Erro ao encerrar a partida no servidor.'))
      finishingRef.current = false
    }
  }, [view, applyView])

  // Prazo esgotado: avisa o servidor, que confere o horário e grava o motivo. Se um giro estiver
  // em andamento, espera ele terminar (o efeito roda de novo quando `busy` volta a false).
  useEffect(() => {
    if (inProgress && remainingSeconds === 0 && !busy) void finish()
  }, [inProgress, remainingSeconds, busy, finish])

  const spin = useCallback(
    async (opcao: RouletteMoveOption, aposta: number, present: PresentSpin) => {
      if (!view || busy || !inProgress || popup || refill) return null
      setBusy(true)
      setActionError(null)
      // A aposta sai do saldo na hora do clique; o prêmio (aposta + lucro) só entra depois que a
      // roleta para. É só exibição: o saldo de verdade é o que o servidor devolve no fim.
      const coinsBefore = view.coins
      setView((current) => (current ? { ...current, coins: current.coins - aposta } : current))
      try {
        const result = await present(spinRouletteMatch(view.matchId, { playerId, opcao, aposta }))
        setLastSpin(result)
        setView((current) =>
          current
            ? {
                ...current,
                coins: result.coinsAmount,
                round: result.round,
                pityStreak: result.pityStreak,
                maxMagnitude: result.maxMagnitude,
                status: result.matchFinished ? 'finished' : current.status,
                endedReason: result.endedReason ?? current.endedReason,
                refillsUsed: result.refillsUsed,
                allowGiveUp: result.allowGiveUp,
              }
            : current
        )
        if (result.refilled && !result.matchFinished) {
          setRefill({ coins: result.coinsAmount, used: result.refillsUsed, max: view.maxRefills })
        }
        if (result.nextPopup) setPopup({ round: result.round + 1, message: result.nextPopup })
        return result
      } catch (error) {
        setActionError(errorMessage(error, 'Falha ao girar a roleta.'))
        // O giro não valeu: devolve a aposta descontada no clique.
        setView((current) => (current ? { ...current, coins: coinsBefore } : current))
        // O servidor pode ter encerrado a partida (ex.: prazo): busca o estado atual.
        getRouletteMatchState(view.matchId)
          .then(applyView)
          .catch(() => undefined)
        return null
      } finally {
        setBusy(false)
      }
    },
    [view, busy, inProgress, popup, refill, playerId, applyView]
  )

  const closeRefill = useCallback(() => setRefill(null), [])

  // Fechar o popup avisa o servidor, que mede o tempo de leitura para o relatório. Falha aqui não
  // trava o jogo: a jogada só fica sem o tempo de leitura.
  const closePopup = useCallback(() => {
    if (popup) void ackRoulettePopup(matchId, playerId, popup.round).catch(() => undefined)
    setPopup(null)
  }, [popup, matchId, playerId])

  return {
    view,
    loadError,
    actionError,
    busy,
    lastSpin,
    popup,
    refill,
    closeRefill,
    remainingSeconds,
    elapsedSeconds,
    starting,
    start,
    spin,
    finish,
    closePopup,
  }
}
