import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create new user',
    description:
      'Creates a new user (teacher/administrator). The login must be an institutional @fho.edu.br email; ' +
      'a 6-digit verification code is sent to it and login stays blocked until the email is verified.',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully and verification code sent',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid data or email outside @fho.edu.br',
  })
  @ApiResponse({
    status: 409,
    description: 'Login already exists',
  })
  @ApiResponse({
    status: 500,
    description: 'Verification email could not be sent (user is not created)',
  })
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Post('verify-email')
  @ApiOperation({
    summary: 'Verify user email',
    description:
      'Confirms the 6-digit code emailed at registration. The code expires in 15 minutes and ' +
      'accepts at most 5 wrong attempts.',
  })
  @ApiResponse({ status: 201, description: 'Email verified', example: { verified: true } })
  @ApiResponse({ status: 400, description: 'Invalid code' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already verified' })
  @ApiResponse({ status: 410, description: 'Code expired - request a new one' })
  @ApiResponse({ status: 429, description: 'Too many wrong attempts - request a new code' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.service.verifyEmail(dto.login, dto.code);
  }

  @Post('resend-verification')
  @ApiOperation({
    summary: 'Resend verification code',
    description: 'Sends a new 6-digit code to an unverified account (at most once per minute).',
  })
  @ApiResponse({ status: 201, description: 'New code sent', example: { sent: true } })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already verified' })
  @ApiResponse({ status: 429, description: 'A code was sent less than a minute ago' })
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.service.resendVerificationCode(dto.login);
  }

  @Get()
  @ApiOperation({
    summary: 'List all users',
    description: 'Returns list of all users in the system',
  })
  @ApiResponse({
    status: 200,
    description: 'Users list returned successfully',
  })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user details',
    description: 'Returns complete information of a specific user',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'ab5d10f7-8522-498c-a585-97cdc9d0956d',
  })
  @ApiResponse({
    status: 200,
    description: 'User found',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update user',
    description: 'Updates information of an existing user',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'ab5d10f7-8522-498c-a585-97cdc9d0956d',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @UseGuards(AuthGuard('jwt'))
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete user',
    description: 'Removes a user from the system',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'ab5d10f7-8522-498c-a585-97cdc9d0956d',
  })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
