/** @type {import('tailwindcss').Config} */
export default {
  content: ['./frontend/renderer/index.html', './frontend/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif'
        ],
        serif: [
          'Iowan Old Style',
          'Palatino Linotype',
          'Palatino',
          'Times New Roman',
          'Times',
          'serif'
        ],
        mono: [
          '"SF Mono"',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace'
        ]
      },
      colors: {
        paper: '#ffffff',
        surface: '#fafafa',
        ink: '#0f0f0f',
        muted: '#737373',
        subtle: '#f4f4f5',
        rule: '#e7e7e7',
        accent: '#9c2a2a'
      }
    }
  },
  plugins: []
}
