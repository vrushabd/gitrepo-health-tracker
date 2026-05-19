import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import {
  cloneRepository,
  getCommitHistory,
  getCommitFileChanges,
  analyzeCommitDiff,
} from './gitAnalyzer';
import { IncrementalGraphEngine } from './incrementalGraphEngine';
import { StructuralGraph } from '../types/graph';
import { getRepoMetrics } from './repoMetrics';
import {
  computeHealthScore,
  computeHotspotScore,
  calculateBusFactor,
} from './healthScorer';

const BATCH_SIZE = 20;

export interface IngestionResult {
  repositoryId: string;
  jobId: string;
  totalCommits: number;
  processedCommits: number;
}

/**
 * Repo Ingestion Engine — deterministic structural intelligence pipeline.
 * No embeddings, no LLM calls during ingestion.
 */
export async function runIngestion(
  jobId: string,
  repositoryId: string,
  repoUrl: string
): Promise<void> {
  const repo = await prisma.repository.findUnique({ where: { id: repositoryId } });
  const repoName = repo ? `${repo.owner}/${repo.name}` : repositoryId;

  try {
    const repoDir = await cloneRepository(repoUrl, repositoryId);

    await prisma.analysisJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    const commits = await getCommitHistory(repoDir);
    const totalCommits = commits.length;
    const orderedCommits = [...commits].reverse();

    await prisma.analysisJob.update({
      where: { id: jobId },
      data: { totalCommits },
    });

    logger.info(`[Ingestion] ${totalCommits} commits for ${repoName}`);

    // Restore incremental graph from latest stored snapshot if resuming
    let graphEngine = await hydrateGraphEngine(repositoryId, repoName, repoDir);

    const churnMap = new Map<string, number>();
    const fileOwnership = new Map<string, string[]>();
    const contributorMap = new Map<
      string,
      {
        commitCount: number;
        linesAdded: number;
        linesRemoved: number;
        filesModified: Set<string>;
      }
    >();
    const fileComplexityMap = new Map<string, number>();

    let prevComplexity = 0;
    let prevTestRatio = 0;
    let prevDepCount = 0;
    let processedCount = 0;
    let isFirstProcessedCommit = graphEngine === null;

    if (!graphEngine) {
      graphEngine = new IncrementalGraphEngine(repoName, repoDir);
    }

    const commitBatch: Record<string, unknown>[] = [];
    const fileMetricBatch: Record<string, unknown>[] = [];
    const snapshotBatch: Record<string, unknown>[] = [];

    const simpleGit = (await import('simple-git')).default;
    const git = simpleGit(repoDir);

    for (const commit of orderedCommits) {
      try {
        const existing = await prisma.commit.findUnique({
          where: { repositoryId_hash: { repositoryId, hash: commit.hash } },
          select: { id: true, graphData: true },
        });

        if (existing) {
          processedCount++;
          continue;
        }

        const { filesChanged, insertions, deletions, fileMetrics } =
          await analyzeCommitDiff(repoDir, commit.hash);

        const { added, modified, deleted } = await getCommitFileChanges(
          repoDir,
          commit.hash
        );

        for (const fp of filesChanged) {
          churnMap.set(fp, (churnMap.get(fp) || 0) + 1);
        }

        for (const fp of filesChanged) {
          const owners = fileOwnership.get(fp) || [];
          const emailSafe = commit.authorEmail || 'unknown@example.com';
          if (!owners.includes(emailSafe)) owners.push(emailSafe);
          fileOwnership.set(fp, owners);
        }

        const emailSafe = commit.authorEmail || 'unknown@example.com';
        const contrib = contributorMap.get(emailSafe) || {
          commitCount: 0,
          linesAdded: 0,
          linesRemoved: 0,
          filesModified: new Set<string>(),
        };
        contrib.commitCount++;
        contrib.linesAdded += insertions;
        contrib.linesRemoved += deletions;
        filesChanged.forEach(f => contrib.filesModified.add(f));
        contributorMap.set(emailSafe, contrib);

        await git.checkout(commit.hash);

        if (isFirstProcessedCommit) {
          await graphEngine.bootstrapFromRepo();
          isFirstProcessedCommit = false;
        } else {
          const changed = [...new Set([...added, ...modified])];
          await graphEngine.applyCommitDelta(changed, deleted);
        }

        const graph = graphEngine.snapshot();
        const graphData = JSON.stringify({
          nodes: graph.nodes,
          edges: graph.edges,
          metrics: graph.metrics,
        });

        const repoStats = await getRepoMetrics(repoDir);
        const newDepCount = repoStats.depCount;

        const { scores, complexityDelta, testDelta, depDelta, churnDelta } =
          computeHealthScore({
            fileMetrics,
            prevComplexity,
            prevTestRatio,
            prevDepCount,
            churnMap,
            depCount: newDepCount,
          });

        prevComplexity = Math.max(0, prevComplexity + complexityDelta);
        prevTestRatio = Math.max(0, Math.min(100, prevTestRatio + testDelta));
        prevDepCount = newDepCount;

        const m = graph.metrics;

        commitBatch.push({
          repositoryId,
          hash: commit.hash,
          message: commit.message.slice(0, 500),
          author: commit.author || '',
          authorEmail: commit.authorEmail || '',
          committedAt: new Date(commit.date),
          filesChanged: filesChanged.length,
          insertions,
          deletions,
          healthScore: scores.overall,
          complexityDelta,
          testDelta,
          depDelta,
          churnDelta,
          graphData,
          functionCount: m.functionCount,
          classCount: m.classCount,
          interfaceCount: m.interfaceCount,
          importCount: m.importCount,
          dependencyCount: m.dependencyCount,
        });

        for (const fm of fileMetrics) {
          fileComplexityMap.set(fm.filePath, fm.complexity);
        }

        let totalHotspots = 0;
        for (const [fp, comp] of fileComplexityMap.entries()) {
          if (computeHotspotScore(comp, churnMap.get(fp) || 0) > 5) {
            totalHotspots++;
          }
        }

        snapshotBatch.push({
          repositoryId,
          commitHash: commit.hash,
          overallScore: scores.overall,
          complexityScore: scores.complexity,
          testScore: scores.testHealth,
          churnScore: scores.churn,
          depScore: scores.dependency,
          hotspotCount: totalHotspots,
          totalFiles: repoStats.totalFiles,
          testFiles: repoStats.testFiles,
          codeFiles: repoStats.codeFiles,
          depCount: newDepCount,
          snapshotAt: new Date(commit.date),
        });

        for (const fm of fileMetrics) {
          const churnCount = churnMap.get(fm.filePath) || 1;
          fileMetricBatch.push({
            repositoryId,
            filePath: fm.filePath,
            language: fm.language,
            complexity: fm.complexity,
            churnCount,
            hotspotScore: computeHotspotScore(fm.complexity, churnCount),
            isTest: fm.isTest,
            linesAdded: fm.linesAdded,
            linesRemoved: fm.linesRemoved,
            lastModifiedAt: new Date(commit.date),
          });
        }

        processedCount++;

        if (commitBatch.length >= BATCH_SIZE) {
          await flushBatches(commitBatch, snapshotBatch, fileMetricBatch);
          commitBatch.length = 0;
          snapshotBatch.length = 0;
          fileMetricBatch.length = 0;
        }

        const progress = Math.round((processedCount / totalCommits) * 100);
        if (processedCount % 10 === 0) {
          await prisma.analysisJob.update({
            where: { id: jobId },
            data: { progress },
          });
        }
      } catch (err) {
        logger.warn(`[Ingestion] commit ${commit.hash} failed:`, err);
      }
    }

    if (commitBatch.length > 0) {
      await flushBatches(commitBatch, snapshotBatch, fileMetricBatch);
    }

    for (const [email, stats] of contributorMap) {
      const commit = orderedCommits.find(
        c => (c.authorEmail || 'unknown@example.com') === email
      );
      if (!commit) continue;

      const ownedFiles = [...fileOwnership.entries()]
        .filter(([, owners]) => owners[owners.length - 1] === email)
        .map(([fp]) => fp);

      const criticalFiles = ownedFiles
        .filter(fp => (churnMap.get(fp) || 0) > 3)
        .slice(0, 10);

      await prisma.contributorStat.upsert({
        where: { repositoryId_authorEmail: { repositoryId, authorEmail: email } },
        update: {
          commitCount: stats.commitCount,
          linesAdded: stats.linesAdded,
          linesRemoved: stats.linesRemoved,
          filesOwned: ownedFiles.length,
          criticalModules: JSON.stringify(criticalFiles),
          busFactor: calculateBusFactor(fileOwnership, fileOwnership.size),
        },
        create: {
          repositoryId,
          author: commit.author || 'Unknown',
          authorEmail: email,
          commitCount: stats.commitCount,
          linesAdded: stats.linesAdded,
          linesRemoved: stats.linesRemoved,
          filesOwned: ownedFiles.length,
          criticalModules: JSON.stringify(criticalFiles),
          busFactor: calculateBusFactor(fileOwnership, fileOwnership.size),
        },
      });
    }

    await prisma.analysisJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', progress: 100, completedAt: new Date() },
    });

    logger.info(`[Ingestion] complete for ${repositoryId}`);
  } catch (err) {
    logger.error(`[Ingestion] failed job ${jobId}:`, err);
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Unknown error',
      },
    });
  }
}

