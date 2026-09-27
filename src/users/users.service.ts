import {
  Injectable,
  BadRequestException,
  ConflictException,
  GoneException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';

import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { MailService } from '../mail/mail.service';

const VERIFICATION_CODE_TTL_MINUTES = 15;
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
const VERIFICATION_MAX_ATTEMPTS = 5;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existingUser = await this.repository.findOne({
      where: { login: dto.login },
    });

    if (existingUser) {
      throw new ConflictException('Login already exists');
    }

    const password_hash = await bcrypt.hash(dto.password, 10);

    const user = this.repository.create({
      name: dto.name,
      login: dto.login,
      password_hash,
      email_verified: false,
    });

    const savedUser = await this.repository.save(user);

    // Sem o código a conta não consegue entrar; se o e-mail não sair, desfaz o cadastro
    // para a pessoa poder tentar de novo com o mesmo e-mail.
    try {
      await this.sendVerificationCode(savedUser);
    } catch (error) {
      await this.repository.delete(savedUser.id);
      throw error;
    }

    // Relê do banco para a resposta não trazer os campos do código (select: false).
    return await this.repository.findOneByOrFail({ id: savedUser.id });
  }

  async verifyEmail(login: string, code: string): Promise<{ verified: true }> {
    const user = await this.findWithVerificationCode(login);

    if (user.email_verified) {
      throw new ConflictException('Email already verified');
    }

    if (!user.verification_code_hash || !user.verification_code_expires_at) {
      throw new BadRequestException('Invalid verification code');
    }

    if (user.verification_attempts >= VERIFICATION_MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many attempts, request a new code',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (user.verification_code_expires_at.getTime() < Date.now()) {
      throw new GoneException('Verification code expired');
    }

    const codeMatch = await bcrypt.compare(code, user.verification_code_hash);

    if (!codeMatch) {
      await this.repository.increment({ id: user.id }, 'verification_attempts', 1);
      throw new BadRequestException('Invalid verification code');
    }

    await this.repository.update(user.id, {
      email_verified: true,
      verification_code_hash: null,
      verification_code_expires_at: null,
      verification_attempts: 0,
    });

    return { verified: true };
  }

  async resendVerificationCode(login: string): Promise<{ sent: true }> {
    const user = await this.findWithVerificationCode(login);

    if (user.email_verified) {
      throw new ConflictException('Email already verified');
    }

    const lastSentAt = user.verification_code_sent_at?.getTime() ?? 0;
    const waitMs = lastSentAt + VERIFICATION_RESEND_COOLDOWN_MS - Date.now();

    if (waitMs > 0) {
      throw new HttpException(
        `Wait ${Math.ceil(waitMs / 1000)}s before requesting a new code`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.sendVerificationCode(user);

    return { sent: true };
  }

  async findAll(): Promise<User[]> {
    return await this.repository.find();
  }

  async findOne(id: string): Promise<User> {
   const  user = await this.repository.findOne({ where: { id } });
    console.log(User)
    if (!user){
      throw new NotFoundException('User not exists')
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if (!user){
      throw new NotFoundException('User not exists');
    }

    if (dto.name) user.name = dto.name;
    if (dto.login) {
      const existingLogin = await this.repository.findOne({
        where: { login: dto.login },
      });
      if (existingLogin && existingLogin.id !== id) {
        throw new ConflictException('Login already exists');
      }
      user.login = dto.login;
    }
    if (dto.password) {
      user.password_hash = await bcrypt.hash(dto.password, 10);
    }

    return await this.repository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);

    if (!user) {
      throw new NotFoundException('User not exists')
    }

    await this.repository.delete(id);
  }

  async findByLogin(login: string): Promise<User> {

    const user = await this.repository.findOne({ where: { login } });

    if (!user) {
      throw new NotFoundException('User not exists')
    }

    return user
  }

  private async findWithVerificationCode(login: string): Promise<User> {
    const user = await this.repository
      .createQueryBuilder('u')
      .addSelect([
        'u.verification_code_hash',
        'u.verification_code_expires_at',
        'u.verification_code_sent_at',
        'u.verification_attempts',
      ])
      .where('u.login = :login', { login })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not exists');
    }

    return user;
  }

  // O e-mail sai antes de gravar o código: se o envio falhar, o código anterior continua valendo.
  private async sendVerificationCode(user: User): Promise<void> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');

    await this.mailService.sendMail({
      to: [user.login],
      subject: 'Código de verificação - BehaviorLab',
      text:
        `Seu código de verificação do BehaviorLab é ${code}.\n` +
        `Ele expira em ${VERIFICATION_CODE_TTL_MINUTES} minutos.\n\n` +
        'Se você não criou uma conta no BehaviorLab, ignore este e-mail.',
      html:
        '<p>Seu código de verificação do BehaviorLab é:</p>' +
        `<p style="font-size:24px;font-weight:bold;letter-spacing:6px">${code}</p>` +
        `<p>Ele expira em ${VERIFICATION_CODE_TTL_MINUTES} minutos.</p>` +
        '<p>Se você não criou uma conta no BehaviorLab, ignore este e-mail.</p>',
    });

    await this.repository.update(user.id, {
      verification_code_hash: await bcrypt.hash(code, 10),
      verification_code_expires_at: new Date(
        Date.now() + VERIFICATION_CODE_TTL_MINUTES * 60 * 1000,
      ),
      verification_code_sent_at: new Date(),
      verification_attempts: 0,
    });
  }
}
