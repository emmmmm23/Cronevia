import { loadEnv } from 'vite'
import { plannerProbeResult } from './planner-probe-result.mjs'
const mode=process.argv.includes('--production')?'production':'development'
const env=loadEnv(mode,process.cwd(),'VITE_')
if(!env.VITE_SUPABASE_URL||!env.VITE_SUPABASE_ANON_KEY)throw new Error('Configure the public Supabase project URL and key before checking trackers.')
const headers={apikey:env.VITE_SUPABASE_ANON_KEY,'Content-Type':'application/json'}
let failures=0
for(const [path,body] of [
 ['/rest/v1/creative_trackers?select=id,config,design,is_template&limit=0',null],
 ['/rest/v1/tracker_logs?select=id,log_date,values,config_snapshot&limit=0',null],
 ['/rest/v1/tracker_boards?select=user_id,tracker_ids,design&limit=0',null],
 ['/rest/v1/journal_entries?select=tracker_links&limit=0',null],
 ['/rest/v1/rpc/save_creative_tracker',{target_id:'00000000-0000-4000-8000-000000000000',details:{}}],
 ['/rest/v1/rpc/save_tracker_log',{target_tracker:'00000000-0000-4000-8000-000000000000',entry_id:'00000000-0000-4000-8000-000000000000',entry_date:'2000-01-01',entry_values:{}}],
 ['/rest/v1/rpc/save_tracker_board',{details:{}}],
]){
 try{const response=await fetch(env.VITE_SUPABASE_URL+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)})
 const data=await response.json();console.log(response.status,path,data.code||'')
 if(plannerProbeResult(response.status,data)==='failed')failures++
 }catch(error){console.error(error.message);failures++}
}
try{const response=await fetch(env.VITE_SUPABASE_URL+'/rest/v1/rpc/tracker_schema_version',{method:'POST',headers,body:'{}',signal:AbortSignal.timeout(15000)});const version=await response.json();if(!response.ok||version!=='20261028.3'){console.error('Tracker validation upgrade is not current.');failures++}}catch(error){console.error(error.message);failures++}
if(failures){console.error('Tracker schema check failed. Apply supabase/apply-creative-trackers.sql and run supabase/verify-creative-trackers.sql before deployment.');process.exitCode=1}
else console.log('Tracker resources resolve. Anonymous denials are expected; ownership and write validation are tested separately. No user records were written.')
