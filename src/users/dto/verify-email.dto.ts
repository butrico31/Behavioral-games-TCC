import { IsEmail, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'joao.silva@fho.edu.br',
    description: 'Email (login) of the account being verified',
  })
  @IsEmail()
  login: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit code sent by email',
  })
  @Matches(/^\d{6}$/, { message: 'code must have 6 digits' })
  code: string;
}
