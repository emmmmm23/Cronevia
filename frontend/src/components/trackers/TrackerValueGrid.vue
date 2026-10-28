<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { dailyValue, displayValue, goalMet, monthDays, onSchedule, sleepSegments, type CreativeTracker, type TrackerLog } from '@/types/trackers'

const props = withDefaults(defineProps<{
  tracker: CreativeTracker; logs: TrackerLog[]; month: string; today: string; compact?: boolean
}>(), { compact: false })
const emit = defineEmits<{ log: [date: string] }>()
const frame = ref<HTMLElement>()
const frameWidth = ref(600)
const days = computed(() => monthDays(props.month))
const isSleep = computed(() => props.tracker.kind === 'sleep')
const byDay = computed(() => new Map(days.value.map(day => [
  day, props.logs.filter(log => log.tracker_id === props.tracker.id && log.log_date === day),
])))
const dayLogs = (day: string) => byDay.value.get(day) || []
const value = (day: string) => Number(dailyValue(props.tracker, dayLogs(day))) || 0
const state = (day: string) => day > props.today ? 'future' : !dayLogs(day).length
  ? onSchedule(props.tracker, day) ? 'missing' : 'unscheduled'
  : !isSleep.value && value(day) === 0 ? 'zero' : 'recorded'
const accessibleLabel = (day: string) => day + ': ' + (day > props.today ? 'Future date' : displayValue(props.tracker, dayLogs(day)))
  + (state(day) === 'unscheduled' ? ' · Not scheduled' : '')

