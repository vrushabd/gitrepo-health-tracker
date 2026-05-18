'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'

interface TimelinePoint {
  commitHash: string
  overallScore: number
  complexityScore: number
  testScore: number
  churnScore: number
  depScore: number
  snapshotAt: string
}

interface Props {
  data: TimelinePoint[]
  compact?: boolean
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card p-3 text-xs border-cyber-border">
      <p className="text-gray-400 mb-2 font-mono">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold" style={{ color: p.color }}>{Math.round(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function TimelineChart({ data, compact = false }: Props) {
  const formatted = data.map(d => ({
    ...d,
    date: new Date(d.snapshotAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    hash: d.commitHash.slice(0, 7),
  }))

  const height = compact ? 200 : 340

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
        No timeline data yet...
      </div>
    )
  }

  const lines = compact
    ? [{ key: 'overallScore', color: '#00f5ff', name: 'Overall' }]
    : [
        { key: 'overallScore', color: '#00f5ff', name: 'Overall' },
        { key: 'complexityScore', color: '#8b5cf6', name: 'Complexity' },
        { key: 'testScore', color: '#00ff9f', name: 'Tests' },
        { key: 'churnScore', color: '#ffd700', name: 'Churn' },
        { key: 'depScore', color: '#ff6b35', name: 'Deps' },
      ]

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={formatted} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid stroke="#1a2d4a" strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={{ stroke: '#1a2d4a' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={{ stroke: '#1a2d4a' }}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        {!compact && <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />}
        {lines.map(l => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            stroke={l.color}
            name={l.name}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: l.color, filter: `drop-shadow(0 0 6px ${l.color})` }}
            style={{ filter: `drop-shadow(0 0 4px ${l.color}40)` }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
