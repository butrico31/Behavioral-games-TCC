import { useCallback, useEffect, useRef, useState } from 'react'
import { KeyRound, Mail } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { Header } from '../../../shared/components/Header'
import { useAuth } from '../hooks/useAuth'
import { validateEmail } from '../../../shared/utils/validation'
import { useGsapReveal } from '../../../shared/hooks/useGsapReveal'
import { mapAuthError } from '../../../shared/utils/mapAuthError'

const RESEND_COOLDOWN_SECONDS = 60

interface VerifyEmailLocationState {
  email?: string
  /** O cadastro acabou de enviar um código: o reenvio só é liberado depois de 1 minuto. */
  code_sent?: boolean
  /** Veio do login de uma conta que ainda não confirmou o e-mail. */
  unverified?: boolean
}

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const root_ref = useRef<HTMLDivElement | null>(null)
  const { verifyEmail, resendVerificationCode } = useAuth()
  const [initial_state] = useState<VerifyEmailLocationState>(
    () => (location.state as VerifyEmailLocationState | null) ?? {}
  )
  const [email, setEmail] = useState(initial_state.email ?? '')
  const [code, setCode] = useState('')
  const [error_message, setErrorMessage] = useState('')
  const [info_message, setInfoMessage] = useState(
    initial_state.unverified
      ? 'Seu e-mail ainda não foi verificado. Digite o código que enviamos ou peça um novo.'
      : ''
  )
  const [is_submitting, setIsSubmitting] = useState(false)
  const [is_resending, setIsResending] = useState(false)
  const [cooldown, setCooldown] = useState(initial_state.code_sent ? RESEND_COOLDOWN_SECONDS : 0)

  useGsapReveal('[data-auth="intro"], [data-auth="form"]', { root: root_ref, stagger: 0.08 })

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const goToLogin = useCallback(() => {
    navigate('/login', { state: { verified: true, email: email.trim() } })
  }, [email, navigate])

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage('')

    if (!validateEmail(email.trim())) {
      setErrorMessage('E-mail inválido')
      return
    }

    if (!/^\d{6}$/.test(code)) {
      setErrorMessage('Digite o código de 6 dígitos')
      return
    }

    setIsSubmitting(true)

    try {
      await verifyEmail(email.trim(), code)
      goToLogin()
    } catch (error) {
      // 409: o e-mail já estava verificado — nada a fazer além de entrar.
      if (error instanceof AxiosError && error.response?.status === 409) {
        goToLogin()
        return
      }

      setErrorMessage(mapAuthError(error, {
        status: 400,
        message: 'Código incorreto. Confira o e-mail e tente novamente.',
        fallback_message: 'Não foi possível verificar o e-mail. Tente novamente.',
        status_messages: {
          404: 'Não encontramos uma conta com este e-mail.',
          410: 'Este código expirou. Peça um novo código.',
          429: 'Muitas tentativas com código errado. Peça um novo código.'
        }
      }))
    } finally {
      setIsSubmitting(false)
    }
  }, [email, code, verifyEmail, goToLogin])

  const handleResend = useCallback(async () => {
    setErrorMessage('')
    setInfoMessage('')

    if (!validateEmail(email.trim())) {
      setErrorMessage('E-mail inválido')
      return
    }

    setIsResending(true)

    try {
      await resendVerificationCode(email.trim())
      setCode('')
      setInfoMessage(`Enviamos um novo código para ${email.trim()}.`)
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 409) {
        goToLogin()
        return
      }

      if (error instanceof AxiosError && error.response?.status === 429) {
        setCooldown(RESEND_COOLDOWN_SECONDS)
      }

      setErrorMessage(mapAuthError(error, {
        status: 429,
        message: 'Aguarde um minuto antes de pedir outro código.',
        fallback_message: 'Não foi possível reenviar o código. Tente novamente.',
        status_messages: {
          404: 'Não encontramos uma conta com este e-mail.',
          500: 'Não foi possível enviar o e-mail agora. Tente novamente em instantes.'
        }
      }))
    } finally {
      setIsResending(false)
    }
  }, [email, resendVerificationCode, goToLogin])

  return (
    <div ref={root_ref} className="app-shell flex flex-col text-foreground">
      <Header hide_auth_cta />

      <main className="relative z-10 flex flex-1 items-center px-4 py-10 md:px-8 md:py-14">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 lg:grid-cols-[1.05fr_0.85fr] lg:items-center">
          <section data-auth="intro" className="surface-panel p-7 md:p-10">
            <p className="heading-kicker mb-4">Verificação de e-mail</p>
            <h1 className="text-4xl leading-tight text-foreground md:text-5xl">Confirme seu e-mail</h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              {initial_state.email ? (
                <>
                  Enviamos um código de 6 dígitos para{' '}
                  <span className="font-semibold text-foreground">{initial_state.email}</span>.
                  Digite-o para ativar sua conta.
                </>
              ) : (
                'Informe o e-mail cadastrado e o código de 6 dígitos que enviamos para ativar sua conta.'
              )}
            </p>
          </section>

          <aside data-auth="form" className="surface-panel p-7 md:p-9">
            <div className="mb-6">
              <p className="heading-kicker mb-2">Código de verificação</p>
              <h2 className="text-2xl text-foreground">Ativar conta</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                O código vale por 15 minutos. Se não encontrar o e-mail, confira a caixa de spam.
              </p>
            </div>

            {info_message && (
              <div className="mb-4 rounded-xl border border-success/40 bg-success/20 px-4 py-3 text-sm font-semibold text-success">
                {info_message}
              </div>
            )}

            {error_message && (
              <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error_message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!initial_state.email && (
                <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  E-mail
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="nome@fho.edu.br"
                      className="input-shell pl-9 text-sm"
                      autoComplete="email"
                    />
                  </div>
                </label>
              )}

              <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Código
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="input-shell font-data pl-9 text-sm tracking-[0.4em]"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={is_submitting}
                className="btn-primary w-full disabled:opacity-50"
              >
                {is_submitting ? 'Verificando...' : 'Verificar e-mail'}
              </button>
            </form>

            <p className="mt-6 text-sm text-muted-foreground">
              Não recebeu o código?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={is_resending || cooldown > 0}
                className="font-semibold text-foreground transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-foreground"
              >
                {is_resending ? 'Enviando...' : cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
              </button>
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              Já verificou?{' '}
              <button
                type="button"
                onClick={() => navigate('/login', { state: { email: email.trim() } })}
                className="font-semibold text-foreground transition-colors hover:text-primary"
              >
                Entrar
              </button>
            </p>
          </aside>
        </div>
      </main>

      <footer className="border-t border-border/70 bg-background/65 px-4 py-5 text-center backdrop-blur-sm">
        <p className="text-[11px] tracking-[0.13em] text-muted-foreground">© 2026 BehaviorLab - Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
