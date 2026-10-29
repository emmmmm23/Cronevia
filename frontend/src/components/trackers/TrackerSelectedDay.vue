<script setup lang="ts">
import {computed} from 'vue'
const props=defineProps<{date:string}>()
const label=computed(()=>new Date(props.date+'T12:00:00').toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric',year:'numeric'}))
</script>
<template><div class="selected-day"><span>Selected day</span><time :datetime="date">{{label}}</time></div></template>
<style scoped>
.selected-day{display:grid;gap:6px;padding-bottom:16px;border-bottom:1px solid #ded3be;color:#544c40}
.selected-day span{font:12px/1.5 Inter,sans-serif;color:#8e7f68}
.selected-day time{font:22px/1.3 'Crimson Text',Georgia,serif}
</style>
