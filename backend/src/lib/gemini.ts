import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './logger';

export interface MetricsSummary {
  overallScore: number;
  complexityDelta: number;
  testDelta: number;
  churnDelta: number;
  depDelta: number;
  hotspotFiles: string[];
  commitCount: number;
  repoName: string;
}

export async function explainHealthMetrics(metrics: MetricsSummary): Promise<string> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const prompt = `You are a senior engineering lead analyzing codebase health metrics. 
Analyze these computed metrics and provide a concise 3-4 sentence engineering assessment.
Focus on root causes and actionable recommendations. Use technical language.

Metrics:
- Repository: ${metrics.repoName}
- Overall Health Score: ${metrics.overallScore}/100
- Complexity Delta: ${metrics.complexityDelta > 0 ? '+' : ''}${metrics.complexityDelta} (positive = more complex)
- Test Coverage Delta: ${metrics.testDelta > 0 ? '+' : ''}${metrics.testDelta}% (negative = fewer tests)
- Code Churn Delta: ${metrics.churnDelta > 0 ? '+' : ''}${metrics.churnDelta} (positive = more churn)
- Dependency Growth Delta: ${metrics.depDelta > 0 ? '+' : ''}${metrics.depDelta} packages
- High-Risk Hotspot Files: ${metrics.hotspotFiles.join(', ') || 'None detected'}
- Commits Analyzed: ${metrics.commitCount}

Respond in 3-4 concise sentences explaining what these metrics indicate about codebase health and what engineering actions should be taken.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (err) {
    logger.error('Gemini API error:', err);
    return 'AI analysis temporarily unavailable. Review the metrics above for health insights.';
  }
}

export async function predictMergeImpact(changes: {
  filesModified: string[];
  linesAdded: number;
  linesRemoved: number;
  newDependencies: string[];
  currentHealthScore: number;
}): Promise<string> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const prompt = `You are a senior code reviewer. Predict the health impact of this proposed change.

Current repo health: ${changes.currentHealthScore}/100
Files to be modified: ${changes.filesModified.join(', ')}
Lines added: ${changes.linesAdded}
Lines removed: ${changes.linesRemoved}
New dependencies: ${changes.newDependencies.join(', ') || 'None'}

Provide a 2-3 sentence prediction of health impact, risk level (Low/Medium/High), and one key recommendation.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    logger.error('Gemini API error:', err);
    return 'Prediction unavailable. Analyze the change manually based on complexity and dependency growth.';
  }
}
