'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface GraphNode {
  id: string;
  type: string;
  name: string;
  status?: 'added' | 'removed' | 'retained';
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  status?: 'added' | 'removed' | 'retained';
}

interface Props {
  fromGraph: { nodes: GraphNode[], edges: GraphEdge[] };
  toGraph: { nodes: GraphNode[], edges: GraphEdge[] };
  onClose: () => void;
}

export default function KnowledgeGraphDiff({ fromGraph, toGraph, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  const graphData = useMemo(() => {
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, GraphEdge>();

    // Process FROM graph (assume removed unless found in TO)
    fromGraph.nodes.forEach(n => {
      nodes.set(n.id, { ...n, status: 'removed' });
    });
    fromGraph.edges.forEach(e => {
      edges.set(`${e.source}->${e.target}`, { ...e, status: 'removed' });
    });

    // Process TO graph (added if not in FROM, retained if in FROM)
    toGraph.nodes.forEach(n => {
      if (nodes.has(n.id)) {
        nodes.set(n.id, { ...n, status: 'retained' });
      } else {
        nodes.set(n.id, { ...n, status: 'added' });
      }
    });

    toGraph.edges.forEach(e => {
      const edgeId = `${e.source}->${e.target}`;
      if (edges.has(edgeId)) {
        edges.set(edgeId, { ...e, status: 'retained' });
      } else {
        edges.set(edgeId, { ...e, status: 'added' });
      }
    });

    return {
      nodes: Array.from(nodes.values()),
      links: Array.from(edges.values())
    };
  }, [fromGraph, toGraph]);

  const getNodeColor = (node: GraphNode) => {
    if (node.status === 'added') return '#10b981'; // Green
    if (node.status === 'removed') return '#ef4444'; // Red
    return '#3b82f6'; // Blue
  };

  const getLinkColor = (link: GraphEdge) => {
    if (link.status === 'added') return 'rgba(16, 185, 129, 0.6)';
    if (link.status === 'removed') return 'rgba(239, 68, 68, 0.6)';
    return 'rgba(59, 130, 246, 0.2)';
  };

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full h-full max-w-6xl max-h-[90vh] bg-[#0a0a0f] border border-gray-800 rounded-xl overflow-hidden relative flex flex-col"
      >
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#111]">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              🧠 Knowledge Graph Diff
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Visualizing architectural changes between commits
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#10b981]"></span> Added</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#ef4444]"></span> Removed</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#3b82f6]"></span> Retained</div>
            <button onClick={onClose} className="ml-4 text-gray-500 hover:text-white px-3 py-1 bg-gray-800 rounded">Close</button>
          </div>
        </div>

        <div className="flex-1 relative cursor-move">
          <ForceGraph2D
            graphData={graphData}
            nodeColor={getNodeColor}
            linkColor={getLinkColor}
            nodeLabel="name"
            nodeRelSize={6}
            linkWidth={link => link.status === 'retained' ? 1 : 2}
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
            backgroundColor="#0a0a0f"
          />
        </div>
      </motion.div>
    </div>
  );
}
