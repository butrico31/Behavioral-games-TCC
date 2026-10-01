import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { disconnectSocket, getSocket } from "../services/matchSocket"
import { matchSession } from "../utils/match-session"
import { sendMatchResultByEmail } from "../../reports/services/mailReportService"
import { useToast } from "../../../shared/hooks/useToast"
import { MATCH_SESSION_STORAGE_KEYS } from "../../../shared/constants/storageKeys"
import {
  CARD_CHOICE,
  cardForChoice,
  type Card,
  type MatchReadyData,
  type MatchResult,
  type RoundPointsView,
  type ReadyCheckData,
  type RoundMoves,
  type RoundMovesView,
  type RoundPhase,
  type RoundRecord,
  type RoundResultData,
  type RoundStartData,
  type MatchEndedReason,
} from "../types"

/**
 * Quanto tempo a revelação fica na tela antes de avançar sozinha. O servidor só começa a
 * contar a rodada seguinte depois de 4 s (REVEAL_GRACE_MS), então isso não tira tempo de
 * escolha; o botão "PRÓXIMA RODADA" só adianta.
 */
const REVEAL_MS = 3000

type ServerEvent =
  | { type: "matchReady"; data: MatchReadyData; isPlayer1: boolean }
  | { type: "roundStart"; data: RoundStartData }
  | { type: "roundTimeout"; round: number }
  | { type: "roundResult"; data: RoundResultData }
  | { type: "matchFinished"; data: MatchResult }
  | { type: "playerDisconnected" }

type View = {
  isPlayer1: boolean
  round: number
  /** 0 até chegarem os dados da partida. */
  totalRounds: number
  phase: RoundPhase | "finished"
  /** 0 quando a sessão não tem tempo por rodada. */
  secondsPerRound: number
  /** Fim da rodada no relógio do servidor (ms); null sem cronômetro correndo. */
  deadline: number | null
  /** Relógio do servidor menos o relógio local. */
  clockOffset: number
  youScore: number
  /** null quando a sessão esconde os pontos do outro jogador. */
  oppScore: number | null
  /** Configuração da sessão: false esconde a pontuação do oponente durante a partida. */
  userViewPoints: boolean
  yourCard: Card | null
  opponentCard: Card | null
  roundPoints: RoundPointsView | null
  playedByTime: boolean
  history: RoundRecord[]
  /** Fim da sessão (epoch ms); null quando a sessão não tem tempo. */
  sessionEndsAt: number | null
  endedReason: MatchEndedReason
  /** Rodadas que fecharam com pontos (pode ser menos que o total, se o tempo acabou). */
  roundsPlayed: number
  interruptedRound: number | null
  lastResultRound: number
  opponentAway: boolean
}

type State = {
  view: View
  /** Eventos que chegaram durante a revelação; são aplicados quando ela termina. */
  queue: ServerEvent[]
  /** A revelação já terminou, mas o evento seguinte ainda não tinha chegado. */
  advancePending: boolean
}

type Action = { type: "server"; event: ServerEvent } | { type: "advance" } | { type: "pick"; card: Card }

const EMPTY_VIEW: View = {
  isPlayer1: false,
  round: 1,
  totalRounds: 0,
  phase: "choose",
  secondsPerRound: 0,
  deadline: null,
  clockOffset: 0,
  youScore: 0,
  oppScore: 0,
  userViewPoints: true,
  yourCard: null,
  opponentCard: null,
  roundPoints: null,
  playedByTime: false,
  history: [],
  sessionEndsAt: null,
  endedReason: 'rodadas',
  roundsPlayed: 0,
  interruptedRound: null,
  lastResultRound: 0,
  opponentAway: false,
}

function clockOffsetOf(d: { serverNow?: number; receivedAt?: number }, fallback: number) {
  return d.serverNow && d.receivedAt ? d.serverNow - d.receivedAt : fallback
}

