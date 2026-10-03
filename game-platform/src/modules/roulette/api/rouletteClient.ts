import axios, { AxiosError } from 'axios'
import type { RouletteMatchView, RouletteSpinRequest, RouletteSpinResponse } from '../types/roulette'

const roulette_api_url = import.meta.env.VITE_ROULETTE_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000'

function resolveAuthToken(): string | null {
  return (
    localStorage.getItem('auth_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('jwt') ||
    sessionStorage.getItem('auth_token') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('jwt')
  )
}

function resolveErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axios_error = error as AxiosError<{ message?: string | string[] }>
    const response_message = axios_error.response?.data?.message
    if (Array.isArray(response_message)) {
      return response_message[0] || 'Falha na chamada da API de roleta.'
    }
    if (typeof response_message === 'string' && response_message.length > 0) {
      return response_message
    }

    if (typeof axios_error.message === 'string' && axios_error.message.length > 0) {
      return axios_error.message
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Falha na chamada da API de roleta.'
}

const roulette_client = axios.create({
  baseURL: roulette_api_url,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

roulette_client.interceptors.request.use((config) => {
  const token = resolveAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export class RouletteApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RouletteApiError'
  }
}

export async function joinRouletteMatch(matchId: string, playerId: string): Promise<RouletteMatchView> {
  try {
    const response = await roulette_client.post<RouletteMatchView>(`/roulette/matches/${matchId}/join`, undefined, {
      params: { playerId },
    })
    return response.data
  } catch (error) {
    throw new RouletteApiError(resolveErrorMessage(error))
  }
}

export async function spinRouletteMatch(matchId: string, payload: RouletteSpinRequest): Promise<RouletteSpinResponse> {
  try {
    const response = await roulette_client.post<RouletteSpinResponse>(`/roulette/matches/${matchId}/spin`, payload)
    return response.data
  } catch (error) {
    throw new RouletteApiError(resolveErrorMessage(error))
  }
}

export async function getRouletteMatchState(matchId: string): Promise<RouletteMatchView> {
  try {
    const response = await roulette_client.get<RouletteMatchView>(`/roulette/matches/${matchId}/state`)
    return response.data
  } catch (error) {
    throw new RouletteApiError(resolveErrorMessage(error))
  }
}

export async function finishRouletteMatch(matchId: string): Promise<RouletteMatchView> {
  try {
    const response = await roulette_client.post<RouletteMatchView>(`/roulette/matches/${matchId}/finish`)
    return response.data
  } catch (error) {
    throw new RouletteApiError(resolveErrorMessage(error))
  }
}
