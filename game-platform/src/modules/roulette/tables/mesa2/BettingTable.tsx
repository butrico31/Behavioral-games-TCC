import { useMemo } from 'react'
import type { RouletteCondition, RouletteMoveOption, RoulettePocket } from '../../types/roulette'

interface BettingTableProps {
  wheel: RoulettePocket[]
  conditions: RouletteCondition[]
  selected: RouletteMoveOption | null
  winning: string | null
  disabled?: boolean
  title: string
  onSelect: (id: RouletteMoveOption) => void
}

/**
 * Pano da mesa: as casas da roda em grade de 3 colunas (como no cassino) e os losangos das
 * condições. A cor de cada casa vem da roda que o backend mandou.
 */
export function BettingTable({ wheel, conditions, selected, winning, disabled, title, onSelect }: BettingTableProps) {
  const { zeros, numbers } = useMemo(() => {
    const numeric = (label: string) => /^[1-9]\d*$/.test(label)
    return {
      zeros: wheel.filter((pocket) => !numeric(pocket.label)),
      numbers: wheel.filter((pocket) => numeric(pocket.label)).sort((a, b) => Number(a.label) - Number(b.label)),
    }
  }, [wheel])

  const cell = (pocket: RoulettePocket) => (
    <div
      key={pocket.label}
      className={`m2-bt-cell m2-bt-${pocket.condition} ${winning === pocket.label ? 'is-win' : ''}`}
      aria-label={`Casa ${pocket.label}`}
    >
      {pocket.label}
    </div>
  )

  return (
    <div className="m2-bt-frame">
      <div className="m2-bt-felt">
        <p className="m2-bt-title">{title}</p>
        <div className="m2-bt-body">
          <div className="m2-bt-grid">
            <div className="m2-bt-zero">{zeros.map(cell)}</div>
            {numbers.map(cell)}
          </div>
          <div className="m2-bt-conds" role="radiogroup" aria-label="Cor da aposta">
            {conditions.map((condition) => (
              <button
                key={condition.id}
                type="button"
                role="radio"
                aria-checked={selected === condition.id}
                disabled={disabled}
                className={`m2-bt-cond ${selected === condition.id ? 'is-selected' : ''}`}
                onClick={() => onSelect(condition.id)}
              >
                <span className={`m2-bt-diamond m2-bt-${condition.id}`} />
                <span className="m2-bt-cond-label">{condition.label}</span>
                <span className="m2-bt-cond-pay">{condition.payoutLabel}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
