import { defineConfig } from '@playwright/test'
import base from './playwright.scrapbook.config'
export default defineConfig({ ...base, testMatch: ['trackers.spec.ts','tracker-grid.spec.ts'], use: { ...base.use, baseURL: 'http://127.0.0.1:5177' }, webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5177 --strictPort', url: 'http://127.0.0.1:5177', reuseExistingServer: true } })
