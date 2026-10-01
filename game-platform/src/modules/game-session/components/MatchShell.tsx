import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { Brain } from "lucide-react"

/** Fundo e cabeçalho compartilhados pelas telas da partida (padrão claro do BehaviorLab). */
export function MatchShell({ children, notice }: { children: ReactNode; notice?: ReactNode }) {
  return (
    // --font-display redefinido aqui: o index.css aplica var(--font-display) (Fraunces) em h1-h4.
    // h-dvh + overflow-hidden: a página nunca rola; cada tela cabe na altura ou rola só o bloco que precisa.
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#FDFCF8] text-[#12151B] font-[Outfit,system-ui,sans-serif] [--font-display:Outfit,system-ui,sans-serif]">
      {/* formas decorativas */}
      <div className="pointer-events-none absolute -left-[30vw] -top-[34vh] h-[128vh] w-[74vw] rounded-full bg-[linear-gradient(140deg,#0A63C8_0%,#0090EE_55%,#00B0FA_100%)]" />
      <div className="pointer-events-none absolute -left-[22vw] -top-[8vh] h-[92vh] w-[48vw] rounded-full bg-[linear-gradient(160deg,#0A78DC_0%,#00A6F7_100%)] opacity-85" />
      <div className="pointer-events-none absolute -bottom-[190px] -right-[150px] h-[460px] w-[460px] rounded-full border-[30px] border-[#DCEFFB]" />

      <header className="relative z-10 flex shrink-0 items-center justify-between gap-4 px-8 py-[clamp(10px,2.2dvh,24px)]">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white/75 bg-white/20">
            <Brain className="h-5 w-5 text-white" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-white">BehaviorLab</span>
        </div>
        {notice}
      </header>

      <main className="relative z-[1] flex min-h-0 flex-1 items-center justify-center px-6 pb-[clamp(12px,3dvh,40px)]">
        {children}
      </main>
    </div>
  )
}

/**
 * Para telas de tamanho fixo (espera, confirmação, rodada): se a altura natural do painel passar
 * da área disponível, encolhe tudo por igual em vez de rolar. O transform não mexe no layout, então
 * a medida da altura natural não depende da escala aplicada.
 */
export function FitToScreen({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return
    // O ResizeObserver também dispara ao começar a observar, então isso já cobre a primeira medida.
    const observer = new ResizeObserver(() => {
      const next = inner.offsetHeight > 0 ? Math.min(1, outer.clientHeight / inner.offsetHeight) : 1
      setScale((prev) => (Math.abs(prev - next) < 0.005 ? prev : next))
    })
    observer.observe(outer)
    observer.observe(inner)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={outerRef} className="flex h-full w-full items-center justify-center">
      <div
        ref={innerRef}
        className="flex w-full shrink-0 justify-center"
        style={scale < 1 ? { transform: `scale(${scale})` } : undefined}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * max-h-full + overflow-y-auto: telas com lista (resultado, combinações) rolam só dentro do painel.
 * Dentro do FitToScreen o max-h não tem efeito (a altura do pai é automática), e a tela encolhe.
 */
export const panelClass =
  "w-full max-h-full overflow-y-auto rounded-[34px] bg-white p-[clamp(20px,4dvh,40px)] shadow-[0_30px_70px_-20px_rgba(6,54,104,.35),0_2px_0_0_#EAF0F6] [scrollbar-width:thin]"

export function Badge({ children, pulse = false }: { children: ReactNode; pulse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#E9F6FE] px-4 py-2 text-[12.5px] font-extrabold uppercase tracking-[0.16em] text-[#0069C4]">
      {pulse && <span className="h-2 w-2 animate-[dpDot_1.4s_infinite] rounded-full bg-[#00A3F5]" />}
      {children}
    </span>
  )
}

export function ShimmerBar() {
  return (
    <div className="relative h-[9px] overflow-hidden rounded-full bg-[#EDF1F6]">
      <div className="absolute inset-y-0 w-[32%] animate-[dpShimmer_1.9s_linear_infinite] rounded-full bg-[linear-gradient(90deg,rgba(0,163,245,0),#00A3F5,rgba(0,163,245,0))]" />
    </div>
  )
}

/** Slot de jogador usado na espera e na confirmação. */
export function PlayerSlot({
  name,
  status,
  state,
  initials,
}: {
  name: string
  status: string
  state: "in" | "pending" | "ready"
  initials?: string
}) {
  if (state === "pending") {
    return (
      <div className="relative flex max-w-[210px] flex-1 flex-col items-center gap-2 rounded-[22px] border-[2.5px] border-dashed border-[#D3DCE6] bg-[#FBFCFD] px-4 py-4">
        <div className="relative h-[52px] w-[52px]">
          <span className="absolute inset-0 animate-[dpPulse_2s_ease-out_infinite] rounded-full bg-[#00A3F5]" />
          <span className="relative flex h-[52px] w-[52px] items-center justify-center gap-1 rounded-full bg-[#EDF1F6]">
            {[0, 0.18, 0.36].map((d) => (
              <i
                key={d}
                className="h-[7px] w-[7px] rounded-full bg-[#98A6B6]"
                style={{ animation: `dpDot 1.3s ${d}s infinite` }}
              />
            ))}
          </span>
        </div>
        <span className="text-base font-extrabold text-[#5C6675]">{name}</span>
        <span className="rounded-full bg-[#E2E8EF] px-3 py-1 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-[#49535F]">
          {status}
        </span>
      </div>
    )
  }

  const ready = state === "ready"
  return (
    <div
      className={`flex max-w-[210px] flex-1 flex-col items-center gap-2 rounded-[22px] border-[2.5px] px-4 py-4 ${
        ready ? "border-[#BEE7CF] bg-[#EAF8F0]" : "border-[#BFE2FA] bg-[#F2F8FE]"
      }`}
    >
      <span
        className={`flex h-[52px] w-[52px] items-center justify-center rounded-full text-xl font-extrabold text-white ${
          ready
            ? "bg-[#0F9D58] shadow-[0_8px_0_-2px_#C6E8D6]"
            : "bg-[linear-gradient(160deg,#0C8AE6,#0068C8)] shadow-[0_8px_0_-2px_#C9E4F8]"
        }`}
      >
        {ready ? "✓" : initials}
      </span>
      <span className="text-base font-extrabold">{name}</span>
      <span className="flex items-center gap-1.5 rounded-full bg-[#0F9D58] px-3 py-1 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-white">
        <i className="h-1.5 w-1.5 rounded-full bg-white" />
        {status}
      </span>
    </div>
  )
}

export function VsBadge() {
  return (
    <span className="flex h-[46px] w-[46px] shrink-0 animate-[dpBob_2.6s_ease-in-out_infinite] items-center justify-center rounded-full bg-[#12151B] text-sm font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(18,21,27,.8)]">
      VS
    </span>
  )
}
