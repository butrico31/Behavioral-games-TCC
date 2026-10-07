import { useCallback, useEffect, useRef, useState } from 'react'
import { pocketIndex } from '../../config/conditions'
import type { PresentSpin } from '../../hooks/useRouletteMatch'
import type { RouletteMoveOption } from '../../types/roulette'
import { BetPanel, RouletteHud, SpinMessage, tablePanelClass } from '../TableKit'
import { spinStatus, type RouletteTableProps } from '../types'
import { WheelSvg } from './WheelSvg'
import { pocketCenterDeg } from './wheelGeometry'

const SPIN_SECONDS = 2.8

/** Rotação que leva a casa `index` até o leitor (topo), dando algumas voltas antes. */
function rotationTo(current: number, index: number, count: number): number {
  const desired = (360 - pocketCenterDeg(index, count)) % 360
  const delta = (((desired - current) % 360) + 360) % 360
  return current + 360 * (4 + Math.floor(Math.random() * 2)) + delta
}

/** Mesa 1: roda plana em SVG, no mesmo painel do jogo das cartas. */
export function TableOne({
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
  const [selected, setSelected] = useState<RouletteMoveOption | null>(null)
  const [bet, setBet] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [winning, setWinning] = useState<string | null>(null)
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current)
  }, [])

  const finished = view.status === 'finished'
  const disabled = busy || locked || finished
  const amount = Math.min(bet, Math.max(1, view.maxMagnitude))
  const labelOf = useCallback(
    (id: RouletteMoveOption) => view.conditions.find((c) => c.id === id)?.label ?? id,
    [view.conditions]
  )

  const present: PresentSpin = useCallback(
    async (pending) => {
      const result = await pending
      setWinning(null)
      setRotation((prev) => rotationTo(prev, pocketIndex(view.wheel, result.pocket), view.wheel.length))
      await new Promise<void>((resolve) => {
        spinTimeoutRef.current = setTimeout(resolve, SPIN_SECONDS * 1000 + 150)
      })
      setWinning(result.pocket)
      return result
    },
    [view.wheel]
  )

  const handleSpin = () => {
    if (!selected || disabled) return
    void onSpin(selected, amount, present)
  }

  const status = spinStatus({ actionError, busy, lastSpin }, selected ? labelOf(selected) : null, labelOf)

  return (
    <div className={tablePanelClass}>
      <RouletteHud view={view} remainingSeconds={remainingSeconds} elapsedSeconds={elapsedSeconds} />

      <div className="grid min-h-0 grid-cols-1 gap-[clamp(10px,1.8dvh,16px)] md:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        <section className="flex min-w-0 flex-col items-center gap-[clamp(8px,1.6dvh,14px)] rounded-[26px] border-2 border-[#E6EEF6] bg-[#F7FAFD] p-[clamp(10px,2dvh,20px)]">
          <div className="aspect-square w-full max-w-[min(100%,clamp(240px,52dvh,520px))]">
            <WheelSvg wheel={view.wheel} rotation={rotation} spinSeconds={SPIN_SECONDS} winning={winning} />
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
          onSpin={handleSpin}
          onFinish={onFinish}
        />
      </div>
    </div>
  )
}
