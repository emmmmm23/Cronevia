import { PGlite } from '@electric-sql/pglite'
import { readFile, readdir } from 'node:fs/promises'
import assert from 'node:assert/strict'

async function main() {
// Real PostgreSQL running locally in WASM; auth/storage platform schemas are test fixtures.
const db = new PGlite()
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE FUNCTION public.uuid_generate_v4() RETURNS uuid LANGUAGE sql AS 'SELECT gen_random_uuid()';
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,last_sign_in_at timestamptz,raw_user_meta_data jsonb DEFAULT '{}');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
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
await db.close()
console.log('PASS: migrations, profile bootstrap, CRUD, isolation, link ownership, admin authorization, private storage, suspension, ordering, and capsule locks.')

}
main().catch(error=>{console.error(error.message);if(error.where)console.error(error.where);process.exitCode=1})
