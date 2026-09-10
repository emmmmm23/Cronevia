<script setup lang="ts">
/**
 * TripDetailPage — View and manage a trip with its destinations (itinerary items).
 * 
 * Features:
 * - View trip details
 * - Add/edit/delete destinations
 * - Reorder destinations with move up/down
 * - Schedule arrival/departure times
 * - Link to journal entries and memories
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useTripsStore } from '@/stores/trips'
import PhotoUpload from '@/components/ui/PhotoUpload.vue'
import type { Trip, TripDay, ItineraryItem, Media } from '@/types'
import api from '@/services/api.service'

const route = useRoute()
const router = useRouter()
const store = useTripsStore()

const tripId = route.params.id as string

const trip = ref<Trip | null>(null)
const tripDays = ref<TripDay[]>([])
const currentDayId = ref<string | null>(null)
const destinations = ref<ItineraryItem[]>([])

const loading = ref(false)
const error = ref('')
const saving = ref(false)

// Add destination form
const showAddForm = ref(false)
const newDestTitle = ref('')
const newDestTime = ref('')
const newDestNotes = ref('')

// Edit destination
const editingDest = ref<string | null>(null)
const editTitle = ref('')
const editTime = ref('')
const editNotes = ref('')

// Delete confirmation
const confirmDelete = ref<string | null>(null)

// Photos
const newPhotos = ref<File[]>([])
const existingPhotos = ref<Media[]>([])
const photosToDelete = ref<string[]>([])
const uploadingPhotos = ref(false)
const showPhotoSection = ref(false)

onMounted(async () => {
  await loadTrip()
})

async function loadTrip() {
  loading.value = true
  error.value = ''
  try {
    trip.value = await store.fetchTrip(tripId)
    existingPhotos.value = trip.value.media ?? []
    tripDays.value = await store.fetchTripDays(tripId)
    
    // Auto-select first day or create one if none exist
    if (tripDays.value.length > 0) {
      currentDayId.value = tripDays.value[0].id
      await loadDestinations()
    } else if (trip.value?.start_date) {
      // Create first day automatically
      const day = await store.createTripDay(tripId, {
        date: trip.value.start_date,
        day_number: 1,
        title: 'Day 1',
      })
      tripDays.value = [day]
      currentDayId.value = day.id
    }
  } catch (e) {
    error.value = 'Failed to load trip'
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function loadDestinations() {
  if (!currentDayId.value) return
  try {
    destinations.value = await store.fetchItineraryItems(tripId, currentDayId.value)
  } catch (err) {
    console.error('Failed to load destinations:', err)
  }
}

const currentDay = computed(() => {
  return tripDays.value.find(d => d.id === currentDayId.value)
})

const canAddDestination = computed(() => {
  return newDestTitle.value.trim().length > 0 && !saving.value
})

async function handleAddDestination() {
  if (!canAddDestination.value || !currentDayId.value) return
  
  saving.value = true
  try {
    const payload = {
      title: newDestTitle.value.trim(),
      scheduled_time: newDestTime.value || null,
      description: newDestNotes.value.trim() || null,
      status: 'planned' as const,
    }
    
    await store.createItineraryItem(tripId, currentDayId.value, payload)
    await loadDestinations()
    
    // Reset form
    newDestTitle.value = ''
    newDestTime.value = ''
    newDestNotes.value = ''
    showAddForm.value = false
  } catch (err) {
    console.error('Failed to add destination:', err)
  } finally {
    saving.value = false
  }
}

function startEdit(dest: ItineraryItem) {
  editingDest.value = dest.id
  editTitle.value = dest.title
  editTime.value = dest.scheduled_time || ''
  editNotes.value = dest.description || ''
}

function cancelEdit() {
  editingDest.value = null
  editTitle.value = ''
  editTime.value = ''
  editNotes.value = ''
}

async function saveEdit(destId: string) {
  if (!currentDayId.value) return
  
  saving.value = true
  try {
    await store.updateItineraryItem(tripId, currentDayId.value, destId, {
      title: editTitle.value.trim(),
      scheduled_time: editTime.value || null,
      description: editNotes.value.trim() || null,
    })
    await loadDestinations()
    cancelEdit()
  } catch (err) {
    console.error('Failed to update destination:', err)
  } finally {
    saving.value = false
  }
}

async function handleDelete(destId: string) {
  if (!currentDayId.value) return
  
  saving.value = true
  try {
    await store.deleteItineraryItem(tripId, currentDayId.value, destId)
    await loadDestinations()
    confirmDelete.value = null
  } catch (err) {
    console.error('Failed to delete destination:', err)
  } finally {
    saving.value = false
  }
}

async function moveUp(index: number) {
  if (index === 0) return
  const newOrder = [...destinations.value]
  ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
  await reorder(newOrder)
}

async function moveDown(index: number) {
  if (index === destinations.value.length - 1) return
  const newOrder = [...destinations.value]
  ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
  await reorder(newOrder)
}

async function reorder(newOrder: ItineraryItem[]) {
  if (!currentDayId.value) return
  
  saving.value = true
  try {
    const orderIds = newOrder.map(d => d.id)
    await store.reorderItineraryItems(tripId, currentDayId.value, orderIds)
    await loadDestinations()
  } catch (err) {
    console.error('Failed to reorder:', err)
  } finally {
    saving.value = false
  }
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatTime(t: string | null): string {
  if (!t) return ''
  const parts = t.split(':')
  const hour = parseInt(parts[0])
  const min = parts[1]
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${min} ${ampm}`
}

async function handleRemoveExistingPhoto(photoId: string) {
  photosToDelete.value.push(photoId)
  existingPhotos.value = existingPhotos.value.filter(p => p.id !== photoId)
}

async function savePhotos() {
  if (!trip.value) return
  
  uploadingPhotos.value = true
  try {
    // Delete photos marked for deletion
    for (const photoId of photosToDelete.value) {
      try {
        await api.delete(`/trips/${trip.value.id}/media/${photoId}`)
      } catch (err) {
        console.error('Failed to delete photo:', err)
      }
    }
    photosToDelete.value = []
    
    // Upload new photos
    for (const file of newPhotos.value) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        await api.post(`/trips/${trip.value.id}/media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } catch (err) {
        console.error('Failed to upload photo:', err)
      }
    }
    newPhotos.value = []
    
    // Reload trip to get updated photos
    await loadTrip()
    showPhotoSection.value = false
  } catch (err) {
    console.error('Failed to save photos:', err)
  } finally {
    uploadingPhotos.value = false
  }
}

async function setCoverPhoto(photoId: string) {
  if (!trip.value) return
  
  try {
    await api.patch(`/trips/${trip.value.id}/media/${photoId}/set-cover`)
    await loadTrip()
  } catch (err) {
    console.error('Failed to set cover photo:', err)
  }
}

</script>

<template>
  <div class="min-h-screen bg-[#f5ebdd]">
    
    <!-- Loading -->
    <div v-if="loading" class="max-w-4xl mx-auto px-4 sm:px-6 py-10 animate-pulse">
      <div class="h-4 bg-[#e5d4bb] rounded w-24 mb-6" />
      <div class="h-8 bg-[#e5d4bb] rounded w-2/3 mb-3" />
      <div class="h-48 bg-[#fdfaf5] border border-[#e5d4bb] rounded-sm" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
      <p class="text-sm text-[#7B0323] mb-4">{{ error }}</p>
      <RouterLink :to="{ name: 'trips' }" class="text-sm font-semibold text-[#7B0323] hover:underline">
        Back to Trips
      </RouterLink>
    </div>

    <!-- Trip content -->
    <div v-else-if="trip">
      <!-- Header -->
      <div class="bg-[#fdfaf5] border-b border-[#e5d4bb]">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <RouterLink :to="{ name: 'trips' }" class="inline-flex items-center gap-1 text-xs text-[#8a5c2e] hover:text-[#7B0323] mb-3 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            All Trips
          </RouterLink>
          
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <h1 class="text-2xl sm:text-3xl font-bold text-[#2b1a10]" style="font-family:'Playfair Display',Georgia,serif;">
                {{ trip.title }}
              </h1>
              <div class="flex flex-wrap items-center gap-3 mt-2">
                <span class="text-sm text-[#8a5c2e]">
                  {{ formatDate(trip.start_date) }}<span v-if="trip.end_date"> – {{ formatDate(trip.end_date) }}</span>
                </span>
              </div>
              <p v-if="trip.description" class="mt-2 text-sm text-[#6b4423] max-w-2xl">{{ trip.description }}</p>
            </div>
            
            <RouterLink
              :to="{ name: 'trips.edit', params: { id: trip.id } }"
              class="text-sm font-semibold text-[#7B0323] hover:underline shrink-0"
            >
              Edit Trip
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- Main content -->
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        
        <!-- Destinations section -->
        <section>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e]">
              Destinations
            </h2>
            <button
              v-if="!showAddForm"
              type="button"
              class="text-sm font-semibold text-[#7B0323] hover:underline"
              @click="showAddForm = true"
            >
              + Add Destination
            </button>
          </div>

          <!-- Add destination form -->
          <div v-if="showAddForm" class="mb-6 bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm p-5">
            <h3 class="text-sm font-bold text-[#2b1a10] mb-4">Add Destination</h3>
            <div class="flex flex-col gap-4">
              <div>
                <label for="new-dest-title" class="block text-xs font-semibold uppercase tracking-wider text-[#6b4423] mb-1.5">
                  Place <span class="text-[#7B0323]">*</span>
                </label>
                <input
                  id="new-dest-title"
                  v-model="newDestTitle"
                  type="text"
                  placeholder="e.g. Tagaytay Picnic Grove"
                  class="w-full px-3 py-2.5 text-sm bg-white border border-[#d7c7b3] rounded text-[#2b1a10] placeholder:text-[#a68e73] focus:outline-none focus:border-[#7B0323] focus:ring-2 focus:ring-[#7B0323]/10 transition"
                />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label for="new-dest-time" class="block text-xs font-semibold uppercase tracking-wider text-[#6b4423] mb-1.5">
                    Arrival Time
                  </label>
                  <input
                    id="new-dest-time"
                    v-model="newDestTime"
                    type="time"
                    class="w-full px-3 py-2.5 text-sm bg-white border border-[#d7c7b3] rounded text-[#2b1a10] focus:outline-none focus:border-[#7B0323] focus:ring-2 focus:ring-[#7B0323]/10 transition"
                  />
                </div>
              </div>
              <div>
                <label for="new-dest-notes" class="block text-xs font-semibold uppercase tracking-wider text-[#6b4423] mb-1.5">
                  Notes
                </label>
                <textarea
                  id="new-dest-notes"
                  v-model="newDestNotes"
                  rows="2"
                  placeholder="Any details or reminders..."
                  class="w-full px-3 py-2.5 text-sm bg-white border border-[#d7c7b3] rounded text-[#2b1a10] placeholder:text-[#a68e73] focus:outline-none focus:border-[#7B0323] focus:ring-2 focus:ring-[#7B0323]/10 transition resize-none"
                />
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  :disabled="!canAddDestination"
                  :class="[
                    'px-4 py-2 text-sm font-semibold rounded border transition-colors',
                    canAddDestination
                      ? 'bg-[#7B0323] text-[#fdfaf5] border-[#5a0019] hover:bg-[#5a0019]'
                      : 'bg-[#d7c7b3] text-[#fdfaf5] border-[#d7c7b3] cursor-not-allowed opacity-50',
                  ]"
                  @click="handleAddDestination"
                >
                  Add Destination
                </button>
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-medium text-[#6b4423] hover:text-[#2b1a10]"
                  @click="showAddForm = false; newDestTitle = ''; newDestTime = ''; newDestNotes = ''"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          <!-- Destinations list -->
          <div v-if="destinations.length > 0" class="flex flex-col gap-3">
            <div
              v-for="(dest, index) in destinations"
              :key="dest.id"
              class="bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm overflow-hidden"
            >
              <!-- View mode -->
              <div v-if="editingDest !== dest.id" class="px-5 py-4">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-lg font-bold text-[#7B0323]">{{ index + 1 }}</span>
                      <span v-if="dest.scheduled_time" class="text-xs font-semibold uppercase tracking-wider text-[#8a5c2e]">
                        {{ formatTime(dest.scheduled_time) }}
                      </span>
                    </div>
                    <h3 class="text-lg font-bold text-[#2b1a10]" style="font-family:'Playfair Display',serif;">
                      {{ dest.title }}
                    </h3>
                    <p v-if="dest.description" class="mt-1 text-sm text-[#6b4423]">
                      {{ dest.description }}
                    </p>
                  </div>
                  
                  <!-- Actions -->
                  <div class="flex items-center gap-2 shrink-0">
                    <button
                      v-if="index > 0"
                      type="button"
                      :disabled="saving"
                      class="p-1.5 text-[#a68e73] hover:text-[#7B0323] disabled:opacity-50"
                      title="Move up"
                      @click="moveUp(index)"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                      </svg>
                    </button>
                    <button
                      v-if="index < destinations.length - 1"
                      type="button"
                      :disabled="saving"
                      class="p-1.5 text-[#a68e73] hover:text-[#7B0323] disabled:opacity-50"
                      title="Move down"
                      @click="moveDown(index)"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="text-xs font-semibold text-[#7B0323] hover:underline"
                      @click="startEdit(dest)"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      class="text-xs font-semibold text-[#c4ad94] hover:text-[#7B0323]"
                      @click="confirmDelete = dest.id"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <!-- Edit mode -->
              <div v-else class="px-5 py-4 bg-[#f5ebdd]">
                <div class="flex flex-col gap-3">
                  <div>
                    <input
                      v-model="editTitle"
                      type="text"
                      class="w-full px-3 py-2 text-sm bg-white border border-[#d7c7b3] rounded text-[#2b1a10] focus:outline-none focus:border-[#7B0323] focus:ring-2 focus:ring-[#7B0323]/10"
                    />
                  </div>
                  <div>
                    <input
                      v-model="editTime"
                      type="time"
                      class="w-full px-3 py-2 text-sm bg-white border border-[#d7c7b3] rounded text-[#2b1a10] focus:outline-none focus:border-[#7B0323] focus:ring-2 focus:ring-[#7B0323]/10"
                    />
                  </div>
                  <div>
                    <textarea
                      v-model="editNotes"
                      rows="2"
                      class="w-full px-3 py-2 text-sm bg-white border border-[#d7c7b3] rounded text-[#2b1a10] focus:outline-none focus:border-[#7B0323] focus:ring-2 focus:ring-[#7B0323]/10 resize-none"
                    />
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      :disabled="saving"
                      class="px-3 py-1.5 text-sm font-semibold bg-[#7B0323] text-[#fdfaf5] rounded border border-[#5a0019] hover:bg-[#5a0019] disabled:opacity-50"
                      @click="saveEdit(dest.id)"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      class="px-3 py-1.5 text-sm font-medium text-[#6b4423] hover:text-[#2b1a10]"
                      @click="cancelEdit"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>

              <!-- Delete confirmation -->
              <div v-if="confirmDelete === dest.id" class="bg-[#fdf2f3] border-t border-[#eeaab5] px-5 py-3">
                <p class="text-sm text-[#7B0323] mb-2">
                  <strong>Delete this destination?</strong> This action cannot be undone.
                </p>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    :disabled="saving"
                    class="px-3 py-1.5 text-sm font-semibold bg-[#7B0323] text-[#fdfaf5] rounded border border-[#5a0019] hover:bg-[#5a0019] disabled:opacity-50"
                    @click="handleDelete(dest.id)"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    class="px-3 py-1.5 text-sm font-medium text-[#6b4423] hover:text-[#2b1a10]"
                    @click="confirmDelete = null"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else-if="!showAddForm" class="text-center py-12 bg-[#fdfaf5] border border-dashed border-[#d7c7b3] rounded-sm">
            <svg class="w-12 h-12 mx-auto mb-3 text-[#c4ad94]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/>
            </svg>
            <p class="text-sm text-[#8a5c2e] mb-4">No destinations added yet.</p>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#7B0323] text-[#fdfaf5] rounded border border-[#5a0019] hover:bg-[#5a0019] transition-colors"
              @click="showAddForm = true"
            >
              Add Your First Destination
            </button>
          </div>
        </section>

        <!-- Photos section -->
        <section class="mt-12">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xs font-semibold uppercase tracking-widest text-[#8a5c2e]">
              Trip Photos
            </h2>
            <button
              v-if="!showPhotoSection"
              type="button"
              class="text-sm font-semibold text-[#7B0323] hover:underline"
              @click="showPhotoSection = true"
            >
              Manage Photos
            </button>
          </div>

          <!-- Photo management -->
          <div v-if="showPhotoSection" class="mb-6 bg-[#fdfaf5] border border-[#d7c7b3] rounded-sm p-5">
            <h3 class="text-sm font-bold text-[#2b1a10] mb-4">Manage Trip Photos</h3>
            
            <PhotoUpload
              v-model="newPhotos"
              :existing-photos="existingPhotos"
              :disabled="uploadingPhotos"
              @remove-existing="handleRemoveExistingPhoto"
            />

            <div class="flex items-center gap-2 mt-4">
              <button
                type="button"
                :disabled="uploadingPhotos || (newPhotos.length === 0 && photosToDelete.length === 0)"
                :class="[
                  'px-4 py-2 text-sm font-semibold rounded border transition-colors',
                  (newPhotos.length > 0 || photosToDelete.length > 0) && !uploadingPhotos
                    ? 'bg-[#7B0323] text-[#fdfaf5] border-[#5a0019] hover:bg-[#5a0019]'
                    : 'bg-[#d7c7b3] text-[#fdfaf5] border-[#d7c7b3] cursor-not-allowed opacity-50',
                ]"
                @click="savePhotos"
              >
                {{ uploadingPhotos ? 'Saving...' : 'Save Photos' }}
              </button>
              <button
                type="button"
                :disabled="uploadingPhotos"
                class="px-4 py-2 text-sm font-medium text-[#6b4423] hover:text-[#2b1a10] disabled:opacity-50"
                @click="showPhotoSection = false; newPhotos = []; photosToDelete = []"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- Photo gallery display -->
          <div v-if="existingPhotos.length > 0 && !showPhotoSection" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <div
              v-for="photo in existingPhotos"
              :key="photo.id"
              class="relative aspect-square bg-[#f5ebdd] border border-[#d7c7b3] rounded overflow-hidden group cursor-pointer"
            >
              <img
                :src="`/storage/${photo.path}`"
                :alt="photo.original_name"
                class="w-full h-full object-cover"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <button
                  v-if="trip?.cover_media_id !== photo.id"
                  type="button"
                  class="text-xs font-semibold text-white hover:underline"
                  @click="setCoverPhoto(photo.id)"
                >
                  Set as Cover
                </button>
                <span v-else class="text-xs font-semibold text-white">
                  Cover Photo
                </span>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else-if="!showPhotoSection" class="text-center py-12 bg-[#fdfaf5] border border-dashed border-[#d7c7b3] rounded-sm">
            <svg class="w-12 h-12 mx-auto mb-3 text-[#c4ad94]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            <p class="text-sm text-[#8a5c2e] mb-4">No photos added yet.</p>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#7B0323] text-[#fdfaf5] rounded border border-[#5a0019] hover:bg-[#5a0019] transition-colors"
              @click="showPhotoSection = true"
            >
              Add Trip Photos
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
