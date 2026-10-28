import {loadEnv} from 'vite'
const env=loadEnv(process.argv.includes('--production')?'production':'development',process.cwd(),'VITE_'),headers={apikey:env.VITE_SUPABASE_ANON_KEY,'Content-Type':'application/json'}
try{
 const version=await fetch(env.VITE_SUPABASE_URL+'/rest/v1/rpc/tracker_grid_schema_version',{method:'POST',headers,body:'{}',signal:AbortSignal.timeout(15000)})
 if(!version.ok||await version.json()!=='20261028.6')throw new Error('Apply the reviewed tracker-grid migration before deployment.')
 const denied=await fetch(env.VITE_SUPABASE_URL+'/rest/v1/rpc/save_tracker_grid_day',{method:'POST',headers,body:JSON.stringify({target_tracker:'00000000-0000-4000-8000-000000000000',entry_date:'2024-01-02',expected_rows:[],new_entries:[]}),signal:AbortSignal.timeout(15000)})
 if(![401,403].includes(denied.status))throw new Error('Anonymous grid writes must be denied.')
 console.log('PASS: tracker-grid schema is current and anonymous grid writes are denied. No user data accessed.')
}catch(e){console.error(e.message);process.exitCode=1}
