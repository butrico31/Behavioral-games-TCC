import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Session } from '../session/session.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, nullable: false })
  name: string;

  @Column({ length: 100, unique: true, nullable: false })
  login: string;

  @Column({ nullable: false })
  password_hash: string;

  // Padrão true para contas criadas antes da verificação de e-mail continuarem entrando;
  // cadastros novos são salvos com false até o código ser confirmado.
  @Column({ type: 'boolean', default: true })
  email_verified: boolean;

  @Column({ type: 'varchar', nullable: true, select: false })
  verification_code_hash: string | null;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  verification_code_expires_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  verification_code_sent_at: Date | null;

  @Column({ type: 'int', default: 0, select: false })
  verification_attempts: number;

  //VERIFICAR DEPOIS
  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];

  @CreateDateColumn()
  created_at: Date;
}
