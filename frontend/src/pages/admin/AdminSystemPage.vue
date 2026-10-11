<template>
  <div class="admin-system">
    <div class="page-header">
      <div>
        <h1>System Status</h1>
        <p class="subtitle">Platform health and service status</p>
      </div>
      <button @click="loadStatus" :disabled="loading" class="refresh-button">
        🔄 Refresh
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Checking system status...</p>
    </div>

    <!-- System Status -->
    <div v-else class="status-content">
      <!-- Overall Status -->
      <div class="overall-status">
        <div class="status-icon" :class="overallStatusClass">
          {{ overallStatusIcon }}
        </div>
        <div class="status-text">
          <h2>{{ overallStatusText }}</h2>
          <p>Last checked: {{ lastChecked }}</p>
        </div>
      </div>

      <!-- Service Status Cards -->
      <div class="status-grid">
        <!-- Database -->
        <div class="status-card">
          <div class="card-header">
            <span class="service-icon">🗄️</span>
            <h3>Database</h3>
          </div>
          <div class="card-body">
            <div :class="['status-indicator', getStatusClass(status.database.status)]">
              <span class="indicator-dot">●</span>
              <span class="indicator-text">{{ getStatusLabel(status.database.status) }}</span>
            </div>
            <div v-if="status.database.responseTime" class="status-detail">
              Response Time: {{ status.database.responseTime }}ms
            </div>
          </div>
        </div>

        <!-- Authentication -->
        <div class="status-card">
          <div class="card-header">
            <span class="service-icon">🔐</span>
            <h3>Authentication</h3>
          </div>
          <div class="card-body">
            <div :class="['status-indicator', getStatusClass(status.authentication.status)]">
              <span class="indicator-dot">●</span>
              <span class="indicator-text">{{ getStatusLabel(status.authentication.status) }}</span>
            </div>
          </div>
        </div>

        <!-- Storage -->
        <div class="status-card">
          <div class="card-header">
            <span class="service-icon">💾</span>
            <h3>Storage</h3>
          </div>
          <div class="card-body">
            <div :class="['status-indicator', getStatusClass(status.storage.status)]">
              <span class="indicator-dot">●</span>
              <span class="indicator-text">{{ getStatusLabel(status.storage.status) }}</span>
            </div>
          </div>
        </div>

        <!-- Application -->
        <div class="status-card">
          <div class="card-header">
            <span class="service-icon">🌐</span>
            <h3>Application</h3>
          </div>
          <div class="card-body">
            <div class="status-indicator status-operational">
              <span class="indicator-dot">●</span>
              <span class="indicator-text">Online</span>
            </div>
          </div>
        </div>
      </div>

      <!-- System Information -->
      <div class="info-section">
        <h2>System Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Platform</span>
            <span class="info-value">Cronevia</span>
          </div>
          <div class="info-item">
            <span class="info-label">Version</span>
            <span class="info-value">1.0.0</span>
          </div>
          <div class="info-item">
            <span class="info-label">Environment</span>
            <span class="info-value">{{ environment }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Database Provider</span>
            <span class="info-value">Supabase PostgreSQL</span>
          </div>
          <div class="info-item">
            <span class="info-label">Auth Provider</span>
            <span class="info-value">Supabase Auth</span>
          </div>
          <div class="info-item">
            <span class="info-label">Storage Provider</span>
            <span class="info-value">Supabase Storage</span>
          </div>
        </div>
      </div>

      <!-- Health Check Info -->
      <div class="info-section">
        <h2>Health Check Information</h2>
        <div class="alert-info">
          <span class="alert-icon">ℹ️</span>
          <div>
            <p><strong>Automatic Monitoring</strong></p>
            <p>System status is checked in real-time. Services are continuously monitored for availability and performance.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getSystemStatus, type SystemStatus } from '@/services/admin'

const loading = ref(true)
const lastChecked = ref('')

const status = ref<SystemStatus>({
  database: { status: 'unknown' },
  authentication: { status: 'unknown' },
  storage: { status: 'unknown' },
})

const environment = computed(() => {
  return import.meta.env.MODE === 'production' ? 'Production' : 'Development'
})

