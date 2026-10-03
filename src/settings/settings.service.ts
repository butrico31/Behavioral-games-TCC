import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from './settings.entity';
import {
  SettingsGameRoulette,
  RouletteRoundPopup,
  ROULETTE_TABLE_LAYOUTS,
  DEFAULT_TABLE_LAYOUT,
} from './settings-game-roulette.entity';
import { SettingsGamePrisoner } from './settings-game-prisoner.entity';
import { CreateSettingsDto } from './dto/create-settings.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { GameService } from '../game/game.service';
import { GameType } from '../game/games.enum';
import { PLAYER_OPTIONAL_FIELDS } from '../common/constants/player-fields.constants';
import { DEFAULT_GOAL, DEFAULT_INIT_MONEY } from '../roulette/roulette.rules';

/** A partida acaba quando o saldo chega na meta: meta ≤ fichas iniciais acabaria no 1º giro. */
function assertGoalAboveStart(initMoney: number, pointsLimit: number) {
  if (pointsLimit <= initMoney) {
    throw new BadRequestException(
      `A meta (${pointsLimit}) precisa ser maior que as fichas iniciais (${initMoney}).`,
    );
  }
}

/**
 * Limpa os popups vindos do formulário: mensagem vazia é descartada (linha que o professor
 * adicionou e não preencheu) e rodada repetida é erro, em vez de uma das mensagens sumir.
 * A roleta não tem número fixo de rodadas, então não há teto além do limite do DTO.
 */
