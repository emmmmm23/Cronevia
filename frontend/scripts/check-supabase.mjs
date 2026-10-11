import { loadEnv } from 'vite'
const env=loadEnv('development',process.cwd(),'VITE_')
if(!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) throw new Error('Missing Supabase URL or public API key')
console.log(`Project: ${new URL(env.VITE_SUPABASE_URL).hostname}`)
const headers={apikey:env.VITE_SUPABASE_ANON_KEY}
let failed=false
for(const path of ['/auth/v1/settings',...['profiles','user_settings','trips','trip_days','itinerary_items','journal_entries','memories','media','time_capsules','future_letters','system_settings','feature_settings','admin_notifications'].map(t=>`/rest/v1/${t}?select=*&limit=0`)]){
  try{
    const response=await fetch(env.VITE_SUPABASE_URL+path,{headers,signal:AbortSignal.timeout(15000)})
    const data=await response.json()
    // Public reads are intentionally denied after RLS deployment. A 42501 confirms the table exists.
    const protectedTable=path.startsWith('/rest/') && [401,403].includes(response.status) && data.code==='42501'
    console.log(`${response.ok?'OK':protectedTable?'PROTECTED':'FAIL'} ${path.split('?')[0]} (HTTP ${response.status})`)
    if(!response.ok&&!protectedTable){failed=true;console.log(data.message || 'Service unavailable')}
  }catch(error){failed=true;console.log(`FAIL ${path}: ${error.message}`)}
}
console.log('Read-only check: no sign-in, writes, or credential output. Authenticated CRUD still requires a signed-in test.')
process.exitCode=failed?1:0
