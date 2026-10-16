import {defineConfig} from '@playwright/test'
import base from './playwright.scrapbook.config'
export default defineConfig({...base,testMatch:['planner.spec.ts'],use:{...base.use,hasTouch:true}})
