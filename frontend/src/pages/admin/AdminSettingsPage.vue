<template>
  <div class="admin-settings">
    <div class="page-header">
      <h1>Settings</h1>
      <p class="subtitle">Manage platform configuration and features</p>
    </div>

    <!-- Settings Navigation -->
    <div class="settings-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['nav-tab', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading settings...</p>
    </div>

    <!-- Settings Content -->
    <div v-else class="settings-content">
      <!-- General Settings -->
      <div v-show="activeTab === 'general'" class="settings-section">
        <h2>General Settings</h2>
        <p class="section-description">Basic platform configuration</p>

        <div class="form-group">
          <label>Application Name</label>
          <input
            v-model="settings.application_name"
            type="text"
            class="form-input"
            placeholder="Cronevia"
          />
        </div>

        <div class="form-group">
          <label>Application Description</label>
          <textarea
            v-model="settings.application_description"
            class="form-textarea"
            rows="3"
            placeholder="Plan → Live → Remember"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Default Timezone</label>
            <select v-model="settings.default_timezone" class="form-select">
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Asia/Manila">Manila</option>
              <option value="Europe/London">London</option>
            </select>
          </div>

          <div class="form-group">
            <label>Default Language</label>
            <select v-model="settings.default_language" class="form-select">
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Date Format</label>
            <select v-model="settings.date_format" class="form-select">
              <option value="YYYY-MM-DD">2026-09-12</option>
              <option value="MM/DD/YYYY">09/12/2026</option>
              <option value="DD/MM/YYYY">12/09/2026</option>
              <option value="MMMM D, YYYY">September 12, 2026</option>
            </select>
          </div>

          <div class="form-group">
            <label>Time Format</label>
            <select v-model="settings.time_format" class="form-select">
              <option value="12h">12-hour</option>
              <option value="24h">24-hour</option>
            </select>
          </div>
        </div>

        <button @click="saveSettings" :disabled="saving" class="btn-primary">
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>

      <!-- Platform Settings -->
      <div v-show="activeTab === 'platform'" class="settings-section">
        <h2>Platform Settings</h2>
        <p class="section-description">Control platform access and behavior</p>

        <div class="form-group-toggle">
          <div class="toggle-header">
            <div>
              <strong>User Registration</strong>
              <p>Allow new users to create accounts</p>
            </div>
            <label class="toggle-switch">
              <input
                v-model="settings.registration_enabled"
                type="checkbox"
                @change="saveSettings"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="form-group-toggle">
          <div class="toggle-header">
            <div>
              <strong>Email Verification</strong>
              <p>Require email verification for new accounts</p>
            </div>
            <label class="toggle-switch">
              <input
                v-model="settings.email_verification_required"
                type="checkbox"
                @change="saveSettings"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="form-group-toggle danger">
          <div class="toggle-header">
            <div>
              <strong>Maintenance Mode</strong>
              <p>Restrict access to the platform (Super Admin can still access)</p>
            </div>
            <label class="toggle-switch">
              <input
                v-model="settings.maintenance_mode"
                type="checkbox"
                @change="saveSettings"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div v-if="settings.maintenance_mode" class="form-group">
          <label>Maintenance Message</label>
          <textarea
            v-model="settings.maintenance_message"
            class="form-textarea"
            rows="3"
            placeholder="We're currently improving your experience..."
          ></textarea>
          <button @click="saveSettings" :disabled="saving" class="btn-secondary">
            Update Message
          </button>
        </div>
      </div>

      <!-- Features -->
      <div v-show="activeTab === 'features'" class="settings-section">
        <h2>Feature Management</h2>
        <p class="section-description">Enable or disable Cronevia features</p>

        <div v-if="loadingFeatures" class="loading-state">
          <div class="spinner"></div>
          <p>Loading features...</p>
        </div>

        <div v-else class="features-list">
          <div
            v-for="feature in features"
            :key="feature.feature_key"
            class="form-group-toggle"
          >
            <div class="toggle-header">
              <div>
                <strong>{{ feature.feature_name }}</strong>
                <p>{{ feature.feature_description }}</p>
              </div>
              <label class="toggle-switch">
                <input
                  v-model="feature.enabled"
                  type="checkbox"
                  @change="toggleFeature(feature)"
                />
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Appearance -->
      <div v-show="activeTab === 'appearance'" class="settings-section">
        <h2>Appearance</h2>
        <p class="section-description">Platform theme and visual settings</p>

        <div class="form-group">
          <label>Default Theme</label>
          <select v-model="settings.default_theme" class="form-select">
            <option value="vintage">Vintage (Default)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div class="form-group-toggle">
          <div class="toggle-header">
            <div>
              <strong>Animations Enabled</strong>
              <p>Enable smooth transitions and animations</p>
            </div>
            <label class="toggle-switch">
              <input
                v-model="settings.animations_enabled"
                type="checkbox"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="form-group-toggle">
          <div class="toggle-header">
            <div>
              <strong>Vintage Effects</strong>
              <p>Enable vintage paper texture and film grain effects</p>
            </div>
            <label class="toggle-switch">
              <input
                v-model="settings.vintage_effects_enabled"
                type="checkbox"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <button @click="saveSettings" :disabled="saving" class="btn-primary">
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>

      <!-- Storage -->
      <div v-show="activeTab === 'storage'" class="settings-section">
        <h2>Storage Settings</h2>
        <p class="section-description">File upload and storage limits</p>

        <div class="form-group">
          <label>Max File Size (MB)</label>
          <input
            v-model.number="settings.max_file_size_mb"
            type="number"
            class="form-input"
            min="1"
            max="100"
          />
          <small>Maximum size for individual file uploads</small>
        </div>

        <div class="form-group">
          <label>Max Files Per Upload</label>
          <input
            v-model.number="settings.max_files_per_upload"
            type="number"
            class="form-input"
            min="1"
            max="50"
          />
          <small>Maximum number of files that can be uploaded at once</small>
        </div>

        <button @click="saveSettings" :disabled="saving" class="btn-primary">
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </div>

    <!-- Toast Notification -->
    <Transition name="slide-down">
      <div v-if="toast.show" :class="['toast', `toast-${toast.type}`]">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import {
  getSystemSettings,
  updateSystemSettings,
  getFeatureSettings,
  toggleFeature as toggleFeatureService,
} from '@/services/admin'
import type { Database } from '@/types/database.types'

