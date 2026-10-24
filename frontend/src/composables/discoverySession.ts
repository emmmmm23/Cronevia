import {ref} from 'vue'
import type {Place} from '@/types/discovery'
import type {SuggestedVisit} from './discovery'
// In-memory navigation drafts only. Every saved itinerary still goes to Supabase.
export const discoverySelection=ref<Place|null>(null)
export const discoveryHandoff=ref<{place?:Place;date:string;visits?:SuggestedVisit[]}|null>(null)
