import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'frontend/main/index.ts')
      }
    },
    resolve: {
      alias: {
        '@backend': resolve(__dirname, 'backend'),
        '@shared': resolve(__dirname, 'shared')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          preload: resolve(__dirname, 'frontend/main/preload.ts'),
          'preload-pill': resolve(__dirname, 'frontend/main/preload-pill.ts')
        },
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs'
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'frontend/renderer'),
    plugins: [react()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'shared'),
        '@renderer': resolve(__dirname, 'frontend/renderer'),
        '@assets': resolve(__dirname, 'assets')
      }
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'frontend/renderer/index.html'),
          pill: resolve(__dirname, 'frontend/renderer/pill/index.html')
        }
      }
    }
  }
})
