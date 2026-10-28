import {test,expect,type Page} from '@playwright/test'
import {fixture,owner,landscape,noOverflow} from './planner-fixture'
import {mkdir} from 'node:fs/promises'
async function avatarFixture(page:Page,theme='vintage'){
 const core=await fixture(page),objects=new Map<string,Buffer>(),calls={uploads:[] as string[],deleted:[] as string[],saved:[] as any[]}
 let profile:any={id:owner,user_id:owner,full_name:'Juan Miguel',username:'juan',email:core.user.email,avatar_url:null,avatar_storage_path:null,avatar_source_path:null,avatar_revision:0,role:'user',account_status:'active',created_at:'2026-10-28T00:00:00Z'},failSave=false,failUpload=false,loseResponse=false,broken=false
 const json=(route:any,value:any,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)})
 await page.route('**/rest/v1/profiles?**',route=>{if(route.request().method()==='PATCH')Object.assign(profile,route.request().postDataJSON());return json(route,profile)})
 await page.route('**/rest/v1/user_settings?**',route=>json(route,{user_id:owner,theme,timezone:'Asia/Manila'}))
 await page.route('**/rest/v1/rpc/save_profile_avatar',route=>{
  const body=route.request().postDataJSON();calls.saved.push(body)
  if(failSave){failSave=false;return json(route,{message:'Private diagnostic must not reach UI'},400)}
  if(body.expected_revision!==profile.avatar_revision)return json(route,{code:'40001',message:'Stale revision'},409)
  const retired=[profile.avatar_storage_path,profile.avatar_source_path]
  profile={...profile,avatar_appearance:body.appearance,avatar_storage_path:body.photo_path,avatar_source_path:body.source_path,avatar_revision:profile.avatar_revision+1,avatar_url:null}
  if(loseResponse){loseResponse=false;return json(route,{message:'Lost reply'},500)}
  return json(route,{profile,retired_paths:retired})
 })
 await page.route('**/storage/v1/**',route=>{
  const req=route.request(),url=new URL(req.url()),path=decodeURIComponent(url.pathname.split('cronevia-avatars/')[1]||''),method=req.method()
  if(method==='POST'&&url.pathname.includes('/sign/'))return json(route,{signedURL:`/object/sign/cronevia-avatars/${path}?token=fixture`})
  if(method==='GET'){if(broken||!objects.has(path))return route.fulfill({status:404});return route.fulfill({contentType:path.endsWith('.png')?'image/png':'image/webp',body:objects.get(path)!})}
  if(method==='DELETE'){const paths=req.postDataJSON().prefixes||[];for(const p of paths){calls.deleted.push(p);if(p!==profile.avatar_storage_path&&p!==profile.avatar_source_path)objects.delete(p)}return json(route,paths.map((name:string)=>({name}))) }
  if(failUpload){failUpload=false;return json(route,{message:'Upload failed'},500)}
  const payload=req.postDataBuffer()!,start=payload.indexOf('RIFF'),length=start>=0?payload.readUInt32LE(start+4)+8:0
  objects.set(path,start>=0?payload.subarray(start,start+length):payload);calls.uploads.push(path)
  return json(route,{Key:`cronevia-avatars/${path}`,Id:'fixture'})
 })
 await page.route('**/auth/v1/logout?**',route=>route.fulfill({status:204}))
 return {core,calls,objects,profile:()=>profile,failSave(){failSave=true},failUpload(){failUpload=true},loseResponse(){loseResponse=true},broken(){broken=true}}
}
const editor=(page:Page)=>page.getByRole('dialog',{name:'Photo & frame',exact:true})
async function open(page:Page){await page.getByRole('button',{name:'Edit photo & frame',exact:true}).click();await expect(editor(page)).toBeVisible()}
async function upload(page:Page,buffer:Buffer,mimeType='image/png',name='portrait.png'){await editor(page).locator('input[type=file]').setInputFiles({name,mimeType,buffer});await expect(editor(page).getByText('Preparing photo…',{exact:true})).toHaveCount(0)}
async function save(page:Page){await editor(page).getByRole('button',{name:'Save appearance',exact:true}).click();await expect(editor(page)).toHaveCount(0)}
async function frame(page:Page,name:string){await editor(page).getByRole('button',{name:'Frames',exact:true}).click();await editor(page).getByRole('button',{name,exact:true}).click()}

