/** @type {import('tailwindcss').Config} */
export default {
  content: ['./frontend/renderer/index.html', './frontend/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Inter Tight"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif'
        ],
        display: [
          '"Bricolage Grotesque"',
          'system-ui',
          'sans-serif'
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
        paper: '#F1EBDD',
        'paper-deep': '#E7DFCC',
        ink: '#1B1814',
        'ink-soft': '#2B2620',
        mute: '#8E8473',
        rule: '#D8CFB9',
        coral: '#F5511D',
        'coral-soft': '#FBB89E',
        sage: '#6E8A6A',
        'sage-soft': '#BFCFB9',
        butter: '#F3CB58'
      }
    }
  },
  plugins: []
}
