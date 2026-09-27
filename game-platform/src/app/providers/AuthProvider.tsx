import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { authService } from '../../modules/auth/services/authService'
import type { AuthContextType, RegisterRequest, User } from '../../modules/auth/types'

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [access_token, setAccessToken] = useState<string | null>(null)
  const [is_loading, setIsLoading] = useState(true)

  // Verifica token ao montar componente
  useEffect(() => {
    const initializeAuth = () => {
      const stored_token = authService.getStoredToken()

      if (!stored_token) {
        setIsLoading(false)
        return
      }

      // Verifica se token expirou
      if (authService.isTokenExpired(stored_token)) {
        authService.removeToken()
        setIsLoading(false)
        return
      }

      // Decodifica token para obter user
      const decoded_user = authService.decodeToken(stored_token)

      if (!decoded_user) {
        authService.removeToken()
        setIsLoading(false)
        return
      }

      // Restaura estado de autenticação
      setUser(decoded_user)
      setAccessToken(stored_token)
      setIsLoading(false)
    }

    initializeAuth()
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setIsLoading(true)

    try {
      // Chama API de login
      const response = await authService.login(email, password)
      const { access_token: token } = response

      // Armazena token
      authService.storeToken(token)

      // Decodifica para obter user
      const decoded_user = authService.decodeToken(token)

      if (!decoded_user) {
        throw new Error('Falha ao decodificar token recebido')
      }

      // Atualiza estado
      setUser(decoded_user)
      setAccessToken(token)
    } catch (error) {
      // Remove qualquer token inválido
      authService.removeToken()
      setUser(null)
      setAccessToken(null)
      
      // Propaga erro para componente tratar
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (payload: RegisterRequest): Promise<void> => {
    await authService.register(payload)
  }, [])

  const verifyEmail = useCallback(async (email: string, code: string): Promise<void> => {
    await authService.verifyEmail(email, code)
  }, [])

  const resendVerificationCode = useCallback(async (email: string): Promise<void> => {
    await authService.resendVerificationCode(email)
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
    setAccessToken(null)
  }, [])

  const value: AuthContextType = {
    user,
    access_token,
    is_authenticated: !!user && !!access_token,
    is_loading,
    login,
    register,
    verifyEmail,
    resendVerificationCode,
    logout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
