import { defineConfig } from '@playwright/test'
import base from './playwright.scrapbook.config'
export default defineConfig({ ...base, grep: /destination picker/, use: { ...base.use, hasTouch: true } })
