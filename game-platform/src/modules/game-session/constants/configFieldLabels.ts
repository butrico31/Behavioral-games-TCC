/**
 * Rótulos e explicações dos campos de configuração da sessão, no padrão do dicionário de
 * campos do jogador (usePlayerFields). Sem isto o formulário mostra o nome técnico vindo do
 * backend ("Round Time Limit"), sem unidade e sem dizer o que significa deixar em branco.
 */
export const CONFIG_FIELD_LABELS_PT: Record<string, string> = {
  configName: 'Nome da configuração',
  game: 'Jogo',
  // prisioneiro
  userViewPoints: 'Mostrar a pontuação do outro jogador',
  limitRounds: 'Quantidade de rodadas',
  roundTimeLimit: 'Tempo de cada rodada (segundos)',
  sessionTimeLimit: 'Tempo total da sessão (minutos)',
  // roleta
  timeLimit: 'Tempo limite (segundos)',
  pointsLimit: 'Limite de pontos',
  initMoney: 'Dinheiro inicial',
  popup: 'Aviso na tela'
}

/** Texto de apoio abaixo do campo. O vazio tem significado, então precisa estar escrito. */
export const CONFIG_FIELD_HINTS_PT: Record<string, string> = {
  limitRounds: 'Deixe vazio para usar 10 rodadas.',
  roundTimeLimit: 'Deixe vazio para rodadas sem tempo, no ritmo dos jogadores.',
  sessionTimeLimit:
    'Conta a partir da entrada do primeiro jogador. Ao acabar, as partidas encerram com as rodadas já jogadas. Vazio = sem limite.',
  userViewPoints:
    'Desligado, o jogador não vê os pontos do outro durante a partida. O resultado final continua mostrando tudo.'
}
