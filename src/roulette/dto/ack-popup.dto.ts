import { IsInt, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AckPopupDto {
  @ApiProperty({ example: 'uuid-do-player', description: 'ID do jogador' })
  @IsUUID()
  playerId: string;

  @ApiProperty({ example: 3, description: 'Rodada do popup que foi fechado' })
  @IsInt()
  @Min(1)
  round: number;
}
