/**
 * Admin Service
 * 
 * Handles all Super Admin operations including:
 * - User management
 * - System settings
 * - Feature toggles
 * - Activity logs
 * - Statistics
 */

import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type SystemSettings = Database['public']['Tables']['system_settings']['Row']

// ============================================================
// USER MANAGEMENT
// ============================================================

export interface UserListFilters {
  search?: string
  status?: 'all' | 'active' | 'suspended' | 'inactive'
  role?: 'all' | 'user' | 'super_admin'
  page?: number
  perPage?: number
}

export interface UserWithDetails extends Profile {
  email?: string
  total_journal_entries?: number
  total_memories?: number
  total_trips?: number
  last_login?: string
}

/**
 * Get list of users with optional filtering and pagination
 */
export async function getUsers(filters: UserListFilters = {}) {
  const {
    search = '',
    status = 'all',
    role = 'all',
    page = 1,
    perPage = 20,
  } = filters

  let query = supabase
    .from('profiles')
    .select(`
      *,
      user_id
    `, { count: 'exact' })

  // Apply filters
  if (status !== 'all') {
    query = query.eq('account_status', status)
  }

  if (role !== 'all') {
    query = query.eq('role', role)
  }

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,username.ilike.%${search}%`)
  }

  // Pagination
  const from = (page - 1) * perPage
  const to = from + perPage - 1
  query = query.range(from, to)

  // Order by created_at desc
  query = query.order('created_at', { ascending: false })

  const { data, error, count } = await query

  if (error) {
    console.error('Get users error:', error)
    return { users: [], total: 0, error: error.message }
  }

  // Get email addresses from auth.users (need to do this separately)
  const usersWithEmails: UserWithDetails[] = []
  if (data) {
    for (const profile of data) {
      // Get email from auth metadata
      const { data: details } = await supabase.rpc('admin_user_details', { target_user_id: profile.user_id })
      
      usersWithEmails.push({
        ...profile,
        email: details?.[0]?.email,
      })
    }
  }

  return {
    users: usersWithEmails,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / perPage),
    currentPage: page,
  }
}

/**
 * Get detailed information about a specific user
 */
export async function getUserDetails(userId: string) {
  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (profileError) {
    return { user: null, error: profileError.message }
  }

  // Get email from auth
  const { data: details, error: detailsError } = await supabase.rpc('admin_user_details', { target_user_id: userId })
  if (detailsError) return { user: null, error: detailsError.message }

  const user: UserWithDetails = {
    ...profile,
    email: details?.[0]?.email,
    total_journal_entries: details?.[0]?.journal_count || 0,
    total_trips: details?.[0]?.trip_count || 0,
    total_memories: details?.[0]?.memory_count || 0,
    last_login: details?.[0]?.last_sign_in_at ?? undefined,
  }

  return { user, error: null }
}

/**
 * Suspend a user account
 */
export async function suspendUser(userId: string, reason?: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ account_status: 'suspended' })
    .eq('user_id', userId)
    .neq('role', 'super_admin') // Prevent suspending super admin

  if (error) {
    return { success: false, error: error.message }
  }

  // Log the action
  await logAdminAction('USER_SUSPENDED', 'profiles', userId, {
    reason: reason || 'No reason provided',
  })

  return { success: true }
}

/**
 * Reactivate a suspended user account
 */
export async function reactivateUser(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ account_status: 'active' })
    .eq('user_id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Log the action
  await logAdminAction('USER_REACTIVATED', 'profiles', userId)

  return { success: true }
}

/**
 * Delete a user account (soft delete)
 */
export async function deleteUser(userId: string) {
  // Prevent deleting super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (profile?.role === 'super_admin') {
    return { success: false, error: 'Cannot delete Super Admin account' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ account_status: 'inactive' })
    .eq('user_id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Log the action
  await logAdminAction('USER_DELETED', 'profiles', userId)

  return { success: true }
}

// ============================================================
// SYSTEM SETTINGS
// ============================================================

/**
 * Get current system settings
 */
export async function getSystemSettings() {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .single()

  if (error) {
    console.error('Get system settings error:', error)
    return { settings: null, error: error.message }
  }

  return { settings: data, error: null }
}

/**
 * Update system settings
 */
export async function updateSystemSettings(updates: Partial<SystemSettings>) {
  const { data: currentUser } = await supabase.auth.getUser()
  if (!currentUser.user) return { success: false, error: 'Please sign in.' }

  const { error } = await supabase
    .from('system_settings')
    .update({
      ...updates,
      updated_by: currentUser.user?.id,
      updated_at: new Date().toISOString(),
    })
    .eq('singleton', true)

  if (error) {
    return { success: false, error: error.message }
  }

  // Log the action
  await logAdminAction('SYSTEM_SETTINGS_UPDATED', 'system_settings', null, updates)

  return { success: true }
}

// ============================================================
// FEATURE MANAGEMENT
// ============================================================

/**
 * Get all feature settings
 */
export async function getFeatureSettings() {
  const { data, error } = await supabase
    .from('feature_settings')
    .select('*')
    .order('feature_name', { ascending: true })

  if (error) {
    return { features: [], error: error.message }
  }

  return { features: data || [], error: null }
}

/**
 * Toggle a feature on/off
 */
export async function toggleFeature(featureKey: string, enabled: boolean) {
  const { data: currentUser } = await supabase.auth.getUser()
  if (!currentUser.user) return { success: false, error: 'Please sign in.' }

  const { error } = await supabase
    .from('feature_settings')
    .update({
      enabled,
      updated_by: currentUser.user?.id,
      updated_at: new Date().toISOString(),
    })
    .eq('feature_key', featureKey)

  if (error) {
    return { success: false, error: error.message }
  }

  // Log the action
  await logAdminAction(
    enabled ? 'FEATURE_ENABLED' : 'FEATURE_DISABLED',
    'feature_settings',
    null,
    { feature_key: featureKey }
  )

  return { success: true }
}

/**
 * Check if a feature is enabled (public function)
 */
export async function isFeatureEnabled(featureKey: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('feature_settings')
    .select('enabled')
    .eq('feature_key', featureKey)
    .single()

  if (error) {
    console.error('Check feature error:', error)
    return true // Default to enabled on error
  }

  return data?.enabled ?? true
}

// ============================================================
// STATISTICS
// ============================================================

export interface DashboardStats {
  users: {
    total: number
    active: number
    suspended: number
    newThisMonth: number
  }
  content: {
    journalEntries: number
    trips: number
    memories: number
    photos: number
  }
  system: {
    databaseStatus: 'connected' | 'disconnected' | 'unknown'
    authStatus: 'operational' | 'degraded' | 'unknown'
    storageStatus: 'operational' | 'degraded' | 'unknown'
  }
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  // Get user stats
  const { data: userStats, error: userStatsError } = await supabase.rpc('get_user_statistics')
  if (userStatsError) throw userStatsError
  
  // Get content stats
  const { data: contentStats, error: contentStatsError } = await supabase.rpc('get_content_statistics')
  if (contentStatsError) throw contentStatsError

  // Check system status
  const { error: dbError } = await supabase.from('profiles').select('id').limit(1)
  const databaseStatus = dbError ? 'disconnected' : 'connected'

  const { error: authError } = await supabase.auth.getUser()
  const authStatus = authError ? 'degraded' : 'operational'

  return {
    users: {
      total: Number(userStats?.[0]?.total_users || 0),
      active: Number(userStats?.[0]?.active_users || 0),
      suspended: Number(userStats?.[0]?.suspended_users || 0),
      newThisMonth: Number(userStats?.[0]?.new_users_this_month || 0),
    },
    content: {
      journalEntries: Number(contentStats?.[0]?.total_journal_entries || 0),
      trips: Number(contentStats?.[0]?.total_trips || 0),
      memories: Number(contentStats?.[0]?.total_memories || 0),
      photos: Number(contentStats?.[0]?.total_photos || 0),
    },
    system: {
      databaseStatus,
      authStatus,
      storageStatus: 'unknown',
    },
  }
}

// ============================================================
// ACTIVITY LOGS
// ============================================================

export interface ActivityLogFilters {
  action?: string
  startDate?: string
  endDate?: string
  page?: number
  perPage?: number
}

/**
 * Get activity logs with filtering
 */
export async function getActivityLogs(filters: ActivityLogFilters = {}) {
  const {
    action,
    startDate,
    endDate,
    page = 1,
    perPage = 50,
  } = filters

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })

  // Apply filters
  if (action) {
    query = query.eq('action', action)
  }

  if (startDate) {
    query = query.gte('created_at', startDate)
  }

  if (endDate) {
    query = query.lte('created_at', endDate)
  }

  // Pagination
  const from = (page - 1) * perPage
  const to = from + perPage - 1
  query = query.range(from, to)

  // Order by created_at desc
  query = query.order('created_at', { ascending: false })

  const { data, error, count } = await query

  if (error) {
    return { logs: [], total: 0, error: error.message }
  }

  return {
    logs: data || [],
    total: count || 0,
    totalPages: Math.ceil((count || 0) / perPage),
    currentPage: page,
  }
}

/**
 * Get recent activity (for dashboard)
 */
export async function getRecentActivity(limit: number = 10) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Get recent activity error:', error)
    return { activities: [], error: error.message }
  }

  return { activities: data || [], error: null }
}

/**
 * Log an admin action
 */
export async function logAdminAction(
  action: string,
  entityType: string | null = null,
  entityId: string | null = null,
  metadata: Record<string, any> = {}
) {
  const { data: currentUser } = await supabase.auth.getUser()
  if (!currentUser.user) return { success: false, error: 'Please sign in.' }

  const { error } = await supabase.from('audit_logs').insert({
    user_id: currentUser.user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: metadata as any,
  })

  if (error) {
    console.error('Log admin action error:', error)
  }
}

// ============================================================
// SYSTEM STATUS
// ============================================================

export interface SystemStatus {
  database: {
    status: 'connected' | 'disconnected' | 'unknown'
    responseTime?: number
  }
  authentication: {
    status: 'operational' | 'degraded' | 'down' | 'unknown'
  }
  storage: {
    status: 'operational' | 'degraded' | 'down' | 'unknown'
  }
}

/**
 * Check system health status
 */
export async function getSystemStatus(): Promise<SystemStatus> {
  const status: SystemStatus = {
    database: { status: 'unknown' },
    authentication: { status: 'unknown' },
    storage: { status: 'unknown' },
  }

  // Check database
  const dbStart = Date.now()
  const { error: dbError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)
  const dbTime = Date.now() - dbStart

  status.database = {
    status: dbError ? 'disconnected' : 'connected',
    responseTime: dbTime,
  }

  // Check authentication
  const { error: authError } = await supabase.auth.getUser()
  status.authentication = {
    status: authError ? 'down' : 'operational',
  }

  // Storage status (assume operational if we can connect to Supabase)
  status.storage = {
    status: 'unknown',
  }

  return status
}

// ============================================================
// ADMIN NOTIFICATIONS
// ============================================================

/**
 * Get admin notification settings
 */
export async function getAdminNotifications() {
  const { data: currentUser } = await supabase.auth.getUser()
  if (!currentUser.user) return { success: false, error: 'Please sign in.' }

  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .eq('admin_user_id', currentUser.user.id)
    .single()

  if (error && error.code !== 'PGRST116') { // Ignore "not found" error
    console.error('Get admin notifications error:', error)
    return { notifications: null, error: error.message }
  }

  return { notifications: data, error: null }
}

/**
 * Update admin notification settings
 */
export async function updateAdminNotifications(settings: {
  notify_new_user?: boolean
  notify_user_reports?: boolean
  notify_suspicious_activity?: boolean
  notify_system_errors?: boolean
  notify_storage_warnings?: boolean
}) {
  const { data: currentUser } = await supabase.auth.getUser()
  if (!currentUser.user) return { success: false, error: 'Please sign in.' }

  const { error } = await supabase
    .from('admin_notifications')
    .upsert({
      admin_user_id: currentUser.user.id,
      ...settings,
    }, { onConflict: 'admin_user_id' })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
