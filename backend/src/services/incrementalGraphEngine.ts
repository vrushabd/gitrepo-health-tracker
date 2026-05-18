import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../lib/logger';
import {
  GraphEdge,
  GraphMetrics,
  GraphNode,
  StructuralGraph,
  getModulePath,
  moduleNodeId,
  repoNodeId,
  fileNodeId,
} from '../types/graph';
import { parseFileWithTreeSitter } from './treeSitterParser';
import { isJsTsFile } from '../types/graph';

/**
 * Incremental structural graph — patches only changed file regions per commit.
 * Compiler / language-server style; no full-repo re-indexing.
 */
export class IncrementalGraphEngine {
  private readonly nodes = new Map<string, GraphNode>();
  private readonly edges: GraphEdge[] = [];
  private readonly edgeKeys = new Set<string>();
  private readonly fileIndex = new Map<string, Set<string>>();

  constructor(
    private readonly repoName: string,
    private readonly repoDir: string
  ) {
    const repoId = repoNodeId(repoName);
    this.nodes.set(repoId, { id: repoId, type: 'repository', name: repoName });
  }

  static fromSnapshot(
    repoName: string,
    repoDir: string,
    graph: StructuralGraph
  ): IncrementalGraphEngine {
    const engine = new IncrementalGraphEngine(repoName, repoDir);
    for (const node of graph.nodes) {
      engine.nodes.set(node.id, node);
      if (node.type === 'file' && node.filePath) {
        const set = engine.fileIndex.get(node.filePath) || new Set();
        set.add(node.id);
        engine.fileIndex.set(node.filePath, set);
      }
      if (node.type !== 'file' && node.filePath) {
        const set = engine.fileIndex.get(node.filePath) || new Set();
        set.add(node.id);
        engine.fileIndex.set(node.filePath, set);
      }
    }
    for (const edge of graph.edges) {
      engine.addEdge(edge);
    }
    return engine;
  }

  private addEdge(edge: GraphEdge): void {
    const key = `${edge.source}|${edge.type}|${edge.target}`;
    if (this.edgeKeys.has(key)) return;
    this.edgeKeys.add(key);
    this.edges.push(edge);
  }

  private removeEdgesForNode(nodeId: string): void {
    for (let i = this.edges.length - 1; i >= 0; i--) {
      const e = this.edges[i];
      if (e.source === nodeId || e.target === nodeId) {
        this.edgeKeys.delete(`${e.source}|${e.type}|${e.target}`);
        this.edges.splice(i, 1);
      }
    }
  }

  private ensureModule(modulePath: string): void {
    const id = moduleNodeId(modulePath);
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, type: 'module', name: modulePath, modulePath });
      const repoId = repoNodeId(this.repoName);
      this.addEdge({ source: repoId, target: id, type: 'CONTAINS' });
    }
  }

  /** Remove all graph nodes/edges owned by a file path */
  removeFile(relPath: string): void {
    const ids = this.fileIndex.get(relPath);
    if (!ids) return;

    for (const id of ids) {
      this.removeEdgesForNode(id);
      this.nodes.delete(id);
    }
    this.fileIndex.delete(relPath);

    // Also remove file node if tracked separately
    const fid = fileNodeId(relPath);
    if (this.nodes.has(fid)) {
      this.removeEdgesForNode(fid);
      this.nodes.delete(fid);
    }
  }

  /** Parse one file and patch graph (tree-sitter for TS/JS) */
  async ingestFile(relPath: string): Promise<void> {
    if (!isJsTsFile(relPath)) return;

    this.removeFile(relPath);

    const result = await parseFileWithTreeSitter(this.repoDir, relPath);
    if (!result) return;

    const modulePath = getModulePath(relPath);
    this.ensureModule(modulePath);

    const tracked = new Set<string>();
    for (const node of result.nodes) {
      this.nodes.set(node.id, node);
      tracked.add(node.id);
    }
    this.fileIndex.set(relPath, tracked);

    const modId = moduleNodeId(modulePath);
    const fileId = fileNodeId(relPath);
    this.addEdge({ source: modId, target: fileId, type: 'CONTAINS' });
    this.addEdge({ source: repoNodeId(this.repoName), target: fileId, type: 'DEPENDS_ON' });

    for (const edge of result.edges) {
      this.addEdge(edge);
    }
  }

  /**
   * Apply commit delta: reparse modified/added files, strip deleted files.
   */
  async applyCommitDelta(changedFiles: string[], deletedFiles: string[]): Promise<void> {
    for (const f of deletedFiles) {
      this.removeFile(f);
    }

    const toParse = [...new Set(changedFiles.filter(f => isJsTsFile(f)))];
    for (const filePath of toParse) {
      try {
        await this.ingestFile(filePath);
      } catch (err) {
        logger.warn(`Failed to parse ${filePath}:`, err);
      }
    }
  }

  /** Bootstrap graph from repo tree (first commit / cold start) */
  async bootstrapFromRepo(): Promise<void> {
    const files: string[] = [];
    await this.walkRepo(this.repoDir, files);
    for (const f of files) {
      await this.ingestFile(f);
    }
  }

  private async walkRepo(dir: string, out: string[]): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.walkRepo(full, out);
      } else if (isJsTsFile(entry.name)) {
        out.push(path.relative(this.repoDir, full).replace(/\\/g, '/'));
      }
    }
  }

  computeMetrics(): GraphMetrics {
    let fileCount = 0;
    let classCount = 0;
    let functionCount = 0;
    let interfaceCount = 0;
    let importCount = 0;
    let callCount = 0;

    for (const n of this.nodes.values()) {
      if (n.type === 'file') fileCount++;
      if (n.type === 'class') classCount++;
      if (n.type === 'function') functionCount++;
      if (n.type === 'interface') interfaceCount++;
    }
    for (const e of this.edges) {
      if (e.type === 'IMPORTS') importCount++;
      if (e.type === 'CALLS') callCount++;
    }

    const dependencyCount = new Set(
      this.edges.filter(e => e.type === 'IMPORTS' || e.type === 'DEPENDS_ON').map(e => e.target)
    ).size;

    return {
      fileCount,
      classCount,
      functionCount,
      interfaceCount,
      importCount,
      callCount,
      dependencyCount,
    };
  }

  snapshot(): StructuralGraph {
    return {
      nodes: [...this.nodes.values()],
      edges: [...this.edges],
      metrics: this.computeMetrics(),
    };
  }
}
