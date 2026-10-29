import type {CreativeTracker,TrackerStarter} from './trackers'
export const trackerSections=[
 {id:'habits',title:'Habits',description:'Did it happen? Choose a calendar date and mark Yes or No.'},
 {id:'measurements',title:'Measured trackers',description:'Record amounts and time: steps, walking minutes, sleep, and more.'},
 {id:'other',title:'Feelings & personal logs',description:'Colors, reflections, and the details you want to keep.'},
] as const
const measured=['count','quantity','duration','steps','sleep']
export function trackerSection(t:Pick<CreativeTracker,'kind'|'config'>){return t.kind==='habit'||t.kind==='custom'&&t.config.fields.length>0&&t.config.fields.every(f=>f.type==='checkbox')?'habits':measured.includes(t.kind)?'measurements':'other'}
export function starterSection(t:TrackerStarter){return t.kind==='habit'||t.key==='habits'?'habits':measured.includes(t.kind)?'measurements':'other'}
