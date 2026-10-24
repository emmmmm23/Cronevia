// Schema types for the checked-in migrations. Regenerate from Supabase after deployment.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export type Database = { public: { Tables: {
profiles: {
Row: {
  id: string
  user_id: string
  full_name: string
  username: string | null
  avatar_url: string | null
  bio: string | null
  timezone: string | null
  locale: string | null
  role: 'user' | 'super_admin'
  account_status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
}
Insert: {
  id?: string
  user_id: string
  full_name: string
  username?: string | null
  avatar_url?: string | null
  bio?: string | null
  timezone?: string | null
  locale?: string | null
  role?: 'user' | 'super_admin'
  account_status?: 'active' | 'inactive' | 'suspended'
  created_at?: string
  updated_at?: string
}
Update: {
  id?: string
  user_id?: string
  full_name?: string
  username?: string | null
  avatar_url?: string | null
  bio?: string | null
  timezone?: string | null
  locale?: string | null
  role?: 'user' | 'super_admin'
  account_status?: 'active' | 'inactive' | 'suspended'
  created_at?: string
  updated_at?: string
}
Relationships: []
}
user_settings: {
Row: {
  id: string
  user_id: string
  theme: 'vintage' | 'light' | 'dark' | null
  date_format: string | null
  time_format: '12h' | '24h' | null
  timezone: string | null
  email_notifications: boolean | null
  created_at: string
  updated_at: string
}
Insert: {
  id?: string
  user_id: string
  theme?: 'vintage' | 'light' | 'dark' | null
  date_format?: string | null
  time_format?: '12h' | '24h' | null
  timezone?: string | null
  email_notifications?: boolean | null
  created_at?: string
  updated_at?: string
}
Update: {
  id?: string
  user_id?: string
  theme?: 'vintage' | 'light' | 'dark' | null
  date_format?: string | null
  time_format?: '12h' | '24h' | null
  timezone?: string | null
  email_notifications?: boolean | null
  created_at?: string
  updated_at?: string
}
Relationships: []
}
locations: {
Row: {
  id: string
  user_id: string
  name: string
  description: string | null
  latitude: number | null
  longitude: number | null
  address: string | null
  city: string | null
  country: string | null
  created_at: string
  updated_at: string
}
Insert: {
  id?: string
  user_id: string
  name: string
  description?: string | null
  latitude?: number | null
  longitude?: number | null
  address?: string | null
  city?: string | null
  country?: string | null
  created_at?: string
  updated_at?: string
}
Update: {
  id?: string
  user_id?: string
  name?: string
  description?: string | null
  latitude?: number | null
  longitude?: number | null
  address?: string | null
  city?: string | null
  country?: string | null
  created_at?: string
  updated_at?: string
}
Relationships: []
}
trips: {
Row: {
  timezone?: string | null
  preparation?: Json
  id: string
  user_id: string
  title: string
  slug: string
  destination_latitude?: number | null
  destination_longitude?: number | null
  destination_source?: 'search' | 'map' | 'gps' | null
  destination: string | null
  description: string | null
  start_date: string | null
  end_date: string | null
  budget: number | null
  currency: string | null
  status: 'planning' | 'active' | 'completed' | 'archived'
  visibility: 'private' | 'public' | 'friends'
  created_at: string
  updated_at: string
  deleted_at: string | null
}
Insert: {
  timezone?: string | null
  preparation?: Json
  id?: string
  user_id: string
  title: string
  slug: string
  destination_latitude?: number | null
  destination_longitude?: number | null
  destination_source?: 'search' | 'map' | 'gps' | null
  destination?: string | null
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  budget?: number | null
  currency?: string | null
  status?: 'planning' | 'active' | 'completed' | 'archived'
  visibility?: 'private' | 'public' | 'friends'
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}
Update: {
  timezone?: string | null
  preparation?: Json
  id?: string
  user_id?: string
  title?: string
  slug?: string
  destination_latitude?: number | null
  destination_longitude?: number | null
  destination_source?: 'search' | 'map' | 'gps' | null
  destination?: string | null
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  budget?: number | null
  currency?: string | null
  status?: 'planning' | 'active' | 'completed' | 'archived'
  visibility?: 'private' | 'public' | 'friends'
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}
Relationships: []
}
trip_days: {
Row: {
  explicit_date?: boolean
  is_ideas?: boolean
  id: string
  trip_id: string
  title: string | null
  day_number: number
  date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
Insert: {
  is_ideas?: boolean
  explicit_date?: boolean
  id?: string
  trip_id: string
  title?: string | null
  day_number: number
  date?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}
Update: {
  is_ideas?: boolean
  explicit_date?: boolean
  id?: string
  trip_id?: string
  title?: string | null
  day_number?: number
  date?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}
Relationships: []
}
itinerary_items: {
Row: {
  latitude?: number | null
  longitude?: number | null
  location_source?: string | null
  location_name?: string | null
  time_label?: string | null
  booking_reference?: string | null
  place_provider?: string | null
  provider_place_id?: string | null
  id: string
  trip_day_id: string
  location_id: string | null
  title: string
  description: string | null
  start_time: string | null
  end_day_offset: number
  end_time: string | null
  duration_minutes: number | null
  item_type: 'activity' | 'transport' | 'meal' | 'lodging' | 'other' | null
  sort_order: number
  cost: number | null
  currency: string | null
  status: 'planned' | 'completed' | 'skipped' | 'cancelled'
  created_at: string
  updated_at: string
}
Insert: {
  latitude?: number | null
  longitude?: number | null
  location_source?: string | null
  location_name?: string | null
  time_label?: string | null
  booking_reference?: string | null
  place_provider?: string | null
  provider_place_id?: string | null
  id?: string
  trip_day_id: string
  location_id?: string | null
  title: string
  description?: string | null
  start_time?: string | null
  end_day_offset?: number
  end_time?: string | null
  duration_minutes?: number | null
  item_type?: 'activity' | 'transport' | 'meal' | 'lodging' | 'other' | null
  sort_order?: number
  cost?: number | null
  currency?: string | null
  status?: 'planned' | 'completed' | 'skipped' | 'cancelled'
  created_at?: string
  updated_at?: string
}
Update: {
  latitude?: number | null
  longitude?: number | null
  location_source?: string | null
  location_name?: string | null
  time_label?: string | null
  booking_reference?: string | null
  place_provider?: string | null
  provider_place_id?: string | null
  id?: string
  trip_day_id?: string
  location_id?: string | null
  title?: string
  description?: string | null
  start_time?: string | null
  end_day_offset?: number
  end_time?: string | null
  duration_minutes?: number | null
  item_type?: 'activity' | 'transport' | 'meal' | 'lodging' | 'other' | null
  sort_order?: number
  cost?: number | null
  currency?: string | null
  status?: 'planned' | 'completed' | 'skipped' | 'cancelled'
  created_at?: string
  updated_at?: string
}
Relationships: [{foreignKeyName:'itinerary_items_location_id_fkey';columns:['location_id'];isOneToOne:false;referencedRelation:'locations';referencedColumns:['id']}]
}
memories: {
Row: {
  itinerary_item_id?: string | null
  journal_entry_id?: string | null
scrapbook_layout: Json | null
  id: string
  user_id: string
  trip_id: string | null
  title: string
  description: string | null
  memory_date: string | null
  location_name: string | null
  latitude: number | null
  longitude: number | null
  is_archived: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}
Insert: {
  itinerary_item_id?: string | null
  journal_entry_id?: string | null
scrapbook_layout?: Json | null
  id?: string
  user_id: string
  trip_id?: string | null
  title: string
  description?: string | null
  memory_date?: string | null
  location_name?: string | null
  latitude?: number | null
  longitude?: number | null
  is_archived?: boolean
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}
Update: {
  itinerary_item_id?: string | null
  journal_entry_id?: string | null
  id?: string
  user_id?: string
  trip_id?: string | null
  title?: string
  description?: string | null
  memory_date?: string | null
  location_name?: string | null
  latitude?: number | null
  longitude?: number | null
  is_archived?: boolean
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}
Relationships: []
}
journal_entries: {
Row: {
scrapbook_layout: Json | null
location_source: string | null
tags: string[]
  id: string
  user_id: string
  trip_id: string | null
  trip_day_id: string | null
  itinerary_item_id: string | null
  memory_id: string | null
  title: string
  content: string
  mood_emoji: string | null
  mood_name: string | null
  mood_enum: 'happy' | 'excited' | 'peaceful' | 'nostalgic' | 'sad' | 'anxious' | 'neutral' | null
  location_name: string | null
  latitude: number | null
  longitude: number | null
  weather: string | null
  visibility: 'private' | 'public' | 'friends'
  status: 'draft' | 'published' | 'archived'
  is_archived: boolean
  entry_date: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}
Insert: {
scrapbook_layout?: Json | null
location_source?: string | null
tags?: string[]
  id?: string
  user_id: string
  trip_id?: string | null
  trip_day_id?: string | null
  itinerary_item_id?: string | null
  memory_id?: string | null
  title: string
  content: string
  mood_emoji?: string | null
  mood_name?: string | null
  mood_enum?: 'happy' | 'excited' | 'peaceful' | 'nostalgic' | 'sad' | 'anxious' | 'neutral' | null
  location_name?: string | null
  latitude?: number | null
  longitude?: number | null
  weather?: string | null
  visibility?: 'private' | 'public' | 'friends'
  status?: 'draft' | 'published' | 'archived'
  is_archived?: boolean
  entry_date: string
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}
Update: {
location_source?: string | null
tags?: string[]
  id?: string
  user_id?: string
  trip_id?: string | null
  trip_day_id?: string | null
  itinerary_item_id?: string | null
  memory_id?: string | null
  title?: string
  content?: string
  mood_emoji?: string | null
  mood_name?: string | null
  mood_enum?: 'happy' | 'excited' | 'peaceful' | 'nostalgic' | 'sad' | 'anxious' | 'neutral' | null
  location_name?: string | null
  latitude?: number | null
  longitude?: number | null
  weather?: string | null
  visibility?: 'private' | 'public' | 'friends'
  status?: 'draft' | 'published' | 'archived'
  is_archived?: boolean
  entry_date?: string
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}
Relationships: []
}
media: {
Row: {
  id: string
  user_id: string
  memory_id: string | null
  journal_entry_id: string | null
  trip_id: string | null
  storage_path: string
  file_name: string
  mime_type: string
  size_bytes: number
  width: number | null
  height: number | null
  caption: string | null
  is_cover: boolean
  is_profile_photo: boolean
  sort_order: number | null
  created_at: string
  updated_at: string
}
Insert: {
  id?: string
  user_id: string
  memory_id?: string | null
  journal_entry_id?: string | null
  trip_id?: string | null
  storage_path: string
  file_name: string
  mime_type: string
  size_bytes: number
  width?: number | null
  height?: number | null
  caption?: string | null
  is_cover?: boolean
  is_profile_photo?: boolean
  sort_order?: number | null
  created_at?: string
  updated_at?: string
}
Update: {
  id?: string
  user_id?: string
  memory_id?: string | null
  journal_entry_id?: string | null
  trip_id?: string | null
  storage_path?: string
  file_name?: string
  mime_type?: string
  size_bytes?: number
  width?: number | null
  height?: number | null
  caption?: string | null
  is_cover?: boolean
  is_profile_photo?: boolean
  sort_order?: number | null
  created_at?: string
  updated_at?: string
}
Relationships: []
}
time_capsules: {
Row: {
  id: string
  user_id: string
  title: string
  message: string | null
  unlock_date: string
  is_unlocked: boolean
  unlocked_at: string | null
  created_at: string
  updated_at: string
}
Insert: {
  id?: string
  user_id: string
  title: string
  message?: string | null
  unlock_date: string
  is_unlocked?: boolean
  unlocked_at?: string | null
  created_at?: string
  updated_at?: string
}
Update: {
  id?: string
  user_id?: string
  title?: string
  message?: string | null
  unlock_date?: string
  is_unlocked?: boolean
  unlocked_at?: string | null
  created_at?: string
  updated_at?: string
}
Relationships: []
}
time_capsule_items: {
Row: {
  id: string
  time_capsule_id: string
  item_type: 'journal_entry' | 'memory' | 'trip' | 'media'
  item_id: string
  created_at: string
  updated_at: string
}
Insert: {
  id?: string
  time_capsule_id: string
  item_type: 'journal_entry' | 'memory' | 'trip' | 'media'
  item_id: string
  created_at?: string
  updated_at?: string
}
Update: {
  id?: string
  time_capsule_id?: string
  item_type?: 'journal_entry' | 'memory' | 'trip' | 'media'
  item_id?: string
  created_at?: string
  updated_at?: string
}
Relationships: []
}
future_letters: {
Row: {
  id: string
  user_id: string
  subject: string
  body: string
  scheduled_for: string
  sent_at: string | null
  created_at: string
  updated_at: string
}
Insert: {
  id?: string
  user_id: string
  subject: string
  body: string
  scheduled_for: string
  sent_at?: string | null
  created_at?: string
  updated_at?: string
}
Update: {
  id?: string
  user_id?: string
  subject?: string
  body?: string
  scheduled_for?: string
  sent_at?: string | null
  created_at?: string
  updated_at?: string
}
Relationships: []
}
tags: {
Row: {
  id: string
  user_id: string
  name: string
  color: string | null
  created_at: string
  updated_at: string
}
Insert: {
  id?: string
  user_id: string
  name: string
  color?: string | null
  created_at?: string
  updated_at?: string
}
Update: {
  id?: string
  user_id?: string
  name?: string
  color?: string | null
  created_at?: string
  updated_at?: string
}
Relationships: []
}
people: {
Row: {
  id: string
  user_id: string
  name: string
  relationship: string | null
  created_at: string
  updated_at: string
}
Insert: {
  id?: string
  user_id: string
  name: string
  relationship?: string | null
  created_at?: string
  updated_at?: string
}
Update: {
  id?: string
  user_id?: string
  name?: string
  relationship?: string | null
  created_at?: string
  updated_at?: string
}
Relationships: []
}
journal_entry_tag: {
Row: {
  journal_entry_id: string
  tag_id: string
  created_at: string
}
Insert: {
  journal_entry_id: string
  tag_id: string
  created_at?: string
}
Update: {
  journal_entry_id?: string
  tag_id?: string
  created_at?: string
}
Relationships: []
}
memory_tag: {
Row: {
  memory_id: string
  tag_id: string
  created_at: string
}
Insert: {
  memory_id: string
  tag_id: string
  created_at?: string
}
Update: {
  memory_id?: string
  tag_id?: string
  created_at?: string
}
Relationships: []
}
trip_tag: {
Row: {
  trip_id: string
  tag_id: string
  created_at: string
}
Insert: {
  trip_id: string
  tag_id: string
  created_at?: string
}
Update: {
  trip_id?: string
  tag_id?: string
  created_at?: string
}
Relationships: []
}
journal_entry_person: {
Row: {
  journal_entry_id: string
  person_id: string
  created_at: string
}
Insert: {
  journal_entry_id: string
  person_id: string
  created_at?: string
}
Update: {
  journal_entry_id?: string
  person_id?: string
  created_at?: string
}
Relationships: []
}
memory_person: {
Row: {
  memory_id: string
  person_id: string
  created_at: string
}
Insert: {
  memory_id: string
  person_id: string
  created_at?: string
}
Update: {
  memory_id?: string
  person_id?: string
  created_at?: string
}
Relationships: []
}
trip_person: {
Row: {
  trip_id: string
  person_id: string
  created_at: string
}
Insert: {
  trip_id: string
  person_id: string
  created_at?: string
}
Update: {
  trip_id?: string
  person_id?: string
  created_at?: string
}
Relationships: []
}
audit_logs: {
Row: {
id: number
ip_address: string | null
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  user_agent: string | null
  metadata: Json | null
  created_at: string
}
Insert: {
id?: number
ip_address?: string | null
  user_id?: string | null
  action: string
  entity_type?: string | null
  entity_id?: string | null
  user_agent?: string | null
  metadata?: Json | null
  created_at?: string
}
Update: {
id?: number
ip_address?: string | null
  user_id?: string | null
  action?: string
  entity_type?: string | null
  entity_id?: string | null
  user_agent?: string | null
  metadata?: Json | null
  created_at?: string
}
Relationships: []
}
system_settings: {
Row: {
  id: string
  application_name: string | null
  application_description: string | null
  default_timezone: string | null
  default_language: string | null
  date_format: string | null
  time_format: '12h' | '24h' | null
  registration_enabled: boolean | null
  email_verification_required: boolean | null
  maintenance_mode: boolean | null
  maintenance_message: string | null
  default_theme: 'vintage' | 'light' | 'dark' | null
  animations_enabled: boolean | null
  vintage_effects_enabled: boolean | null
  max_file_size_mb: number | null
  max_files_per_upload: number | null
  updated_at: string
  updated_by: string | null
  singleton: boolean | null
}
Insert: {
  id?: string
  application_name?: string | null
  application_description?: string | null
  default_timezone?: string | null
  default_language?: string | null
  date_format?: string | null
  time_format?: '12h' | '24h' | null
  registration_enabled?: boolean | null
  email_verification_required?: boolean | null
  maintenance_mode?: boolean | null
  maintenance_message?: string | null
  default_theme?: 'vintage' | 'light' | 'dark' | null
  animations_enabled?: boolean | null
  vintage_effects_enabled?: boolean | null
  max_file_size_mb?: number | null
  max_files_per_upload?: number | null
  updated_at?: string
  updated_by?: string | null
  singleton?: boolean | null
}
Update: {
  id?: string
  application_name?: string | null
  application_description?: string | null
  default_timezone?: string | null
  default_language?: string | null
  date_format?: string | null
  time_format?: '12h' | '24h' | null
  registration_enabled?: boolean | null
  email_verification_required?: boolean | null
  maintenance_mode?: boolean | null
  maintenance_message?: string | null
  default_theme?: 'vintage' | 'light' | 'dark' | null
  animations_enabled?: boolean | null
  vintage_effects_enabled?: boolean | null
  max_file_size_mb?: number | null
  max_files_per_upload?: number | null
  updated_at?: string
  updated_by?: string | null
  singleton?: boolean | null
}
Relationships: []
}
feature_settings: {
Row: {
  id: string
  feature_key: string
  feature_name: string
  feature_description: string | null
  enabled: boolean | null
  created_at: string
  updated_at: string
  updated_by: string | null
}
Insert: {
  id?: string
  feature_key: string
  feature_name: string
  feature_description?: string | null
  enabled?: boolean | null
  created_at?: string
  updated_at?: string
  updated_by?: string | null
}
Update: {
  id?: string
  feature_key?: string
  feature_name?: string
  feature_description?: string | null
  enabled?: boolean | null
  created_at?: string
  updated_at?: string
  updated_by?: string | null
}
Relationships: []
}
admin_notifications: {
Row: {
  id: string
  admin_user_id: string
  notify_new_user: boolean | null
  notify_user_reports: boolean | null
  notify_suspicious_activity: boolean | null
  notify_system_errors: boolean | null
  notify_storage_warnings: boolean | null
  created_at: string
  updated_at: string
}
Insert: {
  id?: string
  admin_user_id: string
  notify_new_user?: boolean | null
  notify_user_reports?: boolean | null
  notify_suspicious_activity?: boolean | null
  notify_system_errors?: boolean | null
  notify_storage_warnings?: boolean | null
  created_at?: string
  updated_at?: string
}
Update: {
  id?: string
  admin_user_id?: string
  notify_new_user?: boolean | null
  notify_user_reports?: boolean | null
  notify_suspicious_activity?: boolean | null
  notify_system_errors?: boolean | null
  notify_storage_warnings?: boolean | null
  created_at?: string
  updated_at?: string
}
Relationships: []
}
sticker_assets: {
Row: {
  id: string
  user_id: string | null
  storage_path: string
  mime_type: string
  width: number
  height: number
  category: string
  created_at: string
}
Insert: {
  id?: string
  user_id?: string | null
  storage_path: string
  mime_type: string
  width: number
  height: number
  category?: string
  created_at?: string
}
Update: {
  id?: string
  user_id?: string | null
  storage_path?: string
  mime_type?: string
  width?: number
  height?: number
  category?: string
  created_at?: string
}
Relationships: []
}
journal_sticker_placements: {
Row: {
  id: string
  journal_entry_id: string
  sticker_asset_id: string
  x: number
  y: number
  width: number
  rotation: number
  z_index: number
  created_at: string
}
Insert: {
  id?: string
  journal_entry_id: string
  sticker_asset_id: string
  x: number
  y: number
  width: number
  rotation?: number
  z_index?: number
  created_at?: string
}
Update: {
  id?: string
  journal_entry_id?: string
  sticker_asset_id?: string
  x?: number
  y?: number
  width?: number
  rotation?: number
  z_index?: number
  created_at?: string
}
Relationships: []
}
}; Views: { [_ in never]: never }; Functions: {
name_trip_day: {Args:{target_trip_id:string;target_day_id:string;day_title:string};Returns:Database['public']['Tables']['trip_days']['Row']}

ensure_trip_days: {Args:{target_trip_id:string};Returns:undefined}
create_trip_draft: {Args:{draft_id:string;details:Json};Returns:Database['public']['Tables']['trips']['Row']}
save_trip_place: {Args:{target_trip_id:string;activity_id:string;place_date:string|null;details:Json};Returns:Json}
save_discovered_trip_place: {Args:{target_trip_id:string;activity_id:string;place_date:string|null;details:Json};Returns:Json}
reorder_trip_places: {Args:{target_trip_id:string;place_date:string|null;item_ids:string[]};Returns:undefined}
trip_folder_summaries: {Args:Record<string, never>;Returns:{trip_id:string;place_count:number;first_date:string|null;last_date:string|null}[]}
save_trip_activity: {Args:{target_trip_id:string;target_day_id:string;activity_id:string;details:Json};Returns:Database['public']['Tables']['itinerary_items']['Row']}
move_trip_activity: {Args:{activity_id:string;target_day_id:string};Returns:undefined}
replace_journal_stickers: { Args: { target_entry_id: string; placements: Json }; Returns: undefined }
create_memory_draft: { Args: { draft_id: string; draft_title: string; draft_description: string; draft_date: string }; Returns: Database['public']['Tables']['memories']['Row'] }
create_journal_draft: { Args: { draft_id: string; draft_title: string; draft_content: string; draft_date: string }; Returns: Database['public']['Tables']['journal_entries']['Row'] }
get_on_this_day: { Args: Record<string, never>; Returns: Json }
is_super_admin: { Args: Record<string, never>; Returns: boolean }
is_account_active: { Args: Record<string, never>; Returns: boolean }
get_my_role: { Args: Record<string, never>; Returns: string }
get_user_statistics: { Args: Record<string, never>; Returns: { total_users: number; active_users: number; suspended_users: number; new_users_this_month: number }[] }
get_content_statistics: { Args: Record<string, never>; Returns: { total_journal_entries: number; total_trips: number; total_memories: number; total_photos: number }[] }
admin_user_details: { Args: { target_user_id: string }; Returns: { email: string; last_sign_in_at: string | null; journal_count: number; trip_count: number; memory_count: number }[] }
set_trip_cover: { Args: { target_trip_id: string; target_media_id: string }; Returns: undefined }
reorder_itinerary: { Args: { target_day_id: string; item_ids: string[] }; Returns: undefined }
list_capsules: { Args: Record<string, never>; Returns: Json }
create_capsule: { Args: { capsule_title: string; capsule_message: string; opens_on: string }; Returns: string }
open_capsule: { Args: { capsule_id: string }; Returns: Json }
}; Enums: { [_ in never]: never }; CompositeTypes: { [_ in never]: never } } }
