export type PlaceCategory = 'attractions' | 'food' | 'nature' | 'culture'
export type Interest = 'food' | 'nature' | 'beaches' | 'culture' | 'adventure' | 'shopping'
export interface Place {
  name: string; latitude: number; longitude: number
  address?: string; countryCode?: string; provider?: string; providerId?: string
  categories?: string[]; category?: PlaceCategory
  openingHours?: string
  // Only populate structured evidence when a provider actually supplies it.
  price?: { level: 'low' | 'medium' | 'high'; text: string }
  accessibility?: 'yes' | 'no' | 'limited'
  visitMinutes?: number
}
export interface Preferences {
  interests: Interest[]; date: string; start: string; end: string; nextDay: boolean
  distanceKm: number; budget: 'any' | 'low' | 'medium' | 'high'
  style: 'relaxed' | 'balanced' | 'packed'; accessibility: boolean
}
export const defaultPreferences = (): Preferences => ({interests:[],date:'',start:'09:00',end:'17:00',nextDay:false,distanceKm:10,budget:'any',style:'balanced',accessibility:false})
export const categories: {id:PlaceCategory;label:string;symbol:string}[] = [
  {id:'attractions',label:'Attractions',symbol:'✧'}, {id:'food',label:'Food & cafés',symbol:'☕'},
  {id:'nature',label:'Nature & parks',symbol:'♧'}, {id:'culture',label:'Museums & culture',symbol:'▥'},
]
