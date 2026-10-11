<template>
  <div class="user-detail">
    <div class="breadcrumb">
      <router-link to="/admin/users">← Back to Users</router-link>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading user details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <router-link to="/admin/users" class="back-button">Back to Users</router-link>
    </div>

    <!-- User Details -->
    <div v-else-if="user" class="user-content">
      <div class="user-header">
        <div class="user-avatar-large">
          <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.full_name" />
          <span v-else class="avatar-placeholder">
            {{ getInitials(user.full_name) }}
          </span>
        </div>
        <div class="user-title">
          <h1>{{ user.full_name }}</h1>
          <p>@{{ user.username || 'no-username' }}</p>
        </div>
        <div class="user-status-badges">
          <span :class="['status-badge', `status-${user.account_status}`]">
            {{ user.account_status }}
          </span>
          <span :class="['role-badge', `role-${user.role}`]">
            {{ user.role === 'super_admin' ? '👑 Super Admin' : 'User' }}
          </span>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-card">
          <h3>Contact Information</h3>
          <div class="info-row">
            <span class="info-label">Email</span>
            <span class="info-value">{{ user.email || 'N/A' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Username</span>
            <span class="info-value">@{{ user.username || 'Not set' }}</span>
          </div>
        </div>

        <div class="info-card">
          <h3>Account Details</h3>
          <div class="info-row">
            <span class="info-label">User ID</span>
            <span class="info-value mono">{{ user.user_id }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Joined</span>
            <span class="info-value">{{ formatDate(user.created_at) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Last Updated</span>
            <span class="info-value">{{ formatDate(user.updated_at) }}</span>
          </div>
          <div v-if="user.last_login" class="info-row">
            <span class="info-label">Last Login</span>
            <span class="info-value">{{ formatDate(user.last_login) }}</span>
          </div>
        </div>

        <div class="info-card">
          <h3>Statistics</h3>
          <div class="info-row">
            <span class="info-label">Journal Entries</span>
            <span class="info-value">{{ user.total_journal_entries || 0 }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Trips</span>
            <span class="info-value">{{ user.total_trips || 0 }}</span>
          </div>
        </div>

        <div class="info-card">
          <h3>Preferences</h3>
          <div class="info-row">
            <span class="info-label">Timezone</span>
            <span class="info-value">{{ user.timezone || 'UTC' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Locale</span>
            <span class="info-value">{{ user.locale || 'en' }}</span>
          </div>
        </div>
      </div>

      <div v-if="user.bio" class="bio-section">
        <h3>Bio</h3>
        <p>{{ user.bio }}</p>
      </div>

      <div v-if="user.role !== 'super_admin'" class="actions-section">
        <h3>Account Actions</h3>
        <div class="action-buttons">
          <button
            v-if="user.account_status === 'active'"
            @click="handleSuspend"
            class="btn btn-warning"
          >
            ⛔ Suspend Account
          </button>
          <button
            v-if="user.account_status === 'suspended'"
            @click="handleReactivate"
            class="btn btn-success"
          >
            ✅ Reactivate Account
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getUserDetails, suspendUser, reactivateUser, type UserWithDetails } from '@/services/admin'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const user = ref<UserWithDetails | null>(null)

async function loadUserDetails() {
  try {
    loading.value = true
    error.value = ''

    const userId = route.params.id as string
    const result = await getUserDetails(userId)

    if (result.error) {
      error.value = result.error
    } else {
      user.value = result.user
    }
  } catch (err: any) {
    console.error('Load user error:', err)
    error.value = err.message || 'Failed to load user details'
  } finally {
    loading.value = false
  }
}

async function handleSuspend() {
  if (!user.value || !confirm(`Suspend ${user.value.full_name}?`)) return

  const result = await suspendUser(user.value.user_id)
  if (result.success) {
    router.push('/admin/users')
  }
}

async function handleReactivate() {
  if (!user.value || !confirm(`Reactivate ${user.value.full_name}?`)) return

  const result = await reactivateUser(user.value.user_id)
  if (result.success) {
    await loadUserDetails()
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  loadUserDetails()
})
</script>

<style scoped>
.user-detail {
  max-width: 1000px;
}

.breadcrumb {
  margin-bottom: 1.5rem;
}

.breadcrumb a {
  color: #8b4513;
  text-decoration: none;
  font-weight: 500;
}

.breadcrumb a:hover {
  text-decoration: underline;
}

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

.user-header {
  background: white;
  border: 1px solid #e5e5e0;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.user-avatar-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  background: #8b4513;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-avatar-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  color: white;
  font-weight: 600;
  font-size: 1.5rem;
}

.user-title {
  flex: 1;
  min-width: 200px;
}

.user-title h1 {
  margin: 0 0 0.25rem 0;
  color: #2c2416;
  font-size: 1.75rem;
}

.user-title p {
  margin: 0;
  color: #6b6456;
}

.user-status-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status-badge,
.role-badge {
  padding: 0.375rem 0.875rem;
  border-radius: 12px;
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: capitalize;
}

.status-active {
  background: #d4edda;
  color: #155724;
}

.status-suspended {
  background: #f8d7da;
  color: #721c24;
}

.role-user {
  background: #e5e5e0;
  color: #2c2416;
}

.role-super_admin {
  background: #fff3cd;
  color: #856404;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.info-card {
  background: white;
  border: 1px solid #e5e5e0;
  border-radius: 8px;
  padding: 1.5rem;
}

.info-card h3 {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  color: #2c2416;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f5f5f0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 500;
  color: #6b6456;
}

.info-value {
  color: #2c2416;
  text-align: right;
}

.info-value.mono {
  font-family: monospace;
  font-size: 0.875rem;
}

.bio-section {
  background: white;
  border: 1px solid #e5e5e0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.bio-section h3 {
  margin: 0 0 1rem 0;
  color: #2c2416;
}

.bio-section p {
  margin: 0;
  color: #6b6456;
  line-height: 1.6;
}

.actions-section {
  background: white;
  border: 1px solid #e5e5e0;
  border-radius: 8px;
  padding: 1.5rem;
}

.actions-section h3 {
  margin: 0 0 1rem 0;
  color: #2c2416;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-warning {
  background: #f8d7da;
  color: #721c24;
}

.btn-warning:hover {
  background: #f5c6cb;
}

.btn-success {
  background: #d4edda;
  color: #155724;
}

.btn-success:hover {
  background: #c3e6cb;
}

@media (max-width: 768px) {
  .user-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
