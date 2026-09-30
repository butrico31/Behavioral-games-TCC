import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { GameType } from '../game/games.enum';
import { Settings } from '../settings/settings.entity';
import { User } from '../users/user.entity';
import { Player } from '../player/player.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  session_name?: string;

  @Column({ type: 'enum', enum: GameType, nullable: false })
  game: GameType;

  @ManyToOne(() => Settings, (settings) => settings.sessions, { nullable: false, eager: true })
  @JoinColumn({ name: 'settings_id' })
  settings: Settings;
  @Column({ nullable: false })
  settings_id: string;

  @Column({ type: 'varchar', length: 10, unique: true, nullable: false })
  inviteCode: string;

  @Column({ type: 'simple-array', nullable: true })
  inputInfo?: string[];

  @ManyToOne(() => User, (user) => user.sessions, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;
  @Column({ nullable: false })
  user_id: string;

  @OneToMany(() => Player, (player) => player.session, { cascade: true })
  players: Player[];

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  finished_at?: Date;

  /** Relogio da sessao: gravado quando o PRIMEIRO jogador entra, se a configuracao tiver tempo. */
  @Column({ type: 'timestamptz', nullable: true })
  started_at?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at?: Date;

  /** 'professor' | 'tempo' */
  @Column({ type: 'varchar', length: 24, nullable: true })
  finished_reason?: string;

  @DeleteDateColumn()
  deleted_at?: Date;
}
