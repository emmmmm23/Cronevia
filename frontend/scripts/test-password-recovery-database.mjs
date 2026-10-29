import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
export async function testPasswordRecovery(db,asUser,alice,admin){
 await db.exec('RESET ROLE')
 await db.exec(await readFile(new URL('../../supabase/migrations/20261029110110_password_recovery_isolation.sql',import.meta.url),'utf8'))
 const claims=async(value)=>db.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify(value)])
 for(const actor of [alice,admin]){
  await asUser(actor)
  for(const amr of [[{method:'recovery'}],[{method:'recovery'},{method:'totp'},{method:'password'}]]){
   await claims({aal:'aal2',amr})
   assert.equal((await db.query('SELECT is_mfa_satisfied() AS ok,is_account_active() AS active,is_super_admin() AS admin')).rows[0].ok,false)
   assert.equal((await db.query('SELECT is_account_active() AS ok')).rows[0].ok,false)
   assert.equal((await db.query('SELECT is_super_admin() AS ok')).rows[0].ok,false)
   for(const table of ['profiles','user_settings','trips','journal_entries','memories','media','creative_trackers','tracker_logs','tracker_boards','journals','journal_members'])assert.equal((await db.query('SELECT * FROM '+table)).rows.length,0,table+' must be closed during recovery')
   await assert.rejects(()=>db.query('SELECT list_my_journals()'))
   await assert.rejects(()=>db.query('SELECT consume_place_request()'))
   await assert.rejects(()=>db.query("SELECT create_capsule('Blocked recovery','Private',current_date+1)"))
   await assert.rejects(()=>db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('cronevia-media',$1)",[actor+'/recovery.png']))
   assert.equal((await db.query("UPDATE profiles SET full_name='Recovery cannot edit' WHERE user_id=$1 RETURNING id",[actor])).rows.length,0)
  }
  await claims({aal:'aal2',amr:[{method:'password'},{method:'totp'}]})
  assert.equal((await db.query('SELECT is_account_active() AS ok')).rows[0].ok,true)
  assert.ok((await db.query('SELECT * FROM profiles WHERE user_id=$1',[actor])).rows.length)
 }
 await db.exec('RESET ROLE')
 await db.exec(await readFile(new URL('../../supabase/migrations/20261029124656_email_otp_recovery_sessions.sql',import.meta.url),'utf8'))
 const sessions=['91919191-9191-4191-8191-919191919191','92929292-9292-4292-8292-929292929292','93939393-9393-4393-8393-939393939393','94949494-9494-4494-8494-949494949494']
 for(let i=0;i<sessions.length;i++)await db.query('INSERT INTO auth.sessions(id,user_id) VALUES($1,$2)',[sessions[i],i===3?admin:alice])
 await asUser(alice)
 await claims({aal:'aal2',session_id:sessions[3],amr:[{method:'otp'}]})
 assert.equal((await db.query('SELECT restrict_password_recovery_session() AS ok')).rows[0].ok,false,'Cannot restrict another account session')
 await claims({aal:'aal2',session_id:sessions[0],amr:[{method:'password'}]})
 assert.equal((await db.query('SELECT restrict_password_recovery_session() AS ok')).rows[0].ok,false,'Password sign-in is not an email recovery callback')
 for(const [index,amr] of [[0,[{method:'otp'}]],[1,['otp']]]){
  await claims({aal:'aal2',session_id:sessions[index],amr})
  assert.equal((await db.query('SELECT is_account_active() AS ok')).rows[0].ok,true,'Normal email sign-in remains available before restriction')
  for(let retry=0;retry<2;retry++)assert.equal((await db.query('SELECT restrict_password_recovery_session() AS ok')).rows[0].ok,true)
  for(const methods of [amr,[{method:'otp'},{method:'totp'}],[{method:'password'}]]){
   await claims({aal:'aal2',session_id:sessions[index],amr:methods})
   assert.equal((await db.query('SELECT is_account_active() AS ok')).rows[0].ok,false)
   for(const table of ['profiles','journal_entries','trips','media','creative_trackers','journals'])assert.equal((await db.query('SELECT * FROM '+table)).rows.length,0)
   await assert.rejects(()=>db.query('SELECT list_my_journals()'))
   await assert.rejects(()=>db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('cronevia-media',$1)",[alice+'/otp-recovery.png']))
  }
 }
 await assert.rejects(()=>db.query('SELECT * FROM cronevia_private.password_recovery_sessions'))
 await claims({aal:'aal2',session_id:sessions[2],amr:[{method:'password'}]})
 assert.equal((await db.query('SELECT is_account_active() AS ok')).rows[0].ok,true,'Another normal session of the same user is unaffected')
 await claims({aal:'aal2',amr:['recovery']})
 assert.equal((await db.query('SELECT is_mfa_satisfied() AS ok')).rows[0].ok,false)
 await db.exec('RESET ROLE; SET ROLE anon')
 await assert.rejects(()=>db.query('SELECT restrict_password_recovery_session()'))
 await db.exec('RESET ROLE')
 await db.query('DELETE FROM auth.sessions WHERE id=ANY($1::uuid[])',[sessions])
 assert.equal((await db.query('SELECT count(*) AS n FROM cronevia_private.password_recovery_sessions')).rows[0].n,0,'Session deletion removes private restriction records')
 await asUser(alice)
 await claims({aal:'aal2',session_id:sessions[0],amr:[{method:'otp'}]})
 assert.equal((await db.query('SELECT is_account_active() AS ok')).rows[0].ok,false,'A stale OTP access token stays denied after logout/session deletion')
 await db.exec('RESET ROLE')
 await claims({})
 console.log('PASS: modern and implicit-OTP recovery sessions cannot read/write private data, use sharing/admin RPCs or private storage; session binding cannot target another account, survives MFA/refresh, preserves normal sign-in and cleans up with session deletion.')
}
