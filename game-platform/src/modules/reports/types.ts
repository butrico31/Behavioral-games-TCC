import type { Choice } from '../game-session/types'
export type { Choice }

export interface SessionResultsSettings {
  id: string
  configName: string
  game: string
  createdAt: string
  userViewPoints?: boolean
  limitRounds?: number | null
  roundTimeLimit?: number | null
  [key: string]: unknown
}

export interface SessionResultsCreator {
  id: string
  name: string
  login: string
  created_at: string
}

export interface SessionResultsListItem {
  id: string
  session_name?: string | null
  game: string
  inviteCode: string
  isActive: boolean
  inputInfo: string[]
  settings: SessionResultsSettings
  createdBy: SessionResultsCreator
  playersCount: number
  created_at: string
  finished_at: string | null
}

export interface SessionResultsInfo {
  id: string
  session_name?: string | null
  game: string
  inviteCode: string
  isActive: boolean
  inputInfo: string[]
  settings: SessionResultsSettings
  createdBy: SessionResultsCreator
  created_at: string
  finished_at: string | null
}

export interface PlayerResult {
  id: string
  ra: string | null
  email: string | null
  educationLevel: string | null
  semester: number | null
  course: string | null
  age: number | null
  gender: string | null
  profession: string | null
  session_id: string
  created_at: string
}

export interface PlayerResultWithRole extends PlayerResult {
  role: 'player1' | 'player2'
}

// Choice above reuses prisoner's canonical type — was 'cooperate' | 'defect' | string
// here, where the trailing `| string` collapsed the whole union to `string` and
// silently defeated the type (a typo'd choice would type-check as valid).
// RoundResult/MatchMoves/MatchSummary stay reports-local: they model this
// module's own `/sessions/:id/results` REST response, a different backend
// endpoint from prisoner's live socket events, so unifying those shapes would
// assume a coupling that isn't actually guaranteed.

export interface RoundResult {
  player1Choice: Choice
  player1Points: number
  player2Choice: Choice
  player2Points: number
}

export interface MatchMoves {
  [round: string]: RoundResult
}

export interface MatchSummary {
  id: string
  player1_id: string
  player2_id: string
  status: string
  matchTime: number | null
  /** E-mails digitados na entrada (jogador 1 e 2), gravados na partida. */
  reportEmail?: string | null
  player2ReportEmail?: string | null
  moves: MatchMoves
  created_at: string
  /** Só em sessões de roleta: resumo calculado no backend para a lista de partidas. */
  rouletteSummary?: RouletteMatchSummary
}

export interface RouletteMatchSummary {
  totalRounds: number
  initMoney: number
  finalCoins: number
  netResult: number
  goal: number
  totalBet: number
  endedReasonLabel: string
}

export interface SessionResultsDetail {
  session: SessionResultsInfo
  players: PlayerResult[]
  matches: MatchSummary[]
}

export interface MatchResultDetail {
  session: SessionResultsInfo
  players: PlayerResultWithRole[]
  match: MatchSummary
}
