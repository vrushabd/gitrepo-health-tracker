'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface Commit {
  committedAt: string
  insertions: number
  deletions: number
}

interface Props {
  commits: Commit[]
}

export default function CommitActivityChart({ commits }: Props) {
  if (!commits.length) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
        No commit data yet...
      </div>
    )
  }

  // Group by week
  const weekMap = new Map<string, { added: number; removed: number; count: number }>()

  for (const c of commits) {
    const d = new Date(c.committedAt)
    // Round to nearest week
    const week = new Date(d.setDate(d.getDate() - d.getDay())).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
    const existing = weekMap.get(week) || { added: 0, removed: 0, count: 0 }
    weekMap.set(week, {
      added: existing.added + (c.insertions || 0),
      removed: existing.removed + (c.deletions || 0),
      count: existing.count + 1,
    })
  }

  const data = [...weekMap.entries()]
    .slice(-12)
    .map(([date, v]) => ({ date, ...v }))

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; fill: string }>
    label?: string
  }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="glass-card p-3 text-xs">
        <p className="text-gray-400 mb-1">{label}</p>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.fill }}>
            {p.name}: {p.value}
          </div>
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid stroke="#1a2d4a" strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#6b7280', fontSize: 10 }}
          axisLine={{ stroke: '#1a2d4a' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 10 }}
          axisLine={{ stroke: '#1a2d4a' }}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="added" name="Lines Added" fill="#00ff9f" radius={[2, 2, 0, 0]} opacity={0.8} />
        <Bar dataKey="removed" name="Lines Removed" fill="#ff2d78" radius={[2, 2, 0, 0]} opacity={0.8} />
      </BarChart>
    </ResponsiveContainer>
  )
}
