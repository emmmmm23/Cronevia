import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import themeColors from './scripts/theme-colors.mjs'

export default defineConfig({
  base: '/',
  plugins: [
    vue(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  css: { postcss: { plugins: [themeColors()] } },
  build: { sourcemap: false },
  esbuild: { drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [] },
})
