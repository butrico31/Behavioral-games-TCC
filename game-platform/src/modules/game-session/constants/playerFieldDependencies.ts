/**
 * Alguns dados do jogador só fazem sentido perguntar se outro também estiver sendo
 * coletado (ex.: perguntar o semestre não faz sentido sem saber a escolaridade).
 * Mapeia campo "pai" -> campos que só aparecem como opção quando o pai está marcado.
 */
export const PLAYER_FIELD_DEPENDENTS: Record<string, string[]> = {
  educationLevel: ['semester', 'course']
}
