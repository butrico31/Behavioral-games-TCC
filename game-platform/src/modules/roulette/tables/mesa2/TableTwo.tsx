import { useCallback, useRef, useState } from 'react'
import { formatClock, formatSessionCode, pocketIndex } from '../../config/conditions'
import type { PresentSpin } from '../../hooks/useRouletteMatch'
import type { RouletteMoveOption } from '../../types/roulette'
import { describeSpin, type RouletteTableProps } from '../types'
import { BettingTable } from './BettingTable'
import { RouletteWheel, type RouletteWheelHandle } from './phaser/RouletteWheel'
import './mesa2.css'

/** Mesa 2: roleta de cassino em Phaser + pano de feltro. */
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
  const [launched, setLaunched] = useState(false)

  const finished = view.status === 'finished'
  const disabled = busy || locked || finished
  const limit = Math.max(1, view.maxMagnitude)
  const magnitude = Math.min(bet, limit)
  const canRun = !disabled && selected !== null && view.maxMagnitude > 0
  const progress = Math.min(1, view.coins / view.pointsLimit)
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
      setLaunched(true)
      try {
        const result = await wheel.spin(pending, (r) => pocketIndex(view.wheel, r.pocket))
        setWinning(result.pocket)
        return result
      } finally {
        setLaunched(false)
      }
    },
    [view.wheel]
  )

  const run = () => {
    if (!canRun || !selected) return
    void onSpin(selected, magnitude, present)
  }

  const message = actionError
    ? actionError
    : busy
      ? launched
        ? 'Bola lançada…'
        : 'Enviando ensaio…'
      : lastSpin
        ? describeSpin(lastSpin, labelOf)
        : 'Selecione uma condição e defina a magnitude para iniciar o ensaio.'

  const subtitle = `Roleta de cassino · ${view.wheel.length} casas · ${view.conditions
    .map((c) => `${c.label.toLowerCase()} ${c.payoutLabel}`)
    .join(', ')}`

  return (
    <div className="m2">
      <div className="m2-app">
        <header className="m2-topbar">
          <div className="m2-brand">
            <span className="m2-brand-mark" aria-hidden>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8" />
              </svg>
            </span>
            BehaviorLab
          </div>
          <div className="m2-topbar-actions">
            <button type="button" className="m2-pill-btn" onClick={() => setMuted((m) => !m)} aria-pressed={muted}>
              {muted ? 'Som desligado' : 'Som ligado'}
            </button>
            <span className="m2-pill">Sessão do aluno</span>
          </div>
        </header>

        <main className="m2-layout">
          <section className="m2-stats">
            <article className="m2-card m2-hero">
              <div>
                <p className="m2-eyebrow">Partida em andamento</p>
                <h1>Roleta Tricromática</h1>
                <p className="m2-muted">{subtitle}</p>
              </div>
              <div className="m2-hero-side">
                <span className={`m2-status ${finished ? 'is-ended' : ''}`}>
                  {finished ? 'Sessão encerrada' : 'Coletando dados'}
                </span>
                <p className="m2-eyebrow">Código da sessão</p>
                <p className="m2-code">{formatSessionCode(view.matchId)}</p>
              </div>
            </article>
            <article className="m2-card m2-stat">
              <p className="m2-eyebrow">Fichas</p>
              <p className="m2-stat-value">{view.coins}</p>
            </article>
            <article className="m2-card m2-stat">
              <p className="m2-eyebrow">Meta</p>
              <p className="m2-stat-value accent">{view.pointsLimit}</p>
              <div
                className="m2-bar"
                role="progressbar"
                aria-valuenow={Math.round(progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${progress * 100}%` }} />
              </div>
            </article>
            <article className="m2-card m2-stat">
              <p className="m2-eyebrow">Ensaios</p>
              <p className="m2-stat-value">{String(view.round).padStart(2, '0')}</p>
            </article>
            <article className="m2-card m2-stat">
              <p className="m2-eyebrow">{remainingSeconds !== null ? 'Tempo restante' : 'Duração'}</p>
              <p className="m2-stat-value m2-mono warn">
                {formatClock(remainingSeconds ?? elapsedSeconds)}
              </p>
            </article>
          </section>

          <section className="m2-card m2-apparatus">
            <div className="m2-panel-head">
              <h2>Aparato</h2>
              <span className="m2-mono m2-small">sequência sem reforço · {view.pityStreak}</span>
            </div>
            <div className="m2-apparatus-body">
              <div className="m2-wheel-wrap">
                <RouletteWheel ref={wheelRef} pockets={view.wheel} muted={muted} />
              </div>
              <BettingTable
                title="Mesa tricromática"
                wheel={view.wheel}
                conditions={view.conditions}
                selected={selected}
                winning={winning}
                disabled={disabled}
                onSelect={setSelected}
              />
            </div>
            <p className={`m2-log ${actionError ? 'is-error' : ''}`} aria-live="polite">
              <span className="m2-dot" /> {message}
            </p>
          </section>

          <aside className="m2-card m2-controls">
            <div className="m2-step">
              <h3>
                <span className="m2-num">01</span> Condição
              </h3>
              <div className="m2-options" role="radiogroup" aria-label="Condição">
                {view.conditions.map((condition) => (
                  <button
                    key={condition.id}
                    type="button"
                    role="radio"
                    aria-checked={selected === condition.id}
                    disabled={disabled}
                    className={`m2-option ${selected === condition.id ? 'is-selected' : ''}`}
                    onClick={() => setSelected(condition.id)}
                  >
                    <span className={`m2-swatch m2-sw-${condition.id}`} />
                    {condition.label}
                    <span className="m2-option-pay">{condition.payoutLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="m2-step">
              <h3>
                <span className="m2-num">02</span> Magnitude
              </h3>
              <div className="m2-stepper">
                <button
                  type="button"
                  aria-label="Diminuir"
                  disabled={disabled || magnitude <= 1}
                  onClick={() => setBet(Math.max(1, magnitude - 1))}
                >
                  −
                </button>
                <output>
                  {magnitude} <small>fichas</small>
                </output>
                <button
                  type="button"
                  aria-label="Aumentar"
                  disabled={disabled || magnitude >= limit}
                  onClick={() => setBet(Math.min(limit, magnitude + 1))}
                >
                  +
                </button>
              </div>
              <p className="m2-mono m2-small">limite atual · {view.maxMagnitude} fichas</p>
              <div className="m2-chips">
                {view.chipValues.map((value, index) => (
                  <button
                    key={value}
                    type="button"
                    className={`m2-chip m2-chip-${index % 4}`}
                    disabled={disabled}
                    onClick={() => setBet((prev) => Math.min(limit, prev + value))}
                    aria-label={`Acrescentar ${value} fichas à aposta`}
                  >
                    +{value}
                  </button>
                ))}
              </div>
              <div className="m2-bet-input">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={limit}
                  value={magnitude}
                  onChange={(e) => setBet(Math.max(1, Math.min(limit, Number(e.target.value) || 1)))}
                  disabled={disabled}
                  aria-label="Digitar valor da aposta"
                />
                <button type="button" onClick={() => setBet(1)} disabled={disabled}>
                  Limpar
                </button>
              </div>
            </div>

            <div className="m2-step">
              <h3>
                <span className="m2-num">03</span> Execução
              </h3>
              <button type="button" className="m2-btn-primary" disabled={!canRun} onClick={run}>
                {busy ? 'Girando…' : 'Executar ensaio'}
              </button>
              {view.allowGiveUp && (
                <button type="button" className="m2-btn-secondary" disabled={busy || finished} onClick={onFinish}>
                  Encerrar sessão
                </button>
              )}
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
}
