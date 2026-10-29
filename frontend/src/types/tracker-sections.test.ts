import {it,expect} from 'vitest'
import {trackerSection,starterSection} from './tracker-sections'
import {defaultConfig,fromStarter,starters} from './trackers'
it('keeps boolean habits and combined checkbox calendars separate from measured quantities',()=>{
 for(const key of ['coffee-habit','gym-habit','coke-habit','walk-days','habits']){const t=starters.find(s=>s.key===key)!;expect(starterSection(t)).toBe('habits');expect(trackerSection(fromStarter(t))).toBe('habits')}
 for(const key of ['coffee','coke','steps','walking','sleep']){const t=starters.find(s=>s.key===key)!;expect(starterSection(t)).toBe('measurements');expect(trackerSection(fromStarter(t))).toBe('measurements')}
 expect(trackerSection({kind:'category',config:defaultConfig()})).toBe('other')
})
