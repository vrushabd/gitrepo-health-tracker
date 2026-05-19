'use client'

import { useState, useEffect } from 'react'
import { repoApi } from '@/lib/api'
import ArchitectureMap from './ArchitectureMap'

interface Props {
  repoId: string
  commitHash?: string
  onClose: () => void
}

export default function ArchitectureModal({ repoId, commitHash, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [graphData, setGraphData] = useState<any>(null)

  useEffect(() => {
    const fetchGraph = async () => {
      setLoading(true)
      try {
        const data = await repoApi.getGraph(repoId, commitHash)
        setGraphData(data)
      } catch {
        setError('Failed to load architecture graph.')
      } finally {
        setLoading(false)
      }
    }
    fetchGraph()
  }, [repoId, commitHash])

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
          <p className="text-cyan-400 font-bold mb-2">Ingesting Architecture...</p>
          <p className="text-gray-500 text-xs">Walking AST for {commitHash.substring(0, 7)}</p>
        </div>
      </div>
    )
  }

  if (error || !graphData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div className="glass-card p-8 bg-[#111] text-center border border-red-500/30">
          <h3 className="text-red-400 font-bold mb-2">Error</h3>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-800 rounded text-white">Close</button>
        </div>
      </div>
    )
  }

  return <ArchitectureMap graph={graphData} onClose={onClose} />
}