type SystemSettings = Database['public']['Tables']['system_settings']['Row']
type FeatureSetting = Database['public']['Tables']['feature_settings']['Row']

const activeTab = ref('general')
const loading = ref(true)
const loadingFeatures = ref(false)
const saving = ref(false)

const tabs = [
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'platform', label: 'Platform', icon: '🌐' },
  { id: 'features', label: 'Features', icon: '🎯' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'storage', label: 'Storage', icon: '💾' },
]

const settings = reactive<Partial<SystemSettings>>({
  application_name: 'Cronevia',
  application_description: '',
  default_timezone: 'UTC',
  default_language: 'en',
  date_format: 'YYYY-MM-DD',
  time_format: '24h',
  registration_enabled: true,
  email_verification_required: false,
  maintenance_mode: false,
  maintenance_message: "We're currently improving your experience. Please check back soon.",
  default_theme: 'vintage',
  animations_enabled: true,
  vintage_effects_enabled: true,
  max_file_size_mb: 10,
  max_files_per_upload: 10,
})

const features = ref<FeatureSetting[]>([])

const toast = reactive({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error',
})

async function loadSettings() {
  try {
    loading.value = true

    const { settings: systemSettings, error } = await getSystemSettings()
    if (error) {
      showToast(error, 'error')
    } else if (systemSettings) {
      Object.assign(settings, systemSettings)
    }
  } catch (err: any) {
    console.error('Load settings error:', err)
    showToast(err.message || 'Failed to load settings', 'error')
  } finally {
    loading.value = false
  }
}

async function loadFeatures() {
  try {
    loadingFeatures.value = true

    const { features: featureList, error } = await getFeatureSettings()
    if (error) {
      showToast(error, 'error')
    } else {
      features.value = featureList
    }
  } catch (err: any) {
    console.error('Load features error:', err)
  } finally {
    loadingFeatures.value = false
  }
}

async function saveSettings() {
  try {
    saving.value = true

    const { success, error } = await updateSystemSettings(settings)
    if (success) {
      showToast('Settings saved successfully', 'success')
    } else {
      showToast(error || 'Failed to save settings', 'error')
    }
  } catch (err: any) {
    console.error('Save settings error:', err)
    showToast(err.message || 'Failed to save settings', 'error')
  } finally {
    saving.value = false
  }
}

async function toggleFeature(feature: FeatureSetting) {
  try {
    const { success, error } = await toggleFeatureService(
      feature.feature_key,
      feature.enabled ?? false
    )
    if (success) {
      showToast(`${feature.feature_name} ${feature.enabled ? 'enabled' : 'disabled'}`, 'success')
    } else {
      // Revert on error
      feature.enabled = !feature.enabled
      showToast(error || 'Failed to update feature', 'error')
    }
  } catch (err: any) {
    feature.enabled = !feature.enabled
    showToast(err.message || 'Failed to update feature', 'error')
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
  loadSettings()
  loadFeatures()
})
</script>

<style scoped>
.admin-settings {
  max-width: 1000px;
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

/* Settings Navigation */

.settings-nav {
  background: white;
  border: 1px solid #e5e5e0;
  border-radius: 8px;
  padding: 0.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.nav-tab {
  flex: 1;
  min-width: 120px;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  color: #6b6456;
  font-weight: 500;
}

.nav-tab:hover {
  background: #f5f5f0;
  color: #2c2416;
}

.nav-tab.active {
  background: #8b4513;
  color: white;
}

.tab-icon {
  font-size: 1.125rem;
}

.tab-label {
  font-size: 0.9375rem;
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

/* Settings Content */

.settings-content {
  background: white;
  border: 1px solid #e5e5e0;
  border-radius: 8px;
  padding: 2rem;
}

.settings-section h2 {
  margin: 0 0 0.5rem 0;
  color: #2c2416;
  font-size: 1.5rem;
}

.section-description {
  color: #6b6456;
  margin: 0 0 2rem 0;
}

/* Form Elements */

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

.form-textarea {
  resize: vertical;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

/* Toggle Switches */

.form-group-toggle {
  padding: 1.25rem;
  background: #f5f5f0;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.form-group-toggle.danger {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
}

.toggle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.toggle-header strong {
  display: block;
  color: #2c2416;
  margin-bottom: 0.25rem;
}

.toggle-header p {
  margin: 0;
  color: #6b6456;
  font-size: 0.875rem;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 28px;
}

.slider:before {
  position: absolute;
  content: '';
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #8b4513;
}

input:checked + .slider:before {
  transform: translateX(24px);
}

/* Features List */

.features-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Buttons */

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #8b4513;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #6d3410;
}

.btn-secondary {
  background: #e5e5e0;
  color: #2c2416;
  margin-top: 0.75rem;
}

.btn-secondary:hover:not(:disabled) {
  background: #d0d0c8;
}

.btn-primary:disabled,
.btn-secondary:disabled {
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
  .settings-nav {
    flex-direction: column;
  }

  .nav-tab {
    min-width: 100%;
  }

  .settings-content {
    padding: 1.5rem;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .toggle-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .toast {
    right: 1rem;
    left: 1rem;
  }
}
</style>
