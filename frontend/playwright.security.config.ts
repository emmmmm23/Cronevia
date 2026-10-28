import {defineConfig} from '@playwright/test'
import base from './playwright.trackers.config'
export default defineConfig({...base,testMatch:['security.spec.ts']})
