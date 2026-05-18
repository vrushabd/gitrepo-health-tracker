'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import PremiumLogo from './PremiumLogo';
import { GitMerge } from 'lucide-react';

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
  fromGraph: { nodes: GraphNode[]; edges: GraphEdge[] };
  toGraph: { nodes: GraphNode[]; edges: GraphEdge[] };
  onClose: () => void;
  embedded?: boolean;
}

const NODE_COLORS: Record<string, string> = {
  added: '#10b981',
  removed: '#ef4444',
  retained: '#3b82f6',
};

const LINK_COLORS: Record<string, string> = {
  added: 'rgba(16,185,129,0.8)',
  removed: 'rgba(239,68,68,0.8)',
  retained: 'rgba(59,130,246,0.3)',
};

export default function KnowledgeGraphDiff({ fromGraph, toGraph, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const [stats, setStats] = useState({ added: 0, removed: 0, retained: 0 });

  const graphData = useMemo(() => {
    const nodes = new Map<string, GraphNode & { x?: number; y?: number; vx?: number; vy?: number }>();
    const edges: Array<GraphEdge & { status: 'added' | 'removed' | 'retained' }> = [];

    fromGraph.nodes.forEach(n => nodes.set(n.id, { ...n, status: 'removed' }));
    toGraph.nodes.forEach(n => {
      if (nodes.has(n.id)) {
        nodes.set(n.id, { ...nodes.get(n.id)!, status: 'retained' });
      } else {
        nodes.set(n.id, { ...n, status: 'added' });
      }
    });

    const edgeKeys = new Set<string>();
    fromGraph.edges.forEach(e => {
      const k = `${e.source}->${e.target}`;
      edgeKeys.add(k);
      edges.push({ ...e, status: 'removed' });
    });
    toGraph.edges.forEach(e => {
      const k = `${e.source}->${e.target}`;
      if (edgeKeys.has(k)) {
        const idx = edges.findIndex(ex => `${ex.source}->${ex.target}` === k);
        if (idx >= 0) edges[idx].status = 'retained';
      } else {
        edges.push({ ...e, status: 'added' });
      }
    });

    const nodeArr = Array.from(nodes.values());
    const countAdded = nodeArr.filter(n => n.status === 'added').length;
    const countRemoved = nodeArr.filter(n => n.status === 'removed').length;
    const countRetained = nodeArr.filter(n => n.status === 'retained').length;
    setStats({ added: countAdded, removed: countRemoved, retained: countRetained });

    return { nodes: nodeArr, edges };
  }, [fromGraph, toGraph]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Initialize node positions
    const nodes = graphData.nodes.map((n, i) => ({
      ...n,
      x: W / 2 + (Math.random() - 0.5) * W * 0.8,
      y: H / 2 + (Math.random() - 0.5) * H * 0.8,
      vx: 0,
      vy: 0,
    }));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    let alpha = 1;

    function tick() {
      // Simple force simulation
      alpha *= 0.97;
      const k = alpha * 0.1;

      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (60 * 60) / (d * d) * k;
          nodes[i].vx -= (dx / d) * force;
          nodes[i].vy -= (dy / d) * force;
          nodes[j].vx += (dx / d) * force;
          nodes[j].vy += (dy / d) * force;
        }
      }

      // Attraction along edges
      graphData.edges.forEach(e => {
        const src = nodeMap.get(e.source as string);
        const tgt = nodeMap.get(e.target as string);
        if (!src || !tgt) return;
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (d - 80) * 0.05 * k;
        src.vx += (dx / d) * force;
        src.vy += (dy / d) * force;
        tgt.vx -= (dx / d) * force;
        tgt.vy -= (dy / d) * force;
      });

      // Center gravity
      nodes.forEach(n => {
        n.vx += (W / 2 - n.x) * 0.01 * k;
        n.vy += (H / 2 - n.y) * 0.01 * k;
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(20, Math.min(W - 20, n.x));
        n.y = Math.max(20, Math.min(H - 20, n.y));
      });

      // Draw
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, W, H);

      // Draw edges
      graphData.edges.forEach(e => {
        const src = nodeMap.get(e.source as string);
        const tgt = nodeMap.get(e.target as string);
        if (!src || !tgt) return;
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = LINK_COLORS[e.status];
        ctx.lineWidth = e.status === 'retained' ? 1 : 1.5;
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(tgt.y - src.y, tgt.x - src.x);
        const len = Math.sqrt((tgt.x - src.x) ** 2 + (tgt.y - src.y) ** 2);
        if (len > 20) {
          const ax = tgt.x - 12 * Math.cos(angle);
          const ay = tgt.y - 12 * Math.sin(angle);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax - 6 * Math.cos(angle - 0.5), ay - 6 * Math.sin(angle - 0.5));
          ctx.lineTo(ax - 6 * Math.cos(angle + 0.5), ay - 6 * Math.sin(angle + 0.5));
          ctx.closePath();
          ctx.fillStyle = LINK_COLORS[e.status];
          ctx.fill();
        }
      });

      // Draw nodes
      nodes.forEach(n => {
        const r = n.type === 'file' ? 7 : 4;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = NODE_COLORS[n.status || 'retained'];
        ctx.shadowColor = NODE_COLORS[n.status || 'retained'];
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (n.type === 'file') {
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.font = '9px monospace';
          ctx.fillText(n.name.length > 20 ? n.name.slice(0, 18) + '…' : n.name, n.x + 9, n.y + 3);
        }
      });

      animFrameRef.current = requestAnimationFrame(tick);
    }

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [graphData]);

  const content = (
    <div className={`w-full h-full flex flex-col ${!embedded ? 'max-w-6xl max-h-[90vh] bg-[#0a0a0f] border border-gray-800 rounded-xl overflow-hidden' : ''}`}>
      {!embedded && (
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#0d0d14] flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <PremiumLogo query="network compare split" fallbackIcon={<GitMerge size={20} />} size={20} />
              Commit Compare
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">Structural architecture comparison between commits</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span> {stats.added} Added</span>
            <span className="flex items-center gap-1.5 text-red-400"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"></span> {stats.removed} Removed</span>
            <span className="flex items-center gap-1.5 text-blue-400"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block"></span> {stats.retained} Retained</span>
            <button onClick={onClose} className="ml-4 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300">Close</button>
          </div>
        </div>
      )}
      {embedded && (
        <div className="absolute top-4 right-4 z-10 bg-black/60 backdrop-blur-sm p-3 rounded-lg border border-gray-800 flex items-center gap-4 text-xs shadow-lg">
          <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> {stats.added} Added</span>
          <span className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span> {stats.removed} Removed</span>
          <span className="flex items-center gap-1.5 text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span> {stats.retained} Retained</span>
        </div>
      )}
      <div ref={containerRef} className={`flex-1 relative ${embedded ? 'bg-[#050508]' : ''}`}>
        <canvas ref={canvasRef} className="w-full h-full" />
        {graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
            No graph data available for this commit range.
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      {content}
    </div>
  );
}
