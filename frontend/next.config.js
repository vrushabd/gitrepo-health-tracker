/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  experimental: {
    optimizePackageImports: ['recharts', 'framer-motion', 'lucide-react'],
  },
}

module.exports = nextConfig
