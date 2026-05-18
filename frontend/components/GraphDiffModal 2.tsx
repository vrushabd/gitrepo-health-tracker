'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { repoApi } from '@/lib/api'
import KnowledgeGraphDiff from './KnowledgeGraphDiff'
import PremiumLogo from './PremiumLogo'

interface Props {
  repoId: string
  commits: { hash: string; message: string }[]
  onClose: () => void
}

export default function GraphDiffModal({ repoId, commits, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [diffData, setDiffData] = useState<any>(null)

  const [fromCommit, setFromCommit] = useState(commits[1]?.hash || '')
  const [toCommit, setToCommit] = useState(commits[0]?.hash || '')

  const handleCompare = async () => {
    if (!fromCommit || !toCommit) return
    setLoading(true)
    setError('')
    try {
      const data = await repoApi.getDiff(repoId, fromCommit, toCommit)
      setDiffData(data)
    } catch {
      setError('Failed to fetch graph data. Make sure the repository was cloned during analysis.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div className="glass-card p-10 max-w-sm w-full text-center border border-cyan-500/30">
          <div className="flex justify-center mb-4">
            <svg className="animate-spin w-10 h-10 text-cyan-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-cyan-400 font-bold mb-2">Building Code Graphs...</p>
          <p className="text-gray-500 text-xs">Checking out commits and mapping file structure.<br/>This may take 10-30 seconds.</p>
        </div>
      </div>
    )
  }

  if (diffData && diffData.fromGraph && diffData.toGraph) {
    return <KnowledgeGraphDiff fromGraph={diffData.fromGraph} toGraph={diffData.toGraph} onClose={onClose} />
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="glass-card p-6 w-full max-w-lg border border-cyan-500/30 bg-[#0a0a0a]"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <PremiumLogo query="network compare split" size={24} />
              Commit Compare
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-gray-400 text-xs mb-1">Base Commit (From)</label>
              <select 
                value={fromCommit} 
                onChange={e => setFromCommit(e.target.value)}
                className="w-full bg-[#111] border border-gray-800 rounded p-2 text-sm text-white"
              >
                {commits.map(c => (
                  <option key={c.hash} value={c.hash}>{c.hash.substring(0, 7)} - {c.message}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Target Commit (To)</label>
              <select 
                value={toCommit} 
                onChange={e => setToCommit(e.target.value)}
                className="w-full bg-[#111] border border-gray-800 rounded p-2 text-sm text-white"
              >
                {commits.map(c => (
                  <option key={c.hash} value={c.hash}>{c.hash.substring(0, 7)} - {c.message}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

          <button 
            onClick={handleCompare} 
            disabled={loading}
            className="neon-btn w-full flex justify-center items-center"
          >
            {loading ? 'Analyzing Structure...' : 'Compare Commits'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
