import { useEffect, useState } from 'react'
import { RouletteApiError, getRouletteReport } from '../api/rouletteClient'
import type { RouletteReport } from '../types/roulette'

const RETRY_MS = 2000
const MAX_TRIES = 10

/**
 * Relatório da partida encerrada, já calculado no servidor. Enquanto o e-mail ainda está saindo
 * ('pending'), consulta de novo algumas vezes para a tela mostrar se ele foi enviado.
 */
export function useRouletteReport(matchId: string, playerId: string, enabled: boolean) {
  const [report, setReport] = useState<RouletteReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !matchId || !playerId) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let tries = 0

    const load = () => {
      tries++
      getRouletteReport(matchId, playerId)
        .then((next) => {
          if (cancelled) return
          setReport(next)
          setError(null)
          if (next.email.status === 'pending' && tries < MAX_TRIES) timer = setTimeout(load, RETRY_MS)
        })
        .catch((err: unknown) => {
          if (cancelled) return
          if (tries < 3) {
            timer = setTimeout(load, RETRY_MS)
            return
          }
          setError(err instanceof RouletteApiError ? err.message : 'Não foi possível carregar o relatório.')
        })
    }
    load()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [matchId, playerId, enabled])

  return { report, error }
}
