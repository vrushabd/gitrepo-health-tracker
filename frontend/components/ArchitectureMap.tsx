'use client';

import { useEffect, useRef, useState, useMemo } from 'react';

interface GraphNode {
  id: string;
  type: string;
  name: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

interface Props {
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  onClose: () => void;
}

const NODE_COLORS: Record<string, string> = {
  file: '#10b981', // Green
  class: '#3b82f6', // Blue
  function: '#a855f7', // Purple
};

export default function ArchitectureMap({ graph, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const [stats, setStats] = useState({ files: 0, classes: 0, functions: 0, edges: 0 });

  const graphData = useMemo(() => {
    const nodes = graph.nodes.map(n => ({ ...n }));
    const edges = graph.edges.map(e => ({ ...e }));

    setStats({
      files: nodes.filter(n => n.type === 'file').length,
      classes: nodes.filter(n => n.type === 'class').length,
      functions: nodes.filter(n => n.type === 'function').length,
      edges: edges.length,
    });

    return { nodes, edges };
  }, [graph]);

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
    const nodes = graphData.nodes.map(n => ({
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
        const src = nodeMap.get(e.source);
        const tgt = nodeMap.get(e.target);
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
        const src = nodeMap.get(e.source);
        const tgt = nodeMap.get(e.target);
        if (!src || !tgt) return;
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
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
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fill();
        }
      });

      // Draw nodes
      nodes.forEach(n => {
        const r = n.type === 'file' ? 7 : 4;
        const color = NODE_COLORS[n.type] || '#fff';
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (n.type === 'file' || n.type === 'class') {
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.font = '9px monospace';
          ctx.fillText(n.name.length > 20 ? n.name.slice(0, 18) + '…' : n.name, n.x + 9, n.y + 3);
        }
      });

      animFrameRef.current = requestAnimationFrame(tick);
    }

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [graphData]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="w-full h-full max-w-6xl max-h-[90vh] bg-[#0a0a0f] border border-gray-800 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#0d0d14] flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">🧩 Repository Architecture Map</h2>
            <p className="text-gray-500 text-xs mt-0.5">Complete code graph for this commit</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> {stats.files} Files</span>
            <span className="flex items-center gap-1.5 text-blue-400"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> {stats.classes} Classes</span>
            <span className="flex items-center gap-1.5 text-purple-400"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span> {stats.functions} Functions</span>
            <span className="text-gray-400">{stats.edges} Edges</span>
            <button onClick={onClose} className="ml-4 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300">Close</button>
          </div>
        </div>
        <div ref={containerRef} className="flex-1 relative">
          <canvas ref={canvasRef} className="w-full h-full" />
          {graphData.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
              No graph data available for this commit.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
