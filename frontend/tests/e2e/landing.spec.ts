import {test,expect,type Page} from '@playwright/test'
import {fixture,noOverflow,owner} from './planner-fixture'
import {mkdir} from 'node:fs/promises'
import {trackersFixture} from './tracker-fixture'
import {defaultConfig,defaultDesign} from '../../src/types/trackers'
async function guest(page:Page){
 const privateCalls:string[]=[]
 await page.route('**/*.supabase.co/**',route=>{privateCalls.push(route.request().url());return route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({message:'No guest access'})})})
 return privateCalls
}
for(const width of [320,390,1440])test(`public landing survives refresh and its links work at ${width}px`,async({page})=>{
 const privateCalls=await guest(page);await page.setViewportSize({width,height:950});await page.goto('/')
 await expect(page.getByRole('heading',{name:'Your journeys, written in time.'})).toBeVisible();await expect(page).toHaveURL(/\/$/)
 await expect(page.getByRole('heading',{name:'Everything your memories deserve'})).toBeVisible();expect(privateCalls).toEqual([])
 await expect(page.locator('html')).toHaveAttribute('data-theme','vintage');await expect(page.locator('.public-brand')).toHaveCSS('color','rgb(101, 67, 43)');await expect(page.locator('.landing-primary').first()).toHaveCSS('background-color','rgb(101, 67, 43)');await expect(page.locator('.landing-page')).toHaveCSS('background-color','rgb(234, 221, 197)')
 await page.reload();await expect(page.getByRole('heading',{name:'Your journeys, written in time.'})).toBeVisible()
 await noOverflow(page);await mkdir('test-results/landing',{recursive:true});await page.screenshot({path:`test-results/landing/landing-${width}.png`,fullPage:true})
 await page.getByRole('main').getByRole('link',{name:'Start Writing',exact:true}).click();await expect(page).toHaveURL(/\/register$/)
 await page.goto('/');await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/\/login$/)
 await page.getByRole('link',{name:'Cronevia home',exact:true}).click();await expect(page.getByRole('heading',{name:'Your journeys, written in time.'})).toBeVisible();expect(privateCalls).toEqual([])
})
test('private routes still require sign-in and preserve the intended destination',async({page})=>{
 const calls=await guest(page)
 for(const path of ['/home','/profile','/journal','/admin','/settings?from=landing']){
  await page.goto(path);await expect(page.getByRole('heading',{name:'Welcome Back'})).toBeVisible()
  expect(new URL(page.url()).pathname).toBe('/login');expect(new URL(page.url()).searchParams.get('redirect')).toBe(path)
 }
 expect(calls).toEqual([])
})
test('signed-in visitors can view the public page and reach their protected home',async({page})=>{
 await fixture(page);await page.goto('/')
 await expect(page.getByRole('heading',{name:'Your journeys, written in time.'})).toBeVisible()
 await expect(page.getByRole('main').getByRole('link',{name:'Open your journal'})).toBeVisible()
 await page.getByRole('main').getByRole('link',{name:'Open your journal'}).click();await expect(page).toHaveURL(/\/home$/)
 await expect(page.getByRole('heading',{name:/Good (morning|afternoon|evening), Local/})).toBeVisible()
 await page.goto('/profile');await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Cronevia',exact:true}).click();await expect(page).toHaveURL(/\/home$/)
})
test('sign-in defaults to home and honors an explicit private destination',async({page})=>{
 const f=await fixture(page)
 await page.addInitScript(()=>{for(const key of Object.keys(localStorage))if(key.endsWith('-auth-token'))localStorage.removeItem(key)})
 for(const destination of ['', '?redirect=%2Fprofile']){
  await page.goto('/login'+destination);await expect(page.getByRole('heading',{name:'Welcome Back'})).toBeVisible()
  await page.getByLabel('Email Address',{exact:true}).fill(f.user.email);await page.getByLabel('Password',{exact:true}).fill('fixture-password-only')
  await page.getByRole('button',{name:'Sign In',exact:true}).click();await expect(page).toHaveURL(destination?/\/profile$/:/\/home$/)
 }
})
test('landing stays public when an existing session cannot pass account verification',async({page})=>{
 await fixture(page);let profiles=0
 await page.route('**/auth/v1/user',route=>route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({message:'private infrastructure detail'})}))
 await page.route('**/rest/v1/profiles?**',route=>{profiles++;return route.fulfill({status:403,body:'{}'})})
 await page.goto('/');await expect(page.getByRole('heading',{name:'Your journeys, written in time.'})).toBeVisible();expect(profiles).toBe(0)
 await expect(page.locator('body')).not.toContainText('private infrastructure detail')
 await page.goto('/home');await expect(page).toHaveURL(/\/login\?redirect=/)
})
test('landing follows a signed-in dark theme without losing readable content',async({page})=>{
 await fixture(page);await page.route('**/rest/v1/user_settings?**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({user_id:owner,theme:'dark'})}));await page.setViewportSize({width:390,height:900});await page.goto('/')
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(page.getByRole('heading',{name:'Your journeys, written in time.'})).toBeVisible();await noOverflow(page)
 await mkdir('test-results/landing',{recursive:true});await page.screenshot({path:'test-results/landing/landing-dark.png',fullPage:true})
})

for(const theme of ['vintage','light','dark'])test('shared app chrome honors '+theme+' and preserves personal notebook colors',async({page})=>{
 const f=await trackersFixture(page),id='88888888-8888-4888-8888-000000000091';await page.route('**/rest/v1/user_settings?**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({user_id:owner,theme})}));f.trackers.push({id,user_id:owner,name:'My personal colors',kind:'habit',unit:'',config:defaultConfig(),design:{...defaultDesign('#6978ba'),color:'#fde5ea'},created_at:new Date().toISOString(),archived:false,is_template:false})
 await page.setViewportSize({width:390,height:900});await page.goto('/trackers/'+id+'?month=2024-01');await expect(page.locator('html')).toHaveAttribute('data-theme',theme)
 const brand=page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Cronevia',exact:true});if(theme==='vintage'){await expect(brand).toHaveCSS('color','rgb(101, 67, 43)');await expect(page.locator('.trackers-page')).toHaveCSS('background-color','rgb(234, 221, 197)');await expect(page.locator('.tracker-detail-toolbar p')).toHaveCSS('color','rgb(113, 88, 62)')}else if(theme==='light'){await expect(brand).toHaveCSS('color','rgb(123, 3, 35)');await expect(page.locator('.trackers-page')).toHaveCSS('background-color','rgb(255, 255, 255)')}else{await expect(page.locator('html')).toHaveCSS('color-scheme','dark');expect(await brand.evaluate(el=>getComputedStyle(el).color)).not.toBe('rgb(101, 67, 43)')}
 await expect(page.locator('.tracker-paper')).toHaveCSS('background-color','rgb(253, 229, 234)');await expect(page.locator('.paper-heading h3')).toHaveCSS('color','rgb(105, 120, 186)');await noOverflow(page);await mkdir('test-results/landing',{recursive:true});await page.screenshot({path:'test-results/landing/app-theme-'+theme+'.png',fullPage:true})
 await page.goto('/');await expect(page.locator('html')).toHaveAttribute('data-theme',theme);await expect(page.getByRole('heading',{name:'Your journeys, written in time.'})).toBeVisible();await noOverflow(page);await page.screenshot({path:'test-results/landing/landing-theme-'+theme+'.png',fullPage:true})
})
