/**
 * Layouts de mesa da roleta. Os ids precisam bater com ROULETTE_TABLE_LAYOUTS no backend
 * (settings-game-roulette.entity.ts): é o valor que o professor escolhe em "Mesa" na configuração.
 */
export const TABLE_LAYOUTS = ['mesa1', 'mesa2'] as const

export type TableLayoutId = (typeof TABLE_LAYOUTS)[number]

export const DEFAULT_TABLE_LAYOUT: TableLayoutId = 'mesa1'

/** Valor desconhecido (sessão antiga, layout removido) cai na mesa padrão em vez de quebrar a tela. */
export function toTableLayout(value: string | undefined | null): TableLayoutId {
  return (TABLE_LAYOUTS as readonly string[]).includes(value ?? '') ? (value as TableLayoutId) : DEFAULT_TABLE_LAYOUT
}
