/**
 * Supabase Client Configuration
 * 
 * This is the single source of truth for Supabase connection.
 * All components should import this client, not create their own.
 * 
 * SECURITY:
 * - Uses VITE_SUPABASE_ANON_KEY (safe for frontend)
 * - Protected by Row Level Security (RLS) policies
 * - Never use service_role key in frontend code
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  )
}

/**
 * Supabase client instance
 * 
 * Features:
 * - Authentication (sign up, sign in, sign out, session management)
 * - Database queries (protected by RLS)
 * - Storage operations (protected by storage policies)
 * - Real-time subscriptions (optional)
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Store session in localStorage for persistence across page refreshes
    storage: window.localStorage,
    
    // Auto refresh tokens before they expire
    autoRefreshToken: true,
    
    // Persist session across browser tabs
    persistSession: true,
    
    // Detect session from URL (for email confirmations, password resets)
    detectSessionInUrl: true,
  },
})

/**
 * Helper function to get the current user
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Error fetching current user:', error)
    return null
  }
  return user
}

/**
 * Helper function to get the current session
 * Returns null if no active session
 */
export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Error fetching session:', error)
    return null
  }
  return session
}

/**
 * Helper to check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession()
  return session !== null
}

/**
 * Type exports for convenience
 */
export type { User, Session, AuthError } from '@supabase/supabase-js'
