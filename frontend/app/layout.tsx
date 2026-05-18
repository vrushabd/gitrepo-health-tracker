import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'RepoPulse AI — Codebase Health Intelligence',
  description: 'AI-powered repository intelligence platform. Track codebase health trends, detect hotspots, and predict merge risk across 500+ commits.',
  keywords: ['codebase health', 'github analysis', 'code metrics', 'technical debt', 'AI code review'],
  authors: [{ name: 'RepoPulse AI' }],
  openGraph: {
    title: 'RepoPulse AI — Codebase Health Intelligence',
    description: 'Track your codebase health like engineering leaders.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-cyber-bg text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
