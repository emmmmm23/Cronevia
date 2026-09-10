<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useTripsStore } from '@/stores/trips'
import type { TripStatus } from '@/types'

const router = useRouter()
const route = useRoute()
const store = useTripsStore()

const tripId = route.params.id as string | undefined
const isEditing = !!tripId

const title = ref('')
const destination = ref('')
const startDate = ref('')
const endDate = ref('')
const description = ref('')
const status = ref<TripStatus>('planning')

const saving = ref(false)
const saveError = ref('')

onMounted(async () => {
  if (isEditing && tripId) {
    try {
      const trip = await store.fetchTrip(tripId)
      title.value = trip.title
      destination.value = trip.description ?? '' // Use description as destination for now
      startDate.value = trip.start_date ?? ''
      endDate.value = trip.end_date ?? ''
      description.value = trip.description ?? ''
      status.value = trip.status
    } catch (err) {
      saveError.value = 'Failed to load trip'
    }
  }
})

const canSave = computed(() => title.value.trim() && startDate.value && !saving.value)

async function handleSave() {
  if (!canSave.value) return
  saving.value = true
  saveError.value = ''

  const payload = {
    title: title.value.trim(),
    destination: destination.value.trim() || null,
    description: description.value.trim() || null,
    start_date: startDate.value,
    end_date: endDate.value || null,
    status: status.value,
    visibility: 'private' as const,
  }

  try {
    if (isEditing && tripId) {
      await store.updateTrip(tripId, payload)
    } else {
      const created = await store.createTrip(payload as typeof payload & { title: string; start_date: string })
      await router.push({ name: 'trips.show', params: { id: created.id } })
      return
    }
    await router.push({ name: 'trips' })
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    saveError.value = e?.response?.data?.message ?? 'Failed to save trip. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#f5ebdd]">

    <!-- Header -->
    <div class="bg-[#fdfaf5] border-b border-[#e5d4bb]">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-bold text-[#2b1a10]" style="font-family:'Playfair Display',Georgia,serif;">
            {{ isEditing ? 'Edit Trip' : 'Plan a Trip' }}
          </h1>
          <p class="text-xs text-[#8a5c2e] mt-0.5">{{ isEditing ? 'Update your journey details' : 'Add a new journey to your archive' }}</p>
        </div>
        <div class="flex gap-2">
          <RouterLink :to="{ name: 'trips' }" class="px-4 py-2 text-sm font-medium text-[#6b4423] hover:text-[#2b1a10] border border-[#d7c7b3] rounded bg-[#fdfaf5] hover:bg-[#f5ebdd] transition-colors">
            Cancel
          </RouterLink>
          <button
            type="button"
            :disabled="!canSave"
            :class="[
              'px-4 py-2 text-sm font-semibold rounded border transition-colors',
              canSave
                ? 'bg-[#7B0323] text-[#fdfaf5] border-[#5a0019] hover:bg-[#5a0019]'
                : 'bg-[#d7c7b3] text-[#fdfaf5] border-[#d7c7b3] cursor-not-allowed opacity-50',
            ]"
            @click="handleSave"
          >
            {{ saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Save Trip') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Save error -->
    <div v-if="saveError" class="max-w-3xl mx-auto px-4 sm:px-6 pt-4">
      <div class="px-4 py-3 bg-[#fdf2f3] border border-[#eeaab5] rounded text-sm text-[#7B0323]">
        {{ saveError }}
      </div>
    </div>

    <!-- Form -->
    <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">

      <div>
        <label for="trip-title" class="block text-xs font-semibold uppercase tracking-wider text-[#6b4423] mb-1.5">Trip Title <span class="text-[#8f1d2c]">*</span></label>
        <input
          id="trip-title"
          v-model="title"
          type="text"
          placeholder="e.g. Three Days in Tagaytay"
          class="w-full px-3 py-2.5 bg-[#fdfaf5] border border-[#d7c7b3] rounded text-[#2b1a10] placeholder:text-[#a68e73] focus:outline-none focus:border-[#8f1d2c] focus:ring-2 focus:ring-[#8f1d2c]/10 transition"
          style="font-family:'Playfair Display',Georgia,serif; font-size:1.0625rem;"
        />
      </div>

      <div>
        <label for="trip-destination" class="block text-xs font-semibold uppercase tracking-wider text-[#6b4423] mb-1.5">Destination</label>
        <input
          id="trip-destination"
          v-model="destination"
          type="text"
          placeholder="Where are you going?"
          class="w-full px-3 py-2.5 bg-[#fdfaf5] border border-[#d7c7b3] rounded text-sm text-[#2b1a10] placeholder:text-[#a68e73] focus:outline-none focus:border-[#8f1d2c] focus:ring-2 focus:ring-[#8f1d2c]/10 transition"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="trip-start" class="block text-xs font-semibold uppercase tracking-wider text-[#6b4423] mb-1.5">Start Date <span class="text-[#8f1d2c]">*</span></label>
          <input
            id="trip-start"
            v-model="startDate"
            type="date"
            class="w-full px-3 py-2.5 bg-[#fdfaf5] border border-[#d7c7b3] rounded text-sm text-[#2b1a10] focus:outline-none focus:border-[#8f1d2c] focus:ring-2 focus:ring-[#8f1d2c]/10 transition"
          />
        </div>
        <div>
          <label for="trip-end" class="block text-xs font-semibold uppercase tracking-wider text-[#6b4423] mb-1.5">End Date</label>
          <input
            id="trip-end"
            v-model="endDate"
            type="date"
            :min="startDate"
            class="w-full px-3 py-2.5 bg-[#fdfaf5] border border-[#d7c7b3] rounded text-sm text-[#2b1a10] focus:outline-none focus:border-[#8f1d2c] focus:ring-2 focus:ring-[#8f1d2c]/10 transition"
          />
        </div>
      </div>

      <div>
        <label for="trip-description" class="block text-xs font-semibold uppercase tracking-wider text-[#6b4423] mb-1.5">Notes <span class="normal-case text-[#a68e73] font-normal">(optional)</span></label>
        <textarea
          id="trip-description"
          v-model="description"
          rows="4"
          placeholder="What are you looking forward to? Any notes for the trip."
          class="w-full px-3 py-3 bg-[#fdfaf5] border border-[#d7c7b3] rounded text-sm text-[#2b1a10] leading-relaxed placeholder:text-[#a68e73] focus:outline-none focus:border-[#8f1d2c] focus:ring-2 focus:ring-[#8f1d2c]/10 transition resize-none"
        />
      </div>

    </div>
  </div>
</template>
