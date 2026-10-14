<script setup lang="ts">
import type {TripStatus} from '@/types'
export interface TripDraft {title:string;destination:string;start:string;end:string;undecided:boolean;description:string;timezone:string;status:TripStatus}
const model=defineModel<TripDraft>({required:true})
defineProps<{editing?:boolean;disabled?:boolean}>()
</script>
<template><div class="form-grid">
 <label>Trip name<input v-model="model.title" maxlength="255" placeholder="Where will this chapter take you?" :disabled="disabled" /></label>
 <label>Destination<input v-model="model.destination" maxlength="255" placeholder="A city, a region, or still a possibility" :disabled="disabled" /></label>
 <label class="check-label"><input v-model="model.undecided" type="checkbox" :disabled="disabled" />Dates undecided</label>
 <div v-if="!model.undecided" class="pair"><label>Start date<input v-model="model.start" type="date" :disabled="disabled" /></label><label>End date<input v-model="model.end" type="date" :min="model.start" :disabled="disabled" /></label></div>
 <p v-if="editing" class="muted">Changing dates keeps activities on their numbered days. Day 1 moves to your new start date. Extra days stay in the itinerary, marked outside your dates.</p>
 <details><summary>Add details</summary><div class="form-grid"><label>Notes<textarea v-model="model.description" placeholder="What would make this trip yours?" :disabled="disabled" /></label><label>Trip timezone<input v-model="model.timezone" list="trip-timezones" placeholder="Use this device’s timezone" :disabled="disabled" /></label><datalist id="trip-timezones"><option>Asia/Manila</option><option>Asia/Tokyo</option><option>Europe/London</option><option>Europe/Paris</option><option>America/New_York</option><option>America/Los_Angeles</option><option>Australia/Sydney</option><option>UTC</option></datalist><p class="muted">Use an IANA name such as Asia/Manila. Until you choose one, Today uses this device’s timezone.</p><label v-if="editing">Trip status<select v-model="model.status" :disabled="disabled"><option value="planning">Follow travel dates</option><option value="active">Manually in progress</option><option value="completed">Completed</option><option value="archived">Archived</option></select></label></div></details>
</div></template>
