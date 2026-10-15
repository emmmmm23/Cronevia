import {test,expect,type Page} from '@playwright/test'
import {loadEnv} from 'vite'
import {mkdir} from 'node:fs/promises'

for (const mobile of [false,true]) test(`destination picker saves and reopens ${mobile?'phone':'desktop'}`,async({page})=>{
 if(mobile) await page.setViewportSize({width:390,height:844})
 const state=await fixture(page)
 await page.route('**/api/places?**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([{name:'Manila, Metro Manila, Philippines',latitude:14.5995,longitude:120.9842}])}))
 // Deterministic tile fixtures; these browser tests never call the live tile provider.
 await page.route('https://tile.openstreetmap.org/**',route=>route.abort())
 await page.goto('/trips/new')
 await page.getByLabel('Trip name',{exact:true}).fill('Destination persistence')
 await page.getByLabel('Destination',{exact:true}).fill('Manila')
 await page.getByRole('button',{name:'Search',exact:true}).click()
 await page.getByRole('button',{name:'Manila, Metro Manila, Philippines',exact:true}).click()
 await expect(page.getByText('Pin attached')).toBeVisible()
 await shot(page,'destination-form-'+(mobile?'phone':'desktop'))
 await noOverflow(page)
 await page.getByRole('button',{name:'Choose on map',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Choose destination location'})
 await expect(dialog.locator('canvas')).toBeVisible()
 if(mobile) await dialog.locator('canvas').tap({position:{x:110,y:100}})
 else await dialog.locator('canvas').click({position:{x:110,y:100}})
 await expect(dialog.getByLabel('Latitude',{exact:true})).not.toHaveValue('14.5995')
 const beforeDrag=await dialog.getByLabel('Latitude',{exact:true}).inputValue()
 const marker=await dialog.locator('.maplibregl-marker').boundingBox()
 expect(marker).not.toBeNull()
 await page.mouse.move(marker!.x+marker!.width/2,marker!.y+marker!.height/2)
 await page.mouse.down();await page.mouse.move(marker!.x+marker!.width/2+30,marker!.y+marker!.height/2+35,{steps:8});await page.mouse.up()
 await expect(dialog.getByLabel('Latitude',{exact:true})).not.toHaveValue(beforeDrag)
 await dialog.getByRole('button',{name:'Zoom in',exact:true}).click()
 await dialog.getByRole('button',{name:'Cancel',exact:true}).click()
 await page.getByRole('button',{name:'Choose on map',exact:true}).click()
 await expect(dialog.getByLabel('Latitude',{exact:true})).toHaveValue('14.5995')
 await dialog.getByLabel('Latitude',{exact:true}).fill('35')
 await dialog.getByRole('button',{name:'Cancel',exact:true}).click()
 await expect(page.getByRole('button',{name:'Choose on map',exact:true})).toBeFocused()
 await page.getByRole('button',{name:'Create trip',exact:true}).click()
 await expect(page).toHaveURL(/\/trips\/[0-9a-f-]+$/)
 const saved=state.db.trips.find(t=>t.title==='Destination persistence')!
 expect(saved.destination_latitude).toBe(14.5995);expect(saved.destination_source).toBe('search')
 await page.reload();await page.getByRole('button',{name:'Edit trip details',exact:true}).click()
 await expect(page.getByText('Pin attached')).toBeVisible()
 await page.getByRole('button',{name:'Choose on map',exact:true}).click()
 await expect(dialog.getByLabel('Longitude',{exact:true})).toHaveValue('120.9842')
 await dialog.getByLabel('Place label',{exact:true}).fill('A map destination')
 await dialog.getByLabel('Latitude',{exact:true}).fill('35.68')
 await dialog.getByLabel('Longitude',{exact:true}).fill('139.69')
 await expect(dialog.locator('canvas')).toBeVisible()
 await shot(page,'destination-'+(mobile?'phone':'desktop'))
 await noOverflow(page)
 await dialog.getByRole('button',{name:'Use this location',exact:true}).click()
 state.fail('trips');await page.getByRole('button',{name:'Save trip details',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Trip details',exact:true}).getByText('Details couldn’t be saved. Please retry.')).toBeVisible()
 await expect(page.getByLabel('Destination',{exact:true})).toHaveValue('A map destination')
 await page.getByRole('button',{name:'Save trip details',exact:true}).click()
 await page.getByRole('button',{name:'Edit trip details',exact:true}).click()
 await page.getByRole('button',{name:'Choose on map',exact:true}).click()
 await expect(dialog.getByLabel('Latitude',{exact:true})).toHaveValue('35.68')
 await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible()
 await page.getByLabel('Destination',{exact:true}).fill('Text only')
 await expect(page.getByText('Pin attached')).toHaveCount(0)
 await page.getByRole('button',{name:'Save trip details',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Trip details',exact:true})).not.toBeVisible()
 expect(saved.destination_latitude).toBeNull();expect(saved.destination_longitude).toBeNull();expect(saved.destination_source).toBeNull()
})
const env=loadEnv('development',process.cwd(),'VITE_'),host=new URL(env.VITE_SUPABASE_URL).hostname
const owner='11111111-1111-4111-8111-111111111111',tripId='55555555-5555-4555-8555-555555555555'
const uid=(n:number)=>'66666666-6666-4666-8666-'+String(n).padStart(12,'0')
const blank=()=>({version:1,pages:[{id:'page-left',elements:[]},{id:'page-right',elements:[]}]})
// These are local fixtures, never real account data or hosted persistence.
async function fixture(page:Page){
 const user={id:owner,email:'planner@example.test',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-10-14T00:00:00Z'}
 const session={access_token:Buffer.from(JSON.stringify({alg:'HS256'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:owner,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated',aud:'authenticated'})).toString('base64url')+'.fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}
 await page.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:'sb-'+host.split('.')[0]+'-auth-token',session})
 const db:Record<string,any[]>={trips:[{id:tripId,user_id:owner,title:'A slow weekend by the coast',destination:'Batanes',description:'A little walking, a little sea air. Leave space for the unexpected.',start_date:'2026-10-14',end_date:'2026-10-16',timezone:'Asia/Manila',status:'planning',preparation:[],deleted_at:null}],trip_days:[],itinerary_items:[],media:[],memories:[{id:uid(50),user_id:owner,title:'Light across the water',description:'A fixture moment for local visual review.',memory_date:'2026-10-14',is_archived:false,scrapbook_layout:blank(),deleted_at:null}],journal_entries:[{id:uid(51),user_id:owner,title:'Notes from the shore',content:'Fixture reflection for relationship testing.',entry_date:'2026-10-14',is_archived:false,scrapbook_layout:blank(),deleted_at:null}]}
 let serial=100,fail='',lost=false,png=Buffer.from('')
 function ensure(id:string){const t=db.trips.find(t=>t.id===id);if(!t)return;const count=t.start_date?Math.max(1,Math.round((Date.parse(t.end_date||t.start_date)-Date.parse(t.start_date))/86400000)+1):1;for(let n=1;n<=count;n++){if(!db.trip_days.some(d=>d.trip_id===id&&d.day_number===n))db.trip_days.push({id:uid(serial++),trip_id:id,day_number:n,is_ideas:false,title:'Day '+n,date:t.start_date?new Date(Date.parse(t.start_date)+(n-1)*86400000).toISOString().slice(0,10):null})}if(!db.trip_days.some(d=>d.trip_id===id&&d.is_ideas))db.trip_days.push({id:uid(serial++),trip_id:id,day_number:0,is_ideas:true,title:'Ideas',date:null})}
 ensure(tripId)
 db.itinerary_items=[{id:uid(1),trip_day_id:db.trip_days[0].id,title:'Walk the shoreline',description:'Follow the coastal path at an easy pace.',start_time:'09:00:00',duration_minutes:60,location_name:'Basco waterfront',sort_order:0,status:'planned',item_type:'activity'},{id:uid(2),trip_day_id:db.trip_days[0].id,title:'Find a small café and stay a little longer',time_label:'Afternoon',description:'A flexible pause, whenever the day needs one.',sort_order:1,status:'planned',item_type:'activity'}]
 await page.route('https://'+host+'/**',async route=>{
  const req=route.request(),url=new URL(req.url()),method=req.method(),name=url.pathname.split('/').pop()!,body=method==='GET'||method==='HEAD'||url.pathname.includes('/storage/')?{}:req.postDataJSON()||{}
  const json=(value:any,status=200,count?:number)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value),headers:Array.isArray(value)?{'content-range':'0-'+Math.max(0,value.length-1)+'/'+(count??value.length)}:{}})
  if(url.pathname.endsWith('/auth/v1/user'))return json(user)
  if(name==='profiles')return json({id:owner,user_id:owner,full_name:'Local fixture reviewer',username:'fixture',role:'user',account_status:'active'})
  if(url.pathname.includes('/storage/')){if(method==='GET')return route.fulfill({contentType:'image/png',body:png});if(fail==='upload'){fail='';return json({message:'Fixture upload failure'},500)}if(url.pathname.includes('/sign/'))return json({signedURL:'/object/sign/'+url.pathname.split('/sign/')[1]+'?token=fixture'});return json({Key:owner+'/fixture.png'})}
  if(fail===name){fail='';return json({message:'Fixture failure'},500)}
  if(url.pathname.includes('/rpc/')){
   if(name==='ensure_trip_days'){ensure(body.target_trip_id);return json(null)}
   if(name==='create_trip_draft'){let t=db.trips.find(t=>t.id===body.draft_id);if(!t){t={...body.details,id:body.draft_id,user_id:owner,preparation:[],deleted_at:null};db.trips.push(t);ensure(t.id)}for(const idea of body.details.draft_ideas||[]){const day=db.trip_days.find(d=>d.trip_id===t.id&&d.is_ideas);if(!db.itinerary_items.some(i=>i.id===idea.id))db.itinerary_items.push({...idea,trip_day_id:day.id,status:'planned',sort_order:db.itinerary_items.length,item_type:'activity'})}if(lost){lost=false;return json({message:'Fixture lost response'},500)}return json(t)}
   if(name==='save_trip_activity'){const old=db.itinerary_items.find(i=>i.id===body.activity_id),d=body.details;const row={...old,...d,id:body.activity_id,trip_day_id:body.target_day_id,start_time:d.scheduled_time||null,sort_order:old?.sort_order??db.itinerary_items.filter(i=>i.trip_day_id===body.target_day_id).length,item_type:d.item_type||old?.item_type||'activity'};db.itinerary_items=db.itinerary_items.filter(i=>i.id!==row.id).concat(row);return json(row)}
   if(name==='name_trip_day'){const day=db.trip_days.find(d=>d.id===body.target_day_id&&d.trip_id===body.target_trip_id);day.title=body.day_title;return json(day)}
   if(name==='move_trip_activity'){const item=db.itinerary_items.find(i=>i.id===body.activity_id);item.trip_day_id=body.target_day_id;item.sort_order=db.itinerary_items.filter(i=>i.trip_day_id===body.target_day_id).length;db.journal_entries.filter(j=>j.itinerary_item_id===item.id).forEach(j=>j.trip_day_id=body.target_day_id);return json(null)}
   if(name==='reorder_itinerary'){body.item_ids.forEach((id:string,n:number)=>db.itinerary_items.find(i=>i.id===id).sort_order=n);return json(null)}
   if(name==='set_trip_cover'){db.media.filter(m=>m.trip_id===body.target_trip_id).forEach(m=>m.is_cover=m.id===body.target_media_id);return json(null)}
   return json(null)
  }
  if(!db[name])return json([])
  const matches=(row:any)=>[...url.searchParams].every(([key,val])=>{if(val.startsWith('eq.'))return String(row[key])===val.slice(3);if(val.startsWith('is.'))return val==='is.null'?row[key]==null:true;if(val.startsWith('in.'))return val.slice(3).replace(/[()"]/g,'').split(',').includes(row[key]);return true})
  let rows=db[name].filter(matches)
  if(method==='POST'){const row={...body,id:body.id||uid(serial++),user_id:owner};db[name]=db[name].filter(r=>r.id!==row.id).concat(row);return json(row)}
  if(method==='PATCH'){rows.forEach(row=>{Object.assign(row,body);if(name==='trips'&&('start_date'in body||'end_date'in body)){db.trip_days.filter(d=>d.trip_id===row.id&&!d.is_ideas).forEach(d=>d.date=row.start_date?new Date(Date.parse(row.start_date)+(d.day_number-1)*86400000).toISOString().slice(0,10):null);ensure(row.id)}});return json(rows[0]||null)}
  if(method==='DELETE'){db[name]=db[name].filter(r=>!matches(r));return json(null)}
  const count=rows.length,offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||1000);rows=rows.slice(offset,offset+limit)
  return json(req.headers().accept?.includes('vnd.pgrst.object')?rows[0]||null:rows,200,count)
 })
 return {db,fail(name:string){fail=name},loseCreate(){lost=true},image(value:Buffer){png=value}}
}
export async function landscape(page: Page) {
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
export async function capture(page:Page,options:{path:string;fullPage:boolean}) {
  await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo({top:0,behavior:'instant'});await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())))})
  await page.screenshot(options)
}

async function shot(page:Page,name:string){await mkdir('test-results/planner',{recursive:true});await capture(page,{path:'test-results/planner/'+name+'.png',fullPage:true})}
async function noOverflow(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)}

test('trip setup retries one draft; fixed and undecided dates open the itinerary',async({page})=>{
 const f=await fixture(page);await page.goto('/trips/new');await page.getByLabel('Trip name',{exact:true}).fill('An open-ended journey');await page.getByLabel('Destination',{exact:true}).fill('Still deciding');await page.getByText('Start an ideas list · optional',{exact:true}).click();await page.getByRole('button',{name:'Add idea'}).click();await page.getByLabel('Idea 1',{exact:true}).fill('Try a local breakfast');f.loseCreate();await page.getByRole('button',{name:'Create trip',exact:true}).click();await expect(page.getByRole('alert')).toContainText('please retry');await page.getByRole('button',{name:'Create trip',exact:true}).click();await expect(page.getByRole('heading',{name:'An open-ended journey',exact:true})).toBeVisible();expect(f.db.trips.filter(t=>t.title==='An open-ended journey')).toHaveLength(1);expect(f.db.trip_days.filter(d=>d.trip_id===f.db.trips.at(-1).id)).toHaveLength(2);expect(f.db.itinerary_items.filter(i=>i.title==='Try a local breakfast')).toHaveLength(1)
 await page.goto('/trips/new');await page.getByLabel('Trip name',{exact:true}).fill('A dated journey');await page.getByLabel('Dates undecided').uncheck();await page.getByLabel('Start date',{exact:true}).fill('2026-11-01');await page.getByLabel('End date',{exact:true}).fill('2026-11-03');await page.getByRole('button',{name:'Create trip',exact:true}).click();await expect(page.getByRole('tablist',{name:'Itinerary days'})).toBeVisible();expect(f.db.trip_days.filter(d=>d.trip_id===f.db.trips.at(-1).id&&!d.is_ideas)).toHaveLength(3)
})

test('planner activity, ideas, dates, preparation, Today and relationships survive reload (mock API)',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-10-14T00:00:00Z'));const f=await fixture(page);await page.goto('/trips/'+tripId);await expect(page.locator('.activity-card')).toHaveCount(2)
 await page.getByRole('button',{name:'Add activity'}).click();await page.getByLabel('Activity title').fill('Visit the lighthouse');await page.getByLabel('Flexible time label').fill('Sunset');await page.getByLabel('Place',{exact:true}).fill('Basco lighthouse');f.fail('save_trip_activity');await page.getByRole('button',{name:'Save activity',exact:true}).click();await expect(page.getByRole('alert')).toContainText('please retry');await expect(page.getByLabel('Activity title')).toHaveValue('Visit the lighthouse');await shot(page,'activity-save-retry');await page.getByRole('button',{name:'Save activity',exact:true}).click();await expect(page.locator('.activity-card')).toHaveCount(3)
 await page.getByRole('button',{name:'Edit Visit the lighthouse',exact:true}).click();await page.getByRole('dialog',{name:'Plan an activity',exact:true}).getByLabel('Notes',{exact:true}).fill('Bring a light jacket.');await page.getByRole('button',{name:'Save activity',exact:true}).click();await expect(page.getByText('Bring a light jacket.',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Options for Visit the lighthouse',exact:true}).click();await page.getByRole('button',{name:'Duplicate activity',exact:true}).click();await expect(page.locator('.activity-card')).toHaveCount(4);await page.getByRole('button',{name:'Move Visit the lighthouse (copy) up',exact:true}).click();await expect(page.locator('.activity-card h3').nth(2)).toHaveText('Visit the lighthouse (copy)')
 await page.getByRole('button',{name:'Options for Visit the lighthouse (copy)',exact:true}).click();await page.getByRole('button',{name:'Remove activity',exact:true}).click();await page.getByRole('button',{name:'Confirm removal',exact:true}).click();await expect(page.locator('.activity-card')).toHaveCount(3)
 await page.getByRole('button',{name:'Ideas',exact:true}).click();await page.getByRole('button',{name:'Add idea'}).click();await page.getByLabel('Activity title').fill('Browse the market');await page.getByRole('button',{name:'Save activity',exact:true}).click();await page.getByRole('button',{name:'Options for Browse the market',exact:true}).click();await page.getByLabel('Move to day').selectOption(f.db.trip_days[1].id);await page.getByRole('button',{name:'Move activity',exact:true}).click();await expect(page.locator('.activity-card')).toHaveCount(0)
 await page.getByRole('button',{name:'Itinerary',exact:true}).click();await page.getByRole('tab',{name:'Day 2 · Thu, Oct 15',exact:true}).click();await expect(page.getByRole('heading',{name:'Browse the market',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Edit trip details',exact:true}).click();await page.getByLabel('End date',{exact:true}).fill('2026-10-14');await page.getByRole('button',{name:'Save trip details',exact:true}).click();await expect(page.getByText('This day is outside your current travel dates.',{exact:false})).toBeVisible();expect(f.db.itinerary_items).toHaveLength(4)
 await page.getByRole('button',{name:'Prepare',exact:true}).click();await page.getByRole('button',{name:'Use starter checklist'}).click();await page.getByLabel('Pack the essentials',{exact:true}).check();f.fail('trips');await page.getByRole('button',{name:'Save preparation',exact:true}).click();await expect(page.getByRole('alert')).toContainText('please retry');await expect(page.getByLabel('Pack the essentials',{exact:true})).toBeChecked();await page.getByRole('button',{name:'Save preparation',exact:true}).click();await expect(page.getByRole('button',{name:'Save preparation',exact:true})).toBeDisabled();await page.reload();await page.getByRole('button',{name:'Prepare',exact:true}).click();await expect(page.getByLabel('Pack the essentials',{exact:true})).toBeChecked();await shot(page,'preparation-desktop');await page.setViewportSize({width:360,height:800});await noOverflow(page);await shot(page,'preparation-mobile');await page.setViewportSize({width:1440,height:1100})
 await page.getByRole('button',{name:'Today',exact:true}).click();await expect(page.locator('.next-activity')).toContainText('09:00 — Walk the shoreline');await expect(page.locator('.today-note')).toContainText('Asia/Manila');expect(f.db.itinerary_items.every(i=>i.status==='planned')).toBe(true)
 await page.getByRole('button',{name:'Options for Walk the shoreline',exact:true}).click();await page.getByRole('button',{name:'Link an existing keepsake',exact:true}).click();await page.getByLabel('Choose a record').selectOption(uid(50));await page.getByRole('button',{name:'Save link',exact:true}).click();await expect(page.getByRole('link',{name:'Light across the water ↗',exact:true})).toBeVisible();expect(f.db.memories[0]).toMatchObject({trip_id:tripId,itinerary_item_id:uid(1)})
 await shot(page,'today-desktop')
})

test('responsive planner, touch reorder, sheets and keyboard alternatives at six widths',async({browser})=>{
 const context=await browser.newContext({hasTouch:true,viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();const f=await fixture(page);f.db.itinerary_items[0].start_time=null;await page.goto('/trips/'+tripId);await expect(page.locator('.activity-card')).toHaveCount(2)
 for(const width of [360,390,430,768,1024,1440]){await page.setViewportSize({width,height:900});await noOverflow(page);await shot(page,'itinerary-'+width);await page.getByRole('button',{name:'Add activity'}).tap();await page.getByLabel('Activity title').fill('Draft kept through rotation');await page.setViewportSize({width:Math.max(width,768),height:430});await expect(page.getByLabel('Activity title')).toHaveValue('Draft kept through rotation');await noOverflow(page);await page.getByLabel('Activity title').fill('');await page.getByRole('button',{name:'Cancel',exact:true}).tap();await page.setViewportSize({width,height:900})}
 await page.setViewportSize({width:390,height:844});const handle=page.getByRole('button',{name:'Drag Walk the shoreline to reorder',exact:true});await handle.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));const a=(await handle.boundingBox())!,b=(await page.locator('.activity-card').nth(1).boundingBox())!;const cdp=await context.newCDPSession(page);await cdp.send('Input.synthesizeScrollGesture',{x:a.x+a.width/2,y:a.y+a.height/2,yDistance:(b.y+30-a.y-a.height/2),speed:350,gestureSourceType:'touch',preventFling:true});await expect(page.locator('.activity-card h3').first()).toHaveText('Find a small café and stay a little longer');await page.getByRole('button',{name:'Move Walk the shoreline up',exact:true}).tap();await expect(page.locator('.activity-card h3').first()).toHaveText('Walk the shoreline')
 await page.getByRole('button',{name:'Edit trip details',exact:true}).tap();await page.getByRole('button',{name:'Close sheet',exact:true}).tap();await expect(page.getByRole('button',{name:'Edit trip details',exact:true})).toBeFocused();await page.getByRole('button',{name:'Add activity'}).tap();await page.getByLabel('Activity title').fill('Keyboard-sized viewport');await page.setViewportSize({width:390,height:420});await page.getByLabel('Activity title').focus();await shot(page,'activity-mobile-keyboard-sized');await expect(page.getByLabel('Activity title')).toBeInViewport();await page.getByRole('button',{name:'Save activity',exact:true}).tap();await expect(page.getByRole('heading',{name:'Keyboard-sized viewport',exact:true})).toBeVisible();expect(f.db.itinerary_items).toHaveLength(3);await context.close()
})

test('trip collection states and memory relationships with touch photo browsing',async({browser})=>{
 const context=await browser.newContext({hasTouch:true,viewport:{width:390,height:844}}),page=await context.newPage();const f=await fixture(page);await page.goto('/trips');const png=await landscape(page);f.image(png);f.db.trips.push({...f.db.trips[0],id:uid(60),title:'A journey still taking shape',start_date:null,end_date:null});f.db.media.push({id:uid(70),trip_id:tripId,storage_path:owner+'/coast.png',file_name:'Fixture landscape',mime_type:'image/png',size_bytes:png.length,is_cover:true});await page.reload()
 for(const width of [360,390,430,768,1024,1440]){await page.setViewportSize({width,height:900});await expect(page.locator('.trip-ticket')).toHaveCount(2);await noOverflow(page);await shot(page,'collection-'+width)}
 await page.getByLabel('Search trips').fill('nothing matches');await expect(page.getByRole('heading',{name:'No trips found.'})).toBeVisible();await shot(page,'collection-no-results');await page.getByRole('button',{name:'Clear filters'}).click();await page.getByRole('button',{name:'Drafts',exact:true}).click();await expect(page.locator('.trip-ticket')).toHaveCount(1)
 f.db.media.push(...[71,72,73].map(n=>({id:uid(n),memory_id:uid(50),user_id:owner,storage_path:owner+'/'+n+'.png',file_name:'Fixture photo '+n,mime_type:'image/png',size_bytes:png.length,sort_order:n})));await page.goto('/memories/'+uid(50));await page.setViewportSize({width:390,height:844});await expect(page.locator('.hero-photo')).toBeVisible();await shot(page,'memory-detail-mobile');
 const hero=page.locator('.hero-photo'),box=(await hero.boundingBox())!,cdp=await context.newCDPSession(page);await cdp.send('Input.synthesizeScrollGesture',{x:box.x+box.width*.75,y:box.y+box.height/2,xDistance:-150,speed:350,gestureSourceType:'touch',preventFling:true});await expect(page.getByRole('button',{name:'View photo 2 full screen',exact:true})).toBeVisible();await page.getByRole('button',{name:'View photo 2 full screen',exact:true}).tap();await expect(page.getByRole('dialog',{name:'Photographs · 2 of 3',exact:true})).toBeVisible();await page.getByRole('button',{name:'Previous full-screen photo',exact:true}).tap();await expect(page.getByRole('dialog',{name:'Photographs · 1 of 3',exact:true})).toBeVisible();await page.getByRole('button',{name:'Close sheet',exact:true}).tap();
 await page.getByRole('button',{name:'Edit memory',exact:true}).tap();await expect(page.getByRole('button',{name:'Save memory',exact:true})).toBeVisible();await page.getByRole('button',{name:'Entry options',exact:true}).tap();await expect(page.getByRole('dialog',{name:'Entry options',exact:true})).toBeVisible();await page.getByRole('button',{name:'Date & details',exact:true}).tap();await expect(page.getByRole('dialog',{name:'Memory details',exact:true})).toBeVisible();await page.getByRole('combobox',{name:'Related trip',exact:true}).selectOption(tripId);await page.getByRole('combobox',{name:'Related activity',exact:true}).selectOption(uid(1));await page.getByRole('combobox',{name:'Related journal entry',exact:true}).selectOption(uid(51));await shot(page,'memory-links-mobile');await page.getByRole('button',{name:'Close sheet',exact:true}).tap();await page.getByRole('button',{name:'Save memory',exact:true}).tap();await expect(page.getByRole('button',{name:'Edit memory',exact:true})).toBeVisible();await page.reload();expect(f.db.memories[0]).toMatchObject({trip_id:tripId,itinerary_item_id:uid(1),journal_entry_id:uid(51)});await context.close()
})

test('trip photos retain a failed upload preview and support cover selection',async({page})=>{
 const f=await fixture(page);await page.goto('/trips/'+tripId);await expect(page.getByRole('heading',{name:'A slow weekend by the coast',exact:true})).toBeVisible();const png=await landscape(page);f.image(png);await page.getByRole('button',{name:'Keepsakes',exact:true}).click();await page.getByRole('button',{name:'Trip photos',exact:true}).click();f.fail('upload');await page.getByLabel('Add trip photos').setInputFiles({name:'local-fixture.png',mimeType:'image/png',buffer:png});await expect(page.locator('.photo-drafts img')).toHaveCount(1);await page.getByRole('button',{name:'Upload photos',exact:true}).click();await expect(page.getByRole('alert')).toContainText('preview is kept');await shot(page,'trip-upload-failure');await page.getByRole('button',{name:'Upload photos',exact:true}).click();await expect(page.locator('.trip-photo')).toHaveCount(1);await expect(page.locator('.photo-drafts img')).toHaveCount(0);await page.getByRole('button',{name:'Use as cover',exact:true}).click();await expect(page.getByRole('button',{name:'Current cover',exact:true})).toBeVisible();await page.getByRole('button',{name:'Close sheet',exact:true}).click();await page.reload();await expect(page.locator('.trip-summary>img')).toBeVisible();expect(f.db.media.filter(m=>m.trip_id===tripId)).toHaveLength(1)
})

test('timeline and overview: named days, chronology, overnight conflicts and many-day navigation',async({browser})=>{
 const context=await browser.newContext({hasTouch:true,viewport:{width:390,height:844}}),page=await context.newPage(),f=await fixture(page);f.db.trips[0].end_date='2026-10-27';await page.goto('/trips/'+tripId);await expect(page.getByRole('tab',{name:'Day 14 · Tue, Oct 27',exact:true})).toBeAttached();await expect(page.getByRole('button',{name:'Daily timeline',exact:true})).toHaveAttribute('aria-pressed','true')
 await page.getByRole('button',{name:'Name Day 1',exact:true}).tap();await page.getByLabel('Day title · optional').fill('Exploring the old town');await page.getByRole('button',{name:'Save day title',exact:true}).tap();await expect(page.getByRole('heading',{name:'Exploring the old town',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Add activity',exact:false}).tap();await page.getByLabel('Activity title').fill('A very slow breakfast before the city wakes up');await page.getByLabel('Start time · optional').fill('07:30');await page.getByLabel('End time · optional').fill('08:15');await page.getByRole('button',{name:'Save activity',exact:true}).tap();await expect(page.locator('.timed .activity-card h3').first()).toHaveText('A very slow breakfast before the city wakes up')
 await page.getByRole('button',{name:'Add activity',exact:false}).tap();await page.getByLabel('Activity title').fill('Overnight ferry');await page.getByLabel('Start time · optional').fill('23:30');await page.getByLabel('End time · optional').fill('01:15');await page.getByRole('button',{name:'Save activity',exact:true}).tap();await expect(page.getByRole('alert')).toContainText('Next day');await page.getByLabel('End on next day').check();await page.getByLabel('Place',{exact:true}).fill('North harbour');await page.getByRole('button',{name:'Save activity',exact:true}).tap();await expect(page.locator('.time-rail').last()).toContainText('+1 day')
 await page.getByRole('tab',{name:'Day 2 · Thu, Oct 15',exact:true}).tap();await page.getByRole('button',{name:'Add activity',exact:false}).tap();await page.getByLabel('Activity title').fill('Harbour arrival');await page.getByLabel('Start time · optional').fill('00:45');await page.getByLabel('End time · optional').fill('01:30');await page.getByRole('button',{name:'Save activity',exact:true}).tap();await expect(page.locator('.overlap')).toContainText('Times overlap')
 await page.getByRole('button',{name:'Trip overview',exact:true}).tap();await expect(page.locator('.overview-day')).toHaveCount(14);await expect(page.locator('.overview-row').filter({hasText:'Overnight ferry'})).toContainText('23:30 – 01:15 (+1 day)');await page.getByRole('button',{name:'Edit Harbour arrival',exact:true}).tap();await page.getByRole('dialog',{name:'Plan an activity'}).getByLabel('Notes',{exact:true}).fill('Keep the boarding ticket.');await page.getByRole('button',{name:'Save activity',exact:true}).tap();await expect(page.getByRole('button',{name:'Trip overview',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('.overview-row').filter({hasText:'Harbour arrival'})).toContainText('Keep the boarding ticket.')
 await page.getByRole('button',{name:'Daily timeline',exact:true}).tap();await expect(page.getByRole('tab',{name:'Day 2 · Thu, Oct 15',exact:true})).toHaveAttribute('aria-selected','true');await page.getByRole('combobox',{name:'Jump to day',exact:true}).selectOption(f.db.trip_days.find(d=>d.day_number===14).id);await expect(page.getByRole('tab',{name:'Day 14 · Tue, Oct 27',exact:true})).toBeInViewport();await page.getByRole('tab',{name:'Day 14 · Tue, Oct 27',exact:true}).focus();await page.keyboard.press('Home');await expect(page.getByRole('tab',{name:'Day 1 · Wed, Oct 14',exact:true})).toBeFocused()
 for(const width of [360,390,430,768,1024,1440]){await page.setViewportSize({width,height:1000});await noOverflow(page);await shot(page,'timeline-'+width);await page.getByRole('button',{name:'Trip overview',exact:true}).tap();await noOverflow(page);await page.screenshot({path:'test-results/planner/overview-'+width+'.png',fullPage:false});await page.getByRole('button',{name:'Daily timeline',exact:true}).tap()}
 await page.setViewportSize({width:390,height:844});const edit=page.getByRole('button',{name:'Edit Overnight ferry',exact:true});await edit.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));const scroll=await page.evaluate(()=>scrollY);await edit.tap();await page.getByRole('button',{name:'Cancel',exact:true}).tap();await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(scroll,0)
 await page.reload();await expect(page.getByRole('heading',{name:'Exploring the old town',exact:true})).toBeVisible();await page.getByRole('button',{name:'Trip overview',exact:true}).tap();await expect(page.locator('.overview-row').filter({hasText:'Overnight ferry'})).toContainText('+1 day');expect(f.db.itinerary_items.find(i=>i.title==='Overnight ferry')).toMatchObject({end_time:'01:15',end_day_offset:1});await context.close()
})

test('missing hosted planner setup explains the failure and keeps pending trip ideas',async({page})=>{
 const f=await fixture(page);await page.route('**/rest/v1/rpc/create_trip_draft',route=>route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({code:'PGRST202',message:'Could not find create_trip_draft in the schema cache'})}));await page.goto('/trips/new');await page.getByLabel('Trip name',{exact:true}).fill('Keep this trip');await page.getByText('Start an ideas list · optional',{exact:true}).click();await page.getByRole('button',{name:'Add idea'}).click();await page.getByLabel('Idea 1',{exact:true}).fill('A quiet museum');await page.getByRole('button',{name:'Create trip',exact:true}).click();await expect(page.getByRole('alert')).toContainText('one-time service update');await expect(page.getByLabel('Trip name',{exact:true})).toHaveValue('Keep this trip');await expect(page.getByLabel('Idea 1',{exact:true})).toHaveValue('A quiet museum');await shot(page,'setup-missing-migration');await page.unroute('**/rest/v1/rpc/create_trip_draft');await page.getByRole('button',{name:'Create trip',exact:true}).click();await expect(page.getByRole('heading',{name:'Keep this trip',exact:true})).toBeVisible();expect(f.db.trips.filter(t=>t.title==='Keep this trip')).toHaveLength(1);expect(f.db.itinerary_items.filter(i=>i.title==='A quiet museum')).toHaveLength(1)
})
