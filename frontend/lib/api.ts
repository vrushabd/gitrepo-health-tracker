import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// API helpers
export const repoApi = {
  analyze: (url: string) =>
    api.post('/api/repos/analyze', { url }).then(r => r.data),

  getHealth: (repoId: string) =>
    api.get(`/api/repos/${repoId}/health`).then(r => r.data),

  getTimeline: (repoId: string, limit = 100) =>
    api.get(`/api/repos/${repoId}/timeline`, { params: { limit } }).then(r => r.data),

  getHotspots: (repoId: string, limit = 20) =>
    api.get(`/api/repos/${repoId}/hotspots`, { params: { limit } }).then(r => r.data),

  getContributors: (repoId: string) =>
    api.get(`/api/repos/${repoId}/contributors`).then(r => r.data),

  getDiff: (repoId: string, from: string, to: string) =>
    api.get(`/api/repos/${repoId}/diff`, { params: { from, to } }).then(r => r.data),

  getGraph: (repoId: string, commitHash: string) =>
    api.get(`/api/repos/${repoId}/graph`, { params: { commit: commitHash } }).then(r => r.data),

  explain: (repoId: string) =>
    api.post(`/api/repos/${repoId}/explain`).then(r => r.data),

  predict: (repoId: string, payload: {
    filesModified: string[];
    linesAdded: number;
    linesRemoved: number;
    newDependencies: string[];
  }) => api.post(`/api/repos/${repoId}/predict`, payload).then(r => r.data),

  getCommits: (repoId: string, page = 1, limit = 50) =>
    api.get(`/api/repos/${repoId}/commits`, { params: { page, limit } }).then(r => r.data),
};

export const jobApi = {
  getStatus: (jobId: string) =>
    api.get(`/api/jobs/${jobId}/status`).then(r => r.data),

  listJobs: () =>
    api.get('/api/jobs').then(r => r.data),
};
