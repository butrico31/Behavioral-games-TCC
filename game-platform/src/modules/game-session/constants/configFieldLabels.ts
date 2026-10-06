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
  tableLayout: 'Mesa',
  roundPopups: 'Popups por rodada',
  timeLimit: 'Tempo limite (segundos)',
  pointsLimit: 'Meta de fichas',
  initMoney: 'Fichas iniciais',
  popup: 'Aviso na tela',
  disableGiveUp: 'Bloquear desistência'
}

/** Texto de apoio abaixo do campo. O vazio tem significado, então precisa estar escrito. */
export const CONFIG_FIELD_HINTS_PT: Record<string, string> = {
  limitRounds: 'Deixe vazio para usar 10 rodadas.',
  sessionTimeLimit:
    'Conta a partir da entrada do primeiro jogador. Ao acabar, as partidas encerram com as rodadas já jogadas. Vazio = sem limite.',
  userViewPoints:
    'Desligado, o jogador não vê os pontos do outro durante a partida. O resultado final continua mostrando tudo.',
  timeLimit: 'Duração máxima da partida. Vazio = sem limite.',
  initMoney: 'Fichas com que o jogador começa. Vazio = 50.',
  pointsLimit:
    'A partida termina quando o saldo chega aqui. Precisa ser maior que as fichas iniciais. Vazio = 300.',
  tableLayout: 'Visual da mesa de roleta que o jogador vê durante a partida.',
  roundPopups:
    'A mensagem aparece para o jogador antes do giro da rodada escolhida. Uma mensagem por rodada; se o jogador não chegar àquela rodada, ela não aparece.',
  disableGiveUp:
    'Desligado (padrão), o jogador pode encerrar a partida a qualquer momento e sair com o saldo atual. Ligado, essa opção some — mas volta a aparecer assim que o saldo zerar pela primeira vez (as fichas são repostas até 2 vezes antes da partida terminar sozinha).'
}

/** Valores de campos enum -> texto exibido (o valor cru continua sendo o que vai para a API). */
export const CONFIG_ENUM_LABELS_PT: Record<string, string> = {
  mesa1: 'Mesa 1 · clássica',
  mesa2: 'Mesa 2 · cassino (tricromática)'
}

/** Id do jogo (vem cru da API, ex. "prisoner") -> nome exibido. */
export const GAME_LABELS_PT: Record<string, string> = {
  prisoner: 'Dilema do Prisioneiro',
  roulette: 'Roleta'
}
