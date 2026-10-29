export type TrackerKind = 'habit' | 'count' | 'quantity' | 'duration' | 'steps' | 'sleep' | 'category' | 'custom'
export function cloneTracker<T>(value:T):T { return JSON.parse(JSON.stringify(value)) as T }
export type FieldKind = 'checkbox' | 'number' | 'duration' | 'rating' | 'choice' | 'multi' | 'text'
export interface TrackerField { id: string; label: string; type: FieldKind; unit: string; options: string[]; max: number }
export interface TrackerCategory { id: string; label: string; color: string }
export interface TrackerConfig {
  schedule: number[]
  goal: { direction: 'at_least' | 'at_most'; target: number } | null
  categories: TrackerCategory[]
  fields: TrackerField[]
  multiple: boolean
  aggregation: 'sum' | 'latest' | 'average' | 'max'
  history?: { from: string; schedule: number[]; goal: TrackerConfig['goal'] }[]
}
export interface TrackerDecoration { id: string; x: number; y: number; width: number; rotation: number; z: number; locked: boolean; asset: string; text: string;space?:'page' }
export interface TrackerDesign {
  paper: 'grid' | 'dot' | 'lined' | 'blank'; color: string; accent: string
  font: 'hand' | 'serif' | 'sans'; heading: string; background: string | null
  decorations: TrackerDecoration[]
}
export interface CreativeTracker {
  id: string; user_id: string; name: string; kind: TrackerKind; unit: string
  config: TrackerConfig; design: TrackerDesign; archived: boolean; is_template: boolean; created_at: string
}
export type FieldValue = string | number | boolean | string[]
export interface TrackerValues { value?: number | boolean; category?: string; note?: string; awakeMinutes?: number; quality?: number; sleepType?: 'night' | 'nap'; fields?: Record<string, FieldValue>; photo?: string }
export interface TrackerLog {
  id: string; tracker_id: string; user_id: string; log_date: string; values: TrackerValues
  started_at: string | null; ended_at: string | null; timezone: string
  config_snapshot: TrackerConfig; unit_snapshot: string; created_at: string; updated_at: string
}
export interface TrackerBoard { user_id: string; name: string; tracker_ids: string[]; wide_ids: string[]; design: TrackerDesign }
export const kindLabels: Record<TrackerKind, string> = { habit: 'Yes / no habit', count: 'Count', quantity: 'Quantity', duration: 'Time spent', steps: 'Steps', sleep: 'Sleep', category: 'Color & category', custom: 'Custom log' }
export const defaultConfig = (): TrackerConfig => ({ schedule: [0,1,2,3,4,5,6], goal: null, categories: [], fields: [], multiple: false, aggregation: 'latest' })
export const defaultDesign = (accent = '#558267'): TrackerDesign => ({ paper: 'grid', color: '#fffdf3', accent, font: 'hand', heading: '', background: null, decorations: [] })
export function localDate(date = new Date(), timezone = Intl.DateTimeFormat().resolvedOptions().timeZone): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  return ['year','month','day'].map(key => p.find(v => v.type === key)!.value).join('-')
}
export function monthDays(month: string): string[] {
  const [y,m] = month.split('-').map(Number)
  return Array.from({ length: new Date(Date.UTC(y,m,0)).getUTCDate() }, (_,i) => month + '-' + String(i+1).padStart(2,'0'))
}
export function shiftMonth(month: string, delta: number) {
  const [y,m] = month.split('-').map(Number), date = new Date(Date.UTC(y,m-1+delta,1))
  return date.toISOString().slice(0,7)
}
export function monthLabel(month: string) { return new Date(month + '-01T12:00:00').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }) }
export function onSchedule(tracker: CreativeTracker, date: string, config = tracker.config) {
  const revision = config.history?.filter(v=>v.from<=date).at(-1)
  return (revision?.schedule ?? config.schedule).includes(new Date(date+'T12:00:00').getDay())
}
export function sleepHours(log: TrackerLog) {
  if (!log.started_at || !log.ended_at) return 0
  return Math.max(0, (Date.parse(log.ended_at)-Date.parse(log.started_at))/3600000 - (log.values.awakeMinutes || 0)/60)
}
export function dailyValue(tracker: CreativeTracker, logs: TrackerLog[]): number | boolean | string | null {
  if (!logs.length) return null
  if (tracker.kind === 'sleep') return logs.reduce((sum, log) => sum + sleepHours(log), 0)
  const latest = [...logs].sort((a,b)=>a.updated_at.localeCompare(b.updated_at)).at(-1)!
  if (tracker.kind === 'category') return latest.values.category ?? null
  if (tracker.kind === 'habit') return latest.values.value ?? null
  if (tracker.kind === 'custom') return logs.length
  const values = logs.map(log => Number(log.values.value))
  if (tracker.config.aggregation === 'sum') return values.reduce((a,b)=>a+b,0)
  if (tracker.config.aggregation === 'average') return values.reduce((a,b)=>a+b,0)/values.length
  if (tracker.config.aggregation === 'max') return Math.max(...values)
  return Number(latest.values.value ?? 0)
}
export function displayValue(tracker: CreativeTracker, logs: TrackerLog[]) {
  const value = dailyValue(tracker, logs)
  if (value === null) return 'Not logged'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (tracker.kind === 'category') {
    const config = logs.at(-1)?.config_snapshot ?? tracker.config
    return config.categories.find(c=>c.id===value)?.label || 'Recorded category'
  }
  if (tracker.kind === 'sleep') return Number(value).toFixed(1) + ' h'
  if (tracker.kind === 'custom') return logs.length + (logs.length===1?' entry':' entries')
  return Number(value).toLocaleString('en-PH',{maximumFractionDigits:1}) + (tracker.unit ? ' '+tracker.unit : '')
}
export function goalMet(tracker: CreativeTracker, logs: TrackerLog[]) {
  const value = dailyValue(tracker,logs), goal = logs.at(-1)?.config_snapshot.goal
  if (!goal || typeof value !== 'number') return false
  return goal.direction === 'at_least' ? value >= goal.target : value <= goal.target
}
export function summarize(tracker: CreativeTracker, logs: TrackerLog[], month: string, today: string) {
  const relevant = logs.filter(l=>l.log_date.startsWith(month)&&l.log_date<=today)
  const days = [...new Set(relevant.map(l=>l.log_date))]
  const eligible = monthDays(month).filter(day=>day<=today&&onSchedule(tracker,day)).length
  const values = days.map(day=>dailyValue(tracker,relevant.filter(l=>l.log_date===day)))
  const total = values.reduce<number>((sum,v)=>sum+(typeof v==='number'?v:0),0)
  const yes = values.filter(v=>v===true).length
  return { days: days.length, eligible, total, average: days.length?total/days.length:0, yes, missing: Math.max(0,eligible-days.length) }
}
// Match wall-clock times against actual zone offsets; reject gaps, let users choose a repeated hour.
export function zonedInstant(value: string, timezone: string, repeated: 'earlier' | 'later' = 'earlier') {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Choose a complete date and time.')
  const target = Date.parse(value+'Z')
  const formatter = new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
  const parts = (instant: number) => {
    const p = formatter.formatToParts(new Date(instant)), get=(name:string)=>p.find(v=>v.type===name)!.value
    return get('year')+'-'+get('month')+'-'+get('day')+'T'+get('hour')+':'+get('minute')
  }
  const offsets = new Set<number>()
  for (let hours=-48;hours<=48;hours+=6) {
    const instant = target+hours*3600000
    offsets.add(Date.parse(parts(instant)+'Z')-instant)
  }
  const matches = [...offsets].map(offset=>target-offset).filter(instant=>parts(instant)===value).sort((a,b)=>a-b)
  if (!matches.length) throw new Error('That local time does not exist because the clocks change. Choose another time.')
  return new Date(repeated==='earlier'?matches[0]:matches[matches.length-1]).toISOString()
}
export function wallTime(instant: string, timezone: string) {
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant))
  const get=(key:string)=>p.find(v=>v.type===key)!.value
  return get('year')+'-'+get('month')+'-'+get('day')+'T'+get('hour')+':'+get('minute')
}
export function sleepSegments(log: TrackerLog): { start: number; width: number }[] {
  if (!log.started_at||!log.ended_at) return []
  const start=wallTime(log.started_at,log.timezone), end=wallTime(log.ended_at,log.timezone)
  const hour=(v:string)=>Number(v.slice(11,13))+Number(v.slice(14,16))/60
  const a=hour(start), b=hour(end)
  return start.slice(0,10)===end.slice(0,10)?[{start:a,width:b-a}]:[{start:0,width:b},{start:a,width:24-a}].filter(v=>v.width>0)
}
export interface TrackerStarter { key: string; name: string; kind: TrackerKind; unit: string; color: string; icon: string; description: string; categories?: TrackerCategory[]; fields?: TrackerField[] }
export const starters: TrackerStarter[] = [
  {key:'coffee-habit',name:'Coffee habit',kind:'habit',unit:'',color:'#9a704b',icon:'☕',description:'Did you have coffee? A simple Yes or No.'},
  {key:'gym-habit',name:'Gym',kind:'habit',unit:'',color:'#4c916a',icon:'✿',description:'Mark the days you went to the gym.'},
  {key:'coke-habit',name:'Coke habit',kind:'habit',unit:'',color:'#a34e62',icon:'◒',description:'Did you drink Coke? Keep it as a Yes or No.'},
  {key:'habits',name:'Habit tracker',kind:'custom',unit:'',color:'#4c916a',icon:'☘',description:'Four little calendars for your daily rituals.',fields:['Coffee','Gym','Walk','Coke'].map(label=>({id:label.toLowerCase(),label,type:'checkbox' as const,unit:'',options:[],max:5}))},
  {key:'walk-days',name:'Daily walk',kind:'habit',unit:'',color:'#6c9861',icon:'✿',description:'A little green mark for every walk.'},
  {key:'coffee',name:'Coffee',kind:'count',unit:'cups',color:'#9a704b',icon:'☕',description:'Count your cups, without a good or bad score.'},
  {key:'coke',name:'Coke',kind:'quantity',unit:'mL',color:'#a34e62',icon:'◒',description:'Keep a simple record of how much you drink.'},
  {key:'walking',name:'Walking',kind:'duration',unit:'minutes',color:'#c45d97',icon:'⌁',description:'A pink bar for every little walk.'},
  {key:'steps',name:'Steps',kind:'steps',unit:'steps',color:'#b68b43',icon:'↟',description:'A manual daily total, one day at a time.'},
  {key:'sleep',name:'Sleep',kind:'sleep',unit:'hours',color:'#6978ba',icon:'☾',description:'Nightly ribbons, naps, and quiet mornings.'},
  {key:'mood',name:'A year in pixels',kind:'category',unit:'',color:'#558db5',icon:'✦',description:'Give each day a color and a feeling.',categories:[
    {id:'great',label:'Best day',color:'#da87ba'},{id:'good',label:'Great',color:'#9db86a'},{id:'okay',label:'Okay',color:'#75b4cd'},{id:'mixed',label:'So-so',color:'#e4c86c'},{id:'rough',label:'Rough',color:'#9a81bb'},{id:'hard',label:'Very hard',color:'#c76a75'}]},
  {key:'anxiety',name:'Anxiety',kind:'category',unit:'',color:'#597fbd',icon:'〰',description:'Your own color key for how each day feels.',categories:[
    {id:'none',label:'No anxiety',color:'#7db9d9'},{id:'low',label:'Low',color:'#d991bc'},{id:'medium',label:'Medium',color:'#9b80bd'},{id:'high',label:'High',color:'#cb6977'}]},
  {key:'activities',name:'My time',kind:'category',unit:'',color:'#d08b53',icon:'◷',description:'Color a day by what filled it.',categories:[
    {id:'scroll',label:'Scrolling',color:'#77716e'},{id:'movie',label:'Movie / series',color:'#d894b8'},{id:'gym',label:'Gym',color:'#c97173'},{id:'cooking',label:'Cooking',color:'#bd9779'},{id:'productive',label:'Productive day',color:'#d9c66b'}]},
  {key:'custom',name:'My own little log',kind:'custom',unit:'',color:'#8c6b96',icon:'✎',description:'Create fields for the things that matter to you.'},
]
export function fromStarter(starter: TrackerStarter): Omit<CreativeTracker,'user_id'|'created_at'> {
  const config=defaultConfig()
  config.categories=structuredClone(starter.categories||[])
  if(starter.kind==='custom')config.fields=starter.fields?cloneTracker(starter.fields):[{id:'note',label:'What I want to remember',type:'text',unit:'',options:[],max:5}]
  if(starter.kind==='sleep')config.multiple=true
  return {id:crypto.randomUUID(),name:starter.name,kind:starter.kind,unit:starter.unit,config,design:defaultDesign(starter.color),archived:false,is_template:false}
}
