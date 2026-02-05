/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        '2xg': {
          primary: '#16a34a', // green-600
          'primary-dark': '#15803d', // green-700
          secondary: '#2563eb', // blue-600
          accent: '#f97316', // orange-500
          danger: '#dc2626', // red-600
          purple: '#7c3aed', // purple-600
        },
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      animation: {
        'fire': 'fire 0.5s infinite',
        'bounce-slow': 'bounce 1s infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        fire: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