/** Traduz uma rodada do servidor (player1/player2) para o ponto de vista deste jogador. */
function toRecord(isPlayer1: boolean, round: number, m: RoundMoves | RoundMovesView): RoundRecord {
  return {
    round,
    yourCard: cardForChoice(isPlayer1 ? m.player1Choice : m.player2Choice),
    opponentCard: cardForChoice(isPlayer1 ? m.player2Choice : m.player1Choice),
    points: isPlayer1
      ? [m.player1Points ?? 0, m.player2Points]
      : [m.player2Points ?? 0, m.player1Points],
    byTime: !!(isPlayer1 ? m.player1TimedOut : m.player2TimedOut),
  }
}

function applyEvent(v: View, e: ServerEvent): View {
  if (v.phase === "finished") return v

  switch (e.type) {
    case "matchReady": {
      const d = e.data
      const mine = e.isPlayer1 ? "player1" : "player2"
      const theirs = e.isPlayer1 ? "player2" : "player1"
      const pending = !!d.pendingChoices?.[mine]
      return {
        ...v,
        isPlayer1: e.isPlayer1,
        round: d.currentRound,
        totalRounds: d.totalRounds,
        phase: pending ? "waiting" : "choose",
        secondsPerRound: d.roundTimeLimit ?? 0,
        userViewPoints: d.userViewPoints ?? v.userViewPoints,
        sessionEndsAt: d.sessionEndsAt ?? v.sessionEndsAt,
        deadline: d.roundEndsAt ?? null,
        clockOffset: clockOffsetOf(d, v.clockOffset),
        youScore: d.totalPoints?.[mine] ?? v.youScore,
        oppScore: d.totalPoints ? d.totalPoints[theirs] : v.oppScore,
        yourCard: pending && d.currentRound === v.round ? v.yourCard : null,
        opponentCard: null,
        roundPoints: null,
        playedByTime: false,
        lastResultRound: d.currentRound - 1,
        opponentAway: false,
      }
    }

    case "roundStart": {
      const d = e.data
      const newRound = d.round !== v.round
      return {
        ...v,
        round: d.round,
        totalRounds: d.totalRounds || v.totalRounds,
        deadline: d.roundEndsAt ?? null,
        clockOffset: clockOffsetOf(d, v.clockOffset),
        sessionEndsAt: d.sessionEndsAt ?? v.sessionEndsAt,
        opponentAway: false,
        ...(newRound
          ? { phase: "choose" as const, yourCard: null, opponentCard: null, roundPoints: null, playedByTime: false }
          : {}),
      }
    }

    case "roundTimeout":
      if (e.round !== v.round) return v
      return v.phase === "choose"
        ? { ...v, phase: "waiting", playedByTime: true, deadline: null }
        : { ...v, deadline: null }

    case "roundResult": {
      const d = e.data
      if (d.round <= v.lastResultRound) return v
      const record = toRecord(v.isPlayer1, d.round, d.result)
      const mine = v.isPlayer1 ? "player1" : "player2"
      const theirs = v.isPlayer1 ? "player2" : "player1"
      return {
        ...v,
        round: d.round,
        phase: "reveal",
        deadline: null,
        yourCard: record.yourCard,
        opponentCard: record.opponentCard,
        roundPoints: record.points,
        playedByTime: !!record.byTime,
        youScore: d.totalPoints[mine] ?? (v.youScore + record.points[0]),
        oppScore: d.totalPoints[theirs],
        history: v.history.filter((h) => h.round !== d.round).concat(record),
        lastResultRound: d.round,
      }
    }

    case "matchFinished": {
      const d = e.data
      return {
        ...v,
        phase: "finished",
        deadline: null,
        totalRounds: v.totalRounds || Object.keys(d.moves).length,
        youScore: v.isPlayer1 ? d.finalScore.player1 : d.finalScore.player2,
        oppScore: v.isPlayer1 ? d.finalScore.player2 : d.finalScore.player1,
        history: Object.entries(d.moves)
          .map(([round, m]) => toRecord(v.isPlayer1, Number(round), m))
          .sort((a, b) => a.round - b.round),
        endedReason: d.endedReason ?? 'rodadas',
        roundsPlayed: d.roundsPlayed ?? Object.keys(d.moves).length,
        interruptedRound: d.interruptedRound ?? null,
        opponentAway: false,
      }
    }

    case "playerDisconnected":
      // O servidor pausa o cronômetro até o outro voltar (ele volta com matchReady + roundStart).
      return { ...v, opponentAway: true, deadline: null }
  }
}

