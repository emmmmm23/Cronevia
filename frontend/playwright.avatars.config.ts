import {defineConfig} from '@playwright/test'
import base from './playwright.scrapbook.config'
export default defineConfig({...base,testMatch:['avatars.spec.ts'],outputDir:'./test-results/avatars',use:{...base.use,baseURL:'http://127.0.0.1:5176'},webServer:{command:'npm run dev -- --host 127.0.0.1 --port 5176 --strictPort',url:'http://127.0.0.1:5176',reuseExistingServer:true}})
