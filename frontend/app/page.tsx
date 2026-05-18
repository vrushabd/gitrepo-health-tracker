'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { repoApi } from '@/lib/api'
import PremiumLogo from '@/components/PremiumLogo'
import { Zap, Flame, Bot, Activity, Users, GitMerge, Link, Download, Settings, Heart, BarChart3, AlertTriangle, Search, TestTube, Package } from 'lucide-react'

const FEATURES = [
  {
    icon: <PremiumLogo query="lightning fast speed" fallbackIcon={<Zap size={32} />} size={32} />,
    title: 'Incremental Analysis',
    desc: 'Efficiently processes 500+ commits via diff-based analysis. Never rescans the full codebase.',
    color: 'neon',
  },
  {
    icon: <PremiumLogo query="fire hotspot flame" fallbackIcon={<Flame size={32} />} size={32} />,
    title: 'Hotspot Detection',
    desc: 'Identifies high-risk files by combining complexity scores with churn frequency.',
    color: 'pink',
  },
  {
    icon: <PremiumLogo query="ai robot intelligence" fallbackIcon={<Bot size={32} />} size={32} />,
    title: 'AI-Powered Insights',
    desc: 'Gemini AI explains health degradation in concise engineering language using only computed metrics.',
    color: 'purple',
  },
  {
    icon: <PremiumLogo query="trend line chart full" fallbackIcon={<Activity size={32} />} size={32} />,
    title: 'Health Timeline',
    desc: 'Visual trend charts tracking complexity, test coverage, churn, and dependency health over time.',
    color: 'green',
  },
  {
    icon: <PremiumLogo query="users team leaderboard bus" fallbackIcon={<Users size={32} />} size={32} />,
    title: 'Bus Factor Analysis',
    desc: 'Detect single points of failure — modules owned by only one contributor.',
    color: 'yellow',
  },
  {
    icon: <PremiumLogo query="magic crystal ball future" fallbackIcon={<GitMerge size={32} />} size={32} />,
    title: 'Pre-Merge Prediction',
    desc: 'Predict health impact of proposed changes before they land in your main branch.',
    color: 'orange',
  },
]

const ARCH_STEPS = [
  { label: 'GitHub URL', icon: <PremiumLogo query="link chain" fallbackIcon={<Link size={24} />} size={24} />, color: '#00f5ff' },
  { label: 'Clone + Fetch', icon: <PremiumLogo query="download inbox" fallbackIcon={<Download size={24} />} size={24} />, color: '#8b5cf6' },
  { label: 'Incremental Diffs', icon: <PremiumLogo query="settings gears logic" fallbackIcon={<Settings size={24} />} size={24} />, color: '#00ff9f' },
  { label: 'Health Engine', icon: <PremiumLogo query="heart beat health" fallbackIcon={<Heart size={24} />} size={24} />, color: '#ff2d78' },
  { label: 'AI Explanation', icon: <PremiumLogo query="ai robot bot" fallbackIcon={<Bot size={24} />} size={24} />, color: '#ffd700' },
  { label: 'Dashboard', icon: <PremiumLogo query="dashboard layout chart" fallbackIcon={<BarChart3 size={24} />} size={24} />, color: '#00f5ff' },
]

