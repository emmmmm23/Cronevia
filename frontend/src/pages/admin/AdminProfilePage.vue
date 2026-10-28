<template>
  <div class="admin-profile">
    <div class="page-header">
      <h1>My Profile</h1>
      <p class="subtitle">Manage your Super Admin profile</p>
    </div>

    <div class="profile-content">
      <div class="profile-card">
        <h2>Profile Information</h2><ProfilePortrait/>
        
        <div class="form-group">
          <label>Full Name</label>
          <input
            v-model="form.full_name"
            type="text"
            class="form-input"
            placeholder="Your full name"
          />
        </div>

        <div class="form-group">
          <label>Username</label>
          <input
            v-model="form.username"
            type="text"
            class="form-input"
            placeholder="username"
          />
        </div>

        <div class="form-group">
          <label>Email</label>
          <input
            :value="authStore.user?.email"
            type="email"
            class="form-input"
            disabled
          />
          <small>Email cannot be changed here. Use Security settings for email updates.</small>
        </div>

        <div class="form-group">
          <label>Bio</label>
          <textarea
            v-model="form.bio"
            class="form-textarea"
            rows="4"
            placeholder="Tell us about yourself..."
          ></textarea>
        </div>

        <div class="form-actions">
          <button @click="saveProfile" :disabled="saving" class="btn-primary">
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>

      <div class="profile-card">
        <h2>Preferences</h2>

        <div class="form-group">
          <label>Timezone</label>
          <select v-model="form.timezone" class="form-select">
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Asia/Manila">Manila</option>
          </select>
        </div>

        <div class="form-group">
          <label>Language</label>
          <select v-model="form.locale" class="form-select">
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </div>

        <div class="form-actions">
          <button @click="saveProfile" :disabled="saving" class="btn-primary">
            {{ saving ? 'Saving...' : 'Save Preferences' }}
          </button>
        </div>
      </div>

      <div class="profile-card">
        <h2>Role & Status</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Role</span>
            <span class="role-badge">👑 Super Admin</span>
          </div>
          <div class="info-item">
            <span class="info-label">Account Status</span>
            <span class="status-badge status-active">Active</span>
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
import ProfilePortrait from '@/components/ProfilePortrait.vue'
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const saving = ref(false)

const form = reactive({
  full_name: '',
  username: '',
  bio: '',
  timezone: 'UTC',
  locale: 'en',
})

const toast = reactive({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error',
})

async function saveProfile() {
  try {
    saving.value = true

    const result = await authStore.updateProfile(form)

    if (result.success) {
      showToast('Profile updated successfully', 'success')
    } else {
      showToast(result.error || 'Failed to update profile', 'error')
    }
  } catch (err: any) {
    showToast(err.message || 'Failed to update profile', 'error')
  } finally {
    saving.value = false
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

onMounted(() => {
  if (authStore.user?.profile) {
    form.full_name = authStore.user.profile.full_name || ''
    form.username = authStore.user.profile.username || ''
    form.bio = authStore.user.profile.bio || ''
    form.timezone = authStore.user.profile.timezone || 'UTC'
    form.locale = authStore.user.profile.locale || 'en'
  }
})
</script>

<style scoped>
.admin-profile {
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

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.profile-card {
  background: white;
  border: 1px solid #e5e5e0;
  border-radius: 8px;
  padding: 2rem;
}

.profile-card h2 {
  margin: 0 0 1.5rem 0;
  color: #2c2416;
  font-size: 1.25rem;
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

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e5e0;
  border-radius: 6px;
  font-size: 0.9375rem;
  transition: border-color 0.2s;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: #8b4513;
}

.form-input:disabled {
  background: #f5f5f0;
  cursor: not-allowed;
}

.form-textarea {
  resize: vertical;
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

.info-grid {
  display: grid;
  gap: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f5f5f0;
  border-radius: 6px;
}

.info-label {
  font-weight: 500;
  color: #6b6456;
}

.role-badge,
.status-badge {
  padding: 0.375rem 0.875rem;
  border-radius: 12px;
  font-size: 0.8125rem;
  font-weight: 600;
}

.role-badge {
  background: #fff3cd;
  color: #856404;
}

.status-active {
  background: #d4edda;
  color: #155724;
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
  .profile-card {
    padding: 1.5rem;
  }

  .toast {
    right: 1rem;
    left: 1rem;
  }
}
</style>
