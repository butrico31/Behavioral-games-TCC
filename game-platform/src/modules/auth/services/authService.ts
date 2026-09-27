import { api_client } from '../../../infrastructure/api/api-client'
import { AUTH_TOKEN_STORAGE_KEY } from '../../../shared/constants/storageKeys'
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  User,
  VerifyEmailRequest
} from '../types'

/**
 * Parses a JWT's payload segment (header.payload.signature). Returns null for
 * any malformed token instead of throwing — the shared parsing step previously
 * duplicated verbatim in both decodeToken and isTokenExpired.
 */
const parseJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    return JSON.parse(atob(parts[1])) as Record<string, unknown>
  } catch {
    return null
  }
}

export const authService = {
  /**
   * Realiza login e retorna access_token
   */
  login: async (login: string, password: string): Promise<LoginResponse> => {
    const response = await api_client.post<LoginResponse>('/auth/login', {
      login,
      password
    } as LoginRequest)
    
    return response.data
  },

  register: async (payload: RegisterRequest): Promise<RegisterResponse> => {
    const response = await api_client.post<RegisterResponse>('/users', payload)
    return response.data
  },

  /**
   * Confirma o código de 6 dígitos enviado por e-mail no cadastro
   */
  verifyEmail: async (login: string, code: string): Promise<void> => {
    await api_client.post('/users/verify-email', { login, code } as VerifyEmailRequest)
  },

  /**
   * Pede um novo código de verificação (o backend aceita 1 por minuto)
   */
  resendVerificationCode: async (login: string): Promise<void> => {
    await api_client.post('/users/resend-verification', { login } as ResendVerificationRequest)
  },

  /**
   * Obtém token armazenado no localStorage
   */
  getStoredToken: (): string | null => {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  },

  /**
   * Armazena token no localStorage
   */
  storeToken: (token: string): void => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
  },

  /**
   * Remove token do localStorage
   */
  removeToken: (): void => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  },

  /**
   * Decodifica JWT e extrai payload
   * Valida formato antes de decodificar
   */
  decodeToken: (token: string): User | null => {
    const payload = parseJwtPayload(token)
    if (!payload) return null

    // Valida campos obrigatórios (tipados, não mais `any` implícito via JSON.parse)
    const { sub, login, name } = payload
    if (typeof sub !== 'string' || typeof login !== 'string') return null

    return {
      id: sub,
      login,
      ...(typeof name === 'string' ? { name } : {})
    }
  },

  /**
   * Verifica se token está expirado
   */
  isTokenExpired: (token: string): boolean => {
    const payload = parseJwtPayload(token)
    if (!payload) return true

    // Se não tiver exp (ou não for numérico), considera não expirado
    // (backend não configurou expiração)
    const { exp } = payload
    if (!exp || typeof exp !== 'number') return false

    // exp está em seconds, Date.now() em milliseconds
    return exp * 1000 < Date.now()
  },

  /**
   * Realiza logout
   */
  logout: (): void => {
    authService.removeToken()
  }
}
