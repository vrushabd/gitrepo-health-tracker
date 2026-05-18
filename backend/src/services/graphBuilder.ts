/**
 * @deprecated Prefer IncrementalGraphEngine + tree-sitter ingestion pipeline.
 * Kept for on-the-fly graph rebuilds in diff/compare routes.
 */
import { IncrementalGraphEngine } from './incrementalGraphEngine';
import { StructuralGraph } from '../types/graph';

export type { GraphNode, GraphEdge, StructuralGraph } from '../types/graph';
/** @alias StructuralGraph */
export type CodeGraph = StructuralGraph;

export async function buildCommitGraph(
  repoDir: string,
  repoName = 'repository'
): Promise<StructuralGraph> {
  const engine = new IncrementalGraphEngine(repoName, repoDir);
  await engine.bootstrapFromRepo();
  return engine.snapshot();
}
