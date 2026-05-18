import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { runAnalysis } from '../services/analysisWorker';
import { getDiffBetweenCommits } from '../services/gitAnalyzer';
import { explainHealthMetrics, predictMergeImpact } from '../lib/gemini';
import * as path from 'path';

export const repoRouter = Router();

const analyzeSchema = z.object({
  url: z.string().url().refine(
    url => /github\.com\/[\w.-]+\/[\w.-]+/.test(url),
    { message: 'Must be a valid GitHub repository URL' }
  ),
});

// POST /api/repos/analyze
repoRouter.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { url } = analyzeSchema.parse(req.body);

    // Extract owner/name from URL
    const match = url.match(/github\.com\/([^/]+)\/([^/\s]+)/);
    if (!match) return res.status(400).json({ error: 'Invalid GitHub URL' });

    const [, owner, name] = match;
    const cleanName = name.replace(/\.git$/, '');

    // Find or create repository
    let repo = await prisma.repository.findUnique({ where: { url } });

    if (!repo) {
      repo = await prisma.repository.create({
        data: { url, owner, name: cleanName },
      });
    }

    // Create analysis job
    const job = await prisma.analysisJob.create({
      data: { repositoryId: repo.id, status: 'PENDING' },
    });

    // Kick off async analysis (non-blocking)
    setImmediate(() => {
      runAnalysis(job.id, repo!.id, url).catch(err =>
        logger.error('Background analysis error:', err)
      );
    });

    return res.status(202).json({
      jobId: job.id,
      repoId: repo.id,
      message: 'Analysis started',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error('Analyze error:', err);
    return res.status(500).json({ error: 'Failed to start analysis' });
  }
});

// GET /api/repos/:id/health
repoRouter.get('/:id/health', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [repo, latestSnapshot, job] = await Promise.all([
      prisma.repository.findUnique({ where: { id } }),
      prisma.healthSnapshot.findFirst({
        where: { repositoryId: id },
        orderBy: { snapshotAt: 'desc' },
      }),
      prisma.analysisJob.findFirst({
        where: { repositoryId: id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!repo) return res.status(404).json({ error: 'Repository not found' });

    return res.json({
      repo,
      health: latestSnapshot,
      jobStatus: job?.status || 'UNKNOWN',
    });
  } catch (err) {
    logger.error('Health fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch health data' });
  }
});

// GET /api/repos/:id/timeline
repoRouter.get('/:id/timeline', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string || '100', 10);

    const snapshots = await prisma.healthSnapshot.findMany({
      where: { repositoryId: id },
      orderBy: { snapshotAt: 'asc' },
      take: limit,
      select: {
        commitHash: true,
        overallScore: true,
        complexityScore: true,
        testScore: true,
        churnScore: true,
        depScore: true,
        snapshotAt: true,
      },
    });

    return res.json({ timeline: snapshots });
  } catch (err) {
    logger.error('Timeline fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// GET /api/repos/:id/hotspots
repoRouter.get('/:id/hotspots', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string || '20', 10);

    // Aggregate file metrics — highest hotspot scores
    const hotspots = await prisma.fileMetric.groupBy({
      by: ['filePath', 'language'],
      where: { repositoryId: id, isTest: false },
      _max: { hotspotScore: true, complexity: true },
      _sum: { churnCount: true, linesAdded: true, linesRemoved: true },
      orderBy: { _max: { hotspotScore: 'desc' } },
      take: limit,
    });

    return res.json({
      hotspots: hotspots.map(h => ({
        filePath: h.filePath,
        language: h.language,
        hotspotScore: h._max.hotspotScore || 0,
        complexity: h._max.complexity || 0,
        churnCount: h._sum.churnCount || 0,
        linesAdded: h._sum.linesAdded || 0,
        linesRemoved: h._sum.linesRemoved || 0,
      })),
    });
  } catch (err) {
    logger.error('Hotspots fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch hotspots' });
  }
});

// GET /api/repos/:id/contributors
repoRouter.get('/:id/contributors', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const contributors = await prisma.contributorStat.findMany({
      where: { repositoryId: id },
      orderBy: { commitCount: 'desc' },
      take: 20,
    });

    return res.json({ contributors });
  } catch (err) {
    logger.error('Contributors fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch contributors' });
  }
});

