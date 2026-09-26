import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        surface: '#F8FAFC',
        surface2: '#F1F5F9',
        primary: {
          DEFAULT: '#2563EB',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        ink: {
          DEFAULT: '#0F172A',
          secondary: '#475569',
          muted: '#94A3B8',
        },
        line: '#E2E8F0',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(37,99,235,0.12)',
        lift: '0 12px 40px -12px rgba(15,23,42,0.18)',
        glass: '0 8px 32px rgba(37,99,235,0.10)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        floaty: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          from: { opacity: '0', transform: 'scale(.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        floaty: 'floaty 7s ease-in-out infinite',
        fadeUp: 'fadeUp .5s cubic-bezier(.21,1.02,.73,1) both',
        pop: 'pop .25s cubic-bezier(.21,1.02,.73,1) both',
        'fadeUp-1': 'fadeUp .5s .08s cubic-bezier(.21,1.02,.73,1) both',
        'fadeUp-2': 'fadeUp .5s .16s cubic-bezier(.21,1.02,.73,1) both',
        'fadeUp-3': 'fadeUp .5s .24s cubic-bezier(.21,1.02,.73,1) both',
      },
    },
  },
  plugins: [],
}
export default config
