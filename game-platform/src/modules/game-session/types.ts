// -- Player Info Options (session-level) --

export interface PlayerInfoOption {
  value: string
  label: string
}

export type ValidPlayerFieldsResponse = string[]

// -- Game Catalog (from API) --

export interface GameCatalogItem {
  id: string
  name: string
  description: string
  redirectUrl: string
}

// -- Dynamic Game Config Fields (from API) --

export type GameConfigFieldType = 'string' | 'number' | 'boolean' | `enum(${string})`

export interface GameConfigFieldDefinition {
  name: string
  type: GameConfigFieldType | string
}

export interface GameConfigFieldsResponse {
  common: GameConfigFieldDefinition[]
  [game: string]: GameConfigFieldDefinition[]
}

export type ConfigPrimitiveValue = string | number | boolean

/** Mensagem do professor que aparece em popup para o jogador no início de uma rodada (roleta). */
export interface RoundPopup {
  round: number
  message: string
}

/** Valor de um campo de configuração: primitivo, ou a lista de popups por rodada. */
export type ConfigFieldValue = ConfigPrimitiveValue | RoundPopup[] | null

// -- Session Settings (game config stored in DB) --

export interface SessionSettings {
  id: string
  configName: string
  game: string
  createdAt: string
  [key: string]: ConfigFieldValue
}

export interface SessionUser {
  id: string
  name: string
  login: string
}

export interface Session {
  id: string
  session_name: string
  game: string
  inputInfo: string[]
  settings: SessionSettings
  settings_id: string
  inviteCode: string
  user: SessionUser
  user_id: string
  players: string[]
  isActive: boolean
  created_at: string
  finished_at: string | null
}

// -- Game Configuration Types (match-level) --

export interface GameConfig {
  id: string
  configName: string
  game: string
  createdAt?: string
  [key: string]: ConfigFieldValue | undefined
}

export interface CreateConfigPayload {
  configName: string
  game: string
  [key: string]: ConfigFieldValue
}

// -- Session Creation Types --

export interface CreateSessionPayload {
  session_name: string
  game: string
  inputInfo: string[]
  settings: Omit<CreateConfigPayload, 'game'>
  user_id: string
}

export type CreateSessionResponse =
  | Session
  | {
      session: Session
      invite_code?: string
      inviteCode?: string
    }

// -- Join Session Types --

export interface SessionRequirement {
  field: string
  label: string
  type: 'text' | 'email' | 'number' | 'select'
  required: boolean
  placeholder: string
}

export interface JoinSessionPayload {
  inviteCode: string
  educationLevel?: string
  semester?: number
  course?: string
  age?: number
  gender?: string
  profession?: string
}

export interface JoinSessionPlayer {
  id: string
  session_id: string
  educationLevel?: string
  semester?: number
  course?: string
  age?: number
  gender?: string
  profession?: string
}

export interface JoinSessionResponse {
  session: Session
  player: JoinSessionPlayer
  playersCount: number
  maxPlayers: number
  match: { id: string; status: string } | null
}

// -- Match Types (player-facing match screens: /partida/:sessionId) --

/** Placar de uma combinação: [pontos do jogador, pontos do oponente]. */
export type PayoffPair = [number, number]

export type PayoffTable = {
  bothBlack: PayoffPair
  blackRed: PayoffPair
  redBlack: PayoffPair
  bothRed: PayoffPair
}

export const DEFAULT_PAYOFF: PayoffTable = {
  bothBlack: [3, 3],
  blackRed: [0, 5],
  redBlack: [5, 0],
  bothRed: [1, 1],
}

export type MatchPhase = 'searching' | 'found' | 'intro' | 'ready'

/** 'B' = carta preta, 'R' = carta vermelha. */
export type Card = 'B' | 'R'

export type RoundPhase = 'choose' | 'waiting' | 'reveal'

/**
 * [seus pontos, pontos do outro jogador]. O segundo vem null durante a partida quando a
 * sessão esconde a pontuação do oponente; no resultado final os dois sempre vêm.
 */
export type RoundPointsView = [number, number | null]

export type RoundRecord = {
  round: number
  yourCard: Card
  opponentCard: Card
  points: RoundPointsView
  /** true quando a carta foi jogada automaticamente por tempo esgotado. */
  byTime?: boolean
}

