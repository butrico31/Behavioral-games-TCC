import { useEffect } from "react"
import { MatchShell } from "../components/MatchShell"
import { RoundScreen } from "../components/RoundScreen"
import { ResultScreen } from "../components/ResultScreen"
import { useMatchRound } from "../hooks/useMatchRound"
import { SessionClockChip } from "../components/SessionClockChip"
import { Toast } from "../../../shared/components/Toast"

/** Partida em andamento: rodadas e resultado final. */
export function MatchPlayPage() {
  const match = useMatchRound()
  const playing = match.ready && match.phase !== "finished"

  // Fechar a aba encerra a partida para os dois: o navegador pede confirmação antes.
  useEffect(() => {
    if (!playing) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [playing])

  return (
    <MatchShell notice={<SessionClockChip sessionEndsAt={match.sessionEndsAt} />}>
      {match.ready &&
        (match.phase === "finished" ? (
          <ResultScreen
            youScore={match.youScore}
            oppScore={match.oppScore ?? 0}
            history={match.history}
            endedReason={match.endedReason}
            roundsPlayed={match.roundsPlayed}
            interruptedRound={match.interruptedRound}
            onNewSession={match.newSession}
          />
        ) : (
          <RoundScreen
            round={match.round}
            totalRounds={match.totalRounds}
            youScore={match.youScore}
            oppScore={match.oppScore}
            phase={match.phase}
            timeLeft={match.timeLeft}
            secondsPerRound={match.secondsPerRound}
            yourCard={match.yourCard}
            opponentCard={match.opponentCard}
            roundPoints={match.roundPoints}
            userViewPoints={match.userViewPoints}
            playedByTime={match.playedByTime}
            opponentAway={match.opponentAway}
            onPick={match.pick}
            onNext={match.next}
          />
        ))}
      <Toast toast={match.toast} />
    </MatchShell>
  )
}
