import {defineConfig} from '@playwright/test'
import base from './playwright.avatars.config'
export default defineConfig({...base,testMatch:['landing.spec.ts'],outputDir:'./test-results/landing'})
