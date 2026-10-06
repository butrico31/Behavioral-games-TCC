import type { RouletteMoveOption, RouletteRoundMove } from '../../match/match.entity';
import { PLAYER_OPTIONAL_FIELDS_LABELS_PT } from '../../common/constants/player-fields.constants';
import { DEFAULT_GOAL, DEFAULT_INIT_MONEY, ROULETTE_CONDITIONS } from '../roulette.rules';

/**
 * Mesmo formato que SessionService.getMatchResults() devolve: é dele que o relatório da roleta
 * parte, igual ao do Prisioneiro (MatchResultXlsxService).
 */
export interface RouletteMatchResults {
  session: {
    id: string;
    session_name?: string | null;
    inviteCode: string;
    inputInfo?: string[];
    settings?:
      | { initMoney?: number | null; pointsLimit?: number | null; roundPopups?: Array<{ round: number; message: string }> | null }
      | object
      | null;
  };
  players: Array<{ role: 'player1' | 'player2' } & Record<string, unknown>>;
  match: {
    id: string;
    status: string;
    matchTime?: number | null;
    endedReason?: string | null;
    started_at?: Date | string | null;
    finished_at?: Date | string | null;
    moves?: Record<string, unknown>;
  };
}

export type RouletteReportEmailStatus = 'none' | 'pending' | 'sent' | 'failed';

export interface RouletteReportRound {
  round: number;
  /** ISO 8601; null em jogadas antigas, gravadas antes deste campo existir. */
  playedAt: string | null;
  /** Segundos desde a jogada anterior (na 1ª, desde a entrada na partida). */
  secondsSinceLast: number | null;
  /** Condição apostada. */
  opcao: RouletteMoveOption;
  opcaoLabel: string;
  aposta: number;
  pocket: string | null;
  resultado: RouletteMoveOption | null;
  resultadoLabel: string | null;
  won: boolean;
  delta: number;
  coinsBefore: number;
  coinsAfter: number;
  winProbability: number | null;
  pityStreak: number | null;
  /** Mensagem do professor exibida antes desta jogada; null quando não houve popup. */
  popupMessage: string | null;
  /** Segundos que o popup ficou aberto; null se não houve ou não foi registrado. */
  popupReadSeconds: number | null;
  /** true quando esta jogada zerou o saldo e ele foi reposto às fichas iniciais. */
  refilled: boolean;
}

export interface RouletteReportPopup {
  round: number;
  message: string;
  /** true quando o jogador chegou a jogar a rodada (o popup aparece antes dela). */
  shown: boolean;
  readSeconds: number | null;
}

export interface RouletteReport {
  match: {
    id: string;
    status: string;
    startedAt: string | null;
    finishedAt: string | null;
    durationSeconds: number | null;
    endedReason: string | null;
    endedReasonLabel: string;
  };
  session: {
    id: string;
    name: string;
    inviteCode: string;
  };
  player: {
    fields: Array<{ key: string; label: string; value: string }>;
  };
  summary: {
    initMoney: number;
    finalCoins: number;
    goal: number;
    netResult: number;
    reachedGoal: boolean;
    totalRounds: number;
    wins: number;
    losses: number;
    /** 0–1 */
    winRate: number;
    totalBet: number;
    averageBet: number;
    maxBet: number;
    minBet: number;
    totalWon: number;
    totalLost: number;
    averageSecondsBetween: number | null;
    longestUnreinforcedStreak: number;
    betsByCondition: Array<{ id: RouletteMoveOption; label: string; count: number; total: number }>;
    popupsConfigured: number;
    popupsShown: number;
    averagePopupReadSeconds: number | null;
    /** Quantas vezes o saldo zerou e foi reposto às fichas iniciais nesta partida. */
    refillsUsed: number;
  };
  rounds: RouletteReportRound[];
  popups: RouletteReportPopup[];
  email: { status: RouletteReportEmailStatus; to: string | null };
}

const ENDED_REASON_LABELS: Record<string, string> = {
  meta: 'Meta atingida',
  saldo: 'Saldo zerado',
  tempo: 'Tempo esgotado',
  jogador: 'Encerrada pelo jogador',
};

const conditionLabel = (id: RouletteMoveOption | null | undefined): string | null =>
  id ? (ROULETTE_CONDITIONS.find((c) => c.id === id)?.label ?? id) : null;

const round2 = (value: number) => Math.round(value * 100) / 100;

const positiveOr = (value: number | null | undefined, fallback: number) =>
  typeof value === 'number' && value > 0 ? value : fallback;

/**
 * Relatório de uma partida da roleta, todo calculado aqui a partir do que foi gravado no banco.
 * A tela final e a planilha usam este mesmo objeto, então os números batem entre os dois.
 */
