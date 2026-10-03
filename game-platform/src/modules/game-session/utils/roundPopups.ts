import type { RoundPopup } from '../types'

/** Limites do backend (RoundPopupDto). */
export const ROUND_POPUP_MESSAGE_MAX = 280
export const ROUND_POPUP_MAX_ROUND = 500

export function is_round_popup_list(value: unknown): value is RoundPopup[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as RoundPopup).round === 'number' &&
        typeof (item as RoundPopup).message === 'string'
    )
  )
}

/** Popups que vão para o backend: sem as linhas que ficaram sem mensagem. */
export function filled_round_popups(popups: RoundPopup[]): RoundPopup[] {
  return popups.filter((popup) => popup.message.trim() !== '')
}

/** Motivo pelo qual a lista não pode ser salva, ou null quando está ok. */
export function round_popups_issue(popups: RoundPopup[]): string | null {
  const seen = new Set<number>()
  for (const popup of filled_round_popups(popups)) {
    if (!Number.isInteger(popup.round) || popup.round < 1 || popup.round > ROUND_POPUP_MAX_ROUND) {
      return `A rodada de cada popup precisa estar entre 1 e ${ROUND_POPUP_MAX_ROUND}.`
    }
    if (seen.has(popup.round)) return `Há mais de um popup na rodada ${popup.round}.`
    seen.add(popup.round)
  }
  return null
}
