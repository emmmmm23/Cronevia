import {loadEnv} from 'vite'
const env=loadEnv(process.argv.includes('--production')?'production':'development',process.cwd(),'VITE_')
const headers={apikey:env.VITE_SUPABASE_ANON_KEY,'Content-Type':'application/json'}
try{
 const version=await fetch(env.VITE_SUPABASE_URL+'/rest/v1/rpc/avatar_schema_version',{method:'POST',headers,body:'{}',signal:AbortSignal.timeout(15000)})
 if(!version.ok||Number(await version.json())!==20261028.5)throw new Error('Apply the reviewed profile-avatar migration before deployment.')
 const write=await fetch(env.VITE_SUPABASE_URL+'/rest/v1/rpc/save_profile_avatar',{method:'POST',headers,body:JSON.stringify({expected_revision:0,appearance:{},photo_path:null,source_path:null,remove_photo:false}),signal:AbortSignal.timeout(15000)})
 if(![401,403].includes(write.status))throw new Error('Anonymous avatar writes must be denied.')
 console.log('PASS: profile-avatar schema is current; anonymous avatar writes are denied. No user records were accessed.')
}catch(error){console.error(error.message);process.exitCode=1}
