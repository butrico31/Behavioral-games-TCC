import { useCallback, useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { CONDITION_COLORS, formatClock, formatSessionCode, pocketIndex } from '../../config/conditions'
import type { PresentSpin } from '../../hooks/useRouletteMatch'
import type { RouletteMoveOption } from '../../types/roulette'
import { describeSpin, type RouletteTableProps } from '../types'
import { WheelSvg } from './WheelSvg'
import { pocketCenterDeg } from './wheelGeometry'

const SPIN_SECONDS = 2.8

type StatusTone = 'neutral' | 'accent' | 'warn' | 'win' | 'lose'

const STATUS_DOT_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-border',
  accent: 'bg-primary',
  warn: 'bg-amber-400',
  win: 'bg-success',
  lose: 'bg-destructive',
}

/** Rotação que leva a casa `index` até o leitor (topo), dando algumas voltas antes. */
function rotationTo(current: number, index: number, count: number): number {
  const desired = (360 - pocketCenterDeg(index, count)) % 360
  const delta = (((desired - current) % 360) + 360) % 360
  return current + 360 * (4 + Math.floor(Math.random() * 2)) + delta
}

/** Mesa 1: visual do app, roda plana em SVG. Layout fluido do celular ao desktop. */
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
  const [spinning, setSpinning] = useState(false)
  const [winning, setWinning] = useState<string | null>(null)
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current)
  }, [])

  const finished = view.status === 'finished'
  const disabled = busy || locked || finished
  const limit = Math.max(1, view.maxMagnitude)
  const magnitude = Math.min(bet, limit)
  const labelOf = useCallback(
    (id: RouletteMoveOption) => view.conditions.find((c) => c.id === id)?.label ?? id,
    [view.conditions]
  )

  const present: PresentSpin = useCallback(
    async (pending) => {
      const result = await pending
      setSpinning(true)
      setWinning(null)
      setRotation((prev) => rotationTo(prev, pocketIndex(view.wheel, result.pocket), view.wheel.length))
      await new Promise<void>((resolve) => {
        spinTimeoutRef.current = setTimeout(resolve, SPIN_SECONDS * 1000 + 150)
      })
      setSpinning(false)
      setWinning(result.pocket)
      return result
    },
    [view.wheel]
  )

  const handleSpin = () => {
    if (!selected || disabled) return
    void onSpin(selected, magnitude, present)
  }

  let status = 'Selecione uma condição e defina a magnitude para iniciar o ensaio.'
  let tone: StatusTone = 'neutral'
  if (actionError) {
    status = actionError
    tone = 'warn'
  } else if (busy) {
    status = spinning ? 'Ensaio em curso — aguardando leitura do setor.' : 'Enviando ensaio…'
    tone = 'accent'
  } else if (lastSpin) {
    status = describeSpin(lastSpin, labelOf)
    tone = lastSpin.won ? 'win' : 'lose'
  } else if (selected) {
    status = `Condição ${labelOf(selected)} selecionada. Defina a magnitude e execute.`
  }

  const progress = Math.min(1, view.coins / view.pointsLimit)
  const clock = remainingSeconds !== null ? formatClock(remainingSeconds) : formatClock(elapsedSeconds)

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:py-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="surface-subtle col-span-2 flex flex-col gap-1 p-4 sm:col-span-1">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Sessão</span>
          <span className="font-data text-lg tracking-[0.1em] text-foreground">{formatSessionCode(view.matchId)}</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary">
            <span className={`h-1.5 w-1.5 rounded-full ${finished ? 'bg-muted-foreground' : 'animate-pulse bg-primary'}`} />
            {finished ? 'Encerrada' : 'Coletando dados'}
          </span>
        </div>
        <div className="surface-subtle flex flex-col gap-1 p-4">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Fichas</span>
          <span className="font-display text-2xl text-foreground">{view.coins}</span>
        </div>
        <div className="surface-subtle flex flex-col gap-2 p-4">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Meta</span>
          <span className="font-display text-2xl text-primary">{view.pointsLimit}</span>
          <div
            className="h-1 overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span className="block h-full bg-primary transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
        <div className="surface-subtle flex flex-col gap-1 p-4">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Ensaios</span>
          <span className="font-display text-2xl text-foreground">{String(view.round).padStart(2, '0')}</span>
        </div>
        <div className="surface-subtle flex flex-col gap-1 p-4">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {remainingSeconds !== null ? 'Tempo restante' : 'Duração'}
          </span>
          <span className="font-data text-xl text-orange-400">{clock}</span>
        </div>
      </section>

      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="surface-panel flex min-w-0 flex-col items-center gap-3 p-4 sm:p-5">
          <div className="flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-lg text-foreground">Aparato</h3>
            <span className="font-data text-[11px] text-muted-foreground">
              sequência sem reforço · {view.pityStreak}
            </span>
          </div>

          <div className="w-full max-w-[min(440px,100%)]">
            <WheelSvg wheel={view.wheel} rotation={rotation} spinSeconds={SPIN_SECONDS} winning={winning} />
          </div>

          <div className="flex w-full items-start gap-3 border-t border-border/70 pt-4" aria-live="polite">
            <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${STATUS_DOT_CLASS[tone]}`} />
            <p className="text-sm leading-relaxed text-muted-foreground">{status}</p>
          </div>
        </div>

        <div className="surface-panel grid grid-cols-1 gap-4 p-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-1 lg:gap-0">
          <div className="flex flex-col gap-1.5 lg:pb-3">
            <div className="flex items-baseline gap-3">
              <span className="font-data text-xs text-primary">01</span>
              <span className="text-base text-foreground">Condição</span>
            </div>
            <div className="flex flex-col gap-1" role="radiogroup" aria-label="Condição">
              {view.conditions.map((condition) => {
                const active = selected === condition.id
                return (
                  <button
                    key={condition.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSelected(condition.id)}
                    disabled={disabled}
                    className={`flex min-h-11 items-center gap-3 rounded-xl border px-4 py-2 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      active
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border/80 bg-background/40 text-foreground/90 hover:border-primary/40'
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 flex-none rounded-[4px] border border-white/10"
                      style={{ background: CONDITION_COLORS[condition.id] }}
                    />
                    <span className="flex-1">{condition.label}</span>
                    <span className="font-data text-[11px] text-muted-foreground">{condition.payoutLabel}</span>
                    {active && <Check className="h-4 w-4 text-primary" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 lg:border-t lg:border-border/70 lg:py-3">
            <div className="flex items-baseline gap-3">
              <span className="font-data text-xs text-orange-400">02</span>
              <span className="text-base text-foreground">Magnitude</span>
            </div>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={limit}
              value={magnitude}
              onChange={(e) => setBet(Math.max(1, Math.min(limit, Number(e.target.value) || 1)))}
              disabled={disabled}
              aria-label="Valor da aposta"
              className="min-h-11 w-full rounded-xl border border-border/80 bg-background/40 px-4 text-center font-display text-xl text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="flex flex-wrap gap-2">
              {view.chipValues.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBet((prev) => Math.min(limit, prev + value))}
                  disabled={disabled}
                  aria-label={`Acrescentar ${value} fichas à aposta`}
                  className="min-h-9 min-w-11 flex-1 rounded-lg border border-border/80 bg-background/40 font-data text-sm text-foreground transition-colors hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  +{value}
                </button>
              ))}
            </div>
            <p className="font-data text-[11px] text-muted-foreground">limite atual · {view.maxMagnitude} fichas</p>
          </div>

          <div className="flex flex-col gap-1.5 lg:border-t lg:border-border/70 lg:pt-3">
            <div className="flex items-baseline gap-3">
              <span className="font-data text-xs text-muted-foreground">03</span>
              <span className="text-base text-foreground">Execução</span>
            </div>
            <button
              type="button"
              onClick={handleSpin}
              disabled={disabled || !selected || view.maxMagnitude <= 0}
              className="btn-primary w-full py-2.5 text-xs uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Executando…' : 'Executar ensaio'}
            </button>
            {view.allowGiveUp && (
              <button
                type="button"
                onClick={onFinish}
                disabled={busy || finished}
                className="btn-secondary w-full py-2 text-[11px] uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Encerrar sessão
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
