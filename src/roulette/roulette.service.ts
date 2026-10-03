import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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

  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
  ) {}

  async initMatch(matchId: string, playerId: string): Promise<RouletteMatchState> {
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

  toView(state: RouletteMatchState): RouletteMatchView {
    const inProgress = state.status === 'in_progress';
    const round = this.playedRounds(state);
    return {
      ...state,
      round,
      maxMagnitude: Math.max(0, state.coins),
      wheel: ROULETTE_WHEEL,
      conditions: ROULETTE_CONDITIONS,
      chipValues: ROULETTE_CHIP_VALUES,
      serverNow: Date.now(),
      popup: inProgress ? this.popupFor(state.matchId, round + 1) : null,
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

    const pocket = drawPocket();
    const won = pocket.condition === opcao;
    const delta = deltaFor(opcao, aposta, won);
    const winProbability = chanceOf(opcao);
    const pityStreakAtSpin = state.pityStreak;

    state.coins += delta;
    state.pityStreak = won ? 0 : state.pityStreak + 1;

    const round = this.playedRounds(state) + 1;
    state.moves[String(round)] = {
      coinsAmount: state.coins,
      aposta,
      opcao,
      winrate: won,
      winProbability,
      pityStreak: pityStreakAtSpin,
      pocket: pocket.label,
      resultado: pocket.condition,
      delta,
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
      nextPopup: endedReason ? null : this.popupFor(matchId, round + 1),
    };
  }

  private async finish(state: RouletteMatchState, reason: RouletteEndedReason): Promise<void> {
    if (state.status === 'finished') return;
    state.status = 'finished';
    state.endedReason = reason;

    const match = await this.matchRepository.findOne({ where: { id: state.matchId } });
    if (!match) throw new NotFoundException(`Match ${state.matchId} not found`);

    match.moves = state.moves;
    match.status = MatchStatus.FINALIZADA;
    await this.matchRepository.save(match);
    this.roundPopups.delete(state.matchId);
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
