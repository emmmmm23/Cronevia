<template>
  <div class="admin-dashboard">
    <div class="dashboard-header">
      <h1>Dashboard</h1>
      <p class="subtitle">Overview of your Cronevia platform</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading dashboard...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button @click="loadDashboard" class="retry-button">Retry</button>
    </div>

    <!-- Dashboard Content -->
    <div v-else class="dashboard-content">
      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <div class="stat-label">Total Users</div>
            <div class="stat-value">{{ stats.users.total }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <div class="stat-label">Active Users</div>
            <div class="stat-value">{{ stats.users.active }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">⛔</div>
          <div class="stat-content">
            <div class="stat-label">Suspended Users</div>
            <div class="stat-value">{{ stats.users.suspended }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">🆕</div>
          <div class="stat-content">
            <div class="stat-label">New This Month</div>
            <div class="stat-value">{{ stats.users.newThisMonth }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">📔</div>
          <div class="stat-content">
            <div class="stat-label">Journal Entries</div>
            <div class="stat-value">{{ stats.content.journalEntries }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">✈️</div>
          <div class="stat-content">
            <div class="stat-label">Trips</div>
            <div class="stat-value">{{ stats.content.trips }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">💭</div>
          <div class="stat-content">
            <div class="stat-label">Memories</div>
            <div class="stat-value">{{ stats.content.memories }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">📷</div>
          <div class="stat-content">
            <div class="stat-label">Photos</div>
            <div class="stat-value">{{ stats.content.photos }}</div>
          </div>
        </div>
      </div>

      <!-- System Status -->
      <div class="section">
        <h2 class="section-title">System Status</h2>
        <div class="status-grid">
          <div class="status-item">
            <div class="status-header">
              <span class="status-label">Application</span>
              <span :class="['status-indicator', 'status-online']">● Online</span>
            </div>
          </div>

          <div class="status-item">
            <div class="status-header">
              <span class="status-label">Authentication</span>
              <span :class="['status-indicator', getStatusClass(stats.system.authStatus)]">
                ● {{ getStatusLabel(stats.system.authStatus) }}
              </span>
            </div>
          </div>

          <div class="status-item">
            <div class="status-header">
              <span class="status-label">Database</span>
              <span :class="['status-indicator', getStatusClass(stats.system.databaseStatus)]">
                ● {{ getStatusLabel(stats.system.databaseStatus) }}
              </span>
            </div>
          </div>

          <div class="status-item">
            <div class="status-header">
              <span class="status-label">Storage</span>
              <span :class="['status-indicator', getStatusClass(stats.system.storageStatus)]">
                ● {{ getStatusLabel(stats.system.storageStatus) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">Recent Activity</h2>
          <router-link to="/admin/activity" class="view-all-link">
            View All →
          </router-link>
        </div>

        <div v-if="recentActivity.length === 0" class="empty-state">
          <span class="empty-icon">📋</span>
          <p>No recent activity</p>
        </div>

        <div v-else class="activity-list">
          <div
            v-for="activity in recentActivity"
            :key="activity.id"
            class="activity-item"
          >
            <div class="activity-icon">
              {{ getActivityIcon(activity.action) }}
            </div>
            <div class="activity-content">
              <div class="activity-action">{{ formatAction(activity.action) }}</div>
              <div class="activity-time">{{ formatTime(activity.created_at) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="section">
        <h2 class="section-title">Quick Actions</h2>
        <div class="quick-actions">
          <router-link to="/admin/users" class="action-button">
            <span class="action-icon">👥</span>
            <span class="action-label">Manage Users</span>
          </router-link>
          <router-link to="/admin/settings" class="action-button">
            <span class="action-icon">⚙️</span>
            <span class="action-label">Settings</span>
          </router-link>
          <router-link to="/admin/activity" class="action-button">
            <span class="action-icon">📋</span>
            <span class="action-label">Activity Logs</span>
          </router-link>
          <router-link to="/admin/system" class="action-button">
            <span class="action-icon">🖥️</span>
            <span class="action-label">System Status</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted } from 'vue'
import { getDashboardStats, getRecentActivity, type DashboardStats } from '@/services/admin'
import type { Database } from '@/types/database.types'

type AuditLog = Database['public']['Tables']['audit_logs']['Row']

const loading = ref(true)
const error = ref('')

const stats = ref<DashboardStats>({
  users: {
    total: 0,
    active: 0,
    suspended: 0,
    newThisMonth: 0,
  },
  content: {
    journalEntries: 0,
    trips: 0,
    memories: 0,
    photos: 0,
  },
  system: {
    databaseStatus: 'unknown',
    authStatus: 'unknown',
    storageStatus: 'unknown',
  },
})

const recentActivity = shallowRef<AuditLog[]>([])

async function loadDashboard() {
  try {
    loading.value = true
    error.value = ''

    // Load statistics
    const dashboardStats = await getDashboardStats()
    stats.value = dashboardStats

    // Load recent activity
    const { activities, error: activityError } = await getRecentActivity(5)
    if (activityError) {
      console.error('Failed to load activity:', activityError)
    } else {
      recentActivity.value = activities
    }
  } catch (err: any) {
    console.error('Dashboard load error:', err)
    error.value = err.message || 'Failed to load dashboard'
  } finally {
    loading.value = false
  }
}

function getStatusClass(status: string): string {
  const statusMap: Record<string, string> = {
    connected: 'status-online',
    operational: 'status-online',
    disconnected: 'status-offline',
    down: 'status-offline',
    degraded: 'status-warning',
    unknown: 'status-unknown',
  }
  return statusMap[status] || 'status-unknown'
}

function getStatusLabel(status: string): string {
  const labelMap: Record<string, string> = {
    connected: 'Connected',
    operational: 'Operational',
    disconnected: 'Disconnected',
    down: 'Down',
    degraded: 'Degraded',
    unknown: 'Unknown',
  }
  return labelMap[status] || 'Unknown'
}

function getActivityIcon(action: string): string {
  const iconMap: Record<string, string> = {
    USER_SUSPENDED: '⛔',
    USER_REACTIVATED: '✅',
    USER_DELETED: '🗑️',
    SYSTEM_SETTINGS_UPDATED: '⚙️',
    FEATURE_ENABLED: '✅',
    FEATURE_DISABLED: '❌',
    SUPER_ADMIN_CREATED: '👑',
  }
  return iconMap[action] || '📋'
}

function formatAction(action: string): string {
  return action
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString()
}

onMounted(() => {
  loadDashboard()
})
</script>

<style scoped>
.admin-dashboard {
  max-width: 1400px;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.dashboard-header h1 {
  font-size: 2rem;
  font-weight: 600;
  color: #2c2416;
  margin: 0 0 0.5rem 0;
}

.subtitle {
  color: #6b6456;
  margin: 0;
}

/* Loading & Error States */

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e5e0;
  border-top-color: #8b4513;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-state p {
  color: #c0392b;
  margin-bottom: 1rem;
}

.retry-button {
  background: #8b4513;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.retry-button:hover {
  background: #6d3410;
}

/* Statistics Grid */

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border: 1px solid #e5e5e0;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: #8b4513;
  box-shadow: 0 2px 8px rgba(139, 69, 19, 0.1);
}

.stat-icon {
  font-size: 2rem;
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f0;
  border-radius: 8px;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b6456;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 600;
  color: #2c2416;
}

/* Sections */

.section {
  background: white;
  border: 1px solid #e5e5e0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2c2416;
  margin: 0 0 1.25rem 0;
}

.view-all-link {
  color: #8b4513;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: color 0.2s;
}

.view-all-link:hover {
  color: #6d3410;
}

/* System Status */

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.status-item {
  padding: 1rem;
  background: #f5f5f0;
  border-radius: 6px;
}

.status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.status-label {
  font-weight: 500;
  color: #2c2416;
}

.status-indicator {
  font-size: 0.875rem;
  font-weight: 500;
}

.status-online {
  color: #27ae60;
}

.status-offline {
  color: #c0392b;
}

.status-warning {
  color: #f39c12;
}

.status-unknown {
  color: #95a5a6;
}

/* Activity List */

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f5f5f0;
  border-radius: 6px;
}

.activity-icon {
  font-size: 1.5rem;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 6px;
}

.activity-content {
  flex: 1;
}

.activity-action {
  font-weight: 500;
  color: #2c2416;
  margin-bottom: 0.25rem;
}

.activity-time {
  font-size: 0.875rem;
  color: #6b6456;
}

/* Empty State */

.empty-state {
  padding: 3rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

.empty-state p {
  color: #6b6456;
  margin: 0;
}

/* Quick Actions */

.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: #f5f5f0;
  border-radius: 6px;
  text-decoration: none;
  color: #2c2416;
  font-weight: 500;
  transition: all 0.2s;
}

.action-button:hover {
  background: #8b4513;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(139, 69, 19, 0.2);
}

.action-icon {
  font-size: 1.5rem;
}

.action-label {
  font-size: 0.9375rem;
}

/* Mobile Responsive */

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .stat-card {
    padding: 1rem;
  }

  .stat-icon {
    font-size: 1.5rem;
    width: 2.5rem;
    height: 2.5rem;
  }

  .stat-value {
    font-size: 1.5rem;
  }

  .status-grid,
  .quick-actions {
    grid-template-columns: 1fr;
  }

  .section {
    padding: 1.25rem;
  }
}
</style>
