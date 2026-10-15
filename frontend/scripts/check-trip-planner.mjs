import {loadEnv} from 'vite'
const env=loadEnv('development',process.cwd(),'VITE_'),base=env.VITE_SUPABASE_URL
console.log('Project:',new URL(base).hostname)
const headers={apikey:env.VITE_SUPABASE_ANON_KEY,'Content-Type':'application/json'}
for(const [path,body] of [
 ['/rest/v1/trips?select=timezone,preparation&limit=0',null],
 ['/rest/v1/itinerary_items?select=end_time,end_day_offset&limit=0',null],
 ['/rest/v1/rpc/create_trip_draft',{draft_id:'00000000-0000-4000-8000-000000000000',details:{}}],
 ['/rest/v1/rpc/ensure_trip_days',{target_trip_id:'00000000-0000-4000-8000-000000000000'}]
]){try{const r=await fetch(base+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});const d=await r.json();console.log(r.status,path,d.code||'',d.message||'')}catch(e){console.log(e.message)}}
console.log('Unauthenticated schema probe only. No real IDs or valid create payload; no user data written.')
