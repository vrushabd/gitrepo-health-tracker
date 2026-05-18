'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { repoApi } from '@/lib/api'
import KnowledgeGraphDiff from './KnowledgeGraphDiff'
import { FilePlus, FileEdit, FileMinus, ShieldCheck } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import PremiumLogo from './PremiumLogo'

interface Props {
  repoId: string
  commits: { hash: string; message: string }[]
}

export default function CommitCompareTab({ repoId, commits }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [diffData, setDiffData] = useState<{
    fromCommit: string;
    toCommit: string;
    filesAdded: string[];
    filesModified: string[];
    filesRemoved: string[];
    fromHealth: any;
    toHealth: any;
    healthDelta: number;
    fromGraph: any;
    toGraph: any;
    added?: any[];
    modified?: any[];
    removed?: any[];
  } | null>(null)

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
      setError('Failed to fetch comparison data. Make sure the repository was fully analyzed.')
    } finally {
      setLoading(false)
    }
  }

  const getChartData = () => {
    if (!diffData) return []
    return [
      { name: 'Overall', from: diffData.fromHealth?.overallScore || 0, to: diffData.toHealth?.overallScore || 0 },
      { name: 'Complexity', from: diffData.fromHealth?.complexityScore || 0, to: diffData.toHealth?.complexityScore || 0 },
      { name: 'Tests', from: diffData.fromHealth?.testScore || 0, to: diffData.toHealth?.testScore || 0 },
      { name: 'Churn', from: diffData.fromHealth?.churnScore || 0, to: diffData.toHealth?.churnScore || 0 },
      { name: 'Deps', from: diffData.fromHealth?.depScore || 0, to: diffData.toHealth?.depScore || 0 },
    ]
  }

  return (
    <div className="space-y-6">
      {/* ── SELECTION BAR ── */}
      <div className="glass-card p-4 sm:p-6 flex flex-col md:flex-row items-end gap-4 bg-[#0a0a0f] border border-cyan-500/10">
        <div className="w-full md:flex-1 space-y-2">
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Base commit</label>
          <div className="relative">
            <select 
              value={fromCommit} 
              onChange={e => setFromCommit(e.target.value)}
              className="w-full bg-[#111] border border-gray-800 rounded-lg p-3 text-sm text-gray-200 focus:border-cyan-500/50 outline-none appearance-none cursor-pointer"
            >
              {commits.map(c => (
                <option key={c.hash} value={c.hash}>{c.hash.substring(0, 7)} - {c.message}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex-shrink-0 self-center hidden md:block pt-6 text-cyan-500/50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
        </div>

        <div className="w-full md:flex-1 space-y-2">
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Candidate commit</label>
          <div className="relative">
            <select 
              value={toCommit} 
              onChange={e => setToCommit(e.target.value)}
              className="w-full bg-[#111] border border-gray-800 rounded-lg p-3 text-sm text-gray-200 focus:border-cyan-500/50 outline-none appearance-none cursor-pointer"
            >
              {commits.map(c => (
                <option key={c.hash} value={c.hash}>{c.hash.substring(0, 7)} - {c.message}</option>
              ))}
            </select>
          </div>
        </div>

        <button 
          onClick={handleCompare} 
          disabled={loading}
          className="neon-btn h-[46px] px-8 font-bold tracking-wide w-full md:w-auto mt-2 md:mt-0 whitespace-nowrap disabled:opacity-50"
        >
          {loading ? 'ANALYZING...' : 'COMPARE COMMITS'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* ── RESULTS ── */}
      {diffData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BASE HEALTH */}
            <div className="glass-card p-6 bg-[#0a0a0f] border border-green-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded flex items-center gap-1">
                  <ShieldCheck size={14}/> Better Merge
                </span>
              </div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Base Health</p>
              <p className="text-cyan-400 text-sm font-mono mb-2">{diffData.fromCommit.substring(0, 7)}</p>
              <div className="text-5xl font-black text-green-400 mb-4 drop-shadow-[0_0_10px_rgba(74,222,128,0.3)]">
                {diffData.fromHealth ? diffData.fromHealth.overallScore.toFixed(1) : 'N/A'}
              </div>
              <p className="text-gray-300 text-sm font-medium truncate">
                {commits.find(c => c.hash === diffData.fromCommit)?.message || 'Commit'}
              </p>
              <p className="text-gray-600 text-xs mt-4">
                {diffData.fromHealth?.snapshotAt ? new Date(diffData.fromHealth.snapshotAt).toLocaleDateString() : 'Unknown Date'}
              </p>
            </div>

            {/* CANDIDATE HEALTH */}
            <div className="glass-card p-6 bg-[#0a0a0f] border border-yellow-500/20">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Candidate Health</p>
              <p className="text-blue-400 text-sm font-mono mb-2">{diffData.toCommit.substring(0, 7)}</p>
              <div className="text-5xl font-black text-yellow-500 mb-4 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]">
                {diffData.toHealth ? diffData.toHealth.overallScore.toFixed(1) : 'N/A'}
              </div>
              <p className="text-gray-300 text-sm font-medium truncate">
                {commits.find(c => c.hash === diffData.toCommit)?.message || 'Commit'}
              </p>
              <p className="text-gray-600 text-xs mt-4">
                {diffData.toHealth?.snapshotAt ? new Date(diffData.toHealth.snapshotAt).toLocaleDateString() : 'Unknown Date'}
              </p>
            </div>
          </div>

          {/* MERGE RECOMMENDATION */}
          <div className="glass-card p-6 bg-[#0a0a0f] border border-purple-500/20">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                  <span className="text-cyan-400">⚯</span> Merge Recommendation
                </h3>
                <p className="text-gray-400 text-sm">
                  Commit {diffData.fromCommit.substring(0,7)} keeps the repository healthier with a risk score of {diffData.fromHealth ? (100 - diffData.fromHealth.overallScore).toFixed(1) : 'N/A'} compared with {diffData.toHealth ? (100 - diffData.toHealth.overallScore).toFixed(1) : 'N/A'}.
                </p>
              </div>
              <div className={`text-3xl font-black ${diffData.healthDelta < 0 ? 'text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.3)]' : 'text-green-400'}`}>
                {diffData.healthDelta > 0 ? '+' : ''}{diffData.healthDelta.toFixed(1)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
                <p className="text-green-400 text-xs font-bold mb-1 flex items-center gap-1"><FilePlus size={12}/> Added</p>
                <p className="text-2xl font-bold text-white">{diffData.filesAdded?.length || 0}</p>
              </div>
              <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
                <p className="text-yellow-400 text-xs font-bold mb-1 flex items-center gap-1"><FileEdit size={12}/> Modified</p>
                <p className="text-2xl font-bold text-white">{diffData.filesModified?.length || 0}</p>
              </div>
              <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
                <p className="text-pink-400 text-xs font-bold mb-1 flex items-center gap-1"><FileMinus size={12}/> Removed</p>
                <p className="text-2xl font-bold text-white">{diffData.filesRemoved?.length || 0}</p>
              </div>
            </div>
          </div>

          {/* HEALTH DIFFERENCE GRAPH */}
          <div className="glass-card p-6 bg-[#0a0a0f] border border-cyan-500/20">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                  <PremiumLogo query="bar chart trend difference" fallbackIcon={<ShieldCheck size={20} />} size={20} />
                  Health Difference Graph
                </h3>
                <p className="text-gray-400 text-sm">Side-by-side scores for each health dimension.</p>
              </div>
              <div className={`text-xs font-mono font-bold ${diffData.healthDelta < 0 ? 'text-pink-500' : 'text-green-400'}`}>
                Overall delta: {diffData.healthDelta > 0 ? '+' : ''}{diffData.healthDelta.toFixed(1)}
              </div>
            </div>

            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#1a2d4a" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#1a2d4a' }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#1a2d4a' }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0d0d14', borderColor: '#1a2d4a', fontSize: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ fill: '#ffffff0a' }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                    iconType="rect" 
                  />
                  <Bar dataKey="from" name={`${diffData.fromCommit.substring(0,7)} health`} fill="#00f5ff" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="to" name={`${diffData.toCommit.substring(0,7)} health`} fill="#ff2a7a" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* STRUCTURAL GRAPH */}
          <div className="glass-card border border-gray-800 overflow-hidden relative" style={{ height: '600px' }}>
            <KnowledgeGraphDiff 
              fromGraph={diffData.fromGraph} 
              toGraph={diffData.toGraph} 
              onClose={() => {}} // No-op since it's embedded now
              embedded={true}
            />
          </div>

        </motion.div>
      )}
    </div>
  )
}
