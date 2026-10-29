import {test,expect,type Page} from '@playwright/test'
import {loadEnv} from 'vite'
const env=loadEnv('development',process.cwd(),'VITE_'),host=new URL(env.VITE_SUPABASE_URL).hostname
const actor='11111111-1111-4111-8111-111111111111',journal='22222222-2222-4222-8222-222222222222',entryId='33333333-3333-4333-8333-333333333333',inviteId='44444444-4444-4444-8444-444444444444',myJournal='55555555-5555-4555-8555-555555555555'
const invitationPath='/journal/invitations/accept',token='a'.repeat(96)
const invitationUrl=invitationPath+'?invitation='+inviteId
const empty=()=>({version:1,pages:[{id:'page-left',elements:[]},{id:'page-right',elements:[]}]})
async function fixture(page:Page,initialRole:'owner'|'viewer'|'editor'='viewer',signedIn=true){
 let role:'owner'|'viewer'|'editor'|null=initialRole,accepts=0,exchanges=0,conflict=false,contextStatus='pending'
 let entry:any={id:entryId,journal_id:journal,user_id:actor,version:1,title:'A shared afternoon',content:'A page we keep together.',entry_date:'2026-10-29',visibility:'friends',scrapbook_layout:empty(),tags:[],created_at:'2026-10-29T00:00:00Z',updated_at:'2026-10-29T00:00:00Z'}
 const user={id:actor,email:'journal-reader@example.test',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-10-29T00:00:00Z',factors:[]}
 const session={access_token:`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:actor,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated',aud:'authenticated',aal:'aal1'})).toString('base64url')}.fixture`,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}
 if(signedIn)await page.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:`sb-${host.split('.')[0]}-auth-token`,session})
 await page.route(`https://${host}/**`,async route=>{
  const request=route.request(),url=new URL(request.url()),name=url.pathname.split('/').pop(),body=request.method()==='POST'?request.postDataJSON():{}
  const json=(data:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data),headers:{'content-range':Array.isArray(data)?`0-${Math.max(0,data.length-1)}/${data.length}`:'0-0/1'}})
  if(url.pathname.endsWith('/auth/v1/token'))return json(session)
  if(url.pathname.endsWith('/auth/v1/signup'))return json(session)
  if(url.pathname.endsWith('/auth/v1/user'))return json(user)
  if(name==='profiles')return json({user_id:actor,id:actor,full_name:'Journal reader',role:'user',account_status:'active'})
  if(name==='list_my_journals')return json([{id:myJournal,title:'My journal',owner_id:actor,role:'owner',shared:false,share_future:false},...(role?[{id:journal,title:'Together, in pages',owner_id:actor,role,shared:true,share_future:false}]:[])])
  if(name==='journal_role')return json(role)
  if(name==='journal_entry_access')return json(role?{journal_id:journal,role,version:entry.version,last_editor:'A fellow writer'}:null)
  if(name==='can_edit_journal_entry')return json(role==='owner'||role==='editor')
  if(name==='journal_sharing_details')return json({private_count:3,invitations:[],members:[{user_id:inviteId,name:'A fellow writer',role:'viewer'}]})
  if(name==='create_journal_invite')return json({id:inviteId,token,role:body.invited_role,expires_at:'2026-11-05T00:00:00Z'})
  if(name==='manage_journal_sharing'){if(body.action==='leave')role=null;return json(null)}
  if(name==='save_journal_entry'){
   if(!role||role==='viewer')return json({message:'Entry is unavailable or read only',code:'42501'},403)
   if(conflict){conflict=false;entry={...entry,title:'A newer saved afternoon',version:2};return json({message:'This entry changed',code:'40001'},409)}
   entry={...entry,...body.details,version:entry.version+1};return json(entry)
  }
  if(name==='journal_entries')return role?json(url.searchParams.has('id')?entry:[entry]):json({message:'Entry unavailable',code:'PGRST116'},406)
  if(name==='sticker_assets'||name==='media'||name==='journal_sticker_placements')return json([])
  return json([])
 })
 await page.route('**/api/journal-invites',async route=>{
  const body=route.request().postDataJSON()
  if(body.action==='exchange'){exchanges++;await page.context().addCookies([{name:'cronevia-invite-local',value:'opaque-fixture-claim',url:'http://127.0.0.1:5180',httpOnly:true,sameSite:'Lax'}]);return route.fulfill({contentType:'application/json',body:'{"status":"exchanged"}'})}
  if(body.action==='accept'){accepts++;return route.fulfill({contentType:'application/json',body:JSON.stringify({status:'accepted',journal_id:journal,role:'viewer'})})}
  return route.fulfill({contentType:'application/json',body:JSON.stringify({status:contextStatus,invitation_id:inviteId,role:contextStatus==='member'?role:'viewer',journal_id:contextStatus==='member'?journal:undefined,journal_title:'Together, in pages'})})
 })
 return {get accepts(){return accepts},get exchanges(){return exchanges},setRole(value:typeof role){role=value},context(status:string){contextStatus=status},conflict(){conflict=true}}
}
async function noOverflow(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)}
test('invitation fragment is removed; sign-in and registration retain the pending invitation; acceptance is explicit',async({page})=>{
 const f=await fixture(page,'viewer',false)
 await page.goto(invitationUrl+'#invite='+token)
 await expect(page).toHaveURL(invitationUrl)
 await expect(page.getByRole('link',{name:'Sign in',exact:true})).toBeVisible();expect(f.exchanges).toBe(1);expect(f.accepts).toBe(0)
 expect(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).not.toContain(token)
 await page.getByRole('link',{name:'Create an account'}).click();await expect(page).toHaveURL(/register\?redirect=/)
 await page.getByRole('link',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/login\?redirect=/)
 await page.getByLabel('Email Address').fill('journal-reader@example.test');await page.getByLabel('Password',{exact:true}).fill('example-password-123')
 await page.getByRole('button',{name:'Sign In',exact:true}).click();await expect(page).toHaveURL(invitationUrl)
 await expect(page.getByRole('button',{name:'Accept invitation'})).toBeVisible();expect(f.accepts).toBe(0)
 await page.reload();await expect(page.getByRole('button',{name:'Accept invitation'})).toBeVisible();expect(f.accepts).toBe(0)
 await page.getByRole('button',{name:'Accept invitation'}).click();await expect(page).toHaveURL('/journal?journal='+journal);expect(f.accepts).toBe(1)
 await noOverflow(page)
})
test('Shared with me uses existing entry links and read-only UI, including direct refresh and back navigation',async({page})=>{
 await fixture(page)
 await page.goto('/journal?journal='+journal)
 await expect(page.getByRole('heading',{name:'Shared with me'})).toBeVisible()
 await expect(page.getByRole('link',{name:'Write an Entry'})).toHaveCount(0)
 await page.getByRole('link',{name:'Read Entry'}).click();await expect(page).toHaveURL('/journal/'+entryId)
 await expect(page.getByRole('heading',{name:'A shared afternoon'})).toBeVisible();await expect(page.getByRole('button',{name:'Edit journal',exact:true})).toHaveCount(0)
 await page.reload();await expect(page.getByRole('heading',{name:'A shared afternoon'})).toBeVisible()
 await page.goBack();await expect(page).toHaveURL('/journal?journal='+journal);await noOverflow(page)
})
test('edit conflict keeps the draft and requires an explicit load-latest action',async({page})=>{
 const f=await fixture(page,'editor');await page.goto('/journal/'+entryId)
 await page.getByRole('button',{name:'Edit journal',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('My unsaved afternoon');f.conflict()
 await page.getByRole('button',{name:'Save entry',exact:true}).click();await expect(page.getByText('Your draft will not overwrite the newer entry.')).toBeVisible()
 await expect(page.getByLabel('Title',{exact:true})).toHaveValue('My unsaved afternoon')
 await page.getByRole('button',{name:'Copy draft',exact:true}).click();await expect(page.getByLabel('Your unsaved draft')).toHaveValue(/My unsaved afternoon/)
 await page.getByRole('button',{name:'Close sheet'}).click();page.once('dialog',dialog=>dialog.accept())
 await page.getByRole('button',{name:'Load latest',exact:true}).click();await expect(page.getByRole('heading',{name:'A newer saved afternoon'})).toBeVisible();await noOverflow(page)
})
test('removed access clears journal content on the next access check',async({page})=>{
 const f=await fixture(page,'editor');await page.goto('/journal/'+entryId);await expect(page.getByRole('heading',{name:'A shared afternoon'})).toBeVisible()
 f.setRole(null);await page.evaluate(()=>window.dispatchEvent(new Event('focus')))
 await expect(page.getByText('This entry is unavailable or your access has ended.')).toBeVisible();await expect(page.getByRole('heading',{name:'A shared afternoon'})).toHaveCount(0)
})
test('a denied save immediately rechecks access and clears a removed member’s page',async({page})=>{
 const f=await fixture(page,'editor');await page.goto('/journal/'+entryId);await page.getByRole('button',{name:'Edit journal',exact:true}).click()
 await page.getByLabel('Title',{exact:true}).fill('A draft before removal');f.setRole(null)
 await page.getByRole('button',{name:'Save entry',exact:true}).click();await expect(page.getByText('This entry is unavailable or your access has ended.')).toBeVisible();await expect(page.getByLabel('Title',{exact:true})).toHaveCount(0)
})
test('owner sharing explains private boundaries and clears the generated link when closed',async({page})=>{
 await fixture(page,'owner');await page.goto('/journal?journal='+journal);await page.getByRole('button',{name:'Share journal'}).click()
 const sheet=page.getByRole('dialog',{name:'Share your journal'});await expect(sheet.getByText(/3 private entries stay private/)).toBeVisible()
 await sheet.getByRole('button',{name:'Create single-use link'}).click();await expect(sheet.getByLabel('Invitation link',{exact:true})).toHaveValue(new RegExp('#invite='+token+'$'))
 await page.screenshot({path:'test-results/shared-journal-mobile.png',fullPage:true})
 await noOverflow(page);await sheet.getByRole('button',{name:'Close sheet'}).click();await page.getByRole('button',{name:'Share journal'}).click();await expect(sheet.getByLabel('Invitation link',{exact:true})).toHaveCount(0)
})
test('existing members go directly to their journal with their current role',async({page})=>{
 const f=await fixture(page,'editor');f.context('member');await page.goto(invitationUrl)
 await expect(page).toHaveURL('/journal?journal='+journal);expect(f.accepts).toBe(0)
 await expect(page.getByRole('link',{name:'Write an Entry'})).toBeVisible()
})
test('a different pending invitation and denied entry cannot expose the intended journal',async({page})=>{
 const f=await fixture(page,'viewer');await page.goto(invitationPath+'?invitation='+myJournal)
 await expect(page.getByText('Another invitation was opened in this browser.',{exact:false})).toBeVisible();await expect(page.getByRole('button',{name:'Accept invitation'})).toHaveCount(0);expect(f.accepts).toBe(0)
 f.setRole(null);await page.goto('/journal/'+entryId)
 await expect(page.getByText('This entry is unavailable or your access has ended.')).toBeVisible();await expect(page.getByRole('button',{name:'Edit journal',exact:true})).toHaveCount(0)
})
test('registration returns to the exact invitation and still asks for acceptance',async({page})=>{
 const f=await fixture(page,'viewer',false);await page.goto(invitationUrl+'#invite='+token)
 await page.getByRole('link',{name:'Create an account'}).click()
 await page.getByLabel('Full Name',{exact:true}).fill('A new writer');await page.getByLabel('Email Address',{exact:true}).fill('new-writer@example.test');await page.getByLabel('Password',{exact:true}).fill('example-password-123');await page.getByLabel('Confirm Password',{exact:true}).fill('example-password-123')
 await page.getByRole('button',{name:'Create Account',exact:true}).click();await expect(page).toHaveURL(invitationUrl)
 await expect(page.getByRole('button',{name:'Accept invitation'})).toBeVisible();expect(f.accepts).toBe(0)
})
