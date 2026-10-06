/**
 * Contrato com o backend (/roulette/matches). O front não calcula resultado, saldo, chance,
 * rodada nem fim de partida: tudo vem do servidor, e a tela só desenha e anima.
 */

export type RouletteMoveOption = 'azul' | 'vermelho' | 'preto'

export type RouletteMatchStatus = 'in_progress' | 'finished'

/** 'meta' = atingiu a meta, 'saldo' = fichas acabaram, 'tempo' = prazo, 'jogador' = encerrou. */
export type RouletteEndedReason = 'meta' | 'saldo' | 'tempo' | 'jogador'

export interface RoulettePocket {
  /** "0", "00", "1" … "36" */
  label: string
  condition: RouletteMoveOption
}

export interface RouletteCondition {
  id: RouletteMoveOption
  label: string
  payout: number
  /** Texto pronto para a mesa, ex.: "paga 2×". */
  payoutLabel: string
  chance: number
}

export interface RouletteStoredMove {
  coinsAmount: number
  aposta: number
  opcao: RouletteMoveOption
  winrate: boolean
  pocket?: string
  resultado?: RouletteMoveOption
  delta?: number
  /** true quando esta jogada zerou o saldo e ele foi reposto às fichas iniciais. */
  refilled?: boolean
}

export interface RouletteMatchView {
  matchId: string
  sessionId: string
  playerId: string
  coins: number
  initMoney: number
  /** Meta de fichas. */
  pointsLimit: number
  timeLimit: number | null
  startedAt: number
  endsAt: number | null
  pityStreak: number
  moves: Record<string, RouletteStoredMove>
  status: RouletteMatchStatus
  endedReason: RouletteEndedReason | null
  tableLayout?: string
  /**
   * Se o jogador pode encerrar a partida voluntariamente agora (libera depois da 1ª reposição,
   * mesmo quando o professor bloqueou a desistência na config).
   */
  allowGiveUp: boolean
  /** Quantas vezes o saldo já foi reposto ao zerar. */
  refillsUsed: number
  /** Quantas reposições são permitidas antes de encerrar por 'saldo'. */
  maxRefills: number
  /** Rodadas já jogadas. */
  round: number
  maxMagnitude: number
  /** Roda na ordem física, começando no topo. */
  wheel: RoulettePocket[]
  conditions: RouletteCondition[]
  chipValues: number[]
  serverNow: number
  /** Mensagem do professor para a rodada que vai começar; null quando não há. */
  popup: string | null
}

export interface RouletteSpinRequest {
  playerId: string
  opcao: RouletteMoveOption
  aposta: number
}

export interface RouletteSpinResponse {
  round: number
  opcao: RouletteMoveOption
  pocket: string
  resultado: RouletteMoveOption
  aposta: number
  won: boolean
  delta: number
  coinsAmount: number
  winProbability: number
  pityStreak: number
  maxMagnitude: number
  matchFinished: boolean
  endedReason: RouletteEndedReason | null
  /** Mensagem do professor para a rodada seguinte; null quando não há. */
  nextPopup: string | null
  /** true quando esta jogada zerou o saldo e ele foi reposto (a partida continuou). */
  refilled: boolean
  /** Quantas reposições já foram usadas depois desta jogada. */
  refillsUsed: number
  /** Valor efetivo depois desta jogada. */
  allowGiveUp: boolean
}

// -- Relatório da partida (GET /roulette/matches/:id/report) --
// Tudo calculado no backend (buildRouletteReport); são os mesmos números da planilha do e-mail.

export type RouletteReportEmailStatus = 'none' | 'pending' | 'sent' | 'failed'

export interface RouletteReportRound {
  round: number
  playedAt: string | null
  /** Segundos desde a jogada anterior (na 1ª, desde a entrada na partida). */
  secondsSinceLast: number | null
  opcao: RouletteMoveOption
  opcaoLabel: string
  aposta: number
  pocket: string | null
  resultado: RouletteMoveOption | null
  resultadoLabel: string | null
  won: boolean
  delta: number
  coinsBefore: number
  coinsAfter: number
  winProbability: number | null
  pityStreak: number | null
  popupMessage: string | null
  popupReadSeconds: number | null
  /** true quando esta jogada zerou o saldo e ele foi reposto às fichas iniciais. */
  refilled: boolean
}

export interface RouletteReportPopup {
  round: number
  message: string
  shown: boolean
  readSeconds: number | null
}

export interface RouletteReport {
  match: {
    id: string
    status: string
    startedAt: string | null
    finishedAt: string | null
    durationSeconds: number | null
    endedReason: string | null
    endedReasonLabel: string
  }
  session: { id: string; name: string; inviteCode: string }
  player: { fields: Array<{ key: string; label: string; value: string }> }
  summary: {
    initMoney: number
    finalCoins: number
    goal: number
    netResult: number
    reachedGoal: boolean
    totalRounds: number
    wins: number
    losses: number
    winRate: number
    totalBet: number
    averageBet: number
    maxBet: number
    minBet: number
    totalWon: number
    totalLost: number
    averageSecondsBetween: number | null
    longestUnreinforcedStreak: number
    betsByCondition: Array<{ id: RouletteMoveOption; label: string; count: number; total: number }>
    popupsConfigured: number
    popupsShown: number
    averagePopupReadSeconds: number | null
    /** Quantas vezes o saldo zerou e foi reposto às fichas iniciais nesta partida. */
    refillsUsed: number
  }
  rounds: RouletteReportRound[]
  popups: RouletteReportPopup[]
  email: { status: RouletteReportEmailStatus; to: string | null }
}
