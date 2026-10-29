import {test,expect,type Page} from '@playwright/test'
import {trackersFixture} from './tracker-fixture'
import {noOverflow,landscape,owner} from './planner-fixture'
import {defaultConfig,defaultDesign} from '../../src/types/trackers'
import {mkdir} from 'node:fs/promises'
const steps='77777777-7777-4777-8777-777777777771',sleep='77777777-7777-4777-8777-777777777772',day='2024-01-02'
async function setup(page:Page){const f=await trackersFixture(page);for(const [id,kind,name,unit,accent] of [[steps,'steps','Steps','steps','#b68b43'],[sleep,'sleep','Sleep','hours','#6978ba']])f.trackers.push({id,user_id:owner,name,kind,unit,config:defaultConfig(),design:defaultDesign(accent),created_at:new Date().toISOString(),archived:false,is_template:false});return f}
async function selectDay(page:Page){if(page.viewportSize()!.width<1024)await page.getByRole('button',{name:'Choose '+day,exact:true}).click()}
async function open(page:Page,id:string){await page.goto('/trackers/'+id+'?month=2024-01');await selectDay(page)}
const cell=(page:Page,col:number,date=day)=>page.locator(`[data-grid-day="${date}"][data-grid-col="${col}"]`)
async function save(page:Page){await page.getByRole('button',{name:'Save selection',exact:true}).click();await expect(page.locator('.grid-status')).toContainText('Selection saved')}
for(const width of [390,1440])test(`walk totals are selected directly and survive failure, refresh and cancel at ${width}px`,async({page})=>{
 const f=await setup(page);await page.setViewportSize({width,height:1000});await open(page,steps)
 await cell(page,9).click();await expect(page.locator('.grid-edit-bar').getByLabel('Exact total')).toHaveValue('5000');await expect(page.getByRole('dialog')).toHaveCount(0)
 f.failNextLog();await page.getByRole('button',{name:'Save selection'}).click();await expect(page.locator('.grid-error')).toContainText('connection paused');expect(f.logs).toHaveLength(0);await expect(cell(page,9)).toHaveAttribute('aria-pressed','true')
 await save(page);expect(f.logs[0].values.value).toBe(5000);await page.reload();await selectDay(page);await expect(cell(page,9)).toHaveAttribute('aria-pressed','true')
 await cell(page,3).click();await page.locator('.grid-edit-bar').getByRole('button',{name:'Cancel',exact:true}).click();expect(f.logs[0].values.value).toBe(5000);await expect(cell(page,9)).toHaveAttribute('aria-pressed','true')
 await cell(page,1).press('Space');await save(page);expect(f.logs).toHaveLength(1);expect(f.logs[0].values.value).toBe(1000)
 await page.locator('.grid-edit-bar').getByRole('button',{name:'0 steps',exact:true}).click();await save(page);expect(f.logs[0].values.value).toBe(0);await expect(page.locator('.number-row.zero,.mobile-calendar button.zero')).toHaveCount(1);await noOverflow(page)
 await mkdir('test-results/trackers',{recursive:true});await page.screenshot({path:`test-results/trackers/steps-edit-${width}.png`,fullPage:true})
})
for(const width of [390,1440])test(`sleep uses AM/PM boxes, overnight intervals and a notes/photo-only modal at ${width}px`,async({page})=>{
 const f=await setup(page);await page.setViewportSize({width,height:1000});await open(page,sleep)
 await expect(page.locator('.sleep-periods strong,.mobile-period h5').first()).toContainText('midnight–noon');await expect(page.locator('.sleep-periods strong,.mobile-period h5').last()).toContainText('noon–midnight')
 await cell(page,23).click();await cell(page,0).scrollIntoViewIfNeeded()
 const first=await cell(page,0).boundingBox(),last=await cell(page,3).boundingBox();await page.mouse.move(first!.x+first!.width/2,first!.y+first!.height/2);await page.mouse.down();await page.mouse.move(last!.x+last!.width/2,last!.y+last!.height/2,{steps:5});await page.mouse.up()
 for(const col of [4,5,6])await cell(page,col).click();await save(page)
 expect(f.logs).toHaveLength(1);expect(f.logs[0].started_at).toBe('2024-01-01T23:00:00.000Z');expect(f.logs[0].ended_at).toBe('2024-01-02T07:00:00.000Z')
 await page.getByRole('button',{name:'Note / photo',exact:true}).click();const modal=page.getByRole('dialog',{name:'Sleep · Notes & photo',exact:true});await expect(modal.locator('input:not([type=file]),select')).toHaveCount(0)
 await modal.getByLabel('A little note',{exact:true}).fill('A quiet night.');const image=await landscape(page);f.image(image);await modal.locator('input[type=file]').setInputFiles({name:'morning.png',mimeType:'image/png',buffer:image});await expect(modal.locator('.note-photo img')).toBeVisible();await modal.getByRole('button',{name:'Save note & photo'}).click();await expect(modal).toHaveCount(0)
 expect(f.logs[0].values.note).toBe('A quiet night.');expect(f.logs[0].values.photo).toContain('/trackers/');await page.reload();await selectDay(page);await expect(cell(page,6)).toHaveAttribute('aria-pressed','true')
 await cell(page,2).click();await page.locator('.grid-edit-bar').getByRole('button',{name:'Cancel',exact:true}).click();expect(f.logs).toHaveLength(1);expect(f.logs[0].values.note).toBe('A quiet night.')
 await noOverflow(page);await mkdir('test-results/trackers',{recursive:true});await page.getByRole('button',{name:'Note / photo',exact:true}).click();await page.screenshot({path:`test-results/trackers/sleep-notes-${width}.png`,fullPage:true})
})
test('keyboard boxes expose pressed states and future dates stay read-only',async({page})=>{
 await setup(page);await open(page,sleep);await cell(page,0).focus();await cell(page,0).press('Space');await cell(page,0).press('ArrowRight');await expect(cell(page,1)).toBeFocused();await cell(page,1).press('Space');await expect(cell(page,1)).toHaveAttribute('aria-pressed','true');await save(page)
 await page.goto('/trackers/'+steps+'?month=2100-01');await expect(page.locator('.grid-box').first()).toBeDisabled()
})
test('notes stay compact and readable in dark mode on a narrow screen',async({page})=>{
 const f=await setup(page);await page.route('**/rest/v1/user_settings?**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({user_id:owner,theme:'dark'})}))
 const now=new Date().toISOString();f.logs.push({id:'77777777-7777-4777-8777-777777777779',tracker_id:sleep,user_id:owner,log_date:day,values:{awakeMinutes:0,sleepType:'night'},started_at:'2024-01-02T00:00:00Z',ended_at:'2024-01-02T08:00:00Z',timezone:'UTC',config_snapshot:defaultConfig(),unit_snapshot:'hours',created_at:now,updated_at:now})
 await page.setViewportSize({width:390,height:850});await open(page,sleep);await page.getByRole('button',{name:'Choose '+day,exact:true}).click();await page.getByRole('button',{name:'Note / photo',exact:true}).click()
 const modal=page.getByRole('dialog');await expect(modal.locator('textarea')).toHaveCount(1);await expect(modal.locator('input')).toHaveCount(1);await expect(modal.getByRole('button',{name:'Save note & photo'})).toBeVisible();await noOverflow(page)
 expect(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await mkdir('test-results/trackers',{recursive:true});await page.screenshot({path:'test-results/trackers/notes-dark-390.png'})
})
test('a stale notes modal cannot overwrite newer sleep times from another tab',async({page})=>{
 const f=await setup(page);await open(page,sleep);await cell(page,0).click();await save(page);await page.getByRole('button',{name:'Note / photo',exact:true}).click()
 f.logs[0].ended_at='2024-01-02T02:00:00.000Z';f.logs[0].updated_at=new Date(Date.now()+10000).toISOString()
 const modal=page.getByRole('dialog');await modal.getByLabel('A little note',{exact:true}).fill('Keep this draft');await modal.getByRole('button',{name:'Save note & photo'}).click();await expect(modal.getByRole('alert')).toContainText('another tab');await expect(modal.getByLabel('A little note',{exact:true})).toHaveValue('Keep this draft');expect(f.logs[0].ended_at).toBe('2024-01-02T02:00:00.000Z');expect(f.logs[0].values.note).toBeUndefined()
})
