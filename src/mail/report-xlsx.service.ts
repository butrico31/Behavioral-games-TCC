import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';

/**
 * Shape returned by SessionService.getReport()/getSessionResults().
 * Kept loose on purpose so this service does not depend on session internals.
 */
export interface SessionReportData {
  session: {
    id: string;
    session_name?: string | null;
    game: string;
    inviteCode: string;
    isActive: boolean;
    inputInfo?: string[];
    settings?: object;
    createdBy?: { name?: string; login?: string };
    created_at: Date | string;
    finished_at?: Date | string | null;
  };
  players: Array<Record<string, unknown>>;
  matches: Array<{
    id: string;
    player1_id: string;
    player2_id?: string | null;
    status: string;
    matchTime?: number | null;
    moves?: Record<string, Record<string, unknown>>;
    created_at: Date | string;
  }>;
}

const PLAYER_FIELD_LABELS: Record<string, string> = {
  educationLevel: 'Escolaridade',
  semester: 'Semestre',
  course: 'Curso',
  age: 'Idade',
  gender: 'Gênero',
  profession: 'Profissão',
};

const CHOICE_LABELS: Record<string, string> = {
  cooperate: 'Cooperar',
  defect: 'Trair',
};

const SETTINGS_LABELS: Record<string, string> = {
  configName: 'Configuração',
  userViewPoints: 'Jogador vê pontuação',
  limitRounds: 'Limite de rodadas',
  roundTimeLimit: 'Tempo por rodada (s)',
  sessionTimeLimit: 'Tempo total da sessão (min)',
};

const NAVY = 'FF1F4E78';
const LIGHT_BLUE = 'FFD9E1F2';
const WHITE = 'FFFFFFFF';
const THIN_GRAY_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFD0D7E5' } },
  left: { style: 'thin', color: { argb: 'FFD0D7E5' } },
  bottom: { style: 'thin', color: { argb: 'FFD0D7E5' } },
  right: { style: 'thin', color: { argb: 'FFD0D7E5' } },
};

