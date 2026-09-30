import type { ReactNode } from "react"
import { CARD_COLOR, CARD_NAME, type Card, type RoundPhase, type RoundPointsView } from "../types"
import { FitToScreen, panelClass } from "./MatchShell"

type Props = {
  round: number
  totalRounds: number
  youScore: number
  /** `null` quando a sessão esconde os pontos do outro jogador. */
  oppScore: number | null
  phase: RoundPhase
  /** Segundos restantes; `null` quando a sessão não usa tempo por rodada. */
  timeLeft: number | null
  /** 0 quando a sessão não usa tempo por rodada. */
  secondsPerRound: number
  yourCard: Card | null
  opponentCard: Card | null
  roundPoints: RoundPointsView | null
  /** false esconde a pontuação do oponente durante a partida (configuração da sessão). */
  userViewPoints?: boolean
  playedByTime?: boolean
  /** O outro jogador caiu; o servidor pausa a rodada até ele voltar. */
  opponentAway?: boolean
  onPick: (card: Card) => void
  onNext: () => void
  playerName?: string
  opponentName?: string
}

const pts = (n: number) => (n === 0 ? "0 ponto" : `+${n} ${n === 1 ? "ponto" : "pontos"}`)

function ScoreChip({
  name,
  score,
  initials,
  highlight,
  align = "left",
}: {
  name: string
  score: number | null
  initials: string
  highlight?: boolean
  align?: "left" | "right"
}) {
  const avatar = (
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-extrabold text-white ${
        highlight ? "bg-[linear-gradient(160deg,#0C8AE6,#0068C8)]" : "bg-[linear-gradient(160deg,#12151B,#3A4150)]"
      }`}
    >
      {initials}
    </span>
  )
  const text = (
    <span className={align === "right" ? "text-right" : "text-left"}>
      <span
        className={`block text-[11px] font-extrabold uppercase tracking-[0.14em] ${
          highlight ? "text-[#0069C4]" : "text-[#5C6675]"
        }`}
      >
        {name}
      </span>
      <span className="block text-[19px] font-black tracking-tight">{score === null ? "—" : `${score} pts`}</span>
    </span>
  )
  return (
    <div
      className={`flex items-center gap-2.5 rounded-[18px] border-2 px-3.5 py-2 ${
        highlight ? "border-[#BFE2FA] bg-[#F2F8FE]" : "border-[#E6EEF6] bg-[#F7FAFD]"
      }`}
    >
      {align === "left" ? (
        <>
          {avatar}
          {text}
        </>
      ) : (
        <>
          {text}
          {avatar}
        </>
      )}
    </div>
  )
}

function PlayableCard({ card, onClick }: { card: Card; onClick: () => void }) {
  const red = card === "R"
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex aspect-[168/236] h-full flex-col justify-between rounded-[20px] p-[clamp(10px,1.8dvh,16px)] transition-transform hover:-translate-y-3 active:-translate-y-1 ${
        red
          ? "bg-[#DA2128] shadow-[inset_0_0_0_3px_rgba(255,255,255,.28),0_18px_0_-6px_#F4D3D4]"
          : "bg-[#15171D] shadow-[inset_0_0_0_3px_rgba(255,255,255,.14),0_18px_0_-6px_#DDE3EA]"
      }`}
    >
      <span className="text-[11px] font-extrabold tracking-[0.18em] text-white/70">CARTA</span>
      <span
        className={`text-center font-black tracking-[0.04em] text-white ${
          red ? "text-[clamp(15px,2.5dvh,23px)]" : "text-[clamp(16px,2.7dvh,25px)]"
        }`}
      >
        {CARD_NAME[card]}
      </span>
      <span className="flex justify-end">
        <i className={`h-[22px] w-[22px] rounded-md bg-white/30 ${red ? "rotate-45" : ""}`} />
      </span>
    </button>
  )
}

/** Selo ao lado da carta, fora do fluxo: a carta continua centralizada e a mesa não cresce. */
function SideBadge({ background, children }: { background: string; children: ReactNode }) {
  return (
    <span
      className="absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-full px-3.5 py-1 text-[15px] font-black text-white"
      style={{ background }}
    >
      {children}
    </span>
  )
}

/**
 * Tela de jogo — uma rodada: escolha, espera e revelação. A mesa tem altura fixa (as cartas
 * escalam com a altura da janela) e o espaço do botão fica reservado, então as três fases
 * ocupam o mesmo tamanho: sem scroll e sem a tela pular.
 */
