<script setup lang="ts">
import type {TripStatus} from '@/types'
import TimezonePicker from './TimezonePicker.vue'
import DestinationPicker from './DestinationPicker.vue'
import type {DestinationFields} from '@/types/destination'
export interface TripDraft extends DestinationFields {title:string;destination:string;start:string;end:string;undecided:boolean;description:string;timezone:string;status:TripStatus}
const model=defineModel<TripDraft>({required:true})
defineProps<{editing?:boolean;disabled?:boolean}>()
</script>
<template><div class="form-grid">
 <label>Trip name<input v-model="model.title" maxlength="255" placeholder="Where will this chapter take you?" :disabled="disabled" /></label>
 <DestinationPicker :destination="model.destination" :location="model" :disabled="disabled" @change="(name,location)=>{model.destination=name;Object.assign(model,location)}" />
 <label class="check-label"><input v-model="model.undecided" type="checkbox" :disabled="disabled" />Dates undecided</label>
 <div v-if="!model.undecided" class="pair"><label>Start date<input v-model="model.start" type="date" :disabled="disabled" /></label><label>End date<input v-model="model.end" type="date" :min="model.start" :disabled="disabled" /></label></div>
 <p v-if="editing" class="muted">Changing dates keeps activities on their numbered days. Day 1 moves to your new start date. Extra days stay in the itinerary, marked outside your dates.</p>
 <details><summary>Optional details · notes & timezone</summary><div class="form-grid"><label>Notes<textarea v-model="model.description" placeholder="What would make this trip yours?" :disabled="disabled" /></label><TimezonePicker v-model="model.timezone" :disabled="disabled" /><label v-if="editing">Trip status<select v-model="model.status" :disabled="disabled"><option value="planning">Follow travel dates</option><option value="active">Manually in progress</option><option value="completed">Completed</option><option value="archived">Archived</option></select></label></div></details>
</div></template>
