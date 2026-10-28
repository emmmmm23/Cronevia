import { describe, expect, it } from 'vitest'
import { defaultConfig, defaultDesign, dailyValue, fromStarter, localDate, monthDays, onSchedule, sleepHours, starters, zonedInstant, type CreativeTracker, type TrackerLog } from './trackers'
const tracker=(kind:CreativeTracker['kind']):CreativeTracker=>({id:'one',user_id:'owner',name:'Test',kind,unit:'',config:defaultConfig(),design:defaultDesign(),archived:false,is_template:false,created_at:''})
const log=(value:number|boolean):TrackerLog=>({id:'entry',tracker_id:'one',user_id:'owner',log_date:'2026-10-10',values:{value},started_at:null,ended_at:null,timezone:'UTC',config_snapshot:defaultConfig(),unit_snapshot:'',created_at:'',updated_at:'2026-10-10T10:00:00Z'})
describe('creative tracker semantics',()=>{
 it('keeps no entry, explicit zero, and explicit No distinct',()=>{
  expect(dailyValue(tracker('count'),[])).toBeNull()
  expect(dailyValue(tracker('count'),[log(0)])).toBe(0)
  expect(dailyValue(tracker('habit'),[log(false)])).toBe(false)
 })
 it('uses the latest daily total without adding old totals',()=>{
  const a=log(500),b={...log(800),updated_at:'2026-10-10T11:00:00Z'}
  expect(dailyValue(tracker('steps'),[a,b])).toBe(800)
 })
 it('builds actual month lengths including leap years',()=>{
  expect(monthDays('2024-02')).toHaveLength(29)
  expect(monthDays('2025-02')).toHaveLength(28)
  expect(monthDays('2026-04')).toHaveLength(30)
  expect(monthDays('2026-12')).toHaveLength(31)
 })
 it('uses the chosen zone for daily dates, without shifting date-only records',()=>{
  expect(localDate(new Date('2026-10-10T20:00:00Z'),'Asia/Manila')).toBe('2026-10-11')
  expect(monthDays('2026-10')[0]).toBe('2026-10-01')
 })
 it('converts cross-midnight sleep and subtracts actual awake minutes',()=>{
  const a=zonedInstant('2026-10-09T23:00','Asia/Manila'),b=zonedInstant('2026-10-10T07:30','Asia/Manila')
  expect(sleepHours({...log(0),started_at:a,ended_at:b,values:{awakeMinutes:30}})).toBe(8)
 })
 it('uses actual elapsed time across DST and supports a repeated hour',()=>{
  expect((Date.parse(zonedInstant('2026-11-01T03:00','America/New_York'))-Date.parse(zonedInstant('2026-11-01T00:00','America/New_York')))/3600000).toBe(4)
  expect(Date.parse(zonedInstant('2026-11-01T01:30','America/New_York','later'))-Date.parse(zonedInstant('2026-11-01T01:30','America/New_York','earlier'))).toBe(3600000)
  expect(()=>zonedInstant('2026-03-08T02:30','America/New_York')).toThrow('does not exist')
 })
 it('retains schedule meaning before an effective change',()=>{
  const t=tracker('habit')
  t.config.schedule=[1]
  t.config.history=[{from:'0001-01-01',schedule:[6],goal:null},{from:'2026-10-15',schedule:[1],goal:null}]
  expect(onSchedule(t,'2026-10-10')).toBe(true)
  expect(onSchedule(t,'2026-10-17')).toBe(false)
 })
 it('creates blank tracker designs, not invented logs or automatic consumption goals',()=>{
  for(const starter of starters){const t=fromStarter(starter);expect(t.config.goal).toBeNull();expect(t.design.decorations).toEqual([])}
 })
})
