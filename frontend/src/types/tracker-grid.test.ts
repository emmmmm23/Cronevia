import {it,expect} from 'vitest'
import {covers,paintSleep,mergedRanges,rangesForLogs,sleepGridEntries,validateSleepSelection} from './tracker-grid'
import {defaultConfig,type TrackerLog} from './trackers'
const log=(id:string,start:string,end:string,values:TrackerLog['values']={}):TrackerLog=>({id,tracker_id:'sleep',user_id:'owner',log_date:'2024-01-02',values:{awakeMinutes:0,sleepType:'night',...values},started_at:start,ended_at:end,timezone:'UTC',config_snapshot:defaultConfig(),unit_snapshot:'hours',created_at:'2024-01-02T08:00:00Z',updated_at:'2024-01-02T08:00:00Z'})
it('paints only missing time and can clear a box from the middle of a sleep block',()=>{
 let r=paintSleep([],0,480,true);r=paintSleep(r,120,360,true);expect(mergedRanges(r)).toEqual([{start:0,end:480}])
 r=paintSleep(r,180,240,false);expect(mergedRanges(r)).toEqual([{start:0,end:180},{start:240,end:480}]);expect(covers(r,180,240)).toBe(false)
})
it('joins evening and morning boxes into an overnight interval on the wake-up date',()=>{
 const rows=sleepGridEntries('2024-01-02',[{start:1320,end:1440,source:null},{start:0,end:420,source:null}],[],'UTC')
 expect(rows).toHaveLength(1);expect(rows[0].started_at).toBe('2024-01-01T22:00:00.000Z');expect(rows[0].ended_at).toBe('2024-01-02T07:00:00.000Z')
})
it('preserves partial hours, nap type, notes, photos and the timezone of unchanged records',()=>{
 const original=log('nap','2024-01-02T14:15:00Z','2024-01-02T15:45:00Z',{sleepType:'nap',note:'A quiet afternoon',photo:'owner/trackers/photo.png',awakeMinutes:10})
 const rows=sleepGridEntries('2024-01-02',rangesForLogs([original]),[original],'Asia/Manila')
 expect(rows[0]).toMatchObject({id:'nap',started_at:original.started_at,ended_at:original.ended_at,timezone:'UTC',values:original.values})
})
it('keeps separate session metadata when adjacent boxes belong to different recordings',()=>{
 const logs=[log('first','2024-01-02T01:00Z','2024-01-02T03:00Z',{note:'First'}),log('second','2024-01-02T03:00Z','2024-01-02T05:00Z',{note:'Second'})]
 const rows=sleepGridEntries('2024-01-02',rangesForLogs(logs),logs,'UTC');expect(rows).toHaveLength(2);expect(rows.map(r=>r.values.note)).toEqual(['First','Second'])
})
it('splits a changed interval without duplicating its photo or awake adjustment',()=>{
 const original=log('night','2024-01-02T01:00Z','2024-01-02T08:00Z',{photo:'owner/trackers/photo.png',awakeMinutes:15})
 const rows=sleepGridEntries('2024-01-02',paintSleep(rangesForLogs([original]),180,240,false),[original],'UTC')
 expect(rows).toHaveLength(2);expect(rows[0].values.awakeMinutes).toBe(15);expect(rows[1].values.awakeMinutes).toBe(0);expect(rows[1].values.photo).toBeUndefined()
})
it('extends an existing overnight record instead of creating an evening entry on the wrong date',()=>{
 const old=log('night','2024-01-01T23:00:00Z','2024-01-02T07:00:00Z',{note:'My sleep',awakeMinutes:15})
 const rows=sleepGridEntries('2024-01-02',paintSleep(rangesForLogs([old]),1320,1380,true),[old],'UTC')
 expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({id:'night',started_at:'2024-01-01T22:00:00.000Z',ended_at:'2024-01-02T07:00:00.000Z',values:old.values});expect(()=>validateSleepSelection(rows,new Date('2024-01-03'))).not.toThrow()
})
it('allows actual daytime sleep across noon, including the hours in the reported screenshot',()=>{
 const rows=sleepGridEntries('2024-01-02',[{start:600,end:1020,source:null}],[],'Asia/Manila')
 expect(rows[0].started_at).toBe('2024-01-02T02:00:00.000Z');expect(rows[0].ended_at).toBe('2024-01-02T09:00:00.000Z');expect(()=>validateSleepSelection(rows,new Date('2024-01-03'))).not.toThrow()
})
it('stores naps separately and can reclassify part of a sleep recording without losing its note',()=>{
 const old=log('night','2024-01-02T00:00:00Z','2024-01-02T08:00:00Z',{note:'Keep this'})
 const rows=sleepGridEntries('2024-01-02',paintSleep(rangesForLogs([old]),180,300,true,'nap'),[old],'UTC')
 expect(rows.filter(r=>r.values.sleepType==='nap')).toHaveLength(1);expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);expect(rows.find(r=>r.id==='night')?.values.note).toBe('Keep this')
 expect(rows.reduce((n,r)=>n+(Date.parse(r.ended_at!)-Date.parse(r.started_at!))/3600000,0)).toBe(8)
})
it('explains a future time using its timezone, while allowing completed sleep',()=>{
 const rows=sleepGridEntries('2024-01-02',[{start:600,end:1020,source:null}],[],'UTC')
 expect(()=>validateSleepSelection(rows,new Date('2024-01-02T12:00Z'))).toThrow('future in UTC');expect(()=>validateSleepSelection(rows,new Date('2024-01-02T18:00Z'))).not.toThrow()
})
