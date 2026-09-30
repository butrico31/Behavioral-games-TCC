import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match, MatchStatus } from '../match/match.entity';
import { Session } from '../session/session.entity';
import {
  PrisonerMatchState,
  PrisonerChoice,
  PRISONER_PAYOFF,
} from './interfaces/prisoner-match.interface';
import { SettingsGamePrisoner } from '../settings/settings-game-prisoner.entity';

export type RoundTimeoutCallback = (matchId: string) => void;
export type SessionEndCallback = (state: PrisonerMatchState) => void;

@Injectable()
export class PrisonerService {
  private static readonly REVEAL_GRACE_MS = 4000;
  private static readonly BOOT_GRACE_MS = 1500;
  private readonly activeMatches = new Map<string, PrisonerMatchState>();
  private onRoundTimeout: RoundTimeoutCallback | null = null;
  private onSessionEnd: SessionEndCallback | null = null;

  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
  ) {}

  setRoundTimeoutCallback(cb: RoundTimeoutCallback) {
    this.onRoundTimeout = cb;
  }

  setSessionEndCallback(cb: SessionEndCallback) {
    this.onSessionEnd = cb;
  }

  async initMatch(matchId: string): Promise<PrisonerMatchState> {
    const existingBefore = this.activeMatches.get(matchId);
    if (existingBefore) return existingBefore;

    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: ['session', 'session.settings'],
    });

    // Re-check after await — concurrent call may have set state while DB query was running
    const existingAfter = this.activeMatches.get(matchId);
    if (existingAfter) return existingAfter;

    if (!match) {
      throw new NotFoundException(`Match ${matchId} not found`);
    }

    if (match.status === MatchStatus.FINALIZADA || match.status === MatchStatus.CANCELADA) {
      throw new BadRequestException(`Match ${matchId} is already ${match.status}`);
    }

    if (!match.player2_id) {
      throw new BadRequestException('Match needs 2 players to start');
    }

    if (!match.session.isActive) {
      throw new BadRequestException('Esta sessão já foi encerrada pelo professor.');
    }

    // O prazo vem do banco (timestamptz), não de um contador em memória: sobrevive a reinício
    // e vale igual para os dois jogadores, em qualquer relógio local.
    const sessionDeadline = match.session.expires_at
      ? new Date(match.session.expires_at).getTime()
      : null;

    if (sessionDeadline !== null && sessionDeadline <= Date.now()) {
      throw new BadRequestException('O tempo desta sessão terminou.');
    }

    const settings = match.session.settings as SettingsGamePrisoner;
    // O formulário do professor manda 0 quando o campo fica vazio, e `?? 10` não cobre 0:
    // sem esta guarda, uma sessão salva assim gera partida de zero rodadas.
    const limitRounds = settings?.limitRounds;
    const totalRounds = limitRounds && limitRounds > 0 ? limitRounds : 10;

    const state: PrisonerMatchState = {
      matchId,
      sessionId: match.session_id,
      player1Id: match.player1_id,
      player2Id: match.player2_id,
      currentRound: 1,
      totalRounds,
      player1TotalPoints: 0,
      player2TotalPoints: 0,
      player1SocketId: null,
      player2SocketId: null,
      player1Ready: false,
      player2Ready: false,
      pendingChoices: {},
      moves: {},
      status: 'waiting',
      userViewPoints: settings?.userViewPoints ?? false,
      roundTimeLimit: settings?.roundTimeLimit ?? null,
      roundTimer: null,
      roundDeadline: null,
      sessionDeadline,
      sessionTimer: null,
      lastResolvedRound: 0,
      endedReason: null,
      interruptedRound: null,
      pausedRemainingMs: null,
      pausedRound: null,
    };

    this.activeMatches.set(matchId, state);
    return state;
  }

  connectPlayer(matchId: string, playerId: string, socketId: string): PrisonerMatchState {
    const state = this.getState(matchId);

    if (state.player1Id === playerId) {
      state.player1SocketId = socketId;
    } else if (state.player2Id === playerId) {
      state.player2SocketId = socketId;
    } else {
      throw new BadRequestException(`Player ${playerId} is not part of match ${matchId}`);
    }
    if (state.status === 'finished') return state;

    this.startIfReady(state);
    return state;
  }

  markReady(matchId: string, playerId: string): { state: PrisonerMatchState; started: boolean } {
    const state = this.getState(matchId);

    if (state.player1Id === playerId) {
      state.player1Ready = true;
    } else if (state.player2Id === playerId) {
      state.player2Ready = true;
    } else {
      throw new BadRequestException(`Player ${playerId} is not part of match ${matchId}`);
    }
    if (state.status !== 'waiting') return { state, started: false };

    return { state, started: this.startIfReady(state) };
  }

  // The match (and its round timer) only starts once both players are connected
  // and both confirmed the instructions screen.
  private startIfReady(state: PrisonerMatchState): boolean {
    if (!state.player1SocketId || !state.player2SocketId) return false;
    if (!state.player1Ready || !state.player2Ready) return false;

    state.status = 'in_progress';
    this.armSessionTimer(state);

    if (state.roundTimer === null && state.roundDeadline === null) {
      const resuming =
        state.pausedRemainingMs !== null && state.pausedRound === state.currentRound;
      if (resuming) {
        this.armRoundTimer(
          state,
          state.pausedRemainingMs! + PrisonerService.BOOT_GRACE_MS,
        );
      } else {
        this.startRoundTimer(state, PrisonerService.BOOT_GRACE_MS);
      }
    }
    return true;
  }

  disconnectPlayer(socketId: string): PrisonerMatchState | null {
    for (const state of this.activeMatches.values()) {
      if (state.player1SocketId === socketId || state.player2SocketId === socketId) {
        if (state.player1SocketId === socketId) state.player1SocketId = null;
        if (state.player2SocketId === socketId) state.player2SocketId = null;
        if (state.status !== 'finished') {
          state.status = 'waiting';
          if (state.roundDeadline !== null) {
            state.pausedRemainingMs = Math.max(0, state.roundDeadline - Date.now());
            state.pausedRound = state.currentRound;
          }
          this.clearRoundTimer(state);
        }
        return state;
      }
    }
    return null;
  }

  submitChoice(
    matchId: string,
    playerId: string,
    choice: PrisonerChoice,
    round?: number,
  ): { state: PrisonerMatchState; roundResolved: boolean } {
    const state = this.getState(matchId);

    if (state.status !== 'in_progress') {
      throw new BadRequestException('Match is not in progress');
    }
    if (round !== undefined && round !== state.currentRound) {
      throw new BadRequestException(
        `Choice was for round ${round}, but the match is now on round ${state.currentRound}`,
      );
    }

    if (state.player1Id === playerId) {
      if (state.pendingChoices.player1 !== undefined) {
        throw new BadRequestException('Player 1 already submitted choice for this round');
      }
      state.pendingChoices.player1 = choice;
    } else if (state.player2Id === playerId) {
      if (state.pendingChoices.player2 !== undefined) {
        throw new BadRequestException('Player 2 already submitted choice for this round');
      }
      state.pendingChoices.player2 = choice;
    } else {
      throw new BadRequestException(`Player ${playerId} is not part of match ${matchId}`);
    }

    const bothChose =
      state.pendingChoices.player1 !== undefined &&
      state.pendingChoices.player2 !== undefined;

    if (bothChose) {
      this.clearRoundTimer(state);
      this.resolveRound(state);
      this.continueOrEndForSession(state);
      return { state, roundResolved: true };
    }

    return { state, roundResolved: false };
  }

  forceResolveRound(matchId: string): { state: PrisonerMatchState; roundResolved: boolean } | null {
    const state = this.activeMatches.get(matchId);
    if (!state || state.status !== 'in_progress') return null;

    const p1TimedOut = state.pendingChoices.player1 === undefined;
    const p2TimedOut = state.pendingChoices.player2 === undefined;
    // Carta sorteada, e não fixa: se o tempo esgotado sempre virasse a mesma carta, toda rodada
    // automática entraria no relatório como a mesma escolha e enviesaria o dado da pesquisa.
    // O sorteio é independente por jogador; quem não escolheu fica marcado com timedOut.
    if (p1TimedOut) state.pendingChoices.player1 = this.randomChoice();
    if (p2TimedOut) state.pendingChoices.player2 = this.randomChoice();

    this.resolveRound(state, { player1: p1TimedOut, player2: p2TimedOut });
    this.continueOrEndForSession(state);
    return { state, roundResolved: true };
  }

  /** Carta automática do tempo esgotado: 50% preto, 50% vermelho, sorteada por jogador. */
  private randomChoice(): PrisonerChoice {
    return Math.random() < 0.5 ? 'cooperate' : 'defect';
  }

  private startRoundTimer(state: PrisonerMatchState, graceMs = 0): void {
    if (!state.roundTimeLimit || state.roundTimeLimit <= 0) return;
    this.armRoundTimer(state, state.roundTimeLimit * 1000 + graceMs);
  }

  private armRoundTimer(state: PrisonerMatchState, durationMs: number): void {
    this.clearRoundTimer(state);

    if (!state.roundTimeLimit || state.roundTimeLimit <= 0) return;

    state.pausedRemainingMs = null;
    state.pausedRound = null;

    const scheduledRound = state.currentRound;

    state.roundDeadline = Date.now() + durationMs;

    state.roundTimer = setTimeout(() => {
      state.roundTimer = null;
      if (state.status !== 'in_progress' || state.currentRound !== scheduledRound) {
        return;
      }

      if (this.onRoundTimeout) {
        this.onRoundTimeout(state.matchId);
      }
    }, durationMs);
  }

  /**
   * Relógio da sessão. Um setTimeout por partida, com o prazo absoluto vindo do banco: se o
   * processo reiniciar, o prazo continua valendo (o initMatch relê e recusa sessão vencida).
   */
  private armSessionTimer(state: PrisonerMatchState): void {
    this.clearSessionTimer(state);
    if (state.sessionDeadline === null || state.status !== 'in_progress') return;

    const remaining = Math.max(0, state.sessionDeadline - Date.now());
    state.sessionTimer = setTimeout(() => {
      state.sessionTimer = null;
      if (state.status !== 'in_progress') return;
      this.endBySession(state, 'tempo_sessao', true, true);
    }, remaining);
  }

  private clearSessionTimer(state: PrisonerMatchState): void {
    if (state.sessionTimer) {
      clearTimeout(state.sessionTimer);
      state.sessionTimer = null;
    }
  }

  /** Só abre a próxima rodada se ela couber inteira no prazo: assim a sessão termina ENTRE rodadas. */
  private nextRoundFitsSession(state: PrisonerMatchState): boolean {
    if (state.sessionDeadline === null) return true;

    const now = Date.now();
    if (now >= state.sessionDeadline) return false;
    // Rodada livre não tem duração prevista: deixa correr e quem encerra é o relógio da sessão.
    if (!state.roundTimeLimit || state.roundTimeLimit <= 0) return true;

    const proxima = PrisonerService.REVEAL_GRACE_MS + state.roundTimeLimit * 1000;
    return now + proxima <= state.sessionDeadline;
  }

  private continueOrEndForSession(state: PrisonerMatchState): void {
    if (state.status !== 'in_progress') return;

    if (this.nextRoundFitsSession(state)) {
      this.startRoundTimer(state, PrisonerService.REVEAL_GRACE_MS);
      return;
    }
    // Entre rodadas: nada é descartado, a partida apenas não abre a próxima. Quem avisa os
    // jogadores é o emitRoundOutcome, que já vai ver status 'finished'.
    this.endBySession(state, 'tempo_sessao', false, false);
  }

  /**
   * Encerra a partida por causa da sessão. A rodada aberta é DESCARTADA, nunca completada:
   * forceResolveRound preencheria com 'defect' e pontuaria, e o relatório diria que alguém
   * traiu quando na verdade acabou o tempo.
   */
  private endBySession(
    state: PrisonerMatchState,
    reason: 'tempo_sessao' | 'sessao_encerrada',
    midRound: boolean,
    notify: boolean,
  ): PrisonerMatchState {
    this.clearRoundTimer(state);
    this.clearSessionTimer(state);

    if (midRound) {
      const rodadaAberta = state.currentRound > state.lastResolvedRound;
      state.interruptedRound = rodadaAberta ? state.currentRound : null;
      state.pendingChoices = {};
    }

    state.status = 'finished';
    state.endedReason = reason;

    // Sem isto a partida encerrava mas a sessão continuava ativa na tela da professora, e ela
    // teria de encerrar na mão uma sessão que o próprio prazo já tinha vencido.
    if (reason === 'tempo_sessao') {
      this.sessionRepository
        .update(
          { id: state.sessionId, isActive: true },
          { isActive: false, finished_at: new Date(), finished_reason: 'tempo' },
        )
        .catch((err) => console.error(`[Prisoner] Falha ao encerrar a sessão ${state.sessionId}:`, err));
    }

    if (notify) this.onSessionEnd?.(state);
    return state;
  }

  /** Chamado quando a professora encerra a sessão: sem isto, as partidas seguiriam vivas. */
  endMatchesOfSession(sessionId: string, reason: 'tempo_sessao' | 'sessao_encerrada'): number {
    let encerradas = 0;
    for (const state of this.activeMatches.values()) {
      if (state.sessionId !== sessionId || state.status !== 'in_progress') continue;
      this.endBySession(state, reason, true, true);
      encerradas++;
    }
    return encerradas;
  }

  private clearRoundTimer(state: PrisonerMatchState): void {
    if (state.roundTimer) {
      clearTimeout(state.roundTimer);
      state.roundTimer = null;
    }
    state.roundDeadline = null;
  }

  private resolveRound(
    state: PrisonerMatchState,
    timedOut?: { player1: boolean; player2: boolean },
  ): void {
    const c1 = state.pendingChoices.player1!;
    const c2 = state.pendingChoices.player2!;
    const [points1, points2] = PRISONER_PAYOFF[c1][c2];

    state.player1TotalPoints += points1;
    state.player2TotalPoints += points2;

    state.moves[String(state.currentRound)] = {
      player1Choice: c1,
      player2Choice: c2,
      player1Points: points1,
      player2Points: points2,
      ...(timedOut?.player1 ? { player1TimedOut: true } : {}),
      ...(timedOut?.player2 ? { player2TimedOut: true } : {}),
    };

    state.pendingChoices = {};
    state.lastResolvedRound = state.currentRound;

    if (state.currentRound >= state.totalRounds) {
      state.status = 'finished';
      state.endedReason = 'rodadas';
    } else {
      state.currentRound++;
    }
  }

  async finalizeMatch(matchId: string): Promise<Match> {
    const state = this.getState(matchId);
    this.clearRoundTimer(state);
    this.clearSessionTimer(state);

    const match = await this.matchRepository.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException(`Match ${matchId} not found`);

    match.moves = state.moves as any;
    match.status = MatchStatus.FINALIZADA;
    match.endedReason = state.endedReason ?? 'rodadas';
    match.interruptedRound = state.interruptedRound ?? null;
    const saved = await this.matchRepository.save(match);

    this.activeMatches.delete(matchId);
    return saved;
  }

  async getFinishedMatchPayload(matchId: string, playerId: string): Promise<{
    matchId: string;
    moves: Record<string, unknown>;
    finalScore: { player1: number; player2: number };
    endedReason: string;
    roundsPlayed: number;
    interruptedRound: number | null;
  } | null> {
    const match = await this.matchRepository.findOne({ where: { id: matchId } });
    if (!match || match.status !== MatchStatus.FINALIZADA) return null;
    if (match.player1_id !== playerId && match.player2_id !== playerId) return null;

    const moves = (match.moves ?? {}) as Record<
      string,
      { player1Points?: number; player2Points?: number }
    >;
    let player1 = 0;
    let player2 = 0;
    for (const move of Object.values(moves)) {
      player1 += move.player1Points ?? 0;
      player2 += move.player2Points ?? 0;
    }

    return {
      matchId,
      moves,
      finalScore: { player1, player2 },
      endedReason: match.endedReason ?? 'rodadas',
      roundsPlayed: Object.keys(moves).length,
      interruptedRound: match.interruptedRound ?? null,
    };
  }

  getState(matchId: string): PrisonerMatchState {
    const state = this.activeMatches.get(matchId);
    if (!state) {
      throw new NotFoundException(`No active prisoner match state for matchId ${matchId}`);
    }
    return state;
  }

  hasState(matchId: string): boolean {
    return this.activeMatches.has(matchId);
  }
}
