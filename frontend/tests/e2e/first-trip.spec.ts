import {test,expect} from '@playwright/test'
import {fixture,shot,noOverflow} from './planner-fixture'

for(const width of [390,1440])test(`first trip: true empty collection, name-only creation, first place and refresh at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});const f=await fixture(page);f.db.trips=[];f.db.trip_days=[];f.db.itinerary_items=[]
 let summaryCalls=0,creates=0
 await page.route('**/rpc/trip_folder_summaries',async r=>{summaryCalls++;await r.fallback()})
 page.on('request',r=>{if(r.url().endsWith('/rpc/create_trip_draft'))creates++})
 await page.goto('/trips');await expect(page.getByRole('heading',{name:'Your first journey starts here.',exact:true})).toBeVisible();await expect(page.getByText('Create a trip, then add places and times as you go.',{exact:true})).toBeVisible();await expect(page.getByRole('searchbox')).toHaveCount(0);expect(summaryCalls).toBe(0);await noOverflow(page);await shot(page,'first-trip-empty-'+width)
 await page.getByRole('link',{name:'Create your first trip',exact:true}).tap();await page.getByLabel('Trip name',{exact:true}).fill('  Our first weekend  ')
 // Same event turn simulates repeated submission before Vue can disable the control.
 await page.locator('dialog form').evaluate(form=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))})
 await expect(page.getByRole('button',{name:'Add your first place',exact:true})).toBeVisible();expect(creates).toBe(1);expect(f.db.trips).toHaveLength(1);expect(f.db.trips[0].title).toBe('Our first weekend');expect(f.db.trips[0].start_date??null).toBeNull();expect(f.db.trips[0].destination??null).toBeNull()
 await page.getByRole('button',{name:'Add your first place',exact:true}).tap();const editor=page.getByRole('dialog',{name:'Add or edit a place',exact:true});await editor.getByLabel('Place or activity name').fill('Breakfast together');await editor.getByRole('button',{name:'Save place',exact:true}).tap();await expect(editor).not.toBeVisible();await page.reload();await expect(page.getByRole('button',{name:'Breakfast together',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Unscheduled',exact:true})).toBeVisible();await noOverflow(page)
 await page.getByRole('link',{name:'← Back to Trips',exact:true}).tap();await expect(page.locator('.trip-folder')).toContainText('1 place');await page.getByRole('searchbox').fill('No such name');await expect(page.getByRole('heading',{name:'No matching trips',exact:true})).toBeVisible();await expect(page.getByText('Your first journey starts here.',{exact:true})).toHaveCount(0)
})

test('empty list does not depend on summaries; real list failures stay errors',async({page})=>{
 const f=await fixture(page);f.db.trips=[];f.db.trip_days=[];f.db.itinerary_items=[]
 await page.route('**/rpc/trip_folder_summaries',r=>r.fulfill({status:404,contentType:'application/json',body:JSON.stringify({code:'PGRST202',message:'Function unavailable'})}))
 f.fail('trips');await page.goto('/trips');await expect(page.getByRole('alert')).toContainText('We couldn’t open your trips');await expect(page.getByText('Your first journey starts here.',{exact:true})).toHaveCount(0);await expect(page.getByRole('searchbox')).toHaveCount(0)
 await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.getByRole('heading',{name:'Your first journey starts here.',exact:true})).toBeVisible()
})

test('confirmed creation followed by a load failure retries opening, never creating',async({page})=>{
 const f=await fixture(page);f.db.trips=[];f.db.trip_days=[];f.db.itinerary_items=[];let creates=0
 page.on('request',r=>{if(r.url().endsWith('/rpc/create_trip_draft'))creates++})
 await page.goto('/trips/new');await page.getByLabel('Trip name',{exact:true}).fill('Already saved');f.fail('media');await page.getByRole('button',{name:'Create trip',exact:true}).click()
 await expect(page).toHaveURL(/\/trips\/[0-9a-f-]+$/);await expect(page.getByRole('alert')).toContainText('We couldn’t open this trip');expect(creates).toBe(1);expect(f.db.trips).toHaveLength(1)
 await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.getByRole('button',{name:'Add your first place',exact:true})).toBeVisible();expect(creates).toBe(1)
})

test('expired session can sign in again without losing the creation draft',async({page})=>{
 const f=await fixture(page);f.db.trips=[];let creates=0
 page.on('request',r=>{if(r.url().endsWith('/rpc/create_trip_draft'))creates++})
 await page.goto('/trips/new');await page.getByLabel('Trip name',{exact:true}).fill('Keep this name')
 await page.route('**/auth/v1/user',r=>r.fulfill({status:401,contentType:'application/json',body:JSON.stringify({code:'bad_jwt',message:'JWT expired'})}))
 await page.getByRole('button',{name:'Create trip',exact:true}).click();await expect(page.getByRole('group',{name:'Sign in again'})).toBeVisible();await expect(page.getByLabel('Trip name',{exact:true})).toHaveValue('Keep this name');expect(creates).toBe(0)
 await page.unroute('**/auth/v1/user');await page.getByLabel('Email address',{exact:true}).fill('planner@example.test');await page.getByLabel('Password',{exact:true}).fill('fixture-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('group',{name:'Sign in again'})).not.toBeVisible();await page.getByRole('button',{name:'Create trip',exact:true}).click();await expect(page.getByRole('button',{name:'Add your first place',exact:true})).toBeVisible();expect(creates).toBe(1)
})

test('expired session before opening a list returns to login, never a false empty state',async({page})=>{
 await fixture(page);await page.route('**/auth/v1/user',r=>r.fulfill({status:401,contentType:'application/json',body:JSON.stringify({code:'bad_jwt',message:'JWT expired'})}));await page.goto('/trips');await expect(page).toHaveURL(/\/login\?redirect=\/trips/);await expect(page.getByText('Your first journey starts here.',{exact:true})).toHaveCount(0)
})