const overallStatusClass = computed(() => {
  const statuses = [
    status.value.database.status,
    status.value.authentication.status,
    status.value.storage.status,
  ]

  if (statuses.some((s) => s === 'down' || s === 'disconnected')) {
    return 'status-error'
  }
  if (statuses.some((s) => s === 'degraded')) {
    return 'status-warning'
  }
  if (statuses.every((s) => s === 'operational' || s === 'connected')) {
    return 'status-success'
  }
  return 'status-unknown'
})

const overallStatusIcon = computed(() => {
  const statusClass = overallStatusClass.value
  if (statusClass === 'status-success') return '✅'
  if (statusClass === 'status-warning') return '⚠️'
  if (statusClass === 'status-error') return '❌'
  return '❓'
})

const overallStatusText = computed(() => {
  const statusClass = overallStatusClass.value
  if (statusClass === 'status-success') return 'All Systems Operational'
  if (statusClass === 'status-warning') return 'Some Services Degraded'
  if (statusClass === 'status-error') return 'System Issues Detected'
  return 'Status Unknown'
})

async function loadStatus() {
  try {
    loading.value = true
    status.value = await getSystemStatus()
    lastChecked.value = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch (err) {
    console.error('Load status error:', err)
  } finally {
    loading.value = false
  }
}

function getStatusClass(status: string): string {
  const statusMap: Record<string, string> = {
    connected: 'status-operational',
    operational: 'status-operational',
    disconnected: 'status-down',
    down: 'status-down',
    degraded: 'status-degraded',
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

onMounted(() => {
  loadStatus()
})
</script>

<style scoped>
.admin-system {
  max-width: 1200px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;
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

.refresh-button {
  background: white;
  color: #8b4513;
  border: 1px solid #e5e5e0;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.refresh-button:hover:not(:disabled) {
  background: #8b4513;
  color: white;
  border-color: #8b4513;
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Loading */

.loading-state {
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

/* Overall Status */

.overall-status {
  background: white;
  border: 1px solid #e5e5e0;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.status-icon {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  flex-shrink: 0;
}

.status-icon.status-success {
  background: #d4edda;
}

.status-icon.status-warning {
  background: #fff3cd;
}

.status-icon.status-error {
  background: #f8d7da;
}

.status-icon.status-unknown {
  background: #e2e3e5;
}

.status-text h2 {
  margin: 0 0 0.25rem 0;
  color: #2c2416;
  font-size: 1.5rem;
}

.status-text p {
  margin: 0;
  color: #6b6456;
  font-size: 0.875rem;
}

/* Status Grid */

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.status-card {
  background: white;
  border: 1px solid #e5e5e0;
  border-radius: 8px;
  overflow: hidden;
}

.card-header {
  padding: 1.25rem;
  border-bottom: 1px solid #e5e5e0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.service-icon {
  font-size: 1.5rem;
}

.card-header h3 {
  margin: 0;
  font-size: 1.125rem;
  color: #2c2416;
}

.card-body {
  padding: 1.25rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  margin-bottom: 0.75rem;
}

.indicator-dot {
  font-size: 0.875rem;
}

.status-operational {
  color: #27ae60;
}

.status-down {
  color: #c0392b;
}

.status-degraded {
  color: #f39c12;
}

.status-unknown {
  color: #95a5a6;
}

.status-detail {
  font-size: 0.875rem;
  color: #6b6456;
  padding-top: 0.75rem;
  border-top: 1px solid #f5f5f0;
}

/* Info Section */

.info-section {
  background: white;
  border: 1px solid #e5e5e0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.info-section h2 {
  margin: 0 0 1.25rem 0;
  color: #2c2416;
  font-size: 1.25rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem;
  background: #f5f5f0;
  border-radius: 6px;
}

.info-label {
  font-size: 0.875rem;
  color: #6b6456;
  font-weight: 500;
}

.info-value {
  color: #2c2416;
  font-weight: 500;
}

/* Alert */

.alert-info {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #d1ecf1;
  border: 1px solid #bee5eb;
  border-radius: 6px;
}

.alert-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.alert-info p {
  margin: 0 0 0.5rem 0;
  color: #0c5460;
}

.alert-info p:last-child {
  margin-bottom: 0;
}

/* Mobile */

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .refresh-button {
    width: 100%;
  }

  .overall-status {
    flex-direction: column;
    text-align: center;
  }

  .status-grid {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
