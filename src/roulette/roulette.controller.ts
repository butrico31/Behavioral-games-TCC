import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RouletteService } from './roulette.service';
import { SpinRouletteDto } from './dto/spin-roulette.dto';
import { JoinRouletteDto } from './dto/join-roulette.dto';
import { AckPopupDto } from './dto/ack-popup.dto';
import type { RouletteMatchView, RouletteSpinResult } from './interfaces/roulette-match.interface';
import type { RouletteReport } from './report/roulette-report';

@ApiTags('Roulette')
@ApiBearerAuth()
@Controller('roulette/matches')
export class RouletteController {
  constructor(private readonly rouletteService: RouletteService) {}

  @Post(':matchId/join')
  @ApiOperation({
    summary: 'Start/resume a roulette match',
    description: 'Initializes the in-memory roulette state for a match (idempotent).',
  })
  @ApiParam({ name: 'matchId', description: 'Match ID' })
  async join(
    @Param('matchId') matchId: string,
    @Query('playerId') playerId: string,
    @Body() body: JoinRouletteDto,
  ): Promise<RouletteMatchView> {
    const state = await this.rouletteService.initMatch(matchId, playerId, body?.email);
    return this.rouletteService.toView(state);
  }

  @Post(':matchId/spin')
  @ApiOperation({
    summary: 'Spin the roulette',
    description:
      'Resolves one betting round. The winning color returned to the frontend.',
  })
  @ApiParam({ name: 'matchId', description: 'Match ID' })
  @ApiResponse({ status: 201, description: 'Spin resolved' })
  async spin(
    @Param('matchId') matchId: string,
    @Body() body: SpinRouletteDto,
  ): Promise<RouletteSpinResult> {
    return await this.rouletteService.spin(matchId, body.playerId, body.opcao, body.aposta);
  }

  @Get(':matchId/state')
  @ApiOperation({ summary: 'Get current roulette match state' })
  @ApiParam({ name: 'matchId', description: 'Match ID' })
  getState(@Param('matchId') matchId: string): RouletteMatchView {
    return this.rouletteService.toView(this.rouletteService.getState(matchId));
  }

  @Post(':matchId/finish')
  @ApiOperation({
    summary: 'Finalize a roulette match',
    description:
      'Persists the moves and marks the match as finalizada. The reason (tempo/jogador) is decided by the server.',
  })
  @ApiParam({ name: 'matchId', description: 'Match ID' })
  async finish(@Param('matchId') matchId: string): Promise<RouletteMatchView> {
    return await this.rouletteService.finalizeMatch(matchId);
  }

  @Post(':matchId/popup/ack')
  @ApiOperation({
    summary: 'Jogador fechou o popup da rodada',
    description: 'O servidor mede o tempo de leitura (entrega → fechamento) e grava na jogada daquela rodada.',
  })
  @ApiParam({ name: 'matchId', description: 'Match ID' })
  ackPopup(@Param('matchId') matchId: string, @Body() body: AckPopupDto): { ok: true } {
    this.rouletteService.acknowledgePopup(matchId, body.playerId, body.round);
    return { ok: true };
  }

  @Get(':matchId/report')
  @ApiOperation({
    summary: 'Relatório da partida encerrada',
    description:
      'Resumo e jogadas (tempo desde a última, aposta, saldo…) calculados no servidor — os mesmos ' +
      'números da planilha enviada por e-mail — e o status desse envio.',
  })
  @ApiParam({ name: 'matchId', description: 'Match ID' })
  async report(
    @Param('matchId') matchId: string,
    @Query('playerId') playerId: string,
  ): Promise<RouletteReport> {
    return await this.rouletteService.getReport(matchId, playerId);
  }
}
