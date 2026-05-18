'use client'

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
  if (score > 20) return <span className="text-red-400 text-base">🔥🔥🔥</span>
  if (score > 10) return <span className="text-yellow-400 text-base">🔥🔥</span>
  return <span className="text-green-400 text-base">🔥</span>
}

function RiskBar({ score }: { score: number }) {
  const pct = Math.min(100, (score / 30) * 100)
  const color = pct > 66 ? '#ff2d78' : pct > 33 ? '#ffd700' : '#00ff9f'
  return (
    <div className="h-1.5 w-24 bg-cyber-border rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}` }}
      />
    </div>
  )
}

export default function HotspotTable({ hotspots, compact = false }: Props) {
  if (!hotspots.length) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
        No hotspot data yet...
      </div>
    )
  }

  const items = compact ? hotspots.slice(0, 6) : hotspots

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-cyber-border">
            <th className="pb-3 text-gray-500 font-medium">Risk</th>
            <th className="pb-3 text-gray-500 font-medium">File</th>
            {!compact && <th className="pb-3 text-gray-500 font-medium">Language</th>}
            <th className="pb-3 text-gray-500 font-medium">Complexity</th>
            <th className="pb-3 text-gray-500 font-medium">Churn</th>
            {!compact && <th className="pb-3 text-gray-500 font-medium">Hotspot Score</th>}
            <th className="pb-3 text-gray-500 font-medium">Risk Level</th>
          </tr>
        </thead>
        <tbody>
          {items.map((h, i) => {
            const fileName = h.filePath.split('/').pop() || h.filePath
            const dirPath = h.filePath.split('/').slice(0, -1).join('/')
            return (
              <tr
                key={i}
                className="border-b border-cyber-border/30 hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-3">
                  <HotspotBadge score={h.hotspotScore} />
                </td>
                <td className="py-3">
                  <div className="font-mono">
                    <div className="text-white text-sm font-medium">{fileName}</div>
                    {!compact && dirPath && (
                      <div className="text-gray-600 text-xs">{dirPath}/</div>
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
                <td className="py-3 text-gray-300 font-mono text-xs">
                  {Math.round(h.complexity)}
                </td>
                <td className="py-3 text-gray-300 font-mono text-xs">
                  ×{h.churnCount}
                </td>
                {!compact && (
                  <td className="py-3 text-gray-300 font-mono text-xs">
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
