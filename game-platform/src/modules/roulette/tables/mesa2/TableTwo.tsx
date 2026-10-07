import { useCallback, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { pocketIndex } from '../../config/conditions'
import type { PresentSpin } from '../../hooks/useRouletteMatch'
import type { RouletteMoveOption } from '../../types/roulette'
import { BetPanel, RouletteHud, SpinMessage, kickerClass, tablePanelClass } from '../TableKit'
import { spinStatus, type RouletteTableProps } from '../types'
import { BettingTable } from './BettingTable'
import { RouletteWheel, type RouletteWheelHandle } from './phaser/RouletteWheel'
import './mesa2.css'

/** Mesa 2: roleta de cassino em Phaser + pano de feltro, no mesmo painel do jogo das cartas. */
export function TableTwo({
  view,
  busy,
  locked,
  lastSpin,
  actionError,
  remainingSeconds,
  elapsedSeconds,
  onSpin,
  onFinish,
}: RouletteTableProps) {
  const wheelRef = useRef<RouletteWheelHandle>(null)
  const [selected, setSelected] = useState<RouletteMoveOption | null>(null)
  const [bet, setBet] = useState(1)
  const [muted, setMuted] = useState(false)
  const [winning, setWinning] = useState<string | null>(null)

  const finished = view.status === 'finished'
  const disabled = busy || locked || finished
  const amount = Math.min(bet, Math.max(1, view.maxMagnitude))
  const labelOf = useCallback(
    (id: RouletteMoveOption) => view.conditions.find((c) => c.id === id)?.label ?? id,
    [view.conditions]
  )

  // A bola sai junto com a requisição; a roda só desacelera até a casa quando o servidor responde.
  const present: PresentSpin = useCallback(
    async (pending) => {
      const wheel = wheelRef.current
      if (!wheel) return pending
      setWinning(null)
      const result = await wheel.spin(pending, (r) => pocketIndex(view.wheel, r.pocket))
      setWinning(result.pocket)
      return result
    },
    [view.wheel]
  )

  const run = () => {
    if (disabled || !selected || view.maxMagnitude <= 0) return
    void onSpin(selected, amount, present)
  }

  const status = spinStatus({ actionError, busy, lastSpin }, selected ? labelOf(selected) : null, labelOf)

  const soundToggle = (
    <div className="flex items-center justify-between gap-2">
      <span className={kickerClass}>Som</span>
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-pressed={!muted}
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#E6EEF6] bg-white px-3 py-1 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#3C4654] hover:border-[#BFE2FA]"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        {muted ? 'Desligado' : 'Ligado'}
      </button>
    </div>
  )

  return (
    <div className={`${tablePanelClass} m2`}>
      <RouletteHud view={view} remainingSeconds={remainingSeconds} elapsedSeconds={elapsedSeconds} />

      <div className="grid min-h-0 grid-cols-1 gap-[clamp(10px,1.8dvh,16px)] lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <section className="flex min-w-0 flex-col gap-[clamp(8px,1.6dvh,14px)] rounded-[26px] border-2 border-[#E6EEF6] bg-[#F7FAFD] p-[clamp(10px,2dvh,18px)]">
          <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <div className="m2-wheel-wrap mx-auto aspect-square w-full max-w-[clamp(220px,48dvh,480px)]">
              <RouletteWheel ref={wheelRef} pockets={view.wheel} muted={muted} />
            </div>
            <BettingTable
              title="Mesa"
              wheel={view.wheel}
              conditions={view.conditions}
              selected={selected}
              winning={winning}
              disabled={disabled}
              onSelect={setSelected}
            />
          </div>
          <SpinMessage tone={status.tone}>{status.text}</SpinMessage>
        </section>

        <BetPanel
          view={view}
          selected={selected}
          bet={bet}
          disabled={disabled}
          busy={busy}
          onSelect={setSelected}
          onBet={setBet}
          onSpin={run}
          onFinish={onFinish}
          extra={soundToggle}
        />
      </div>
    </div>
  )
}
