import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from '../match/match.entity';
import { RouletteController } from './roulette.controller';
import { RouletteService } from './roulette.service';
import { SessionModule } from '../session/session.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([Match]), SessionModule, MailModule],
  controllers: [RouletteController],
  providers: [RouletteService],
  exports: [RouletteService],
})
export class RouletteModule {}
