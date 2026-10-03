import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Session } from '../session/session.entity';
import { Player } from '../player/player.entity';

export enum MatchStatus {
  AGUARDANDO = 'aguardando',
  EM_PARTIDA = 'em_partida',
  FINALIZADA = 'finalizada',
  CANCELADA = 'cancelada',
}

export enum RouletteMoveOption {
  AZUL = 'azul',
  VERMELHO = 'vermelho',
  PRETO = 'preto',
}

export interface RouletteRoundMove {
  /** Saldo depois da rodada. */
  coinsAmount: number;
  aposta: number;
  /** Condição em que o jogador apostou. */
  opcao: RouletteMoveOption;
  /** true quando a casa sorteada é da condição apostada. */
  winrate: boolean;
  /** Chance da condição apostada (casas da cor / 38). */
  winProbability?: number;
  /** Rodadas seguidas sem reforço antes desta. */
  pityStreak?: number;
  /** Casa sorteada ("0", "00", "1"…"36") e a cor dela. */
  pocket?: string;
  resultado?: RouletteMoveOption;
  /** Variação do saldo nesta rodada. */
  delta?: number;
}

export interface PrisonerRoundMove {
  player1Choice: 'cooperate' | 'defect';
  player2Choice: 'cooperate' | 'defect';
  player1Points: number;
  player2Points: number;
  player1TimedOut?: boolean;
  player2TimedOut?: boolean;
}

export type RoundMove = RouletteRoundMove | PrisonerRoundMove;
export type MatchMoves = Record<string, RoundMove>;

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Session, { nullable: false })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({ nullable: false })
  session_id: string;

  @ManyToOne(() => Player, { nullable: false })
  @JoinColumn({ name: 'player1_id' })
  player1: Player;

  @Column({ nullable: false })
  player1_id: string;

  @ManyToOne(() => Player, { nullable: true })
  @JoinColumn({ name: 'player2_id' })
  player2?: Player;

  @Column({ nullable: true })
  player2_id?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  moves?: MatchMoves;

  @Column({ type: 'int', nullable: true })
  matchTime?: number;

  /** 'rodadas' (fim natural), 'tempo_sessao' ou 'sessao_encerrada'. */
  @Column({ type: 'varchar', length: 24, nullable: true })
  endedReason?: string;

  /** Rodada que estava aberta quando a sessao acabou: entra no relatorio sem pontos. */
  @Column({ type: 'int', nullable: true })
  interruptedRound?: number | null;

  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.AGUARDANDO,
  })
  status: MatchStatus;

  @CreateDateColumn()
  created_at: Date;
}
