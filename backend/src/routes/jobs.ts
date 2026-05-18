import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export const jobRouter = Router();

// GET /api/jobs/:id/status
jobRouter.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const job = await prisma.analysisJob.findUnique({
      where: { id },
      include: {
        repository: {
          select: { id: true, owner: true, name: true, url: true },
        },
      },
    });

    if (!job) return res.status(404).json({ error: 'Job not found' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jobWithRepo = job as any;
    return res.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      totalCommits: job.totalCommits,
      error: job.error,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
      repository: jobWithRepo.repository,
    });
  } catch (err) {
    logger.error('Job status error:', err);
    return res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

// GET /api/jobs — list recent jobs
jobRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const jobs = await prisma.analysisJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        repository: {
          select: { owner: true, name: true, url: true },
        },
      },
    });

    return res.json({ jobs });
  } catch (err) {
    logger.error('Jobs list error:', err);
    return res.status(500).json({ error: 'Failed to list jobs' });
  }
});
