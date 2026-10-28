import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
export async function testTrackers(db,asUser,alice,bob){
 await db.exec('RESET ROLE')
 const corrective=await readFile(new URL('../../supabase/migrations/20261028000003_tracker_validation.sql',import.meta.url),'utf8')
 await db.exec(corrective);await db.exec(corrective)
 assert.equal((await db.query('SELECT tracker_schema_version() AS version')).rows[0].version,'20261028.3')
 const cfg={schedule:[0,1,2,3,4,5,6],goal:null,categories:[],fields:[],multiple:false,aggregation:'latest'}
 const design={paper:'grid',color:'#fffdf3',accent:'#558267',font:'hand',heading:'',background:null,decorations:[]}
 const id=n=>'88888888-8888-4888-8888-'+String(n).padStart(12,'0')
 const definition=(kind,extra={})=>({name:'A little tracker',kind,unit:kind==='count'?'cups':'',config:structuredClone(cfg),design:structuredClone(design),archived:false,is_template:false,...extra})
 const save=async(n,details)=>(await db.query('SELECT save_creative_tracker($1,$2) AS result',[id(n),JSON.stringify(details)])).rows[0].result
 const entry=async(t,n,values,date='2024-01-02',start=null,end=null)=>(await db.query('SELECT save_tracker_log($1,$2,$3,$4,$5,$6,$7) AS result',[id(t),id(n),date,JSON.stringify(values),start,end,'UTC'])).rows[0].result
 await asUser(alice)
 const coffee=await save(1,definition('count'))
 assert.equal(coffee.user_id,alice)
 const first=await entry(1,101,{value:3}),again=await entry(1,102,{value:0})
 assert.equal(first.id,again.id)
 assert.equal(again.values.value,0)
 assert.equal((await db.query('SELECT count(*) AS n FROM tracker_logs WHERE tracker_id=$1',[id(1)])).rows[0].n,1)
 await assert.rejects(()=>save(1,definition('count',{unit:'mL'})))
 await assert.rejects(()=>entry(1,103,{value:-1}))
 await assert.rejects(()=>entry(1,103,{value:1.5}))
 await assert.rejects(()=>entry(1,103,{value:2},'2100-01-01'))
 await save(2,definition('habit'))
 const no=await entry(2,104,{value:false})
 assert.equal(no.values.value,false)
 const sleep=definition('sleep',{unit:'hours'});sleep.config.multiple=true
 await save(3,sleep)
 await entry(3,105,{awakeMinutes:30,sleepType:'night'},'2024-01-02','2024-01-01T23:00Z','2024-01-02T07:00Z')
 await entry(3,106,{awakeMinutes:0,sleepType:'nap'},'2024-01-02','2024-01-02T14:00Z','2024-01-02T15:00Z')
 await assert.rejects(()=>entry(3,107,{awakeMinutes:0,sleepType:'nap'},'2024-01-02','2024-01-02T14:30Z','2024-01-02T15:30Z'))
 await assert.rejects(()=>entry(3,108,{awakeMinutes:61,sleepType:'nap'},'2024-01-02','2024-01-02T17:00Z','2024-01-02T18:00Z'))
 assert.equal((await db.query('SELECT count(*) AS n FROM tracker_logs WHERE tracker_id=$1',[id(3)])).rows[0].n,2)
 const custom=definition('custom');custom.config.multiple=true;custom.config.fields=[{id:'time',label:'Practice minutes',type:'duration',unit:'minutes',options:[],max:5},{id:'did',label:'Practiced',type:'checkbox',unit:'',options:[],max:5}]
 await save(4,custom)
 await entry(4,109,{fields:{time:0,did:false}})
 await entry(4,110,{fields:{time:10,did:true}})
 await assert.rejects(()=>entry(4,111,{fields:{time:'ten'}}))
 const changed=structuredClone(custom);changed.config.fields[0].unit='hours'
 await assert.rejects(()=>save(4,changed))
 const template=await save(5,{...coffee,name:'Reusable coffee design',is_template:true})
 assert.equal((await db.query('SELECT count(*) AS n FROM tracker_logs WHERE tracker_id=$1',[id(5)])).rows[0].n,0)
 await assert.rejects(()=>entry(5,111,{value:1}))
 const board={name:'My January',tracker_ids:[id(1),id(2)],wide_ids:[id(1)],design}
 await db.query('SELECT save_tracker_board($1)',[JSON.stringify(board)])
 const badDesign=structuredClone(design);badDesign.background=bob+'/trackers/not-mine.png'
 await assert.rejects(()=>save(6,definition('habit',{design:badDesign})))
 const journal=(await db.query("INSERT INTO journal_entries(title,content,entry_date,tracker_links) VALUES('Linked rhythms','A reflection','2024-01-02',$1) RETURNING id",[JSON.stringify([{id:id(1),month:'2024-01'}])])).rows[0]
 assert.ok(journal.id)
 await asUser(bob)
 await save(20,definition('habit'))
 assert.equal((await db.query('SELECT * FROM creative_trackers WHERE id=$1',[id(1)])).rows.length,0)
 assert.equal((await db.query('SELECT * FROM tracker_logs WHERE tracker_id=$1',[id(1)])).rows.length,0)
 assert.equal((await db.query('SELECT * FROM tracker_boards')).rows.length,0)
 await assert.rejects(()=>entry(1,120,{value:9}))
 await assert.rejects(()=>save(1,definition('count')))
 await assert.rejects(()=>db.query('SELECT save_tracker_board($1)',[JSON.stringify(board)]))
 await assert.rejects(()=>db.query("INSERT INTO journal_entries(title,content,entry_date,tracker_links) VALUES('No','No','2024-01-02',$1)",[JSON.stringify([{id:id(1),month:'2024-01'}])]))
 await db.query('SELECT remove_tracker_log($1)',[first.id])
 await db.query('SELECT delete_creative_tracker($1)',[id(1)])
 await asUser(alice)
 assert.equal((await db.query('SELECT values FROM tracker_logs WHERE id=$1',[first.id])).rows[0].values.value,0)
 const updated=structuredClone(coffee);updated.config.goal={direction:'at_most',target:2};updated.config.schedule=[1,2,3,4,5]
 const revision=await save(1,updated)
 assert.equal(revision.config.history.length,2)
 assert.equal((await db.query('SELECT config_snapshot FROM tracker_logs WHERE id=$1',[first.id])).rows[0].config_snapshot.goal,null)
 await db.query('SELECT remove_tracker_log($1)',[first.id])
 assert.equal((await db.query('SELECT * FROM tracker_logs WHERE id=$1',[first.id])).rows.length,0)
 await assert.rejects(()=>db.query('INSERT INTO creative_trackers(id,user_id,name,kind,unit,config,design) VALUES($1,$2,$3,$4,$5,$6,$7)',[id(50),alice,'Bypass','habit','',JSON.stringify(cfg),JSON.stringify(design)]))
 console.log('PASS: trackers replace daily totals, preserve zero/No, validate sleep/naps/overlaps/custom fields, reject unit changes, retain goal history, save private boards, isolate assets/links/owners, and duplicate designs without entries.')
}
