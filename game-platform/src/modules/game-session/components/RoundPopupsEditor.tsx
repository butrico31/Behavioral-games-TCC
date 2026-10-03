import { MessageSquarePlus, Trash2 } from 'lucide-react'
import {
  ROUND_POPUP_MAX_ROUND,
  ROUND_POPUP_MESSAGE_MAX,
  round_popups_issue
} from '../utils/roundPopups'
import type { RoundPopup } from '../types'

interface RoundPopupsEditorProps {
  label: string
  hint?: string
  popups: RoundPopup[]
  onChange: (popups: RoundPopup[]) => void
}

/**
 * Lista de popups do professor: cada linha é uma rodada + a mensagem. A roleta não tem número
 * fixo de rodadas, então a rodada é um número livre; popup numa rodada que o jogador não
 * alcança simplesmente não aparece.
 */
export function RoundPopupsEditor({ label, hint, popups, onChange }: RoundPopupsEditorProps) {
  const used_rounds = new Set(popups.map((popup) => popup.round))
  const issue = round_popups_issue(popups)

  const update_at = (index: number, patch: Partial<RoundPopup>) => {
    onChange(popups.map((popup, i) => (i === index ? { ...popup, ...patch } : popup)))
  }

  const handleAdd = () => {
    let next_round = 1
    while (used_rounds.has(next_round)) next_round++
    if (next_round > ROUND_POPUP_MAX_ROUND) return
    onChange([...popups, { round: next_round, message: '' }])
  }

  const handleRemove = (index: number) => {
    onChange(popups.filter((_, i) => i !== index))
  }

  return (
    <div className="surface-subtle p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="pr-4">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/45 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Adicionar popup
        </button>
      </div>

      {popups.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum popup. A partida corre sem mensagens.</p>
      ) : (
        <ul className="space-y-3">
          {popups.map((popup, index) => {
            const round_id = `round-popup-round-${index}`
            const message_id = `round-popup-message-${index}`
            const is_duplicate = popups.some((other, i) => i !== index && other.round === popup.round)

            return (
              <li key={index} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="sm:w-32">
                  <label htmlFor={round_id} className="mb-1 block text-xs text-muted-foreground">
                    Rodada
                  </label>
                  <input
                    id={round_id}
                    type="number"
                    min={1}
                    max={ROUND_POPUP_MAX_ROUND}
                    step={1}
                    value={popup.round > 0 ? popup.round : ''}
                    onChange={(e) =>
                      update_at(index, { round: e.target.value === '' ? 0 : Number(e.target.value) })
                    }
                    className={`input-shell ${is_duplicate ? 'border-destructive' : ''}`}
                  />
                </div>

                <div className="flex-1">
                  <label htmlFor={message_id} className="mb-1 block text-xs text-muted-foreground">
                    Mensagem
                  </label>
                  <textarea
                    id={message_id}
                    rows={2}
                    maxLength={ROUND_POPUP_MESSAGE_MAX}
                    placeholder="Mensagem que o jogador vai ver"
                    value={popup.message}
                    onChange={(e) => update_at(index, { message: e.target.value })}
                    className="input-shell min-h-[44px] resize-y"
                  />
                  <p className="mt-1 text-right text-[11px] text-muted-foreground">
                    {popup.message.length}/{ROUND_POPUP_MESSAGE_MAX}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="self-end rounded-md border border-destructive/50 px-2 py-2 text-destructive transition-colors hover:bg-destructive/10 sm:mt-5 sm:self-start"
                  aria-label={`Remover popup da rodada ${popup.round}`}
                  title="Remover popup"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {issue && <p className="mt-3 text-xs text-destructive">{issue}</p>}
    </div>
  )
}
