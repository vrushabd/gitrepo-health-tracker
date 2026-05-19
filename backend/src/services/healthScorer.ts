import { FileMetricInput, HealthScoreBreakdown } from '../types';

interface ScoringContext {
  totalComplexity: number;
  prevComplexity: number;
  testFiles: number;
  codeFiles: number;
  prevTestRatio: number;
  depCount: number;
  prevDepCount: number;
  churnMap: Map<string, number>;
}

export function computeHealthScore(ctx: ScoringContext): {
  scores: HealthScoreBreakdown;
  complexityDelta: number;
  testDelta: number;
  depDelta: number;
  churnDelta: number;
} {
  const { totalComplexity, prevComplexity, testFiles, codeFiles, prevTestRatio, depCount, prevDepCount, churnMap } = ctx;

  // ─── Complexity Score ─────────────────────────────────────────────
  const complexityDelta = totalComplexity - prevComplexity;

  // Higher complexity = lower score. Normalize 0-100
  const complexityScore = Math.max(0, Math.min(100, 100 - Math.log1p(totalComplexity) * 5));

  // ─── Test Health Score ────────────────────────────────────────────
  const testRatio = (codeFiles + testFiles) > 0 ? (testFiles / (codeFiles + testFiles)) * 100 : 0;
  const testDelta = testRatio - prevTestRatio;
  const testScore = Math.min(100, testRatio * 2); // 50% test ratio = 100 score

  // ─── Churn Score ──────────────────────────────────────────────────
  let totalChurn = 0;
  for (const [, churn] of churnMap) {
    totalChurn += churn;
  }
  const avgChurn = churnMap.size > 0 ? totalChurn / churnMap.size : 0;
  const churnDelta = avgChurn;
  // Lower churn = better score
  const churnScore = Math.max(0, Math.min(100, 100 - Math.log1p(avgChurn) * 15));

  // ─── Dependency Score ─────────────────────────────────────────────
  const depDelta = depCount - prevDepCount;
  // Penalize a high total number of dependencies
  const depScore = Math.max(0, Math.min(100, 100 - Math.log1p(depCount) * 10));

  // ─── Overall Weighted Score ───────────────────────────────────────
  const overall = Math.round(
    complexityScore * 0.30 +
    testScore * 0.30 +
    churnScore * 0.25 +
    depScore * 0.15
  );

  return {
    scores: {
      overall,
      complexity: Math.round(complexityScore),
      testHealth: Math.round(testScore),
      churn: Math.round(churnScore),
      dependency: Math.round(depScore),
    },
    complexityDelta,
    testDelta,
    depDelta,
    churnDelta,
  };
}

export function computeHotspotScore(complexity: number, churnCount: number): number {
  // Hotspot = high complexity AND high churn
  return complexity * Math.log1p(churnCount);
}

export function extractDependencyCount(diffContent: string): number {
  // Count package.json dependency entries from diff
  const lines = diffContent.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
  let count = 0;
  for (const line of lines) {
    // Match package.json dependency lines like "  \"react\": \"^18.0.0\","
    if (/^\+\s+"[^"]+"\s*:\s*"[\^~]?\d/.test(line)) {
      count++;
    }
  }
  return count;
}

export function calculateBusFactor(
  fileOwnership: Map<string, string[]>,
  totalFiles: number
): number {
  if (totalFiles === 0) return 1;
  // Bus factor = min contributors needed to cover 50% of codebase
  const ownership = [...fileOwnership.values()];
  const contributorFiles = new Map<string, number>();

  for (const contributors of ownership) {
    for (const c of contributors) {
      contributorFiles.set(c, (contributorFiles.get(c) || 0) + 1);
    }
  }

  const sorted = [...contributorFiles.entries()].sort((a, b) => b[1] - a[1]);
  let covered = 0;
  let busFactor = 0;
  const target = totalFiles * 0.5;

  for (const [, count] of sorted) {
    covered += count;
    busFactor++;
    if (covered >= target) break;
  }

  return Math.max(1, busFactor);
}