export const CARD_COLOR: Record<Card, string> = { B: '#15171D', R: '#DA2128' }
export const CARD_NAME: Record<Card, string> = { B: 'PRETO', R: 'VERMELHO' }

export function payoffFor(table: PayoffTable, mine: Card, theirs: Card): PayoffPair {
  if (mine === 'B') return theirs === 'B' ? table.bothBlack : table.blackRed
  return theirs === 'B' ? table.redBlack : table.bothRed
}

// -- Match Protocol (socket.io gateway /prisoner) --

export type Choice = 'cooperate' | 'defect'

// 'cooperate' e 'defect' continuam sendo os valores trocados com o backend e salvos nas
// partidas; o jogador só vê as cores. Para inverter qual cor é qual escolha, troque aqui.
export const CARD_CHOICE: Record<Card, Choice> = { B: 'cooperate', R: 'defect' }

export function cardForChoice(choice: Choice): Card {
  return choice === CARD_CHOICE.B ? 'B' : 'R'
}

/** Tabela do servidor: payoff[minha escolha][escolha do outro] = [meus pontos, pontos do outro]. */
export type ServerPayoff = Record<Choice, Record<Choice, PayoffPair>>

export function toPayoffTable(payoff: ServerPayoff): PayoffTable {
  const black = CARD_CHOICE.B
  const red = CARD_CHOICE.R
  return {
    bothBlack: payoff[black][black],
    blackRed: payoff[black][red],
    redBlack: payoff[red][black],
    bothRed: payoff[red][red],
  }
}

export interface RoundMoves {
  player1Choice: Choice
  player2Choice: Choice
  player1Points: number
  player2Points: number
  player1TimedOut?: boolean
  player2TimedOut?: boolean
}

/**
 * A rodada como chega no roundResult: com a pontuação do oponente escondida, o servidor manda
 * os pontos dele como null. O `moves` do matchFinished continua completo (RoundMoves), por isso
 * o resultado final não depende desta versão mascarada.
 */
export type RoundMovesView = Omit<RoundMoves, 'player1Points' | 'player2Points'> & {
  player1Points: number | null
  player2Points: number | null
}

/** Enviado enquanto os dois estão nas regras, até ambos confirmarem. */
export interface ReadyCheckData {
  matchId: string
  player1Id: string
  player2Id: string
  totalRounds: number
  /** Fim da sessão (epoch ms); null quando a sessão não tem tempo. */
  sessionEndsAt?: number | null
  payoff: ServerPayoff
  ready: { player1: boolean; player2: boolean }
  connected: { player1: boolean; player2: boolean }
}

/** `totalPoints` do outro jogador vem null quando a sessão esconde os pontos dele. */
export interface MatchReadyData {
  matchId?: string
  currentRound: number
  totalRounds: number
  /** Segundos por rodada; null quando a sessão não tem cronômetro. */
  roundTimeLimit: number | null
  userViewPoints: boolean
  player1Id: string
  player2Id: string
  totalPoints?: { player1: number | null; player2: number | null }
  pendingChoices?: { player1: boolean; player2: boolean }
  roundEndsAt?: number | null
  sessionEndsAt?: number | null
  serverNow?: number
  /** Horário local de chegada, para compensar a diferença de relógio com o servidor. */
  receivedAt?: number
}

export interface RoundStartData {
  round: number
  totalRounds: number
  roundEndsAt: number | null
  sessionEndsAt?: number | null
  serverNow: number
  receivedAt?: number
}

export interface RoundResultData {
  round: number
  result: RoundMovesView
  totalPoints: { player1: number | null; player2: number | null }
  nextRound: number | null
  timedOut: boolean
}

export interface MatchResult {
  matchId: string
  finalScore: { player1: number; player2: number }
  moves: Record<string, RoundMoves>
  /** 'rodadas' (fim natural), 'tempo_sessao' ou 'sessao_encerrada'. */
  endedReason?: MatchEndedReason
  roundsPlayed?: number
  /** Rodada que estava aberta quando a sessão acabou: sem pontos. */
  interruptedRound?: number | null
}

export type MatchEndedReason = 'rodadas' | 'tempo_sessao' | 'sessao_encerrada'
