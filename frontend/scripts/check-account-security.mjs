import {loadEnv} from 'vite'
const env=loadEnv(process.argv.includes('--production')?'production':'development',process.cwd(),'VITE_')
const headers={apikey:env.VITE_SUPABASE_ANON_KEY,'Content-Type':'application/json'}
try{
 const result=await fetch(env.VITE_SUPABASE_URL+'/rest/v1/rpc/security_schema_version',{method:'POST',headers,body:'{}',signal:AbortSignal.timeout(15000)})
 if(!result.ok||await result.json()!=='20261028.4')throw new Error('Apply the reviewed account-security migration before deployment.')
 const denied=await fetch(env.VITE_SUPABASE_URL+'/rest/v1/rpc/consume_place_request',{method:'POST',headers,body:'{}',signal:AbortSignal.timeout(15000)})
 if(![401,403].includes(denied.status))throw new Error('Anonymous place-quota access must be denied.')
 console.log('PASS: account-security schema is current; anonymous quota access is denied. No user records were accessed.')
}catch(error){console.error(error.message);process.exitCode=1}
