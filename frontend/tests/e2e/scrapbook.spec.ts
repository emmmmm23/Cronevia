import { test, expect, type Page } from '@playwright/test'
import { loadEnv } from 'vite'
import { mkdir } from 'node:fs/promises'

// Real application routes and real Chromium. All Supabase requests use explicit fixtures.
// These tests do NOT claim hosted storage/database persistence.
const env = loadEnv('development',process.cwd(),'VITE_')
const host = new URL(env.VITE_SUPABASE_URL).hostname
const owner = '11111111-1111-4111-8111-111111111111', recordId = '22222222-2222-4222-8222-222222222222'
const photoId = '33333333-3333-4333-8333-333333333333'
const user = {id:owner,email:'scrapbook@example.test',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-10-14T00:00:00Z'}
const empty = () => ({version:1,pages:[{id:'page-left',elements:[]},{id:'page-right',elements:[]}]})

async function fixture(page: Page, resource: 'journal'|'memories') {
  const table = resource === 'journal' ? 'journal_entries' : 'memories'
  let record: any = {id:recordId,user_id:owner,title:'An afternoon by the lake',content:'We followed the path beside the water and stopped to watch the clouds.\n\nA small, ordinary afternoon worth keeping.',description:'We followed the path beside the water and stopped to watch the clouds.\n\nA small, ordinary afternoon worth keeping.',entry_date:'2026-10-14',memory_date:'2026-10-14',tags:['weekend'],visibility:'private',scrapbook_layout:empty()}
  let stickers: any[] = [], customEnabled=false, failLoad=false, lostDraftResponse=false; const draftIds=new Set<string>();let failSign=false, customLoadDelay:Promise<void>|undefined, releaseCustomLoad:()=>void=()=>{}
  let media: any[] = [], image = Buffer.from(''), writes = 0, creates = 0, failUpload = false, failSave = false
  const session = {access_token:`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:owner,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated',aud:'authenticated'})).toString('base64url')}.fixture`,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}
  await page.addInitScript(({key,session}) => localStorage.setItem(key,JSON.stringify(session)),{key:`sb-${host.split('.')[0]}-auth-token`,session})
  await page.route(`https://${host}/**`,async route => {
    const url = new URL(route.request().url()), method = route.request().method()
    const json = (body:unknown,status=200) => route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)})
    if(url.pathname.endsWith('/auth/v1/user')) return json(user)
    if(url.pathname.includes('/storage/v1/object/sign/') && method==='GET') return route.fulfill({contentType:'image/png',body:image})
    if(url.pathname.includes('/storage/v1/object/sign/')) {if(failSign){failSign=false;return json({message:'Signing failed'},500)} return json({signedURL:'/object/sign/cronevia-media/fixture.png?token=fixture'})}
    if(url.pathname.includes('/storage/v1/object/') && method==='POST') {
      if(failUpload) {failUpload=false;return json({message:'Fixture upload failed',error:'Upload failed'},500)}
      return json({Key:owner+'/fixture.png'})
    }
    if(url.pathname.endsWith('/rest/v1/profiles')) return json({id:owner,user_id:owner,full_name:'Notebook tester',username:'tester',role:'user',account_status:'active'})
    if(url.pathname.endsWith('/rest/v1/sticker_assets')) {
      if(method==='POST') {const asset={...route.request().postDataJSON(),created_at:'2026-10-14T00:00:00Z'};stickers=[asset,...stickers.filter(s=>s.id!==asset.id)];return json(asset)}
      const loaded=[...stickers];if(customLoadDelay){const wait=customLoadDelay;customLoadDelay=undefined;await wait}
      return customEnabled ? json(loaded) : json({message:'Bucket not found'},400)
    }
    if(url.pathname.endsWith('/rest/v1/rpc/create_journal_draft')) {
      const body=route.request().postDataJSON()
      if(!draftIds.has(body.draft_id)){draftIds.add(body.draft_id);creates++;record={...record,id:body.draft_id,title:body.draft_title,content:body.draft_content,entry_date:body.draft_date}}
      if(lostDraftResponse){lostDraftResponse=false;return json({message:'Response lost'},500)}
      return json(record)
    }
    if(url.pathname.endsWith('/rest/v1/journal_sticker_placements')) return failLoad ? json({message:'missing journal_sticker_placements',code:'PGRST205'},404) : json([])
    if(url.pathname.endsWith('/rest/v1/media')) {
      if(method==='POST') {media=[{...route.request().postDataJSON(),id:photoId,sort_order:0}];return json(media[0])}
      return json(media)
    }
    if(url.pathname.endsWith('/rest/v1/'+table)) {
      if(method==='PATCH' || method==='POST') {
        if(failSave) {failSave=false;return json({message:'Fixture save rejected',code:'23514'},400)}
        const body=route.request().postDataJSON(); record={...record,...body};writes++;if(method==='POST')creates++
      }
      return json(record)
    }
    return json([])
  })
  return {delayCustomLoad(){customLoadDelay=new Promise<void>(resolve=>{releaseCustomLoad=resolve})},releaseCustomLoad(){releaseCustomLoad()},failSigning(){failSign=true},enableCustom(){customEnabled=true},failLoad(value:boolean){failLoad=value;if(value)record.scrapbook_layout=null},loseDraftResponse(){lostDraftResponse=true},get stickers(){return stickers},get record(){return record},get writes(){return writes},get creates(){return creates},failUpload(){failUpload=true},failSave(){failSave=true},setImage(value:Buffer){image=value}}
}
async function landscape(page: Page) {
  const data = await page.evaluate(() => {
    const canvas=document.createElement('canvas');canvas.width=600;canvas.height=400
    const c=canvas.getContext('2d')!;c.fillStyle='#bad7db';c.fillRect(0,0,600,400)
    c.fillStyle='#f9dfa2';c.beginPath();c.arc(465,85,40,0,Math.PI*2);c.fill()
    c.fillStyle='#718e71';c.beginPath();c.moveTo(0,240);c.lineTo(190,100);c.lineTo(350,235);c.lineTo(520,145);c.lineTo(600,230);c.lineTo(600,400);c.lineTo(0,400);c.fill()
    c.fillStyle='#678e9d';c.fillRect(0,265,600,135);c.strokeStyle='#e5dcc0';c.lineWidth=3
    for(let i=0;i<8;i++){c.beginPath();c.moveTo(30+i*51,295+i%3*22);c.lineTo(130+i*51,295+i%3*22);c.stroke()}
    return canvas.toDataURL('image/png').split(',')[1]
  });return Buffer.from(data,'base64')
}
async function capture(page:Page,options:{path:string;fullPage:boolean}) {
  await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo({top:0,behavior:'instant'});await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())))})
  await page.screenshot(options)
}
async function drag(page: Page, locator: ReturnType<Page['locator']>, dx:number,dy:number) {
  await locator.scrollIntoViewIfNeeded();const b=(await locator.boundingBox())!
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+dx,b.y+b.height/2+dy,{steps:8});await page.mouse.up()
}
for (const resource of ['journal','memories'] as const) {
  test(`${resource}: paper, transforms, photo, save/reload, cancel and mobile (mock API)`,async ({page}) => {
    const f=await fixture(page,resource)
    await page.goto(`/${resource}/${recordId}`)
    await page.getByRole('button',{name:resource==='journal'?'Edit journal':'Edit memory',exact:true}).click()
    await page.getByRole('button',{name:'Decorate',exact:true}).click()
    await expect(page.getByRole('tab',{name:'Library',exact:true})).toHaveAttribute('aria-selected','true')
    await expect(page.locator('.thumbnails img')).toHaveCount(12)
    expect(await page.locator('.thumbnails img').evaluateAll(imgs=>imgs.every(i=>(i as HTMLImageElement).naturalWidth>0))).toBe(true)
    await page.getByRole('button',{name:'Add flower-01.svg',exact:true}).click()
    const left=page.getByRole('article',{name:'Left notebook page'}),right=page.getByRole('article',{name:'Right notebook page'})
    await expect(left.locator('.decoration')).toHaveCount(1)
    await drag(page,left.locator('.decoration'),-80,110)
    const before=await left.locator('.decoration').getAttribute('style')
    await drag(page,page.getByRole('button',{name:'Resize decoration'}),25,20)
    const resized = await left.locator('.decoration').getAttribute('style')
    await page.getByRole('button',{name:'Undo',exact:true}).click()
    await expect(left.locator('.decoration')).toHaveAttribute('style',before!)
    await page.getByRole('button',{name:'Redo',exact:true}).click()
    await expect(left.locator('.decoration')).toHaveAttribute('style',resized!)
    await left.locator('.decoration').click()
    await drag(page,page.getByRole('button',{name:'Rotate decoration'}),35,15)
    expect(await left.locator('.decoration').getAttribute('style')).not.toBe(before)
    await page.getByRole('button',{name:'Right page',exact:true}).click()
    await page.getByRole('button',{name:'Add star-01.svg',exact:true}).click()
    await expect(right.locator('.decoration')).toHaveCount(1)
    const png=await landscape(page);f.setImage(png)
    await page.getByLabel('Upload photo',{exact:true}).setInputFiles({name:'lake.png',mimeType:'image/png',buffer:png})
    await expect(right.locator('.photo')).toHaveCount(1)
    await page.getByLabel('Decoration rotation',{exact:true}).fill('-12');await page.getByLabel('Decoration rotation',{exact:true}).blur()
    await page.getByLabel('Photo frame',{exact:true}).selectOption('polaroid')
    await page.getByRole('button',{name:'Add heart-01.svg',exact:true}).click()
    await page.locator('.arrange-menu summary').click()
    await page.getByRole('button',{name:'Bring to front',exact:true}).click()
    await drag(page,right.locator('.decoration.selected'),65,40)
    await page.getByRole('button',{name:'Duplicate',exact:true}).click()
    await expect(right.locator('.decoration')).toHaveCount(4)
    await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(right.locator('.decoration')).toHaveCount(3)
    await page.getByRole('button',{name:'Redo',exact:true}).click();await expect(right.locator('.decoration')).toHaveCount(4)
    await right.locator('.decoration').last().click()
    await page.locator('.arrange-menu').evaluate(el=>el.setAttribute('open',''))
    await page.getByRole('button',{name:'Move to left page',exact:true}).click();await expect(left.locator('.decoration')).toHaveCount(2)
    await page.getByRole('button',{name:'Delete placement',exact:true}).click();await expect(left.locator('.decoration')).toHaveCount(1)
    const compositionStyles = await page.locator('.decoration').evaluateAll(elements => elements.map(e=>e.getAttribute('style')))
    await left.locator('.decoration').click()
    await expect(page.getByRole('button',{name:'Rotate decoration'})).toBeVisible()
    await mkdir('test-results/evidence',{recursive:true})
    await capture(page,{path:`test-results/evidence/${resource}-selected.png`,fullPage:true})
    await page.getByRole('button',{name:'Done Decorating',exact:true}).click()
    await expect(page.locator('.handle,.context-tools,.library')).toHaveCount(0)
    await expect(page.getByLabel('Your story',{exact:true})).toBeEditable()
    await page.getByLabel('Your story',{exact:true}).focus()
    await page.keyboard.press('Delete')
    await expect(page.locator('.decoration')).toHaveCount(4)
    await page.getByRole('button',{name:resource==='journal'?'Save entry':'Save memory',exact:true}).click()
    await expect(page.getByRole('button',{name:resource==='journal'?'Edit journal':'Edit memory',exact:true})).toBeVisible()
    const saved=JSON.parse(JSON.stringify(f.record.scrapbook_layout))
    expect(saved.pages[1].elements.find((e:any)=>e.type==='photo')).toMatchObject({assetId:photoId,rotation:-12,frame:'polaroid',aspectRatio:1.5})
    expect(JSON.stringify(saved)).not.toMatch(/blob:|pending:|https:/)
    await page.reload()
    await expect(page.locator('.decoration')).toHaveCount(4)
    await expect(page.locator('.handle,.workbench,.context-tools,.library')).toHaveCount(0)
    expect(await page.locator('.decoration').evaluateAll(elements=>elements.map(e=>e.getAttribute('style')))).toEqual(compositionStyles)
    await expect(page.locator('.photo img')).toBeVisible()
    expect(await page.locator('.photo img').evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    await mkdir('test-results/evidence',{recursive:true})
    await capture(page,{path:`test-results/evidence/${resource}-desktop.png`,fullPage:true})
    await page.getByRole('button',{name:resource==='journal'?'Edit journal':'Edit memory',exact:true}).click()
    await page.getByLabel('Title',{exact:true}).fill('Unsaved title')
    await page.getByRole('button',{name:'Decorate',exact:true}).click()
    await page.getByRole('button',{name:'Add tape-01.svg',exact:true}).click()
    await page.getByRole('button',{name:'Cancel',exact:true}).click()
    await expect(page.locator('.decoration')).toHaveCount(4)
    await expect(page.getByRole('heading',{name:'An afternoon by the lake'})).toBeVisible()
    expect(f.record.scrapbook_layout).toEqual(saved)
    await page.setViewportSize({width:390,height:844})
    const lb=(await left.boundingBox())!,rb=(await right.boundingBox())!
    expect(rb.y).toBeGreaterThan(lb.y+lb.height)
    expect(Math.abs(lb.width/lb.height-.75)).toBeLessThan(.01)
    await expect(page.locator('.decoration')).toHaveCount(4)
    await capture(page,{path:`test-results/evidence/${resource}-mobile.png`,fullPage:true})
  })
}

test('new journal upload retry and rejected save retain the draft without duplicate records',async ({page})=>{
  const f=await fixture(page,'journal');await page.goto('/journal/new')
  await page.getByLabel('Title',{exact:true}).fill('Upload retry draft');await page.getByLabel('Your story',{exact:true}).fill('Keep this writing through failures.')
  await page.getByRole('button',{name:'Decorate',exact:true}).click()
  await page.getByRole('button',{name:'Add leaf-01.svg',exact:true}).click()
  const png=await landscape(page);f.setImage(png);f.failUpload()
  await page.getByLabel('Upload photo',{exact:true}).setInputFiles({name:'lake.png',mimeType:'image/png',buffer:png})
  await page.getByLabel('Photo frame',{exact:true}).selectOption('polaroid')
  await page.getByRole('button',{name:'Save entry',exact:true}).click()
  await expect(page.getByRole('button',{name:'Retry upload',exact:true})).toBeVisible()
  await expect(page.locator('.photo')).toHaveCount(1)
  await page.getByRole('button',{name:'Retry upload',exact:true}).click()
  await expect(page.getByRole('button',{name:'Retry upload',exact:true})).toHaveCount(0)
  f.failSave();await page.getByRole('button',{name:'Save entry',exact:true}).click()
  await expect(page.getByRole('alert').filter({hasText:'Your entry couldn’t be saved'})).toBeVisible()
  await expect(page.getByLabel('Your story',{exact:true})).toHaveValue('Keep this writing through failures.')
  await page.getByRole('button',{name:'Save entry',exact:true}).click()
  await expect(page.getByRole('button',{name:'Edit journal',exact:true})).toBeVisible()
  expect(f.creates).toBe(1)
  expect(f.record.scrapbook_layout.pages[0].elements).toHaveLength(2)
})

test('custom sticker previews, signing retry, new-entry synchronization and reload (mock API)',async({page})=>{
  const f=await fixture(page,'journal');f.enableCustom();f.delayCustomLoad()
  await page.goto('/journal/new')
  await expect(page.getByLabel('Title',{exact:true})).toBeVisible()
  await page.evaluate(()=>document.fonts.ready)
  await mkdir('test-results/evidence',{recursive:true})
  await capture(page,{path:'test-results/evidence/journal-empty.png',fullPage:true})
  await page.getByLabel('Title',{exact:true}).fill('Pressed flowers')
  await page.getByLabel('Your story',{exact:true}).fill('A few things I want to keep from today.')
  await page.getByRole('button',{name:'Decorate',exact:true}).click()
  await page.getByRole('button',{name:'Add flower-01.svg',exact:true}).click()
  await page.getByRole('button',{name:'Undo',exact:true}).click()
  await expect(page.locator('.decoration')).toHaveCount(0)
  await expect(page.getByRole('status')).toHaveText('Unsaved changes')
  await page.getByRole('button',{name:'Redo',exact:true}).click()
  await page.getByRole('tab',{name:'My stickers',exact:true}).click()
  const png=Buffer.from(await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=200;c.height=200
    const x=c.getContext('2d')!;x.fillStyle='#87946e';x.beginPath();x.ellipse(100,100,40,70,.5,0,Math.PI*2);x.fill()
    x.strokeStyle='#f6edcc';x.lineWidth=4;x.beginPath();x.moveTo(72,155);x.lineTo(126,48);x.stroke()
    return c.toDataURL('image/png').split(',')[1]
  }),'base64');f.setImage(png);f.failUpload()
  await page.getByLabel('Upload custom sticker',{exact:true}).setInputFiles({name:'leaf.png',mimeType:'image/png',buffer:png})
  await expect(page.locator('.decoration')).toHaveCount(2)
  await expect(page.getByRole('button',{name:'Place custom sticker',exact:true})).toHaveCount(1)
  await expect(page.getByRole('button',{name:'Retry upload',exact:true})).toBeVisible()
  await page.getByLabel('Decoration rotation',{exact:true}).fill('18')
  await page.getByLabel('Decoration rotation',{exact:true}).blur()
  const style=await page.locator('.decoration.selected').getAttribute('style')
  await capture(page,{path:'test-results/evidence/custom-upload-failure.png',fullPage:true})
  f.failSigning()
  await page.getByRole('button',{name:'Retry upload',exact:true}).click()
  await expect(page.getByRole('button',{name:'Retry upload',exact:true})).toBeVisible()
  expect(f.stickers).toHaveLength(1)
  await page.getByRole('button',{name:'Retry upload',exact:true}).click()
  await expect(page.getByRole('button',{name:'Retry upload',exact:true})).toHaveCount(0)
  f.releaseCustomLoad()
  await expect(page.locator('.decoration.selected')).toHaveAttribute('style',style!)
  await expect(page.getByRole('button',{name:'Place custom sticker',exact:true})).toBeEnabled()
  await capture(page,{path:'test-results/evidence/custom-upload-success.png',fullPage:true})
  f.loseDraftResponse()
  await page.getByRole('button',{name:'Save entry',exact:true}).click()
  await expect(page.getByRole('alert').filter({hasText:'Your entry couldn’t be saved'})).toBeVisible()
  await expect(page.locator('.decoration')).toHaveCount(2)
  await page.getByRole('button',{name:'Save entry',exact:true}).click()
  await expect(page.getByRole('button',{name:'Edit journal',exact:true})).toBeVisible()
  expect(f.creates).toBe(1);expect(f.stickers).toHaveLength(1)
  expect(f.record.scrapbook_layout.pages[0].elements[1]).toMatchObject({assetId:f.stickers[0].id,rotation:18})
  await page.reload()
  await expect(page.locator('.decoration')).toHaveCount(2)
  expect(await page.locator('.decoration').last().getAttribute('style')).toBe(style)
  await page.getByRole('button',{name:'Edit journal',exact:true}).click()
  await page.getByRole('button',{name:'Decorate',exact:true}).click()
  await page.setViewportSize({width:390,height:844})
  await page.locator('.decoration').last().click()
  await page.getByRole('button',{name:'Keyboard help',exact:true}).click()
  await capture(page,{path:'test-results/evidence/journal-mobile-decorating.png',fullPage:true})
})