test('photo crop, drag, accessible reposition, rotate, customize, persist, replace and remove',async({page})=>{
 const f=await avatarFixture(page);await page.goto('/profile');await open(page)
 await upload(page,await landscape(page));await expect(editor(page).locator('.crop-stage')).toBeVisible();await expect(editor(page).locator('.preview-strip .user-avatar').first()).toHaveAttribute('data-avatar-state','photo')
 const box=await editor(page).locator('.crop-stage').boundingBox();await page.mouse.move(box!.x+120,box!.y+120);await page.mouse.down();await page.mouse.move(box!.x+165,box!.y+120);await page.mouse.up()
 await editor(page).getByRole('button',{name:'Zoom in',exact:true}).click();await editor(page).getByRole('button',{name:'Move photo down',exact:true}).click();await editor(page).getByRole('button',{name:'Rotate 90°',exact:true}).click()
 await frame(page,'Burgundy and gold');await expect(editor(page).locator('.preset-grid .user-avatar').first()).toHaveAttribute('data-avatar-state','photo');await mkdir('test-results/avatars',{recursive:true});await page.screenshot({path:'test-results/avatars/photo-frames-desktop.png',fullPage:true});await editor(page).getByRole('button',{name:'Customize',exact:true}).click();await editor(page).getByLabel('Accent color',{exact:true}).fill('#648967');await editor(page).getByLabel('Space around photo',{exact:true}).fill('4')
 await save(page)
 expect(f.calls.uploads).toHaveLength(2);expect(f.profile().avatar_appearance.crop.rotation).toBe(90);expect(f.profile().avatar_appearance.crop.zoom).toBeGreaterThan(1);expect(f.profile().avatar_appearance.frame.accent).toBe('#648967')
 expect(f.profile().avatar_url).toBeNull();expect(f.profile().avatar_storage_path).not.toContain('?')
 await expect(page.locator('.profile-portrait>.user-avatar')).toHaveAttribute('data-avatar-state','photo')
 await expect(page.locator('header [data-frame="burgundy-gold"]').first()).toBeVisible()
 await page.reload();await expect(page.locator('.profile-portrait>.user-avatar')).toHaveAttribute('data-frame','burgundy-gold');await expect(page.locator('.profile-portrait>.user-avatar')).toHaveAttribute('data-avatar-state','photo')
 // Simulate signing back in with a fresh store; persistence comes from the profile row.
 await page.evaluate(()=>localStorage.clear());await page.reload();await expect(page.locator('.profile-portrait>.user-avatar')).toHaveAttribute('data-frame','burgundy-gold')
 const first=f.profile().avatar_storage_path;await open(page);await editor(page).getByRole('button',{name:'Adjust current photo crop'}).click();await expect(editor(page).locator('.crop-stage')).toBeVisible();await editor(page).getByRole('button',{name:'Move photo right'}).click();await save(page)
 expect(f.calls.uploads).toHaveLength(3);expect(f.calls.deleted).toContain(first)
 const recropped=f.profile().avatar_storage_path,original=f.profile().avatar_source_path;await open(page);await upload(page,await landscape(page));await save(page)
 expect(f.profile().avatar_storage_path).not.toBe(recropped);expect(f.calls.deleted).toContain(recropped);expect(f.calls.deleted).toContain(original)
 await open(page);await editor(page).getByRole('button',{name:'Remove photo',exact:true}).click();await save(page)
 expect(f.profile().avatar_storage_path).toBeNull();expect(f.objects.size).toBe(0)
 await expect(page.locator('.profile-portrait>.user-avatar')).toHaveAttribute('data-avatar-state','initials');await expect(page.locator('.profile-portrait>.user-avatar')).toHaveAttribute('data-frame','burgundy-gold')
 await expect(page.getByRole('button',{name:'Edit photo & frame',exact:true})).toBeFocused()
})

test('cancel, failed upload and failed profile update preserve the working avatar; lost reply is reconciled',async({page})=>{
 const f=await avatarFixture(page);await page.goto('/profile');await open(page);await upload(page,await landscape(page));await save(page)
 const old={...f.profile()},before=f.calls.uploads.length
 await open(page);await upload(page,await landscape(page));await frame(page,'Floral wreath');await editor(page).getByRole('button',{name:'Cancel',exact:true}).click()
 expect(f.calls.uploads).toHaveLength(before);expect(f.profile()).toEqual(old)
 await open(page);await upload(page,await landscape(page));f.failUpload();await editor(page).getByRole('button',{name:'Save appearance'}).click();await expect(editor(page).getByRole('alert')).toContainText('could not be uploaded');expect(f.profile()).toEqual(old)
 f.failSave();await editor(page).getByRole('button',{name:'Save appearance'}).click();await expect(editor(page).getByRole('alert')).toContainText('could not be saved');expect(f.profile()).toEqual(old);expect(f.objects.size).toBe(2)
 await expect(page.locator('.profile-portrait>.user-avatar')).toHaveAttribute('data-avatar-state','photo')
 f.loseResponse();await save(page);expect(f.profile().avatar_revision).toBe(old.avatar_revision+1);expect(f.objects.size).toBe(2)
})

test('unsupported, renamed, tiny, oversized and oversized-dimension images explain the problem',async({page})=>{
 await avatarFixture(page);await page.goto('/profile');await open(page)
 await upload(page,Buffer.from('<svg/>'),'image/svg+xml','photo.svg');await expect(editor(page).getByRole('alert')).toContainText('not supported')
 await upload(page,Buffer.from('<svg/>'),'image/png');await expect(editor(page).getByRole('alert')).toContainText('genuine')
 await upload(page,Buffer.alloc(5*1024*1024+1),'image/png');await expect(editor(page).getByRole('alert')).toContainText('under 5 MB')
 const png=await landscape(page);png.writeUInt32BE(99999,16);await upload(page,png);await expect(editor(page).getByRole('alert')).toContainText('too large')
 png.writeUInt32BE(10,16);png.writeUInt32BE(10,20);await upload(page,png);await expect(editor(page).getByRole('alert')).toContainText('64 × 64')
})

