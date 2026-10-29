import {loadEnv} from 'vite'
const env=loadEnv(process.argv.includes('--production')?'production':'development',process.cwd(),'VITE_')
const headers={apikey:env.VITE_SUPABASE_ANON_KEY,'Content-Type':'application/json'}
try{
 const version=await fetch(env.VITE_SUPABASE_URL+'/rest/v1/rpc/shared_journals_schema_version',{method:'POST',headers,body:'{}',signal:AbortSignal.timeout(15000)})
 if(!version.ok||await version.json()!=='20261029.1')throw new Error('Apply the reviewed shared-journals migration before deployment.')
 for(const [name,body] of [['list_my_journals',{}],['create_journal_invite',{target_journal:'00000000-0000-4000-8000-000000000000',invited_role:'viewer',share_future_entries:false}],['accept_journal_invite',{claim_digest:'0'.repeat(64),expected_invitation:'00000000-0000-4000-8000-000000000000'}]]){
  const denied=await fetch(env.VITE_SUPABASE_URL+'/rest/v1/rpc/'+name,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(15000)})
  if(![401,403].includes(denied.status))throw new Error('Anonymous journal management must be denied.')
 }
 console.log('PASS: shared-journals schema is current and anonymous journal management is denied. No user records accessed.')
}catch(error){console.error(error.message);process.exitCode=1}
