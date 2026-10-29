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
 await claims({})
 console.log('PASS: recovery tokens, including MFA-upgraded recovery tokens, cannot read/write private app data, use sharing/admin RPCs, or upload private files; normal authenticated access remains available.')
}
