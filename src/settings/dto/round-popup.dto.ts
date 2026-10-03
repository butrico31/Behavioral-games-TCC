import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const ROUND_POPUP_MESSAGE_MAX = 280;

export class RoundPopupDto {
  @ApiProperty({ example: 3, description: 'Rodada em que o popup aparece (1 = primeira)' })
  @IsInt()
  @Min(1)
  @Max(500)
  round!: number;

  @ApiProperty({
    example: 'Atenção: a partir de agora pense no grupo.',
    description: 'Mensagem exibida ao jogador no início da rodada',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(ROUND_POPUP_MESSAGE_MAX)
  message!: string;
}
