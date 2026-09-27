import { Module } from '@nestjs/common';
import { SessionModule } from '../session/session.module';
import { MailController } from './mail.controller';
import { MailSenderModule } from './mail-sender.module';
import { ReportXlsxService } from './report-xlsx.service';
import { MatchResultXlsxService } from './match-result-xlsx.service';

@Module({
  imports: [SessionModule, MailSenderModule],
  controllers: [MailController],
  providers: [ReportXlsxService, MatchResultXlsxService],
  exports: [MailSenderModule, ReportXlsxService, MatchResultXlsxService],
})
export class MailModule {}
