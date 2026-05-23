/** @type {import('tailwindcss').Config} */
export default {
  content: ['./frontend/renderer/index.html', './frontend/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"DM Sans"',
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
          '"Instrument Serif"',
          '"Times New Roman"',
          'serif'
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          '"SF Mono"',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ]
      },
      colors: {
        canvas: '#F4F0E4',
        paper: '#ECE7D6',
        elevated: '#FBF8EE',
        rule: '#D6CDB8',
        'rule-soft': '#E3DCC8',
        ink: '#16140F',
        'ink-soft': '#34302A',
        mute: '#7B7461',
        olive: '#6B8F12',
        'olive-deep': '#4A6309',
        'olive-ink': '#2E3F05',
        'olive-soft': '#E8EFC9',
        blush: '#DD6E4E',
        plum: '#5E4E78'
      }
    }
  },
  plugins: []
}
