import {expect,type Page} from '@playwright/test'
import {loadEnv} from 'vite'
import {mkdir} from 'node:fs/promises'
const env=loadEnv('development',process.cwd(),'VITE_'),host=new URL(env.VITE_SUPABASE_URL).hostname
export const owner='11111111-1111-4111-8111-111111111111',tripId='55555555-5555-4555-8555-555555555555'
const uid=(n:number)=>'66666666-6666-4666-8666-'+String(n).padStart(12,'0')
const blank=()=>({version:1,pages:[{id:'page-left',elements:[]},{id:'page-right',elements:[]}]})
// These are local fixtures, never real account data or hosted persistence.
export async function fixture(page:Page){
 // Block paid basemap traffic in fixture tests; provider connectivity is checked separately.
 await page.route('https://api.mapbox.com/**', route => route.abort())
 await page.route('https://tile.googleapis.com/**', route => {
  const url = new URL(route.request().url())
  if (url.pathname.endsWith('/createSession')) return route.fulfill({ contentType:'application/json', body:JSON.stringify({session:'local-fixture',expiry:String(Math.floor(Date.now()/1000)+86400),tileWidth:256,tileHeight:256}) })
  if (url.pathname.endsWith('/viewport')) return route.fulfill({ contentType:'application/json', body:JSON.stringify({copyright:'Google Maps · local fixture',maxZoomRects:[]}) })
  return route.abort()
 })
 const user={id:owner,email:'planner@example.test',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-10-14T00:00:00Z'}
 const session={access_token:Buffer.from(JSON.stringify({alg:'HS256'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:owner,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated',aud:'authenticated',aal:'aal1'})).toString('base64url')+'.fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}
 await page.addInitScript(({key,session})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(session))},{key:'sb-'+host.split('.')[0]+'-auth-token',session})
 const db:Record<string,any[]>={trips:[{id:tripId,user_id:owner,title:'A slow weekend by the coast',destination:'Batanes',description:'A little walking, a little sea air. Leave space for the unexpected.',start_date:'2026-10-14',end_date:'2026-10-16',timezone:'Asia/Manila',status:'planning',preparation:[],deleted_at:null}],trip_days:[],itinerary_items:[],media:[],memories:[{id:uid(50),user_id:owner,title:'Light across the water',description:'A fixture moment for local visual review.',memory_date:'2026-10-14',is_archived:false,scrapbook_layout:blank(),deleted_at:null}],journal_entries:[{id:uid(51),user_id:owner,title:'Notes from the shore',content:'Fixture reflection for relationship testing.',entry_date:'2026-10-14',is_archived:false,scrapbook_layout:blank(),deleted_at:null}]}
 let serial=100,fail='',lost=false,lostPlace=false,png=Buffer.from('')
 function ensure(id:string){const t=db.trips.find(t=>t.id===id);if(!t)return;const count=t.start_date?Math.max(1,Math.round((Date.parse(t.end_date||t.start_date)-Date.parse(t.start_date))/86400000)+1):1;for(let n=1;n<=count;n++){if(!db.trip_days.some(d=>d.trip_id===id&&d.day_number===n))db.trip_days.push({id:uid(serial++),trip_id:id,day_number:n,is_ideas:false,title:'Day '+n,date:t.start_date?new Date(Date.parse(t.start_date)+(n-1)*86400000).toISOString().slice(0,10):null})}if(!db.trip_days.some(d=>d.trip_id===id&&d.is_ideas))db.trip_days.push({id:uid(serial++),trip_id:id,day_number:0,is_ideas:true,title:'Ideas',date:null})}
 ensure(tripId)
 db.itinerary_items=[{id:uid(1),trip_day_id:db.trip_days[0].id,title:'Walk the shoreline',description:'Follow the coastal path at an easy pace.',start_time:'09:00:00',duration_minutes:60,location_name:'Basco waterfront',sort_order:0,status:'planned',item_type:'activity'},{id:uid(2),trip_day_id:db.trip_days[0].id,title:'Find a small café and stay a little longer',time_label:'Afternoon',description:'A flexible pause, whenever the day needs one.',sort_order:1,status:'planned',item_type:'activity'}]
 await page.route('https://'+host+'/**',async route=>{
  const req=route.request(),url=new URL(req.url()),method=req.method(),name=url.pathname.split('/').pop()!,body=method==='GET'||method==='HEAD'||url.pathname.includes('/storage/')?{}:req.postDataJSON()||{}
  const json=(value:any,status=200,count?:number)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value),headers:Array.isArray(value)?{'content-range':'0-'+Math.max(0,value.length-1)+'/'+(count??value.length)}:{}})
  if(url.pathname.endsWith('/auth/v1/user'))return json(user)
  if(url.pathname.endsWith('/auth/v1/token'))return json(session)
  if(name==='profiles')return json({id:owner,user_id:owner,full_name:'Local fixture reviewer',username:'fixture',role:'user',account_status:'active'})
  if(url.pathname.includes('/storage/')){if(method==='GET')return route.fulfill({contentType:'image/png',body:png});if(fail==='upload'){fail='';return json({message:'Fixture upload failure'},500)}if(url.pathname.includes('/sign/'))return json({signedURL:'/object/sign/'+url.pathname.split('/sign/')[1]+'?token=fixture'});return json({Key:owner+'/fixture.png'})}
  if(fail===name){fail='';return json({message:'Fixture failure'},500)}
  if(url.pathname.includes('/rpc/')){
   if(name==='ensure_trip_days'){ensure(body.target_trip_id);return json(null)}
   if(name==='create_trip_draft'){let t=db.trips.find(t=>t.id===body.draft_id);if(!t){t={...body.details,id:body.draft_id,user_id:owner,preparation:[],deleted_at:null};db.trips.push(t);ensure(t.id)}for(const idea of body.details.draft_ideas||[]){const day=db.trip_days.find(d=>d.trip_id===t.id&&d.is_ideas);if(!db.itinerary_items.some(i=>i.id===idea.id))db.itinerary_items.push({...idea,trip_day_id:day.id,status:'planned',sort_order:db.itinerary_items.length,item_type:'activity'})}if(lost){lost=false;return json({message:'Fixture lost response'},500)}return json(t)}
   if(name==='trip_folder_summaries')return json(db.trips.filter(t=>!t.deleted_at).map(t=>{const days=db.trip_days.filter(d=>d.trip_id===t.id),items=db.itinerary_items.filter(i=>days.some(d=>d.id===i.trip_day_id)),dates=days.filter(d=>d.date&&!d.is_ideas&&items.some(i=>i.trip_day_id===d.id)).map(d=>d.date).sort();return {trip_id:t.id,place_count:items.length,first_date:dates[0]||null,last_date:dates.at(-1)||null}}))
   if(name==='save_trip_place'||name==='save_discovered_trip_place'){let day=db.trip_days.find(d=>d.trip_id===body.target_trip_id&&!d.is_ideas&&d.date===body.place_date);if(!day){day={id:uid(serial++),trip_id:body.target_trip_id,day_number:Math.max(0,...db.trip_days.filter(d=>d.trip_id===body.target_trip_id).map(d=>d.day_number))+1,date:body.place_date,is_ideas:false};db.trip_days.push(day)}day.explicit_date=true;const old=db.itinerary_items.find(i=>i.id===body.activity_id),d=body.details,row={...old,...d,id:body.activity_id,trip_day_id:day.id,start_time:d.scheduled_time||null,sort_order:old?.trip_day_id===day.id?old.sort_order:db.itinerary_items.filter(i=>i.trip_day_id===day.id).length,item_type:d.item_type||'activity'};db.itinerary_items=db.itinerary_items.filter(i=>i.id!==row.id).concat(row);db.journal_entries.filter(j=>j.itinerary_item_id===row.id).forEach(j=>j.trip_day_id=day.id);if(lostPlace){lostPlace=false;return json({message:'Lost place response'},500)}return json({item:row,day})}
   if(name==='save_trip_activity'){const old=db.itinerary_items.find(i=>i.id===body.activity_id),d=body.details;const row={...old,...d,id:body.activity_id,trip_day_id:body.target_day_id,start_time:d.scheduled_time||null,sort_order:old?.sort_order??db.itinerary_items.filter(i=>i.trip_day_id===body.target_day_id).length,item_type:d.item_type||old?.item_type||'activity'};db.itinerary_items=db.itinerary_items.filter(i=>i.id!==row.id).concat(row);return json(row)}
   if(name==='name_trip_day'){const day=db.trip_days.find(d=>d.id===body.target_day_id&&d.trip_id===body.target_trip_id);day.title=body.day_title;return json(day)}
   if(name==='move_trip_activity'){const item=db.itinerary_items.find(i=>i.id===body.activity_id);item.trip_day_id=body.target_day_id;item.sort_order=db.itinerary_items.filter(i=>i.trip_day_id===body.target_day_id).length;db.journal_entries.filter(j=>j.itinerary_item_id===item.id).forEach(j=>j.trip_day_id=body.target_day_id);return json(null)}
   if(name==='reorder_itinerary'||name==='reorder_trip_places'){body.item_ids.forEach((id:string,n:number)=>db.itinerary_items.find(i=>i.id===id).sort_order=n+1);return json(null)}
   if(name==='set_trip_cover'){db.media.filter(m=>m.trip_id===body.target_trip_id).forEach(m=>m.is_cover=m.id===body.target_media_id);return json(null)}
   return json(null)
  }
  if(!db[name])return json([])
  const matches=(row:any)=>[...url.searchParams].every(([key,val])=>{if(val.startsWith('eq.'))return String(row[key])===val.slice(3);if(val.startsWith('is.'))return val==='is.null'?row[key]==null:true;if(val.startsWith('in.'))return val.slice(3).replace(/[()"]/g,'').split(',').includes(row[key]);return true})
  let rows=db[name].filter(matches)
  if(method==='POST'){const row={...body,id:body.id||uid(serial++),user_id:owner};db[name]=db[name].filter(r=>r.id!==row.id).concat(row);return json(row)}
  if(method==='PATCH'){rows.forEach(row=>{Object.assign(row,body);if(name==='trips'&&('start_date'in body||'end_date'in body)){db.trip_days.filter(d=>d.trip_id===row.id&&!d.is_ideas&&!d.explicit_date).forEach(d=>d.date=row.start_date?new Date(Date.parse(row.start_date)+(d.day_number-1)*86400000).toISOString().slice(0,10):null);ensure(row.id)}});return json(rows[0]||null)}
  if(method==='DELETE'){db[name]=db[name].filter(r=>!matches(r));return json(null)}
  const count=rows.length,offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||1000);rows=rows.slice(offset,offset+limit)
  return json(req.headers().accept?.includes('vnd.pgrst.object')?rows[0]||null:rows,200,count)
 })
 return {db,user,session,fail(name:string){fail=name},loseCreate(){lost=true},losePlace(){lostPlace=true},image(value:Buffer){png=value}}
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

export async function shot(page:Page,name:string){await mkdir('test-results/planner',{recursive:true});await capture(page,{path:'test-results/planner/'+name+'.png',fullPage:true})}
export async function noOverflow(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)}

