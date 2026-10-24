import {describe,it,expect} from 'vitest'
import {defaultPreferences,type Place} from '@/types/discovery'
import {inPhilippines,PH_BOUNDS} from '@/services/philippines'
import {rankPlaces,suggestCandidates,scheduleAdvice,freeWindows,placeDraft} from './discovery'
import type {TripDay,ItineraryItem} from '@/types'
const pin:Place={name:'Manila',latitude:14.6,longitude:120.98,countryCode:'ph'}
const park:Place={...pin,name:'Park',provider:'geoapify',providerId:'park',category:'nature',latitude:14.61}
const cafe:Place={...pin,name:'Cafe',provider:'geoapify',providerId:'cafe',category:'food',latitude:14.601}
const days=[{id:'one',date:'2026-10-24',is_ideas:false},{id:'two',date:'2026-10-25',is_ideas:false}] as TripDay[]
const stop=(d:Partial<ItineraryItem>)=>({id:'a',title:'Lunch',trip_day_id:'one',scheduled_time:'12:00',end_time:'13:00',end_day_offset:0,status:'planned',...d}) as ItineraryItem
describe('Philippines country validation',()=>{
 it('frames the archipelago but does not treat the rectangle as the country',()=>{expect(PH_BOUNDS[0][0]).toBeLessThan(117);expect(inPhilippines(14.6,120.98)).toBe(true);expect(inPhilippines(7.07,125.61)).toBe(true);expect(inPhilippines(6.1,116.1)).toBe(false);expect(inPhilippines(22.6,120.3)).toBe(false)})
 it('uses country evidence and rejects invalid coordinates',()=>{expect(inPhilippines(5,118,'my')).toBe(false);expect(inPhilippines(20.4,121.9,'ph')).toBe(true);expect(inPhilippines(NaN,120,'ph')).toBe(false)})
})
describe('explainable ranking',()=>{
 it('interest edits affect ranking and explanations follow real evidence',()=>{const prefs=defaultPreferences();prefs.interests=['nature'];let rows=rankPlaces([cafe,park],pin,prefs);expect(rows[0]!.place.name).toBe('Park');expect(rows[0]!.reasons).toContain('Matches your interest in nature.');prefs.interests=['food'];rows=rankPlaces([cafe,park],pin,prefs);expect(rows[0]!.place.name).toBe('Cafe');expect(rows[1]!.reasons.join()).not.toContain('interest in food')})
 it('keeps absent price, hours, access and routing unknown',()=>{const prefs={...defaultPreferences(),accessibility:true,budget:'low' as const};const row=rankPlaces([park],pin,prefs)[0]!;expect(row.unknown.join()).toContain('Price unavailable');expect(row.unknown.join()).toContain('Opening hours unavailable');expect(row.unknown.join()).toContain('Accessibility information unavailable');expect(row.reasons.join()).not.toContain('budget');expect(row.estimate.source).toBe('category estimate')})
 it('deduplicates by provider ID and flags intentional repeat visits',()=>{const item=stop({...placeDraft(park),title:'Renamed visit'});const rows=rankPlaces([park,park],pin,defaultPreferences(),[item],days);expect(rows).toHaveLength(1);expect(rows[0]!.planned).toBe(true)})
})
describe('schedule support',()=>{
 it('does not claim a free window when a scheduled stop has no known end',()=>{const prefs={...defaultPreferences(),date:'2026-10-24'};expect(freeWindows(prefs,[stop({end_time:null,duration_minutes:null})],days)).toEqual([])})
 it('finds free windows and detects overlaps without changing stops',()=>{const items=[stop({})],before=JSON.stringify(items),p={...defaultPreferences(),date:'2026-10-24'};const windows=freeWindows(p,items,days);expect(windows.map(w=>w.end-w.start)).toEqual([180,240]);expect(scheduleAdvice({scheduled_time:'12:30',end_time:'13:30'},p.date,items,days).join()).toContain('overlaps with Lunch');expect(JSON.stringify(items)).toBe(before)})
 it('handles overnight activity spanning two date groups',()=>{const items=[stop({title:'Night ferry',scheduled_time:'23:00',end_time:'02:00',end_day_offset:1})];expect(scheduleAdvice({scheduled_time:'01:00',end_time:'03:00'},'2026-10-25',items,days).join()).toContain('Night ferry');expect(scheduleAdvice({scheduled_time:'03:00',end_time:'04:00'},'2026-10-25',items,days).join()).not.toContain('overlaps')})
 it('never infers travel time or sequence feasibility for inter-island candidates',()=>{const cebu={...park,name:'Cebu',latitude:10.31,longitude:123.89};const prefs=defaultPreferences(),rows=rankPlaces([cebu],pin,prefs);const plan=suggestCandidates(rows,prefs,[],days);expect(plan[0]!.start).toBe('');expect(plan[0]!.end).toBe('');expect(scheduleAdvice({},'',[],days).join()).toContain('ferries or flights');expect(rows[0]!.distance).toBeGreaterThan(500)})
 it('respects pace and existing stops without saving or moving anything',()=>{const items=[stop({})],copy=JSON.stringify(items),prefs={...defaultPreferences(),style:'relaxed' as const,date:'2026-10-24'};const plan=suggestCandidates(rankPlaces([park,cafe],pin,prefs,items,days),prefs,items,days);expect(plan.length).toBeLessThanOrEqual(2);expect(plan.every(p=>p.selected&&p.start==='')).toBe(true);expect(JSON.stringify(items)).toBe(copy)})
})
