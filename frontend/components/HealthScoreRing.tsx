'use client'

interface Props {
  score: number
  size?: number
  strokeWidth?: number
}

export default function HealthScoreRing({ score, size = 80, strokeWidth = 7 }: Props) {
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const color =
    score >= 75 ? '#00ff9f'
    : score >= 50 ? '#ffd700'
    : '#ff2d78'

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#1a2d4a" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 1s ease-in-out',
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-black text-lg"
        style={{ color, textShadow: `0 0 10px ${color}` }}
      >
        {score}
      </span>
    </div>
  )
}
