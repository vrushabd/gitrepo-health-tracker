'use client'

interface Contributor {
  id: string
  author: string
  authorEmail: string
  commitCount: number
  linesAdded: number
  linesRemoved: number
  filesOwned: number
  busFactor: number
  criticalModules: string[] | string
}

function parseCriticalModules(raw: string[] | string): string[] {
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [] }
}

interface Props {
  contributors: Contributor[]
}

function BusFactorBadge({ factor }: { factor: number }) {
  if (factor === 1) {
    return (
      <span className="px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-400 border border-red-500/30">
        🚌 Bus Factor: 1 ⚠️
      </span>
    )
  }
  if (factor <= 2) {
    return (
      <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
        🚌 Bus Factor: {factor}
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-400 border border-green-500/30">
      🚌 Bus Factor: {factor}
    </span>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{
        background: `linear-gradient(135deg, hsl(${hue},70%,40%), hsl(${hue + 60},70%,30%))`,
        boxShadow: `0 0 10px hsl(${hue},70%,40%,0.4)`,
      }}
    >
      {initials}
    </div>
  )
}

export default function ContributorLeaderboard({ contributors }: Props) {
  if (!contributors.length) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
        No contributor data yet...
      </div>
    )
  }

  const maxCommits = Math.max(...contributors.map(c => c.commitCount))

  return (
    <div className="space-y-3">
      {contributors.map((c, i) => (
        <div
          key={c.id}
          className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-cyber-border/30 hover:border-cyan-500/20 transition-all"
        >
          {/* Rank */}
          <div className="w-6 text-center text-sm font-bold text-gray-600 mt-2">
            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
          </div>

          <Avatar name={c.author} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-white text-sm">{c.author}</span>
              <BusFactorBadge factor={c.busFactor} />
            </div>
            <div className="text-gray-500 text-xs mb-2 font-mono">{c.authorEmail}</div>

            {/* Commit bar */}
            <div className="h-1.5 bg-cyber-border rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                style={{
                  width: `${(c.commitCount / maxCommits) * 100}%`,
                  boxShadow: '0 0 6px rgba(0,245,255,0.5)',
                  transition: 'width 1s ease-in-out',
                }}
              />
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span><span className="text-cyan-400 font-mono">{c.commitCount}</span> commits</span>
              <span><span className="text-green-400 font-mono">+{c.linesAdded.toLocaleString()}</span></span>
              <span><span className="text-pink-400 font-mono">-{c.linesRemoved.toLocaleString()}</span></span>
              <span><span className="text-purple-400 font-mono">{c.filesOwned}</span> files owned</span>
            </div>

            {(() => {
              const modules = parseCriticalModules(c.criticalModules)
              return modules.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {modules.slice(0, 4).map((m: string, j: number) => (
                    <span key={j} className="px-1.5 py-0.5 rounded text-xs bg-red-500/10 text-red-400 font-mono border border-red-500/20">
                      {m.split('/').pop()}
                    </span>
                  ))}
                  {modules.length > 4 && (
                    <span className="text-gray-600 text-xs">+{modules.length - 4} more</span>
                  )}
                </div>
              ) : null
            })()}
          </div>
        </div>
      ))}
    </div>
  )
}
