import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { RouletteReport } from '../roulette/report/roulette-report';

interface PrisonerMove {
  player1Choice: 'cooperate' | 'defect';
  player2Choice: 'cooperate' | 'defect';
  player1Points: number;
  player2Points: number;
}

export interface MatchReportPlayer {
  role: 'player1' | 'player2';
  educationLevel?: string;
  semester?: number;
  course?: string;
  age?: number;
  gender?: string;
  profession?: string;
}

export interface MatchReportData {
  session: {
    session_name?: string | null;
    game: string;
    inviteCode: string;
    inputInfo?: string[];
    createdBy?: { name?: string; login?: string };
  };
  players: MatchReportPlayer[];
  match: {
    id: string;
    created_at: Date | string;
    moves?: Record<string, PrisonerMove>;
  };
}

const PLAYER_FIELD_LABELS: Record<string, string> = {
  educationLevel: 'Escolaridade',
  semester: 'Semestre',
  course: 'Curso',
  age: 'Idade',
  gender: 'Gênero',
  profession: 'Profissão',
};

const NAVY = 'FF1F4E78';
const LIGHT_BLUE = 'FFD9E1F2';
const WHITE = 'FFFFFFFF';
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFD0D7E5' } },
  left: { style: 'thin', color: { argb: 'FFD0D7E5' } },
  bottom: { style: 'thin', color: { argb: 'FFD0D7E5' } },
  right: { style: 'thin', color: { argb: 'FFD0D7E5' } },
};

const CHOICE_LABEL: Record<'cooperate' | 'defect', string> = {
  cooperate: 'Cooperar',
  defect: 'Trair',
};

/**
 * Builds a single-sheet .xlsx that mirrors game-platform's MatchDetailPage.tsx
 * (the professor's "Detalhes da Partida" view): player cards with total score
 * and profile summary, then the rounds table with a Total row — no charts.
 */
@Injectable()
export class MatchResultXlsxService {
  async generate(data: MatchReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Behavioral Games Platform';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Partida');
    sheet.getColumn(1).width = 22;
    sheet.getColumn(2).width = 34;
    sheet.getColumn(3).width = 4;
    sheet.getColumn(4).width = 22;
    sheet.getColumn(5).width = 34;

    let row = this.writeHeader(sheet, data);
    row = this.writePlayerCards(sheet, data, row + 1);
    this.writeRoundsTable(sheet, data, row + 1);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Mesmo layout da partida do Prisioneiro, para a roleta: cabeçalho, cartões (jogador e
   * resultado) e a tabela de jogadas com a linha de Total. Os números vêm prontos do
   * buildRouletteReport (backend), iguais aos que a tela final do jogador mostra.
   */
  async generateRoulette(report: RouletteReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Behavioral Games Platform';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Partida');
    [10, 20, 16, 16, 12, 10, 16, 14, 12, 14, 44, 16].forEach((width, index) => {
      sheet.getColumn(index + 1).width = width;
    });

    // Cabeçalho
    sheet.mergeCells(1, 1, 1, 12);
    this.setCell(sheet, 1, 1, 'Detalhes da Partida', { bold: true, color: WHITE, size: 14, fill: NAVY });
    sheet.getRow(1).height = 26;
    sheet.mergeCells(2, 1, 2, 12);
    this.setCell(
      sheet,
      2,
      1,
      `Sessão: ${report.session.name}   ·   Jogo: Roleta   ·   Iniciada em: ${this.formatDate(report.match.startedAt)}`,
      { color: 'FF44546A' },
    );

    const { summary } = report;
    const card = (col: number, title: string, rows: Array<[string, ExcelJS.CellValue]>, start: number) => {
      let r = start;
      sheet.mergeCells(r, col, r, col + 3);
      this.setCell(sheet, r, col, title, { bold: true, color: WHITE, fill: NAVY });
      r++;
      for (const [label, value] of rows) {
        sheet.mergeCells(r, col, r, col + 1);
        this.setCell(sheet, r, col, label, { bold: true, fill: LIGHT_BLUE });
        sheet.mergeCells(r, col + 2, r, col + 3);
        this.setCell(sheet, r, col + 2, value);
        r++;
      }
      return r;
    };

