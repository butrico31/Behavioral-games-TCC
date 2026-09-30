import { useParams } from "react-router-dom"
import { MatchShell } from "../components/MatchShell"
import { WaitingRoomScreen } from "../components/WaitingRoomScreen"
import { HowToPlayScreen } from "../components/HowToPlayScreen"
import { ReadyScreen } from "../components/ReadyScreen"
import { useMatchRoom } from "../hooks/useMatchRoom"
import { SessionClockChip } from "../components/SessionClockChip"

/** Orquestra as três telas antes da partida: espera → regras → confirmação. */
export function MatchLobbyPage() {
  const { sessionId = "" } = useParams()
  const room = useMatchRoom(sessionId)

  return (
    <MatchShell notice={<SessionClockChip sessionEndsAt={room.sessionEndsAt} />}>
      {(room.phase === "searching" || room.phase === "found") && (
        <WaitingRoomScreen opponentJoined={room.phase === "found"} onReviewRules={room.reviewRules} />
      )}

      {room.phase === "intro" && (
        <HowToPlayScreen payoff={room.payoff} onReady={room.confirmReady} />
      )}

      {/* O servidor começa a partida assim que os dois confirmam; o hook leva para /jogar. */}
      {room.phase === "ready" && (
        <ReadyScreen opponentReady={room.opponentReady} countdown={null} onReviewRules={room.reviewRules} />
      )}
    </MatchShell>
  )
}
