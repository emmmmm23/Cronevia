export interface User {
  id: string
  name: string
  email: string
  avatar_path: string | null
  timezone: string | null
  locale: string | null
  role: 'user' | 'super_admin'
  status: 'active' | 'suspended'
  created_at: string
  stats?: {
    journal_entries: number
    trips: number
    memories: number
    places: number
  }
}

export type TripStatus = 'planning' | 'active' | 'completed' | 'archived'

export interface Trip {
  id: string
  user_id: string
  title: string
  slug: string
  description: string | null
  cover_image_path: string | null
  start_date: string | null
  end_date: string | null
  status: TripStatus
  visibility: 'private' | 'shared' | 'public'
  country_codes: string | null
  created_at: string
  updated_at: string
}

export interface TripDay {
  id: string
  trip_id: string
  date: string
  day_number: number
  title: string | null
  notes: string | null
  itinerary_items?: ItineraryItem[]
}

export type ItineraryStatus = 'planned' | 'visited' | 'skipped'

export interface Location {
  id: string
  name: string
  address: string | null
  latitude: number
  longitude: number
  country_code: string | null
  city: string | null
}

export interface ItineraryItem {
  id: string
  trip_day_id: string
  location_id: string | null
  location?: Location | null
  title: string
  description: string | null
  scheduled_time: string | null
  duration_minutes: number | null
  category: string | null
  status: ItineraryStatus
  sort_order: number
  converted_to_memory: boolean
  created_at: string
  updated_at: string
}

export type Mood = 'happy' | 'excited' | 'peaceful' | 'nostalgic' | 'sad' | 'anxious' | 'neutral'

export interface JournalEntry {
  id: string
  user_id: string
  trip_id: string | null
  trip_day_id: string | null
  itinerary_item_id: string | null
  title: string
  content: string
  mood: string | null
  mood_emoji: string | null
  mood_label: string | null
  location_name: string | null
  latitude: number | null
  longitude: number | null
  location_source: 'geolocation' | 'search' | 'manual' | null
  weather: string | null
  visibility: 'private' | 'shared' | 'public'
  entry_date: string
  created_at: string
  updated_at: string
}

export interface Media {
  id: string
  memory_id: string
  type: 'image' | 'video' | 'audio'
  file_path: string
  thumbnail_path: string | null
  thumbnail_url: string | null
  original_filename: string
  file_size: number
  mime_type: string
  extracted_location: { latitude: number; longitude: number } | null
  sort_order: number
  created_at: string
}

export interface Memory {
  id: string
  user_id: string
  trip_id: string | null
  itinerary_item_id: string | null
  title: string
  description: string | null
  memory_date: string
  visibility: 'private' | 'shared' | 'public'
  media?: Media[]
  journal_entry?: JournalEntry | null
  created_at: string
  updated_at: string
}

export interface TimeCapsule {
  id: string
  user_id: string
  title: string
  description: string | null
  unlock_at: string
  is_unlocked: boolean
  unlocked_at: string | null
  items?: TimeCapsuleItem[]
  created_at: string
}

export interface TimeCapsuleItem {
  id: string
  capsule_id: string
  item_type: 'memory' | 'journal_entry' | 'media'
  item_id: string
  sort_order: number
  content?: Memory | JournalEntry | Media
}

export interface FutureLetter {
  id: string
  user_id: string
  recipient_email: string
  subject: string
  deliver_at: string
  is_delivered: boolean
  delivered_at: string | null
  created_at: string
}

export interface Tag {
  id: string
  user_id: string
  name: string
  color_hex: string
  created_at: string
}

export interface Person {
  id: string
  user_id: string
  name: string
  avatar_path: string | null
  created_at: string
}

export interface PaginationMeta {
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

export interface MapPin {
  latitude: number
  longitude: number
  name: string
  trip_id: string
}

export interface ReplayDay {
  date: string
  day_number: number
  title: string | null
  itinerary_items: ItineraryItem[]
  memories: Memory[]
}

export interface ReplayPayload {
  trip: Trip
  days: ReplayDay[]
  route_geojson?: GeoJSON.FeatureCollection
  insufficient_locations?: boolean
}

export interface OnThisDayResult {
  memories: Memory[]
  journal_entries: JournalEntry[]
}

export interface SearchResults {
  trips: Trip[]
  journal_entries: JournalEntry[]
  memories: Memory[]
}
