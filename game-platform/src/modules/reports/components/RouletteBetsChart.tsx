import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { RouletteReportRound } from '../../roulette/types/roulette'

/** Mesmas três séries e cores do "Modelo registro aposta". */
const SERIES = [
  { key: 'mesa', label: 'Valor na mesa', color: '#4285F4' },
  { key: 'aposta', label: 'Valor apostado', color: '#EA4335' },
  { key: 'total', label: 'Total', color: '#FBBC04' }
] as const

/** Gráfico do relatório do professor: valor na mesa, valor apostado e total, rodada a rodada. */
export function RouletteBetsChart({ rounds }: { rounds: RouletteReportRound[] }) {
  if (rounds.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">Sem dados para exibir.</div>
    )
  }

  const data = rounds.map((r) => ({ round: r.round, mesa: r.coinsBefore, aposta: r.aposta, total: r.coinsAfter }))

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="round"
            stroke="var(--color-muted-foreground)"
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
            label={{ value: 'Rodada', position: 'insideBottom', offset: -4, fill: 'var(--color-muted-foreground)', fontSize: 12 }}
          />
          <YAxis
            stroke="var(--color-muted-foreground)"
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
            label={{ value: 'Fichas', angle: -90, position: 'insideLeft', fill: 'var(--color-muted-foreground)', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              color: 'var(--color-foreground)'
            }}
            labelStyle={{ color: 'var(--color-muted-foreground)' }}
            labelFormatter={(label) => `Rodada ${label}`}
          />
          <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: 13 }} />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="linear"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2.5}
              dot={{ fill: s.color, r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
