import { CONFIG_ENUM_LABELS_PT } from '../constants/configFieldLabels'
import { filled_round_popups, is_round_popup_list } from './roundPopups'

/** Formats a single config field's raw value for display (booleans as Sim/Não). */
export function format_config_value(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return CONFIG_ENUM_LABELS_PT[value] ?? value
  if (is_round_popup_list(value)) {
    const rounds = filled_round_popups(value).map((popup) => popup.round)
    if (rounds.length === 0) return 'Nenhum'
    return `${rounds.length === 1 ? 'Rodada' : 'Rodadas'} ${rounds.sort((a, b) => a - b).join(', ')}`
  }
  return '-'
}
