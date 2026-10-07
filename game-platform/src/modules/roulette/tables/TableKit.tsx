import type { ReactNode } from 'react'
import { panelClass } from '../../game-session/components/MatchShell'
import { CONDITION_COLORS, formatClock } from '../config/conditions'
import type { RouletteCondition, RouletteMatchView, RouletteMoveOption } from '../types/roulette'

/**
 * Peças comuns às mesas da roleta, no mesmo padrão visual do jogo das cartas (painel branco,
 * blocos #F7FAFD, rótulos em caixa alta, botão azul). Cada mesa só troca a roda do meio.
 */

export const tablePanelClass = `${panelClass} flex max-w-[1180px] flex-col gap-[clamp(10px,1.8dvh,16px)] !px-6 !pt-5`

export const kickerClass = 'text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-[#5C6675]'

function StatChip({
  label,
  value,
  highlight,
  tone,
  children,
}: {
  label: string
  value: ReactNode
  highlight?: boolean
  tone?: string
  children?: ReactNode
}) {
  return (
    <div
      className={`flex min-w-[120px] flex-1 flex-col justify-center gap-1 rounded-[18px] border-2 px-4 py-2 ${
        highlight ? 'border-[#BFE2FA] bg-[#F2F8FE]' : 'border-[#E6EEF6] bg-[#F7FAFD]'
      }`}
    >
      <span className={`${kickerClass} ${highlight ? '!text-[#0069C4]' : ''}`}>{label}</span>
      <span className="text-[clamp(18px,2.6dvh,22px)] font-black leading-none tracking-tight" style={tone ? { color: tone } : undefined}>
        {value}
      </span>
      {children}
    </div>
  )
}

/** Linha de placar: fichas, meta (com barra de progresso), rodada e tempo. */
export function RouletteHud({
  view,
  remainingSeconds,
  elapsedSeconds,
}: {
  view: RouletteMatchView
  remainingSeconds: number | null
  elapsedSeconds: number
}) {
  const progress = Math.min(1, view.coins / view.pointsLimit)
  const hasLimit = remainingSeconds !== null
  const lowTime = hasLimit && remainingSeconds <= 30

  return (
    <div className="flex shrink-0 flex-wrap items-stretch gap-3">
      <StatChip label="Suas fichas" value={view.coins} highlight />
      <StatChip label="Meta" value={`${view.pointsLimit} fichas`}>
        <div
          className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#E1E8F0]"
          role="progressbar"
          aria-label="Progresso até a meta"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span className="block h-full rounded-full bg-[#0F9D58] transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
        </div>
      </StatChip>
      <StatChip label="Rodada" value={view.round + (view.status === 'finished' ? 0 : 1)} />
      <StatChip
        label={hasLimit ? 'Tempo restante' : 'Tempo de jogo'}
        value={formatClock(remainingSeconds ?? elapsedSeconds)}
        tone={lowTime ? '#DA2128' : undefined}
      />
    </div>
  )
}

/** Botões de cor: cada um mostra quanto paga e a chance de cair. */
export function ColorPicker({
  conditions,
  selected,
  disabled,
  onSelect,
}: {
  conditions: RouletteCondition[]
  selected: RouletteMoveOption | null
  disabled: boolean
  onSelect: (id: RouletteMoveOption) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Cor da aposta">
      {conditions.map((condition) => {
        const active = selected === condition.id
        return (
          <button
            key={condition.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onSelect(condition.id)}
            className={`flex flex-col items-center gap-1 rounded-2xl border-[2.5px] px-2 py-[clamp(6px,1.2dvh,10px)] transition-transform disabled:cursor-not-allowed disabled:opacity-60 ${
              active
                ? '-translate-y-0.5 border-[#00A3F5] bg-[#F2F8FE] shadow-[0_8px_0_-3px_#C9E4F8]'
                : 'border-[#E6EEF6] bg-white hover:-translate-y-0.5'
            }`}
          >
            <span
              className="h-[clamp(18px,3dvh,26px)] w-[clamp(18px,3dvh,26px)] rounded-lg shadow-[inset_0_0_0_2px_rgba(255,255,255,.25)]"
              style={{ background: CONDITION_COLORS[condition.id] }}
            />
            <span className="text-[15px] font-black">{condition.label}</span>
            <span className="text-[11.5px] font-bold text-[#5C6675]">
              {condition.payoutLabel} · {Math.round(condition.chance * 100)}%
            </span>
          </button>
        )
      })}
    </div>
  )
}

const CHIP_COLORS = ['#E9EDF2', '#D2552B', '#129A7C', '#7C3AD8']

