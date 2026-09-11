/**
 * Authentication Store using Supabase
 * 
 * Replaces Laravel Sanctum with Supabase Auth
 * Handles login, registration, logout, and session management
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser, AuthError } from '@supabase/supabase-js'
import type { User } from '@/types'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export const useAuthStore = defineStore('auth', () => {
  // State
  const supabaseUser = ref<SupabaseUser | null>(null)
  const profile = ref<Profile | null>(null)
  const initialized = ref(false)
  const loading = ref(false)

  // Computed
  const isAuthenticated = computed(() => supabaseUser.value !== null)
  
  const user = computed<User | null>(() => {
    if (!supabaseUser.value || !profile.value) return null
    
    return {
      id: supabaseUser.value.id,
      email: supabaseUser.value.email!,
      profile: {
        full_name: profile.value.full_name,
        username: profile.value.username,
        avatar_url: profile.value.avatar_url,
        bio: profile.value.bio,
        timezone: profile.value.timezone,
        locale: profile.value.locale,
        role: profile.value.role,
        account_status: profile.value.account_status,
      },
      // Legacy compatibility
      name: profile.value.full_name,
      avatar_path: profile.value.avatar_url,
      timezone: profile.value.timezone,
      locale: profile.value.locale,
      created_at: profile.value.created_at,
    }
  })

  const isSuperAdmin = computed(() => profile.value?.role === 'super_admin')
  const isAccountActive = computed(() => profile.value?.account_status === 'active')

  /**
   * Initialize auth state on app startup
   * Checks for existing session and loads user data
   */
  async function initialize(): Promise<void> {
    if (initialized.value) return

    try {
      loading.value = true

      // Check for existing session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Session error:', error)
        supabaseUser.value = null
        profile.value = null
        return
      }

      if (session?.user) {
        supabaseUser.value = session.user
        await fetchProfile()
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event)
        
        if (session?.user) {
          supabaseUser.value = session.user
          await fetchProfile()
        } else {
          supabaseUser.value = null
          profile.value = null
        }
      })
    } catch (error) {
      console.error('Initialization error:', error)
      supabaseUser.value = null
      profile.value = null
    } finally {
      initialized.value = true
      loading.value = false
    }
  }

  /**
   * Fetch user profile from profiles table
   */
  async function fetchProfile(): Promise<void> {
    if (!supabaseUser.value) {
      profile.value = null
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', supabaseUser.value.id)
        .single()

      if (error) {
        console.error('Profile fetch error:', error)
        profile.value = null
        return
      }

      profile.value = data
    } catch (error) {
      console.error('Profile fetch exception:', error)
      profile.value = null
    }
  }

  /**
   * Register a new user
   * @param fullName - User's full name
   * @param email - User's email
   * @param password - User's password
   */
  async function register(
    fullName: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      loading.value = true

      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data.user) {
        return { success: false, error: 'Registration failed. Please try again.' }
      }

      // Check if email confirmation is required
      if (data.session) {
        // Email confirmation disabled - user is logged in
        supabaseUser.value = data.user
        await fetchProfile()
      } else {
        // Email confirmation required
        // User will need to confirm email before logging in
        console.log('Email confirmation required')
      }

      return { success: true }
    } catch (error: any) {
      console.error('Registration error:', error)
      return { success: false, error: error.message || 'Registration failed' }
    } finally {
      loading.value = false
    }
  }

  /**
   * Login with email and password
   * @param email - User's email
   * @param password - User's password
   */
  async function login(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      loading.value = true

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data.user) {
        return { success: false, error: 'Login failed. Please try again.' }
      }

      supabaseUser.value = data.user
      await fetchProfile()

      // Check account status
      if (profile.value?.account_status !== 'active') {
        await logout()
        return { 
          success: false, 
          error: `Your account is ${profile.value?.account_status}. Please contact support.` 
        }
      }

      return { success: true }
    } catch (error: any) {
      console.error('Login error:', error)
      return { success: false, error: error.message || 'Login failed' }
    } finally {
      loading.value = false
    }
  }

  /**
   * Logout current user
   */
  async function logout(): Promise<void> {
    try {
      loading.value = true
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Logout error:', error)
      }

      // Clear state regardless of error
      supabaseUser.value = null
      profile.value = null
    } catch (error) {
      console.error('Logout exception:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * Update user profile
   */
  async function updateProfile(updates: {
    full_name?: string
    username?: string
    bio?: string
    avatar_url?: string
    timezone?: string
    locale?: string
  }): Promise<{ success: boolean; error?: string }> {
    if (!supabaseUser.value) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      loading.value = true

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', supabaseUser.value.id)

      if (error) {
        return { success: false, error: error.message }
      }

      // Refresh profile
      await fetchProfile()

      return { success: true }
    } catch (error: any) {
      console.error('Profile update error:', error)
      return { success: false, error: error.message || 'Profile update failed' }
    } finally {
      loading.value = false
    }
  }

  /**
   * Change user password
   */
  async function changePassword(
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      loading.value = true

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      console.error('Password change error:', error)
      return { success: false, error: error.message || 'Password change failed' }
    } finally {
      loading.value = false
    }
  }

  /**
   * Request password reset email
   */
  async function requestPasswordReset(
    email: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      loading.value = true

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      console.error('Password reset request error:', error)
      return { success: false, error: error.message || 'Password reset request failed' }
    } finally {
      loading.value = false
    }
  }

  /**
   * Refresh current user data
   */
  async function fetchCurrentUser(): Promise<void> {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Fetch user error:', error)
      supabaseUser.value = null
      profile.value = null
      return
    }

    if (user) {
      supabaseUser.value = user
      await fetchProfile()
    }
  }

  return {
    // State
    user,
    supabaseUser,
    profile,
    initialized,
    loading,
    
    // Computed
    isAuthenticated,
    isSuperAdmin,
    isAccountActive,
    
    // Methods
    initialize,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    requestPasswordReset,
    fetchCurrentUser,
    fetchProfile,
  }
})
