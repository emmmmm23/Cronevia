import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import themeColors from './scripts/theme-colors.mjs'
import {validatePublicEnv} from './scripts/public-env.mjs'
import journalInvitesDev from './scripts/journal-invites-dev.mjs'

export default defineConfig(({mode})=>{
  validatePublicEnv(loadEnv(mode,process.cwd(),'VITE_'))
  return {
  base: '/',
  plugins: [
    journalInvitesDev(loadEnv(mode,process.cwd(),'')),
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
  }
})
