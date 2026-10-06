import { ChildEntity, Column } from 'typeorm';
import { Settings } from './settings.entity';

export interface RoulettePopupConfig {
  message: string;
  players: number;
}

/** Layouts de mesa da roleta. O front tem um layout para cada id. */
export const ROULETTE_TABLE_LAYOUTS = ['mesa1', 'mesa2'] as const;
export type RouletteTableLayout = (typeof ROULETTE_TABLE_LAYOUTS)[number];
export const DEFAULT_TABLE_LAYOUT: RouletteTableLayout = 'mesa1';

/** Mensagem que o professor escreve para aparecer em popup no início de uma rodada. */
export interface RouletteRoundPopup {
  round: number;
  message: string;
}

@ChildEntity()
export class SettingsGameRoulette extends Settings {
  @Column({ name: 'timelimit', type: 'int', default: 60, nullable: true })
  timeLimit: number | null;

  /** Meta de fichas: a partida acaba quando o saldo chega aqui. */
  @Column({ name: 'pointslimit', type: 'int', default: 300, nullable: true })
  pointsLimit: number;

  /** Formato antigo (uma mensagem só). Mantido para não perder dados; o jogo usa roundPopups. */
  @Column({ type: 'json', nullable: true })
  popup: RoulettePopupConfig | null;

  @Column({ name: 'initmoney', type: 'int', default: 50, nullable: true })
  initMoney: number;

  /** Popups por rodada, ordenados por rodada. null = nenhum. */
  @Column({ name: 'roundpopups', type: 'json', nullable: true })
  roundPopups: RouletteRoundPopup[] | null;

  @Column({
    name: 'tablelayout',
    type: 'varchar',
    length: 32,
    default: DEFAULT_TABLE_LAYOUT,
    nullable: true,
  })
  tableLayout: RouletteTableLayout;

  /**
   * Desliga o botão de encerrar a partida voluntariamente. Default false (permitido) — o
   * formulário de configuração manda `false` para todo campo boolean não mexido, então o campo
   * é "desligar", não "permitir", pra esse default bater com o que já era o comportamento.
   */
  @Column({ name: 'disablegiveup', type: 'boolean', default: false })
  disableGiveUp: boolean;
}
