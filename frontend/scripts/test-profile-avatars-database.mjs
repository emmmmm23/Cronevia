import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
export async function testProfileAvatars(db,asUser,alice,bob,admin){
 await db.exec('RESET ROLE')
 await db.exec(await readFile(new URL('../../supabase/migrations/20261028000005_profile_avatars.sql',import.meta.url),'utf8'))
 const a={version:1,frame:{preset:'solid',primary:'#79283e',secondary:'#c6a15b',accent:'#77916b',thickness:3,gap:2},crop:{zoom:1,x:0,y:0,rotation:0}}
 const path=(id,name='avatar')=>`${id}/avatars/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/${name}.webp`
 const save=(revision,appearance=a,photo=null,source=null,remove=false)=>db.query('SELECT save_profile_avatar($1,$2,$3,$4,$5) AS result',[revision,JSON.stringify(appearance),photo,source,remove])
 await asUser(alice)
 for(const preset of ['none','solid','double','dotted','dashed','pastel','burgundy-gold','hand-drawn','stitched','postage','floral','stars','scrapbook'])assert.equal((await db.query('SELECT valid_avatar_appearance($1) AS valid',[JSON.stringify({...a,frame:{...a.frame,preset}})])).rows[0].valid,true)
 for(const invalid of [null,{}, {...a,css:'injected'},{...a,frame:{...a.frame,preset:null}},{...a,frame:{...a.frame,preset:'url(evil)'}},{...a,frame:{...a.frame,primary:'red; background:url(x)'}},{...a,crop:{...a.crop,zoom:100}},{...a,crop:{...a.crop,x:2}},{...a,crop:{...a.crop,rotation:45}}])await assert.rejects(()=>save(0,invalid))
 await assert.rejects(()=>db.query('UPDATE profiles SET avatar_appearance=$1 WHERE user_id=$2',[JSON.stringify(a),alice]))
 await assert.rejects(()=>db.query('UPDATE profiles SET avatar_url=$1 WHERE user_id=$2',['https://evil.test',alice]))
 await db.query("UPDATE profiles SET full_name='Avatar test' WHERE user_id=$1",[alice])
 await assert.rejects(()=>save(0,a,path(bob),path(bob,'source')))
 await assert.rejects(()=>save(0,a,path(alice),path(alice,'source')))
 for(const name of ['avatar','source'])await db.query("INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('cronevia-avatars',$1,$2)",[path(alice,name),JSON.stringify({mimetype:'image/webp',size:1024})])
 await assert.rejects(()=>db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('cronevia-avatars',$1)",[path(bob)]))
 const saved=(await save(0,a,path(alice),path(alice,'source'))).rows[0].result.profile
 assert.equal(saved.avatar_revision,1);assert.equal(saved.avatar_storage_path,path(alice));assert.equal(saved.avatar_url,null)
 await assert.rejects(()=>save(0,a))
 assert.equal((await db.query('DELETE FROM storage.objects WHERE name=$1 RETURNING id',[path(alice)])).rows.length,0)
 await asUser(bob)
 assert.equal((await db.query("SELECT * FROM storage.objects WHERE bucket_id='cronevia-avatars'")).rows.length,0)
 await assert.rejects(()=>save(0,a,path(alice),path(alice,'source')))
 await asUser(admin)
 assert.equal((await db.query("SELECT * FROM storage.objects WHERE bucket_id='cronevia-avatars'")).rows.length,1) // current output, never uncropped source
 await assert.rejects(()=>db.query('UPDATE profiles SET avatar_appearance=$1 WHERE user_id=$2',[JSON.stringify(a),alice]))
 await assert.rejects(()=>save(0,a,path(alice),path(alice,'source')))
 await db.exec('RESET ROLE');await db.query("INSERT INTO auth.mfa_factors(user_id,status) VALUES($1,'verified')",[alice])
 await asUser(alice);await db.query("SELECT set_config('request.jwt.claims','{\"aal\":\"aal1\"}',false)")
 assert.equal((await db.query("SELECT * FROM storage.objects WHERE bucket_id='cronevia-avatars'")).rows.length,0)
 await assert.rejects(()=>save(1,a))
 await db.query("SELECT set_config('request.jwt.claims','{\"aal\":\"aal2\"}',false)")
 const removed=(await save(1,a,null,null,true)).rows[0].result
 assert.equal(removed.profile.avatar_storage_path,null);assert.equal(removed.retired_paths.length,2)
 assert.equal((await db.query("DELETE FROM storage.objects WHERE bucket_id='cronevia-avatars' RETURNING id")).rows.length,2)
 await db.exec('RESET ROLE');await db.query('DELETE FROM auth.mfa_factors WHERE user_id=$1',[alice]);await db.query("SELECT set_config('request.jwt.claims','{}',false)")
 console.log('PASS: avatar allowlist, immutable storage, own-account writes, protected columns, private source, visible admin output, stale saves, removal and MFA enforcement.')
}
