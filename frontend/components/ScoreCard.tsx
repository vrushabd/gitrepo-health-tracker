'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'

interface Props {
  label: string
  score: number
  icon: React.ReactNode
  color: 'neon' | 'green' | 'yellow' | 'purple' | 'pink'
  delay?: number
}

const COLOR_MAP = {
  neon:   { text: '#00f5ff', bg: 'rgba(0,245,255,0.12)',   border: 'rgba(0,245,255,0.25)',   glow: 'rgba(0,245,255,0.15)'   },
  green:  { text: '#00ff9f', bg: 'rgba(0,255,159,0.12)',   border: 'rgba(0,255,159,0.25)',   glow: 'rgba(0,255,159,0.12)'   },
  yellow: { text: '#ffd700', bg: 'rgba(255,215,0,0.12)',   border: 'rgba(255,215,0,0.25)',   glow: 'rgba(255,215,0,0.12)'   },
  purple: { text: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)', glow: 'rgba(167,139,250,0.12)' },
  pink:   { text: '#ff2d78', bg: 'rgba(255,45,120,0.12)',  border: 'rgba(255,45,120,0.25)',  glow: 'rgba(255,45,120,0.12)'  },
}

function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return <>{count}</>
}

export default function ScoreCard({ label, score, icon, color, delay = 0 }: Props) {
  const c = COLOR_MAP[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}
      className="glass-card p-5 relative overflow-hidden cursor-default"
      style={{ borderColor: c.border }}
    >
      {/* Glow bg */}
      <div
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
        style={{ background: `radial-gradient(circle at 50% 0%, ${c.glow}, transparent 70%)` }}
      />

      <div className="relative flex items-center justify-between mb-3">
        {/* Animated icon */}
        <motion.span
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay }}
          className="flex items-center justify-center"
          style={{ color: c.text }}
        >
          {icon}
        </motion.span>

        <span className="text-2xl font-black tabular-nums" style={{ color: c.text }}>
          <AnimatedCounter target={score} />
        </span>
      </div>

      <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{label}</div>

      {/* Animated progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.2, delay: delay + 0.2, ease: 'easeOut' }}
          style={{ background: c.text, boxShadow: `0 0 8px ${c.glow}` }}
        />
      </div>
    </motion.div>
  )
}
