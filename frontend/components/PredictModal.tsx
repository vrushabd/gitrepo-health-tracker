'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { repoApi } from '@/lib/api'

interface Props {
  repoId: string
  onClose: () => void
}

interface PredictResult {
  prediction: string
  heuristicRisk: {
    complexity: string
    dependency: string
    overall: string
  }
  estimatedScoreDelta: number
}

export default function PredictModal({ repoId, onClose }: Props) {
  const [files, setFiles] = useState('')
  const [linesAdded, setLinesAdded] = useState(0)
  const [linesRemoved, setLinesRemoved] = useState(0)
  const [deps, setDeps] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PredictResult | null>(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'manual' | 'pr'>('pr')
  const [prUrl, setPrUrl] = useState('')

  const handlePredict = async () => {
    setLoading(true)
    setError('')
    try {
      const payload = mode === 'pr' 
        ? { prUrl: prUrl.trim() }
        : {
            filesModified: files.split('\n').map(f => f.trim()).filter(Boolean),
            linesAdded,
            linesRemoved,
            newDependencies: deps.split('\n').map(d => d.trim()).filter(Boolean),
          }
      const res = await repoApi.predict(repoId, payload)
      setResult(res)
    } catch {
      setError('Prediction failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const riskColor = (r: string) =>
    r === 'HIGH' ? 'text-red-400' : r === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8 overflow-y-auto"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="glass-card p-8 max-w-xl w-full border border-cyan-500/30 my-auto"
          style={{ boxShadow: '0 0 40px rgba(0,245,255,0.15)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xl">
                🔮
              </div>
              <div>
                <h2 className="font-bold text-white text-lg">Pre-Merge Prediction</h2>
                <p className="text-gray-500 text-xs">Simulate changes to predict health impact</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors text-lg"
            >
              ✕
            </button>
          </div>

          <div className="flex bg-cyber-card border border-cyber-border rounded-xl mb-6 p-1">
            <button
              onClick={() => setMode('pr')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'pr' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Analyze via PR URL
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'manual' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Manual Input
            </button>
          </div>

          <div className="space-y-4 mb-6">
            {mode === 'pr' ? (
              <div>
                <label className="text-gray-400 text-sm mb-1 block">GitHub Pull Request URL</label>
                <input
                  type="text"
                  value={prUrl}
                  onChange={e => setPrUrl(e.target.value)}
                  placeholder="https://github.com/tiangolo/fastapi/pull/123"
                  className="w-full px-4 py-3 rounded-xl bg-cyber-card border border-cyber-border text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 text-sm font-mono"
                />
                <p className="text-xs text-gray-500 mt-2">
                  We will automatically fetch the PR diff and calculate lines added, removed, and dependencies changed.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Files to Modify (one per line)</label>
                  <textarea
                    value={files}
                    onChange={e => setFiles(e.target.value)}
                    rows={3}
                    placeholder="src/auth/AuthService.ts&#10;src/payment/PaymentGateway.ts"
                    className="w-full px-4 py-3 rounded-xl bg-cyber-card border border-cyber-border text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 text-sm font-mono resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Lines Added</label>
                    <input
                      type="number"
                      value={linesAdded}
                      onChange={e => setLinesAdded(Number(e.target.value))}
                      min={0}
                      className="w-full px-4 py-3 rounded-xl bg-cyber-card border border-cyber-border text-white focus:outline-none focus:border-cyan-500/60 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Lines Removed</label>
                    <input
                      type="number"
                      value={linesRemoved}
                      onChange={e => setLinesRemoved(Number(e.target.value))}
                      min={0}
                      className="w-full px-4 py-3 rounded-xl bg-cyber-card border border-cyber-border text-white focus:outline-none focus:border-cyan-500/60 text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-1 block">New Dependencies (one per line)</label>
                  <textarea
                    value={deps}
                    onChange={e => setDeps(e.target.value)}
                    rows={2}
                    placeholder="lodash&#10;moment"
                    className="w-full px-4 py-3 rounded-xl bg-cyber-card border border-cyber-border text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 text-sm font-mono resize-none"
                  />
                </div>
              </>
            )}
          </div>

          <button
            onClick={handlePredict}
            disabled={loading}
            className="neon-btn w-full justify-center disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Predicting...
              </span>
            ) : '🔮 Predict Health Impact'}
          </button>

          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 space-y-4"
            >
              {/* Risk badges */}
              <div className="flex flex-wrap gap-3">
                <div className="glass-card px-4 py-2 text-sm">
                  <span className="text-gray-500">Complexity: </span>
                  <span className={`font-bold ${riskColor(result.heuristicRisk.complexity)}`}>
                    {result.heuristicRisk.complexity}
                  </span>
                </div>
                <div className="glass-card px-4 py-2 text-sm">
                  <span className="text-gray-500">Dependency: </span>
                  <span className={`font-bold ${riskColor(result.heuristicRisk.dependency)}`}>
                    {result.heuristicRisk.dependency}
                  </span>
                </div>
                <div className="glass-card px-4 py-2 text-sm">
                  <span className="text-gray-500">Score Δ: </span>
                  <span className={`font-bold font-mono ${result.estimatedScoreDelta < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {result.estimatedScoreDelta > 0 ? '+' : ''}{result.estimatedScoreDelta.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* AI Prediction */}
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
                <div className="text-cyan-400 text-xs font-bold mb-2 uppercase tracking-wider">AI Assessment</div>
                <p className="text-gray-300 text-sm leading-relaxed">{result.prediction}</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
