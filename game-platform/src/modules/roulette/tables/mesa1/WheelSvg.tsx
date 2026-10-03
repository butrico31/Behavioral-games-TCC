import { CONDITION_COLORS } from '../../config/conditions'
import type { RoulettePocket } from '../../types/roulette'

interface WheelSvgProps {
  wheel: RoulettePocket[]
  /** Graus, sentido horário. A casa no topo (sob o leitor) é a sorteada. */
  rotation: number
  spinSeconds: number
  winning: string | null
  centerLabel?: string
}

const SIZE = 400
const C = SIZE / 2
const R_OUTER = 190
const R_NUMBERS = 160
const R_INNER = 128
const R_HUB = 56

/** Ponto no círculo: ângulo em graus a partir do topo, sentido horário. */
function at(radius: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [C + radius * Math.sin(rad), C - radius * Math.cos(rad)]
}

function wedge(outer: number, inner: number, a0: number, a1: number): string {
  const [x0, y0] = at(outer, a0)
  const [x1, y1] = at(outer, a1)
  const [x2, y2] = at(inner, a1)
  const [x3, y3] = at(inner, a0)
  return `M${x0} ${y0} A${outer} ${outer} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${inner} ${inner} 0 0 0 ${x3} ${y3}Z`
}

/**
 * Roda plana da mesa 1, desenhada a partir da roda que o backend mandou. É SVG com viewBox, então
 * escala com o container (largura 100%) sem perder nitidez.
 */
export function WheelSvg({ wheel, rotation, spinSeconds, winning, centerLabel }: WheelSvgProps) {
  const count = wheel.length
  const seg = 360 / count

  return (
    <div className="relative w-full">
      <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2" aria-hidden="true">
        <div className="h-0 w-0 border-x-[9px] border-t-[18px] border-x-transparent border-t-foreground" />
      </div>

      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="block h-auto w-full" role="img" aria-label="Roleta">
        <circle cx={C} cy={C} r={R_OUTER + 8} className="fill-card stroke-border" strokeWidth={2} />

        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: `${C}px ${C}px`,
            transition: `transform ${spinSeconds}s cubic-bezier(0.14, 0.72, 0.02, 1)`,
          }}
        >
          {wheel.map((pocket, index) => {
            const a0 = index * seg
            const a1 = a0 + seg
            const mid = a0 + seg / 2
            const [tx, ty] = at((R_OUTER + R_NUMBERS) / 2 + 2, mid)
            const is_win = winning === pocket.label

            return (
              <g key={pocket.label}>
                <path d={wedge(R_OUTER, R_INNER, a0, a1)} fill={CONDITION_COLORS[pocket.condition]} />
                <path d={wedge(R_NUMBERS, R_INNER, a0, a1)} fill="rgba(0,0,0,0.28)" />
                {is_win && (
                  <path
                    d={wedge(R_OUTER, R_INNER, a0, a1)}
                    fill="rgba(255,255,255,0.35)"
                    stroke="#fff1b8"
                    strokeWidth={3}
                    className="animate-pulse"
                  />
                )}
                <text
                  x={tx}
                  y={ty}
                  fill="#fff"
                  fontSize={13}
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(${mid} ${tx} ${ty})`}
                >
                  {pocket.label}
                </text>
              </g>
            )
          })}
          {wheel.map((_, index) => {
            const [x0, y0] = at(R_OUTER, index * seg)
            const [x1, y1] = at(R_INNER, index * seg)
            return (
              <line key={index} x1={x0} y1={y0} x2={x1} y2={y1} stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
            )
          })}
          <circle cx={C} cy={C} r={R_INNER} className="fill-secondary" />
        </g>

        <circle cx={C} cy={C} r={R_HUB} className="fill-card stroke-border" strokeWidth={2} />
        {centerLabel && (
          <text
            x={C}
            y={C}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={20}
            fontWeight={700}
            className="fill-foreground"
          >
            {centerLabel}
          </text>
        )}
      </svg>
    </div>
  )
}
