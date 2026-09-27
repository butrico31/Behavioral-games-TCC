import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

// Só o envio de e-mail, sem o controller de relatórios: assim o UsersModule pode usá-lo
// sem criar o ciclo UsersModule -> MailModule -> SessionModule -> UsersModule.
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailSenderModule {}