async function hydrateGraphEngine(
  repositoryId: string,
  repoName: string,
  repoDir: string
): Promise<IncrementalGraphEngine | null> {
  const latest = await prisma.commit.findFirst({
    where: { repositoryId, graphData: { not: null } },
    orderBy: { committedAt: 'desc' },
    select: { graphData: true },
  });

  if (!latest?.graphData) return null;

  try {
    const parsed = JSON.parse(latest.graphData) as StructuralGraph & {
      metrics?: StructuralGraph['metrics'];
    };
    const graph: StructuralGraph = {
      nodes: parsed.nodes || [],
      edges: parsed.edges || [],
      metrics: parsed.metrics || {
        fileCount: 0,
        classCount: 0,
        functionCount: 0,
        interfaceCount: 0,
        importCount: 0,
        callCount: 0,
        dependencyCount: 0,
      },
    };
    return IncrementalGraphEngine.fromSnapshot(repoName, repoDir, graph);
  } catch {
    return null;
  }
}

async function flushBatches(
  commits: Record<string, unknown>[],
  snapshots: Record<string, unknown>[],
  fileMetrics: Record<string, unknown>[]
) {
  await Promise.allSettled(
    (commits as Record<string, unknown>[]).map(c =>
      prisma.commit.upsert({
        where: {
          repositoryId_hash: {
            repositoryId: c.repositoryId as string,
            hash: c.hash as string,
          },
        },
        update: c as Parameters<typeof prisma.commit.update>[0]['data'],
        create: c as Parameters<typeof prisma.commit.create>[0]['data'],
      })
    )
  );

  await Promise.allSettled(
    (snapshots as Record<string, unknown>[]).map(s =>
      prisma.healthSnapshot.upsert({
        where: {
          repositoryId_commitHash: {
            repositoryId: s.repositoryId as string,
            commitHash: s.commitHash as string,
          },
        },
        update: {},
        create: s as Parameters<typeof prisma.healthSnapshot.create>[0]['data'],
      })
    )
  );

  await Promise.allSettled(
    (fileMetrics as Record<string, unknown>[]).map(fm =>
      prisma.fileMetric.create({ data: fm as Parameters<typeof prisma.fileMetric.create>[0]['data'] }).catch(() => null)
    )
  );
}