/** Sai da revelação atual aplicando a fila, até a próxima revelação (que espera de novo) ou o fim da fila. */
function advance(state: State): State {
  const shown = state.view.lastResultRound
  let view = state.view
  let applied = 0
  for (const event of state.queue) {
    view = applyEvent(view, event)
    applied++
    if (view.phase === "reveal" && view.lastResultRound !== shown) break
  }
  const stillShowing = view.phase === "reveal" && view.lastResultRound === shown
  return { view, queue: state.queue.slice(applied), advancePending: stillShowing }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "server": {
      if (state.view.phase !== "reveal") return { ...state, view: applyEvent(state.view, action.event) }
      const queued = { ...state, queue: state.queue.concat(action.event) }
      return state.advancePending ? advance(queued) : queued
    }
    case "advance":
      return state.view.phase === "reveal" ? advance(state) : state
    case "pick":
      return state.view.phase === "choose"
        ? { ...state, view: { ...state.view, phase: "waiting", yourCard: action.card } }
        : state
  }
}

/** Retoma o que a sala de espera deixou guardado (ou o resultado, se a partida já acabou). */
function initState(playerId: string): State {
  const matchId = matchSession.getMatchId()
  let view: View = { ...EMPTY_VIEW, isPlayer1: matchSession.getIsPlayer1() }

  const ready = matchSession.getMatchReadyData()
  if (ready && (!ready.matchId || ready.matchId === matchId)) {
    view = applyEvent(view, { type: "matchReady", data: ready, isPlayer1: ready.player1Id === playerId })
  }
  const result = matchSession.getMatchResult()
  if (result && result.matchId === matchId) {
    view = applyEvent(view, { type: "matchFinished", data: result })
  }
  return { view, queue: [], advancePending: false }
}

/**
 * Rodadas e resultado, conversando com o gateway /prisoner. O servidor é a fonte da verdade:
 * rodada atual, prazo, jogada automática por tempo esgotado e pontuação.
 */
