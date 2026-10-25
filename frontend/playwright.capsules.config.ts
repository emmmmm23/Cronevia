import { defineConfig } from '@playwright/test'
import base from './playwright.scrapbook.config'
export default defineConfig({ ...base, testMatch: ['capsules.spec.ts'] })
