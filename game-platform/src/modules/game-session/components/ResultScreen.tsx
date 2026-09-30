import { CARD_COLOR, CARD_NAME, type MatchEndedReason, type RoundRecord } from "../types"
import { Badge, panelClass } from "./MatchShell"

type Props = {
  youScore: number
  oppScore: number
  history: RoundRecord[]
  endedReason?: MatchEndedReason
  roundsPlayed?: number
  interruptedRound?: number | null
  onNewSession: () => void
  playerName?: string
  opponentName?: string
}

/** Tela de resultado final da partida. */
export function ResultScreen({
  youScore,
  oppScore,
  history,
  endedReason = 'rodadas',
  roundsPlayed,
  interruptedRound,
  onNewSession,
  playerName = "Você",
  opponentName = "Jogador 2",
}: Props) {
  const jogadas = roundsPlayed ?? history.length
  // Quando a partida não terminou pelo fim das rodadas, a tela precisa dizer por quê — senão o
  // jogador acha que perdeu rodadas por bug.
  const aviso =
    endedReason === 'rodadas'
      ? null
      : `${endedReason === 'tempo_sessao' ? 'O tempo da sessão terminou' : 'O professor encerrou a sessão'}. ` +
        `Valem as ${jogadas} ${jogadas === 1 ? 'rodada jogada' : 'rodadas jogadas'}.` +
        (interruptedRound ? ` A rodada ${interruptedRound} foi interrompida e não vale pontos.` : '')

  const tie = youScore === oppScore
  const title = tie ? "Empate." : youScore > oppScore ? "Você venceu." : `O ${opponentName} venceu.`

  return (
    // Coluna flexível: tudo mantém a altura natural e só a lista de jogadas encolhe e rola.
    <div className={`${panelClass} flex max-w-[760px] flex-col items-center text-center`}>
      <Badge>Resultado final</Badge>
      <h1 className="mt-[clamp(8px,1.6dvh,16px)] mb-1.5 text-[clamp(26px,4.4dvh,42px)] font-black leading-[1.02] tracking-[-0.04em]">
        {title}
      </h1>
      <p className="mx-auto max-w-[440px] text-base font-medium leading-relaxed text-[#5C6675]">
        {endedReason !== 'rodadas'
          ? tie
            ? "Os dois somaram a mesma pontuação nas rodadas jogadas."
            : "Pontuação somada das rodadas que deu tempo de jogar."
          : tie
            ? "Os dois somaram a mesma pontuação ao fim das rodadas."
            : "Pontuação somada de todas as rodadas da partida."}
      </p>

      {aviso && (
        <p className="mt-2 rounded-2xl border-2 border-[#FBE7B4] bg-[#FFF8E6] px-4 py-2 text-[13.5px] font-semibold text-[#6B5A2A]">
          {aviso}
        </p>
      )}

      <div className="mb-1.5 mt-[clamp(12px,2.6dvh,24px)] flex w-full items-stretch justify-center gap-3.5">
        <div className="max-w-[250px] flex-1 rounded-3xl border-[2.5px] border-[#BFE2FA] bg-[#F2F8FE] px-4 py-[clamp(6px,1.8dvh,20px)]">
          <p className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-[#0069C4]">{playerName}</p>
          <p className="my-1 text-[clamp(30px,5.6dvh,54px)] font-black leading-none tracking-[-0.05em]">{youScore}</p>
          <p className="text-[13px] font-bold text-[#3C4654]">pontos</p>
        </div>
        <span className="flex items-center text-[15px] font-black text-[#5C6675]">×</span>
        <div className="max-w-[250px] flex-1 rounded-3xl border-[2.5px] border-[#E6EEF6] bg-[#F7FAFD] px-4 py-[clamp(6px,1.8dvh,20px)]">
          <p className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-[#5C6675]">{opponentName}</p>
          <p className="my-1 text-[clamp(30px,5.6dvh,54px)] font-black leading-none tracking-[-0.05em]">{oppScore}</p>
          <p className="text-[13px] font-bold text-[#3C4654]">pontos</p>
        </div>
      </div>

      <section className="mt-[clamp(10px,2dvh,20px)] flex min-h-0 w-full flex-col rounded-3xl border-2 border-[#E6EEF6] bg-[#F7FAFD] p-3.5 text-left">
        {/* Cabeçalho alinhado às mesmas colunas das linhas: diz de quem é cada carta. */}
        <div className="mb-2 grid shrink-0 items-center [grid-template-columns:104px_1fr_1fr]">
          <span />
          <span className="px-3 text-center text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#0069C4]">
            {playerName}
          </span>
          <span className="px-3 text-center text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#5C6675]">
            {opponentName}
          </span>
        </div>
        <div className="-mr-2 flex min-h-0 flex-col gap-2 overflow-y-auto pr-2 [scrollbar-width:thin]">
          {history.map((h) => (
            <div
              key={h.round}
              className="grid shrink-0 items-stretch overflow-hidden rounded-2xl border-2 border-[#E6EEF6] bg-white [grid-template-columns:104px_1fr_1fr]"
            >
              <span className="flex items-center justify-center bg-[#EEF3F8] px-2 py-2 text-[12.5px] font-extrabold text-[#5C6675]">
                Rodada {h.round}
              </span>
              <span className="flex min-w-0 items-center gap-2 border-l-2 border-[#E6EEF6] px-3 py-2">
                <i className="h-[22px] w-4 shrink-0 rounded" style={{ background: CARD_COLOR[h.yourCard] }} />
                <span className="truncate text-[13.5px] font-bold">
                  {CARD_NAME[h.yourCard] === "PRETO" ? "Preto" : "Vermelho"}
                  {h.byTime && <span className="ml-1 text-[11.5px] font-semibold text-[#5C6675]">(tempo)</span>}
                </span>
                <span
                  className="ml-auto text-[15px] font-black"
                  style={{ color: h.points[0] > 0 ? "#0B7A43" : "#3C4654" }}
                >
                  {h.points[0] === 0 ? "0" : `+${h.points[0]}`}
                </span>
              </span>
              <span className="flex min-w-0 items-center gap-2 border-l-2 border-[#E6EEF6] px-3 py-2">
                <i className="h-[22px] w-4 shrink-0 rounded" style={{ background: CARD_COLOR[h.opponentCard] }} />
                <span className="truncate text-[13.5px] font-bold">
                  {CARD_NAME[h.opponentCard] === "PRETO" ? "Preto" : "Vermelho"}
                </span>
                <span
                  className="ml-auto text-[15px] font-black"
                  style={{ color: (h.points[1] ?? 0) > 0 ? "#0B7A43" : "#3C4654" }}
                >
                  {h.points[1] === null ? "—" : h.points[1] === 0 ? "0" : `+${h.points[1]}`}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-[clamp(12px,2.6dvh,24px)] flex shrink-0 flex-col items-center gap-2.5">
        <button
          type="button"
          onClick={onNewSession}
          className="animate-[dpGlow_2.2s_ease-in-out_infinite] rounded-full bg-[#00A3F5] px-12 py-[clamp(12px,2dvh,18px)] text-[19px] font-black tracking-[0.06em] text-[#08243C] transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
        >
          NOVA SESSÃO
        </button>
        <p className="text-[13.5px] font-semibold text-[#5C6675]">
          O professor pode liberar uma nova partida para a turma.
        </p>
      </div>
    </div>
  )
}
