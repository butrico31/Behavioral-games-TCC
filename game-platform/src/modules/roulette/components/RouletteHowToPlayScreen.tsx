import { Badge, FitToScreen, panelClass } from '../../game-session/components/MatchShell'
import { CONDITION_COLORS } from '../config/conditions'
import type { RouletteMatchView } from '../types/roulette'

interface RouletteHowToPlayScreenProps {
  view: RouletteMatchView
  /** Pedido de início em andamento (o relógio começa no servidor quando ele responde). */
  starting?: boolean
  error?: string | null
  onReady: () => void
}

/** Aposta usada nos exemplos de cada cor. */
const EXAMPLE_BET = 10

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds} segundos`
  const min = `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
  return seconds === 0 ? min : `${min} e ${seconds} segundos`
}

const STEPS = [
  { title: 'Escolha uma cor', text: 'Azul, vermelho ou preto. É nela que você aposta.' },
  { title: 'Defina o valor', text: 'Use − e +, digite o número ou toque nas fichas de atalho.' },
  { title: 'Gire a roleta', text: 'A aposta sai das suas fichas na hora. Se a bola cair na sua cor, você recebe a aposta de volta mais o prêmio.' },
]

/**
 * Regras antes da partida, no mesmo padrão do "Como jogar" do jogo das cartas. O relógio da
 * partida fica parado enquanto esta tela está aberta: só começa no "Começar" (start no servidor).
 */
export function RouletteHowToPlayScreen({ view, starting = false, error, onReady }: RouletteHowToPlayScreenProps) {
  const pockets = view.wheel.length

  const rules: string[] = [
    `Você começa com ${view.initMoney} fichas. A partida termina quando você chegar a ${view.pointsLimit} fichas.`,
    view.timeLimit !== null
      ? `Você terá ${formatDuration(view.timeLimit)} para jogar. O tempo só começa a contar quando você clicar em Começar.`
      : 'Não há limite de tempo: jogue no seu ritmo.',
    view.maxRefills > 0
      ? `Se as suas fichas acabarem, você recebe ${view.initMoney} fichas de novo (até ${view.maxRefills} ${
          view.maxRefills === 1 ? 'vez' : 'vezes'
        }). Depois disso, a partida termina.`
      : 'Se as suas fichas acabarem, a partida termina.',
    ...(view.allowGiveUp ? ['Você pode encerrar a partida quando quiser pelo botão "Encerrar partida".'] : []),
    'Em algumas rodadas pode aparecer um aviso do professor. Leia e clique em Entendi para continuar.',
  ]

  return (
    <FitToScreen>
      <div className={`${panelClass} flex max-w-[1100px] flex-col gap-[clamp(10px,1.8dvh,20px)]`}>
        <header className="shrink-0">
          <Badge>Como jogar</Badge>
          <h1 className="mt-3 text-[clamp(24px,3.6dvh,38px)] font-black leading-[1.05] tracking-[-0.04em]">
            Aposte suas fichas na roleta.
          </h1>
          <p className="mt-2 max-w-[680px] text-[clamp(14px,1.9dvh,16.5px)] font-medium leading-relaxed text-[#5C6675]">
            Seu objetivo é sair de <strong className="text-[#12151B]">{view.initMoney} fichas</strong> e chegar a{' '}
            <strong className="text-[#12151B]">{view.pointsLimit} fichas</strong>. Cada rodada tem três passos:
          </p>
        </header>

        <ol className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex items-start gap-3 rounded-[20px] border-2 border-[#BFE2FA] bg-[#F2F8FE] p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(160deg,#0C8AE6,#0068C8)] text-[15px] font-black text-white">
                {index + 1}
              </span>
              <span>
                <span className="block text-[16px] font-black tracking-[-0.01em]">{step.title}</span>
                <span className="mt-0.5 block text-[13.5px] font-medium leading-snug text-[#3C4654]">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>

        <section className="shrink-0">
          <p className="mb-2 text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-[#5C6675]">
            Quanto cada cor paga
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {view.conditions.map((condition) => {
              const slots = Math.round(condition.chance * pockets)
              const profit = EXAMPLE_BET * (condition.payout - 1)
              return (
                <div key={condition.id} className="flex flex-col gap-1.5 rounded-[20px] border-2 border-[#E6EEF6] bg-[#F7FAFD] p-4">
                  <div className="flex items-center gap-2.5">
                    <span className="h-6 w-6 rounded-lg" style={{ background: CONDITION_COLORS[condition.id] }} />
                    <span className="text-lg font-black tracking-[-0.02em]">{condition.label}</span>
                    <span className="ml-auto rounded-full bg-white px-2.5 py-0.5 text-[12px] font-extrabold text-[#3C4654]">
                      {slots} de {pockets} casas
                    </span>
                  </div>
                  <p className="text-[13.5px] font-medium leading-snug text-[#3C4654]">
                    Apostou {EXAMPLE_BET} e acertou? Recebe as {EXAMPLE_BET} de volta{' '}
                    <strong className="text-[#0B7A43]">+ {profit} fichas</strong>.
                  </p>
                  <p className="text-[12.5px] font-semibold text-[#5C6675]">
                    {condition.chance < 0.2 ? 'Paga muito, mas é difícil de sair.' : 'Paga menos, mas sai quase metade das vezes.'}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="flex min-h-0 flex-col gap-2 rounded-[20px] border-2 border-[#E6EEF6] bg-[#F7FAFD] p-4">
          <p className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-[#5C6675]">Regras da partida</p>
          <ul className="flex flex-col gap-1.5">
            {rules.map((rule) => (
              <li key={rule} className="flex gap-2.5 text-[14px] font-medium leading-snug text-[#3C4654]">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#00A3F5]" />
                {rule}
              </li>
            ))}
          </ul>
        </section>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-4">
          <p className={`max-w-[360px] text-[13px] font-semibold leading-snug ${error ? 'text-[#A3161C]' : 'text-[#5C6675]'}`}>
            {error ?? 'Suas jogadas ficam registradas para a análise do professor.'}
          </p>
          <button
            type="button"
            onClick={onReady}
            disabled={starting}
            className="shrink-0 animate-[dpGlow_2.2s_ease-in-out_infinite] rounded-full bg-[#00A3F5] px-12 py-[clamp(12px,2.2dvh,19px)] text-xl font-black tracking-[0.06em] text-[#08243C] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
          >
            {starting ? 'INICIANDO…' : 'COMEÇAR'}
          </button>
        </footer>
      </div>
    </FitToScreen>
  )
}
