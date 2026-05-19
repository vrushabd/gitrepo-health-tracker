import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../lib/logger';
import {
  CommitAnalysis,
  FileMetricInput,
  SUPPORTED_EXTENSIONS,
  IGNORED_PATTERNS,
  COMPLEXITY_KEYWORDS,
  TEST_PATTERNS,
} from '../types';

const REPOS_DIR = process.env.REPOS_DIR || '/tmp/repopulse-repos';
const MAX_COMMITS = parseInt(process.env.MAX_COMMITS || '2000', 10);

function shouldIgnoreFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return IGNORED_PATTERNS.some(p => lower.includes(p));
}

function getLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.js': 'JavaScript', '.jsx': 'JavaScript',
    '.ts': 'TypeScript', '.tsx': 'TypeScript',
    '.java': 'Java', '.py': 'Python',
    '.go': 'Go', '.rb': 'Ruby',
    '.cs': 'C#', '.cpp': 'C++',
    '.c': 'C', '.php': 'PHP',
    '.swift': 'Swift', '.kt': 'Kotlin',
  };
  return map[ext] || 'Unknown';
}

function isSupportedFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext) && !shouldIgnoreFile(filePath);
}

function isTestFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return TEST_PATTERNS.some(p => lower.includes(p));
}

function estimateComplexityFromDiff(diffLines: string[]): number {
  let complexity = 0;
  const addedLines = diffLines.filter(l => l.startsWith('+') && !l.startsWith('+++'));

  for (const line of addedLines) {
    for (const kw of COMPLEXITY_KEYWORDS) {
      const regex = new RegExp(`\\b${kw}\\b`, 'g');
      const matches = line.match(regex);
      if (matches) complexity += matches.length;
    }
  }
  return complexity;
}

export async function cloneRepository(repoUrl: string, repoId: string): Promise<string> {
  await fs.mkdir(REPOS_DIR, { recursive: true });
  const repoDir = path.join(REPOS_DIR, repoId);

  try {
    await fs.access(repoDir);
    logger.info(`Repo already cloned at ${repoDir}, pulling latest...`);
    const git = simpleGit(repoDir).env('GIT_TERMINAL_PROMPT', '0');
    try {
      await git.fetch(['--all', '--depth', String(MAX_COMMITS + 50)]);
      return repoDir;
    } catch (fetchErr) {
      logger.warn(`Failed to fetch in existing repo ${repoDir}, cleaning up and recloning...`, fetchErr);
      await fs.rm(repoDir, { recursive: true, force: true });
      throw new Error('Force re-clone');
    }
  } catch {
    logger.info(`Cloning ${repoUrl} to ${repoDir}`);
    const git = simpleGit().env('GIT_TERMINAL_PROMPT', '0');
    await git.clone(repoUrl, repoDir, ['--depth', String(MAX_COMMITS + 50)]);
    return repoDir;
  }
}

export async function getCommitHistory(repoDir: string): Promise<Array<{
  hash: string;
  message: string;
  author: string;
  authorEmail: string;
  date: string;
}>> {
  const git: SimpleGit = simpleGit(repoDir);

  const log = await git.log({
    maxCount: MAX_COMMITS,
    format: {
      hash: '%H',
      message: '%s',
      author: '%an',
      authorEmail: '%ae',
      date: '%aI',
    },
  });

  return log.all.map(c => ({
    hash: c.hash,
    message: c.message,
    author: (c as any).author,
    authorEmail: (c as any).authorEmail,
    date: c.date,
  }));
}

