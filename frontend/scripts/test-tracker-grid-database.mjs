import assert from 'node:assert/strict'
export async function testTrackerGrid(db,asUser,alice,bob){
 const id=n=>'99999999-9999-4999-8999-'+String(n).padStart(12,'0'),date='2024-01-02'
 const config={schedule:[0,1,2,3,4,5,6],goal:null,categories:[],fields:[],multiple:false,aggregation:'latest'},design={paper:'grid',color:'#fffdf3',accent:'#558267',font:'hand',heading:'',background:null,decorations:[]}
 await asUser(alice)
 for(const [n,kind] of [[1,'steps'],[2,'sleep']])await db.query('SELECT save_creative_tracker($1,$2)',[id(n),JSON.stringify({name:kind,kind,unit:'',config,design,archived:false,is_template:false})])
 const snapshot=rows=>rows.map(r=>({id:r.id,updated_at:r.updated_at}))
 const save=async(t,old,entries)=>(await db.query('SELECT save_tracker_grid_day($1,$2,$3,$4) AS data',[id(t),date,JSON.stringify(snapshot(old)),JSON.stringify(entries)])).rows[0].data
 const numeric={id:id(10),values:{value:5000,note:'Walk by the river'},started_at:null,ended_at:null,timezone:'UTC'}
 let rows=await save(1,[],[numeric]);assert.equal(rows[0].values.value,5000)
 await assert.rejects(()=>save(1,[],[{...numeric,values:{value:2000}}]))
 await assert.rejects(()=>save(1,rows,[]));assert.equal((await save(1,rows,[{...numeric,values:{...numeric.values,value:0}}]))[0].values.value,0)
 const sleep=(n,a,b)=>({id:id(n),values:{awakeMinutes:0,sleepType:'night'},started_at:a,ended_at:b,timezone:'UTC'})
 rows=await save(2,[],[sleep(20,'2024-01-01T22:00Z','2024-01-02T07:00Z')])
 await assert.rejects(()=>save(2,rows,[sleep(21,'2024-01-02T01:00Z','2024-01-02T06:00Z'),sleep(22,'2024-01-02T05:00Z','2024-01-02T08:00Z')]))
 assert.equal((await db.query('SELECT id FROM tracker_logs WHERE tracker_id=$1',[id(2)])).rows[0].id,id(20))
 await assert.rejects(()=>save(2,rows,[sleep(21,'2024-01-02T22:00Z','2024-01-03T07:00Z')]))
 rows=await save(2,rows,[sleep(20,'2024-01-01T23:00Z','2024-01-02T07:00Z'),sleep(22,'2024-01-02T14:00Z','2024-01-02T15:00Z')]);assert.equal(rows.length,2)
 await asUser(bob);await assert.rejects(()=>save(2,rows,[]));await asUser(alice)
 assert.equal((await save(2,rows,[])).length,0)
 console.log('PASS: atomic grid replacement, zero totals, stale-write rejection, retained notes, overlap/date rollback and cross-account denial.')
}
