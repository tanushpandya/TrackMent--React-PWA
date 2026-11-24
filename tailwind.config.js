/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        brand: {
          navy: '#0A2540',
          primary: '#0F4C81',
          royal: '#1D5FD6',
          blue: '#1D63ED',
          blueHover: '#1752C9',
          tint: '#EFF6FF',
          border: '#D6E4EE',
        },
        emeraldBadge: {
          bg: '#ECFDF5',
          border: '#A7F3D0',
          text: '#15803D',
          teal: '#0F766E',
        },
        amberBadge: {
          bg: '#FFFBEB',
          border: '#FDE68A',
          text: '#B45309',
        },
        roseBadge: {
          bg: '#FFF1F2',
          border: '#FECDD3',
          text: '#BE123C',
        }
      },
      boxShadow: {
        card: '0 2px 8px rgba(15, 35, 60, 0.04)',
        surface: '0 4px 16px rgba(15, 41, 66, 0.06)',
        modal: '0 24px 48px -12px rgba(10, 37, 64, 0.24)',
      }
    }
  },
  plugins: [],
};