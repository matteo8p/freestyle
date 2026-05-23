/** @type {import('tailwindcss').Config} */
export default {
  content: ['./frontend/renderer/index.html', './frontend/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: [
          'Iowan Old Style',
          'Palatino Linotype',
          'Palatino',
          'Times New Roman',
          'Times',
          'serif'
        ]
      },
      colors: {
        paper: '#ffffff',
        surface: '#ffffff',
        ink: '#1c1b18',
        muted: '#6b6b6b',
        rule: '#e5e5e5',
        accent: '#9c2a2a'
      }
    }
  },
  plugins: []
}
