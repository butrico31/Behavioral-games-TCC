import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from './settings.entity';
import { SettingsGameRoulette } from './settings-game-roulette.entity';
import { SettingsGamePrisoner } from './settings-game-prisoner.entity';
import { CreateSettingsDto } from './dto/create-settings.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { GameService } from '../game/game.service';
import { GameType } from '../game/games.enum';
import { PLAYER_OPTIONAL_FIELDS } from '../common/constants/player-fields.constants';

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
      { name: 'popup', type: 'json|null' },
      { name: 'initMoney', type: 'number' },
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
      const rouletteSettings = this.settingsRouletteRepository.create({
        configName: dto.configName,
        game: dto.game,
        timeLimit: dto.timeLimit,
        pointsLimit: dto.pointsLimit,
        popup: dto.popup,
        initMoney: dto.initMoney,
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
      if (dto.timeLimit !== undefined) settings.timeLimit = dto.timeLimit;
      if (dto.pointsLimit !== undefined) settings.pointsLimit = dto.pointsLimit;
      if (dto.popup !== undefined) settings.popup = dto.popup;
      if (dto.initMoney !== undefined) settings.initMoney = dto.initMoney;
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
