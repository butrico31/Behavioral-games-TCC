import { PlusCircle, Settings } from 'lucide-react'
import { humanizeLabel } from '../../../shared/utils/humanizeLabel'
import { CONFIG_FIELD_LABELS_PT, GAME_LABELS_PT } from '../constants/configFieldLabels'
import { format_config_value } from '../utils/configValue'
import type { CreateConfigPayload, PlayerInfoOption } from '../types'

interface SessionSummaryProps {
  session_name: string
  selected_game: string
  input_info: string[]
  player_field_options: PlayerInfoOption[]
  active_config: CreateConfigPayload | null
  config_mode: 'select' | 'create'
  can_create_session: boolean
  is_creating: boolean
  create_error: string | null
  onCreateSession: () => void
}

export function SessionSummary({
  session_name,
  selected_game,
  input_info,
  player_field_options,
  active_config,
  config_mode,
  can_create_session,
  is_creating,
  create_error,
  onCreateSession
}: SessionSummaryProps) {
  const game_label = selected_game ? GAME_LABELS_PT[selected_game] ?? humanizeLabel(selected_game) : ''

  const player_field_labels = input_info.map(
    (value) => player_field_options.find((opt) => opt.value === value)?.label ?? humanizeLabel(value)
  )

  const config_entries = active_config
    ? Object.entries(active_config).filter(([key]) => !['game', 'configName'].includes(key))
    : []

  return (
    <section
      className="surface-panel p-6"
      aria-labelledby="section-create"
    >
      <div className="flex items-center gap-3 mb-6">
        <PlusCircle className="w-6 h-6 text-primary" />
        <h2 id="section-create" className="text-2xl text-foreground md:text-3xl">
          Criar Sessão
        </h2>
      </div>

      <div className="surface-subtle mb-6 space-y-5 p-5">
        <div>
          <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-1">
            Sessão
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-2xl font-semibold text-foreground">
              {session_name.trim() || 'Sem nome ainda'}
            </p>
            {game_label && (
              <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {game_label}
              </span>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-2">
            Dados do Jogador
          </p>
          {player_field_labels.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {player_field_labels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs font-medium text-foreground"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-2">
            Configuração da Partida
          </p>
          {active_config ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">{active_config.configName}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {config_entries.map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground">
                      {CONFIG_FIELD_LABELS_PT[key] ?? humanizeLabel(key)}
                    </p>
                    <p className="text-sm font-medium text-foreground">{format_config_value(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {config_mode === 'select'
                ? 'Selecione uma configuração existente'
                : 'Preencha o nome da configuração'}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onCreateSession}
        disabled={!can_create_session || is_creating}
        className="btn-primary w-full py-4 text-lg disabled:cursor-not-allowed"
      >
        <Settings className="w-5 h-5" />
        {is_creating ? 'Criando Sessão...' : 'Criar Sessão'}
      </button>
      {create_error && (
        <p className="text-sm text-destructive mt-3">{create_error}</p>
      )}
    </section>
  )
}
