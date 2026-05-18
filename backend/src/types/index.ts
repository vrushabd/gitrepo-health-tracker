export interface CommitAnalysis {
  hash: string;
  message: string;
  author: string;
  authorEmail: string;
  committedAt: Date;
  filesChanged: string[];
  insertions: number;
  deletions: number;
  fileMetrics: FileMetricInput[];
  healthScore: number;
  complexityDelta: number;
  testDelta: number;
  depDelta: number;
  churnDelta: number;
}

export interface FileMetricInput {
  filePath: string;
  language: string;
  complexity: number;
  linesAdded: number;
  linesRemoved: number;
  isTest: boolean;
}

export interface HealthScoreBreakdown {
  overall: number;
  complexity: number;
  testHealth: number;
  churn: number;
  dependency: number;
}

export interface HotspotFile {
  filePath: string;
  hotspotScore: number;
  churnCount: number;
  complexity: number;
  language: string;
}

export interface ContributorInfo {
  author: string;
  authorEmail: string;
  commitCount: number;
  linesAdded: number;
  linesRemoved: number;
  filesOwned: number;
  busFactor: number;
  criticalModules: string[];
}

export interface TimelinePoint {
  date: string;
  commitHash: string;
  overallScore: number;
  complexityScore: number;
  testScore: number;
  churnScore: number;
  depScore: number;
}

export interface DiffComparison {
  fromCommit: string;
  toCommit: string;
  filesAdded: string[];
  filesRemoved: string[];
  filesModified: string[];
  complexityDelta: number;
  testDelta: number;
  depDelta: number;
  healthDelta: number;
  riskChanges: string[];
}

export const SUPPORTED_EXTENSIONS = new Set([
  '.js', '.ts', '.tsx', '.jsx',
  '.java', '.py', '.go', '.rb',
  '.cs', '.cpp', '.c', '.h',
  '.php', '.swift', '.kt',
]);

export const IGNORED_PATTERNS = [
  'node_modules', 'dist', 'build', '.next',
  'coverage', 'vendor', '__pycache__',
  '.png', '.jpg', '.svg', '.gif', '.ico',
  '.lock', '-lock.json', '.min.js', '.min.css',
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
];

export const COMPLEXITY_KEYWORDS = [
  'if', 'else', 'switch', 'case', 'for', 'while',
  'catch', 'catch\\s*\\(', '\\?\\s*:', '&&', '\\|\\|',
];

export const TEST_PATTERNS = ['test', 'spec', '__tests__', '.test.', '.spec.'];
