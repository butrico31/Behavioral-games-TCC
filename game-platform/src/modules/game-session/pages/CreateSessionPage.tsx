import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, PlusCircle } from 'lucide-react'
import { Header } from '../../../shared/components/Header'
import { Toast } from '../../../shared/components/Toast'
import { SessionCodeModal } from '../components/SessionCodeModal'
import { SessionDataForm } from '../components/SessionDataForm'
import { ConfigSelector } from '../components/ConfigSelector'
import { SessionSummary } from '../components/SessionSummary'
import { useGsapReveal } from '../../../shared/hooks/useGsapReveal'
import { useToast } from '../../../shared/hooks/useToast'
import { useSessionCreation } from '../hooks/useSessionCreation'
import { useGames } from '../hooks/useGames'
import { usePlayerFields } from '../hooks/usePlayerFields'
import { useConfigs } from '../hooks/useConfigs'
import { useGameConfigFields } from '../hooks/useGameConfigFields'
import { useCreateSession } from '../hooks/useCreateSession'
import { useAuth } from '../../auth/hooks/useAuth'
import { PLAYER_FIELD_DEPENDENTS } from '../constants/playerFieldDependencies'
import type {
  CreateConfigPayload,
  CreateSessionPayload,
  CreateSessionResponse,
  GameConfigFieldDefinition
} from '../types'

const parse_enum_default = (field_type: string): string => {
  const match = /^enum\((.+)\)$/.exec(field_type)
  if (!match) return ''
  return match[1]
    .split(/[,|]/)
    .map((option) => option.trim())
    .filter(Boolean)[0] ?? ''
}

const default_value_for_type = (field_type: string): string | number | boolean => {
  if (field_type === 'boolean') return false
  if (field_type === 'number') return 0
  if (/^enum\(.+\)$/.test(field_type)) return parse_enum_default(field_type)
  return ''
}

const sanitize_settings = (
  source: Record<string, unknown>,
  allowed_field_names: Set<string>
): Omit<CreateConfigPayload, 'game'> | null => {
  const cleaned = Object.fromEntries(
    Object.entries(source).filter(
      ([key, value]) => key !== 'game' && value !== undefined && allowed_field_names.has(key)
    )
  ) as Record<string, unknown>

  if (typeof cleaned.configName !== 'string' || cleaned.configName.trim() === '') {
    return null
  }

  return cleaned as Omit<CreateConfigPayload, 'game'>
}

const extract_invite_code = (response: CreateSessionResponse): string | null => {
  if ('inviteCode' in response && typeof response.inviteCode === 'string') {
    return response.inviteCode
  }

  if ('session' in response) {
    if (typeof response.invite_code === 'string') return response.invite_code
    if (typeof response.session?.inviteCode === 'string') return response.session.inviteCode
    if (typeof (response.session as { invite_code?: string }).invite_code === 'string') {
      return (response.session as { invite_code?: string }).invite_code ?? null
    }
  }

  return null
}