export function buildRouletteReport(
  data: RouletteMatchResults,
  email: { status: RouletteReportEmailStatus; to: string | null } = { status: 'none', to: null },
): RouletteReport {
  const { session, match } = data;
  const player = data.players.find((p) => p.role === 'player1');
  const settings = (session.settings ?? {}) as {
    initMoney?: number | null;
    pointsLimit?: number | null;
    roundPopups?: Array<{ round: number; message: string }> | null;
  };
  const initMoney = positiveOr(settings?.initMoney, DEFAULT_INIT_MONEY);
  const goal = positiveOr(settings?.pointsLimit, DEFAULT_GOAL);

  const moves = (match.moves ?? {}) as Record<string, RouletteRoundMove>;
  const ordered = Object.entries(moves)
    .map(([round, move]) => ({ round: Number(round), move }))
    .filter((entry) => Number.isFinite(entry.round))
    .sort((a, b) => a.round - b.round);

  let previousCoins = initMoney;
  let streak = 0;
  let longestStreak = 0;
  const rounds: RouletteReportRound[] = ordered.map(({ round, move }) => {
    const coinsAfter = move.coinsAmount;
    // Jogadas antigas não têm `delta`: sai da diferença de saldo.
    const delta = typeof move.delta === 'number' ? move.delta : coinsAfter - previousCoins;
    const coinsBefore = coinsAfter - delta;
    previousCoins = coinsAfter;

    streak = move.winrate ? 0 : streak + 1;
    longestStreak = Math.max(longestStreak, streak);

    return {
      round,
      playedAt: move.playedAt ?? null,
      secondsSinceLast: typeof move.secondsSinceLast === 'number' ? move.secondsSinceLast : null,
      opcao: move.opcao,
      opcaoLabel: conditionLabel(move.opcao) ?? move.opcao,
      aposta: move.aposta,
      pocket: move.pocket ?? null,
      resultado: move.resultado ?? null,
      resultadoLabel: conditionLabel(move.resultado),
      won: move.winrate,
      delta,
      coinsBefore,
      coinsAfter,
      winProbability: typeof move.winProbability === 'number' ? move.winProbability : null,
      pityStreak: typeof move.pityStreak === 'number' ? move.pityStreak : null,
      popupMessage: move.popupMessage ?? null,
      popupReadSeconds: typeof move.popupReadSeconds === 'number' ? move.popupReadSeconds : null,
      refilled: move.refilled === true,
    };
  });

  const refillsUsed = rounds.filter((r) => r.refilled).length;

  // Popups configurados na sessão, cruzados com as jogadas: aparece antes da rodada indicada.
  const byRound = new Map(rounds.map((r) => [r.round, r]));
  const popups: RouletteReportPopup[] = (settings.roundPopups ?? []).map((popup) => {
    const played = byRound.get(popup.round);
    return {
      round: popup.round,
      message: played?.popupMessage ?? popup.message,
      shown: Boolean(played),
      readSeconds: played?.popupReadSeconds ?? null,
    };
  });
  const readTimes = popups.map((p) => p.readSeconds).filter((s): s is number => typeof s === 'number');

  const bets = rounds.map((r) => r.aposta);
  const wins = rounds.filter((r) => r.won).length;
  const intervals = rounds
    .map((r) => r.secondsSinceLast)
    .filter((s): s is number => typeof s === 'number');
  const finalCoins = rounds.length > 0 ? rounds[rounds.length - 1].coinsAfter : initMoney;

  const requested = session.inputInfo ?? [];
  const fields = requested
    .filter((key) => key in PLAYER_OPTIONAL_FIELDS_LABELS_PT)
    .map((key) => {
      const raw = player?.[key];
      const value =
        raw === undefined || raw === null || raw === '' ? '-' : typeof raw === 'object' ? '-' : String(raw as string | number);
      return { key, label: PLAYER_OPTIONAL_FIELDS_LABELS_PT[key], value };
    });

  return {
    match: {
      id: match.id,
      status: match.status,
      startedAt: match.started_at ? new Date(match.started_at).toISOString() : null,
      finishedAt: match.finished_at ? new Date(match.finished_at).toISOString() : null,
      durationSeconds: match.matchTime ?? null,
      endedReason: match.endedReason ?? null,
      endedReasonLabel: ENDED_REASON_LABELS[match.endedReason ?? ''] ?? '-',
    },
    session: {
      id: session.id,
      name: session.session_name || session.inviteCode,
      inviteCode: session.inviteCode,
    },
    player: { fields },
    summary: {
      initMoney,
      finalCoins,
      goal,
      netResult: finalCoins - initMoney,
      reachedGoal: finalCoins >= goal,
      totalRounds: rounds.length,
      wins,
      losses: rounds.length - wins,
      winRate: rounds.length > 0 ? round2(wins / rounds.length) : 0,
      totalBet: bets.reduce((a, b) => a + b, 0),
      averageBet: bets.length > 0 ? round2(bets.reduce((a, b) => a + b, 0) / bets.length) : 0,
      maxBet: bets.length > 0 ? Math.max(...bets) : 0,
      minBet: bets.length > 0 ? Math.min(...bets) : 0,
      totalWon: rounds.filter((r) => r.delta > 0).reduce((a, r) => a + r.delta, 0),
      totalLost: rounds.filter((r) => r.delta < 0).reduce((a, r) => a - r.delta, 0),
      averageSecondsBetween:
        intervals.length > 0 ? round2(intervals.reduce((a, b) => a + b, 0) / intervals.length) : null,
      longestUnreinforcedStreak: longestStreak,
      betsByCondition: ROULETTE_CONDITIONS.map((c) => {
        const own = rounds.filter((r) => r.opcao === c.id);
        return { id: c.id, label: c.label, count: own.length, total: own.reduce((a, r) => a + r.aposta, 0) };
      }),
      popupsConfigured: popups.length,
      popupsShown: popups.filter((p) => p.shown).length,
      averagePopupReadSeconds:
        readTimes.length > 0 ? round2(readTimes.reduce((a, b) => a + b, 0) / readTimes.length) : null,
      refillsUsed,
    },
    rounds,
    popups,
    email,
  };
}
