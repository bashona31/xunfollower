/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,html}'],
  theme: {
    extend: {
      colors: {
        primary: {
          bg: '#0B1120',
          card: '#111827',
          accent: '#8B5CF6',
          hover: '#A78BFA',
          text: '#F3F4F6'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out'
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(139, 92, 246, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.6)' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
};