export default function LandingPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!url.trim()) return

    setLoading(true)
    try {
      const { jobId, repoId } = await repoApi.analyze(url.trim())
      router.push(`/dashboard/${repoId}?jobId=${jobId}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start analysis'
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen">
      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-0 border-b border-cyber-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-sm font-bold">
              RP
            </div>
            <span className="font-bold text-lg neon-text">RepoPulse AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#analyze" className="neon-btn py-2 px-4 text-xs">
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-cyan-500/30 text-cyan-400 text-sm mb-8">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              AI-Powered · Incremental · Real-time
            </div>

            <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
              <span className="text-white">Track your codebase</span>
              <br />
              <span className="neon-text text-glow-neon">health like</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400">
                engineering leaders.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12">
              RepoPulse AI analyzes public GitHub repositories across 500+ commits,
              detecting complexity hotspots, test degradation, and dependency risks —
              then explains it all with Gemini AI.
            </p>

            {/* ── ANALYZE INPUT ── */}
            <div id="analyze" className="max-w-2xl mx-auto">
              <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://github.com/spring-projects/spring-petclinic"
                  className="flex-1 px-5 py-4 rounded-xl bg-cyber-card/80 border border-cyber-border text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/60 focus:shadow-[0_0_20px_rgba(0,245,255,0.2)] transition-all text-sm font-mono"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="neon-btn whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analyzing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Search size={16} /> Analyze Repo
                    </span>
                  )}
                </button>
              </form>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 text-pink-400 text-sm flex items-center justify-center gap-2"
                >
                  <AlertTriangle size={16} /> {error}
                </motion.p>
              )}

              <p className="mt-4 text-gray-600 text-xs">
                Try: github.com/vercel/next.js · github.com/facebook/react · github.com/spring-projects/spring-petclinic
              </p>
            </div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-20 grid grid-cols-3 md:grid-cols-3 gap-6 max-w-2xl mx-auto"
          >
            {[
              { value: '500+', label: 'Commits Analyzed' },
              { value: '6', label: 'Health Metrics' },
              { value: 'AI', label: 'Gemini Powered' },
            ].map((s, i) => (
              <div key={i} className="glass-card p-4 text-center">
                <div className="text-2xl font-black neon-text">{s.value}</div>
                <div className="text-gray-500 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Codebases <span className="pink-text">degrade silently.</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-16">
              Complexity accumulates commit by commit. Tests disappear quietly. Dependencies balloon.
              By the time you notice, the damage is deep. RepoPulse catches it early.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: <PremiumLogo query="trend line complexity" fallbackIcon={<Activity size={32} />} size={32} />, title: 'Complexity Creep', desc: 'Cyclomatic complexity grows 23% per quarter without visibility', color: 'text-pink-400' },
                { icon: <PremiumLogo query="test tube science lab" fallbackIcon={<TestTube size={32} />} size={32} />, title: 'Test Erosion', desc: 'Teams ship 40% fewer tests under deadline pressure', color: 'text-yellow-400' },
                { icon: <PremiumLogo query="box package open box" fallbackIcon={<Package size={32} />} size={32} />, title: 'Dependency Rot', desc: 'Avg project has 47 outdated or vulnerable packages', color: 'text-purple-400' },
              ].map((p, i) => (
                <div key={i} className="glass-card p-6 text-left">
                  <div className="mb-3">{p.icon}</div>
                  <div className={`font-bold text-lg mb-2 ${p.color}`}>{p.title}</div>
                  <div className="text-gray-500 text-sm">{p.desc}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="neon-text">Intelligent</span> Features
            </h2>
            <p className="text-gray-400">Everything you need to maintain engineering excellence</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 hover:border-cyan-500/30 transition-all duration-300 group"
              >
                <div className="mb-4 group-hover:scale-110 transition-transform duration-300 origin-left">{f.icon}</div>
                <h3 className="font-bold text-lg mb-2 text-white">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ARCHITECTURE ── */}
      <section id="architecture" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="neon-text">Architecture</span>
            </h2>
            <p className="text-gray-400">Engineered for scale and speed</p>
          </motion.div>

          <div className="flex flex-wrap justify-center items-center gap-4">
            {ARCH_STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card px-5 py-3 text-center"
                  style={{ borderColor: `${step.color}40` }}
                >
                  <div className="text-2xl mb-1">{step.icon}</div>
                  <div className="text-xs font-semibold" style={{ color: step.color }}>{step.label}</div>
                </motion.div>
                {i < ARCH_STEPS.length - 1 && (
                  <div className="text-gray-600 text-xl">→</div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 glass-card p-8">
            <div className="grid md:grid-cols-4 gap-6 text-center">
              {[
                { tech: 'Next.js', role: 'Frontend', color: '#00f5ff' },
                { tech: 'Express.js', role: 'Backend API', color: '#8b5cf6' },
                { tech: 'PostgreSQL', role: 'Database', color: '#00ff9f' },
                { tech: 'Google Gemini', role: 'Intelligence', color: '#ffd700' },
              ].map((t, i) => (
                <div key={i} className="flex flex-col items-center">
                  <PremiumLogo query={t.tech} size={48} className="mb-3 drop-shadow-md" />
                  <div className="font-bold text-lg" style={{ color: t.color }}>{t.tech}</div>
                  <div className="text-gray-500 text-sm mt-1">{t.role}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-black mb-6">
              Start analyzing your
              <br />
              <span className="neon-text text-glow-neon">repo health now.</span>
            </h2>
            <p className="text-gray-400 mb-10">No signup required. Just paste your GitHub URL.</p>
            <a href="#analyze" className="neon-btn text-base px-10 py-4 inline-flex items-center gap-3">
              <Zap size={20} /> Analyze a Repository
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-cyber-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-gray-600 text-sm">
          <span className="neon-text font-bold">RepoPulse AI</span>
          <span>Built for hackathons · Powered by Gemini AI</span>
        </div>
      </footer>
    </main>
  )
}
