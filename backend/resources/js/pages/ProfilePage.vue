<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'

const auth   = useAuthStore()
const router = useRouter()

const user = computed(() => auth.user)

// Stats come from /api/v1/auth/me response — real database counts
const stats = computed(() => user.value?.stats ?? {
  journal_entries: 0,
  trips:           0,
  memories:        0,
  places:          0,
})

const memberSince = computed(() => {
  if (!user.value?.created_at) return '—'
  return new Date(user.value.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year:  'numeric',
  })
})

const initial = computed(() =>
  (user.value?.name ?? 'U').charAt(0).toUpperCase()
)

// Edit mode states
const isEditingName = ref(false)
const editedName = ref('')
const isSavingName = ref(false)

// Photo upload states
const isUploadingPhoto = ref(false)
const isDeletingPhoto = ref(false)
const photoInput = ref<HTMLInputElement | null>(null)

// Confirmation dialogs
const showDeletePhotoConfirm = ref(false)

function startEditName() {
  editedName.value = user.value?.name ?? ''
  isEditingName.value = true
}

function cancelEditName() {
  isEditingName.value = false
  editedName.value = ''
}

async function saveName() {
  if (!editedName.value.trim()) return
  
  isSavingName.value = true
  try {
    await axios.patch('/api/v1/auth/profile', {
      name: editedName.value.trim(),
    })
    
    // Refresh user data
    await auth.fetchCurrentUser()
    isEditingName.value = false
  } catch (err: any) {
    console.error('Failed to update name:', err)
    alert(err.response?.data?.message || 'Failed to update name. Please try again.')
  } finally {
    isSavingName.value = false
  }
}

function triggerPhotoUpload() {
  photoInput.value?.click()
}

async function handlePhotoUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Validate file type
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    alert('Please upload a JPG, PNG, or WEBP image.')
    return
  }

  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert('Photo must be smaller than 10MB.')
    return
  }

  isUploadingPhoto.value = true
  const formData = new FormData()
  formData.append('photo', file)

  try {
    await axios.post('/api/v1/auth/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    
    // Refresh user data
    await auth.fetchCurrentUser()
  } catch (err: any) {
    console.error('Failed to upload photo:', err)
    alert(err.response?.data?.message || 'Failed to upload photo. Please try again.')
  } finally {
    isUploadingPhoto.value = false
    // Reset input
    if (target) target.value = ''
  }
}

async function deletePhoto() {
  isDeletingPhoto.value = true
  try {
    await axios.delete('/api/v1/auth/profile/photo')
    
    // Refresh user data
    await auth.fetchCurrentUser()
    showDeletePhotoConfirm.value = false
  } catch (err: any) {
    console.error('Failed to delete photo:', err)
    alert(err.response?.data?.message || 'Failed to delete photo. Please try again.')
  } finally {
    isDeletingPhoto.value = false
  }
}

async function handleSignOut() {
  await auth.logout()
  router.push({ name: 'login' })
}

// Refresh stats when profile page is visited
auth.fetchCurrentUser().catch(() => {})

</script>

