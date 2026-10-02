import { ChevronDown, Users } from 'lucide-react'
import { PLAYER_FIELD_DEPENDENTS } from '../constants/playerFieldDependencies'
import type { GameCatalogItem } from '../types'
import type { PlayerInfoOption } from '../types'

interface SessionDataFormProps {
  session_name: string
  selected_game: string
  games: GameCatalogItem[]
  games_loading: boolean
  games_error: boolean
  player_field_options: PlayerInfoOption[]
  player_fields_loading: boolean
  player_fields_error: boolean
  input_info: string[]
  onSessionNameChange: (value: string) => void
  onGameChange: (value: string) => void
  onTogglePlayerInfo: (field: string) => void
}

export function SessionDataForm({
  session_name,
  selected_game,
  games,
  games_loading,
  games_error,
  player_field_options,
  player_fields_loading,
  player_fields_error,
  input_info,
  onSessionNameChange,
  onGameChange,
  onTogglePlayerInfo
}: SessionDataFormProps) {
  const dependent_values = new Set(Object.values(PLAYER_FIELD_DEPENDENTS).flat())
  const independent_options = player_field_options.filter((opt) => !dependent_values.has(opt.value))

  const render_option = (opt: PlayerInfoOption) => (
    <button
      key={opt.value}
      type="button"
      onClick={() => onTogglePlayerInfo(opt.value)}
      className={`px-4 py-2 rounded-lg border font-medium text-sm transition-all ${
        input_info.includes(opt.value)
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-secondary/45 text-muted-foreground border-border hover:border-primary hover:text-foreground'
      }`}
    >
      {opt.label}
    </button>
  )

  return (
    <section
      className="surface-panel mb-8 p-8"
      aria-labelledby="section-session-data"
    >
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-6 h-6 text-primary" />
        <h2 id="section-session-data" className="text-3xl text-foreground">
          Dados da Sessão
        </h2>
      </div>

      <div className="space-y-6">
        {/* Session Name */}
        <div>
          <label htmlFor="session-name" className="block text-sm font-medium text-foreground mb-2">
            Nome da Sessão *
          </label>
            <input
              id="session-name"
              type="text"
              value={session_name}
              onChange={(e) => onSessionNameChange(e.target.value)}
              className="input-shell"
              placeholder="Ex: Sessão Turma A - Manhã"
            />
        </div>

        {/* Game Selection */}
        <div>
          <label htmlFor="session-game" className="block text-sm font-medium text-foreground mb-2">
            Jogo *
          </label>
          <div className="relative">
            <select
              id="session-game"
              value={selected_game}
              onChange={(e) => onGameChange(e.target.value)}
              disabled={games_loading || games_error || games.length === 0}
              className="input-shell appearance-none"
            >
              {games_loading && <option value="">Carregando jogos...</option>}
              {!games_loading && games.length > 0 && (
                <option value="" disabled>
                  Selecione um jogo
                </option>
              )}
              {!games_loading && games.length === 0 && (
                <option value="">Nenhum jogo disponível</option>
              )}
              {!games_loading && games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          </div>
          {games_error && (
            <p className="text-xs text-destructive mt-2">
              Não foi possível carregar os jogos no momento.
            </p>
          )}
        </div>

        {/* Player Info (session-level) */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Dados do Jogador *
          </label>
          <p className="text-xs text-muted-foreground mb-3">
            Selecione quais informações serão solicitadas ao jogador ao entrar na sessão
          </p>
          {player_fields_loading && (
            <p className="text-xs text-muted-foreground mb-3">
              Carregando campos disponíveis do jogador...
            </p>
          )}
          {player_fields_error && (
            <p className="text-xs text-destructive mb-3">
              Não foi possível carregar os campos do jogador.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {independent_options.map(render_option)}
          </div>

          {Object.entries(PLAYER_FIELD_DEPENDENTS).map(([parent_value, dependents]) => {
            if (!input_info.includes(parent_value)) return null
            const dependent_options = player_field_options.filter((opt) => dependents.includes(opt.value))
            if (dependent_options.length === 0) return null

            return (
              <div
                key={parent_value}
                className="mt-3 flex flex-wrap items-center gap-3 border-l-2 border-primary/30 pl-4"
              >
                <span className="text-xs text-muted-foreground">Também perguntar:</span>
                {dependent_options.map(render_option)}
              </div>
            )
          })}

          {!player_fields_loading && !player_fields_error && player_field_options.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Nenhum campo disponível para selecionar.
            </p>
          )}
          {input_info.length === 0 && (
            <p className="text-xs text-destructive mt-2">
              Selecione ao menos uma informação do jogador
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
