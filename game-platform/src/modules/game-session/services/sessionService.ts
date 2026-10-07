import { api_client } from '../../../infrastructure/api/api-client'
import type {
  Session,
  PublicSession,
  JoinSessionPayload,
  JoinSessionResponse,
  GameConfig,
  GameCatalogItem,
  GameConfigFieldsResponse,
  ValidPlayerFieldsResponse,
  CreateConfigPayload,
  CreateSessionPayload,
  CreateSessionResponse
} from '../types'

export const sessionService = {
  // Game catalog endpoints
  getGames: async (): Promise<GameCatalogItem[]> => {
    const response = await api_client.get<GameCatalogItem[]>('/games')
    return response.data
  },

  getGameConfigFields: async (game: string): Promise<GameConfigFieldsResponse> => {
    const response = await api_client.get<GameConfigFieldsResponse>('/settings/game-config/fields', {
      params: { game }
    })
    return response.data
  },

  getValidPlayerFields: async (): Promise<ValidPlayerFieldsResponse> => {
    const response = await api_client.get<ValidPlayerFieldsResponse>('/settings/player-fields/valid')
    return response.data
  },

  // Session endpoints
  getAllSessions: async (): Promise<Session[]> => {
    const response = await api_client.get<Session[]>('/sessions')
    return response.data
  },

  createSession: async (payload: CreateSessionPayload): Promise<CreateSessionResponse> => {
    const response = await api_client.post<CreateSessionResponse>('/sessions', payload)
    return response.data
  },

  /** Busca da tela de entrada: uma sessão só, pelo código, sempre do servidor (sem cache). */
  getSessionByCode: async (code: string): Promise<PublicSession> => {
    const response = await api_client.get<PublicSession>(
      `/sessions/codigo/${encodeURIComponent(code.trim().toUpperCase())}`
    )
    return response.data
  },

  joinSession: async (payload: JoinSessionPayload): Promise<JoinSessionResponse> => {
    const response = await api_client.post<JoinSessionResponse>('/sessions/join', payload)
    return response.data
  },

  deleteSession: async (id: string): Promise<void> => {
    await api_client.delete(`/sessions/${id}`)
  },

  finishSession: async (id: string): Promise<void> => {
    await api_client.post(`/sessions/${id}/finish`)
  },

  // Config endpoints
  getConfigsByGame: async (game: string): Promise<GameConfig[]> => {
    const response = await api_client.get<GameConfig[]>(`/settings/game/${game}`)
    return response.data
  },

  createConfig: async (payload: CreateConfigPayload): Promise<GameConfig> => {
    const response = await api_client.post<GameConfig>('/settings', payload)
    return response.data
  },

  deleteConfig: async (id: string): Promise<void> => {
    await api_client.delete(`/settings/${id}`)
  }
}
