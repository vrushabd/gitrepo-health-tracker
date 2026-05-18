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

export async function buildCommitGraph(repoDir: string): Promise<CodeGraph> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.has(ext)) {
          const relPath = path.relative(repoDir, fullPath);
          nodes.push({ id: relPath, type: 'file', name: entry.name });
          
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            let match;

            // 1. JAVA PARSING
            if (ext === '.java') {
              const javaImport = /import\s+([\w\.]+);/g;
              while ((match = javaImport.exec(content))) {
                edges.push({ source: relPath, target: match[1], type: 'imports' });
              }
              const javaClass = /(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+)?class\s+(\w+)/g;
              while ((match = javaClass.exec(content))) {
                const id = `${relPath}::${match[1]}`;
                nodes.push({ id, type: 'class', name: match[1] });
                edges.push({ source: relPath, target: id, type: 'contains' });
              }
              const javaMethod = /(?:public|private|protected)\s+(?:static\s+)?(?:final\s+)?[\w<>\[\]]+\s+(\w+)\s*\(/g;
              while ((match = javaMethod.exec(content))) {
                const id = `${relPath}::${match[1]}`;
                nodes.push({ id, type: 'function', name: match[1] });
                edges.push({ source: relPath, target: id, type: 'contains' });
              }
            }

            // 2. PYTHON PARSING
            else if (ext === '.py') {
              const pyImport = /^(?:from\s+(\w+)\s+)?import\s+([\w,\s]+)/gm;
              while ((match = pyImport.exec(content))) {
                const target = match[1] || match[2].split(',')[0].trim();
                edges.push({ source: relPath, target, type: 'imports' });
              }
              const pyClass = /^class\s+(\w+)(?:\([^)]*\))?:/gm;
              while ((match = pyClass.exec(content))) {
                const id = `${relPath}::${match[1]}`;
                nodes.push({ id, type: 'class', name: match[1] });
                edges.push({ source: relPath, target: id, type: 'contains' });
              }
              const pyDef = /^def\s+(\w+)\s*\(/gm;
              while ((match = pyDef.exec(content))) {
                const id = `${relPath}::${match[1]}`;
                nodes.push({ id, type: 'function', name: match[1] });
                edges.push({ source: relPath, target: id, type: 'contains' });
              }
            }

            // 3. JS/TS PARSING
            else if (ext === '.js' || ext === '.ts' || ext === '.jsx' || ext === '.tsx') {
              const jsImport = /import\s+.*?from\s+['"](.*?)['"]/g;
              while ((match = jsImport.exec(content))) {
                edges.push({ source: relPath, target: match[1], type: 'imports' });
              }
              const jsClass = /class\s+(\w+)/g;
              while ((match = jsClass.exec(content))) {
                const id = `${relPath}::${match[1]}`;
                nodes.push({ id, type: 'class', name: match[1] });
                edges.push({ source: relPath, target: id, type: 'contains' });
              }
              const jsFunc = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[^=]+)\s*=>)/g;
              while ((match = jsFunc.exec(content))) {
                const name = match[1] || match[2];
                if (!name) continue;
                const id = `${relPath}::${name}`;
                nodes.push({ id, type: 'function', name });
                edges.push({ source: relPath, target: id, type: 'contains' });
              }
            }
            
            // 4. GO PARSING
            else if (ext === '.go') {
              const goImport = /import\s+(?:\(\s*([^)]+)\s*\)|"([^"]+)")/g;
              while ((match = goImport.exec(content))) {
                const imports = match[1] ? match[1].match(/"([^"]+)"/g) : [match[2]];
                if (imports) {
                  imports.forEach(imp => edges.push({ source: relPath, target: imp.replace(/"/g, ''), type: 'imports' }));
                }
              }
              const goFunc = /func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(/g;
              while ((match = goFunc.exec(content))) {
                const id = `${relPath}::${match[1]}`;
                nodes.push({ id, type: 'function', name: match[1] });
                edges.push({ source: relPath, target: id, type: 'contains' });
              }
            }

          } catch (err) {
             // Ignore read errors
          }
        }
      }
    }
  }
  
  try {
    await walk(repoDir);
  } catch (err) {
    logger.warn('Failed to build graph:', err);
  }
  
  return { nodes, edges };
}