    const playerRows: Array<[string, ExcelJS.CellValue]> = [
      ['Fichas finais', summary.finalCoins],
      ...report.player.fields.map((f): [string, ExcelJS.CellValue] => [f.label, f.value]),
    ];
    const resultRows: Array<[string, ExcelJS.CellValue]> = [
      ['Fichas iniciais', summary.initMoney],
      ['Meta', summary.goal],
      ['Resultado líquido', summary.netResult],
      ['Motivo do fim', report.match.endedReasonLabel],
      ['Quantidade de jogadas', summary.totalRounds],
      ['Vitórias / derrotas', `${summary.wins} / ${summary.losses}`],
      ['Taxa de acerto', `${Math.round(summary.winRate * 100)}%`],
      ['Total apostado', summary.totalBet],
      ['Aposta média', summary.averageBet],
      ['Maior / menor aposta', `${summary.maxBet} / ${summary.minBet}`],
      ['Tempo médio entre jogadas (s)', summary.averageSecondsBetween ?? '-'],
      ['Duração da partida (s)', report.match.durationSeconds ?? '-'],
      ['Maior sequência sem reforço', summary.longestUnreinforcedStreak],
      ['Popups exibidos', `${summary.popupsShown} de ${summary.popupsConfigured}`],
      ['Leitura média do popup (s)', summary.averagePopupReadSeconds ?? '-'],
    ];
    const endPlayer = card(1, 'Jogador', playerRows, 4);
    const endResult = card(6, 'Resultado', resultRows, 4);

    // Tabela de jogadas
    const startRow = Math.max(endPlayer, endResult) + 1;
    const headers = [
      'Rodada',
      'Horário',
      'Tempo desde a última (s)',
      'Condição apostada',
      'Aposta',
      'Casa',
      'Cor sorteada',
      'Resultado',
      'Variação',
      'Saldo após',
      'Popup antes da jogada',
      'Leitura do popup (s)',
    ];
    headers.forEach((header, index) => {
      this.setCell(sheet, startRow, index + 1, header, { bold: true, color: WHITE, fill: NAVY });
    });

    let row = startRow + 1;
    report.rounds.forEach((round, index) => {
      const fill = index % 2 === 1 ? 'FFF6F8FC' : undefined;
      const values: ExcelJS.CellValue[] = [
        round.round,
        round.playedAt ? this.formatTime(round.playedAt) : '-',
        round.secondsSinceLast ?? '-',
        round.opcaoLabel,
        round.aposta,
        round.pocket ?? '-',
        round.resultadoLabel ?? '-',
        round.won ? 'Ganhou' : 'Perdeu',
        round.delta,
        round.coinsAfter,
        round.popupMessage ?? '-',
        round.popupReadSeconds ?? '-',
      ];
      values.forEach((value, col) => this.setCell(sheet, row, col + 1, value, { fill }));
      row++;
    });

    if (report.rounds.length > 0) {
      const total: ExcelJS.CellValue[] = [
        'Total',
        '',
        summary.averageSecondsBetween !== null ? `média ${summary.averageSecondsBetween}` : '',
        '',
        summary.totalBet,
        '',
        '',
        `${summary.wins} vitórias`,
        summary.netResult,
        summary.finalCoins,
        `${summary.popupsShown} popups`,
        summary.averagePopupReadSeconds !== null ? `média ${summary.averagePopupReadSeconds}` : '',
      ];
      total.forEach((value, col) => this.setCell(sheet, row, col + 1, value, { bold: true, fill: LIGHT_BLUE }));
      row++;
    }

