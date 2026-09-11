/**
 * Database Types for Supabase
 * 
 * These types match the PostgreSQL schema in database/supabase_schema.sql
 * 
 * Note: In a production setup, you can generate these automatically using:
 * npx supabase gen types typescript --project-id your-project-id > src/types/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          username: string | null
          avatar_url: string | null
          bio: string | null
          timezone: string
          locale: string
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
          timezone?: string
          locale?: string
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
          timezone?: string
          locale?: string
          role?: 'user' | 'super_admin'
          account_status?: 'active' | 'inactive' | 'suspended'
          created_at?: string
          updated_at?: string
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          theme: 'vintage' | 'light' | 'dark'
          date_format: string
          time_format: '12h' | '24h'
          timezone: string
          email_notifications: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          theme?: 'vintage' | 'light' | 'dark'
          date_format?: string
          time_format?: '12h' | '24h'
          timezone?: string
          email_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          theme?: 'vintage' | 'light' | 'dark'
          date_format?: string
          time_format?: '12h' | '24h'
          timezone?: string
          email_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      journal_entries: {
        Row: {
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
          mood_enum: string | null
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
          mood_enum?: string | null
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
          mood_enum?: string | null
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
      }
      trips: {
        Row: {
          id: string
          user_id: string
          title: string
          slug: string
          destination: string | null
          description: string | null
          start_date: string | null
          end_date: string | null
          budget: number | null
          currency: string
          status: 'planning' | 'active' | 'completed' | 'archived'
          visibility: 'private' | 'public' | 'friends'
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          slug: string
          destination?: string | null
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          budget?: number | null
          currency?: string
          status?: 'planning' | 'active' | 'completed' | 'archived'
          visibility?: 'private' | 'public' | 'friends'
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          slug?: string
          destination?: string | null
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          budget?: number | null
          currency?: string
          status?: 'planning' | 'active' | 'completed' | 'archived'
          visibility?: 'private' | 'public' | 'friends'
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      memories: {
        Row: {
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
          sort_order: number
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
          sort_order?: number
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
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      // Add other tables as needed...
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_account_active: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