<template>
  <div class="min-h-screen bg-[#f5ebdd]">

    <!-- Profile hero -->
    <div class="bg-[#fdfaf5] border-b border-[#e5d4bb]">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div class="flex flex-col sm:flex-row gap-6 items-start sm:items-center">

          <!-- Avatar with photo upload -->
          <div class="relative group shrink-0">
            <!-- Avatar image or initial -->
            <div
              v-if="user?.avatar_path"
              class="w-20 h-20 rounded-full bg-[#7B0323] flex items-center justify-center border-4 border-[#fdfaf5] shadow overflow-hidden"
              :aria-label="`${user?.name ?? 'User'}'s avatar`"
            >
              <img :src="user.avatar_path" :alt="`${user?.name}'s profile photo`" class="w-full h-full object-cover" />
            </div>
            <div
              v-else
              class="w-20 h-20 rounded-full bg-[#7B0323] flex items-center justify-center text-3xl font-bold text-[#fdfaf5] border-4 border-[#fdfaf5] shadow"
              :aria-label="`${user?.name ?? 'User'}'s avatar`"
            >
              {{ initial }}
            </div>

            <!-- Upload/Change photo button -->
            <button
              v-if="!isUploadingPhoto"
              type="button"
              @click="triggerPhotoUpload"
              class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#7B0323] text-[#fdfaf5] flex items-center justify-center shadow-lg border-2 border-[#fdfaf5] hover:bg-[#5a0019] transition-colors"
              :aria-label="user?.avatar_path ? 'Change profile photo' : 'Upload profile photo'"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
              </svg>
            </button>

            <!-- Loading spinner -->
            <div
              v-else
              class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#7B0323] text-[#fdfaf5] flex items-center justify-center shadow-lg border-2 border-[#fdfaf5]"
            >
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>

            <!-- Hidden file input -->
            <input
              ref="photoInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              @change="handlePhotoUpload"
            />
          </div>

          <div class="flex-1 min-w-0">
            <!-- Editable name -->
            <div v-if="isEditingName" class="flex items-center gap-2 mb-2">
              <input
                v-model="editedName"
                type="text"
                class="flex-1 px-3 py-2 text-xl font-bold text-[#2b1a10] bg-[#fdfaf5] border border-[#d7c7b3] rounded focus:outline-none focus:ring-2 focus:ring-[#7B0323] focus:border-transparent"
                style="font-family:'Playfair Display',Georgia,serif;"
                maxlength="100"
                @keydown.enter="saveName"
                @keydown.esc="cancelEditName"
              />
              <button
                type="button"
                @click="saveName"
                :disabled="isSavingName || !editedName.trim()"
                class="px-3 py-2 bg-[#7B0323] text-[#fdfaf5] text-sm font-semibold rounded hover:bg-[#5a0019] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ isSavingName ? 'Saving...' : 'Save' }}
              </button>
              <button
                type="button"
                @click="cancelEditName"
                :disabled="isSavingName"
                class="px-3 py-2 bg-[#e5d4bb] text-[#6b4423] text-sm font-semibold rounded hover:bg-[#d7c7b3] disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
            <div v-else class="flex items-center gap-2 mb-2">
              <h1 class="text-2xl font-bold text-[#2b1a10]" style="font-family:'Playfair Display',Georgia,serif;">
                {{ user?.name ?? '—' }}
              </h1>
              <button
                type="button"
                @click="startEditName"
                class="text-[#8a5c2e] hover:text-[#7B0323] transition-colors"
                aria-label="Edit name"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
              </button>
            </div>

            <p class="text-sm text-[#8a5c2e] mt-0.5 truncate">{{ user?.email ?? '—' }}</p>
            <p class="text-xs text-[#a68e73] mt-2 uppercase tracking-widest font-semibold">
              Member since {{ memberSince }}
            </p>

            <!-- Delete photo button -->
            <button
              v-if="user?.avatar_path && !showDeletePhotoConfirm"
              type="button"
              @click="showDeletePhotoConfirm = true"
              class="mt-3 text-xs text-[#8a5c2e] hover:text-[#7B0323] underline transition-colors"
            >
              Remove profile photo
            </button>

            <!-- Delete confirmation -->
            <div v-if="showDeletePhotoConfirm" class="mt-3 flex items-center gap-2">
              <p class="text-xs text-[#8a5c2e]">Remove photo?</p>
              <button
                type="button"
                @click="deletePhoto"
                :disabled="isDeletingPhoto"
                class="px-2 py-1 bg-[#7B0323] text-[#fdfaf5] text-xs font-semibold rounded hover:bg-[#5a0019] disabled:opacity-50 transition-colors"
              >
                {{ isDeletingPhoto ? 'Removing...' : 'Yes' }}
              </button>
              <button
                type="button"
                @click="showDeletePhotoConfirm = false"
                :disabled="isDeletingPhoto"
                class="px-2 py-1 bg-[#e5d4bb] text-[#6b4423] text-xs font-semibold rounded hover:bg-[#d7c7b3] disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">

      <!-- Real stats from database -->
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-4">
          Your Journey
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm px-4 py-4 text-center">
            <p class="text-2xl font-bold text-[#7B0323]" style="font-family:'Playfair Display',serif;">{{ stats.journal_entries }}</p>
            <p class="text-xs text-[#8a5c2e] mt-1">Journal Entries</p>
          </div>
          <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm px-4 py-4 text-center">
            <p class="text-2xl font-bold text-[#7B0323]" style="font-family:'Playfair Display',serif;">{{ stats.trips }}</p>
            <p class="text-xs text-[#8a5c2e] mt-1">Trips</p>
          </div>
          <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm px-4 py-4 text-center">
            <p class="text-2xl font-bold text-[#7B0323]" style="font-family:'Playfair Display',serif;">{{ stats.memories }}</p>
            <p class="text-xs text-[#8a5c2e] mt-1">Memories</p>
          </div>
          <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm px-4 py-4 text-center">
            <p class="text-2xl font-bold text-[#7B0323]" style="font-family:'Playfair Display',serif;">{{ stats.places }}</p>
            <p class="text-xs text-[#8a5c2e] mt-1">Places Visited</p>
          </div>
        </div>

        <!-- New account guidance -->
        <p v-if="stats.journal_entries === 0 && stats.trips === 0" class="text-sm text-[#8a5c2e] italic mt-4 text-center">
          Your journey is just beginning. Write your first entry to start your story.
        </p>
      </section>

      <!-- Account actions -->
      <section aria-labelledby="account-heading">
        <h2 id="account-heading" class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e] mb-4">
          Account
        </h2>
        <div class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm divide-y divide-[#efe2cf]">

          <router-link
            :to="{ name: 'settings' }"
            class="flex items-center justify-between px-5 py-4 text-sm font-medium text-[#2b1a10] hover:bg-[#f5ebdd] transition-colors"
          >
            Account Settings
            <svg class="w-4 h-4 text-[#c4ad94]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
            </svg>
          </router-link>

          <button
            type="button"
            class="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-[#7B0323] hover:bg-[#fdf2f3] transition-colors text-left"
            @click="handleSignOut"
          >
            Sign Out
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
