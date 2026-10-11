<template>
  <div class="admin-activity">
    <div class="page-header">
      <h1>Activity Logs</h1>
      <p class="subtitle">Administrative actions and security events</p>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="filter-group">
        <label>Action Type</label>
        <select v-model="filters.action" @change="loadLogs" class="filter-select">
          <option value="">All Actions</option>
          <option value="USER_SUSPENDED">User Suspended</option>
          <option value="USER_REACTIVATED">User Reactivated</option>
          <option value="USER_DELETED">User Deleted</option>
          <option value="SYSTEM_SETTINGS_UPDATED">Settings Updated</option>
          <option value="FEATURE_ENABLED">Feature Enabled</option>
          <option value="FEATURE_DISABLED">Feature Disabled</option>
          <option value="SUPER_ADMIN_CREATED">Super Admin Created</option>
        </select>
      </div>

      <div class="filter-group">
        <label>Start Date</label>
        <input
          v-model="filters.startDate"
          type="date"
          @change="loadLogs"
          class="filter-input"
        />
      </div>

      <div class="filter-group">
        <label>End Date</label>
        <input
          v-model="filters.endDate"
          type="date"
          @change="loadLogs"
          class="filter-input"
        />
      </div>

      <button @click="clearFilters" class="clear-button">Clear Filters</button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading activity logs...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button @click="loadLogs" class="retry-button">Retry</button>
    </div>

    <!-- Activity List -->
    <div v-else class="activity-section">
      <div class="section-header">
        <div class="results-info">
          Showing {{ logs.length }} of {{ totalLogs }} activity logs
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="logs.length === 0" class="empty-state">
        <span class="empty-icon">📋</span>
        <p>No activity logs found</p>
        <p class="empty-hint">Try adjusting your filters</p>
      </div>

      <!-- Logs List -->
      <div v-else class="logs-list">
        <div v-for="log in logs" :key="log.id" class="log-item">
          <div class="log-icon">
            {{ getActivityIcon(log.action) }}
          </div>
          <div class="log-content">
            <div class="log-header">
              <span class="log-action">{{ formatAction(log.action) }}</span>
              <span class="log-time">{{ formatTimestamp(log.created_at) }}</span>
            </div>
            <div v-if="log.entity_type" class="log-details">
              <span class="log-entity">{{ log.entity_type }}</span>
              <span v-if="log.entity_id" class="log-entity-id">{{ log.entity_id }}</span>
            </div>
            <div v-if="log.metadata && Object.keys(log.metadata).length > 0" class="log-metadata">
              <details>
                <summary>View Details</summary>
                <pre>{{ JSON.stringify(log.metadata, null, 2) }}</pre>
              </details>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          @click="changePage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="page-button"
        >
          ← Previous
        </button>
        <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
        <button
          @click="changePage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="page-button"
        >
          Next →
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, reactive, onMounted } from 'vue'
import { getActivityLogs } from '@/services/admin'
import type { Database } from '@/types/database.types'

type AuditLog = Database['public']['Tables']['audit_logs']['Row']

const loading = ref(true)
const error = ref('')
const logs = shallowRef<AuditLog[]>([])
const totalLogs = ref(0)
const currentPage = ref(1)
const totalPages = ref(1)

const filters = reactive({
  action: '',
  startDate: '',
  endDate: '',
})

async function loadLogs() {
  try {
    loading.value = true
    error.value = ''

    const result = await getActivityLogs({
      action: filters.action || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      page: currentPage.value,
      perPage: 50,
    })

    if (result.error) {
      error.value = result.error
    } else {
      logs.value = result.logs
      totalLogs.value = result.total
      totalPages.value = result.totalPages || 1
    }
  } catch (err: any) {
    console.error('Load logs error:', err)
    error.value = err.message || 'Failed to load activity logs'
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  filters.action = ''
  filters.startDate = ''
  filters.endDate = ''
  currentPage.value = 1
  loadLogs()
}

function changePage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    loadLogs()
  }
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
    SUPER_ADMIN_DEMOTED: '⬇️',
  }
  return iconMap[action] || '📋'
}

function formatAction(action: string): string {
  return action
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  loadLogs()
})
</script>

<style scoped>
.admin-activity {
  max-width: 1200px;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 600;
  color: #2c2416;
  margin: 0 0 0.5rem 0;
}

.subtitle {
  color: #6b6456;
  margin: 0;
}

/* Filters */

.filters-section {
  background: white;
  border: 1px solid #e5e5e0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 200px;
}

.filter-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #2c2416;
}

.filter-select,
.filter-input {
  padding: 0.75rem 1rem;
  border: 1px solid #e5e5e0;
  border-radius: 6px;
  font-size: 0.9375rem;
  background: white;
  transition: border-color 0.2s;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: #8b4513;
}

.clear-button {
  background: #e5e5e0;
  color: #2c2416;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  align-self: flex-end;
}

.clear-button:hover {
  background: #d0d0c8;
}

/* Loading & Error */

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background: white;
  border: 1px solid #e5e5e0;
  border-radius: 8px;
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
  to {
    transform: rotate(360deg);
  }
}

.error-icon {
  font-size: 3rem;
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

/* Activity Section */

.activity-section {
  background: white;
  border: 1px solid #e5e5e0;
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e5e0;
}

.results-info {
  color: #6b6456;
  font-size: 0.875rem;
}

/* Empty State */

.empty-state {
  padding: 4rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 1rem;
}

.empty-state p {
  color: #2c2416;
  margin: 0 0 0.5rem 0;
}

.empty-hint {
  color: #6b6456;
  font-size: 0.875rem;
}

/* Logs List */

.logs-list {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.log-item {
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  background: #f5f5f0;
  border-radius: 6px;
  border-left: 3px solid #8b4513;
}

.log-icon {
  font-size: 1.75rem;
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 6px;
  flex-shrink: 0;
}

.log-content {
  flex: 1;
  min-width: 0;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.log-action {
  font-weight: 600;
  color: #2c2416;
  font-size: 1rem;
}

.log-time {
  font-size: 0.875rem;
  color: #6b6456;
  white-space: nowrap;
}

.log-details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.log-entity {
  font-size: 0.875rem;
  color: #6b6456;
  font-weight: 500;
}

.log-entity-id {
  font-size: 0.75rem;
  font-family: monospace;
  color: #95a5a6;
  background: white;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
}

.log-metadata {
  margin-top: 0.75rem;
}

.log-metadata details {
  cursor: pointer;
}

.log-metadata summary {
  font-size: 0.875rem;
  color: #8b4513;
  font-weight: 500;
  user-select: none;
}

.log-metadata pre {
  margin-top: 0.5rem;
  padding: 1rem;
  background: white;
  border-radius: 6px;
  font-size: 0.8125rem;
  overflow-x: auto;
  color: #2c2416;
}

/* Pagination */

.pagination {
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  border-top: 1px solid #e5e5e0;
}

.page-button {
  background: white;
  border: 1px solid #e5e5e0;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.page-button:hover:not(:disabled) {
  background: #8b4513;
  color: white;
  border-color: #8b4513;
}

.page-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #6b6456;
  font-size: 0.875rem;
}

/* Mobile */

@media (max-width: 768px) {
  .filters-section {
    flex-direction: column;
  }

  .filter-group {
    min-width: 100%;
  }

  .clear-button {
    align-self: stretch;
  }

  .log-item {
    flex-direction: column;
    gap: 0.75rem;
  }

  .log-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .log-metadata pre {
    font-size: 0.75rem;
  }
}
</style>
