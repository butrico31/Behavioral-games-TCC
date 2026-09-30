export type PrisonerChoice = 'cooperate' | 'defect';

export interface PrisonerRoundResult {
  player1Choice: PrisonerChoice;
  player2Choice: PrisonerChoice;
  player1Points: number;
  player2Points: number;
  player1TimedOut?: boolean;
  player2TimedOut?: boolean;
}

export type PrisonerMoves = Record<string, PrisonerRoundResult>;

/**
 * Rodada como ela vai para UM jogador: com userViewPoints desligado, os pontos do outro
 * jogador saem como null. O que fica gravado em PrisonerMoves continua completo, então o
 * resultado final e o relatório do professor não mudam.
 */
export type PrisonerRoundResultView = Omit<PrisonerRoundResult, 'player1Points' | 'player2Points'> & {
  player1Points: number | null;
  player2Points: number | null;
};

export interface PrisonerMatchState {
  matchId: string;
  sessionId: string;
  player1Id: string;
  player2Id: string;
  currentRound: number;
  totalRounds: number;
  player1TotalPoints: number;
  player2TotalPoints: number;
  player1SocketId: string | null;
  player2SocketId: string | null;
  player1Ready: boolean;
  player2Ready: boolean;
  pendingChoices: {
    player1?: PrisonerChoice;
    player2?: PrisonerChoice;
  };
  moves: PrisonerMoves;
  status: 'waiting' | 'in_progress' | 'finished';
  userViewPoints: boolean;
  roundTimeLimit: number | null;
  roundTimer: ReturnType<typeof setTimeout> | null;
  /** Fim da sessão (epoch ms), vindo de sessions.expires_at. null = sessão sem tempo. */
  sessionDeadline: number | null;
  sessionTimer: ReturnType<typeof setTimeout> | null;
  /** Última rodada que fechou com pontos — é o que o relatório chama de "rodadas jogadas". */
  lastResolvedRound: number;
  endedReason: 'rodadas' | 'tempo_sessao' | 'sessao_encerrada' | null;
  /** Rodada que estava aberta quando a sessão acabou: entra no relatório sem pontos. */
  interruptedRound: number | null;
  roundDeadline: number | null;
  pausedRemainingMs: number | null;
  pausedRound: number | null;
}

export const PRISONER_PAYOFF = {
  cooperate: { cooperate: [3, 3], defect: [0, 5] },
  defect:    { cooperate: [5, 0], defect: [1, 1] },
} as const;
