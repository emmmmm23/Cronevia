import {describe,it,expect} from 'vitest'
import {dateError,localClock,tripGroup,outsideRange,overlapping,nextActivity,directions} from './tripPlanner'
import type {Trip,TripDay,ItineraryItem} from '@/types'
const trip=(values:Partial<Trip>={})=>({status:'planning',start_date:null,end_date:null,timezone:'Asia/Manila',...values}) as Trip
const item=(id:string,time:string|null,duration:number|null,status='planned')=>({id,scheduled_time:time,duration_minutes:duration,status}) as ItineraryItem
 describe('trip planning dates and flexible activities',()=>{
 it('uses the destination local date, across the international date line',()=>{const now=new Date('2026-10-14T18:30:00Z');expect(localClock('Asia/Manila',now)).toMatchObject({date:'2026-10-15',time:'02:30'});expect(localClock('America/Los_Angeles',now).date).toBe('2026-10-14')})
 it('handles daylight saving in the chosen zone',()=>{expect(localClock('America/New_York',new Date('2026-03-08T07:30:00Z')).time).toBe('03:30')})
 it('groups drafts and dated plans without overriding manual status',()=>{const now=new Date('2026-10-14T03:00:00Z');expect(tripGroup(trip(),now)).toBe('Drafts');expect(tripGroup(trip({start_date:'2026-10-15'}),now)).toBe('Upcoming');expect(tripGroup(trip({start_date:'2026-10-14',end_date:'2026-10-16'}),now)).toBe('In progress');expect(tripGroup(trip({start_date:'2026-10-01'}),now)).toBe('Past trips');expect(tripGroup(trip({status:'active',start_date:'2026-01-01'}),now)).toBe('In progress');expect(tripGroup(trip({status:'archived'}),now)).toBe('Archived')})
 it('accepts undecided dates and rejects reversed or oversized ranges',()=>{expect(dateError('','',true)).toBe('');expect(dateError('','',false)).toContain('start date');expect(dateError('2026-10-15','2026-10-14',false)).toContain('end date');expect(dateError('2026-01-01','2027-02-01',false)).toContain('366')})
 it('marks retained days outside shortened ranges',()=>{expect(outsideRange({date:'2026-10-17'} as TripDay,trip({start_date:'2026-10-14',end_date:'2026-10-15'}))).toBe(true);expect(outsideRange({date:null} as TripDay,trip())).toBe(false)})
 it('warns only for overlapping known intervals; preserves flexible plans',()=>{const rows=[item('a','09:00',60),item('b','09:30',30),item('c',null,60),item('d','10:00',30)];expect([...overlapping(rows)]).toEqual(['a','b']);expect(rows[2].scheduled_time).toBeNull()})
 it('finds the next planned timed item without completing past ones',()=>{const rows=[item('a','09:00',60),item('b','10:00',30,'visited'),item('c','11:00',20),item('d',null,null)];expect(nextActivity(rows,'09:30')?.id).toBe('c');expect(rows[0].status).toBe('planned')})
 it('offers directions only with a place or valid coordinates',()=>{expect(directions(item('a',null,null))).toBeNull();expect(directions({...item('a',null,null),location_name:'Café & garden'})).toContain('Caf%C3%A9%20%26%20garden')})
})
