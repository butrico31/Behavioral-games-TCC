import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { SessionService } from '../session/session.service';
import { MatchReportMailer } from '../mail/match-report-mailer.service';
import {
  buildRouletteReport,
  type RouletteMatchResults,
  type RouletteReport,
  type RouletteReportEmailStatus,
} from './report/roulette-report';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match, MatchStatus, RouletteMoveOption } from '../match/match.entity';
import {
  SettingsGameRoulette,
  DEFAULT_TABLE_LAYOUT,
} from '../settings/settings-game-roulette.entity';
import {
  RouletteEndedReason,
  RouletteMatchState,
  RouletteMatchView,
  RouletteSpinResult,
} from './interfaces/roulette-match.interface';
import {
  DEFAULT_GOAL,
  DEFAULT_INIT_MONEY,
  ROULETTE_CHIP_VALUES,
  ROULETTE_CONDITIONS,
  ROULETTE_WHEEL,
  chanceOf,
  deltaFor,
  drawPocket,
} from './roulette.rules';

/** Campo vazio no formulário chega como 0 (ou null em configs antigas): cai no default. */
const positiveOr = <T>(value: number | null | undefined, fallback: T): number | T =>
  typeof value === 'number' && value > 0 ? value : fallback;

@Injectable()
export class RouletteService {
  /**
   * Partidas em memória. Uma partida encerrada continua aqui (status 'finished') para o
   * jogador ainda conseguir consultar o resumo depois do último giro.
   */
  private readonly activeMatches = new Map<string, RouletteMatchState>();
  /**
   * Popups do professor por partida (rodada -> mensagem). Ficam fora do estado porque o estado
   * vai inteiro para o jogador: aqui ele só recebe a mensagem da rodada que está começando.
   */
  private readonly roundPopups = new Map<string, Record<number, string>>();
  /**
   * E-mail que o jogador digitou na entrada, para mandar o relatório no fim. Fica só em memória
   * (não vai para o banco), como no envio do Prisioneiro.
   */
  private readonly reportEmails = new Map<string, string>();
  private readonly emailStatus = new Map<string, RouletteReportEmailStatus>();
  /** Popup entregue ao jogador (rodada + horário do servidor), para medir o tempo de leitura. */
  private readonly popupDelivered = new Map<string, { round: number; at: number }>();
  /** Tempo de leitura confirmado pelo jogador ao fechar o popup da rodada. */
  private readonly popupRead = new Map<string, { round: number; seconds: number }>();
  private readonly logger = new Logger(RouletteService.name);

  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    private readonly sessionService: SessionService,
    private readonly matchReportMailer: MatchReportMailer,
  ) {}

  async initMatch(matchId: string, playerId: string, email?: string): Promise<RouletteMatchState> {
    if (email) this.reportEmails.set(matchId, email.trim());
    const existing = this.activeMatches.get(matchId);
    if (existing) {
      if (existing.playerId !== playerId) {
        throw new BadRequestException(`Player ${playerId} is not part of match ${matchId}`);
      }
      return existing;
    }

    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: ['session', 'session.settings'],
    });

    if (!match) {
      throw new NotFoundException(`Match ${matchId} not found`);
    }

    if (match.player1_id !== playerId) {
      throw new BadRequestException(`Player ${playerId} is not part of match ${matchId}`);
    }

    if (match.status === MatchStatus.FINALIZADA || match.status === MatchStatus.CANCELADA) {
      throw new BadRequestException(`Match ${matchId} is already ${match.status}`);
    }

    const settings = match.session.settings as SettingsGameRoulette;
    const initMoney = positiveOr(settings?.initMoney, DEFAULT_INIT_MONEY);
    const timeLimit = positiveOr(settings?.timeLimit, null);
    const moves = (match.moves as RouletteMatchState['moves']) ?? {};

    // Se já houver jogadas gravadas, o saldo e a sequência continuam de onde pararam.
    const ordered = Object.entries(moves)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, move]) => move);
    const last = ordered[ordered.length - 1];
    let pityStreak = 0;
    for (const move of ordered) pityStreak = move.winrate ? 0 : pityStreak + 1;

    const startedAt = Date.now();
    const lastPlayedAt = last?.playedAt ? Date.parse(last.playedAt) : NaN;
    const state: RouletteMatchState = {
      matchId,
      sessionId: match.session_id,
      playerId,
      coins: last ? last.coinsAmount : initMoney,
      initMoney,
      pointsLimit: positiveOr(settings?.pointsLimit, DEFAULT_GOAL),
      timeLimit,
      startedAt,
      endsAt: timeLimit !== null ? startedAt + timeLimit * 1000 : null,
      lastSpinAt: Number.isFinite(lastPlayedAt) ? lastPlayedAt : null,
      pityStreak,
      moves,
      status: 'in_progress',
      endedReason: null,
      tableLayout: settings?.tableLayout ?? DEFAULT_TABLE_LAYOUT,
    };

    this.activeMatches.set(matchId, state);
    this.roundPopups.set(
      matchId,
      Object.fromEntries((settings?.roundPopups ?? []).map((popup) => [popup.round, popup.message])),
    );
    return state;
  }

  /** Rodadas já jogadas. A próxima é esta + 1. */
  private playedRounds(state: RouletteMatchState): number {
    return Object.keys(state.moves).length;
  }

  private popupFor(matchId: string, round: number): string | null {
    return this.roundPopups.get(matchId)?.[round] ?? null;
  }

  /** Popup da rodada `round` saindo para o jogador agora. Reenvio (recarregou) mantém o 1º horário. */
  private deliverPopup(matchId: string, round: number): string | null {
    const message = this.popupFor(matchId, round);
    if (message && this.popupDelivered.get(matchId)?.round !== round) {
      this.popupDelivered.set(matchId, { round, at: Date.now() });
    }
    return message;
  }

  /** O jogador fechou o popup: grava quanto tempo ele ficou aberto (relógio do servidor). */
  acknowledgePopup(matchId: string, playerId: string, round: number): void {
    const state = this.getState(matchId);
    if (state.playerId !== playerId) {
      throw new BadRequestException(`Player ${playerId} is not part of match ${matchId}`);
    }
    const delivered = this.popupDelivered.get(matchId);
    if (!delivered || delivered.round !== round || this.popupRead.get(matchId)?.round === round) return;
    this.popupRead.set(matchId, { round, seconds: Math.round((Date.now() - delivered.at) / 10) / 100 });
  }

  toView(state: RouletteMatchState): RouletteMatchView {
    const inProgress = state.status === 'in_progress';
    const round = this.playedRounds(state);
    const popup = inProgress ? this.deliverPopup(state.matchId, round + 1) : null;
    return {
      ...state,
      round,
      maxMagnitude: Math.max(0, state.coins),
      wheel: ROULETTE_WHEEL,
      conditions: ROULETTE_CONDITIONS,
      chipValues: ROULETTE_CHIP_VALUES,
      serverNow: Date.now(),
      popup,
    };
  }

  async spin(
    matchId: string,
    playerId: string,
    opcao: RouletteMoveOption,
    aposta: number,
  ): Promise<RouletteSpinResult> {
    const state = this.getState(matchId);

    if (state.playerId !== playerId) {
      throw new BadRequestException(`Player ${playerId} is not part of match ${matchId}`);
    }
    if (state.status !== 'in_progress') {
      throw new BadRequestException('A partida já foi encerrada.');
    }
    if (state.endsAt !== null && Date.now() >= state.endsAt) {
      await this.finish(state, 'tempo');
      throw new BadRequestException('O tempo da partida terminou.');
    }
    if (aposta > state.coins) {
      throw new BadRequestException('A aposta passa do saldo de fichas.');
    }

    const now = Date.now();
    // Tempo de decisão medido no servidor: desde o giro anterior (ou desde a entrada, no 1º).
    const secondsSinceLast = Math.round((now - (state.lastSpinAt ?? state.startedAt)) / 10) / 100;
    state.lastSpinAt = now;

    const pocket = drawPocket();
    const won = pocket.condition === opcao;
    const delta = deltaFor(opcao, aposta, won);
    const winProbability = chanceOf(opcao);
    const pityStreakAtSpin = state.pityStreak;

    state.coins += delta;
    state.pityStreak = won ? 0 : state.pityStreak + 1;

    const round = this.playedRounds(state) + 1;
    const popupMessage = this.popupFor(matchId, round);
    const read = this.popupRead.get(matchId);
    const popupReadSeconds = popupMessage && read?.round === round ? read.seconds : undefined;
    state.moves[String(round)] = {
      ...(popupMessage ? { popupMessage } : {}),
      ...(popupReadSeconds !== undefined ? { popupReadSeconds } : {}),
      coinsAmount: state.coins,
      aposta,
      opcao,
      winrate: won,
      winProbability,
      pityStreak: pityStreakAtSpin,
      pocket: pocket.label,
      resultado: pocket.condition,
      delta,
      playedAt: new Date(now).toISOString(),
      secondsSinceLast,
    };

    const endedReason: RouletteEndedReason | null =
      state.coins <= 0 ? 'saldo' : state.coins >= state.pointsLimit ? 'meta' : null;
    if (endedReason) {
      await this.finish(state, endedReason);
    }

    return {
      round,
      opcao,
      pocket: pocket.label,
      resultado: pocket.condition,
      aposta,
      won,
      delta,
      coinsAmount: state.coins,
      winProbability,
      pityStreak: state.pityStreak,
      maxMagnitude: Math.max(0, state.coins),
      matchFinished: endedReason !== null,
      endedReason,
      nextPopup: endedReason ? null : this.deliverPopup(matchId, round + 1),
    };
  }

  private async finish(state: RouletteMatchState, reason: RouletteEndedReason): Promise<void> {
    if (state.status === 'finished') return;
    state.status = 'finished';
    state.endedReason = reason;

    const match = await this.matchRepository.findOne({ where: { id: state.matchId } });
    if (!match) throw new NotFoundException(`Match ${state.matchId} not found`);

    const finishedAt = Date.now();
    match.moves = state.moves;
    match.status = MatchStatus.FINALIZADA;
    match.endedReason = reason;
    match.started_at = new Date(state.startedAt);
    match.finished_at = new Date(finishedAt);
    match.matchTime = Math.round((finishedAt - state.startedAt) / 1000);
    await this.matchRepository.save(match);
    this.roundPopups.delete(state.matchId);
    this.popupDelivered.delete(state.matchId);
    this.popupRead.delete(state.matchId);

    // Não segura a resposta do último giro: o e-mail sai em segundo plano e o status fica
    // disponível para a tela de relatório.
    void this.emailReport(state);
  }

  private async emailReport(state: RouletteMatchState): Promise<void> {
    const to = this.reportEmails.get(state.matchId);
    if (!to) {
      this.emailStatus.set(state.matchId, 'none');
      return;
    }
    this.emailStatus.set(state.matchId, 'pending');
    try {
      await this.matchReportMailer.send(state.sessionId, state.matchId, [to]);
      this.emailStatus.set(state.matchId, 'sent');
    } catch (error) {
      this.logger.error(`Falha ao enviar o relatório da partida ${state.matchId}: ${(error as Error).message}`);
      this.emailStatus.set(state.matchId, 'failed');
    }
  }

  /**
   * Relatório da partida encerrada, calculado no backend a partir do que foi gravado no banco
   * (o mesmo que vai na planilha por e-mail). Só o próprio jogador consulta.
   */
  async getReport(matchId: string, playerId: string): Promise<RouletteReport> {
    const match = await this.matchRepository.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException(`Match ${matchId} not found`);
    if (match.player1_id !== playerId) {
      throw new BadRequestException(`Player ${playerId} is not part of match ${matchId}`);
    }
    if (match.status !== MatchStatus.FINALIZADA) {
      throw new BadRequestException('O relatório fica disponível quando a partida termina.');
    }

    const results = await this.sessionService.getMatchResults(match.session_id, matchId);
    return buildRouletteReport(results as unknown as RouletteMatchResults, {
      status: this.emailStatus.get(matchId) ?? 'none',
      to: this.reportEmails.get(matchId) ?? null,
    });
  }

  /**
   * Encerramento pedido pelo front: pelo botão do jogador ou quando o relógio dele zera. O
   * motivo é decidido aqui — se o prazo já passou, é 'tempo', senão foi o jogador. Idempotente.
   */
  async finalizeMatch(matchId: string): Promise<RouletteMatchView> {
    const state = this.getState(matchId);
    if (state.status === 'in_progress') {
      const timeUp = state.endsAt !== null && Date.now() >= state.endsAt - 1000;
      await this.finish(state, timeUp ? 'tempo' : 'jogador');
    }
    return this.toView(state);
  }

  getState(matchId: string): RouletteMatchState {
    const state = this.activeMatches.get(matchId);
    if (!state) {
      throw new NotFoundException(`No active roulette match state for matchId ${matchId}`);
    }
    return state;
  }

  hasState(matchId: string): boolean {
    return this.activeMatches.has(matchId);
  }
}
