import {loadEnv} from 'vite'
const env=loadEnv(process.argv.includes('--production')?'production':'development',process.cwd(),'VITE_')
try{
 const result=await fetch(env.VITE_SUPABASE_URL+'/rest/v1/rpc/password_recovery_schema_version',{method:'POST',headers:{apikey:env.VITE_SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)})
 if(!result.ok||await result.json()!=='20261029.2')throw new Error('Apply the reviewed password-recovery isolation migration before deployment.')
 console.log('PASS: password-recovery isolation schema is current. No user data accessed.')
}catch(error){console.error(error.message);process.exitCode=1}