function niceStep(raw: number) {
  const power = 10 ** Math.floor(Math.log10(Math.max(1, raw)))
  const fraction = raw / power
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power
}
const scale = computed(() => {
  if (isSleep.value) return { maximum: 24, step: 6, intervals: 4, columns: 24 }
  const baseline = props.tracker.kind === 'steps' ? 10000
    : props.tracker.kind === 'duration' ? 60 : props.tracker.kind === 'quantity' ? 1000 : 8
  const largest = Math.max(baseline, props.tracker.config.goal?.target || 0, ...days.value.map(value))
  const step = props.tracker.kind === 'count' && largest <= 12 ? 1 : niceStep(largest / 6)
  const intervals = Math.ceil(largest / step)
  const maximum = intervals * step
  return { maximum, step, intervals, columns: props.tracker.kind === 'count' && maximum <= 20 ? maximum * 2 : intervals * 4 }
})
const ticks = computed(() => Array.from({ length: scale.value.intervals + 1 }, (_, i) => ({
  value: i * scale.value.step,
  label: isSleep.value ? ['12 AM', '6 AM', '12 PM', '6 PM', '12 AM'][i]
    : (i * scale.value.step).toLocaleString('en-PH', { maximumFractionDigits: 2, notation: props.tracker.kind === 'steps' ? 'compact' : 'standard' }),
})))
const dimensions = computed(() => {
  const day = frameWidth.value < 420 ? 28 : 34
  const total = frameWidth.value < 420 ? 48 : 60
  const available = Math.max(96, frameWidth.value - day - total)
  const cell = Math.min(26, available / scale.value.columns)
  // Each day occupies a whole number of graph-paper squares at every viewport width.
  const target = props.compact ? 18 : frameWidth.value < 420 ? 44 : 24
  const row = cell * Math.ceil((target - .01) / cell)
  return { day, total, cell, row, width: cell * scale.value.columns }
})
const gridStyle = computed(() => ({
  '--grid-cell': dimensions.value.cell + 'px',
  '--grid-row': dimensions.value.row + 'px',
  '--plot-width': dimensions.value.width + 'px',
  '--day-column': dimensions.value.day + 'px',
  '--total-column': dimensions.value.total + 'px',
  '--major-column': dimensions.value.width / scale.value.intervals + 'px',
  '--tracker-accent': props.tracker.design.accent,
}))
let observer: ResizeObserver | undefined
onMounted(() => {
  if (!frame.value) return
  frameWidth.value = frame.value.getBoundingClientRect().width
  observer = new ResizeObserver(entries => {
    const width = entries[0]?.contentRect.width
    if (width && Math.abs(width - frameWidth.value) > .1) frameWidth.value = width
  })
  observer.observe(frame.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="frame" class="value-grid-frame">
    <div class="value-grid" :class="{ compact, 'sleep-grid': isSleep }" :style="gridStyle">
      <div class="plot-scale"><span>{{ isSleep ? 'HOURS OF THE DAY' : tracker.unit || 'DAILY TOTAL' }}</span><span>{{ isSleep ? 'LOCAL TIME' : '0–' + scale.maximum.toLocaleString('en-PH') }}</span></div>
      <div class="plot-axis" aria-hidden="true">
        <span class="axis-day">DAY</span>
        <div class="plot-axis-track"><span v-for="(tick, i) in ticks" :key="tick.value" :class="{ first: i === 0, last: i === ticks.length - 1 }" :style="{ left: tick.value / scale.maximum * 100 + '%' }">{{ tick.label }}</span></div>
        <span class="axis-total">{{ isSleep ? 'SLEPT' : 'TOTAL' }}</span>
      </div>
      <div class="plot-body">
        <div class="graph-lines" aria-hidden="true"></div>
        <button v-for="day in days" :key="day" type="button" class="plot-row"
          :class="[isSleep ? 'sleep-row' : 'number-row', state(day), { 'is-today': day === today }]"
          :disabled="day > today || compact || tracker.archived" :aria-label="accessibleLabel(day)" @click="emit('log', day)">
          <span class="row-day">{{ Number(day.slice(-2)) }}</span>
          <span class="plot-track" :class="isSleep ? 'sleep-track' : 'number-track'">
            <template v-if="isSleep"><template v-for="log in dayLogs(day)" :key="log.id"><i v-for="(segment, i) in sleepSegments(log)" :key="log.id + '-' + i" class="marker-bar" :class="{ nap: log.values.sleepType === 'nap' }" :style="{ left: segment.start / 24 * 100 + '%', width: segment.width / 24 * 100 + '%' }"></i></template></template>
            <i v-else-if="dayLogs(day).length && value(day) > 0" class="marker-bar" :style="{ width: value(day) / scale.maximum * 100 + '%' }"></i>
            <span v-if="state(day) === 'zero'" class="zero-mark" aria-hidden="true">○</span>
            <span v-if="state(day) === 'unscheduled'" class="off-schedule" aria-hidden="true"></span>
          </span>
          <span class="row-value">{{ dayLogs(day).length ? isSleep ? displayValue(tracker, dayLogs(day)) : value(day).toLocaleString('en-PH', { maximumFractionDigits: 1 }) : '' }}<b v-if="goalMet(tracker, dayLogs(day))" aria-label="Goal met"> ✓</b></span>
        </button>
      </div>
    </div>
    <p v-if="isSleep" class="plot-caption"><i class="legend-color"></i> Night sleep <i class="legend-color nap-key"></i> Naps <span>·</span> Each small square is one hour. Dates belong to the day you wake up; totals use actual elapsed time.</p>
    <p v-else class="plot-caption">Blank paper = not logged. <span class="zero-key">○ 0</span> = a recorded zero. Tap a day to log or use “Log a day.”</p>
  </div>
</template>

<style scoped>
.value-grid-frame{width:100%;min-width:0;padding-top:10px;background:var(--paper-color,#fffdf3)}
.value-grid{width:calc(var(--day-column) + var(--plot-width) + var(--total-column));max-width:100%;margin:0 auto;background:var(--paper-color,#fffdf3)}
.plot-scale{display:flex;justify-content:space-between;gap:12px;margin:0 var(--total-column) 12px var(--day-column);color:#8a7656;font:9px/1.5 'Inter',sans-serif;letter-spacing:.13em;text-transform:uppercase}
.plot-scale>span:last-child{letter-spacing:.04em}
.plot-axis,.plot-row{display:grid;grid-template-columns:var(--day-column) var(--plot-width) var(--total-column)}
.plot-axis{height:29px;align-items:start}
.axis-day,.axis-total{color:#8c7a5e;font:8px/1.5 'Inter',sans-serif;letter-spacing:.12em;padding-top:1px}
.axis-day{text-align:center}.axis-total{text-align:right;padding-right:2px}
.plot-axis-track{position:relative;width:var(--plot-width);height:29px;color:#6e624d}
.plot-axis-track>span{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap;font:14px/1 'Caveat',cursive}
.plot-axis-track>span.first{transform:none}.plot-axis-track>span.last{transform:translateX(-100%)}
.sleep-grid .plot-axis-track>span{font:9px/1.5 'Inter',sans-serif}
.plot-body{position:relative;isolation:isolate}
.graph-lines{position:absolute;left:var(--day-column);top:0;bottom:0;width:var(--plot-width);z-index:-1;border:1px solid #a1a38b;background-color:var(--paper-color,#fffdf3);background-image:linear-gradient(90deg,#9a9f7b3b 1px,transparent 1px),linear-gradient(#9a9f7b3b 1px,transparent 1px),linear-gradient(90deg,#8a8f694f 1px,transparent 1px),linear-gradient(#8a8f694f 1px,transparent 1px);background-size:var(--grid-cell) var(--grid-cell),var(--grid-cell) var(--grid-cell),var(--major-column) var(--grid-row),var(--major-column) var(--grid-row)}
.plot-row{position:relative;align-items:center;width:100%;height:var(--grid-row);min-height:0!important;padding:0;border:0!important;background:transparent;text-align:left;color:#635744;cursor:pointer}
.plot-row:hover:not(:disabled){background:#b1b99c18}
.plot-row:focus-visible{outline:2px solid var(--tracker-accent);outline-offset:1px;z-index:2}
.plot-row:disabled{cursor:default}
.row-day{align-self:stretch;display:grid;place-items:center;padding-right:5px;color:#7a684c;font:16px/1 'Caveat',cursive}
.is-today .row-day{color:var(--tracker-accent);font-weight:600}
.plot-track{position:relative;display:block;height:100%;width:100%;background:none!important;min-width:0}
.marker-bar{position:absolute;inset:1px auto 1px 0;height:auto!important;background:color-mix(in srgb,var(--tracker-accent) 65%,transparent);border:1px solid color-mix(in srgb,var(--tracker-accent) 80%,#61503e);border-radius:1px;box-shadow:inset 0 3px #ffffff12;min-width:0;pointer-events:none}
.marker-bar.nap{background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--tracker-accent) 75%,transparent) 0 3px,#f5eddb99 3px 5px)}
.row-value{padding:0 1px 0 7px;text-align:right;color:#756348;font:11px/1.2 'Inter',sans-serif;overflow-wrap:anywhere}
.row-value b{color:#668051;font-size:10px;font-weight:400}
.zero-mark{position:absolute;top:50%;left:4px;transform:translateY(-50%);color:#8b8170;font-size:12px}
.off-schedule{position:absolute;inset:0;background:repeating-linear-gradient(135deg,transparent 0 5px,#b5ad961c 5px 6px);pointer-events:none}
.future .row-day{color:#b8b09d}.future .plot-track{opacity:.4}
.plot-caption{display:flex;flex-wrap:wrap;align-items:center;gap:4px 7px;margin:17px 0 0;color:#8b7a5e;font:11px/1.7 'Inter',sans-serif}
.zero-key{color:#76634c;white-space:nowrap}.legend-color{width:13px;height:10px;display:inline-block;background:var(--tracker-accent)}.nap-key{background:repeating-linear-gradient(135deg,var(--tracker-accent) 0 3px,#eee2cc 3px 5px)}
.compact .plot-scale{font-size:8px;margin-bottom:9px}.compact .row-day{font-size:13px}.compact .row-value{font-size:9px}.compact .plot-caption{font-size:9px}.compact .plot-axis-track>span{font-size:12px}.compact.sleep-grid .plot-axis-track>span{font-size:7px}
@media(max-width:650px){.plot-scale{font-size:9px}.row-value{font-size:10px;padding-left:4px}.plot-axis-track>span{font-size:14px}.sleep-grid .plot-axis-track>span{font-size:8px}.axis-day,.axis-total{font-size:7px}.plot-caption{font-size:10px}.compact .row-value{font-size:8px}}
</style>