export function RoundScreen({
  round,
  totalRounds,
  youScore,
  oppScore,
  phase,
  timeLeft,
  secondsPerRound,
  yourCard,
  opponentCard,
  roundPoints,
  userViewPoints = true,
  playedByTime,
  opponentAway = false,
  onPick,
  onNext,
  playerName = "Você",
  opponentName = "Jogador 2",
}: Props) {
  const hasTimer = secondsPerRound > 0
  const showTimer = timeLeft !== null && phase === "choose"
  const timerColor = timeLeft !== null && timeLeft <= 3 ? "#DA2128" : "#00A3F5"

  const prompt = { choose: "Escolha sua carta", waiting: "Carta na mesa", reveal: "Cartas reveladas" }[phase]
  const promptSub = {
    choose: "Depois de escolher, não é possível trocar.",
    waiting: `Aguardando a escolha do ${opponentName}…`,
    reveal: playedByTime ? "Sua carta foi jogada pelo tempo esgotado." : "As duas cartas viraram ao mesmo tempo.",
  }[phase]

  // Com a pontuação do oponente escondida, a frase fala só do que VOCÊ ganhou: o texto antigo
  // ("o Jogador 2 não pontuou") entregava em palavras o número que o placar esconde.
  const hideOpponentPoints = !userViewPoints || (roundPoints !== null && roundPoints[1] === null)

  const revealNote =
    phase === "reveal" && yourCard && opponentCard && roundPoints
      ? yourCard === opponentCard
        ? yourCard === "B"
          ? hideOpponentPoints
            ? "Os dois escolheram preto."
            : "Os dois escolheram preto: ganho equilibrado para ambos."
          : hideOpponentPoints
            ? "Os dois escolheram vermelho."
            : "Os dois escolheram vermelho: ganho mínimo para ambos."
        : hideOpponentPoints
          ? roundPoints[0] > 0
            ? "Você obteve o ganho máximo desta rodada."
            : "Você não pontuou nesta rodada."
          : roundPoints[0] > (roundPoints[1] ?? 0)
            ? `Você obteve o ganho máximo desta rodada; o ${opponentName} não pontuou.`
            : `Você não pontuou nesta rodada; o ${opponentName} obteve o ganho máximo.`
      : ""

  return (
    <FitToScreen>
      <div
        className={`${panelClass} flex max-w-[880px] flex-col !px-6 !pt-5 [--hand-h:clamp(140px,24dvh,236px)] [--opp-h:clamp(84px,14dvh,134px)]`}
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3.5">
          <ScoreChip name={playerName} score={youScore} initials={playerName.charAt(0).toUpperCase()} highlight />
          <div className="min-w-[180px] flex-1 text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#5C6675]">
              Rodada {round} de {totalRounds}
            </p>
            <div className="mt-2 flex items-center justify-center gap-[7px]">
              {Array.from({ length: totalRounds }, (_, i) => i + 1).map((i) => (
                <i
                  key={i}
                  className="rounded-full"
                  style={{
                    width: i === round ? 12 : 9,
                    height: i === round ? 12 : 9,
                    background: i < round ? "#0F9D58" : i === round ? "#00A3F5" : "#DDE4EC",
                  }}
                />
              ))}
            </div>
          </div>
          <ScoreChip name={opponentName} score={oppScore} initials="J2" align="right" />
        </div>

        {/* Com cronômetro na sessão, a linha fica reservada fora da escolha para a mesa não subir e descer. */}
        {hasTimer && (
          <div className={`mt-3 flex shrink-0 items-center gap-3 ${showTimer ? "" : "invisible"}`}>
            <span className="whitespace-nowrap text-[12.5px] font-extrabold uppercase tracking-[0.1em] text-[#5C6675]">
              Tempo
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#EDF1F6]">
              <div
                className="h-2.5 rounded-full transition-[width] duration-1000 ease-linear"
                style={{ width: `${Math.round(((timeLeft ?? 0) / secondsPerRound) * 100)}%`, background: timerColor }}
              />
            </div>
            <span className="min-w-[44px] text-right text-base font-black" style={{ color: timerColor }}>
              {timeLeft ?? 0}s
            </span>
          </div>
        )}

        <section className="mt-[clamp(10px,1.8dvh,16px)] flex shrink-0 flex-col rounded-[26px] border-2 border-[#E6EEF6] bg-[#F7FAFD] px-5 py-[clamp(10px,1.8dvh,20px)]">
          <div className="mb-[clamp(4px,1dvh,12px)] flex items-center justify-between gap-3">
            <span className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-[#5C6675]">{opponentName}</span>
            {/* Aviso de queda no lugar do status: não acrescenta altura à mesa. */}
            {opponentAway ? (
              <span className="rounded-full border-2 border-[#FBE7B4] bg-[#FFF8E6] px-3 py-0.5 text-[12.5px] font-bold text-[#6B5A2A]">
                saiu da partida · aguardando o retorno…
              </span>
            ) : (
              <span className="text-[13px] font-bold text-[#3C4654]">
                {phase === "reveal" ? "escolha revelada" : phase === "waiting" ? "escolhendo…" : "aguardando as duas escolhas"}
              </span>
            )}
          </div>

          <div className="flex h-[var(--opp-h)] items-center justify-center">
            {phase === "reveal" && opponentCard && roundPoints ? (
              <div className="relative h-full animate-[dpFlip_.45s_ease-out]">
                <span
                  className="flex aspect-[96/134] h-full items-end justify-center rounded-2xl pb-[clamp(6px,1.2dvh,12px)] shadow-[inset_0_0_0_3px_rgba(255,255,255,.2),0_16px_26px_-14px_rgba(9,25,48,.5)]"
                  style={{ background: CARD_COLOR[opponentCard] }}
                >
                  <span className="text-[clamp(10px,1.5dvh,13px)] font-black tracking-[0.1em] text-white">
                    {CARD_NAME[opponentCard]}
                  </span>
                </span>
                {roundPoints[1] !== null && <SideBadge background="#12151B">{pts(roundPoints[1])}</SideBadge>}
              </div>
            ) : (
              <div className="relative aspect-[92/128] h-[calc(var(--opp-h)-8px)]">
                <span className="absolute -inset-1.5 animate-[dpPulse_2.2s_ease-out_infinite] rounded-[20px] bg-[#00A3F5]" />
                <span className="relative flex h-full w-full items-center justify-center gap-1.5 rounded-2xl bg-[linear-gradient(160deg,#0C8AE6,#0068C8)] shadow-[inset_0_0_0_3px_rgba(255,255,255,.22),0_16px_26px_-14px_rgba(0,80,160,.6)]">
                  {[0, 0.18, 0.36].map((d) => (
                    <i key={d} className="h-2 w-2 rounded-full bg-white" style={{ animation: `dpDot 1.3s ${d}s infinite` }} />
                  ))}
                </span>
              </div>
            )}
          </div>

          <div className="my-[clamp(6px,1.4dvh,16px)] flex items-center gap-3.5">
            <span className="h-0.5 flex-1 bg-[#E1E8F0]" />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#98A6B6]">mesa</span>
            <span className="h-0.5 flex-1 bg-[#E1E8F0]" />
          </div>

          <p className="text-center text-[clamp(17px,2.5dvh,22px)] font-black leading-tight tracking-[-0.03em]">{prompt}</p>
          <p className="mt-1 text-center text-[13px] font-semibold text-[#5C6675]">{promptSub}</p>

          <div className="mt-[clamp(8px,1.8dvh,20px)] flex h-[var(--hand-h)] items-center justify-center">
            {phase === "choose" ? (
              <div className="flex h-full items-center justify-center gap-6">
                <PlayableCard card="B" onClick={() => onPick("B")} />
                <PlayableCard card="R" onClick={() => onPick("R")} />
              </div>
            ) : (
              yourCard && (
                <div className="relative h-[89%] animate-[dpRise_.4s_ease-out]">
                  <span
                    className="flex aspect-[150/210] h-full flex-col justify-between rounded-[20px] p-[clamp(10px,1.8dvh,16px)] shadow-[inset_0_0_0_3px_rgba(255,255,255,.2),0_18px_0_-6px_#E3E9F0]"
                    style={{ background: CARD_COLOR[yourCard] }}
                  >
                    <span className="text-[11px] font-extrabold tracking-[0.18em] text-white/70">SUA CARTA</span>
                    <span className="text-center text-[clamp(15px,2.3dvh,21px)] font-black tracking-[0.04em] text-white">
                      {CARD_NAME[yourCard]}
                    </span>
                    <span className="flex justify-end">
                      <i className="h-5 w-5 rounded-md bg-white/30" />
                    </span>
                  </span>
                  <SideBadge background={phase === "reveal" && roundPoints && roundPoints[0] > 0 ? "#0F9D58" : "#49535F"}>
                    {phase === "reveal" && roundPoints ? pts(roundPoints[0]) : "carta enviada"}
                  </SideBadge>
                </div>
              )
            )}
          </div>

          {/* Espaço do rodapé reservado em todas as fases: a revelação usa, as outras deixam vazio. */}
          <div className="mt-[clamp(8px,1.6dvh,16px)] flex min-h-[clamp(44px,6.2dvh,56px)] flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {phase === "reveal" && (
              <>
                <p className="max-w-[420px] text-center text-[14px] font-semibold leading-snug text-[#3C4654]">{revealNote}</p>
                <button
                  type="button"
                  onClick={onNext}
                  className="animate-[dpGlow_2.2s_ease-in-out_infinite] rounded-full bg-[#00A3F5] px-8 py-[clamp(10px,1.6dvh,14px)] text-[16px] font-black tracking-[0.06em] text-[#08243C] transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
                >
                  {round >= totalRounds ? "VER RESULTADO" : "PRÓXIMA RODADA"}
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </FitToScreen>
  )
}
