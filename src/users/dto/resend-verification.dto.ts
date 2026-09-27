import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendVerificationDto {
  @ApiProperty({
    example: 'joao.silva@fho.edu.br',
    description: 'Email (login) of the account that should receive a new code',
  })
  @IsEmail()
  login: string;
}
