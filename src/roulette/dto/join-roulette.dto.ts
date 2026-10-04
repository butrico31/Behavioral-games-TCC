import { IsEmail, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class JoinRouletteDto {
  @ApiPropertyOptional({
    example: 'aluno@exemplo.com',
    description:
      'E-mail para receber o relatório da partida quando ela terminar. Fica só em memória, não é gravado.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}
