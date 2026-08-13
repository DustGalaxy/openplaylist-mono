import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    tanstackRouter({ autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
  ],
  define:
    mode === 'production'
      ? {
          'console.log': '(() => {})',
          'console.info': '(() => {})',
          'console.debug': '(() => {})',
        }
      : {},
  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      onwarn(warning, defaultHandler) {
        if (warning.code === 'COMMONJS_VARIABLE_IN_ESM') {
          return
        }
        defaultHandler(warning)
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/')
          ) {
            return 'vendor-react'
          }

          if (
            id.includes('@tanstack/react-router') ||
            id.includes('@tanstack/router') ||
            id.includes('@tanstack/react-query')
          ) {
            return 'vendor-tanstack'
          }

          if (id.includes('@radix-ui/')) {
            return 'vendor-radix'
          }

          if (id.includes('@dnd-kit/')) {
            return 'vendor-dnd'
          }

          if (
            id.includes('socket.io-client') ||
            id.includes('engine.io-client')
          ) {
            return 'vendor-socket'
          }

          if (id.includes('lucide-react')) {
            return 'vendor-lucide'
          }

          if (id.includes('react-select')) {
            return 'vendor-react-select'
          }

          if (id.includes('date-fns')) {
            return 'vendor-date-fns'
          }

          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'vendor-i18n'
          }

          if (id.includes('react-youtube') || id.includes('youtube-player')) {
            return 'vendor-youtube'
          }

          if (id.includes('node_modules/axios') || id.includes('/axios/')) {
            return 'vendor-axios'
          }

          if (id.includes('dashjs')) {
            return 'vendor-dashjs'
          }

          if (id.includes('@thesvg')) {
            return 'vendor-thesvg'
          }

          if (id.includes('hls.js') || id.includes('/hls/')) {
            return 'vendor-hls'
          }

          if (id.includes('@mux') || id.includes('media-chrome')) {
            return 'vendor-media'
          }

          if (id.includes('react-player')) {
            return 'vendor-player'
          }

          if (id.includes('zod')) {
            return 'vendor-zod'
          }

          return 'vendor-misc'
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
