import { api_client } from '../../../infrastructure/api/api-client'
import type {
  MatchResultDetail,
  SessionResultsDetail,
  SessionResultsListItem
} from '../types'
import type { RouletteReport } from '../../roulette/types/roulette'

export const reportsService = {
  getSessionsResults: async (): Promise<SessionResultsListItem[]> => {
    const response = await api_client.get<SessionResultsListItem[]>('/sessions/results')
    return response.data
  },

  getSessionResults: async (sessionId: string): Promise<SessionResultsDetail> => {
    const response = await api_client.get<SessionResultsDetail>(
      `/sessions/${sessionId}/results`
    )
    return response.data
  },

  getMatchResult: async (
    sessionId: string,
    matchId: string
  ): Promise<MatchResultDetail> => {
    const response = await api_client.get<MatchResultDetail>(
      `/sessions/${sessionId}/results/${matchId}`
    )
    return response.data
  },

  /** Relatório completo de uma partida da roleta, calculado no backend. */
  getRouletteMatchReport: async (sessionId: string, matchId: string): Promise<RouletteReport> => {
    const response = await api_client.get<RouletteReport>(
      `/sessions/${sessionId}/results/${matchId}/roulette-report`
    )
    return response.data
  }
}
