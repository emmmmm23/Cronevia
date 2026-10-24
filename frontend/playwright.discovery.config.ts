import {defineConfig} from '@playwright/test'
import base from './playwright.itinerary.config'
export default defineConfig({...base,testMatch:['discovery.spec.ts']})
