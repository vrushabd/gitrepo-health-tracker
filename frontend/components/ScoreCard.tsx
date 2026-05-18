'use client'

interface Props {
  label: string
  score: number
  icon: React.ReactNode
  color: 'neon' | 'green' | 'yellow' | 'purple' | 'pink'
}

const COLOR_MAP = {
  neon: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  green: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  purple: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  pink: { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
}

export default function ScoreCard({ label, score, icon, color }: Props) {
  const c = COLOR_MAP[color]

  return (
    <div className={`glass-card p-5 border ${c.border}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center justify-center">{icon}</span>
        <span className={`text-2xl font-black ${c.text}`}>{score}</span>
      </div>
      <div className="text-gray-500 text-xs mb-2">{label}</div>
      {/* Mini progress bar */}
      <div className="h-1 bg-cyber-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${c.bg.replace('bg-', 'bg-').replace('/10', '/60')}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}
