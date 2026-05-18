# RepoPulse AI 🚀

> **AI-powered repository intelligence platform** — Track codebase health like engineering leaders.

[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-orange)](https://ai.google.dev/)

---

## 🎯 Core Problem

Codebases degrade silently. Complexity accumulates commit by commit, tests disappear quietly, and dependencies balloon. By the time you notice, the damage is deep.

**RepoPulse AI** analyzes public GitHub repositories across **500+ commits** using incremental diff-based analysis — detecting complexity hotspots, test coverage erosion, and dependency risks, then explains it all with Gemini AI.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| ⚡ **Incremental Analysis** | Processes 500+ commits via diff-only analysis — never full rescans |
| 🔥 **Hotspot Detection** | High-risk files ranked by complexity × churn score |
| 🤖 **AI Explanations** | Gemini AI explains health drops using only computed metrics |
| 📊 **Health Timeline** | Visual trend charts across complexity, tests, churn, dependencies |
| 🚌 **Bus Factor** | Detects single-contributor owned critical modules |
| 🔮 **Pre-Merge Prediction** | Predict health impact before merging |
| 👥 **Contributor Leaderboard** | Ranked by commits with ownership analysis |

---

## 🏗️ Architecture

```
GitHub URL → Clone + Fetch → Incremental Diffs → Health Engine → AI Explanation → Dashboard
```

### Tech Stack

**Frontend**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS (dark cyberpunk theme)
- Recharts (health timeline charts)
- Framer Motion (animations)
- Axios

**Backend**
- Node.js + Express.js
- TypeScript
- Prisma ORM
- PostgreSQL (Neon)
- simple-git (incremental diff analysis)
- Google Gemini AI (`@google/generative-ai`)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (or [Neon](https://neon.tech) free tier)
- [Google Gemini API key](https://ai.google.dev/) (free tier)

### 1. Clone the repository

```bash
git clone https://github.com/vrushabd/gitrepo-health-tracker.git
cd gitrepo-health-tracker
```

### 2. Backend Setup

```bash
cd backend
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and GEMINI_API_KEY

# Generate Prisma client and push schema
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install

# Copy and configure environment
cp .env.example .env.local
# Edit: NEXT_PUBLIC_API_URL=http://localhost:3001

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```env
PORT=3001
DATABASE_URL="postgresql://user:pass@host/repopulse?sslmode=require"
GEMINI_API_KEY="your-gemini-api-key"
REPOS_DIR="/tmp/repopulse-repos"
MAX_COMMITS=500
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/repos/analyze` | Submit a GitHub repo for analysis |
| `GET` | `/api/jobs/:id/status` | Poll analysis job status |
| `GET` | `/api/repos/:id/health` | Get latest health snapshot |
| `GET` | `/api/repos/:id/timeline` | Get health score history |
| `GET` | `/api/repos/:id/hotspots` | Get top risk files |
| `GET` | `/api/repos/:id/contributors` | Get contributor stats + bus factor |
| `GET` | `/api/repos/:id/diff` | Compare two commits |
| `POST` | `/api/repos/:id/explain` | AI explanation of health metrics |
| `POST` | `/api/repos/:id/predict` | Predict pre-merge health impact |
| `GET` | `/api/repos/:id/commits` | Paginated commit list |

---

## 🔬 Health Score Engine

The overall health score (0–100) is a weighted composite of four subscores:

```
Overall = Complexity(30%) + TestHealth(30%) + Churn(25%) + Dependency(15%)
```

| Metric | Formula |
|--------|---------|
| **Complexity** | `100 - log(totalComplexity) × 5` |
| **Test Health** | `min(100, testRatio × 2)` |
| **Churn** | `100 - log(avgChurn) × 15` |
| **Dependency** | `100 - depDelta × 2` |
| **Hotspot** | `complexity × log(churnCount)` |
| **Bus Factor** | `min contributors to cover 50% codebase` |

---

## 🚀 Deployment

### Frontend → Vercel

```bash
cd frontend
npx vercel deploy
```

Set `NEXT_PUBLIC_API_URL` to your backend URL in Vercel dashboard.

### Backend → Railway / Render

Set all env vars from `backend/.env.example` in your hosting dashboard.

### Database → Neon (Free)

1. Create a free PostgreSQL database at [neon.tech](https://neon.tech)
2. Copy the connection string to `DATABASE_URL`
3. Run `npx prisma db push`

---

## 🧩 Project Structure

```
gitrepo-health-tracker/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express app entry
│   │   ├── routes/
│   │   │   ├── repos.ts          # Repo API routes
│   │   │   └── jobs.ts           # Job status routes
│   │   ├── services/
│   │   │   ├── gitAnalyzer.ts    # Incremental diff analysis
│   │   │   ├── healthScorer.ts   # Health score engine
│   │   │   └── analysisWorker.ts # Async background processor
│   │   ├── lib/
│   │   │   ├── prisma.ts         # Database client
│   │   │   ├── gemini.ts         # AI integration
│   │   │   └── logger.ts         # Winston logger
│   │   └── types/index.ts        # TypeScript types
│   └── prisma/schema.prisma      # Database schema
│
└── frontend/
    ├── app/
    │   ├── layout.tsx             # Root layout
    │   ├── page.tsx               # Landing page
    │   └── dashboard/[repoId]/
    │       └── page.tsx           # Dashboard page
    ├── components/
    │   ├── HealthScoreRing.tsx    # SVG score ring
    │   ├── ScoreCard.tsx          # Metric card
    │   ├── TimelineChart.tsx      # Recharts line chart
    │   ├── HotspotTable.tsx       # Risk file table
    │   ├── CommitActivityChart.tsx # Commit bar chart
    │   ├── ContributorLeaderboard.tsx # Bus factor leaderboard
    │   ├── AiExplainModal.tsx     # Gemini AI modal
    │   └── PredictModal.tsx       # Pre-merge prediction modal
    └── lib/api.ts                 # Axios API client
```

---

## 🎨 Design

- **Theme**: Dark cyberpunk with neon glow accents
- **Primary**: Cyan `#00f5ff` / Pink `#ff2d78` / Purple `#8b5cf6`
- **Style**: Glassmorphism cards, animated score rings, neon borders
- **Font**: Inter + JetBrains Mono

---

## 📄 License

MIT © 2024 RepoPulse AI