function normalizeRoundPopups(
  popups: RouletteRoundPopup[] | null | undefined,
): RouletteRoundPopup[] | null {
  if (!popups) return null;

  const cleaned = popups
    .map((popup) => ({ round: popup.round, message: popup.message.trim() }))
    .filter((popup) => popup.message !== '');

  const seen = new Set<number>();
  for (const popup of cleaned) {
    if (seen.has(popup.round)) {
      throw new BadRequestException(`Mais de um popup na rodada ${popup.round}.`);
    }
    seen.add(popup.round);
  }

  return cleaned.length > 0 ? cleaned.sort((a, b) => a.round - b.round) : null;
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Settings)
    private settingsRepository: Repository<Settings>,
    @InjectRepository(SettingsGameRoulette)
    private settingsRouletteRepository: Repository<SettingsGameRoulette>,
    @InjectRepository(SettingsGamePrisoner)
    private settingsPrisonerRepository: Repository<SettingsGamePrisoner>,
    private gameService: GameService,
  ) {}

  getValidPlayerFields(): string[] {
    return [...PLAYER_OPTIONAL_FIELDS];
  }

  getGameConfigFields(game?: 'roulette' | 'prisoner') {
    const common = [
      { name: 'configName', type: 'string' },
      { name: 'game', type: 'enum(GameType)' },
    ];

    const prisoner = [
      { name: 'userViewPoints', type: 'boolean' },
      { name: 'limitRounds', type: 'number' },
      { name: 'roundTimeLimit', type: 'number' },
      { name: 'sessionTimeLimit', type: 'number' },
    ];

    const roulette = [
      { name: 'timeLimit', type: 'number' },
      { name: 'pointsLimit', type: 'number' },
      { name: 'initMoney', type: 'number' },
      { name: 'tableLayout', type: `enum(${ROULETTE_TABLE_LAYOUTS.join(',')})` },
      { name: 'roundPopups', type: 'roundPopups' },
    ];

    if (game === 'prisoner') {
      return { common, prisoner };
    }

    if (game === 'roulette') {
      return { common, roulette };
    }

    return { common, prisoner, roulette };
  }

  async create(dto: CreateSettingsDto, gameType?: 'roulette' | 'prisoner'): Promise<Settings> {
    if (!this.gameService.isValidGameType(dto.game)) {
      throw new BadRequestException(`Invalid game type: ${dto.game}`);
    }

    if (!gameType) {
      const inferMap: Record<GameType, 'roulette' | 'prisoner'> = {
        [GameType.ROULETTE]: 'roulette',
        [GameType.PRISONER]: 'prisoner',
      };
      gameType = inferMap[dto.game];
    }

    let settings: Settings;

    if (gameType === 'roulette') {
      // Campo vazio no formulário chega como 0: fichas e meta caem no default da mesa,
      // tempo vira "sem limite".
      const initMoney = dto.initMoney && dto.initMoney > 0 ? dto.initMoney : DEFAULT_INIT_MONEY;
      const pointsLimit = dto.pointsLimit && dto.pointsLimit > 0 ? dto.pointsLimit : DEFAULT_GOAL;
      assertGoalAboveStart(initMoney, pointsLimit);
      const rouletteSettings = this.settingsRouletteRepository.create({
        configName: dto.configName,
        game: dto.game,
        timeLimit: dto.timeLimit && dto.timeLimit > 0 ? dto.timeLimit : null,
        pointsLimit,
        popup: dto.popup,
        initMoney,
        roundPopups: normalizeRoundPopups(dto.roundPopups),
        tableLayout: dto.tableLayout ?? DEFAULT_TABLE_LAYOUT,
      });
      settings = await this.settingsRouletteRepository.save(rouletteSettings);
    } else if (gameType === 'prisoner') {
      const prisonerSettings = this.settingsPrisonerRepository.create({
        configName: dto.configName,
        game: dto.game,
        userViewPoints: dto.userViewPoints ?? false,
        // Campo numérico vazio no formulário chega como 0, e `??` não cobre 0: em rodadas, 0
        // significa "não informado" (cai no default 10); em tempo, significa "sem limite".
        limitRounds: dto.limitRounds && dto.limitRounds > 0 ? dto.limitRounds : 10,
        roundTimeLimit: dto.roundTimeLimit && dto.roundTimeLimit > 0 ? dto.roundTimeLimit : null,
        sessionTimeLimit: dto.sessionTimeLimit && dto.sessionTimeLimit > 0 ? dto.sessionTimeLimit : null,
      });
      settings = await this.settingsPrisonerRepository.save(prisonerSettings);
    } else {
      throw new BadRequestException(`Invalid game type: ${gameType}`);
    }

    return settings;
  }

  async findAll(game?: GameType): Promise<Settings[]> {
    if (!game) {
      return this.settingsRepository.find({ relations: ['sessions'] });
    }

    return this.settingsRepository.find({
      where: { game },
      relations: ['sessions'],
    });
  }

  async findOne(id: string): Promise<Settings> {
    const settings = await this.settingsRepository.findOne({
      where: { id },
      relations: ['sessions'],
    });

    if (!settings) {
      throw new NotFoundException(`Settings with ID ${id} not found`);
    }

    return settings;
  }

  async findByGame(game: GameType): Promise<Settings[]> {
    return this.settingsRepository.find({
      where: { game },
      relations: ['sessions'],
    });
  }

  async update(id: string, dto: UpdateSettingsDto): Promise<Settings> {
    const settings = await this.findOne(id);

    if (dto.configName) settings.configName = dto.configName;

    if (settings instanceof SettingsGameRoulette) {
      if (dto.timeLimit !== undefined) {
        settings.timeLimit = dto.timeLimit && dto.timeLimit > 0 ? dto.timeLimit : null;
      }
      if (dto.pointsLimit !== undefined) {
        settings.pointsLimit = dto.pointsLimit > 0 ? dto.pointsLimit : DEFAULT_GOAL;
      }
      if (dto.popup !== undefined) settings.popup = dto.popup;
      if (dto.initMoney !== undefined) {
        settings.initMoney = dto.initMoney > 0 ? dto.initMoney : DEFAULT_INIT_MONEY;
      }
      assertGoalAboveStart(settings.initMoney, settings.pointsLimit);
      if (dto.roundPopups !== undefined) {
        settings.roundPopups = normalizeRoundPopups(dto.roundPopups);
      }
      if (dto.tableLayout !== undefined) settings.tableLayout = dto.tableLayout;
      return await this.settingsRouletteRepository.save(settings);
    } else if (settings instanceof SettingsGamePrisoner) {
      if (dto.userViewPoints !== undefined) settings.userViewPoints = dto.userViewPoints;
      // Mesma normalização do create: 0 em rodadas cai no default, 0 em tempo vira "sem limite".
      if (dto.limitRounds !== undefined) {
        settings.limitRounds = dto.limitRounds && dto.limitRounds > 0 ? dto.limitRounds : 10;
      }
      if (dto.roundTimeLimit !== undefined) {
        settings.roundTimeLimit = dto.roundTimeLimit && dto.roundTimeLimit > 0 ? dto.roundTimeLimit : null;
      }
      if (dto.sessionTimeLimit !== undefined) {
        settings.sessionTimeLimit =
          dto.sessionTimeLimit && dto.sessionTimeLimit > 0 ? dto.sessionTimeLimit : null;
      }
      return await this.settingsPrisonerRepository.save(settings);
    }

    return await this.settingsRepository.save(settings);
  }

  async remove(id: string): Promise<void> {
    const settings = await this.findOne(id);

    if (settings.sessions && settings.sessions.length > 0) {
      throw new BadRequestException('Cannot delete settings that have active sessions');
    }

    if (settings instanceof SettingsGameRoulette) {
      await this.settingsRouletteRepository.delete(id);
    } else if (settings instanceof SettingsGamePrisoner) {
      await this.settingsPrisonerRepository.delete(id);
    } else {
      await this.settingsRepository.delete(id);
    }
  }

  async createCopy(id: string, newConfigName?: string): Promise<Settings> {
    const original = await this.findOne(id);

    const copy = {
      ...original,
      id: undefined,
      configName: newConfigName || `${original.configName} (copy)`,
      createdAt: undefined,
    };

    if (original instanceof SettingsGameRoulette) {
      return await this.settingsRouletteRepository.save(copy);
    } else if (original instanceof SettingsGamePrisoner) {
      return await this.settingsPrisonerRepository.save(copy);
    }

    return await this.settingsRepository.save(copy);
  }
}
