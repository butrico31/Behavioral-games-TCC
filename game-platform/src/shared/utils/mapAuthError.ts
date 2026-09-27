import { AxiosError } from 'axios'

interface MapAuthErrorOptions {
  /** The status code this call site has a specific message for (401 for login, 409 for register). */
  status: number
  /** Message shown when `error.response.status === status`. */
  message: string
  /** Message shown for any other non-5xx, non-network AxiosError. */
  fallback_message: string
  /** Messages for other statuses this screen handles (e.g. 410/429 on email verification). */
  status_messages?: Partial<Record<number, string>>
}

/**
 * The Axios-error-to-Portuguese-message mapping duplicated between LoginPage
 * and RegisterPage (same 5xx/network/generic branches, differing only in which
 * specific status code each screen cares about).
 */
export function mapAuthError(error: unknown, options: MapAuthErrorOptions): string {
  if (!(error instanceof AxiosError)) {
    return 'Erro inesperado. Tente novamente.'
  }

  if (error.response?.status === options.status) {
    return options.message
  }
  const status_message = error.response && options.status_messages?.[error.response.status]
  if (status_message) {
    return status_message
  }
  if (error.response && error.response.status >= 500) {
    return 'Erro no servidor. Tente novamente mais tarde.'
  }
  if (error.code === 'ERR_NETWORK') {
    return 'Erro de conexão. Verifique se o servidor está rodando.'
  }
  return options.fallback_message
}
