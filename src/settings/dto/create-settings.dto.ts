import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsArray,
  IsIn,
  ArrayMaxSize,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GameType } from '../../game/games.enum';
import { Type } from 'class-transformer';
import { RoundPopupDto } from './round-popup.dto';
import { ROULETTE_TABLE_LAYOUTS, type RouletteTableLayout } from '../settings-game-roulette.entity';

class RoulettePopupDto {
  @ApiProperty({
    example: 'Mensagem do popup aparecer na tela',
    description: 'Popup message shown to selected players',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({
    example: 2,
    description: 'Number of players that should receive this popup',
  })
  @IsNumber()
  players: number;
}

export class CreateSettingsDto {
  @ApiProperty({
    example: 'Card Game Level 1 Configuration',
    description: 'Descriptive name of the configuration',
  })
  @IsNotEmpty()
  @IsString()
  configName: string;

  @ApiProperty({
    enum: GameType,
    example: 'cards',
    description: 'Game type (cards or roulette)',
  })
  @IsNotEmpty()
  @IsEnum(GameType)
  game: GameType;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the player can view points (Cards only)',
  })
  @IsOptional()
  @IsBoolean()
  userViewPoints?: boolean;

  @ApiPropertyOptional({
    example: 10,
    description: 'Session round limit (Cards only)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0) // 0 = não informado; o serviço aplica o default de 10 rodadas
  @Max(50)
  limitRounds?: number;

  @ApiPropertyOptional({
    example: 30,
    description: 'Time limit in seconds per round (Prisoner only). Null = no limit.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0) // 0 = sem limite; o serviço grava null
  @Max(600)
  roundTimeLimit?: number | null;

  @ApiPropertyOptional({
    example: 20,
    description: 'Tempo total da sessão em MINUTOS (Prisoner). 0/null = sem limite.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0) // 0 = sem limite; o serviço grava null
  @Max(480)
  sessionTimeLimit?: number | null;

  @ApiPropertyOptional({
    type: [RoundPopupDto],
    example: [{ round: 3, message: 'Pensem no grupo nesta rodada.' }],
    description: 'Popups exibidos ao jogador no início das rodadas indicadas (Roulette)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RoundPopupDto)
  roundPopups?: RoundPopupDto[] | null;

  @ApiPropertyOptional({
    enum: ROULETTE_TABLE_LAYOUTS,
    example: 'mesa1',
    description: 'Layout de mesa usado na partida (Roulette)',
  })
  @IsOptional()
  @IsIn(ROULETTE_TABLE_LAYOUTS)
  tableLayout?: RouletteTableLayout;


  @ApiPropertyOptional({
    example: 60,
    description: 'Time limit in seconds (Roulette only)',
  })
  @IsOptional()
  @IsNumber()
  timeLimit?: number;

  @ApiPropertyOptional({
    example: 500,
    description: 'Points limit (Roulette only)',
  })
  @IsOptional()
  @IsNumber()
  pointsLimit?: number;

  @ApiPropertyOptional({
    nullable: true,
    type: RoulettePopupDto,
    example: { message: 'Mensagem do popup aparecer na tela', players: 2 },
    description: 'Optional popup config, nullable (Roulette only)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RoulettePopupDto)
  popup?: RoulettePopupDto | null;

  @ApiPropertyOptional({
    example: 1000,
    description: 'Initial money amount for players (Roulette only)',
  })
  @IsOptional()
  @IsNumber()
  initMoney?: number;
}
