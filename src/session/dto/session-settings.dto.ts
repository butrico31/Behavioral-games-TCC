import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsIn,
  ArrayMaxSize,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RoundPopupDto } from '../../settings/dto/round-popup.dto';
import {
  ROULETTE_TABLE_LAYOUTS,
  type RouletteTableLayout,
} from '../../settings/settings-game-roulette.entity';

class SessionRoulettePopupDto {
  @ApiProperty({
    example: 'Mensagem do popup aparecer na tela',
    description: 'Popup message shown to selected players',
  })
  @IsNotEmpty()
  @IsString()
  message!: string;

  @ApiProperty({
    example: 2,
    description: 'Number of players that should receive this popup',
  })
  @IsNumber()
  players!: number;
}

/**
 * DTO for session configurations
 * Can be extended with game-specific fields
 */
export class SessionSettingsDto {
  @ApiProperty({
    example: 'Card Game Configuration',
    description: 'Configuration name',
  })
  @IsNotEmpty()
  @IsString()
  configName!: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the player can view points (Cards)',
  })
  @IsOptional()
  @IsBoolean()
  userViewPoints?: boolean;

  @ApiPropertyOptional({
    example: 10,
    description: 'Session round limit (Cards)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0) // 0 = não informado; o serviço aplica o default de 10 rodadas
  @Max(50)
  limitRounds?: number;

  @ApiPropertyOptional({
    example: 30,
    description: 'Time limit in seconds per round (Prisoner). Null = no limit.',
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


  // Game-specific fields for Roulette (optional)
  @ApiPropertyOptional({
    example: 60,
    description: 'Time limit in seconds (Roulette)',
  })
  @IsOptional()
  @IsNumber()
  timeLimit?: number;

  @ApiPropertyOptional({
    example: 500,
    description: 'Points limit to finish a round/session (Roulette)',
  })
  @IsOptional()
  @IsNumber()
  pointsLimit?: number;

  @ApiPropertyOptional({
    nullable: true,
    type: SessionRoulettePopupDto,
    description:
      'Optional popup config. Use null or an object like {"message":"...","players":2} (Roulette)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SessionRoulettePopupDto)
  popup?: SessionRoulettePopupDto | null;

  @ApiPropertyOptional({
    example: 1000,
    description: 'Initial money balance for each player (Roulette)',
  })
  @IsOptional()
  @IsNumber()
  initMoney?: number;
}
