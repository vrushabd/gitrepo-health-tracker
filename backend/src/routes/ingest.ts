import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { runIngestion } from '../services/ingestionPipeline';

export const ingestRouter = Router();

const analyzeSchema = z.object({
  url: z
    .string()
    .url()
    .refine(url => /github\.com\/[\w.-]+\/[\w.-]+/.test(url), {
      message: 'Must be a valid public GitHub repository URL',
    }),
});

/** POST /api/analyze — start deterministic repo ingestion */
ingestRouter.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { url } = analyzeSchema.parse(req.body);
    const match = url.match(/github\.com\/([^/]+)\/([^/\s]+)/);
    if (!match) return res.status(400).json({ error: 'Invalid GitHub URL' });

    const [, owner, name] = match;
    const cleanName = name.replace(/\.git$/, '');

    let repo = await prisma.repository.findUnique({ where: { url } });
    if (!repo) {
      repo = await prisma.repository.create({
        data: { url, owner, name: cleanName },
      });
    }

    const job = await prisma.analysisJob.create({
      data: { repositoryId: repo.id, status: 'PENDING' },
    });

    setImmediate(() => {
      runIngestion(job.id, repo!.id, url).catch(err =>
        logger.error('Ingestion pipeline error:', err)
      );
    });

    return res.status(202).json({
      jobId: job.id,
      repoId: repo.id,
      message: 'Ingestion pipeline started',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error('POST /analyze error:', err);
    return res.status(500).json({ error: 'Failed to start ingestion' });
  }
});

/** GET /api/repo/:id/graph — latest structural graph */
ingestRouter.get('/repo/:id/graph', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const commitHash = req.query.commit as string | undefined;

    const commit = commitHash
      ? await prisma.commit.findFirst({
          where: { repositoryId: id, hash: commitHash },
          select: { graphData: true, hash: true, committedAt: true, functionCount: true, classCount: true, interfaceCount: true, importCount: true, dependencyCount: true },
        })
      : await prisma.commit.findFirst({
          where: { repositoryId: id, graphData: { not: null } },
          orderBy: { committedAt: 'desc' },
          select: { graphData: true, hash: true, committedAt: true, functionCount: true, classCount: true, interfaceCount: true, importCount: true, dependencyCount: true },
        });

    if (!commit?.graphData) {
      return res.status(404).json({ error: 'No structural graph available for this repository' });
    }

    const graph = JSON.parse(commit.graphData);
    return res.json({
      commitHash: commit.hash,
      committedAt: commit.committedAt,
      ...graph,
      ingestionMetrics: {
        functionCount: commit.functionCount,
        classCount: commit.classCount,
        interfaceCount: commit.interfaceCount,
        importCount: commit.importCount,
        dependencyCount: commit.dependencyCount,
      },
    });
  } catch (err) {
    logger.error('GET /repo/:id/graph error:', err);
    return res.status(500).json({ error: 'Failed to fetch graph' });
  }
});

/** GET /api/repo/:id/commits — commit timeline with ingestion metrics */
ingestRouter.get('/repo/:id/commits', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
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
          authorEmail: true,
          committedAt: true,
          filesChanged: true,
          insertions: true,
          deletions: true,
          healthScore: true,
          functionCount: true,
          classCount: true,
          interfaceCount: true,
          importCount: true,
          dependencyCount: true,
        },
      }),
      prisma.commit.count({ where: { repositoryId: id } }),
    ]);

    return res.json({ commits, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('GET /repo/:id/commits error:', err);
    return res.status(500).json({ error: 'Failed to fetch commits' });
  }
});

/** GET /api/repo/:id/hotspots — high churn / high complexity modules */
ingestRouter.get('/repo/:id/hotspots', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const limit = parseInt(req.query.limit as string || '20', 10);

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
        hotspotScore: h._max?.hotspotScore || 0,
        complexity: h._max?.complexity || 0,
        churnCount: h._sum?.churnCount || 0,
        linesAdded: h._sum?.linesAdded || 0,
        linesRemoved: h._sum?.linesRemoved || 0,
      })),
    });
  } catch (err) {
    logger.error('GET /repo/:id/hotspots error:', err);
    return res.status(500).json({ error: 'Failed to fetch hotspots' });
  }
});
