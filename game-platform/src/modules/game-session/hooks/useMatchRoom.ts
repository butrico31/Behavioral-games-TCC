import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getSocket } from "../services/matchSocket"
import { matchService } from "../services/matchService"
import { matchSession } from "../utils/match-session"
import { toPayoffTable, type MatchPhase, type MatchReadyData, type ReadyCheckData } from "../types"

/** Quanto tempo o aviso "Jogador 2 entrou na sala." fica na tela antes de abrir as regras. */
const FOUND_MS = 1900
const POLL_MS = 1500

/**
 * Sala de espera, regras e confirmação, conversando com o gateway /prisoner:
 * joinMatch → readyCheck (os dois conectados, tabela de pontos, quem já confirmou)
 * → playerReady → matchReady, que leva para /partida/:sessionId/jogar.
 */
export function useMatchRoom(sessionId: string) {
  const navigate = useNavigate()
  const [playerId] = useState(() => matchSession.getPlayerId())
  const [check, setCheck] = useState<ReadyCheckData | null>(null)
  const [found, setFound] = useState(false)
  const [readySent, setReadySent] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const readySentRef = useRef(false)

  useEffect(() => {
    if (!playerId) {
      navigate("/")
      return
    }

    const socket = getSocket()
    const lookupSessionId = sessionId || matchSession.getSessionId()
    let matchId = matchSession.getMatchId()
    let wasConnected = false
    let foundTimer: ReturnType<typeof setTimeout> | undefined

    const join = () => {
      if (matchId) socket.emit("joinMatch", { matchId, playerId, email: matchSession.getPlayerEmail() })
    }

    // Quem entra primeiro ainda não tem partida: procura até ela ser criada.
    const poll: ReturnType<typeof setInterval> | undefined = lookupSessionId
      ? setInterval(async () => {
          try {
            const matches = await matchService.getAwaitingMatches(lookupSessionId, playerId)
            const mine = matches.find((m) => m.player1_id === playerId || m.player2_id === playerId)
            if (!mine) return
            clearInterval(poll)
            if (mine.id === matchId) return
            matchId = mine.id
            matchSession.setMatchId(mine.id)
            if (socket.connected) join()
          } catch {
            // falha de rede: tenta de novo no próximo ciclo
          }
        }, POLL_MS)
      : undefined

    const onReadyCheck = (d: ReadyCheckData) => {
      clearInterval(poll)
      const both = d.connected.player1 && d.connected.player2
      if (both && !wasConnected) {
        setFound(true)
        clearTimeout(foundTimer)
        foundTimer = setTimeout(() => setFound(false), FOUND_MS)
      }
      wasConnected = both
      setCheck(d)

      // Confirmou antes de o outro entrar, ou o servidor perdeu a confirmação: reenvia.
      const confirmed = d.player1Id === playerId ? d.ready.player1 : d.ready.player2
      if (readySentRef.current && !confirmed) socket.emit("playerReady", { matchId: d.matchId, playerId })
    }

    const onMatchReady = (d: MatchReadyData) => {
      matchSession.setIsPlayer1(d.player1Id === playerId)
      matchSession.setMatchId(d.matchId ?? matchId)
      matchSession.setMatchReadyData({ ...d, receivedAt: Date.now() })
      navigate(`/partida/${sessionId}/jogar`)
    }

    // A partida já tinha terminado (ex.: página recarregada depois do fim): vai para o resultado.
    const onMatchFinished = (d: unknown) => {
      matchSession.setMatchResult(d)
      navigate(`/partida/${sessionId}/jogar`)
    }

    const onError = (d: { message?: string }) => console.error("[partida] erro do servidor:", d?.message ?? d)

    socket.on("connect", join)
    socket.on("readyCheck", onReadyCheck)
    socket.on("matchReady", onMatchReady)
    socket.on("matchFinished", onMatchFinished)
    socket.on("error", onError)
    if (socket.connected) join()
    else socket.connect()

    return () => {
      socket.off("connect", join)
      socket.off("readyCheck", onReadyCheck)
      socket.off("matchReady", onMatchReady)
      socket.off("matchFinished", onMatchFinished)
      socket.off("error", onError)
      clearInterval(poll)
      clearTimeout(foundTimer)
    }
  }, [navigate, playerId, sessionId])

  const isPlayer1 = check?.player1Id === playerId
  const bothConnected = !!check && check.connected.player1 && check.connected.player2
  const myReady = readySent || (!!check && (isPlayer1 ? check.ready.player1 : check.ready.player2))
  const opponentReady = !!check && (isPlayer1 ? check.ready.player2 : check.ready.player1)

  const phase: MatchPhase = reviewing
    ? "intro"
    : !bothConnected
      ? "searching"
      : found
        ? "found"
        : myReady
          ? "ready"
          : "intro"

  const readyMatchId = check?.matchId
  const confirmReady = useCallback(() => {
    setReviewing(false)
    if (readySentRef.current) return
    readySentRef.current = true
    setReadySent(true)
    // Sem readyCheck ainda (o outro jogador não entrou): o onReadyCheck envia quando ele chegar.
    if (readyMatchId) getSocket().emit("playerReady", { matchId: readyMatchId, playerId })
  }, [readyMatchId, playerId])

  const reviewRules = useCallback(() => setReviewing(true), [])

  return {
    phase,
    sessionEndsAt: check?.sessionEndsAt ?? null,
    payoff: check ? toPayoffTable(check.payoff) : undefined,
    opponentReady,
    confirmReady,
    reviewRules,
  }
}