@Injectable()
export class ReportXlsxService {
  async generateSessionReport(data: SessionReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Behavioral Games Platform';
    workbook.created = new Date();

    const playerLabels = this.buildPlayerLabels(data);

    this.buildSummarySheet(workbook, data);
    this.buildPlayersSheet(workbook, data, playerLabels);
    this.buildMatchesSheet(workbook, data, playerLabels);
    this.buildRoundsSheet(workbook, data);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /** Maps player id -> a short, readable label ("Jogador 1", "Jogador 2", ...) used across sheets instead of raw UUIDs. */
  private buildPlayerLabels(data: SessionReportData): Map<string, string> {
    const labels = new Map<string, string>();
    data.players.forEach((player, index) => {
      labels.set(player.id as string, `Jogador ${index + 1}`);
    });
    return labels;
  }

  private labelFor(labels: Map<string, string>, id?: string | null): string {
    if (!id) return '-';
    return labels.get(id) ?? id;
  }

  /** Sums points scored by each player across every match in `data` (mirrors the web report's "Pontuação total"). */
  private computePlayerTotals(data: SessionReportData): Map<string, number> {
    const totals = new Map<string, number>();

    for (const match of data.matches) {
      const moves = match.moves ?? {};
      for (const move of Object.values(moves)) {
        if (match.player1_id) {
          const current = totals.get(match.player1_id) ?? 0;
          totals.set(
            match.player1_id,
            current + Number(move.player1Points ?? 0),
          );
        }
        if (match.player2_id) {
          const current = totals.get(match.player2_id) ?? 0;
          totals.set(
            match.player2_id,
            current + Number(move.player2Points ?? 0),
          );
        }
      }
    }

    return totals;
  }

  /** Joins the player's known optional fields into one line, mirroring format_player_summary() on the web report. */
  private summarize(player: Record<string, unknown>): string {
    const parts: string[] = [];
    if (player.educationLevel) parts.push(player.educationLevel as string);
    if (player.semester !== null && player.semester !== undefined) {
      parts.push(`${player.semester as number}º semestre`);
    }
    if (player.course) parts.push(player.course as string);
    if (player.profession) parts.push(player.profession as string);
    return parts.length > 0 ? parts.join(' · ') : '-';
  }

  // ---------- styling helpers ----------

  private addTitleBanner(
    sheet: ExcelJS.Worksheet,
    title: string,
    columnSpan: number,
  ): void {
    sheet.mergeCells(1, 1, 1, columnSpan);
    const cell = sheet.getCell(1, 1);
    cell.value = title;
    cell.font = { bold: true, size: 14, color: { argb: WHITE } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    sheet.getRow(1).height = 26;
  }

  private styleTableHeader(row: ExcelJS.Row): void {
    row.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: WHITE } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: NAVY },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = THIN_GRAY_BORDER;
    });
    row.height = 20;
  }

  private styleDataRows(sheet: ExcelJS.Worksheet, firstDataRow: number): void {
    for (let i = firstDataRow; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const isEmphasized = row.font?.bold === true;
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = THIN_GRAY_BORDER;
        if (i % 2 === 0 && !isEmphasized) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF6F8FC' },
          };
        }
      });
    }
  }

  private asTable(sheet: ExcelJS.Worksheet, headerRowNumber: number): void {
    sheet.autoFilter = {
      from: { row: headerRowNumber, column: 1 },
      to: { row: headerRowNumber, column: sheet.columnCount },
    };
    sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];
  }

  // ---------- sheets ----------

  private buildSummarySheet(
    workbook: ExcelJS.Workbook,
    data: SessionReportData,
  ): void {
    const sheet = workbook.addWorksheet('Resumo');
    sheet.columns = [
      { key: 'field', width: 28 },
      { key: 'value', width: 42 },
    ];

    this.addTitleBanner(
      sheet,
      data.session.session_name || 'Relatório da Sessão',
      2,
    );

    const { session } = data;
    const highlights: Array<[string, unknown]> = [
      ['Jogo', session.game],
      ['Código de convite', session.inviteCode],
      ['Professor', session.createdBy?.name ?? session.createdBy?.login ?? '-'],
      ['Status', session.isActive ? 'Ativa' : 'Encerrada'],
      ['Criada em', this.formatDate(session.created_at)],
      [
        'Finalizada em',
        session.finished_at ? this.formatDate(session.finished_at) : '-',
      ],
      ['Total de jogadores', data.players.length],
      ['Total de partidas', data.matches.length],
    ];

    let rowNumber = 3;
    for (const [field, value] of highlights) {
      const row = sheet.getRow(rowNumber);
      row.getCell(1).value = field;
      row.getCell(2).value = (value ?? '-') as ExcelJS.CellValue;
      row.getCell(1).font = { bold: true };
      row.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: LIGHT_BLUE },
      };
      row.eachCell(
        { includeEmpty: true },
        (cell) => (cell.border = THIN_GRAY_BORDER),
      );
      rowNumber++;
    }

    const settingsEntries = Object.entries(session.settings ?? {}).filter(
      ([key, value]) =>
        key in SETTINGS_LABELS && value !== null && value !== undefined,
    );

    if (settingsEntries.length > 0) {
      rowNumber++;
      sheet.mergeCells(rowNumber, 1, rowNumber, 2);
      const subtitle = sheet.getCell(rowNumber, 1);
      subtitle.value = 'Configuração do jogo';
      subtitle.font = { bold: true, color: { argb: WHITE } };
      subtitle.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: NAVY },
      };
      rowNumber++;

      for (const [key, value] of settingsEntries) {
        const row = sheet.getRow(rowNumber);
        row.getCell(1).value = SETTINGS_LABELS[key] ?? key;
        row.getCell(2).value =
          typeof value === 'object'
            ? JSON.stringify(value)
            : (value as string | number | boolean);
        row.eachCell(
          { includeEmpty: true },
          (cell) => (cell.border = THIN_GRAY_BORDER),
        );
        rowNumber++;
      }
    }
  }

  private buildPlayersSheet(
    workbook: ExcelJS.Workbook,
    data: SessionReportData,
    playerLabels: Map<string, string>,
  ): void {
    const sheet = workbook.addWorksheet('Jogadores');
    const totals = this.computePlayerTotals(data);

    const requestedFields = (data.session.inputInfo ?? []).filter(
      (field) => field in PLAYER_FIELD_LABELS,
    );
    const columns = ['label', 'total', 'summary', ...requestedFields];

    sheet.columns = columns.map((key) => {
      if (key === 'label') return { header: 'Jogador', key, width: 16 };
      if (key === 'total') return { header: 'Pontuação total', key, width: 16 };
      if (key === 'summary') return { header: 'Resumo', key, width: 34 };
      return { header: PLAYER_FIELD_LABELS[key], key, width: 20 };
    });
    this.styleTableHeader(sheet.getRow(1));

    for (const player of data.players) {
      const playerId = player.id as string;
      const row: Record<string, unknown> = {
        label: playerLabels.get(playerId) ?? playerId,
        total: totals.get(playerId) ?? 0,
        summary: this.summarize(player),
      };
      for (const field of requestedFields) {
        row[field] = player[field] ?? '-';
      }
      sheet.addRow(row);
    }

    this.styleDataRows(sheet, 2);
    this.asTable(sheet, 1);
  }

  private buildMatchesSheet(
    workbook: ExcelJS.Workbook,
    data: SessionReportData,
    playerLabels: Map<string, string>,
  ): void {
    const sheet = workbook.addWorksheet('Partidas');
    sheet.columns = [
      { header: 'Partida', key: 'label', width: 14 },
      { header: 'Jogador 1', key: 'player1', width: 16 },
      { header: 'Jogador 2', key: 'player2', width: 16 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Rodadas', key: 'rounds', width: 12 },
      { header: 'Duração (s)', key: 'matchTime', width: 14 },
      { header: 'Criada em', key: 'created_at', width: 20 },
    ];
    this.styleTableHeader(sheet.getRow(1));

    data.matches.forEach((match, index) => {
      sheet.addRow({
        label: `Partida ${index + 1}`,
        player1: this.labelFor(playerLabels, match.player1_id),
        player2: this.labelFor(playerLabels, match.player2_id),
        status: match.status,
        rounds: match.moves ? Object.keys(match.moves).length : 0,
        matchTime: match.matchTime ?? '-',
        created_at: this.formatDate(match.created_at),
      });
    });

    this.styleDataRows(sheet, 2);
    this.asTable(sheet, 1);
  }

  /** Flattens every round of every match into real columns (no JSON blobs) so the sheet can be used directly as a chart/pivot data source. */
  private buildRoundsSheet(
    workbook: ExcelJS.Workbook,
    data: SessionReportData,
  ): void {
    const sheet = workbook.addWorksheet('Rodadas');

    sheet.columns = [
      { header: 'Partida', key: 'match', width: 14 },
      { header: 'Rodada', key: 'round', width: 10 },
      { header: 'Escolha J1', key: 'choice1', width: 14 },
      { header: 'Escolha J2', key: 'choice2', width: 14 },
      { header: 'Pontos J1', key: 'points1', width: 12 },
      { header: 'Pontos J2', key: 'points2', width: 12 },
      { header: 'Pontos Acum. J1', key: 'cumPoints1', width: 16 },
      { header: 'Pontos Acum. J2', key: 'cumPoints2', width: 16 },
    ];
    this.styleTableHeader(sheet.getRow(1));

    data.matches.forEach((match, matchIndex) => {
      const moves = match.moves ?? {};
      const rounds = Object.keys(moves).sort((a, b) => Number(a) - Number(b));

      let cumPoints1 = 0;
      let cumPoints2 = 0;

      for (const round of rounds) {
        const move = moves[round];
        const choice1 = (move.player1Choice as string) ?? '';
        const choice2 = (move.player2Choice as string) ?? '';
        const points1 = Number(move.player1Points ?? 0);
        const points2 = Number(move.player2Points ?? 0);
        cumPoints1 += points1;
        cumPoints2 += points2;

        sheet.addRow({
          match: `Partida ${matchIndex + 1}`,
          round: Number(round),
          choice1: CHOICE_LABELS[choice1] ?? choice1 ?? '-',
          choice2: CHOICE_LABELS[choice2] ?? choice2 ?? '-',
          points1,
          points2,
          cumPoints1,
          cumPoints2,
        });
      }

      if (rounds.length > 0) {
        const totalRow = sheet.addRow({
          match: `Partida ${matchIndex + 1}`,
          round: 'Total',
          choice1: '',
          choice2: '',
          points1: cumPoints1,
          points2: cumPoints2,
          cumPoints1: '',
          cumPoints2: '',
        });
        totalRow.font = { bold: true };
        totalRow.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: LIGHT_BLUE },
          };
          cell.border = THIN_GRAY_BORDER;
        });
      }
    });

    this.styleDataRows(sheet, 2);
    this.asTable(sheet, 1);
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
