import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { sessionService } from '../services/sessionService'
import type { GameConfigFieldDefinition } from '../types'

// roundPopups: lista de { round, message } com editor próprio (RoundPopupsEditor).
const SAFE_FIELD_TYPES = new Set(['string', 'number', 'boolean', 'roundPopups'])

const normalize_type = (field_name: string, field_type: string): string => {
  // Product rule: keep difficulty as a controlled choice list.
  if (field_name === 'difficulty') return 'enum(Fácil,Médio,Difícil)'
  if (SAFE_FIELD_TYPES.has(field_type)) return field_type
  if (/^enum\(.+\)$/.test(field_type)) return field_type
  return 'unsupported'
}

export const useGameConfigFields = (game: string) => {
  const fields_query = useQuery({
    queryKey: ['game-config-fields', game],
    queryFn: () => sessionService.getGameConfigFields(game),
    enabled: !!game,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  })

  const common_fields = useMemo<GameConfigFieldDefinition[]>(() => {
    const fields = fields_query.data?.common ?? []
    return fields
      .filter((field) => Boolean(field?.name))
      .map((field) => ({ ...field, type: normalize_type(field.name, field.type) }))
      .filter((field) => field.type !== 'unsupported')
  }, [fields_query.data])

  const game_fields = useMemo<GameConfigFieldDefinition[]>(() => {
    if (!fields_query.data || !game) return []
    const fields = fields_query.data[game] ?? []
    return fields
      .filter((field) => Boolean(field?.name))
      .map((field) => ({ ...field, type: normalize_type(field.name, field.type) }))
      .filter((field) => field.type !== 'unsupported')
  }, [fields_query.data, game])

  return {
    fields_response: fields_query.data ?? null,
    common_fields,
    game_fields,
    all_fields: [...common_fields, ...game_fields],
    is_loading: fields_query.isLoading || fields_query.isFetching,
    is_error: fields_query.isError,
    refetch: fields_query.refetch
  }
}
