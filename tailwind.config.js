/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EAF3DE',
          100: '#D0E8B8',
          200: '#B0D887',
          300: '#8DC455',
          400: '#72AE2A',
          500: '#639922',
          600: '#4F7A1A',
          700: '#3B6D11',
          800: '#2A500A',
          900: '#173404',
        },
        teal: {
          50:  '#E1F5EE',
          100: '#B3E6D4',
          200: '#7DD4B7',
          300: '#45C198',
          400: '#1DAD7F',
          500: '#1D9E75',
          600: '#148A63',
          700: '#0F6E56',
          800: '#085041',
          900: '#04342C',
        },
        surface: {
          page: '#F5F5F0',
          card: '#FFFFFF',
          muted: '#F0F0EA',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        glow: '0 0 20px rgba(99,153,34,0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'dot-bounce': 'dotBounce 1.2s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        dotBounce: { '0%,80%,100%': { opacity: '0.2' }, '40%': { opacity: '1' } },
      },
    },
  },
  plugins: [],
}
