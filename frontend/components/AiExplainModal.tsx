'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { repoApi } from '@/lib/api'
import { Brain, Sparkles } from 'lucide-react'

interface Props {
  repoId: string
  onClose: () => void
}

export default function AiExplainModal({ repoId, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [error, setError] = useState('')

  const handleExplain = async () => {
    setLoading(true)
    setError('')
    try {
      const { explanation } = await repoApi.explain(repoId)
      setExplanation(explanation)
    } catch {
      setError('Failed to get AI explanation. Check your Gemini API key.')
    } finally {
      setLoading(false)
    }
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
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="glass-card p-8 max-w-xl w-full border border-pink-500/30"
          style={{ boxShadow: '0 0 40px rgba(255,45,120,0.2)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                <Brain size={22} />
              </div>
              <div>
                <h2 className="font-bold text-white text-lg">AI Health Explanation</h2>
                <p className="text-gray-500 text-xs">Powered by Gemini AI · Only computed metrics are shared</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors text-lg"
            >
              ✕
            </button>
          </div>

          {!explanation && !loading && (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm mb-6">
                Gemini AI will analyze your repository&apos;s health metrics and provide an engineering assessment.
                <br />
                <span className="text-gray-600 text-xs mt-1 block">No source code is sent — only computed metrics.</span>
              </p>
              <button onClick={handleExplain} className="neon-btn-pink flex items-center gap-2">
                <Sparkles size={16} /> Generate AI Explanation
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-10">
              <div className="flex items-center justify-center gap-3 text-pink-400">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm">Gemini is analyzing your metrics...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {explanation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="bg-pink-500/5 border border-pink-500/20 rounded-xl p-5 mb-4">
                <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {explanation}
                </p>
              </div>
              <button onClick={handleExplain} className="text-gray-600 text-xs hover:text-gray-400 transition-colors">
                ↻ Regenerate
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