export function useMatchRound() {
  const navigate = useNavigate()
  const [{ playerId, matchId }] = useState(() => ({
    playerId: matchSession.getPlayerId(),
    matchId: matchSession.getMatchId(),
  }))
  const [state, dispatch] = useReducer(reducer, playerId, initState)
  const [now, setNow] = useState(0)
  const stateRef = useRef(state)
  const { view } = state
  const { toast, showToast } = useToast()
  const email_sent_ref = useRef(false)

  useEffect(() => {
    stateRef.current = state
  })

  useEffect(() => {
    if (!playerId || !matchId) {
      navigate("/")
      return
    }

    const socket = getSocket()
    const send = (event: ServerEvent) => dispatch({ type: "server", event })
    const arrived = <T extends object>(d: T) => ({ ...d, receivedAt: Date.now() })

    // Recarregou a página: reentra na partida e o servidor responde com matchReady ou matchFinished.
    const join = () => socket.emit("joinMatch", { matchId, playerId })

    const onMatchReady = (d: MatchReadyData) => {
      const data = arrived(d)
      const isPlayer1 = d.player1Id === playerId
      matchSession.setIsPlayer1(isPlayer1)
      matchSession.setMatchReadyData(data)
      send({ type: "matchReady", data, isPlayer1 })
    }
    const onRoundStart = (d: RoundStartData) => send({ type: "roundStart", data: arrived(d) })
    const onRoundTimeout = (d: { round: number }) => send({ type: "roundTimeout", round: d.round })
    const onRoundResult = (d: RoundResultData) => send({ type: "roundResult", data: d })
    const onMatchFinished = (d: MatchResult) => {
      matchSession.setMatchResult(d)
      send({ type: "matchFinished", data: d })

      if (!email_sent_ref.current) {
        const player_email = sessionStorage.getItem(MATCH_SESSION_STORAGE_KEYS.playerEmail)
        const session_id = matchSession.getSessionId()

        if (player_email && session_id) {
          email_sent_ref.current = true
          sendMatchResultByEmail(session_id, matchId, player_email)
            .then(() => showToast('success', 'Resultado enviado para seu e-mail'))
            .catch(() => showToast('error', 'Não foi possível enviar o resultado por e-mail'))
            .finally(() => sessionStorage.removeItem(MATCH_SESSION_STORAGE_KEYS.playerEmail))
        }
      }
    }
    const onPlayerDisconnected = () => send({ type: "playerDisconnected" })

    // As regras já foram confirmadas na sala de espera; se o servidor pedir de novo (ex.: reiniciou), confirma sozinho.
    const onReadyCheck = (d: ReadyCheckData) => {
      const confirmed = d.player1Id === playerId ? d.ready.player1 : d.ready.player2
      if (!confirmed) socket.emit("playerReady", { matchId, playerId })
    }
    const onError = (d: { message?: string }) => console.error("[partida] erro do servidor:", d?.message ?? d)

    socket.on("connect", join)
    socket.on("matchReady", onMatchReady)
    socket.on("roundStart", onRoundStart)
    socket.on("roundTimeout", onRoundTimeout)
    socket.on("roundResult", onRoundResult)
    socket.on("matchFinished", onMatchFinished)
    socket.on("playerDisconnected", onPlayerDisconnected)
    socket.on("readyCheck", onReadyCheck)
    socket.on("error", onError)
    if (!socket.connected) socket.connect()
    else if (!matchSession.getMatchReadyData()) join()

    return () => {
      socket.off("connect", join)
      socket.off("matchReady", onMatchReady)
      socket.off("roundStart", onRoundStart)
      socket.off("roundTimeout", onRoundTimeout)
      socket.off("roundResult", onRoundResult)
      socket.off("matchFinished", onMatchFinished)
      socket.off("playerDisconnected", onPlayerDisconnected)
      socket.off("readyCheck", onReadyCheck)
      socket.off("error", onError)
    }
  }, [matchId, navigate, playerId, showToast])

  const ticking = view.phase === "choose" && view.deadline !== null
  useEffect(() => {
    if (!ticking) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [ticking])

  useEffect(() => {
    if (view.phase !== "reveal") return
    const id = setTimeout(() => dispatch({ type: "advance" }), REVEAL_MS)
    return () => clearTimeout(id)
  }, [view.phase, view.lastResultRound])

  // O prazo do servidor inclui a folga da revelação; na tela, o tempo nunca passa do limite da rodada.
  const timeLeft =
    view.phase === "choose" && view.deadline !== null && view.secondsPerRound > 0
      ? Math.min(view.secondsPerRound, Math.max(0, Math.ceil((view.deadline - now - view.clockOffset) / 1000)))
      : null

  const pick = useCallback(
    (card: Card) => {
      const current = stateRef.current.view
      if (current.phase !== "choose" || current.totalRounds === 0) return
      // `round` faz o servidor recusar um clique atrasado em vez de contá-lo na rodada seguinte.
      getSocket().emit("submitChoice", { matchId, playerId, choice: CARD_CHOICE[card], round: current.round })
      dispatch({ type: "pick", card })
    },
    [matchId, playerId],
  )

  const next = useCallback(() => dispatch({ type: "advance" }), [])

  const newSession = useCallback(() => {
    disconnectSocket()
    matchSession.clear()
    navigate("/")
  }, [navigate])

  return {
    ready: view.totalRounds > 0 || view.phase === "finished",
    round: view.round,
    totalRounds: view.totalRounds,
    phase: view.phase,
    timeLeft,
    secondsPerRound: view.secondsPerRound,
    youScore: view.youScore,
    oppScore: view.oppScore,
    userViewPoints: view.userViewPoints,
    yourCard: view.yourCard,
    opponentCard: view.opponentCard,
    roundPoints: view.roundPoints,
    playedByTime: view.playedByTime,
    history: view.history,
    sessionEndsAt: view.sessionEndsAt,
    endedReason: view.endedReason,
    roundsPlayed: view.roundsPlayed,
    interruptedRound: view.interruptedRound,
    opponentAway: view.opponentAway,
    toast,
    pick,
    next,
    newSession,
  }
}
