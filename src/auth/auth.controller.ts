import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login-auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticates a user and returns JWT token for API access',
  })
  @ApiResponse({
    status: 201,
    description: 'Login successful',
    example: {
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      user: {
        id: 'ab5d10f7-8522-498c-a585-97cdc9d0956d',
        name: 'João Silva',
        login: 'joao.silva',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid login or password',
  })
  @ApiResponse({
    status: 401,
    description: 'Incorrect credentials',
  })
  @ApiResponse({
    status: 403,
    description: 'Email not verified yet - confirm the code sent at registration',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.login, dto.password);
  }
}
