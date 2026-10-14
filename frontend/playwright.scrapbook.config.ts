import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e', testMatch: ['scrapbook.spec.ts','planner.spec.ts'], timeout: 60000,
  expect: {timeout:15000}, workers: 1, reporter: 'list', outputDir: './test-results/scrapbook',
  use: { channel: 'msedge', baseURL: 'http://127.0.0.1:5178', viewport: {width:1440,height:1100}, screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5178', url: 'http://127.0.0.1:5178', reuseExistingServer: false },
})
