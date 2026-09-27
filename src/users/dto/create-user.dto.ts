import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const INSTITUTIONAL_EMAIL_PATTERN = /@fho\.edu\.br$/i;

export class CreateUserDto {
  @ApiProperty({
    example: 'João Silva',
    description: 'Full name of the user/teacher',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'joao.silva@fho.edu.br',
    description:
      'Institutional email (@fho.edu.br) used as login. A verification code is sent to it.',
  })
  @IsNotEmpty()
  @IsEmail()
  @Matches(INSTITUTIONAL_EMAIL_PATTERN, {
    message: 'login must be an institutional @fho.edu.br email',
  })
  login: string;

  @ApiProperty({
    example: 'senha123',
    description: 'Password (minimum 6 characters)',
  })
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
