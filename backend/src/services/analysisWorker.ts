import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import {
  cloneRepository,
  getCommitHistory,
  analyzeCommitDiff,
} from './gitAnalyzer';
import {
  computeHealthScore,
  computeHotspotScore,
  extractDependencyCount,
  calculateBusFactor,
} from './healthScorer';

const BATCH_SIZE = 20;

export async function runAnalysis(jobId: string, repositoryId: string, repoUrl: string) {
  try {
    const repoDir = await cloneRepository(repoUrl, repositoryId);

    // Update job status
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    // Fetch commit history
    const commits = await getCommitHistory(repoDir);
    const totalCommits = commits.length;
    logger.info(`Analyzing ${totalCommits} commits for repo ${repositoryId}`);

    await prisma.analysisJob.update({
      where: { id: jobId },
      data: { totalCommits },
    });

    // State tracking across commits
    const churnMap = new Map<string, number>();
    const fileOwnership = new Map<string, string[]>();
    const contributorMap = new Map<string, {
      commitCount: number;
      linesAdded: number;
      linesRemoved: number;
      filesModified: Set<string>;
    }>();

    let prevComplexity = 0;
    let prevTestRatio = 0;
    let prevDepCount = 0;
    let processedCount = 0;

    // Process commits in reverse order (oldest first for incremental state)
    const orderedCommits = [...commits].reverse();

    // Batch insert arrays
    const commitBatch: Parameters<typeof prisma.commit.createMany>[0]['data'] = [];
    const fileMetricBatch: Parameters<typeof prisma.fileMetric.createMany>[0]['data'] = [];
    const snapshotBatch: Parameters<typeof prisma.healthSnapshot.createMany>[0]['data'] = [];

    for (const commit of orderedCommits) {
      try {
        // Check if already analyzed (incremental skip)
        const existing = await prisma.commit.findUnique({
          where: { repositoryId_hash: { repositoryId, hash: commit.hash } },
          select: { id: true },
        });

        if (existing) {
          processedCount++;
          continue;
        }

        // Analyze ONLY changed files for this commit
        const { filesChanged, insertions, deletions, fileMetrics } =
          await analyzeCommitDiff(repoDir, commit.hash);

        // Update churn map
        for (const fp of filesChanged) {
          churnMap.set(fp, (churnMap.get(fp) || 0) + 1);
        }

        // Update file ownership
        for (const fp of filesChanged) {
          const owners = fileOwnership.get(fp) || [];
          const emailSafe = commit.authorEmail || 'unknown@example.com';
          if (!owners.includes(emailSafe)) owners.push(emailSafe);
          fileOwnership.set(fp, owners);
        }

        // Update contributor stats
        const emailSafe = commit.authorEmail || 'unknown@example.com';
        const contrib = contributorMap.get(emailSafe) || {
          commitCount: 0, linesAdded: 0, linesRemoved: 0, filesModified: new Set(),
        };
        contrib.commitCount++;
        contrib.linesAdded += insertions;
        contrib.linesRemoved += deletions;
        filesChanged.forEach(f => contrib.filesModified.add(f));
        contributorMap.set(emailSafe, contrib);

        // Check for package.json changes (dep tracking)
        const hasDepChange = filesChanged.some(f =>
          f.endsWith('package.json') && !f.includes('node_modules')
        );
        const depDeltaForCommit = hasDepChange ? extractDependencyCount('') : 0;
        const newDepCount = prevDepCount + depDeltaForCommit;

        // Compute health score
        const { scores, complexityDelta, testDelta, depDelta, churnDelta } = computeHealthScore({
          fileMetrics,
          prevComplexity,
          prevTestRatio,
          prevDepCount,
          churnMap,
          depCount: newDepCount,
        });

        // Update state
        prevComplexity = Math.max(0, prevComplexity + complexityDelta);
        prevTestRatio = Math.max(0, Math.min(100, prevTestRatio + testDelta));
        prevDepCount = newDepCount;

        // Build Knowledge Graph
        const simpleGit = (await import('simple-git')).default;
        const git = simpleGit(repoDir);
        await git.checkout(commit.hash);
        
        const { buildCommitGraph } = await import('./graphBuilder');
        const graph = await buildCommitGraph(repoDir);
        const graphData = JSON.stringify(graph);

        // Prepare commit record (will be inserted)
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
        });

        // Snapshot
        snapshotBatch.push({
          repositoryId,
          commitHash: commit.hash,
          overallScore: scores.overall,
          complexityScore: scores.complexity,
          testScore: scores.testHealth,
          churnScore: scores.churn,
          depScore: scores.dependency,
          hotspotCount: fileMetrics.filter(f => computeHotspotScore(f.complexity, churnMap.get(f.filePath) || 0) > 5).length,
          totalFiles: filesChanged.length,
          testFiles: fileMetrics.filter(f => f.isTest).length,
          codeFiles: fileMetrics.filter(f => !f.isTest).length,
          depCount: newDepCount,
          snapshotAt: new Date(commit.date),
        });

        // File metrics (only changed files, not full repo)
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

        // Flush batch every BATCH_SIZE commits
        if (commitBatch.length >= BATCH_SIZE) {
          await flushBatches(commitBatch, snapshotBatch, fileMetricBatch);
          commitBatch.length = 0;
          snapshotBatch.length = 0;
          fileMetricBatch.length = 0;
        }

        // Update progress
        const progress = Math.round((processedCount / totalCommits) * 100);
        if (processedCount % 10 === 0) {
          await prisma.analysisJob.update({
            where: { id: jobId },
            data: { progress },
          });
          logger.info(`Progress: ${progress}% (${processedCount}/${totalCommits})`);
        }
      } catch (err) {
        logger.warn(`Failed to analyze commit ${commit.hash}:`, err);
      }
    }

    // Final flush
    if (commitBatch.length > 0) {
      await flushBatches(commitBatch, snapshotBatch, fileMetricBatch);
    }

    // Upsert contributor stats
    for (const [email, stats] of contributorMap) {
      const commit = orderedCommits.find(c => (c.authorEmail || 'unknown@example.com') === email);
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

    // Mark job complete
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', progress: 100, completedAt: new Date() },
    });

    logger.info(`✅ Analysis complete for repo ${repositoryId}`);
  } catch (err) {
    logger.error(`Analysis failed for job ${jobId}:`, err);
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Unknown error',
      },
    });
  }
}

async function flushBatches(
  commits: Parameters<typeof prisma.commit.createMany>[0]['data'],
  snapshots: Parameters<typeof prisma.healthSnapshot.createMany>[0]['data'],
  fileMetrics: Parameters<typeof prisma.fileMetric.createMany>[0]['data']
) {
  // SQLite + Prisma does not support skipDuplicates in createMany.
  // Use individual upserts via Promise.allSettled to gracefully skip conflicts.
  await Promise.allSettled(
    (commits as any[]).map((c) =>
      prisma.commit.upsert({
        where: { repositoryId_hash: { repositoryId: c.repositoryId, hash: c.hash } },
        update: {},
        create: c,
      })
    )
  );

  await Promise.allSettled(
    (snapshots as any[]).map((s) =>
      prisma.healthSnapshot.upsert({
        where: { repositoryId_commitHash: { repositoryId: s.repositoryId, commitHash: s.commitHash } },
        update: {},
        create: s,
      })
    )
  );

  await Promise.allSettled(
    (fileMetrics as any[]).map((fm) =>
      prisma.fileMetric.create({ data: fm }).catch(() => null)
    )
  );
}
