import type { GameConfigFieldDefinition } from '../types'

/**
 * Como os campos do jogo se dividem no assistente (modo "Criar Nova"):
 * - 'game': vai junto com o nome na etapa "Configuração da Partida", em grade de 2 colunas;
 * - 'popups': ganha etapa própria, porque a lista cresce e não cabe junto sem rolar.
 */
export type ConfigFieldGroupId = 'game' | 'popups'

/** Grupos com etapa própria depois da "Configuração da Partida". */
export type ConfigFieldStepId = Exclude<ConfigFieldGroupId, 'game'>

export interface ConfigFieldStepMeta {
  id: ConfigFieldStepId
  title: string
  description: string
}

export const CONFIG_FIELD_STEPS: ConfigFieldStepMeta[] = [
  {
    id: 'popups',
    title: 'Popups por Rodada',
    description: 'Mensagens que aparecem para o jogador no início das rodadas escolhidas.'
  }
]

/** Campo -> grupo. O que não estiver aqui fica na etapa "Configuração da Partida". */
const FIELD_GROUP: Record<string, ConfigFieldGroupId> = {
  roundPopups: 'popups'
}

export function group_fields_by_step(
  fields: GameConfigFieldDefinition[]
): Record<ConfigFieldGroupId, GameConfigFieldDefinition[]> {
  const groups: Record<ConfigFieldGroupId, GameConfigFieldDefinition[]> = {
    game: [],
    popups: []
  }
  for (const field of fields) {
    if (field.name === 'game') continue
    groups[FIELD_GROUP[field.name] ?? 'game'].push(field)
  }
  return groups
}
