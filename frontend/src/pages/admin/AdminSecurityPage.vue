<template>
  <div class="admin-security">
    <div class="page-header">
      <h1>Security</h1>
      <p class="subtitle">Manage your account security settings</p>
    </div>

    <div class="security-content">
      <!-- Change Password -->
      <div class="security-card">
        <h2>Change Password</h2>
        <p class="card-description">Update your password to keep your account secure</p>

        <div class="form-group">
          <label>New Password</label>
          <input
            v-model="passwordForm.newPassword"
            type="password"
            class="form-input"
            placeholder="Enter new password"
          />
          <small>Minimum 8 characters, include uppercase, lowercase, and numbers</small>
        </div>

        <div class="form-group">
          <label>Confirm Password</label>
          <input
            v-model="passwordForm.confirmPassword"
            type="password"
            class="form-input"
            placeholder="Confirm new password"
          />
        </div>

        <div class="form-actions">
          <button @click="changePassword" :disabled="savingPassword" class="btn-primary">
            {{ savingPassword ? 'Updating...' : 'Update Password' }}
          </button>
        </div>
      </div>

      <!-- Security Recommendations -->
      <div class="security-card">
        <h2>Security Recommendations</h2>
        <div class="recommendation-list">
          <div class="recommendation-item">
            <span class="rec-icon">✅</span>
            <div>
              <strong>Use a strong password</strong>
              <p>Include uppercase, lowercase, numbers, and special characters</p>
            </div>
          </div>
          <div class="recommendation-item">
            <span class="rec-icon">✅</span>
            <div>
              <strong>Keep your account secure</strong>
              <p>Never share your Super Admin credentials with anyone</p>
            </div>
          </div>
          <div class="recommendation-item">
            <span class="rec-icon">✅</span>
            <div>
              <strong>Monitor activity logs</strong>
              <p>Regularly review admin activity logs for suspicious behavior</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Account Info -->
      <div class="security-card">
        <h2>Account Information</h2>
        <div class="info-list">
          <div class="info-row">
            <span class="info-label">Email</span>
            <span class="info-value">{{ authStore.user?.email }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Role</span>
            <span class="info-value">👑 Super Admin</span>
          </div>
          <div class="info-row">
            <span class="info-label">Account Status</span>
            <span class="info-value">Active</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <Transition name="slide-down">
      <div v-if="toast.show" :class="['toast', `toast-${toast.type}`]">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const savingPassword = ref(false)

const passwordForm = reactive({
  newPassword: '',
  confirmPassword: '',
})

const toast = reactive({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error',
})

async function changePassword() {
  // Validation
  if (!passwordForm.newPassword) {
    showToast('Please enter a new password', 'error')
    return
  }

  if (passwordForm.newPassword.length < 8) {
    showToast('Password must be at least 8 characters', 'error')
    return
  }

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    showToast('Passwords do not match', 'error')
    return
  }

  try {
    savingPassword.value = true

    const result = await authStore.changePassword(passwordForm.newPassword)

    if (result.success) {
      showToast('Password updated successfully', 'success')
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
    } else {
      showToast(result.error || 'Failed to update password', 'error')
    }
  } catch (err: any) {
    showToast(err.message || 'Failed to update password', 'error')
  } finally {
    savingPassword.value = false
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
</script>

<style scoped>
.admin-security {
  max-width: 800px;
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

.security-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.security-card {
  background: white;
  border: 1px solid #e5e5e0;
  border-radius: 8px;
  padding: 2rem;
}

.security-card h2 {
  margin: 0 0 0.5rem 0;
  color: #2c2416;
  font-size: 1.25rem;
}

.card-description {
  color: #6b6456;
  margin: 0 0 1.5rem 0;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  color: #2c2416;
  margin-bottom: 0.5rem;
}

.form-group small {
  display: block;
  color: #6b6456;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e5e0;
  border-radius: 6px;
  font-size: 0.9375rem;
  transition: border-color 0.2s;
  font-family: inherit;
}

.form-input:focus {
  outline: none;
  border-color: #8b4513;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-primary {
  background: #8b4513;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #6d3410;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.recommendation-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.recommendation-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #f5f5f0;
  border-radius: 6px;
}

.rec-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.recommendation-item strong {
  display: block;
  color: #2c2416;
  margin-bottom: 0.25rem;
}

.recommendation-item p {
  margin: 0;
  color: #6b6456;
  font-size: 0.875rem;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  background: #f5f5f0;
  border-radius: 6px;
}

.info-label {
  font-weight: 500;
  color: #6b6456;
}

.info-value {
  color: #2c2416;
  font-weight: 500;
}

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

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-1rem);
}

@media (max-width: 768px) {
  .security-card {
    padding: 1.5rem;
  }

  .toast {
    right: 1rem;
    left: 1rem;
  }
}
</style>
