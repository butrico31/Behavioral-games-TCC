import { RouletteMoveOption, RouletteRoundMove } from '../../match/match.entity';
import type { RouletteCondition, RoulettePocket } from '../roulette.rules';

export type RouletteMoves = Record<string, RouletteRoundMove>;

/** 'meta' = atingiu a meta, 'saldo' = fichas acabaram, 'tempo' = prazo, 'jogador' = encerrou. */
export type RouletteEndedReason = 'meta' | 'saldo' | 'tempo' | 'jogador';

export interface RouletteMatchState {
  matchId: string;
  sessionId: string;
  playerId: string;
  coins: number;
  initMoney: number;
  /** Meta de fichas: a partida acaba quando o saldo chega aqui. */
  pointsLimit: number;
  /** Segundos de partida; null = sem limite. */
  timeLimit: number | null;
  /** Início da partida no relógio do servidor (epoch ms). */
  startedAt: number;
  /** Fim pelo tempo (epoch ms); null = sem limite. */
  endsAt: number | null;
  /** Horário do último giro (epoch ms); null antes da 1ª jogada. Base do "tempo desde a última". */
  lastSpinAt: number | null;
  /** Rodadas seguidas sem reforço. */
  pityStreak: number;
  moves: RouletteMoves;
  status: 'in_progress' | 'finished';
  endedReason: RouletteEndedReason | null;
  /** Layout de mesa escolhido na configuração da sessão. */
  tableLayout: string;
}

/** O que o jogador recebe ao entrar/consultar: estado + regras da mesa para desenhar. */
export interface RouletteMatchView extends RouletteMatchState {
  /** Rodadas já jogadas. */
  round: number;
  /** Maior aposta permitida agora. */
  maxMagnitude: number;
  wheel: RoulettePocket[];
  conditions: RouletteCondition[];
  chipValues: number[];
  serverNow: number;
  /** Mensagem do professor para a rodada que vai começar; null quando não há. */
  popup: string | null;
}

export interface RouletteSpinResult {
  round: number;
  /** Condição apostada. */
  opcao: RouletteMoveOption;
  /** Casa sorteada e a cor dela. */
  pocket: string;
  resultado: RouletteMoveOption;
  aposta: number;
  won: boolean;
  delta: number;
  coinsAmount: number;
  winProbability: number;
  pityStreak: number;
  maxMagnitude: number;
  matchFinished: boolean;
  endedReason: RouletteEndedReason | null;
  /** Mensagem do professor para a rodada seguinte; null quando não há ou a partida acabou. */
  nextPopup: string | null;
}
