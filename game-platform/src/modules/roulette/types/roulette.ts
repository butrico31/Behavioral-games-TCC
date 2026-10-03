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
}
