'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { repoApi, jobApi } from '@/lib/api'
import HealthScoreRing from '@/components/HealthScoreRing'
import TimelineChart from '@/components/TimelineChart'
import HotspotTable from '@/components/HotspotTable'
import ContributorLeaderboard from '@/components/ContributorLeaderboard'
import CommitCompareTab from '@/components/CommitCompareTab'
import CommitActivityChart from '@/components/CommitActivityChart'
import AiExplainModal from '@/components/AiExplainModal'
import PredictModal from '@/components/PredictModal'
import ScoreCard from '@/components/ScoreCard'
import PremiumLogo from '@/components/PremiumLogo'
import GraphDiffModal from '@/components/GraphDiffModal'
import ArchitectureModal from '@/components/ArchitectureModal'
import { Activity, GitMerge, FileCode, Users, Flame, LayoutDashboard, Settings, History, TestTube, Package, Sparkles, Network, Code } from 'lucide-react'

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

type ActiveTab = 'overview' | 'timeline' | 'hotspots' | 'contributors' | 'predict' | 'compare'

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
  const [showGraphModal, setShowGraphModal] = useState(false)
  const [showArchModal, setShowArchModal] = useState(false)
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

  const TABS: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <PremiumLogo query="overview chart graph" fallbackIcon={<LayoutDashboard size={18} />} size={18} className="mr-2" /> },
    { key: 'timeline', label: 'Timeline', icon: <PremiumLogo query="timeline trend line" fallbackIcon={<Activity size={18} />} size={18} className="mr-2" /> },
    { key: 'compare', label: 'Compare', icon: <PremiumLogo query="network compare split" fallbackIcon={<GitMerge size={18} />} size={18} className="mr-2" /> },
    { key: 'hotspots', label: 'Hotspots', icon: <PremiumLogo query="fire hotspot flame" fallbackIcon={<Flame size={18} />} size={18} className="mr-2" /> },
    { key: 'contributors', label: 'Contributors', icon: <PremiumLogo query="users team people" fallbackIcon={<Users size={18} />} size={18} className="mr-2" /> },
    { key: 'predict', label: 'Predict', icon: <PremiumLogo query="magic crystal ball" fallbackIcon={<GitMerge size={18} />} size={18} className="mr-2" /> },
  ]

  return (
    <div className="min-h-screen">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 glass-card border-0 border-b border-cyber-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink min-w-0">
            <a href="/" className="text-gray-500 hover:text-white transition-colors text-xs sm:text-sm whitespace-nowrap">
              ← <span className="hidden sm:inline">Home</span>
            </a>
            <div className="w-px h-4 bg-cyber-border shrink-0" />
            <div className="min-w-0 flex-1 truncate">
              <span className="neon-text font-bold text-xs sm:text-sm block truncate">
                {repo ? `${(repo as {owner:string}).owner}/${(repo as {name:string}).name}` : 'Repository Dashboard'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => setShowPredictModal(true)}
              className="neon-btn py-1.5 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs flex items-center gap-1 sm:gap-2 whitespace-nowrap"
            >
              <PremiumLogo query="magic crystal ball" fallbackIcon={<GitMerge size={14} />} size={14} className="hidden sm:flex" /> 
              <span>Predict<span className="hidden sm:inline"> Merge</span></span>
            </button>
            <button
              onClick={() => setShowArchModal(true)}
              className="border border-purple-500/50 text-purple-400 hover:bg-purple-500/10 rounded-lg py-1.5 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs flex items-center gap-1 sm:gap-2 whitespace-nowrap transition-colors"
            >
              <PremiumLogo query="code architecture struct" fallbackIcon={<Code size={14} />} size={14} className="hidden sm:flex" /> 
              <span>Architecture</span>
            </button>
            <button
              onClick={() => setShowAiModal(true)}
              className="neon-btn-pink py-1.5 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs flex items-center gap-1 sm:gap-2 whitespace-nowrap"
            >
              <PremiumLogo query="ai robot bot" fallbackIcon={<Sparkles size={14} />} size={14} className="hidden sm:flex" /> 
              <span>AI<span className="hidden sm:inline"> Explain</span></span>
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
          <ScoreCard label="Complexity" score={health?.complexityScore ?? 0} icon={<PremiumLogo query="puzzle logic piece" fallbackIcon={<Settings size={24} />} size={24} />} color="neon" />
          <ScoreCard label="Test Health" score={health?.testScore ?? 0} icon={<PremiumLogo query="test tube science lab" fallbackIcon={<TestTube size={24} />} size={24} />} color="green" />
          <ScoreCard label="Churn" score={health?.churnScore ?? 0} icon={<PremiumLogo query="sync cycle refresh" fallbackIcon={<History size={24} />} size={24} />} color="yellow" />
          <ScoreCard label="Dependencies" score={health?.depScore ?? 0} icon={<PremiumLogo query="box package open" fallbackIcon={<Package size={24} />} size={24} />} color="purple" />
        </motion.div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Hotspot Files', value: health?.hotspotCount ?? '--', icon: <PremiumLogo query="fire flame hotspot" fallbackIcon={<Flame size={28} />} size={28} /> },
            { label: 'Test Files', value: health?.testFiles ?? '--', icon: <PremiumLogo query="test tube science lab" fallbackIcon={<TestTube size={28} />} size={28} /> },
            { label: 'Code Files', value: health?.codeFiles ?? '--', icon: <PremiumLogo query="file document page text" fallbackIcon={<FileCode size={28} />} size={28} /> },
            { label: 'Dependencies', value: health?.depCount ?? '--', icon: <PremiumLogo query="box package open" fallbackIcon={<Package size={28} />} size={28} /> },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="stat-card"
            >
              <div className="mb-2 flex items-center justify-start">{s.icon}</div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-gray-500 text-sm mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ── TABS ── */}
        <div className="flex gap-1 mb-6 glass-card p-1 w-full max-w-full overflow-x-auto hide-scrollbar whitespace-nowrap md:w-fit">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center whitespace-nowrap ${
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
                  <h3 className="font-bold mb-4 text-gray-300 flex items-center gap-2">
                    <PremiumLogo query="trend line chart" fallbackIcon={<Activity size={24} />} size={24} /> Health Score Trend
                  </h3>
                  <TimelineChart data={timeline} compact />
                </div>
                <div className="glass-card p-6">
                  <h3 className="font-bold mb-4 text-gray-300 flex items-center gap-2">
                    <PremiumLogo query="bar chart activity" fallbackIcon={<Activity size={24} />} size={24} /> Commit Activity
                  </h3>
                  <CommitActivityChart commits={commits} />
                </div>
                <div className="glass-card p-6 lg:col-span-2">
                  <h3 className="font-bold mb-4 text-gray-300 flex items-center gap-2">
                    <PremiumLogo query="fire hotspot flame" fallbackIcon={<Flame size={24} />} size={24} /> Top Hotspot Files
                  </h3>
                  <HotspotTable hotspots={hotspots.slice(0, 8)} compact />
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="glass-card p-6">
                <h3 className="font-bold mb-6 text-gray-300 text-lg flex items-center gap-2">
                  <PremiumLogo query="trend line chart full" fallbackIcon={<Activity size={28} />} size={28} /> Full Health Timeline
                </h3>
                <TimelineChart data={timeline} />
              </div>
            )}

            {activeTab === 'hotspots' && (
              <div className="glass-card p-6">
                <h3 className="font-bold mb-6 text-gray-300 text-lg flex items-center gap-2">
                  <PremiumLogo query="fire hotspot map" fallbackIcon={<Flame size={28} />} size={28} /> Hotspot Risk Map
                </h3>
                <HotspotTable hotspots={hotspots} />
              </div>
            )}

            {activeTab === 'contributors' && (
              <div className="glass-card p-6">
                <h3 className="font-bold mb-6 text-gray-300 text-lg flex items-center gap-2">
                  <PremiumLogo query="users team leaderboard" fallbackIcon={<Users size={28} />} size={28} /> Contributor Leaderboard &amp; Bus Factor
                </h3>
                <ContributorLeaderboard contributors={contributors} />
              </div>
            )}

            {activeTab === 'compare' && (
              <CommitCompareTab repoId={repoId} commits={commits} />
            )}

            {activeTab === 'predict' && (
              <div className="glass-card p-8 max-w-2xl">
                <h3 className="font-bold mb-2 text-gray-300 text-lg flex items-center gap-2">
                  <PremiumLogo query="magic crystal ball future" fallbackIcon={<GitMerge size={28} />} size={28} /> Pre-Merge Health Prediction
                </h3>
                <p className="text-gray-500 text-sm mb-6">Simulate a merge to predict its health impact before it lands.</p>
                <button onClick={() => setShowPredictModal(true)} className="neon-btn flex items-center gap-2">
                  <PremiumLogo query="magic crystal ball open" fallbackIcon={<GitMerge size={16} />} size={16} /> Open Prediction Tool
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
      {showGraphModal && (
        <GraphDiffModal repoId={repoId} commits={commits} onClose={() => setShowGraphModal(false)} />
      )}
      {showArchModal && (
        <ArchitectureModal repoId={repoId} commitHash={commits[0]?.hash || ''} onClose={() => setShowArchModal(false)} />
      )}
    </div>
  )
}
