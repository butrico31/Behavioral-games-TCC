import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './session.entity';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { GameModule } from '../game/game.module';
import { SettingsModule } from '../settings/settings.module';
import { UsersModule } from '../users/users.module';
import { Player } from '../player/player.entity';
import { Match } from '../match/match.entity';
import { PrisonerModule } from '../prisoner/prisoner.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Player, Match]),
    GameModule,
    SettingsModule,
    UsersModule,
    PrisonerModule,
  ],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