export function CreateSessionPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [current_step, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [create_error, setCreateError] = useState<string | null>(null)
  const page_ref = useRef<HTMLDivElement | null>(null)
  const { toast, showToast } = useToast()
  const { games, is_loading: games_loading, is_error: games_error } = useGames()
  const {
    player_field_options,
    is_loading: player_fields_loading,
    is_error: player_fields_error
  } = usePlayerFields()
  const first_game_id = games[0]?.id ?? ''
  const {
    state,
    dispatch,
    can_create_session: can_create_session_base
  } = useSessionCreation()

  const selected_game_for_query = state.selected_game || first_game_id

  const {
    configs,
    is_loading: configs_loading,
    is_error: configs_error,
    createConfig,
    is_creating: is_creating_config,
    deleteConfig,
    is_deleting: is_deleting_config,
    deleting_id
  } = useConfigs(selected_game_for_query)

  const {
    createSession,
    is_creating: is_creating_session
  } = useCreateSession()

  const {
    common_fields,
    game_fields,
    is_loading: fields_loading,
    is_error: fields_error
  } = useGameConfigFields(selected_game_for_query)

  const allowed_field_names = useMemo(() => {
    const names = new Set<string>()
    const all_fields: GameConfigFieldDefinition[] = [...common_fields, ...game_fields]

    for (const field of all_fields) {
      if (field.name !== 'game') {
        names.add(field.name)
      }
    }

    return names
  }, [common_fields, game_fields])

  const valid_player_field_values = useMemo(
    () => new Set(player_field_options.map((option) => option.value)),
    [player_field_options]
  )

  useEffect(() => {
    if (!state.selected_game && first_game_id) {
      dispatch({ type: 'SET_GAME', payload: first_game_id })
    }
  }, [state.selected_game, first_game_id, dispatch])

  useEffect(() => {
    if (player_fields_loading || player_fields_error) return

    const sanitized_input_info = state.input_info.filter((field) =>
      valid_player_field_values.has(field)
    )

    const is_same_selection =
      sanitized_input_info.length === state.input_info.length &&
      sanitized_input_info.every((field, index) => field === state.input_info[index])

    if (!is_same_selection) {
      dispatch({ type: 'SET_PLAYER_INFO', payload: sanitized_input_info })
    }
  }, [
    player_fields_loading,
    player_fields_error,
    valid_player_field_values,
    state.input_info,
    dispatch
  ])

  useGsapReveal(
    '[data-create-section="title"], [data-create-section="form"], [data-create-section="config"], [data-create-section="summary"]',
    { root: page_ref, y: 18, duration: 0.55, stagger: 0.09, deps: [current_step] }
  )

  useEffect(() => {
    dispatch({ type: 'SYNC_CONFIG_MODE_FOR_EMPTY_LIST', payload: configs.length === 0 })
  }, [configs.length, dispatch])

  useEffect(() => {
    if (!state.selected_game) return

    const merged_defaults = [...common_fields, ...game_fields].reduce(
      (acc, field) => {
        if (field.name === 'game') {
          acc.game = state.selected_game
          return acc
        }

        if (acc[field.name] === undefined) {
          acc[field.name] = default_value_for_type(field.type)
        }

        return acc
      },
      { ...state.new_config }
    )

    dispatch({
      type: 'UPDATE_NEW_CONFIG',
      payload: merged_defaults
    })
  }, [common_fields, game_fields, state.selected_game, dispatch])

  const selected_config =
    configs.find((config) => config.id === state.selected_config_id) ?? null

  const active_config: CreateConfigPayload | null =
    state.config_mode === 'select'
      ? selected_config
        ? (() => {
            const { id: _id, createdAt: _createdAt, ...rest } = selected_config
            const config_payload = Object.fromEntries(
              Object.entries(rest).filter(([, value]) => value !== undefined)
            ) as CreateConfigPayload
            return config_payload
          })()
        : null
      : state.new_config.configName
        ? state.new_config
        : null

  const can_create_session = can_create_session_base && active_config !== null
  const is_creating = is_creating_config || is_creating_session
  const step1_valid = can_create_session_base
  const step2_valid = active_config !== null

  const session_settings = useMemo(() => {
    if (!active_config) return null
    const { game: _game, ...settings } = active_config
    return sanitize_settings(settings, allowed_field_names)
  }, [active_config, allowed_field_names])

  const handleCreateSession = async () => {
    setCreateError(null)

    if (!user?.id) {
      setCreateError('Usuário autenticado não encontrado. Faça login novamente.')
      return
    }

    if (!selected_game_for_query || !session_settings) {
      setCreateError('Preencha os dados da sessão e da configuração antes de criar.')
      return
    }

    try {
      let settings_for_session = session_settings

      if (state.config_mode === 'create') {
        const created_config = await createConfig(state.new_config)
        const { id: _id, createdAt: _createdAt, game: _game, ...persisted_settings } = created_config
        const sanitized_persisted_settings = sanitize_settings(
          persisted_settings,
          allowed_field_names
        )

        if (!sanitized_persisted_settings) {
          throw new Error('Invalid settings returned from backend')
        }

        settings_for_session = sanitized_persisted_settings
      }

      const payload: CreateSessionPayload = {
        session_name: state.session_name.trim(),
        game: selected_game_for_query,
        settings: settings_for_session,
        inputInfo: state.input_info.filter((field) => valid_player_field_values.has(field)),
        user_id: user.id
      }

      const response = await createSession(payload)

      const invite_code = extract_invite_code(response)

      if (!invite_code) {
        setCreateError('Sessão criada, mas não foi possível obter o código de convite.')
        return
      }

      dispatch({ type: 'OPEN_SESSION_MODAL', payload: invite_code })
    } catch {
      setCreateError('Não foi possível criar a sessão. Tente novamente.')
    }
  }

  const handleTogglePlayerInfo = (field: string) => {
    const is_deselecting = state.input_info.includes(field)
    const dependents = PLAYER_FIELD_DEPENDENTS[field]

    if (is_deselecting && dependents?.length) {
      const next_input_info = state.input_info.filter(
        (f) => f !== field && !dependents.includes(f)
      )
      dispatch({ type: 'SET_PLAYER_INFO', payload: next_input_info })
      return
    }

    dispatch({ type: 'TOGGLE_PLAYER_INFO', payload: field })
  }

  const handleDeleteConfig = async (id: string) => {
    const target = configs.find((config) => config.id === id)
    const target_name = target?.configName ?? 'esta configuração'

    try {
      await deleteConfig(id)

      if (state.selected_config_id === id) {
        dispatch({ type: 'SELECT_CONFIG', payload: '' })
      }

      showToast('success', `Configuração ${target_name} excluída.`)
    } catch {
      showToast('error', 'Não foi possível excluir a configuração. Tente novamente.')
    }
  }

  const handleCloseModal = () => {
    dispatch({ type: 'CLOSE_MODAL' })
    navigate('/sessions', { state: { refresh_sessions: true } })
  }

  return (
    <div ref={page_ref} className="app-shell">
      <Header />

      <main className="mx-auto w-full max-w-5xl px-5 py-10 md:px-8 md:py-14">
        {current_step === 1 && (
          <div data-create-section="title" className="surface-panel mb-8 px-6 py-7 md:px-10 md:py-8">
            <div className="mb-3 flex items-center gap-3">
              <PlusCircle className="h-9 w-9 text-primary" />
              <h1 className="text-4xl text-foreground md:text-5xl">Criar Nova Sessão</h1>
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
              Defina os dados da sessão, configure a partida e comece
            </p>
          </div>
        )}

        {current_step === 1 && (
          <div data-create-section="form">
            <p className="heading-kicker mb-2">Etapa 1 de 3</p>
            <SessionDataForm
              session_name={state.session_name}
              selected_game={state.selected_game}
              games={games}
              games_loading={games_loading}
              games_error={games_error}
              player_field_options={player_field_options}
              player_fields_loading={player_fields_loading}
              player_fields_error={player_fields_error}
              input_info={state.input_info}
              onSessionNameChange={(value) => dispatch({ type: 'SET_SESSION_NAME', payload: value })}
              onGameChange={(value) => dispatch({ type: 'SET_GAME', payload: value })}
              onTogglePlayerInfo={handleTogglePlayerInfo}
            />
            <div className="mt-6 flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={!step1_valid}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </button>
              {!step1_valid && (
                <p className="text-xs text-muted-foreground">
                  Preencha o nome da sessão e selecione ao menos um dado do jogador para continuar.
                </p>
              )}
            </div>
          </div>
        )}

        {current_step === 2 && (
          <div data-create-section="config" className="relative z-20">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
            <p className="heading-kicker mb-2">Etapa 2 de 3</p>
            <ConfigSelector
              selected_game={state.selected_game}
              config_mode={state.config_mode}
              selected_config={selected_config}
              selected_config_id={state.selected_config_id}
              configs_for_game={configs}
              configs_loading={configs_loading}
              configs_error={configs_error}
              new_config={state.new_config}
              common_fields={common_fields}
              game_fields={game_fields}
              fields_loading={fields_loading}
              fields_error={fields_error}
              is_deleting_config={is_deleting_config}
              deleting_config_id={deleting_id}
              onDeleteConfig={handleDeleteConfig}
              onConfigModeChange={(mode) => dispatch({ type: 'SET_CONFIG_MODE', payload: mode })}
              onSelectConfig={(id) => dispatch({ type: 'SELECT_CONFIG', payload: id })}
              onNewConfigChange={(config) => dispatch({ type: 'UPDATE_NEW_CONFIG', payload: config })}
            />
            <div className="mt-6 flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                disabled={!step2_valid}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </button>
              {!step2_valid && (
                <p className="text-xs text-muted-foreground">
                  Selecione ou crie uma configuração de partida para continuar.
                </p>
              )}
            </div>
          </div>
        )}

        {current_step === 3 && (
          <div data-create-section="summary" className="relative z-10">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
            <p className="heading-kicker mb-2">Etapa 3 de 3</p>
            <SessionSummary
              session_name={state.session_name}
              selected_game={state.selected_game}
              input_info={state.input_info}
              player_field_options={player_field_options}
              active_config={active_config}
              config_mode={state.config_mode}
              can_create_session={can_create_session}
              is_creating={is_creating}
              create_error={create_error}
              onCreateSession={handleCreateSession}
            />
          </div>
        )}
      </main>

      {/* Session Code Modal */}
      {state.show_code_modal && (
        <SessionCodeModal invite_code={state.session_code} onClose={handleCloseModal} />
      )}

      <Toast toast={toast} />
    </div>
  )
}
