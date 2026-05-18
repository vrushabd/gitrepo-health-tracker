import * as fs from 'fs/promises';
import * as path from 'path';
import { Parser, Language, Node } from 'web-tree-sitter';
import { logger } from '../lib/logger';
import {
  FileParseResult,
  GraphEdge,
  GraphNode,
  classNodeId,
  fileNodeId,
  functionNodeId,
  interfaceNodeId,
  isJsTsFile,
} from '../types/graph';

let initPromise: Promise<void> | null = null;
const parsers = new Map<string, Parser>();

async function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await Parser.init();

      const grammarDir = path.join(__dirname, '../../node_modules');
      const loads: Array<[string, string]> = [
        ['javascript', path.join(grammarDir, 'tree-sitter-javascript/tree-sitter-javascript.wasm')],
        ['typescript', path.join(grammarDir, 'tree-sitter-typescript/tree-sitter-typescript.wasm')],
        ['tsx', path.join(grammarDir, 'tree-sitter-typescript/tree-sitter-tsx.wasm')],
      ];

      for (const [key, wasmPath] of loads) {
        const lang = await Language.load(wasmPath);
        const parser = new Parser();
        parser.setLanguage(lang);
        parsers.set(key, parser);
      }
      logger.info('tree-sitter parsers initialized (JS/TS/TSX)');
    })().catch(err => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

function grammarKey(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.tsx') return 'tsx';
  if (ext === '.ts') return 'typescript';
  return 'javascript';
}

function walk(node: Node, visit: (n: Node) => void): void {
  visit(node);
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) walk(child, visit);
  }
}

function nodeText(source: string, node: Node): string {
  return source.slice(node.startIndex, node.endIndex);
}

async function resolveImportTarget(
  specifier: string,
  fromFile: string,
  repoDir: string
): Promise<string> {
  const clean = specifier.replace(/['"]/g, '').trim();
  if (!clean.startsWith('.')) {
    return `module:pkg:${clean.split('/')[0]}`;
  }
  const fromDir = path.dirname(fromFile);
  const resolved = path.normalize(path.join(fromDir, clean)).replace(/\\/g, '/');
  const candidates = [
    resolved,
    `${resolved}.ts`,
    `${resolved}.tsx`,
    `${resolved}.js`,
    `${resolved}.jsx`,
    path.join(resolved, 'index.ts'),
    path.join(resolved, 'index.tsx'),
    path.join(resolved, 'index.js'),
  ];
  for (const c of candidates) {
    const rel = c.replace(/^\.\//, '');
    try {
      await fs.access(path.join(repoDir, rel));
      return fileNodeId(rel);
    } catch {
      /* try next */
    }
  }
  return fileNodeId(resolved.replace(/^\.\//, ''));
}

function nearestNamedAncestor(
  node: Node,
  types: Set<string>
): Node | null {
  let cur: Node | null = node.parent;
  while (cur) {
    if (types.has(cur.type)) return cur;
    cur = cur.parent;
  }
  return null;
}

function extractCalleeName(source: string, callNode: Node): string | null {
  const fn = callNode.childForFieldName('function') || callNode.namedChild(0);
  if (!fn) return null;
  if (fn.type === 'identifier') return nodeText(source, fn);
  if (fn.type === 'member_expression') {
    const prop = fn.childForFieldName('property');
    if (prop) return nodeText(source, prop);
  }
  return null;
}

/**
 * Deterministic AST extraction via tree-sitter (no LLM, no embeddings).
 */
export async function parseFileWithTreeSitter(
  repoDir: string,
  relPath: string
): Promise<FileParseResult | null> {
  if (!isJsTsFile(relPath)) return null;

  await ensureInitialized();
  const parser = parsers.get(grammarKey(relPath));
  if (!parser) return null;

  const absPath = path.join(repoDir, relPath);
  let content: string;
  try {
    content = await fs.readFile(absPath, 'utf8');
  } catch {
    return null;
  }

  const tree = parser.parse(content);
  if (!tree) return null;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const fileId = fileNodeId(relPath);

  nodes.push({
    id: fileId,
    type: 'file',
    name: path.basename(relPath),
    filePath: relPath,
  });

  const fnIds = new Map<string, string>();
  const classIds = new Map<string, string>();
  let currentFnId: string | null = null;

  let classes = 0;
  let functions = 0;
  let interfaces = 0;
  let imports = 0;
  let calls = 0;

  const pendingImports: Array<{ spec: string; sourceNode: Node }> = [];

  walk(tree.rootNode, node => {
    const t = node.type;

    if (t === 'import_statement' || t === 'import_declaration') {
      const sourceNode =
        node.childForFieldName('source') ||
        [...Array(node.childCount)].map(i => node.child(i)).find(c => c?.type === 'string');
      if (sourceNode) {
        pendingImports.push({ spec: nodeText(content, sourceNode), sourceNode });
        imports++;
      }
    }

    if (t === 'class_declaration') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const name = nodeText(content, nameNode);
        const id = classNodeId(relPath, name);
        classIds.set(name, id);
        nodes.push({
          id,
          type: 'class',
          name,
          filePath: relPath,
          startLine: nameNode.startPosition.row + 1,
        });
        edges.push({ source: fileId, target: id, type: 'CONTAINS' });
        classes++;
        currentFnId = id;
      }
    }

    if (
      t === 'function_declaration' ||
      t === 'method_definition' ||
      t === 'generator_function_declaration'
    ) {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const name = nodeText(content, nameNode);
        const id = functionNodeId(relPath, name);
        fnIds.set(name, id);
        nodes.push({
          id,
          type: 'function',
          name,
          filePath: relPath,
          startLine: nameNode.startPosition.row + 1,
        });
        const parent =
          nearestNamedAncestor(node, new Set(['class_declaration']))?.childForFieldName('name');
        const container = parent
          ? classNodeId(relPath, nodeText(content, parent))
          : fileId;
        edges.push({ source: container, target: id, type: 'CONTAINS' });
        functions++;
        currentFnId = id;
      }
    }

    if (t === 'interface_declaration') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const name = nodeText(content, nameNode);
        const id = interfaceNodeId(relPath, name);
        nodes.push({
          id,
          type: 'interface',
          name,
          filePath: relPath,
          startLine: nameNode.startPosition.row + 1,
        });
        edges.push({ source: fileId, target: id, type: 'CONTAINS' });
        interfaces++;
      }
    }

    if (t === 'call_expression') {
      const callee = extractCalleeName(content, node);
      if (callee && currentFnId) {
        const target =
          fnIds.get(callee) ||
          classIds.get(callee) ||
          functionNodeId(relPath, callee);
        edges.push({ source: currentFnId, target, type: 'CALLS' });
        calls++;
      }
    }

    if (t === 'type_identifier' && node.parent?.type === 'extends_clause') {
      const name = nodeText(content, node);
      edges.push({
        source: fileId,
        target: interfaceNodeId(relPath, name),
        type: 'REFERENCES',
      });
    }
  });

  for (const imp of pendingImports) {
    const target = await resolveImportTarget(imp.spec, relPath, repoDir);
    edges.push({ source: fileId, target, type: 'IMPORTS' });
    edges.push({ source: fileId, target, type: 'DEPENDS_ON' });
  }

  return {
    filePath: relPath,
    nodes,
    edges,
    metrics: { classes, functions, interfaces, imports, calls },
  };
}
