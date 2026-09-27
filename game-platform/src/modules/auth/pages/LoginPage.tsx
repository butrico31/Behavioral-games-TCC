import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { Header } from '../../../shared/components/Header'
import { useAuth } from '../hooks/useAuth'
import { validateEmail } from '../../../shared/utils/validation'
import { RateLimiter } from '../../../shared/utils/security'
import { useGsapReveal } from '../../../shared/hooks/useGsapReveal'
import { mapAuthError } from '../../../shared/utils/mapAuthError'

const rate_limiter = new RateLimiter(5, 60000)

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const root_ref = useRef<HTMLDivElement | null>(null)
  const { login } = useAuth()
  const [email, setEmail] = useState(() => (location.state as { email?: string } | null)?.email ?? '')
  const [password, setPassword] = useState('')
  const [error_message, setErrorMessage] = useState('')
  const [is_submitting, setIsSubmitting] = useState(false)
  const [show_success, setShowSuccess] = useState(false)

  useGsapReveal('[data-auth="intro"], [data-auth="form"]', { root: root_ref, stagger: 0.08 })

  useEffect(() => {
    const state = location.state as { verified?: boolean } | null
    setShowSuccess(Boolean(state?.verified))
  }, [location.state])

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage('')

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Preencha todos os campos')
      return
    }

    if (!validateEmail(email)) {
      setErrorMessage('E-mail inválido')
      return
    }

    if (!rate_limiter.canAttempt('login')) {
      setErrorMessage('Muitas tentativas. Aguarde um momento.')
      return
    }

    setIsSubmitting(true)

    try {
      await login(email, password)
      rate_limiter.reset('login')

      const state = location.state as { from?: string } | null
      const redirect_target = state?.from && typeof state.from === 'string' ? state.from : '/sessions'
      navigate(redirect_target)
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 403) {
        navigate('/verify-email', { state: { email: email.trim(), unverified: true } })
        return
      }

      setErrorMessage(mapAuthError(error, {
        status: 401,
        message: 'E-mail ou senha incorretos. Tente novamente.',
        fallback_message: 'Erro ao autenticar. Tente novamente.'
      }))
    } finally {
      setIsSubmitting(false)
    }
  }, [email, password, login, location.state, navigate])

  return (
    <div ref={root_ref} className="app-shell flex flex-col text-foreground">
      <Header hide_auth_cta />

      <main className="relative z-10 flex flex-1 items-center px-4 py-10 md:px-8 md:py-14">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 lg:grid-cols-[1.05fr_0.85fr] lg:items-center">
          <section data-auth="intro" className="surface-panel p-7 md:p-10">
            <p className="heading-kicker mb-4">Acesso institucional</p>
            <h1 className="text-4xl leading-tight text-foreground md:text-5xl">Acesso ao BehaviorLab</h1>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
                Entre com seu e-mail institucional para continuar.
              </p>
          </section>

          <aside data-auth="form" className="surface-panel p-7 md:p-9">
            <div className="mb-6">
              <p className="heading-kicker mb-2">Credenciais</p>
              <h2 className="text-2xl text-foreground">Entrar</h2>
              <p className="mt-2 text-sm text-muted-foreground">Use o e-mail institucional cadastrado.</p>
            </div>

            {show_success && (
              <div className="mb-4 rounded-xl border border-success/40 bg-success/20 px-4 py-3 text-sm font-semibold text-success">
                E-mail verificado com sucesso. Faça login para continuar.
              </div>
            )}

            {error_message && (
              <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error_message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                E-mail
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nome@fho.edu.br"
                  className="input-shell text-sm"
                  autoComplete="email"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Senha
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="input-shell text-sm"
                  autoComplete="current-password"
                />
              </label>
              <button
                type="submit"
                disabled={is_submitting}
                className="btn-primary w-full disabled:opacity-50"
              >
                {is_submitting ? 'Entrando...' : 'Entrar no sistema'}
              </button>
            </form>

            <p className="mt-6 text-sm text-muted-foreground">
              Não tem conta?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="font-semibold text-foreground transition-colors hover:text-primary"
              >
                Criar conta
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
