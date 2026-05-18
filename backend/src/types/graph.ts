/** Structural graph types for Repo Ingestion Engine (Feature 1) */

export type GraphNodeType =
  | 'repository'
  | 'module'
  | 'file'
  | 'class'
  | 'function'
  | 'interface';

export type GraphEdgeType =
  | 'CONTAINS'
  | 'IMPORTS'
  | 'CALLS'
  | 'REFERENCES'
  | 'DEPENDS_ON';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  name: string;
  /** Relative file path when applicable */
  filePath?: string;
  /** Module directory path */
  modulePath?: string;
  startLine?: number;
  endLine?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: GraphEdgeType;
}

export interface StructuralGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metrics: GraphMetrics;
}

export interface GraphMetrics {
  fileCount: number;
  classCount: number;
  functionCount: number;
  interfaceCount: number;
  importCount: number;
  callCount: number;
  dependencyCount: number;
}

export interface FileParseResult {
  filePath: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metrics: {
    classes: number;
    functions: number;
    interfaces: number;
    imports: number;
    calls: number;
  };
}

export const JS_TS_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);

export function isJsTsFile(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  return JS_TS_EXTENSIONS.has(ext);
}

export function repoNodeId(repoName: string): string {
  return `repo:${repoName}`;
}

export function moduleNodeId(modulePath: string): string {
  return `module:${modulePath}`;
}

export function fileNodeId(filePath: string): string {
  return `file:${filePath}`;
}

export function classNodeId(filePath: string, name: string): string {
  return `class:${filePath}::${name}`;
}

export function functionNodeId(filePath: string, name: string): string {
  return `fn:${filePath}::${name}`;
}

export function interfaceNodeId(filePath: string, name: string): string {
  return `interface:${filePath}::${name}`;
}

export function getModulePath(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  if (parts.length <= 1) return '.';
  return parts.slice(0, -1).join('/') || '.';
}
