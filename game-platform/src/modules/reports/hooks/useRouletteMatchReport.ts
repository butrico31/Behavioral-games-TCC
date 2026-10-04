import { useResourceQuery } from '../../../shared/hooks/useResourceQuery'
import { reportsService } from '../services/reportsService'

export const useRouletteMatchReport = (sessionId: string | undefined, matchId: string | undefined) => {
  const query = useResourceQuery({
    queryKey: ['reports', 'session', sessionId, 'match', matchId, 'roulette-report'],
    queryFn: () => reportsService.getRouletteMatchReport(sessionId as string, matchId as string),
    enabled: !!sessionId && !!matchId
  })

  return {
    data: query.data ?? null,
    is_loading: query.is_loading,
    is_error: query.is_error
  }
}
