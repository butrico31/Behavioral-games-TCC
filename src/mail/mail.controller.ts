import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SessionService } from '../session/session.service';
import { MailService } from './mail.service';
import { ReportXlsxService } from './report-xlsx.service';
import { MatchReportMailer } from './match-report-mailer.service';
import { SendReportEmailDto } from './dto/send-report-email.dto';
import type { SessionReportData } from './report-xlsx.service';

@ApiTags('Mail')
@ApiBearerAuth()
@Controller('sessions/:id')
export class MailController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly mailService: MailService,
    private readonly reportXlsxService: ReportXlsxService,
    private readonly matchReportMailer: MatchReportMailer,
  ) {}

  @Post('report/email')
  @ApiOperation({
    summary: 'Email the full session report as an .xlsx file',
    description:
      'Generates the report for the whole session (every player, every match) as an Excel ' +
      "spreadsheet and sends it by email. Intended for the professor's use (e.g. from the " +
      'Reports page).',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiBody({ type: SendReportEmailDto })
  @ApiResponse({
    status: 201,
    description: 'Report generated and email(s) sent',
  })
  @ApiResponse({ status: 400, description: 'No recipient email provided' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async emailSessionReport(
    @Param('id') id: string,
    @Body() dto: SendReportEmailDto,
  ) {
    const emails = this.requireEmails(dto);
    const report = (await this.sessionService.getReport(
      id,
    )) as unknown as SessionReportData;
    const buffer = await this.reportXlsxService.generateSessionReport(report);

    const sessionLabel =
      report.session.session_name || report.session.inviteCode;
    const filename = `relatorio-${sessionLabel}.xlsx`.replace(/\s+/g, '-');

    await this.mailService.sendMail({
      to: emails,
      subject: `Relatório da sessão: ${sessionLabel}`,
      text: `Segue em anexo o relatório da sessão "${sessionLabel}" em formato Excel.`,
      html: `<p>Segue em anexo o relatório da sessão <strong>${sessionLabel}</strong> em formato Excel.</p>`,
      attachments: [
        {
          filename,
          content: buffer,
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    });

    return { sent: true, recipients: emails };
  }

  @Post('matches/:matchId/report/email')
  @ApiOperation({
    summary: 'Email one match report as an .xlsx file',
    description:
      "Generates a report for a single match — mirroring game-platform's MatchDetailPage " +
      '("Detalhes da Partida"): both players\' totals/profile and the rounds table with a Total ' +
      'row — as an Excel spreadsheet and sends it by email. The recipient list is given directly ' +
      'in the request (e.g. the email a player typed at the start of the match) and is not ' +
      'stored anywhere on the server.',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiParam({ name: 'matchId', description: 'Match ID' })
  @ApiBody({ type: SendReportEmailDto })
  @ApiResponse({
    status: 201,
    description: 'Report generated and email(s) sent',
  })
  @ApiResponse({ status: 400, description: 'No recipient email provided' })
  @ApiResponse({ status: 404, description: 'Session or match not found' })
  async emailMatchResult(
    @Param('id') id: string,
    @Param('matchId') matchId: string,
    @Body() dto: SendReportEmailDto,
  ) {
    const emails = this.requireEmails(dto);
    await this.matchReportMailer.send(id, matchId, emails);
    return { sent: true, recipients: emails };
  }

  private requireEmails(dto: SendReportEmailDto): string[] {
    const emails = Array.from(new Set(dto.emails ?? []));

    if (emails.length === 0) {
      throw new BadRequestException(
        'At least one recipient email must be provided',
      );
    }

    return emails;
  }
}
