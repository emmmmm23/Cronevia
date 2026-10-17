import {loadEnv} from 'vite'
import {plannerProbeResult} from './planner-probe-result.mjs'
const mode=process.argv.includes('--production')?'production':'development'
const env=loadEnv(mode,process.cwd(),'VITE_'),base=env.VITE_SUPABASE_URL
console.log('Project:',new URL(base).hostname)
const headers={apikey:env.VITE_SUPABASE_ANON_KEY,'Content-Type':'application/json'}
let failures=0
for(const [path,body] of [
 ['/rest/v1/trips?select=timezone,preparation,destination_latitude,destination_longitude,destination_source&limit=0',null],
 ['/rest/v1/itinerary_items?select=end_time,end_day_offset,latitude,longitude,location_source&limit=0',null],
 ['/rest/v1/rpc/create_trip_draft',{draft_id:'00000000-0000-4000-8000-000000000000',details:{}}],
 ['/rest/v1/rpc/save_trip_place',{target_trip_id:'00000000-0000-4000-8000-000000000000',activity_id:'00000000-0000-4000-8000-000000000000',place_date:null,details:{}}],
 ['/rest/v1/rpc/trip_folder_summaries',{}],
 ['/rest/v1/rpc/reorder_trip_places',{target_trip_id:'00000000-0000-4000-8000-000000000000',place_date:null,item_ids:[]}],
 ['/rest/v1/rpc/ensure_trip_days',{target_trip_id:'00000000-0000-4000-8000-000000000000'}]
]){try{const r=await fetch(base+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});const d=await r.json();console.log(r.status,path,d.code||'',d.message||'');
 // Private tables and RPCs should reject this unauthenticated request after resolution.
 // A missing function/column, invalid key or network error must fail the check.
 if(plannerProbeResult(r.status,d)==='failed')failures++
 }catch(e){failures++;console.error(e.message)}}
console.log('Unauthenticated schema probe only. No real IDs or valid create payload; no user data written.')
if(failures){
 console.error('Planner deployment check FAILED. Review the errors above. For missing planner schema, apply supabase/apply-trip-planner-upgrade.sql in the intended project SQL editor, then run supabase/verify-trip-planner.sql and repeat this check.')
 process.exitCode=1
}else console.log('Planner anonymous resolution probe passed. Protected-resource denials are expected; authenticated grants, full schema, ownership and save/reload still require SQL/integration verification.')
