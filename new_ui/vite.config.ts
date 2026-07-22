import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { resolve } from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({ autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
    visualizer({ open: true, filename: 'dist/stats.html', gzipSize: true }),
  ],
  define: {
    // 'console.log': '(() => {})',
    // 'console.info': '(() => {})',
    // 'console.debug': '(() => {})',
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          // Исключаем файлы проекта из вендор-чанков
          if (!id.includes('node_modules')) {
            return
          }

          // ─── React core ───────────────────────────────────────────
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/')
          ) {
            return 'vendor-react'
          }

          // ─── TanStack ─────────────────────────────────────────────
          if (
            id.includes('@tanstack/react-router') ||
            id.includes('@tanstack/router') ||
            id.includes('@tanstack/react-query')
          ) {
            return 'vendor-tanstack'
          }

          // ─── Radix UI ─────────────────────────────────────────────
          if (id.includes('@radix-ui/')) {
            return 'vendor-radix'
          }

          // ─── DnD Kit ──────────────────────────────────────────────
          if (id.includes('@dnd-kit/')) {
            return 'vendor-dnd'
          }

          // ─── Socket.io ────────────────────────────────────────────
          if (
            id.includes('socket.io-client') ||
            id.includes('engine.io-client')
          ) {
            return 'vendor-socket'
          }

          // ─── Lucide (иконки) ──────────────────────────────────────
          if (id.includes('lucide-react')) {
            return 'vendor-lucide'
          }

          // ─── Остальные специфичные библиотеки ─────────────────────
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

          // ─── Всё остальное из node_modules ────────────────────────
          return 'vendor-misc'
        },
      },
    },
  },
  rules: {
    '@typescript-eslint/no-unnecessary-condition': 'none',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
