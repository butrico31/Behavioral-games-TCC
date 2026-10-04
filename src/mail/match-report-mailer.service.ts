import { Injectable } from '@nestjs/common';
import { SessionService } from '../session/session.service';
import { MailService } from './mail.service';
import { MatchResultXlsxService } from './match-result-xlsx.service';
import type { MatchReportData } from './match-result-xlsx.service';
import {
  buildRouletteReport,
  type RouletteMatchResults,
} from '../roulette/report/roulette-report';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Gera a planilha de UMA partida e manda por e-mail. Usado pelo botão do professor
 * (POST /sessions/:id/matches/:matchId/report/email) e pelo envio automático no fim da roleta,
 * então os dois saem iguais. Escolhe o layout pelo jogo da sessão.
 */
@Injectable()
export class MatchReportMailer {
  constructor(
    private readonly sessionService: SessionService,
    private readonly mailService: MailService,
    private readonly matchResultXlsxService: MatchResultXlsxService,
  ) {}

  async send(sessionId: string, matchId: string, emails: string[]): Promise<void> {
    const results = await this.sessionService.getMatchResults(sessionId, matchId);
    const sessionLabel = results.session.session_name || results.session.inviteCode;

    const buffer =
      results.session.game === 'roulette'
        ? await this.matchResultXlsxService.generateRoulette(
            buildRouletteReport(results as unknown as RouletteMatchResults),
          )
        : await this.matchResultXlsxService.generate(results as unknown as MatchReportData);

    const filename = `relatorio-${sessionLabel}-partida.xlsx`.replace(/\s+/g, '-');

    await this.mailService.sendMail({
      to: emails,
      subject: `Relatório da partida: ${sessionLabel}`,
      text: `Segue em anexo o relatório da sua partida na sessão "${sessionLabel}" em formato Excel.`,
      html: `<p>Segue em anexo o relatório da sua partida na sessão <strong>${sessionLabel}</strong> em formato Excel.</p>`,
      attachments: [{ filename, content: buffer, contentType: XLSX_MIME }],
    });
  }
}
