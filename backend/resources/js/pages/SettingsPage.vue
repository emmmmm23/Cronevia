<script setup lang="ts">
/**
 * SettingsPage — Account management, password change, email change, and data management.
 * Organized into clear sections with forms and confirmation dialogs.
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'

const auth = useAuthStore()
const router = useRouter()

const user = computed(() => auth.user)

// Active section
const activeSection = ref<'account' | 'password' | 'privacy' | 'data'>('account')

// Password change
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isChangingPassword = ref(false)
const passwordError = ref('')
const passwordSuccess = ref('')

// Email change
const newEmail = ref('')
const emailPassword = ref('')
const isChangingEmail = ref(false)
const emailError = ref('')
const emailSuccess = ref('')
const showEmailForm = ref(false)

// Account deletion
const showDeleteConfirm = ref(false)
const deletePassword = ref('')
const deleteConfirmation = ref('')
const isDeletingAccount = ref(false)
const deleteError = ref('')

async function changePassword() {
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    passwordError.value = 'All password fields are required.'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'New passwords do not match.'
    return
  }

  if (newPassword.value.length < 8) {
    passwordError.value = 'Password must be at least 8 characters.'
    return
  }

  passwordError.value = ''
  passwordSuccess.value = ''
  isChangingPassword.value = true

  try {
    await axios.patch('/api/v1/auth/password', {
      current_password: currentPassword.value,
      new_password: newPassword.value,
      new_password_confirmation: confirmPassword.value,
    })

    passwordSuccess.value = 'Password changed successfully!'
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err: any) {
    console.error('Password change error:', err)
    passwordError.value = err.response?.data?.message || 'Failed to change password.'
  } finally {
    isChangingPassword.value = false
  }
}

async function changeEmail() {
  if (!newEmail.value || !emailPassword.value) {
    emailError.value = 'Email and password are required.'
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(newEmail.value)) {
    emailError.value = 'Please enter a valid email address.'
    return
  }

  emailError.value = ''
  emailSuccess.value = ''
  isChangingEmail.value = true

  try {
    await axios.patch('/api/v1/auth/email', {
      email: newEmail.value,
      password: emailPassword.value,
    })

    emailSuccess.value = 'Email changed successfully!'
    await auth.fetchCurrentUser()
    showEmailForm.value = false
    newEmail.value = ''
    emailPassword.value = ''
  } catch (err: any) {
    console.error('Email change error:', err)
    emailError.value = err.response?.data?.message || 'Failed to change email.'
  } finally {
    isChangingEmail.value = false
  }
}

function cancelEmailChange() {
  showEmailForm.value = false
  newEmail.value = ''
  emailPassword.value = ''
  emailError.value = ''
  emailSuccess.value = ''
}

function openDeleteConfirm() {
  showDeleteConfirm.value = true
  deletePassword.value = ''
  deleteConfirmation.value = ''
  deleteError.value = ''
}

function cancelDelete() {
  showDeleteConfirm.value = false
  deletePassword.value = ''
  deleteConfirmation.value = ''
  deleteError.value = ''
}

async function deleteAccount() {
  if (!deletePassword.value || !deleteConfirmation.value) {
    deleteError.value = 'Please fill in all fields.'
    return
  }

  if (deleteConfirmation.value !== 'DELETE') {
    deleteError.value = 'Please type DELETE exactly to confirm.'
    return
  }

  deleteError.value = ''
  isDeletingAccount.value = true

  try {
    await axios.delete('/api/v1/auth/account', {
      data: {
        password: deletePassword.value,
        confirmation: deleteConfirmation.value,
      },
    })

    // Account deleted successfully - redirect to landing page
    auth.user = null
    auth.isAuthenticated = false
    router.push({ name: 'landing' })
  } catch (err: any) {
    console.error('Account deletion error:', err)
    deleteError.value = err.response?.data?.message || 'Failed to delete account.'
    isDeletingAccount.value = false
  }
}

// Export data (placeholder - will implement in Task #10)
async function exportData() {
  alert('Export data feature coming soon!')
}

onMounted(() => {
  auth.fetchCurrentUser().catch(() => {})
})
</script>

<template>
  <div class="min-h-screen bg-[#f5ebdd]">

    <!-- Header -->
    <div class="bg-[#fdfaf5] border-b border-[#e5d4bb]">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <p class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-1">Account</p>
        <h1 class="text-3xl font-bold text-[#2b1a10]" style="font-family:'Playfair Display',Georgia,serif;">Settings</h1>
        <p class="mt-1 text-sm text-[#6b4423]">Manage your account preferences and security.</p>
      </div>
    </div>

    <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8">

      <!-- Section Navigation -->
      <nav class="flex flex-wrap gap-2 mb-8" role="group" aria-label="Settings sections">
        <button
          type="button"
          :class="['px-4 py-2 text-sm font-semibold rounded border transition-colors',
            activeSection === 'account'
              ? 'bg-[#7B0323] text-[#fdfaf5] border-[#5a0019]'
              : 'bg-[#fdfaf5] text-[#6b4423] border-[#d7c7b3] hover:border-[#7B0323] hover:text-[#7B0323]']"
          @click="activeSection = 'account'"
        >
          Account
        </button>
        <button
          type="button"
          :class="['px-4 py-2 text-sm font-semibold rounded border transition-colors',
            activeSection === 'password'
              ? 'bg-[#7B0323] text-[#fdfaf5] border-[#5a0019]'
              : 'bg-[#fdfaf5] text-[#6b4423] border-[#d7c7b3] hover:border-[#7B0323] hover:text-[#7B0323]']"
          @click="activeSection = 'password'"
        >
          Password
        </button>
        <button
          type="button"
          :class="['px-4 py-2 text-sm font-semibold rounded border transition-colors',
            activeSection === 'data'
              ? 'bg-[#7B0323] text-[#fdfaf5] border-[#5a0019]'
              : 'bg-[#fdfaf5] text-[#6b4423] border-[#d7c7b3] hover:border-[#7B0323] hover:text-[#7B0323]']"
          @click="activeSection = 'data'"
        >
          Data
        </button>
      </nav>

      <!-- Account Section -->
      <section v-if="activeSection === 'account'" class="space-y-6">
        <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm p-6">
          <h2 class="text-lg font-bold text-[#2b1a10] mb-4" style="font-family:'Playfair Display',serif;">
            Account Information
          </h2>

          <!-- Current Email Display -->
          <div class="mb-6">
            <label class="block text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-2">
              Email Address
            </label>
            <div class="flex items-center justify-between">
              <p class="text-sm text-[#2b1a10]">{{ user?.email }}</p>
              <button
                v-if="!showEmailForm"
                type="button"
                @click="showEmailForm = true"
                class="text-sm text-[#7B0323] hover:text-[#5a0019] font-semibold transition-colors"
              >
                Change Email
              </button>
            </div>
          </div>

          <!-- Email Change Form -->
          <div v-if="showEmailForm" class="border-t border-[#e5d4bb] pt-6">
            <h3 class="text-sm font-bold text-[#2b1a10] mb-4">Change Email Address</h3>
            
            <!-- Success message -->
            <div v-if="emailSuccess" class="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
              {{ emailSuccess }}
            </div>

            <!-- Error message -->
            <div v-if="emailError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {{ emailError }}
            </div>

            <div class="space-y-4">
              <div>
                <label for="new-email" class="block text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-2">
                  New Email Address
                </label>
                <input
                  id="new-email"
                  v-model="newEmail"
                  type="email"
                  required
                  class="w-full px-4 py-2 text-sm text-[#2b1a10] bg-[#fdfaf5] border border-[#d7c7b3] rounded focus:outline-none focus:ring-2 focus:ring-[#7B0323] focus:border-transparent"
                  placeholder="your.new@email.com"
                />
              </div>

              <div>
                <label for="email-password" class="block text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-2">
                  Confirm Password
                </label>
                <input
                  id="email-password"
                  v-model="emailPassword"
                  type="password"
                  required
                  class="w-full px-4 py-2 text-sm text-[#2b1a10] bg-[#fdfaf5] border border-[#d7c7b3] rounded focus:outline-none focus:ring-2 focus:ring-[#7B0323] focus:border-transparent"
                  placeholder="Enter your current password"
                />
              </div>

              <div class="flex gap-2">
                <button
                  type="button"
                  @click="changeEmail"
                  :disabled="isChangingEmail"
                  class="px-4 py-2 bg-[#7B0323] text-[#fdfaf5] text-sm font-semibold rounded hover:bg-[#5a0019] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {{ isChangingEmail ? 'Changing...' : 'Change Email' }}
                </button>
                <button
                  type="button"
                  @click="cancelEmailChange"
                  :disabled="isChangingEmail"
                  class="px-4 py-2 bg-[#e5d4bb] text-[#6b4423] text-sm font-semibold rounded hover:bg-[#d7c7b3] disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          <!-- Account Details -->
          <div class="space-y-4 pt-6 border-t border-[#e5d4bb]">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-2">
                Account Name
              </label>
              <p class="text-sm text-[#2b1a10]">{{ user?.name }}</p>
              <p class="text-xs text-[#a68e73] mt-1">You can change your display name from your Profile page.</p>
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-2">
                Account Status
              </label>
              <p class="text-sm text-[#2b1a10] capitalize">{{ user?.status || 'Active' }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Password Section -->
      <section v-if="activeSection === 'password'" class="space-y-6">
        <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm p-6">
          <h2 class="text-lg font-bold text-[#2b1a10] mb-4" style="font-family:'Playfair Display',serif;">
            Change Password
          </h2>

          <!-- Success message -->
          <div v-if="passwordSuccess" class="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            {{ passwordSuccess }}
          </div>

          <!-- Error message -->
          <div v-if="passwordError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            {{ passwordError }}
          </div>

          <form @submit.prevent="changePassword" class="space-y-4">
            <div>
              <label for="current-password" class="block text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-2">
                Current Password
              </label>
              <input
                id="current-password"
                v-model="currentPassword"
                type="password"
                required
                class="w-full px-4 py-2 text-sm text-[#2b1a10] bg-[#fdfaf5] border border-[#d7c7b3] rounded focus:outline-none focus:ring-2 focus:ring-[#7B0323] focus:border-transparent"
                placeholder="Enter your current password"
              />
            </div>

            <div>
              <label for="new-password" class="block text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-2">
                New Password
              </label>
              <input
                id="new-password"
                v-model="newPassword"
                type="password"
                required
                minlength="8"
                class="w-full px-4 py-2 text-sm text-[#2b1a10] bg-[#fdfaf5] border border-[#d7c7b3] rounded focus:outline-none focus:ring-2 focus:ring-[#7B0323] focus:border-transparent"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label for="confirm-password" class="block text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-2">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                v-model="confirmPassword"
                type="password"
                required
                minlength="8"
                class="w-full px-4 py-2 text-sm text-[#2b1a10] bg-[#fdfaf5] border border-[#d7c7b3] rounded focus:outline-none focus:ring-2 focus:ring-[#7B0323] focus:border-transparent"
                placeholder="Re-enter new password"
              />
            </div>

            <button
              type="submit"
              :disabled="isChangingPassword"
              class="w-full px-4 py-3 bg-[#7B0323] text-[#fdfaf5] text-sm font-semibold rounded hover:bg-[#5a0019] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ isChangingPassword ? 'Changing Password...' : 'Change Password' }}
            </button>
          </form>

          <p class="mt-4 text-xs text-[#a68e73]">
            Choose a strong password with at least 8 characters, including letters, numbers, and symbols.
          </p>
        </div>
      </section>

      <!-- Data Management Section -->
      <section v-if="activeSection === 'data'" class="space-y-6">
        <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm p-6">
          <h2 class="text-lg font-bold text-[#2b1a10] mb-4" style="font-family:'Playfair Display',serif;">
            Data Management
          </h2>

          <div class="space-y-4">
            <!-- Export Data -->
            <div class="pb-4 border-b border-[#e5d4bb]">
              <h3 class="text-sm font-bold text-[#2b1a10] mb-2">Export Your Data</h3>
              <p class="text-sm text-[#6b4423] mb-3">
                Download all your journal entries, trips, memories, and photos.
              </p>
              <button
                type="button"
                @click="exportData"
                class="px-4 py-2 bg-[#7B0323] text-[#fdfaf5] text-sm font-semibold rounded hover:bg-[#5a0019] transition-colors"
              >
                Export Data
              </button>
            </div>

            <!-- Delete Account -->
            <div class="pt-4">
              <h3 class="text-sm font-bold text-[#7B0323] mb-2">Delete Account</h3>
              <p class="text-sm text-[#6b4423] mb-3">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button
                v-if="!showDeleteConfirm"
                type="button"
                @click="openDeleteConfirm"
                class="px-4 py-2 bg-[#7B0323] text-[#fdfaf5] text-sm font-semibold rounded hover:bg-[#5a0019] transition-colors"
              >
                Delete Account
              </button>

              <!-- Delete Confirmation -->
              <div v-if="showDeleteConfirm" class="mt-4 p-4 bg-red-50 border border-red-200 rounded">
                <h4 class="text-sm font-bold text-red-900 mb-2">⚠️ Confirm Account Deletion</h4>
                <p class="text-sm text-red-800 mb-4">
                  This will permanently delete your account, all journal entries, trips, memories, photos, and other data. This action cannot be undone.
                </p>

                <!-- Error message -->
                <div v-if="deleteError" class="mb-4 p-3 bg-red-100 border border-red-300 rounded text-sm text-red-900">
                  {{ deleteError }}
                </div>

                <form @submit.prevent="deleteAccount" class="space-y-3">
                  <div>
                    <label for="delete-confirmation" class="block text-sm font-semibold text-red-800 mb-2">
                      Type DELETE to confirm:
                    </label>
                    <input
                      id="delete-confirmation"
                      v-model="deleteConfirmation"
                      type="text"
                      required
                      placeholder="Type DELETE"
                      class="w-full px-4 py-2 text-sm text-[#2b1a10] bg-white border border-red-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label for="delete-password" class="block text-sm font-semibold text-red-800 mb-2">
                      Enter your password:
                    </label>
                    <input
                      id="delete-password"
                      v-model="deletePassword"
                      type="password"
                      required
                      placeholder="Enter your password"
                      class="w-full px-4 py-2 text-sm text-[#2b1a10] bg-white border border-red-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div class="flex gap-2">
                    <button
                      type="submit"
                      :disabled="isDeletingAccount"
                      class="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {{ isDeletingAccount ? 'Deleting...' : 'Permanently Delete Account' }}
                    </button>
                    <button
                      type="button"
                      @click="cancelDelete"
                      :disabled="isDeletingAccount"
                      class="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-semibold rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        <!-- Storage Info -->
        <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm p-6">
          <h2 class="text-lg font-bold text-[#2b1a10] mb-4" style="font-family:'Playfair Display',serif;">
            Storage Information
          </h2>
          <div class="space-y-2">
            <div class="flex justify-between items-center text-sm">
              <span class="text-[#6b4423]">Journal Entries:</span>
              <span class="font-semibold text-[#2b1a10]">{{ user?.stats?.journal_entries || 0 }}</span>
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-[#6b4423]">Trips:</span>
              <span class="font-semibold text-[#2b1a10]">{{ user?.stats?.trips || 0 }}</span>
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-[#6b4423]">Memories:</span>
              <span class="font-semibold text-[#2b1a10]">{{ user?.stats?.memories || 0 }}</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>
