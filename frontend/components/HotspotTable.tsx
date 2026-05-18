'use client'

import PremiumLogo from '@/components/PremiumLogo'
import { Flame } from 'lucide-react'

interface HotspotFile {
  filePath: string
  language: string
  hotspotScore: number
  complexity: number
  churnCount: number
  linesAdded: number
  linesRemoved: number
}

interface Props {
  hotspots: HotspotFile[]
  compact?: boolean
}

function HotspotBadge({ score }: { score: number }) {
  const getFlame = () => (
    <PremiumLogo 
      query="fire flame hotspot" 
      fallbackIcon={<Flame size={16} className="text-inherit" />} 
      size={16} 
    />
  )

  if (score > 20) return <div className="flex gap-1 text-red-400">{getFlame()}{getFlame()}{getFlame()}</div>
  if (score > 10) return <div className="flex gap-1 text-yellow-400">{getFlame()}{getFlame()}</div>
  return <div className="flex gap-1 text-green-500">{getFlame()}</div>
}

function RiskBar({ score }: { score: number }) {
  const pct = Math.min(100, (score / 30) * 100)
  const color = pct > 66 ? '#ff2d78' : pct > 33 ? '#ffd700' : '#00c97a'
  return (
    <div className="h-1.5 w-24 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

export default function HotspotTable({ hotspots, compact = false }: Props) {
  if (!hotspots.length) {
    return (
      <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--text-muted)' }}>
        No hotspot data yet...
      </div>
    )
  }

  const items = compact ? hotspots.slice(0, 6) : hotspots

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
            <th className="pb-3 font-medium" style={{ color: 'var(--text-muted)' }}>Risk</th>
            <th className="pb-3 font-medium" style={{ color: 'var(--text-muted)' }}>File</th>
            {!compact && <th className="pb-3 font-medium" style={{ color: 'var(--text-muted)' }}>Language</th>}
            <th className="pb-3 font-medium" style={{ color: 'var(--text-muted)' }}>Complexity</th>
            <th className="pb-3 font-medium" style={{ color: 'var(--text-muted)' }}>Churn</th>
            {!compact && <th className="pb-3 font-medium" style={{ color: 'var(--text-muted)' }}>Score</th>}
            <th className="pb-3 font-medium" style={{ color: 'var(--text-muted)' }}>Risk Level</th>
          </tr>
        </thead>
        <tbody>
          {items.map((h, i) => {
            const fileName = h.filePath.split('/').pop() || h.filePath
            const dirPath = h.filePath.split('/').slice(0, -1).join('/')
            return (
              <tr
                key={i}
                className="transition-colors"
                style={{ borderBottom: '1px solid color-mix(in srgb, var(--border) 50%, transparent)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--neon) 4%, transparent)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="py-3">
                  <HotspotBadge score={h.hotspotScore} />
                </td>
                <td className="py-3">
                  <div className="font-mono">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{fileName}</div>
                    {!compact && dirPath && (
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{dirPath}/</div>
                    )}
                  </div>
                </td>
                {!compact && (
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {h.language || 'Unknown'}
                    </span>
                  </td>
                )}
                <td className="py-3 font-mono text-xs" style={{ color: 'var(--text-subtle)' }}>
                  {Math.round(h.complexity)}
                </td>
                <td className="py-3 font-mono text-xs" style={{ color: 'var(--text-subtle)' }}>
                  ×{h.churnCount}
                </td>
                {!compact && (
                  <td className="py-3 font-mono text-xs" style={{ color: 'var(--text-subtle)' }}>
                    {h.hotspotScore.toFixed(1)}
                  </td>
                )}
                <td className="py-3">
                  <RiskBar score={h.hotspotScore} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
