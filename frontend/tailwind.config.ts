import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        cyber: {
          bg: '#050914',
          card: '#0a1628',
          border: '#1a2d4a',
          neon: '#00f5ff',
          pink: '#ff2d78',
          purple: '#8b5cf6',
          green: '#00ff9f',
          yellow: '#ffd700',
          orange: '#ff6b35',
        },
      },
      backgroundImage: {
        'cyber-grid': `linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)`,
        'glow-neon': 'radial-gradient(ellipse at center, rgba(0,245,255,0.15) 0%, transparent 70%)',
        'glow-pink': 'radial-gradient(ellipse at center, rgba(255,45,120,0.15) 0%, transparent 70%)',
        'card-gradient': 'linear-gradient(135deg, rgba(10,22,40,0.9) 0%, rgba(5,9,20,0.95) 100%)',
      },
      animation: {
        'pulse-neon': 'pulseNeon 2s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite',
        'scan': 'scan 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.6s ease-out',
      },
      keyframes: {
        pulseNeon: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0,245,255,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0,245,255,0.6), 0 0 80px rgba(0,245,255,0.2)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      boxShadow: {
        'neon': '0 0 20px rgba(0,245,255,0.4), 0 0 40px rgba(0,245,255,0.1)',
        'neon-pink': '0 0 20px rgba(255,45,120,0.4), 0 0 40px rgba(255,45,120,0.1)',
        'neon-purple': '0 0 20px rgba(139,92,246,0.4)',
        'glass': '0 8px 32px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}

export default config