/** Valor da aposta: −/+, campo digitável e fichas de atalho. */
export function BetInput({
  value,
  limit,
  chipValues,
  disabled,
  onChange,
}: {
  value: number
  limit: number
  chipValues: number[]
  disabled: boolean
  onChange: (next: number) => void
}) {
  const clamp = (n: number) => Math.max(1, Math.min(limit, Math.floor(n) || 1))
  const stepBtn =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#E6EEF6] bg-white text-xl font-black text-[#12151B] transition-colors hover:border-[#BFE2FA] disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Diminuir aposta" className={stepBtn} disabled={disabled || value <= 1} onClick={() => onChange(clamp(value - 1))}>
          −
        </button>
        <label className="flex min-w-0 flex-1 items-baseline justify-center gap-1.5 rounded-2xl border-2 border-[#E6EEF6] bg-white px-3 py-1.5">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={limit}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(clamp(Number(e.target.value)))}
            aria-label="Valor da aposta"
            className="w-full min-w-0 bg-transparent text-center text-[clamp(20px,3dvh,26px)] font-black tracking-tight text-[#12151B] outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#5C6675]">fichas</span>
        </label>
        <button type="button" aria-label="Aumentar aposta" className={stepBtn} disabled={disabled || value >= limit} onClick={() => onChange(clamp(value + 1))}>
          +
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        {chipValues.map((chip, index) => {
          const color = CHIP_COLORS[index % CHIP_COLORS.length]
          return (
            <button
              key={chip}
              type="button"
              disabled={disabled}
              onClick={() => onChange(clamp(value + chip))}
              aria-label={`Somar ${chip} fichas à aposta`}
              className="flex h-[clamp(36px,5.4dvh,44px)] w-[clamp(36px,5.4dvh,44px)] items-center justify-center rounded-full text-[12px] font-black transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                color: index === 0 ? '#12151B' : '#fff',
                background: `radial-gradient(circle, ${color} 0 52%, transparent 53%), repeating-conic-gradient(${color} 0 22.5deg, #fff 22.5deg 45deg)`,
                boxShadow: `0 0 0 3px ${color}, 0 6px 10px -4px rgba(9,25,48,.45)`,
              }}
            >
              +{chip}
            </button>
          )
        })}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(limit)}
          className="rounded-full border-2 border-[#E6EEF6] bg-white px-3 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#3C4654] hover:border-[#BFE2FA] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Tudo
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(1)}
          className="rounded-full border-2 border-[#E6EEF6] bg-white px-3 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#3C4654] hover:border-[#BFE2FA] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Limpar
        </button>
      </div>
      <p className="text-[12.5px] font-semibold text-[#5C6675]">Você pode apostar até {limit} fichas.</p>
    </div>
  )
}

export type SpinTone = 'neutral' | 'busy' | 'win' | 'lose' | 'warn'

const TONE_STYLE: Record<SpinTone, string> = {
  neutral: 'border-[#E6EEF6] bg-white text-[#3C4654]',
  busy: 'border-[#BFE2FA] bg-[#F2F8FE] text-[#0069C4]',
  win: 'border-[#BEE7CF] bg-[#EAF8F0] text-[#0B7A43]',
  lose: 'border-[#F4D3D4] bg-[#FDF1F1] text-[#A3161C]',
  warn: 'border-[#FBE7B4] bg-[#FFF8E6] text-[#6B5A2A]',
}

/** Faixa de mensagem sob a roda. Altura mínima reservada para a mesa não pular entre giros. */
export function SpinMessage({ tone, children }: { tone: SpinTone; children: ReactNode }) {
  return (
    <p
      aria-live="polite"
      className={`flex min-h-[clamp(40px,6dvh,52px)] w-full items-center justify-center rounded-2xl border-2 px-4 py-2 text-center text-[14px] font-bold leading-snug ${TONE_STYLE[tone]}`}
    >
      {children}
    </p>
  )
}

/**
 * Coluna da direita: escolha da cor, valor da aposta e o botão de girar. `extra` entra no topo
 * (ex.: o botão de som da mesa 2).
 */
export function BetPanel({
  view,
  selected,
  bet,
  disabled,
  busy,
  onSelect,
  onBet,
  onSpin,
  onFinish,
  extra,
}: {
  view: RouletteMatchView
  selected: RouletteMoveOption | null
  bet: number
  disabled: boolean
  busy: boolean
  onSelect: (id: RouletteMoveOption) => void
  onBet: (n: number) => void
  onSpin: () => void
  onFinish: () => void
  extra?: ReactNode
}) {
  const finished = view.status === 'finished'
  const limit = Math.max(1, view.maxMagnitude)
  const canSpin = !disabled && selected !== null && view.maxMagnitude > 0

  return (
    <aside className="flex min-w-0 flex-col gap-[clamp(10px,1.8dvh,16px)] rounded-[26px] border-2 border-[#E6EEF6] bg-[#F7FAFD] p-[clamp(12px,2dvh,20px)]">
      {extra}
      <div className="flex flex-col gap-2">
        <p className={kickerClass}>1 · Escolha uma cor</p>
        <ColorPicker conditions={view.conditions} selected={selected} disabled={disabled} onSelect={onSelect} />
      </div>

      <div className="flex flex-col gap-2">
        <p className={kickerClass}>2 · Valor da aposta</p>
        <BetInput value={Math.min(bet, limit)} limit={limit} chipValues={view.chipValues} disabled={disabled} onChange={onBet} />
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <button
          type="button"
          onClick={onSpin}
          disabled={!canSpin}
          className={`rounded-full bg-[#00A3F5] px-8 py-[clamp(10px,1.8dvh,15px)] text-[17px] font-black tracking-[0.06em] text-[#08243C] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${
            canSpin ? 'animate-[dpGlow_2.2s_ease-in-out_infinite]' : ''
          }`}
        >
          {busy ? 'GIRANDO…' : selected ? 'GIRAR ROLETA' : 'ESCOLHA UMA COR'}
        </button>
        {view.allowGiveUp && (
          <button
            type="button"
            onClick={onFinish}
            disabled={busy || finished}
            className="rounded-full border-2 border-[#E6EEF6] bg-white px-6 py-2 text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#3C4654] transition-colors hover:border-[#F4D3D4] hover:text-[#A3161C] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Encerrar partida
          </button>
        )}
      </div>
    </aside>
  )
}
