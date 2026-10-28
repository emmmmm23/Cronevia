import { PGlite } from '@electric-sql/pglite'
import { readFile, readdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { testTrackers } from './test-trackers-database.mjs'
import { testAccountSecurity } from './test-account-security-database.mjs'
import { testProfileAvatars } from './test-profile-avatars-database.mjs'

async function main() {
// Real PostgreSQL running locally in WASM; auth/storage platform schemas are test fixtures.
const db = new PGlite()
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE FUNCTION public.uuid_generate_v4() RETURNS uuid LANGUAGE sql AS 'SELECT gen_random_uuid()';
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,last_sign_in_at timestamptz,raw_user_meta_data jsonb DEFAULT '{}');
CREATE TABLE auth.mfa_factors(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users(id),status text);
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT COALESCE(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text,metadata jsonb);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array($1,'/') $$;
GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated;
GRANT ALL ON storage.objects TO authenticated;
`)
const directory = new URL('../../supabase/migrations/', import.meta.url)
for (const file of (await readdir(directory)).filter(f=>f.endsWith('.sql')).sort()) {
  const sql = (await readFile(new URL(file,directory),'utf8')).replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/g,'')
  try { await db.exec(sql); console.log(`Applied ${file}`) }
  catch(e) { console.error(`Migration failed: ${file}: ${e.message}`); process.exitCode=1; await db.close(); process.exit(1) }
}
// The documented upgrade must also work twice on an existing installation.
const scrapbookUpgrade=await readFile(new URL('../../supabase/apply-scrapbook-upgrade.sql',import.meta.url),'utf8')
await db.exec(scrapbookUpgrade)
await db.exec(scrapbookUpgrade)
const alice='11111111-1111-4111-8111-111111111111', bob='22222222-2222-4222-8222-222222222222', admin='33333333-3333-4333-8333-333333333333'
await db.query(`INSERT INTO auth.users(id,email) VALUES($1,'alice@example.test'),($2,'bob@example.test'),($3,'admin@example.test')`,[alice,bob,admin])
await db.query(`UPDATE public.profiles SET role='super_admin' WHERE user_id=$1`,[admin])
async function asUser(id){await db.exec('RESET ROLE');await db.query(`SELECT set_config('request.jwt.claim.sub',$1,false)`,[id]);await db.exec('SET ROLE authenticated')}
async function rejected(sql,params=[]){await assert.rejects(()=>db.query(sql,params))}
// A newly bootstrapped, ordinary account can create its very first private trip.
const firstOwner='12121212-1212-4212-8212-121212121212',firstTrip='13131313-1313-4313-8313-131313131313',firstStop='14141414-1414-4414-8414-141414141414'
await db.query("INSERT INTO auth.users(id,email) VALUES($1,'first-trip@example.test')",[firstOwner])
await asUser(firstOwner)
assert.equal((await db.query('SELECT * FROM trips')).rows.length,0)
assert.equal((await db.query('SELECT * FROM trip_folder_summaries()')).rows.length,0)
assert.equal((await db.query('SELECT account_status FROM profiles WHERE user_id=$1',[firstOwner])).rows[0].account_status,'active')
for(let attempt=0;attempt<2;attempt++)await db.query('SELECT create_trip_draft($1,$2)',[firstTrip,JSON.stringify({title:'  My very first trip  '})])
let first=(await db.query('SELECT * FROM trips WHERE id=$1',[firstTrip])).rows[0]
assert.equal(first.title,'My very first trip');assert.equal(first.user_id,firstOwner);assert.equal(first.visibility,'private')
for(const key of ['destination','start_date','end_date','description','destination_latitude','destination_longitude'])assert.equal(first[key],null)
assert.equal((await db.query('SELECT count(*) AS n FROM trips')).rows[0].n,1)
assert.equal((await db.query('SELECT count(*) AS n FROM itinerary_items')).rows[0].n,0)
await db.query('SELECT save_trip_place($1,$2,NULL,$3)',[firstTrip,firstStop,JSON.stringify({title:'A first manual stop'})])
assert.equal((await db.query('SELECT title FROM itinerary_items WHERE id=$1',[firstStop])).rows[0].title,'A first manual stop')
const discovered={title:'A provider place',location_name:'Manila',latitude:14.6,longitude:120.98,location_source:'search',place_provider:'geoapify',provider_place_id:'provider-fixture'}
for(let attempt=0;attempt<2;attempt++)await db.query('SELECT save_discovered_trip_place($1,$2,$3,$4)',[firstTrip,firstStop,'2026-10-24',JSON.stringify(discovered)])
assert.equal((await db.query('SELECT count(*) AS n FROM itinerary_items WHERE id=$1',[firstStop])).rows[0].n,1)
assert.deepEqual((await db.query('SELECT place_provider,provider_place_id,latitude,longitude FROM itinerary_items WHERE id=$1',[firstStop])).rows[0],{place_provider:'geoapify',provider_place_id:'provider-fixture',latitude:14.6,longitude:120.98})
await rejected('SELECT save_discovered_trip_place($1,$2,$3,$4)',[firstTrip,firstStop,'2026-10-24',JSON.stringify({...discovered,place_provider:null})])
assert.equal((await db.query('SELECT provider_place_id FROM itinerary_items WHERE id=$1',[firstStop])).rows[0].provider_place_id,'provider-fixture')
await db.query('SELECT save_trip_place($1,$2,$3,$4)',[firstTrip,firstStop,'2026-10-24',JSON.stringify({title:'Edited manually',location_name:'A different address',latitude:null,longitude:null,location_source:null})])
assert.equal((await db.query('SELECT provider_place_id FROM itinerary_items WHERE id=$1',[firstStop])).rows[0].provider_place_id,null)
await asUser(bob)
assert.equal((await db.query('SELECT * FROM trips WHERE id=$1',[firstTrip])).rows.length,0)
assert.equal((await db.query("UPDATE trips SET title='Not mine' WHERE id=$1 RETURNING id",[firstTrip])).rows.length,0)
assert.equal((await db.query('SELECT * FROM itinerary_items WHERE id=$1',[firstStop])).rows.length,0)
await rejected('SELECT create_trip_draft($1,$2)',[firstTrip,JSON.stringify({title:'Not mine'})])
await rejected('SELECT save_trip_place($1,$2,NULL,$3)',[firstTrip,firstStop,JSON.stringify({title:'Not mine'})])
await rejected('SELECT save_discovered_trip_place($1,$2,NULL,$3)',[firstTrip,firstStop,JSON.stringify(discovered)])
await db.exec('RESET ROLE');await db.query('DELETE FROM auth.users WHERE id=$1',[firstOwner])
console.log('PASS: newly bootstrapped account, zero-trip summary, trimmed name-only creation/retry, optional fields, first manual place, and cross-user read/write rejection.')
await asUser(alice)
const trip=(await db.query(`INSERT INTO trips(title,slug) VALUES('Alice trip','alice-trip') RETURNING id`)).rows[0].id
const journal=(await db.query(`INSERT INTO journal_entries(title,content,entry_date,trip_id) VALUES('Private entry','Only Alice',current_date,$1) RETURNING id`,[trip])).rows[0].id
const day=(await db.query(`INSERT INTO trip_days(trip_id,day_number) VALUES($1,1) RETURNING id`,[trip])).rows[0].id
const item=(await db.query(`INSERT INTO itinerary_items(trip_day_id,title) VALUES($1,'Walk') RETURNING id`,[day])).rows[0].id
await db.query(`SELECT reorder_itinerary($1,ARRAY[$2::uuid])`,[day,item])
await rejected(`SELECT reorder_itinerary($1,ARRAY[$2::uuid,$2::uuid])`,[day,item])
await db.query(`UPDATE profiles SET full_name='Alice updated' WHERE user_id=$1`,[alice])
await rejected(`UPDATE profiles SET role='super_admin' WHERE user_id=$1`,[alice])
await rejected(`SELECT promote_to_super_admin('alice@example.test')`)
await rejected(`SELECT * FROM admin_user_details($1)`,[bob])
await rejected(`SELECT * FROM get_content_statistics()`)
const capsule=(await db.query(`SELECT create_capsule('Later','Secret message',current_date+1) AS id`)).rows[0].id
const listing=(await db.query(`SELECT list_capsules() AS value`)).rows[0].value
assert.equal(listing[0].can_open,false)
assert.ok(!JSON.stringify(listing).includes('Secret message'))
await rejected(`SELECT message FROM time_capsules`)
await rejected(`SELECT open_capsule($1)`,[capsule])
await db.query(`INSERT INTO storage.objects(bucket_id,name) VALUES('cronevia-media',$1)`,[`${alice}/photo.jpg`])
await rejected(`INSERT INTO storage.objects(bucket_id,name) VALUES('cronevia-media',$1)`,[`${bob}/photo.jpg`])
await asUser(bob)
assert.equal((await db.query('SELECT * FROM trips')).rows.length,0)
assert.equal((await db.query('SELECT * FROM journal_entries')).rows.length,0)
assert.equal((await db.query('SELECT * FROM trip_days')).rows.length,0)
assert.equal((await db.query('SELECT * FROM itinerary_items')).rows.length,0)
assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,0)
await rejected(`INSERT INTO journal_entries(user_id,title,content,entry_date) VALUES($1,'Forged','x',current_date)`,[alice])
await rejected(`INSERT INTO journal_entries(title,content,entry_date,trip_id) VALUES('Cross-link','x',current_date,$1)`,[trip])
await rejected(`INSERT INTO trip_days(trip_id,day_number) VALUES($1,2)`,[trip])
await rejected(`SELECT set_trip_cover($1,gen_random_uuid())`,[trip])
assert.equal((await db.query(`UPDATE journal_entries SET content='stolen' WHERE id=$1 RETURNING id`,[journal])).rows.length,0)

await asUser(alice)
const memory=(await db.query("INSERT INTO memories(title,memory_date) VALUES('Notebook memory',current_date) RETURNING id")).rows[0].id
const photo=(await db.query("INSERT INTO media(user_id,journal_entry_id,storage_path,file_name,mime_type,size_bytes) VALUES($1,$2,$3,'photo.jpg','image/jpeg',100) RETURNING id",[alice,journal,alice+'/photo.jpg'])).rows[0].id
const decoration={id:'placement',type:'photo',assetId:photo,x:.5,y:.5,width:.3,aspectRatio:1.5,rotation:-8,zIndex:2,frame:'polaroid'}
const composition={version:1,pages:[{id:'page-left',elements:[decoration]},{id:'page-right',elements:[{...decoration,id:'sticker',type:'sticker',assetId:'builtin-flower-01.svg',frame:'plain'}]}]}
for(const table of ['journal_entries','memories']){
 const recordId=table==='memories'?memory:journal
 await db.query(`UPDATE ${table} SET scrapbook_layout=$1 WHERE id=$2`,[JSON.stringify(composition),recordId])
 assert.deepEqual((await db.query(`SELECT scrapbook_layout FROM ${table} WHERE id=$1`,[recordId])).rows[0].scrapbook_layout,composition)
 for(const invalid of [{assetId:'blob:temporary'},{assetId:bob},{x:2},{width:0},{rotation:999},{frame:'invalid'},{type:'video'},{aspectRatio:0},{zIndex:1.5}]){
  const bad=structuredClone(composition);Object.assign(bad.pages[0].elements[0],invalid)
  await rejected(`UPDATE ${table} SET scrapbook_layout=$1 WHERE id=$2`,[JSON.stringify(bad),recordId])
 }
}
// Rejected layout updates retain both previously saved writing and the complete composition.
await rejected("UPDATE journal_entries SET content='must roll back',scrapbook_layout=$1 WHERE id=$2",[JSON.stringify({...composition,version:99}),journal])
assert.equal((await db.query('SELECT content FROM journal_entries WHERE id=$1',[journal])).rows[0].content,'Only Alice')
assert.deepEqual((await db.query('SELECT scrapbook_layout FROM journal_entries WHERE id=$1',[journal])).rows[0].scrapbook_layout,composition)
const legacyPlacement={id:'44444444-4444-4444-8444-444444444444',sticker_asset_id:'builtin-flower-01.svg',x:.4,y:.3,width:.2,rotation:-5,z_index:0}
await db.query('SELECT replace_journal_stickers($1,$2)',[journal,JSON.stringify([legacyPlacement])])
await rejected('SELECT replace_journal_stickers($1,$2)',[journal,JSON.stringify([{...legacyPlacement,width:0}])])
assert.equal(Number((await db.query('SELECT width FROM journal_sticker_placements WHERE journal_entry_id=$1',[journal])).rows[0].width),.2)
const draft='55555555-5555-4555-8555-555555555555'
await db.query("SELECT create_journal_draft($1,'Retry safe','Original',current_date)",[draft])
await db.query("SELECT create_journal_draft($1,'Retry safe','Second request',current_date)",[draft])
assert.equal((await db.query('SELECT count(*) AS n FROM journal_entries WHERE id=$1',[draft])).rows[0].n,1)
assert.equal((await db.query('SELECT content FROM journal_entries WHERE id=$1',[draft])).rows[0].content,'Original')
const memoryDraft='66666666-6666-4666-8666-666666666666'
await db.query("SELECT create_memory_draft($1,'New memory','Remember',current_date)",[memoryDraft])
await db.query("SELECT create_memory_draft($1,'Retry','Remember',current_date)",[memoryDraft])
assert.equal((await db.query('SELECT count(*) AS n FROM memories WHERE id=$1',[memoryDraft])).rows[0].n,1)
await asUser(bob)
await rejected("SELECT create_memory_draft($1,'Hijack','x',current_date)",[memoryDraft])
await rejected('SELECT replace_journal_stickers($1,$2)',[journal,'[]'])
await rejected("SELECT create_journal_draft($1,'Hijack','x',current_date)",[draft])
await asUser(alice)
assert.equal((await db.query('SELECT count(*) AS n FROM sticker_assets WHERE user_id IS NULL')).rows[0].n,12)
await rejected('DELETE FROM media WHERE id=$1',[photo])
await rejected("INSERT INTO sticker_assets(user_id,storage_path,mime_type,width,height) VALUES($1,$2,'image/png',100,100)",[alice,bob+'/forged.png'])
await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('stickers-custom',$1)",[alice+'/sticker.png'])
await rejected("INSERT INTO storage.objects(bucket_id,name) VALUES('stickers-custom',$1)",[bob+'/sticker.png'])
await asUser(bob)
const bobsMemory=(await db.query("INSERT INTO memories(title,memory_date) VALUES('Bob memory',current_date) RETURNING id")).rows[0].id
await rejected('UPDATE memories SET scrapbook_layout=$1 WHERE id=$2',[JSON.stringify(composition),bobsMemory])
assert.equal((await db.query("SELECT * FROM storage.objects WHERE bucket_id='stickers-custom'")).rows.length,0)
console.log('PASS: scrapbook round trips on journal and memories, repeated upgrade, malformed layouts, cross-user assets, protected asset deletion and custom storage ownership.')

// Planner upgrade is additive, repeatable, owner-scoped and preserves day/activity IDs.
await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub','',false)")
const plannerUpgrade=await readFile(new URL('../../supabase/apply-trip-planner-upgrade.sql',import.meta.url),'utf8')
await db.exec(plannerUpgrade);await db.exec(plannerUpgrade)
await asUser(alice)
const plannedTrip='77777777-7777-4777-8777-777777777777', activity='88888888-8888-4888-8888-888888888888'
const details={title:'A real planner test',start_date:'2026-10-14',end_date:'2026-10-16',timezone:'Asia/Manila'}
await db.query('SELECT create_trip_draft($1,$2)',[plannedTrip,JSON.stringify(details)])
await db.query('SELECT create_trip_draft($1,$2)',[plannedTrip,JSON.stringify(details)])
assert.equal((await db.query('SELECT count(*) AS n FROM trips WHERE id=$1',[plannedTrip])).rows[0].n,1)
let plannedDays=(await db.query('SELECT * FROM trip_days WHERE trip_id=$1 ORDER BY day_number',[plannedTrip])).rows
assert.equal(plannedDays.length,4)
const dayOne=plannedDays.find(d=>d.day_number===1).id,dayThree=plannedDays.find(d=>d.day_number===3).id,ideas=plannedDays.find(d=>d.is_ideas).id
await db.query('SELECT save_trip_activity($1,$2,$3,$4)',[plannedTrip,dayThree,activity,JSON.stringify({title:'Afternoon cafés',time_label:'Afternoon',status:'planned'})])
await db.query('SELECT save_trip_activity($1,$2,$3,$4)',[plannedTrip,dayThree,activity,JSON.stringify({title:'Afternoon cafés',time_label:'Afternoon',status:'planned'})])
assert.equal((await db.query('SELECT count(*) AS n FROM itinerary_items WHERE id=$1',[activity])).rows[0].n,1)
await db.query("UPDATE trips SET start_date='2026-11-01',end_date='2026-11-02' WHERE id=$1",[plannedTrip])
assert.equal((await db.query('SELECT trip_day_id FROM itinerary_items WHERE id=$1',[activity])).rows[0].trip_day_id,dayThree)
assert.equal((await db.query('SELECT date::text FROM trip_days WHERE id=$1',[dayThree])).rows[0].date,'2026-11-03')
await rejected("UPDATE trips SET start_date='2026-12-01',end_date='2026-11-01' WHERE id=$1",[plannedTrip])
assert.equal((await db.query('SELECT date::text FROM trip_days WHERE id=$1',[dayOne])).rows[0].date,'2026-11-01')
await db.query('UPDATE trips SET start_date=NULL,end_date=NULL WHERE id=$1',[plannedTrip])
assert.equal((await db.query('SELECT date FROM trip_days WHERE id=$1',[dayThree])).rows[0].date,null)
await db.query('SELECT move_trip_activity($1,$2)',[activity,ideas]);await db.query('SELECT move_trip_activity($1,$2)',[activity,dayOne])
const prep=[{id:'pack',title:'Pack essentials',done:true,category:'packing'}]
await db.query('UPDATE trips SET preparation=$1 WHERE id=$2',[JSON.stringify(prep),plannedTrip])
assert.deepEqual((await db.query('SELECT preparation FROM trips WHERE id=$1',[plannedTrip])).rows[0].preparation,prep)
await rejected("UPDATE trips SET timezone='Not/AZone' WHERE id=$1",[plannedTrip])
await rejected('UPDATE trips SET preparation=$1 WHERE id=$2',[JSON.stringify([{...prep[0],done:'yes'}]),plannedTrip])
await rejected('UPDATE trips SET preparation=$1 WHERE id=$2',[JSON.stringify([prep[0],prep[0]]),plannedTrip])
await db.query('UPDATE memories SET trip_id=$1,itinerary_item_id=$2,journal_entry_id=$3 WHERE id=$4',[plannedTrip,activity,journal,memory])
await rejected('UPDATE memories SET trip_id=$1 WHERE id=$2',[trip,memory])
await db.query('UPDATE journal_entries SET trip_id=$1,trip_day_id=$2,itinerary_item_id=$3 WHERE id=$4',[plannedTrip,dayOne,activity,journal])
await db.query('SELECT move_trip_activity($1,$2)',[activity,dayThree])
assert.equal((await db.query('SELECT trip_day_id FROM journal_entries WHERE id=$1',[journal])).rows[0].trip_day_id,dayThree)
await asUser(bob)
await rejected('SELECT ensure_trip_days($1)',[plannedTrip])
await rejected('SELECT create_trip_draft($1,$2)',[plannedTrip,JSON.stringify(details)])
await rejected('SELECT save_trip_activity($1,$2,$3,$4)',[plannedTrip,dayOne,activity,JSON.stringify({title:'Hijack'})])
await rejected('SELECT move_trip_activity($1,$2)',[activity,dayOne])
await rejected('UPDATE memories SET trip_id=$1,itinerary_item_id=$2 WHERE id=$3',[plannedTrip,activity,bobsMemory])
await rejected('UPDATE memories SET journal_entry_id=$1 WHERE id=$2',[journal,bobsMemory])
assert.equal((await db.query('UPDATE trips SET preparation=$1 WHERE id=$2 RETURNING id',['[]',plannedTrip])).rows.length,0)
await asUser(alice)
await db.query('SELECT name_trip_day($1,$2,$3)',[plannedTrip,dayOne,'Exploring Intramuros'])
assert.equal((await db.query('SELECT title FROM trip_days WHERE id=$1',[dayOne])).rows[0].title,'Exploring Intramuros')
await rejected('SELECT name_trip_day($1,$2,$3)',[plannedTrip,ideas,'Not a numbered day'])
await rejected('SELECT name_trip_day($1,$2,$3)',[plannedTrip,dayOne,'x'.repeat(121)])
const night='99999999-9999-4999-8999-999999999999'
await db.query('SELECT save_trip_activity($1,$2,$3,$4)',[plannedTrip,dayOne,night,JSON.stringify({title:'Night ferry',scheduled_time:'23:30',end_time:'01:15',end_day_offset:1,item_type:'transport'})])
let interval=(await db.query('SELECT end_time::text,end_day_offset,duration_minutes,item_type FROM itinerary_items WHERE id=$1',[night])).rows[0]
assert.deepEqual(interval,{end_time:'01:15:00',end_day_offset:1,duration_minutes:105,item_type:'transport'})
await rejected('SELECT save_trip_activity($1,$2,$3,$4)',[plannedTrip,dayOne,night,JSON.stringify({title:'Invalid replacement',scheduled_time:'23:30',end_time:'01:15',end_day_offset:0})])
assert.equal((await db.query('SELECT title FROM itinerary_items WHERE id=$1',[night])).rows[0].title,'Night ferry')
await rejected("UPDATE itinerary_items SET end_day_offset=2 WHERE id=$1",[night])
const draftWithIdeas='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',ideaId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const draftDetails={title:'Draft with possibilities',draft_ideas:[{id:ideaId,title:'Try a local breakfast'}]}
await db.query('SELECT create_trip_draft($1,$2)',[draftWithIdeas,JSON.stringify(draftDetails)])
await db.query('SELECT create_trip_draft($1,$2)',[draftWithIdeas,JSON.stringify(draftDetails)])
assert.equal((await db.query('SELECT count(*) AS n FROM itinerary_items WHERE id=$1',[ideaId])).rows[0].n,1)
assert.equal((await db.query('SELECT d.is_ideas FROM itinerary_items i JOIN trip_days d ON d.id=i.trip_day_id WHERE i.id=$1',[ideaId])).rows[0].is_ideas,true)
const rejectedDraft='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
await rejected('SELECT create_trip_draft($1,$2)',[rejectedDraft,JSON.stringify({title:'Must roll back',draft_ideas:[{id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',title:''}]})])
assert.equal((await db.query('SELECT count(*) AS n FROM trips WHERE id=$1',[rejectedDraft])).rows[0].n,0)
await asUser(bob)
await rejected('SELECT name_trip_day($1,$2,$3)',[plannedTrip,dayOne,'Stolen'])
await rejected('SELECT save_trip_activity($1,$2,$3,$4)',[plannedTrip,dayOne,night,JSON.stringify({title:'Stolen',scheduled_time:'22:00',end_time:'01:00',end_day_offset:1})])
console.log('PASS: named days, explicit overnight intervals, failed-update rollback, atomic draft ideas and cross-user rejection.')
console.log('PASS: planner repeatable upgrade, idempotent creation, flexible activity retries, date preservation/rollback, Ideas moves, preparation validation, linked records and cross-user rejection.')

await db.exec('RESET ROLE')
const destinationMigration=await readFile(new URL('../../supabase/migrations/20261017000001_trip_destination.sql',import.meta.url),'utf8')
await db.exec(destinationMigration)
await db.exec(destinationMigration)
await asUser(alice)
const pinned='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
await db.query('SELECT create_trip_draft($1,$2)',[pinned,JSON.stringify({title:'Pinned trip',destination:'Manila',destination_latitude:14.6,destination_longitude:120.98,destination_source:'search'})])
let saved=(await db.query('SELECT destination,destination_latitude,destination_longitude,destination_source FROM trips WHERE id=$1',[pinned])).rows[0]
assert.deepEqual(saved,{destination:'Manila',destination_latitude:14.6,destination_longitude:120.98,destination_source:'search'})
for(const values of [[91,120,'map'],[14,181,'gps'],[14,null,'map'],[null,null,'gps'],[14,120,'other'],['NaN',120,'map']]) await rejected('UPDATE trips SET destination_latitude=$1,destination_longitude=$2,destination_source=$3 WHERE id=$4',[...values,pinned])
await asUser(bob)
assert.equal((await db.query('SELECT * FROM trips WHERE id=$1',[pinned])).rows.length,0)
assert.equal((await db.query("UPDATE trips SET destination_latitude=0,destination_longitude=0,destination_source='map' WHERE id=$1 RETURNING id",[pinned])).rows.length,0)
await asUser(alice)
await db.query('UPDATE trips SET destination_latitude=null,destination_longitude=null,destination_source=null WHERE id=$1',[pinned])
saved=(await db.query('SELECT destination,destination_latitude,destination_longitude,destination_source FROM trips WHERE id=$1',[pinned])).rows[0]
assert.deepEqual(saved,{destination:'Manila',destination_latitude:null,destination_longitude:null,destination_source:null})
console.log('PASS: destination RPC persistence, paired/range/source constraints, text-only clearing, repeatable migration and ownership isolation.')
await db.exec('RESET ROLE')
const folderMigration=await readFile(new URL('../../supabase/migrations/20261018000001_folder_planner.sql',import.meta.url),'utf8')
await db.exec(folderMigration);await db.exec(folderMigration)
await asUser(alice)
const folder='abcdefab-abcd-4abc-8abc-abcdefabcdef',stop='abcdefab-abcd-4abc-8abc-abcdefabcdee'
await db.query('SELECT create_trip_draft($1,$2)',[folder,JSON.stringify({title:'Name only folder',timezone:'Asia/Manila'})])
assert.equal((await db.query('SELECT count(*) AS n FROM itinerary_items i JOIN trip_days d ON d.id=i.trip_day_id WHERE d.trip_id=$1',[folder])).rows[0].n,0)
const place={title:'Night picnic',location_name:'A manually entered place',scheduled_time:'23:30',end_time:'01:00',end_day_offset:1,latitude:14.1,longitude:120.9,location_source:'map'}
const savePlace=(date,details=place)=>db.query('SELECT save_trip_place($1,$2,$3,$4) AS saved',[folder,stop,date,JSON.stringify(details)])
await savePlace('2026-10-24');await savePlace('2026-10-24')
assert.equal((await db.query('SELECT count(*) AS n FROM itinerary_items WHERE id=$1',[stop])).rows[0].n,1)
let stopRow=(await db.query('SELECT i.*,d.date::text FROM itinerary_items i JOIN trip_days d ON d.id=i.trip_day_id WHERE i.id=$1',[stop])).rows[0]
assert.equal(stopRow.latitude,14.1);assert.equal(stopRow.longitude,120.9);assert.equal(stopRow.location_source,'map');assert.equal(stopRow.date,'2026-10-24');assert.equal(stopRow.duration_minutes,90)
for(const invalid of [{latitude:91},{longitude:181},{longitude:null},{location_source:null},{location_source:'invalid'},{latitude:'NaN'},{end_day_offset:0}])await assert.rejects(()=>savePlace('2026-11-11',{...place,...invalid}))
assert.equal((await db.query("SELECT count(*) AS n FROM trip_days WHERE trip_id=$1 AND date='2026-11-11'",[folder])).rows[0].n,0)
await db.query("UPDATE trips SET start_date='2026-12-01',end_date='2026-12-03' WHERE id=$1",[folder])
assert.equal((await db.query('SELECT d.date::text FROM itinerary_items i JOIN trip_days d ON d.id=i.trip_day_id WHERE i.id=$1',[stop])).rows[0].date,'2026-10-24')
await savePlace('2026-10-25');await savePlace(null,{title:'Unscheduled manual place',latitude:null,longitude:null,location_source:null})
stopRow=(await db.query('SELECT i.*,d.date FROM itinerary_items i JOIN trip_days d ON d.id=i.trip_day_id WHERE i.id=$1',[stop])).rows[0]
assert.equal(stopRow.date,null);assert.equal(stopRow.latitude,null);assert.equal(stopRow.longitude,null);assert.equal(stopRow.start_time,null)
assert.equal((await db.query('SELECT * FROM trip_folder_summaries() WHERE trip_id=$1',[folder])).rows[0].place_count,1)
const legacyDay='abcdefab-abcd-4abc-8abc-abcdefabcd01',legacyStop='abcdefab-abcd-4abc-8abc-abcdefabcd02'
await db.query('INSERT INTO trip_days(id,trip_id,day_number,date) VALUES($1,$2,50,NULL)',[legacyDay,folder])
await db.query('SELECT save_trip_activity($1,$2,$3,$4)',[folder,legacyDay,legacyStop,JSON.stringify({title:'Legacy undated place'})])
await db.query('SELECT reorder_trip_places($1,NULL,$2)',[folder,[legacyStop,stop]])
assert.equal((await db.query('SELECT sort_order FROM itinerary_items WHERE id=$1',[legacyStop])).rows[0].sort_order,1)
assert.equal((await db.query('SELECT sort_order FROM itinerary_items WHERE id=$1',[stop])).rows[0].sort_order,2)
await rejected('SELECT reorder_trip_places($1,NULL,$2)',[folder,[stop,stop]])
await rejected('SELECT reorder_trip_places($1,NULL,$2)',[folder,[stop]])
await rejected('SELECT reorder_trip_places($1,$2,$3)',[folder,'2026-10-25',[stop,legacyStop]])
await asUser(bob)
await assert.rejects(()=>savePlace('2026-10-26'))
await rejected('SELECT reorder_trip_places($1,NULL,$2)',[folder,[stop,legacyStop]])
assert.equal((await db.query('SELECT * FROM trip_folder_summaries() WHERE trip_id=$1',[folder])).rows.length,0)
assert.equal((await db.query('SELECT * FROM itinerary_items WHERE id=$1',[stop])).rows.length,0)
console.log('PASS: name-only empty folder, idempotent place saves, date moves, overnight pins, atomic invalid-date rollback, unscheduled/manual clearing, summary counts and private ownership.')
await testTrackers(db,asUser,alice,bob)
await asUser(admin)
assert.equal((await db.query('SELECT * FROM get_user_statistics()')).rows[0].total_users,3)
assert.equal((await db.query(`SELECT * FROM admin_user_details($1)`,[alice])).rows[0].email,'alice@example.test')
await db.query(`UPDATE profiles SET account_status='suspended' WHERE user_id=$1`,[alice])
await asUser(alice)
assert.equal((await db.query('SELECT * FROM journal_entries')).rows.length,0)
await rejected(`INSERT INTO trips(title,slug) VALUES('Suspended','suspended')`)
assert.equal((await db.query(`UPDATE profiles SET account_status='active' WHERE user_id=$1 RETURNING id`,[alice])).rows.length,0)
await db.exec('RESET ROLE')
await db.query(`SELECT set_config('request.jwt.claim.sub','',false)`)
await db.query(`UPDATE profiles SET account_status='active' WHERE user_id=$1`,[alice])
await db.query(`UPDATE time_capsules SET unlock_date=current_date WHERE id=$1`,[capsule])
await asUser(alice)
assert.equal((await db.query(`SELECT open_capsule($1) AS value`,[capsule])).rows[0].value.message,'Secret message')
await rejected('SELECT * FROM claim_due_letters()')
await rejected(`INSERT INTO future_letters(user_id,subject,body,scheduled_for,sent_at) VALUES($1,'Forged','x',now()+interval '1 day',now())`,[alice])
await db.exec('RESET ROLE; SET ROLE anon')
await rejected('SELECT * FROM profiles')
await rejected('SELECT * FROM journal_entries')
await rejected('SELECT * FROM get_user_statistics()')
await testProfileAvatars(db,asUser,alice,bob,admin)
await testAccountSecurity(db,asUser,alice,bob,admin)
await db.close()
console.log('PASS: migrations, profile bootstrap, CRUD, isolation, link ownership, admin authorization, private storage, suspension, ordering, and capsule locks.')

}
main().catch(error=>{console.error(error.message);if(error.where)console.error(error.where);process.exitCode=1})
