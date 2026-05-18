/**
 * Analysis worker — delegates to the Repo Ingestion Engine pipeline.
 */
import { runIngestion } from './ingestionPipeline';

export async function runAnalysis(
  jobId: string,
  repositoryId: string,
  repoUrl: string
): Promise<void> {
  return runIngestion(jobId, repositoryId, repoUrl);
}
