<template>
  <div class="admin-users">
    <div class="page-header">
      <h1>User Management</h1>
      <p class="subtitle">Manage Cronevia users and their accounts</p>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="filters.search"
          type="text"
          placeholder="Search by name or username..."
          @input="debouncedSearch"
          class="search-input"
        />
      </div>

      <div class="filter-controls">
        <select v-model="filters.status" @change="loadUsers" class="filter-select">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>

        <select v-model="filters.role" @change="loadUsers" class="filter-select">
          <option value="all">All Roles</option>
          <option value="user">User</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading users...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button @click="loadUsers" class="retry-button">Retry</button>
    </div>

    <!-- Users Table -->
    <div v-else class="users-section">
      <div class="section-header">
        <div class="results-info">
          Showing {{ users.length }} of {{ totalUsers }} users
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="users.length === 0" class="empty-state">
        <span class="empty-icon">👥</span>
        <p>No users found</p>
        <p class="empty-hint">Try adjusting your filters</p>
      </div>

      <!-- Users List -->
      <div v-else class="users-table">
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Status</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>
                  <div class="user-cell">
                    <UserAvatar :profile="user" :size="40"/>
                    <div class="user-info">
                      <div class="user-name">{{ user.full_name }}</div>
                      <div class="user-username">@{{ user.username || 'no-username' }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="user-email">{{ user.email || 'N/A' }}</span>
                </td>
                <td>
                  <span :class="['status-badge', `status-${user.account_status}`]">
                    {{ user.account_status }}
                  </span>
                </td>
                <td>
                  <span :class="['role-badge', `role-${user.role}`]">
                    {{ user.role === 'super_admin' ? '👑 Super Admin' : 'User' }}
                  </span>
                </td>
                <td>
                  <span class="date-text">{{ formatDate(user.created_at) }}</span>
                </td>
                <td>
                  <div class="action-buttons">
                    <router-link
                      :to="`/admin/users/${user.user_id}`"
                      class="action-btn view-btn"
                      title="View Details"
                    >
                      👁️
                    </router-link>
                    <button
                      v-if="user.role !== 'super_admin' && user.account_status === 'active'"
                      @click="handleSuspend(user)"
                      class="action-btn suspend-btn"
                      title="Suspend User"
                    >
                      ⛔
                    </button>
                    <button
                      v-if="user.account_status === 'suspended'"
                      @click="handleReactivate(user)"
                      class="action-btn activate-btn"
                      title="Reactivate User"
                    >
                      ✅
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
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
        <span class="page-info">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <button
          @click="changePage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="page-button"
        >
          Next →
        </button>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showConfirmModal" class="modal-overlay" @click="showConfirmModal = false">
        <div class="modal-content" @click.stop>
          <h3>{{ confirmAction === 'suspend' ? 'Suspend User' : 'Reactivate User' }}</h3>
          <p v-if="confirmAction === 'suspend'">
            Are you sure you want to suspend <strong>{{ selectedUser?.full_name }}</strong>?
            They will not be able to access their account.
          </p>
          <p v-else>
            Are you sure you want to reactivate <strong>{{ selectedUser?.full_name }}</strong>?
            They will regain access to their account.
          </p>
          <div class="modal-actions">
            <button @click="showConfirmModal = false" class="btn-cancel">
              Cancel
            </button>
            <button @click="confirmActionHandler" class="btn-confirm" :disabled="actionLoading">
              {{ actionLoading ? 'Processing...' : 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast Notification -->
    <Transition name="slide-down">
      <div v-if="toast.show" :class="['toast', `toast-${toast.type}`]">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import UserAvatar from '@/components/shared/UserAvatar.vue'
import { ref, reactive, onMounted } from 'vue'
import { getUsers, suspendUser, reactivateUser, type UserWithDetails } from '@/services/admin'

const loading = ref(true)
const error = ref('')
const users = ref<UserWithDetails[]>([])
const totalUsers = ref(0)
const currentPage = ref(1)
const totalPages = ref(1)

const filters = reactive({
  search: '',
  status: 'all' as 'all' | 'active' | 'suspended' | 'inactive',
  role: 'all' as 'all' | 'user' | 'super_admin',
})

const showConfirmModal = ref(false)
const confirmAction = ref<'suspend' | 'reactivate'>('suspend')
const selectedUser = ref<UserWithDetails | null>(null)
const actionLoading = ref(false)

const toast = reactive({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error',
})

let searchTimeout: NodeJS.Timeout

async function loadUsers() {
  try {
    loading.value = true
    error.value = ''

    const result = await getUsers({
      search: filters.search,
      status: filters.status,
      role: filters.role,
      page: currentPage.value,
      perPage: 20,
    })

    if (result.error) {
      error.value = result.error
    } else {
      users.value = result.users
      totalUsers.value = result.total
      totalPages.value = result.totalPages || 1
    }
  } catch (err: any) {
    console.error('Load users error:', err)
    error.value = err.message || 'Failed to load users'
  } finally {
    loading.value = false
  }
}

function debouncedSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadUsers()
  }, 500)
}

