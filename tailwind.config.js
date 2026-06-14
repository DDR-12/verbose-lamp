/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        display: ['"ZCOOL KuaiLe"', '"Press Start 2P"', 'system-ui', 'sans-serif'],
        body: ['"Noto Sans TC"', '"PingFang TC"', '"Microsoft JhengHei"', 'system-ui', 'sans-serif'],
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      colors: {
        wood: {
          50:  '#FBF3E1',
          100: '#F4E1B7',
          200: '#E8C56A',
          300: '#C99A47',
          400: '#A37332',
          500: '#7A5024',
          600: '#5B3A1B',
          700: '#3E2A1E',
          800: '#2A1C13',
          900: '#1A110B',
        },
        crimson: '#C73E3A',
        jade:    '#2C5F3D',
        royal:   '#2A4A7F',
        amber:   '#E8C56A',
        gold:    '#D4AF37',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
        pop: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '60%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        flip: {
          '0%': { transform: 'rotateY(0)' },
          '100%': { transform: 'rotateY(360deg)' },
        },
        roll: {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '50%': { transform: 'rotate(540deg) scale(1.2)' },
          '100%': { transform: 'rotate(720deg) scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(232, 197, 106, 0.6)' },
          '50%': { boxShadow: '0 0 24px rgba(232, 197, 106, 1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(40px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        coinSpin: {
          '0%': { transform: 'rotateY(0)' },
          '100%': { transform: 'rotateY(360deg)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(199, 62, 58, 0.7)' },
          '70%': { transform: 'scale(1)', boxShadow: '0 0 0 16px rgba(199, 62, 58, 0)' },
          '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(199, 62, 58, 0)' },
        },
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
        pop: 'pop 0.4s ease-out',
        flip: 'flip 0.6s ease-in-out',
        roll: 'roll 0.6s ease-out',
        float: 'float 2s ease-in-out infinite',
        glow: 'glow 1.5s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'coin-spin': 'coinSpin 1s linear infinite',
        'pulse-ring': 'pulseRing 1.6s cubic-bezier(0.66, 0, 0, 1) infinite',
      },
      backgroundImage: {
        'wood-grain': "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><defs><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.24  0 0 0 0 0.16  0 0 0 0 0.12  0 0 0 0.5 0'/></filter></defs><rect width='200' height='200' fill='%233E2A1E'/><rect width='200' height='200' filter='url(%23n)' opacity='0.4'/><g stroke='%231A110B' stroke-width='1' opacity='0.3'><path d='M0 30 Q50 25 100 32 T200 30' fill='none'/><path d='M0 70 Q60 78 120 70 T200 75' fill='none'/><path d='M0 120 Q70 113 140 122 T200 120' fill='none'/><path d='M0 165 Q50 170 110 162 T200 168' fill='none'/></g></svg>\")",
        'paper': "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='200' height='200' fill='%23F4E1B7'/><g fill='%23A37332' opacity='0.08'><circle cx='40' cy='40' r='1.5'/><circle cx='100' cy='80' r='1'/><circle cx='160' cy='140' r='1.5'/><circle cx='60' cy='160' r='1'/></g></svg>\")",
      },
    },
  },
  plugins: [],
};