// GET /api/repos/:id/diff
repoRouter.get('/:id/diff', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query as { from: string; to: string };

    if (!from || !to) {
      return res.status(400).json({ error: 'from and to commit hashes required' });
    }

    const REPOS_DIR = process.env.REPOS_DIR || '/tmp/repopulse-repos';
    const repoDir = path.join(REPOS_DIR, id);

    const [diffResult, fromSnapshot, toSnapshot] = await Promise.all([
      getDiffBetweenCommits(repoDir, from, to),
      prisma.healthSnapshot.findFirst({ where: { repositoryId: id, commitHash: from } }),
      prisma.healthSnapshot.findFirst({ where: { repositoryId: id, commitHash: to } }),
    ]);

    const healthDelta = (toSnapshot?.overallScore || 0) - (fromSnapshot?.overallScore || 0);
    const complexityDelta = (toSnapshot?.complexityScore || 0) - (fromSnapshot?.complexityScore || 0);

    return res.json({
      fromCommit: from,
      toCommit: to,
      ...diffResult,
      complexityDelta,
      testDelta: (toSnapshot?.testScore || 0) - (fromSnapshot?.testScore || 0),
      depDelta: (toSnapshot?.depCount || 0) - (fromSnapshot?.depCount || 0),
      healthDelta,
      riskChanges: healthDelta < -10 ? ['Significant health degradation detected'] : [],
    });
  } catch (err) {
    logger.error('Diff error:', err);
    return res.status(500).json({ error: 'Failed to compute diff' });
  }
});

// POST /api/repos/:id/explain
repoRouter.post('/:id/explain', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [repo, latestSnapshot, hotspots, commitCount] = await Promise.all([
      prisma.repository.findUnique({ where: { id } }),
      prisma.healthSnapshot.findFirst({
        where: { repositoryId: id },
        orderBy: { snapshotAt: 'desc' },
      }),
      prisma.fileMetric.findMany({
        where: { repositoryId: id },
        orderBy: { hotspotScore: 'desc' },
        take: 5,
        select: { filePath: true },
      }),
      prisma.commit.count({ where: { repositoryId: id } }),
    ]);

    if (!repo || !latestSnapshot) {
      return res.status(404).json({ error: 'Repository or health data not found' });
    }

    // Get trend (last 10 vs prev 10 commits)
    const recent = await prisma.healthSnapshot.findMany({
      where: { repositoryId: id },
      orderBy: { snapshotAt: 'desc' },
      take: 20,
      select: { overallScore: true, complexityScore: true, testScore: true },
    });

    const recentAvg = recent.slice(0, 10).reduce((s, r) => s + r.overallScore, 0) / Math.min(10, recent.length);
    const prevAvg = recent.slice(10).reduce((s, r) => s + r.overallScore, 0) / Math.max(1, recent.slice(10).length);

    const explanation = await explainHealthMetrics({
      overallScore: latestSnapshot.overallScore,
      complexityDelta: recentAvg - prevAvg,
      testDelta: latestSnapshot.testScore - 50,
      churnDelta: latestSnapshot.churnScore - 70,
      depDelta: latestSnapshot.depCount,
      hotspotFiles: hotspots.map(h => h.filePath.split('/').pop() || h.filePath),
      commitCount,
      repoName: `${repo.owner}/${repo.name}`,
    });

    return res.json({ explanation });
  } catch (err) {
    logger.error('Explain error:', err);
    return res.status(500).json({ error: 'Failed to generate explanation' });
  }
});

// POST /api/repos/:id/predict
repoRouter.post('/:id/predict', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { filesModified = [], linesAdded = 0, linesRemoved = 0, newDependencies = [] } = req.body;

    const latestSnapshot = await prisma.healthSnapshot.findFirst({
      where: { repositoryId: id },
      orderBy: { snapshotAt: 'desc' },
    });

    const prediction = await predictMergeImpact({
      filesModified,
      linesAdded,
      linesRemoved,
      newDependencies,
      currentHealthScore: latestSnapshot?.overallScore || 50,
    });

    // Heuristic local score estimate
    const complexityRisk = linesAdded > 500 ? 'HIGH' : linesAdded > 200 ? 'MEDIUM' : 'LOW';
    const depRisk = newDependencies.length > 3 ? 'HIGH' : newDependencies.length > 0 ? 'MEDIUM' : 'LOW';

    return res.json({
      prediction,
      heuristicRisk: {
        complexity: complexityRisk,
        dependency: depRisk,
        overall: complexityRisk === 'HIGH' || depRisk === 'HIGH' ? 'HIGH' : 'LOW',
      },
      estimatedScoreDelta: -(linesAdded / 50) - (newDependencies.length * 2),
    });
  } catch (err) {
    logger.error('Predict error:', err);
    return res.status(500).json({ error: 'Failed to generate prediction' });
  }
});

// GET /api/repos/:id/commits
repoRouter.get('/:id/commits', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '50', 10);

    const [commits, total] = await Promise.all([
      prisma.commit.findMany({
        where: { repositoryId: id },
        orderBy: { committedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          hash: true,
          message: true,
          author: true,
          committedAt: true,
          filesChanged: true,
          insertions: true,
          deletions: true,
          healthScore: true,
          complexityDelta: true,
          testDelta: true,
        },
      }),
      prisma.commit.count({ where: { repositoryId: id } }),
    ]);

    return res.json({ commits, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('Commits fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch commits' });
  }
});