function changePage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    loadUsers()
  }
}

function handleSuspend(user: UserWithDetails) {
  selectedUser.value = user
  confirmAction.value = 'suspend'
  showConfirmModal.value = true
}

function handleReactivate(user: UserWithDetails) {
  selectedUser.value = user
  confirmAction.value = 'reactivate'
  showConfirmModal.value = true
}

async function confirmActionHandler() {
  if (!selectedUser.value) return

  try {
    actionLoading.value = true

    const result =
      confirmAction.value === 'suspend'
        ? await suspendUser(selectedUser.value.user_id)
        : await reactivateUser(selectedUser.value.user_id)

    if (result.success) {
      showToast(
        `User ${confirmAction.value === 'suspend' ? 'suspended' : 'reactivated'} successfully`,
        'success'
      )
      showConfirmModal.value = false
      await loadUsers()
    } else {
      showToast(result.error || 'Action failed', 'error')
    }
  } catch (err: any) {
    showToast(err.message || 'Action failed', 'error')
  } finally {
    actionLoading.value = false
  }
}

function showToast(message: string, type: 'success' | 'error') {
  toast.message = message
  toast.type = type
  toast.show = true
  setTimeout(() => {
    toast.show = false
  }, 3000)
}


function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.admin-users {
  max-width: 1400px;
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
}

.search-box {
  flex: 1;
  min-width: 250px;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 1rem;
  font-size: 1.125rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 3rem;
  border: 1px solid #e5e5e0;
  border-radius: 6px;
  font-size: 0.9375rem;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #8b4513;
}

.filter-controls {
  display: flex;
  gap: 0.75rem;
}

.filter-select {
  padding: 0.75rem 1rem;
  border: 1px solid #e5e5e0;
  border-radius: 6px;
  background: white;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: border-color 0.2s;
}

.filter-select:focus {
  outline: none;
  border-color: #8b4513;
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

/* Users Section */

.users-section {
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

/* Table */

.table-responsive {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #f5f5f0;
}

th {
  padding: 1rem 1.5rem;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 600;
  color: #2c2416;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

td {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e5e0;
}

/* User Cell */

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-info {
  min-width: 0;
}

.user-name {
  font-weight: 500;
  color: #2c2416;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-username {
  font-size: 0.875rem;
  color: #6b6456;
}

.user-email {
  color: #6b6456;
}

/* Badges */

.status-badge,
.role-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
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

.status-inactive {
  background: #e2e3e5;
  color: #383d41;
}

.role-user {
  background: #e5e5e0;
  color: #2c2416;
}

.role-super_admin {
  background: #fff3cd;
  color: #856404;
}

.date-text {
  color: #6b6456;
  font-size: 0.875rem;
}

/* Action Buttons */

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.view-btn {
  background: #e5e5e0;
}

.view-btn:hover {
  background: #d0d0c8;
}

.suspend-btn {
  background: #f8d7da;
}

.suspend-btn:hover {
  background: #f5c6cb;
}

.activate-btn {
  background: #d4edda;
}

.activate-btn:hover {
  background: #c3e6cb;
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

/* Modal */

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 500px;
  width: 100%;
}

.modal-content h3 {
  margin: 0 0 1rem 0;
  color: #2c2416;
}

.modal-content p {
  color: #6b6456;
  margin: 0 0 1.5rem 0;
  line-height: 1.6;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-cancel,
.btn-confirm {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #e5e5e0;
  color: #2c2416;
}

.btn-cancel:hover {
  background: #d0d0c8;
}

.btn-confirm {
  background: #8b4513;
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: #6d3410;
}

.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Toast */

.toast {
  position: fixed;
  top: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 2000;
}

.toast-success {
  background: #d4edda;
  color: #155724;
}

.toast-error {
  background: #f8d7da;
  color: #721c24;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-1rem);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-1rem);
}

/* Mobile */

@media (max-width: 768px) {
  .filters-section {
    flex-direction: column;
  }

  .search-box {
    min-width: 100%;
  }

  .filter-controls {
    flex-direction: column;
  }

  .filter-select {
    width: 100%;
  }

  table {
    font-size: 0.875rem;
  }

  th,
  td {
    padding: 0.75rem 1rem;
  }

  .user-cell {
    gap: 0.5rem;
  }

  .action-buttons {
    flex-direction: column;
    gap: 0.25rem;
  }

  .toast {
    right: 1rem;
    left: 1rem;
  }
}
</style>
