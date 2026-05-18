'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { repoApi, jobApi } from '@/lib/api'
import HealthScoreRing from '@/components/HealthScoreRing'
import TimelineChart from '@/components/TimelineChart'
import HotspotTable from '@/components/HotspotTable'
import ContributorLeaderboard from '@/components/ContributorLeaderboard'
import CommitActivityChart from '@/components/CommitActivityChart'
import AiExplainModal from '@/components/AiExplainModal'
import PredictModal from '@/components/PredictModal'
import ScoreCard from '@/components/ScoreCard'

interface JobStatus {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  totalCommits: number
  error?: string
  repository?: { owner: string; name: string; url: string }
}

interface HealthData {
  repo: { owner: string; name: string; url: string; description?: string }
  health: {
    overallScore: number
    complexityScore: number
    testScore: number
    churnScore: number
    depScore: number
    hotspotCount: number
    totalFiles: number
    testFiles: number
    codeFiles: number
    depCount: number
    snapshotAt: string
  } | null
  jobStatus: string
}

type ActiveTab = 'overview' | 'timeline' | 'hotspots' | 'contributors' | 'predict'

export default function DashboardPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const repoId = params.repoId as string
  const jobId = searchParams.get('jobId')

  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [timeline, setTimeline] = useState<unknown[]>([])
  const [hotspots, setHotspots] = useState<unknown[]>([])
  const [contributors, setContributors] = useState<unknown[]>([])
  const [commits, setCommits] = useState<unknown[]>([])
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [showAiModal, setShowAiModal] = useState(false)
  const [showPredictModal, setShowPredictModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const loadDashboardData = useCallback(async () => {
    try {
      const [healthRes, timelineRes, hotspotsRes, contributorsRes, commitsRes] = await Promise.allSettled([
        repoApi.getHealth(repoId),
        repoApi.getTimeline(repoId),
        repoApi.getHotspots(repoId),
        repoApi.getContributors(repoId),
        repoApi.getCommits(repoId, 1, 50),
      ])

      if (healthRes.status === 'fulfilled') setHealthData(healthRes.value)
      if (timelineRes.status === 'fulfilled') setTimeline(timelineRes.value.timeline || [])
      if (hotspotsRes.status === 'fulfilled') setHotspots(hotspotsRes.value.hotspots || [])
      if (contributorsRes.status === 'fulfilled') setContributors(contributorsRes.value.contributors || [])
      if (commitsRes.status === 'fulfilled') setCommits(commitsRes.value.commits || [])
    } catch (err) {
      console.error('Dashboard data load error:', err)
    }
  }, [repoId])

  const pollJobStatus = useCallback(async () => {
    if (!jobId) return

    try {
      const status = await jobApi.getStatus(jobId)
      setJobStatus(status)

      if (status.status === 'COMPLETED') {
        if (pollingRef.current) clearInterval(pollingRef.current)
        await loadDashboardData()
        setLoading(false)
      } else if (status.status === 'FAILED') {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setLoading(false)
      }
    } catch (err) {
      console.error('Job poll error:', err)
    }
  }, [jobId, loadDashboardData])

  useEffect(() => {
    if (jobId) {
      pollJobStatus()
      pollingRef.current = setInterval(pollJobStatus, 3000)
    } else {
      loadDashboardData().then(() => setLoading(false))
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [jobId, pollJobStatus, loadDashboardData])

  const health = healthData?.health
  const repo = healthData?.repo || jobStatus?.repository

  // ── LOADING/PROCESSING STATE ──
  if (loading || (jobStatus && jobStatus.status !== 'COMPLETED' && jobStatus.status !== 'FAILED')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-10 max-w-md w-full mx-4 text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="#1a2d4a" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="36"
                fill="none" stroke="#00f5ff" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - (jobStatus?.progress || 0) / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-500"
                style={{ filter: 'drop-shadow(0 0 8px #00f5ff)' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold neon-text">
              {jobStatus?.progress || 0}%
            </span>
          </div>

          <h2 className="text-xl font-bold mb-2">
            {jobStatus?.status === 'PENDING' ? '⏳ Queued...' : '⚙️ Analyzing Repository'}
          </h2>

          {repo && (
            <p className="text-gray-400 text-sm mb-4 font-mono">
              {(repo as {owner:string;name:string}).owner}/{(repo as {owner:string;name:string}).name}
            </p>
          )}

          <div className="text-gray-500 text-sm space-y-1">
            {jobStatus?.totalCommits ? (
              <p>Processing {jobStatus.totalCommits} commits</p>
            ) : null}
            <p className="text-xs text-gray-600">Analyzing diffs incrementally...</p>
          </div>

          {/* Animated bars */}
          <div className="mt-6 space-y-2">
            {['Cloning repository', 'Fetching commit history', 'Computing health metrics', 'Storing results'].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${i <= Math.floor((jobStatus?.progress || 0) / 25) ? 'bg-green-400 animate-pulse' : 'bg-gray-700'}`} />
                <div className={`text-xs ${i <= Math.floor((jobStatus?.progress || 0) / 25) ? 'text-gray-300' : 'text-gray-600'}`}>{step}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    )
  }

  // ── FAILED STATE ──
  if (jobStatus?.status === 'FAILED') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-10 max-w-md w-full mx-4 text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-pink-400 mb-2">Analysis Failed</h2>
          <p className="text-gray-500 text-sm">{jobStatus.error || 'Unknown error occurred'}</p>
          <a href="/" className="neon-btn mt-6 inline-block text-sm">← Try Another Repo</a>
        </div>
      </div>
    )
  }

  const TABS: { key: ActiveTab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'timeline', label: 'Timeline', icon: '📈' },
    { key: 'hotspots', label: 'Hotspots', icon: '🔥' },
    { key: 'contributors', label: 'Contributors', icon: '👥' },
    { key: 'predict', label: 'Predict', icon: '🔮' },
  ]

  return (
    <div className="min-h-screen">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 glass-card border-0 border-b border-cyber-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-gray-500 hover:text-white transition-colors text-sm">
              ← Home
            </a>
            <div className="w-px h-4 bg-cyber-border" />
            <div>
              <span className="neon-text font-bold text-sm">
                {repo ? `${(repo as {owner:string}).owner}/${(repo as {name:string}).name}` : 'Repository Dashboard'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPredictModal(true)}
              className="neon-btn py-2 px-4 text-xs"
            >
              🔮 Predict Merge
            </button>
            <button
              onClick={() => setShowAiModal(true)}
              className="neon-btn-pink py-2 px-4 text-xs"
            >
              🤖 AI Explain
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ── TOP SCORE ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8"
        >
          {/* Overall Score */}
          <div className="col-span-2 glass-card p-6 flex items-center gap-6">
            <HealthScoreRing score={health?.overallScore ?? 0} size={90} />
            <div>
              <div className="text-gray-400 text-sm mb-1">Overall Health</div>
              <div className="text-3xl font-black neon-text">{health?.overallScore ?? '--'}</div>
              <div className="text-gray-500 text-xs mt-1">
                {(health?.overallScore ?? 0) >= 75 ? '✅ Healthy' :
                  (health?.overallScore ?? 0) >= 50 ? '⚠️ Moderate Risk' : '🔴 Critical'}
              </div>
            </div>
          </div>

          {/* Sub-scores */}
          <ScoreCard label="Complexity" score={health?.complexityScore ?? 0} icon="🧩" color="neon" />
          <ScoreCard label="Test Health" score={health?.testScore ?? 0} icon="🧪" color="green" />
          <ScoreCard label="Churn" score={health?.churnScore ?? 0} icon="🔄" color="yellow" />
          <ScoreCard label="Dependencies" score={health?.depScore ?? 0} icon="📦" color="purple" />
        </motion.div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Hotspot Files', value: health?.hotspotCount ?? '--', icon: '🔥' },
            { label: 'Test Files', value: health?.testFiles ?? '--', icon: '🧪' },
            { label: 'Code Files', value: health?.codeFiles ?? '--', icon: '📄' },
            { label: 'Dependencies', value: health?.depCount ?? '--', icon: '📦' },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="stat-card"
            >
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-gray-500 text-sm mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ── TABS ── */}
        <div className="flex gap-1 mb-6 glass-card p-1 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                  <h3 className="font-bold mb-4 text-gray-300">📈 Health Score Trend</h3>
                  <TimelineChart data={timeline} compact />
                </div>
                <div className="glass-card p-6">
                  <h3 className="font-bold mb-4 text-gray-300">📊 Commit Activity</h3>
                  <CommitActivityChart commits={commits} />
                </div>
                <div className="glass-card p-6 lg:col-span-2">
                  <h3 className="font-bold mb-4 text-gray-300">🔥 Top Hotspot Files</h3>
                  <HotspotTable hotspots={hotspots.slice(0, 8)} compact />
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="glass-card p-6">
                <h3 className="font-bold mb-6 text-gray-300 text-lg">📈 Full Health Timeline</h3>
                <TimelineChart data={timeline} />
              </div>
            )}

            {activeTab === 'hotspots' && (
              <div className="glass-card p-6">
                <h3 className="font-bold mb-6 text-gray-300 text-lg">🔥 Hotspot Risk Map</h3>
                <HotspotTable hotspots={hotspots} />
              </div>
            )}

            {activeTab === 'contributors' && (
              <div className="glass-card p-6">
                <h3 className="font-bold mb-6 text-gray-300 text-lg">👥 Contributor Leaderboard &amp; Bus Factor</h3>
                <ContributorLeaderboard contributors={contributors} />
              </div>
            )}

            {activeTab === 'predict' && (
              <div className="glass-card p-8 max-w-2xl">
                <h3 className="font-bold mb-2 text-gray-300 text-lg">🔮 Pre-Merge Health Prediction</h3>
                <p className="text-gray-500 text-sm mb-6">Simulate a merge to predict its health impact before it lands.</p>
                <button onClick={() => setShowPredictModal(true)} className="neon-btn">
                  🔮 Open Prediction Tool
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── MODALS ── */}
      {showAiModal && (
        <AiExplainModal repoId={repoId} onClose={() => setShowAiModal(false)} />
      )}
      {showPredictModal && (
        <PredictModal repoId={repoId} onClose={() => setShowPredictModal(false)} />
      )}
    </div>
  )
}
