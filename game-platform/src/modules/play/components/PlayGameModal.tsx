import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGames } from '../../game-session/hooks/useGames'
import { useJoinSession } from '../../game-session/hooks/useJoinSession'
import { sanitizeString, validateSessionCode, validateInput, validateEmail } from '../../../shared/utils/validation'
import { RateLimiter } from '../../../shared/utils/security'
import { MATCH_SESSION_STORAGE_KEYS } from '../../../shared/constants/storageKeys'
import { isAxiosError } from 'axios'
import { sessionService } from '../../game-session/services/sessionService'
import type { PlayTheme } from '../hooks/usePlayTheme'
import type { PublicSession, SessionRequirement, JoinSessionPayload, JoinSessionResponse } from '../../game-session/types'

interface PlayGameModalProps {
  theme: PlayTheme
  onClose: () => void
}

type ModalStep = 'game' | 'code' | 'fields'

const rate_limiter = new RateLimiter(5, 60000)

/** RA: só letras, números, ponto e hífen, até 30 caracteres (mesmo limite do backend). */
const RA_PATTERN = /^[A-Za-z0-9.-]{1,30}$/

const EDUCATION_LEVEL_OPTIONS = [
  { value: 'elementary',   label: 'Ensino Fundamental' },
  { value: 'high_school',  label: 'Ensino Médio' },
  { value: 'technical',    label: 'Técnico' },
  { value: 'bachelor',     label: 'Graduação' },
  { value: 'postgraduate', label: 'Pós-graduação' }
]

// Definições dos campos de jogador disponíveis no backend — relocated from the
// retired JoinSessionModal (game-session), unchanged.
const PLAYER_FIELD_DEFS: Record<string, Omit<SessionRequirement, 'field' | 'required'>> = {
  educationLevel: { label: 'Nível de Escolaridade', type: 'select', placeholder: 'Selecione' },
  semester:       { label: 'Semestre',              type: 'number', placeholder: 'Ex: 6' },
  course:         { label: 'Curso',                 type: 'text',   placeholder: 'Ex: Psicologia' },
  age:            { label: 'Idade',                 type: 'number', placeholder: 'Ex: 22' },
  gender:         { label: 'Gênero',                type: 'text',   placeholder: 'Ex: Masculino' },
  profession:     { label: 'Profissão',             type: 'text',   placeholder: 'Ex: Estudante' }
}

// Relocated from the retired JoinSessionModal (game-session).
function resolveGameRoute(game: string, matchId: string, playerId: string, sessionId: string): string | null {
  const game_key = game.trim().toLowerCase()

  if (game_key === 'prisoner') {
    return `/partida/${sessionId}`
  }

  if (game_key.includes('roulette')) {
    if (!matchId) {
      return null
    }
    const params = new URLSearchParams({ matchId, playerId })
    return `/roulette/game?${params.toString()}`
  }

  return null
}