for(const [width,theme] of [[320,'vintage'],[390,'dark'],[1440,'light']] as const)test(`all original frames and editor controls fit ${width}px ${theme}`,async({page})=>{
 await avatarFixture(page,theme);await page.setViewportSize({width,height:900});await page.goto('/profile');await open(page)
 await editor(page).getByRole('button',{name:'Frames',exact:true}).click();await expect(editor(page).locator('.preset-grid button')).toHaveCount(13)
 for(const name of ['Classic solid ring','Double ring','Dotted ring','Dashed ring','Soft pastel gradient','Burgundy and gold','Hand-drawn outline','Stitched border','Postage-stamp edge','Floral wreath','Small stars','Scrapbook paper frame']){
  await editor(page).getByRole('button',{name,exact:true}).click();await expect(editor(page).getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','true')
 }
 await editor(page).getByRole('button',{name:'Customize',exact:true}).click();await editor(page).getByLabel('Primary color',{exact:true}).fill('#123456');await editor(page).getByRole('button',{name:'Reset frame to defaults'}).click();await expect(editor(page).getByLabel('Primary color',{exact:true})).toHaveValue('#79283e')
 await frame(page,'Small stars');await editor(page).getByRole('button',{name:'Customize',exact:true}).click();await expect(editor(page).getByLabel('Border thickness')).not.toBeVisible();await expect(editor(page).getByLabel('Accent color',{exact:true})).toBeVisible()
 await noOverflow(page);expect(await editor(page).evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
 expect(await editor(page).getByLabel('Primary color',{exact:true}).evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16)
 await mkdir('test-results/avatars',{recursive:true});await page.screenshot({path:`test-results/avatars/editor-${width}-${theme}.png`,fullPage:true})
 await save(page);await expect(page.locator('.profile-portrait>.user-avatar')).toHaveAttribute('data-frame','stars');await noOverflow(page)
})

test('raster processing preserves alpha, strips metadata and honors JPEG EXIF orientation',async({page})=>{
 await avatarFixture(page);await page.goto('/profile')
 const result=await page.evaluate(async()=>{
  const {prepareAvatarSource,renderAvatar,canvasBlob,decodeAvatar}=await import('/src/services/avatar-images.ts')
  const canvas=document.createElement('canvas');canvas.width=160;canvas.height=80;const c=canvas.getContext('2d')!;c.fillStyle='#dc2626';c.fillRect(0,0,80,80)
  const blob=await new Promise<Blob>(r=>canvas.toBlob(b=>r(b!),'image/png')),prepared=await prepareAvatarSource(blob),out=await canvasBlob(renderAvatar(prepared.canvas,{zoom:1,x:-1,y:0,rotation:0})),image=await decodeAvatar(out),check=document.createElement('canvas');check.width=512;check.height=512;check.getContext('2d')!.drawImage(image,0,0)
  const alpha=check.getContext('2d')!.getImageData(500,250,1,1).data[3]
  // EXIF orientation 6 (90° clockwise), little-endian TIFF, injected into a local JPEG.
  const jpg=await new Promise<Blob>(r=>canvas.toBlob(b=>r(b!),'image/jpeg')),bytes=new Uint8Array(await jpg.arrayBuffer()),exif=new Uint8Array([255,225,0,34,69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,6,0,0,0,0,0,0,0]),oriented=new Blob([bytes.slice(0,2),exif,bytes.slice(2)],{type:'image/jpeg'}),normalized=await prepareAvatarSource(oriented)
  const normalizedBytes=new Uint8Array(await normalized.blob.arrayBuffer()),text=new TextDecoder().decode(normalizedBytes)
  return {alpha,width:normalized.canvas.width,height:normalized.canvas.height,hasExif:text.includes('Exif'),type:out.type}
 })
 expect(result.alpha).toBe(0);expect(result.width).toBe(80);expect(result.height).toBe(160);expect(result.hasExif).toBe(false);expect(result.type).toBe('image/webp')
})

test('broken signed photos fall back to initials and retain the selected frame',async({page})=>{
 const f=await avatarFixture(page);await page.goto('/profile');await open(page);await upload(page,await landscape(page));await frame(page,'Postage-stamp edge');await save(page);f.broken();await page.reload()
 await expect(page.locator('.profile-portrait>.user-avatar')).toHaveAttribute('data-avatar-state','error');await expect(page.locator('.profile-portrait>.user-avatar')).toHaveAttribute('data-frame','postage');await expect(page.locator('.profile-portrait>.user-avatar .avatar-initials')).toHaveText('JM')
})