export async function analyzeCommitDiff(
  repoDir: string,
  commitHash: string
): Promise<{
  filesChanged: string[];
  insertions: number;
  deletions: number;
  fileMetrics: FileMetricInput[];
}> {
  const git: SimpleGit = simpleGit(repoDir);

  // Get the diff stat summary
  let diffStat: string;
  try {
    diffStat = await git.raw(['diff', '--numstat', `${commitHash}^`, commitHash]);
  } catch {
    // First commit has no parent
    diffStat = await git.raw(['show', '--numstat', '--format=', commitHash]);
  }

  const fileMetrics: FileMetricInput[] = [];
  let totalInsertions = 0;
  let totalDeletions = 0;
  const filesChanged: string[] = [];

  const statLines = diffStat.trim().split('\n').filter(Boolean);

  for (const line of statLines) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;

    const [ins, del, filePath] = parts;
    if (!filePath || !isSupportedFile(filePath)) continue;

    const insertions = parseInt(ins, 10) || 0;
    const deletions = parseInt(del, 10) || 0;

    totalInsertions += insertions;
    totalDeletions += deletions;
    filesChanged.push(filePath);

    // Get the actual diff for complexity estimation
    let diffContent = '';
    try {
      diffContent = await git.raw([
        'diff', `${commitHash}^`, commitHash, '--', filePath,
      ]);
    } catch {
      try {
        diffContent = await git.raw(['show', commitHash, '--', filePath]);
      } catch {
        diffContent = '';
      }
    }

    const diffLines = diffContent.split('\n');
    const complexity = estimateComplexityFromDiff(diffLines);

    fileMetrics.push({
      filePath,
      language: getLanguage(filePath),
      complexity,
      linesAdded: insertions,
      linesRemoved: deletions,
      isTest: isTestFile(filePath),
    });
  }

  return { filesChanged, insertions: totalInsertions, deletions: totalDeletions, fileMetrics };
}

export async function getRepoInfo(repoDir: string): Promise<{
  description: string;
  primaryLanguage: string;
}> {
  try {
    const git: SimpleGit = simpleGit(repoDir);
    const remotes = await git.getRemotes(true);
    return {
      description: remotes[0]?.refs?.fetch || '',
      primaryLanguage: 'Mixed',
    };
  } catch {
    return { description: '', primaryLanguage: 'Unknown' };
  }
}

/** Per-commit file change classification for incremental graph patching */
export async function getCommitFileChanges(
  repoDir: string,
  commitHash: string
): Promise<{ added: string[]; modified: string[]; deleted: string[] }> {
  const git: SimpleGit = simpleGit(repoDir);
  let nameStatus: string;

  try {
    nameStatus = await git.raw(['diff', '--name-status', `${commitHash}^`, commitHash]);
  } catch {
    nameStatus = await git.raw(['show', '--name-status', '--format=', commitHash]);
  }

  const added: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];

  for (const line of nameStatus.trim().split('\n').filter(Boolean)) {
    const tab = line.indexOf('\t');
    if (tab < 0) continue;
    const status = line.slice(0, tab).trim();
    const filePath = line.slice(tab + 1).trim();
    if (!filePath || !isSupportedFile(filePath)) continue;

    if (status === 'A') added.push(filePath);
    else if (status === 'D') deleted.push(filePath);
    else if (status.startsWith('M') || status.startsWith('R')) modified.push(filePath);
  }

  return { added, modified, deleted };
}

export async function getDiffBetweenCommits(
  repoDir: string,
  fromHash: string,
  toHash: string
): Promise<{
  filesAdded: string[];
  filesRemoved: string[];
  filesModified: string[];
}> {
  const git: SimpleGit = simpleGit(repoDir);

  const nameStatus = await git.raw([
    'diff', '--name-status', fromHash, toHash,
  ]);

  const filesAdded: string[] = [];
  const filesRemoved: string[] = [];
  const filesModified: string[] = [];

  for (const line of nameStatus.trim().split('\n').filter(Boolean)) {
    const [status, filePath] = line.split('\t');
    if (!filePath || !isSupportedFile(filePath)) continue;

    if (status === 'A') filesAdded.push(filePath);
    else if (status === 'D') filesRemoved.push(filePath);
    else if (status?.startsWith('M') || status?.startsWith('R')) filesModified.push(filePath);
  }

  return { filesAdded, filesRemoved, filesModified };
}

export async function cleanupRepo(repoId: string): Promise<void> {
  const repoDir = path.join(REPOS_DIR, repoId);
  try {
    await fs.rm(repoDir, { recursive: true, force: true });
    logger.info(`Cleaned up repo ${repoId}`);
  } catch (err) {
    logger.warn(`Failed to cleanup repo ${repoId}:`, err);
  }
}