export function PlayGameModal({ theme, onClose }: PlayGameModalProps) {
  const navigate = useNavigate()
  const { games, is_loading: games_loading, is_error: games_error } = useGames()
  const [step, setStep] = useState<ModalStep>('game')
  const [selected_game, setSelectedGame] = useState('')
  const [code, setCode] = useState('')
  const [looking_up, setLookingUp] = useState(false)
  const [matched_session, setMatchedSession] = useState<PublicSession | null>(null)
  const [form_data, setFormData] = useState<Record<string, string>>({})
  const [player_email, setPlayerEmail] = useState('')
  const [player_ra, setPlayerRa] = useState('')
  const [validation_error, setValidationError] = useState('')

  const { joinSession, is_joining } = useJoinSession(matched_session?.id ?? '')

  const requirements: SessionRequirement[] = useMemo(
    () =>
      matched_session
        ? matched_session.inputInfo
            .filter((field) => field in PLAYER_FIELD_DEFS)
            .map((field) => ({ field, required: true, ...PLAYER_FIELD_DEFS[field] }))
        : [],
    [matched_session]
  )

  const handleJoin = useCallback((target_session: PublicSession, extra_data: Record<string, string>) => {
    const payload: JoinSessionPayload = {
      inviteCode: code.trim().toUpperCase(),
      ra: sanitizeString(player_ra),
      email: player_email.trim() || undefined
    }

    const target_requirements = target_session.inputInfo.filter((field) => field in PLAYER_FIELD_DEFS)
    const mutable = payload as unknown as Record<string, unknown>
    for (const field of target_requirements) {
      const def = PLAYER_FIELD_DEFS[field]
      const raw = extra_data[field]
      if (!raw) continue
      mutable[field] = def.type === 'number' ? Number(raw) : sanitizeString(raw)
    }

    joinSession(payload, {
      onSuccess: (data: JoinSessionResponse) => {
        sessionStorage.setItem(MATCH_SESSION_STORAGE_KEYS.playerId, data.player.id)
        sessionStorage.setItem(MATCH_SESSION_STORAGE_KEYS.sessionId, data.session.id)
        sessionStorage.setItem(MATCH_SESSION_STORAGE_KEYS.matchId, data.match?.id ?? '')
        sessionStorage.setItem(MATCH_SESSION_STORAGE_KEYS.playerEmail, player_email.trim())

        const game_route = resolveGameRoute(target_session.game, data.match?.id ?? '', data.player.id, data.session.id)

        if (!game_route) {
          setValidationError('Não foi possível iniciar o jogo desta sessão. Tente novamente.')
          return
        }

        onClose()
        navigate(game_route)
      },
      onError: () => {
        setValidationError('Não foi possível entrar na sessão. Verifique o código e tente novamente.')
      }
    })
  }, [code, joinSession, onClose, navigate, player_email, player_ra])

  const handleSelectGame = useCallback((game_id: string) => {
    setSelectedGame(game_id)
    setValidationError('')
    setStep('code')
  }, [])

  // Busca só a sessão do código digitado, e só ao continuar: nada é baixado antes, e cada
  // tentativa vai ao servidor (uma sessão criada agora já aparece, sem precisar de F5).
  const handleCodeSubmit = useCallback(async () => {
    if (looking_up) return

    if (!code.trim()) {
      setValidationError('Digite o código da sessão')
      return
    }

    if (!validateSessionCode(code)) {
      setValidationError('Código inválido')
      return
    }

    if (!rate_limiter.canAttempt(`play-${selected_game}`)) {
      setValidationError('Muitas tentativas. Aguarde um momento.')
      return
    }

    setLookingUp(true)
    setValidationError('')
    try {
      const found = await sessionService.getSessionByCode(code)

      if (found.game !== selected_game) {
        setValidationError('Este código é de outro jogo. Volte e escolha o jogo certo.')
        return
      }

      if (!found.isActive) {
        setValidationError('Esta sessão já foi encerrada. Peça um novo código ao professor.')
        return
      }

      rate_limiter.reset(`play-${selected_game}`)
      setMatchedSession(found)
      setStep('fields')
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined
      setValidationError(
        status === 404
          ? 'Sessão não encontrada. Confira o código com o professor.'
          : 'Não foi possível buscar a sessão. Verifique sua conexão e tente de novo.'
      )
    } finally {
      setLookingUp(false)
    }
  }, [code, selected_game, looking_up])

  const handleFieldsSubmit = useCallback(() => {
    if (!matched_session) return

    if (!RA_PATTERN.test(player_ra.trim())) {
      setValidationError('Digite um RA válido (apenas letras e números)')
      return
    }

    if (!validateEmail(player_email.trim())) {
      setValidationError('Digite um e-mail válido')
      return
    }

    const all_required_filled = requirements
      .filter((req) => req.required)
      .every((req) => form_data[req.field]?.trim())

    if (!all_required_filled) {
      setValidationError('Preencha todos os campos obrigatórios')
      return
    }

    const has_invalid_field = requirements.some((req) => {
      const value = form_data[req.field]
      if (!value && req.required) return true
      if (value && !validateInput(value, req.type)) return true
      return false
    })

    if (has_invalid_field) {
      setValidationError('Um ou mais campos possuem valores inválidos')
      return
    }

    setValidationError('')
    handleJoin(matched_session, form_data)
  }, [matched_session, requirements, form_data, player_email, player_ra, handleJoin])

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value.substring(0, 500) }))
    setValidationError('')
  }, [])

  return (
    <div
      data-dctheme={theme}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 20, background: 'var(--modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      role="dialog"
      aria-modal="true"
      aria-label="Jogar"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', width: '100%', maxWidth: 440, maxHeight: 'calc(100dvh - 48px)', overflowY: 'auto', background: 'var(--modal-bg)', borderRadius: 24, padding: 32, boxShadow: '0 30px 70px rgba(0,0,0,.3)', fontFamily: 'Manrope, Helvetica, Arial, sans-serif' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          style={{ position: 'absolute', top: 18, right: 18, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: 1, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--modal-text)' }}
        >
          ✕
        </button>

        {step === 'game' && (
          <>
            <p style={{ margin: '0 0 10px', fontFamily: 'Montserrat', fontWeight: 900, fontSize: 24, color: 'var(--modal-title)' }}>Escolha seu jogo</p>
            <p style={{ margin: '0 0 22px', fontSize: 15, lineHeight: 1.5, color: 'var(--modal-text)' }}>Selecione o jogo da aula de hoje.</p>

            {games_loading && <p style={{ fontSize: 14, color: 'var(--modal-text)' }}>Carregando jogos...</p>}
            {games_error && <p style={{ fontSize: 14, color: '#c04040' }}>Não foi possível carregar os jogos.</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {games.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => handleSelectGame(game.id)}
                  style={{ textAlign: 'left', padding: '16px 18px', borderRadius: 14, border: '2px solid var(--prof-border)', background: 'none', cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 800, fontSize: 16, color: 'var(--modal-title)' }}
                >
                  {game.name}
                  <span style={{ display: 'block', marginTop: 4, fontFamily: 'Manrope', fontWeight: 500, fontSize: 13, color: 'var(--modal-text)' }}>{game.description}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'code' && (
          <>
            <p style={{ margin: '0 0 10px', fontFamily: 'Montserrat', fontWeight: 900, fontSize: 24, color: 'var(--modal-title)' }}>Digite o código</p>
            <p style={{ margin: '0 0 22px', fontSize: 15, lineHeight: 1.5, color: 'var(--modal-text)' }}>O código fornecido pelo professor para esta sessão.</p>

            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setValidationError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleCodeSubmit() }}
              placeholder="A1B2C3"
              maxLength={10}
              style={{ width: '100%', padding: '14px 16px', marginBottom: 8, borderRadius: 12, border: '2px solid var(--prof-border)', textAlign: 'center', fontSize: 18, letterSpacing: '.3em', fontFamily: 'Montserrat', fontWeight: 700, color: 'var(--modal-title)', background: 'none' }}
            />
            {validation_error && <p style={{ margin: '4px 0 18px', fontSize: 13, color: '#c04040' }}>{validation_error}</p>}

            <button
              type="button"
              onClick={() => void handleCodeSubmit()}
              disabled={looking_up}
              style={{ width: '100%', padding: '14px 28px', marginTop: 14, border: 'none', borderRadius: 999, background: 'var(--modal-btn)', color: '#fff', fontFamily: 'Montserrat', fontWeight: 800, fontSize: 16, cursor: looking_up ? 'default' : 'pointer', opacity: looking_up ? 0.7 : 1 }}
            >
              {looking_up ? 'Buscando sessão...' : 'Continuar'}
            </button>
          </>
        )}

        {step === 'fields' && (
          <>
            <p style={{ margin: '0 0 10px', fontFamily: 'Montserrat', fontWeight: 900, fontSize: 24, color: 'var(--modal-title)' }}>Dados para entrada</p>
            <p style={{ margin: '0 0 22px', fontSize: 15, lineHeight: 1.5, color: 'var(--modal-text)' }}>Preencha os dados solicitados para entrar na sessão.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 700, color: 'var(--modal-title)' }}>
                  RA <span style={{ color: '#c04040' }}>*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={player_ra}
                  onChange={(e) => { setPlayerRa(e.target.value.substring(0, 30)); setValidationError('') }}
                  placeholder="Ex: 12345678"
                  maxLength={30}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '2px solid var(--prof-border)', fontSize: 14, color: 'var(--modal-title)', background: 'none' }}
                />
              </div>
              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 700, color: 'var(--modal-title)' }}>
                  E-mail <span style={{ color: '#c04040' }}>*</span>
                </label>
                <input
                  type="email"
                  value={player_email}
                  onChange={(e) => { setPlayerEmail(e.target.value); setValidationError('') }}
                  placeholder="seuemail@exemplo.com"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '2px solid var(--prof-border)', fontSize: 14, color: 'var(--modal-title)', background: 'none' }}
                />
              </div>
              {requirements.map((req) => (
                <div key={req.field} style={{ textAlign: 'left' }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 700, color: 'var(--modal-title)' }}>
                    {req.label} {req.required && <span style={{ color: '#c04040' }}>*</span>}
                  </label>
                  {req.type === 'select' ? (
                    <select
                      value={form_data[req.field] || ''}
                      onChange={(e) => handleInputChange(req.field, e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '2px solid var(--prof-border)', fontSize: 14, color: 'var(--modal-title)', background: 'none' }}
                    >
                      <option value="">Selecione...</option>
                      {EDUCATION_LEVEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={req.type}
                      value={form_data[req.field] || ''}
                      onChange={(e) => handleInputChange(req.field, e.target.value)}
                      placeholder={req.placeholder}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '2px solid var(--prof-border)', fontSize: 14, color: 'var(--modal-title)', background: 'none' }}
                    />
                  )}
                </div>
              ))}
            </div>

            {validation_error && <p style={{ margin: '0 0 14px', fontSize: 13, color: '#c04040' }}>{validation_error}</p>}

            <button
              type="button"
              onClick={handleFieldsSubmit}
              disabled={is_joining}
              style={{ width: '100%', padding: '14px 28px', border: 'none', borderRadius: 999, background: 'var(--modal-btn)', color: '#fff', fontFamily: 'Montserrat', fontWeight: 800, fontSize: 16, cursor: is_joining ? 'default' : 'pointer', opacity: is_joining ? 0.7 : 1 }}
            >
              {is_joining ? 'Entrando...' : 'Entrar na sessão'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