test('failed initial load cannot overwrite a saved journal and can be retried',async({page})=>{
  const f=await fixture(page,'journal');f.failLoad(true)
  await page.goto('/journal/'+recordId)
  await expect(page.getByRole('alert')).toContainText('Saving is paused')
  await expect(page.getByRole('button',{name:'Save entry',exact:true})).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Edit journal',exact:true})).toHaveCount(0)
  expect(f.writes).toBe(0)
  f.failLoad(false);await page.getByRole('button',{name:'Retry loading',exact:true}).click()
  await expect(page.getByRole('button',{name:'Edit journal',exact:true})).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('All changes saved')
})

test('long writing keeps stable paper geometry and keyboard editing respects text fields',async({page})=>{
  const f=await fixture(page,'journal');f.enableCustom()
  await page.goto('/journal/new')
  await page.getByLabel('Title',{exact:true}).fill('A longer day')
  const story=page.getByLabel('Your story',{exact:true}), paper=page.getByRole('article',{name:'Left notebook page'})
  const original=(await paper.boundingBox())!
  const text=Array.from({length:100},(_,i)=>'Moment '+(i+1)+': a detail worth keeping.').join('\n\n')
  await story.fill(text)
  expect((await paper.boundingBox())!.height).toBe(original.height)
  expect(await story.evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true)
  await story.evaluate(e=>e.scrollTop=e.scrollHeight)
  await page.getByRole('button',{name:'Decorate',exact:true}).click()
  await page.getByRole('button',{name:'Add leaf-01.svg',exact:true}).click()
  const item=paper.locator('.decoration')
  await item.focus()
  const before=await item.getAttribute('style')
  await page.keyboard.press('ArrowRight');await page.keyboard.press(']');await page.keyboard.press('+')
  expect(await item.getAttribute('style')).not.toBe(before)
  await page.keyboard.press('Control+z');await page.keyboard.press('Control+z');await page.keyboard.press('Control+z')
  await expect(item).toHaveAttribute('style',before!)
  await item.focus();await page.keyboard.press('Escape')
  await expect(page.locator('.handle')).toHaveCount(0)
  await page.getByRole('button',{name:'Write',exact:true}).click()
  await story.focus();await page.keyboard.press('Delete')
  await expect(item).toHaveCount(1)
  await expect(story).toHaveValue(text)
  await page.getByRole('button',{name:'Save entry',exact:true}).click()
  await expect(page.getByRole('button',{name:'Edit journal',exact:true})).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Your story',{exact:true})).toHaveText(text)
  expect(await page.getByLabel('Your story',{exact:true}).evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true)
})
