import { randomInt } from 'crypto';
import { RouletteMoveOption } from '../match/match.entity';

/**
 * Regras da roleta. Tudo que decide resultado, saldo e fim de partida mora aqui; o front só
 * desenha o que recebe (roda, condições, fichas) e anima até a casa que o servidor sorteou.
 */

export interface RoulettePocket {
  label: string;
  condition: RouletteMoveOption;
}

export interface RouletteCondition {
  id: RouletteMoveOption;
  label: string;
  /** Retorno total sobre a aposta: 2 = devolve a aposta + 1× de lucro. */
  payout: number;
  payoutLabel: string;
  /** Chance de cair nesta condição (casas da cor / total de casas). */
  chance: number;
}

/** Ordem física de uma roleta americana (0, 00 e 1–36), começando no topo. */
const WHEEL_ORDER = [
  '0', '28', '9', '26', '30', '11', '7', '20', '32', '17', '5', '22', '34', '15', '3', '24', '36', '13', '1',
  '00', '27', '10', '25', '29', '12', '8', '19', '31', '18', '6', '21', '33', '16', '4', '23', '35', '14', '2',
];

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

/** 0 e 00 são as casas azuis (no cassino seriam verdes). */
function conditionOf(label: string): RouletteMoveOption {
  if (label === '0' || label === '00') return RouletteMoveOption.AZUL;
  return RED_NUMBERS.has(Number(label)) ? RouletteMoveOption.VERMELHO : RouletteMoveOption.PRETO;
}

export const ROULETTE_WHEEL: RoulettePocket[] = WHEEL_ORDER.map((label) => ({
  label,
  condition: conditionOf(label),
}));

const PAYOUTS: Record<RouletteMoveOption, number> = {
  [RouletteMoveOption.AZUL]: 18,
  [RouletteMoveOption.VERMELHO]: 2,
  [RouletteMoveOption.PRETO]: 2,
};

const LABELS: Record<RouletteMoveOption, string> = {
  [RouletteMoveOption.AZUL]: 'Azul',
  [RouletteMoveOption.VERMELHO]: 'Vermelho',
  [RouletteMoveOption.PRETO]: 'Preto',
};

export function chanceOf(condition: RouletteMoveOption): number {
  return ROULETTE_WHEEL.filter((pocket) => pocket.condition === condition).length / ROULETTE_WHEEL.length;
}

export const ROULETTE_CONDITIONS: RouletteCondition[] = [
  RouletteMoveOption.AZUL,
  RouletteMoveOption.VERMELHO,
  RouletteMoveOption.PRETO,
].map((id) => ({
  id,
  label: LABELS[id],
  payout: PAYOUTS[id],
  payoutLabel: `paga ${PAYOUTS[id]}×`,
  chance: chanceOf(id),
}));

/** Atalhos de aposta mostrados na mesa. */
export const ROULETTE_CHIP_VALUES = [1, 5, 10, 25];

/** Valores usados quando a configuração deixa o campo vazio (o formulário manda 0). */
export const DEFAULT_INIT_MONEY = 50;
export const DEFAULT_GOAL = 300;

/** Sorteio uniforme entre as 38 casas. */
export function drawPocket(): RoulettePocket {
  return ROULETTE_WHEEL[randomInt(ROULETTE_WHEEL.length)];
}

/** Variação do saldo: ganhando recebe aposta × (pagamento − 1); perdendo, perde a aposta. */
export function deltaFor(condition: RouletteMoveOption, aposta: number, won: boolean): number {
  return won ? aposta * (PAYOUTS[condition] - 1) : -aposta;
}
