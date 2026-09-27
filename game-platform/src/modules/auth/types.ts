export interface LoginRequest {
  login: string
  password: string
}

export interface LoginResponse {
  access_token: string
}

export interface RegisterRequest {
  name: string
  login: string
  password: string
}

export interface RegisterResponse {
  id: string
  login: string
}

export interface VerifyEmailRequest {
  login: string
  code: string
}

export interface ResendVerificationRequest {
  login: string
}

export interface User {
  id: string
  login: string
  name?: string
}

export interface AuthState {
  user: User | null
  access_token: string | null
  is_authenticated: boolean
  is_loading: boolean
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterRequest) => Promise<void>
  verifyEmail: (email: string, code: string) => Promise<void>
  resendVerificationCode: (email: string) => Promise<void>
  logout: () => void
}
