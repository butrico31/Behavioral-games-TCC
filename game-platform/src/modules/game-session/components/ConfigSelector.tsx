import { useRef, useState } from 'react'
import { ChevronDown, ListChecks, PlusCircle, Gamepad2, Trash2 } from 'lucide-react'
import { ConfigurationForm } from './ConfigurationForm'
import { useClickOutside } from '../../../shared/hooks/useClickOutside'
import { humanizeLabel } from '../../../shared/utils/humanizeLabel'
import { CONFIG_FIELD_LABELS_PT, GAME_LABELS_PT } from '../constants/configFieldLabels'
import { format_config_value } from '../utils/configValue'
import type { CreateConfigPayload, GameConfig, GameConfigFieldDefinition } from '../types'

interface ConfigSelectorProps {
  selected_game: string
  config_mode: 'select' | 'create'
  selected_config: GameConfig | null
  selected_config_id: string
  configs_for_game: GameConfig[]
  configs_loading: boolean
  configs_error: boolean
  new_config: CreateConfigPayload
  /** Campos do modo "Criar Nova" nesta etapa: nome + parâmetros do jogo. */
  form_fields: GameConfigFieldDefinition[]
  fields_loading: boolean
  fields_error: boolean
  is_deleting_config: boolean
  deleting_config_id: string | null
  onDeleteConfig: (id: string) => Promise<void>
  onConfigModeChange: (mode: 'select' | 'create') => void
  onSelectConfig: (id: string) => void
  onNewConfigChange: (config: CreateConfigPayload) => void
}

export function ConfigSelector({
  selected_game,
  config_mode,
  selected_config,
  selected_config_id,
  configs_for_game,
  configs_loading,
  configs_error,
  new_config,
  form_fields,
  fields_loading,
  fields_error,
  is_deleting_config,
  deleting_config_id,
  onDeleteConfig,
  onConfigModeChange,
  onSelectConfig,
  onNewConfigChange
}: ConfigSelectorProps) {
  const [is_dropdown_open, setIsDropdownOpen] = useState(false)
  const dropdown_ref = useRef<HTMLDivElement | null>(null)

  useClickOutside(dropdown_ref, () => setIsDropdownOpen(false), is_dropdown_open)

  const preview_entries = selected_config
    ? Object.entries(selected_config).filter(([key]) => !['id', 'createdAt', 'game'].includes(key))
    : []

  const game_label = GAME_LABELS_PT[selected_game] ?? humanizeLabel(selected_game)

  return (
    <section
      className="surface-panel relative overflow-visible p-6"
      aria-labelledby="section-match-config"
    >
      <div className="flex items-center gap-3 mb-2">
        <Gamepad2 className="w-6 h-6 text-primary" />
        <h2 id="section-match-config" className="text-2xl text-foreground md:text-3xl">
          Configuração da Partida
        </h2>
      </div>
      <p className="text-muted-foreground text-sm mb-4">
        Parâmetros do jogo{' '}
        <span className="text-primary font-semibold">{game_label}</span>
      </p>

      {/* Mode Toggle */}
      <div className="flex gap-3 mb-5">
        <button
          type="button"
          onClick={() => onConfigModeChange('select')}
          className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
            config_mode === 'select'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary/45 border border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2">
            <ListChecks className="w-4 h-4" />
            Usar Existente
          </span>
        </button>
        <button
          type="button"
          onClick={() => onConfigModeChange('create')}
          className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
            config_mode === 'create'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary/45 border border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4" />
            Criar Nova
          </span>
        </button>
      </div>

      {/* ── Select Existing Config ── */}
      {config_mode === 'select' && (
        <div>
          <label htmlFor="config-select" className="block text-sm font-medium text-foreground mb-2">
            Selecione uma configuração para{' '}
            <span className="text-primary">{game_label}</span>
          </label>
          <div ref={dropdown_ref} className="relative">
            <button
              id="config-select"
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              disabled={configs_loading || configs_error || configs_for_game.length === 0}
              className="input-shell text-left disabled:opacity-70"
            >
              {configs_loading
                ? 'Carregando configurações...'
                : selected_config
                  ? selected_config.configName
                  : 'Selecione uma configuração'}
            </button>
            <ChevronDown
              className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none transition-transform ${
                is_dropdown_open ? 'rotate-180' : 'rotate-0'
              }`}
            />

            {is_dropdown_open && !configs_loading && !configs_error && configs_for_game.length > 0 && (
              <div className="surface-panel absolute z-50 mt-2 max-h-64 w-full overflow-auto p-2">
                <ul role="listbox" aria-label="Configurações existentes" className="p-2 space-y-1">
                  {configs_for_game.map((cfg) => {
                    const is_selected = cfg.id === selected_config_id
                    const is_deleting_item = is_deleting_config && deleting_config_id === cfg.id

                    return (
                      <li key={cfg.id} role="option" aria-selected={is_selected} className="group">
                        <div
                          className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors ${
                            is_selected
                              ? 'border-primary bg-primary/10'
                              : 'border-transparent hover:border-border hover:bg-secondary/45'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onSelectConfig(cfg.id)
                              setIsDropdownOpen(false)
                            }}
                            className="flex-1 text-left px-2 py-1.5 text-sm text-foreground"
                          >
                            {cfg.configName}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              void onDeleteConfig(cfg.id)
                            }}
                            disabled={is_deleting_item}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity px-2 py-1.5 rounded-md border border-destructive/50 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                            aria-label={`Excluir configuração ${cfg.configName}`}
                            title="Excluir configuração"
                          >
                            {is_deleting_item ? (
                              <span className="text-xs">Excluindo...</span>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>

          {configs_error && (
            <p className="text-xs text-destructive mt-2">
              Não foi possível carregar as configurações deste jogo.
            </p>
          )}

          {/* Config Preview */}
          {selected_config && (
            <div className="surface-subtle mt-6 p-6">
              <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-4">
                Resumo da Configuração
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {preview_entries.map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground">
                      {CONFIG_FIELD_LABELS_PT[key] ?? humanizeLabel(key)}
                    </p>
                    <p className="text-sm text-foreground font-medium">{format_config_value(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {configs_for_game.length === 0 && (
            <div className="surface-subtle mt-4 p-4 text-center">
              <p className="text-muted-foreground text-sm">
                Nenhuma configuração encontrada para{' '}
                <span className="font-medium">{game_label}</span>. Crie uma nova.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Create New Config ── */}
      {config_mode === 'create' && (
        <div>
          {fields_loading && (
            <p className="text-sm text-muted-foreground mb-4">Carregando campos de configuração...</p>
          )}
          {fields_error && (
            <p className="text-sm text-destructive mb-4">
              Não foi possível carregar os campos da configuração para este jogo.
            </p>
          )}
          <ConfigurationForm config={new_config} fields={form_fields} onChange={onNewConfigChange} />
        </div>
      )}
    </section>
  )
}
