import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../lib/logger';
import { SUPPORTED_EXTENSIONS } from '../types';

export interface GraphNode {
  id: string;
  type: 'file' | 'function' | 'class';
  name: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'contains' | 'imports' | 'calls';
}

export interface CodeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Simulates tree-sitter parsing for hackathon MVP (fallback due to node-gyp native binding errors)
export async function buildCommitGraph(repoDir: string): Promise<CodeGraph> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        const ext = path.extname(entry.name);
        if (SUPPORTED_EXTENSIONS.has(ext)) {
          const relPath = path.relative(repoDir, fullPath);
          nodes.push({ id: relPath, type: 'file', name: entry.name });
          
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            
            // Extract imports
            const importRegex = /import\s+.*from\s+['"](.*)['"]/g;
            let match;
            while ((match = importRegex.exec(content)) !== null) {
              const target = match[1];
              // Avoid adding external dependencies to internal graph
              if (target.startsWith('.') || target.startsWith('/')) {
                edges.push({ source: relPath, target: target, type: 'imports' });
              }
            }
            
            // Extract functions
            const funcRegex = /function\s+(\w+)\s*\(/g;
            while ((match = funcRegex.exec(content)) !== null) {
              const funcName = match[1];
              const funcId = `${relPath}::${funcName}`;
              nodes.push({ id: funcId, type: 'function', name: funcName });
              edges.push({ source: relPath, target: funcId, type: 'contains' });
            }
          } catch (err) {
             // Ignore read errors
          }
        }
      }
    }
  }
  
  await walk(repoDir);
  return { nodes, edges };
}