    // Popups configurados na sessão: o que apareceu, em qual rodada e quanto tempo ficou aberto.
    if (report.popups.length > 0) {
      row += 2;
      sheet.mergeCells(row, 1, row, 12);
      this.setCell(sheet, row, 1, 'Popups', { bold: true, color: WHITE, fill: NAVY });
      row++;
      const popupHeaders: Array<[number, number, string]> = [
        [1, 1, 'Rodada'],
        [2, 10, 'Mensagem'],
        [11, 11, 'Exibido'],
        [12, 12, 'Leitura (s)'],
      ];
      for (const [from, to, label] of popupHeaders) {
        if (to > from) sheet.mergeCells(row, from, row, to);
        this.setCell(sheet, row, from, label, { bold: true, fill: LIGHT_BLUE });
      }
      row++;
      for (const popup of report.popups) {
        this.setCell(sheet, row, 1, popup.round);
        sheet.mergeCells(row, 2, row, 10);
        this.setCell(sheet, row, 2, popup.message).alignment = { wrapText: true, vertical: 'top' };
        this.setCell(sheet, row, 11, popup.shown ? 'Sim' : 'Não chegou à rodada');
        this.setCell(sheet, row, 12, popup.readSeconds ?? '-');
        row++;
      }
    }

    sheet.autoFilter = { from: { row: startRow, column: 1 }, to: { row: startRow, column: headers.length } };
    sheet.views = [{ state: 'frozen', ySplit: startRow }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private formatTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  private setCell(
    sheet: ExcelJS.Worksheet,
    row: number,
    col: number,
    value: ExcelJS.CellValue,
    opts?: { bold?: boolean; fill?: string; color?: string; size?: number },
  ): ExcelJS.Cell {
    const cell = sheet.getCell(row, col);
    cell.value = value;
    cell.border = BORDER;
    if (opts?.bold || opts?.color || opts?.size) {
      cell.font = {
        bold: !!opts.bold,
        color: opts.color ? { argb: opts.color } : undefined,
        size: opts.size,
      };
    }
    if (opts?.fill) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: opts.fill },
      };
    }
    return cell;
  }

  private writeHeader(sheet: ExcelJS.Worksheet, data: MatchReportData): number {
    const { session, match } = data;

    sheet.mergeCells(1, 1, 1, 5);
    this.setCell(sheet, 1, 1, 'Detalhes da Partida', {
      bold: true,
      color: WHITE,
      size: 14,
      fill: NAVY,
    });
    sheet.getRow(1).height = 26;

    const subtitle = `Sessão: ${session.session_name || session.inviteCode}   ·   Jogo: ${session.game}   ·   Iniciada em: ${this.formatDate(match.created_at)}`;
    sheet.mergeCells(2, 1, 2, 5);
    this.setCell(sheet, 2, 1, subtitle, { color: 'FF44546A' });

    return 2;
  }

  private writePlayerCards(
    sheet: ExcelJS.Worksheet,
    data: MatchReportData,
    startRow: number,
  ): number {
    const totals = this.computeTotals(data.match.moves ?? {});
    const player1 = data.players.find((p) => p.role === 'player1');
    const player2 = data.players.find((p) => p.role === 'player2');

    const requestedFields = (data.session.inputInfo ?? []).filter(
      (field) => field in PLAYER_FIELD_LABELS,
    );

    const columns: Array<
      [number, MatchReportPlayer | undefined, number, string]
    > = [
      [1, player1, totals.player1, 'Jogador 1'],
      [4, player2, totals.player2, 'Jogador 2'],
    ];

    let maxRow = startRow;

    for (const [col, player, total, label] of columns) {
      let r = startRow;
      sheet.mergeCells(r, col, r, col + 1);
      this.setCell(sheet, r, col, label, {
        bold: true,
        color: WHITE,
        fill: NAVY,
      });
      r++;

      this.setCell(sheet, r, col, 'Pontuação total', {
        bold: true,
        fill: LIGHT_BLUE,
      });
      this.setCell(sheet, r, col + 1, total);
      r++;

      if (requestedFields.length > 0) {
        this.setCell(sheet, r, col, 'Resumo', { bold: true, fill: LIGHT_BLUE });
        this.setCell(
          sheet,
          r,
          col + 1,
          this.summarize(player, requestedFields),
        );
        r++;
      }

      for (const field of requestedFields) {
        const value = player?.[field as keyof MatchReportPlayer];
        this.setCell(sheet, r, col, PLAYER_FIELD_LABELS[field], {
          bold: true,
          fill: LIGHT_BLUE,
        });
        this.setCell(
          sheet,
          r,
          col + 1,
          value === undefined || value === null || value === '' ? '-' : value,
        );
        r++;
      }

      maxRow = Math.max(maxRow, r);
    }

    return maxRow;
  }

  private writeRoundsTable(
    sheet: ExcelJS.Worksheet,
    data: MatchReportData,
    startRow: number,
  ): void {
    const headers = [
      'Rodada',
      'Jogador 1 – Escolha',
      'Jogador 1 – Pontos',
      'Jogador 2 – Escolha',
      'Jogador 2 – Pontos',
    ];
    headers.forEach((header, index) => {
      this.setCell(sheet, startRow, index + 1, header, {
        bold: true,
        color: WHITE,
        fill: NAVY,
      });
    });

    const moves = data.match.moves ?? {};
    const rounds = Object.keys(moves).sort((a, b) => Number(a) - Number(b));

    let row = startRow + 1;
    let totalPoints1 = 0;
    let totalPoints2 = 0;

    rounds.forEach((round, index) => {
      const move = moves[round];
      totalPoints1 += move.player1Points ?? 0;
      totalPoints2 += move.player2Points ?? 0;

      const isEven = index % 2 === 1;
      const fill = isEven ? 'FFF6F8FC' : undefined;

      this.setCell(sheet, row, 1, Number(round), { fill });
      this.setCell(sheet, row, 2, CHOICE_LABEL[move.player1Choice], { fill });
      this.setCell(sheet, row, 3, move.player1Points ?? 0, { fill });
      this.setCell(sheet, row, 4, CHOICE_LABEL[move.player2Choice], { fill });
      this.setCell(sheet, row, 5, move.player2Points ?? 0, { fill });
      row++;
    });

    if (rounds.length > 0) {
      this.setCell(sheet, row, 1, 'Total', { bold: true, fill: LIGHT_BLUE });
      this.setCell(sheet, row, 2, '', { fill: LIGHT_BLUE });
      this.setCell(sheet, row, 3, totalPoints1, {
        bold: true,
        fill: LIGHT_BLUE,
      });
      this.setCell(sheet, row, 4, '', { fill: LIGHT_BLUE });
      this.setCell(sheet, row, 5, totalPoints2, {
        bold: true,
        fill: LIGHT_BLUE,
      });
    }

    sheet.autoFilter = {
      from: { row: startRow, column: 1 },
      to: { row: startRow, column: 5 },
    };
    sheet.views = [{ state: 'frozen', ySplit: startRow }];
  }

  private computeTotals(moves: Record<string, PrisonerMove>): {
    player1: number;
    player2: number;
  } {
    let player1 = 0;
    let player2 = 0;
    for (const move of Object.values(moves)) {
      player1 += move.player1Points ?? 0;
      player2 += move.player2Points ?? 0;
    }
    return { player1, player2 };
  }

  private summarize(
    player: MatchReportPlayer | undefined,
    requestedFields: string[],
  ): string {
    if (!player) return '-';
    const parts: string[] = [];
    if (requestedFields.includes('educationLevel') && player.educationLevel) {
      parts.push(player.educationLevel);
    }
    if (
      requestedFields.includes('semester') &&
      player.semester !== null &&
      player.semester !== undefined
    ) {
      parts.push(`${player.semester}º semestre`);
    }
    if (requestedFields.includes('course') && player.course)
      parts.push(player.course);
    if (requestedFields.includes('profession') && player.profession)
      parts.push(player.profession);
    return parts.length > 0 ? parts.join(' · ') : '-';
  }

  private formatDate(value: string | Date | null | undefined): string {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return (
      date.toLocaleDateString('pt-BR') +
      ' ' +
      date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    );
  }
}
