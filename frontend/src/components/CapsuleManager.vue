<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'

type Capsule = { id: string; title: string; unlock_date: string; can_open: boolean }
type Filter = 'all' | 'sealed' | 'ready'
const capsules = ref<Capsule[]>([])
const title = ref(''), message = ref(''), date = ref('')
const loading = ref(true), saving = ref(false), openingId = ref<string | null>(null)
const formError = ref(''), collectionError = ref(''), notice = ref('')
const activeFilter = ref<Filter>('all')
const titleInput = ref<HTMLInputElement>(), dateInput = ref<HTMLInputElement>()
const readingDialog = ref<HTMLDialogElement>()
const collectionHeading = ref<HTMLHeadingElement>()
const opened = ref<{ title: string; message: string; date: string } | null>(null)
const utcToday = () => new Date().toISOString().slice(0, 10)
const tomorrow = computed(() => {
  const day = new Date(utcToday() + 'T00:00:00Z')
  day.setUTCDate(day.getUTCDate() + 1)
  return day.toISOString().slice(0, 10)
})
const wordCount = computed(() => message.value.trim().split(/\s+/).filter(Boolean).length)
const sealedCount = computed(() => capsules.value.filter(capsule => !capsule.can_open).length)
const readyCount = computed(() => capsules.value.filter(capsule => capsule.can_open).length)
const filters = computed(() => [
  { key: 'all' as const, label: 'All capsules', count: capsules.value.length },
  { key: 'sealed' as const, label: 'Sealed', count: sealedCount.value },
  { key: 'ready' as const, label: 'Ready to open', count: readyCount.value },
])
const visibleCapsules = computed(() => capsules.value
  .filter(capsule => activeFilter.value === 'all'
    || (activeFilter.value === 'ready' ? capsule.can_open : !capsule.can_open))
  .slice().sort((a, b) => a.unlock_date.localeCompare(b.unlock_date)))
const nextOpening = computed(() => capsules.value.filter(capsule => !capsule.can_open)
  .slice().sort((a, b) => a.unlock_date.localeCompare(b.unlock_date))[0])

function formatDate(value: string, short = false) {
  return new Date(value.slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-PH', {
    month: short ? 'short' : 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}
function daysUntil(value: string) {
  const days = Math.ceil((Date.parse(value.slice(0, 10) + 'T00:00:00Z')
    - Date.parse(utcToday() + 'T00:00:00Z')) / 86400000)
  return days === 1 ? '1 day to go' : Math.max(0, days) + ' days to go'
}
function chooseDate(months: number) {
  const target = new Date(utcToday() + 'T00:00:00Z')
  const day = target.getUTCDate()
  target.setUTCDate(1)
  target.setUTCMonth(target.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  date.value = target.toISOString().slice(0, 10)
}
function startWriting() {
  titleInput.value?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' })
  titleInput.value?.focus({ preventScroll: true })
}
async function viewCollection(filter: Filter) {
  activeFilter.value = filter
  await nextTick()
  collectionHeading.value?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
  collectionHeading.value?.focus({ preventScroll: true })
}
function errorMessage(error: unknown, fallback: string) {
  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message : fallback
}
async function load() {
  loading.value = true
  collectionError.value = ''
  try {
    const result = await supabase.rpc('list_capsules')
    if (result.error) throw result.error
    capsules.value = (result.data ?? []) as unknown as Capsule[]
  } catch (error) {
    collectionError.value = errorMessage(error, 'Your capsules could not be loaded. Please try again.')
  } finally { loading.value = false }
}
async function create() {
  if (saving.value) return
  formError.value = ''
  notice.value = ''
  if (!title.value.trim() || !message.value.trim()) {
    formError.value = 'Give your capsule a title and a message before sealing it.'
    return
  }
  if (!date.value || date.value <= utcToday()) {
    formError.value = 'Choose a date after today for your future self to open this capsule.'
    dateInput.value?.focus()
    return
  }
  saving.value = true
  try {
    const result = await supabase.rpc('create_capsule', {
      capsule_title: title.value.trim(), capsule_message: message.value.trim(), opens_on: date.value,
    })
    if (result.error) throw result.error
    const openingDate = formatDate(date.value)
    title.value = ''; message.value = ''; date.value = ''
    activeFilter.value = 'all'
    notice.value = 'Sealed with care. Your capsule will be ready on ' + openingDate + '.'
    await load()
  } catch (error) {
    formError.value = errorMessage(error, 'Your capsule could not be sealed. Your words are still here; please try again.')
  } finally { saving.value = false }
}
async function openCapsule(capsule: Capsule) {
  if (!capsule.can_open || openingId.value) return
  openingId.value = capsule.id
  collectionError.value = ''
  try {
    const result = await supabase.rpc('open_capsule', { capsule_id: capsule.id })
    if (result.error) throw result.error
    const data = result.data
    if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.message !== 'string') {
      throw new Error('This capsule could not be read. Please try opening it again.')
    }
    opened.value = { title: capsule.title, message: data.message, date: capsule.unlock_date }
    await nextTick()
    readingDialog.value?.showModal()
  } catch (error) {
    collectionError.value = errorMessage(error, 'Your capsule could not be opened. Please try again.')
  } finally { openingId.value = null }
}
onMounted(() => void load())
</script>

<template>
  <section class="time-capsules" aria-labelledby="capsules-title">
    <div class="capsules-container">
      <header class="capsules-hero">
        <div class="hero-copy">
          <p class="eyebrow"><span aria-hidden="true">✦</span> A KEEPSAKE FOR YOUR FUTURE SELF</p>
          <h1 id="capsules-title">Time <em>capsules.</em></h1>
          <p class="hero-description">Some words are worth waiting for. Seal a little of today,<br class="desktop-break" /> and let your future self find it.</p>
          <p class="hero-promise"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></svg>Yours to write. Time’s to keep.</p>
        </div>
        <div class="hero-illustration" aria-hidden="true">
          <svg viewBox="0 0 440 260" fill="none">
            <defs>
              <linearGradient id="capsule-paper" x1="109" y1="67" x2="354" y2="230" gradientUnits="userSpaceOnUse"><stop stop-color="#f8f0df" /><stop offset="1" stop-color="#e7d7bb" /></linearGradient>
              <linearGradient id="capsule-wax" x1="215" y1="112" x2="254" y2="158" gradientUnits="userSpaceOnUse"><stop stop-color="#a64856" /><stop offset="1" stop-color="#721d35" /></linearGradient>
              <filter id="capsule-shadow" x="-30%" y="-40%" width="170%" height="190%"><feDropShadow dx="0" dy="9" stdDeviation="9" flood-color="#584329" flood-opacity=".14" /></filter>
            </defs>
            <ellipse cx="236" cy="225" rx="157" ry="12" fill="#a68c60" opacity=".09" />
            <g transform="rotate(-11 218 124)" filter="url(#capsule-shadow)">
              <rect x="102" y="41" width="245" height="151" rx="3" fill="#e8ddc7" stroke="#cabc9e" />
              <rect x="112" y="51" width="225" height="131" rx="1" stroke="#cabc9e" stroke-dasharray="3 4" />
              <path d="m105 44 119 86L344 44" stroke="#c3b393" />
            </g>
            <g transform="rotate(5 231 145)" filter="url(#capsule-shadow)">
              <rect x="103" y="75" width="253" height="151" rx="3" fill="url(#capsule-paper)" stroke="#c7b696" />
              <path d="m104 224 96-81m155 81-96-81" stroke="#cdbd9d" />
              <path d="m104 77 112 81a22 22 0 0 0 26 0l112-81" fill="#f6edda" stroke="#c7b696" />
              <path d="m108 80 110 77a19 19 0 0 0 23 0l110-77" stroke="#fffaf0" stroke-width="2" />
              <path d="M228 130c9-5 12 1 18 3s11 4 12 12c3 10-3 13-7 20-6 7-13 4-21 5-10 0-12-7-16-14-5-10 0-15 4-20 4-4 5-4 10-6Z" fill="url(#capsule-wax)" stroke="#76273a" />
              <circle cx="235" cy="150" r="15" stroke="#cf8c93" stroke-opacity=".55" />
              <path d="M241 144c-8-6-16 1-12 9 3 5 9 5 13 1" stroke="#e9b4b1" stroke-width="1.5" stroke-linecap="round" />
              <text x="230" y="203" text-anchor="middle" font-family="Georgia, serif" font-size="8" letter-spacing="2.1" fill="#99815e">TO MY FUTURE SELF</text>
            </g>
            <g stroke="#87907a" stroke-width="1.4" stroke-linecap="round"><path d="M74 226c7-31 7-60-3-102" /><path d="M77 202c-12-3-21-12-21-23 12 2 19 12 21 23Zm1-27c9-5 14-14 12-24-9 5-13 12-12 24Zm-3-24c-10-3-16-10-16-20 10 2 15 10 16 20Zm-6-25c-1-9 1-15 6-22 6 9 2 16-6 22Z" fill="#d6dbc9" /></g>
            <g stroke="#bda77f" stroke-linecap="round"><path d="M370 53v13m-6-6h12m-20-36v7m-3-3h6M55 86v9m-4-4h8" /><circle cx="383" cy="106" r="2" /><circle cx="94" cy="35" r="2" /></g>
            <path d="M319 30c24-12 45-1 45 17" stroke="#bda77f" stroke-dasharray="3 4" />
          </svg>
          <span class="illustration-caption">A LITTLE OF NOW. A GIFT FOR LATER.</span>
        </div>
      </header>

      <nav class="capsule-overview" aria-label="Capsule overview">
        <div class="overview-intro"><span class="overview-mark" aria-hidden="true">C</span><div><p>A small archive of you</p><span>Written today. Rediscovered someday.</span></div></div>
        <button type="button" @click="viewCollection('sealed')"><strong>{{ loading ? '—' : String(sealedCount).padStart(2, '0') }}</strong><span>Sealed for later</span></button>
        <button type="button" class="ready-overview" @click="viewCollection('ready')"><strong>{{ loading ? '—' : String(readyCount).padStart(2, '0') }}</strong><span>Ready to open <span aria-hidden="true">↗</span></span></button>
      </nav>

      <div v-if="notice" class="capsule-notice" role="status"><span aria-hidden="true">✓</span><p>{{ notice }}</p><button type="button" aria-label="Dismiss confirmation" @click="notice = ''">×</button></div>

      <div class="capsules-layout">
        <section class="writing-desk" aria-labelledby="writing-title">
          <div class="stationery">
            <div class="stationery-masthead"><span>CRONEVIA</span><span>PERSONAL &amp; PRIVATE</span></div>
            <div class="writing-heading"><p class="eyebrow">CREATE A TIME CAPSULE</p><h2 id="writing-title">A little of today.</h2><p>A thought, a hope, a moment. What would you like to keep?</p></div>
            <form @submit.prevent="create">
              <fieldset :disabled="saving" class="capsule-fields">
                <label for="capsule-title" class="field-label"><span class="step-number">01</span> Give this moment a name</label>
                <input id="capsule-title" ref="titleInput" v-model="title" required maxlength="255" autocomplete="off" placeholder="For the person I’m becoming…" class="title-input" />
                <div class="message-heading"><label for="capsule-message" class="field-label"><span class="step-number">02</span> A message to your future self</label><span aria-hidden="true">✧</span></div>
                <div class="message-paper">
                  <span class="salutation" aria-hidden="true">Dear future me,</span>
                  <textarea id="capsule-message" v-model="message" required rows="6" placeholder="What does life feel like right now? What do you hope you’ll remember?" aria-describedby="capsule-message-hint" />
                  <div class="message-footer"><span id="capsule-message-hint">Your words, waiting for their day.</span><span>{{ wordCount }} {{ wordCount === 1 ? 'word' : 'words' }}</span></div>
                </div>
                <label for="capsule-date" class="field-label date-label"><span class="step-number">03</span> Choose its opening day</label>
                <div class="date-control"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4m8-4v4M4 11h16m-11 4h2m2 0h2" /></svg><input id="capsule-date" ref="dateInput" v-model="date" required type="date" :min="tomorrow" aria-describedby="capsule-date-hint" /></div>
                <div class="date-shortcuts"><span>A little inspiration:</span><button type="button" @click="chooseDate(1)">In a month</button><button type="button" @click="chooseDate(12)">In a year</button></div>
                <p id="capsule-date-hint" class="date-hint">Capsules open on their chosen date, in UTC.</p>
                <p v-if="formError" class="inline-error" role="alert">{{ formError }}</p>
                <button class="seal-button" type="submit" :disabled="saving" :aria-busy="saving"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></svg>{{ saving ? 'Sealing your capsule…' : 'Seal this moment' }}<span aria-hidden="true">→</span></button>
                <p class="sealing-note">Once sealed, your message stays hidden until its opening day.</p>
              </fieldset>
            </form>
          </div>
          <p class="desk-caption"><span aria-hidden="true">✦</span> For all the versions of you still to come.</p>
        </section>

        <section class="capsule-collection" aria-labelledby="collection-title" :aria-busy="loading">
          <div class="collection-heading"><div><p class="eyebrow">YOUR KEEPSAKE COLLECTION</p><h2 id="collection-title" ref="collectionHeading" tabindex="-1">{{ readyCount ? 'A moment has found you.' : 'Waiting for their moment.' }}</h2></div><span class="collection-total">{{ loading ? '—' : String(capsules.length).padStart(2, '0') }}</span></div>
          <p class="collection-description">Safely sealed. Patiently waiting. Always yours.</p>
          <div class="collection-filters" aria-label="Filter capsules">
            <button v-for="filter in filters" :key="filter.key" type="button" :aria-pressed="activeFilter === filter.key" @click="activeFilter = filter.key">{{ filter.label }} <span>{{ loading ? '—' : filter.count }}</span></button>
          </div>
          <div v-if="collectionError" class="collection-error" role="alert"><p>{{ collectionError }}</p><button type="button" :disabled="loading" @click="load">Try again <span aria-hidden="true">↻</span></button></div>
          <div v-if="loading" class="collection-loading" role="status"><div v-for="item in 2" :key="item" class="capsule-skeleton" aria-hidden="true"><span></span><span></span><span></span></div><p>Gathering your keepsakes…</p></div>
          <template v-else-if="!collectionError || capsules.length">
            <div v-if="!capsules.length" class="collection-empty">
              <div class="empty-envelope" aria-hidden="true"><span class="envelope-fold"></span><span class="envelope-seal">C</span></div>
              <p class="empty-kicker">EVERY KEEPSAKE STARTS WITH A FEW WORDS</p><h3>Your first capsule awaits.</h3><p>A birthday wish. A note from an ordinary Tuesday.<br />A little reminder of who you are today.</p>
              <button type="button" @click="startWriting">Write your first capsule <span aria-hidden="true">↗</span></button>
            </div>
            <div v-else-if="!visibleCapsules.length" class="filtered-empty"><span aria-hidden="true">◷</span><h3>{{ activeFilter === 'ready' ? 'Good things take a little time.' : 'Nothing sealed away just yet.' }}</h3><p>{{ activeFilter === 'ready' ? 'Your capsules will be here when their opening day arrives.' : 'Your ready capsules are waiting to be read.' }}</p><button type="button" @click="activeFilter = 'all'">View all capsules</button></div>
            <div v-else class="capsule-list">
              <article v-for="capsule in visibleCapsules" :key="capsule.id" class="keepsake-card" :class="{ 'is-ready': capsule.can_open }">
                <div class="keepsake-top"><span class="capsule-category">A NOTE TO MY FUTURE SELF</span><span class="capsule-badge"><span aria-hidden="true">{{ capsule.can_open ? '✦' : '◷' }}</span> {{ capsule.can_open ? 'Ready to open' : 'Sealed' }}</span></div>
                <div class="keepsake-content"><div><h3>{{ capsule.title }}</h3><p>{{ capsule.can_open ? 'Its day has finally arrived.' : 'A little of the past, waiting for you.' }}</p></div><span class="mini-seal" aria-hidden="true">C</span></div>
                <div class="keepsake-footer"><div><small>{{ capsule.can_open ? 'READY SINCE' : 'OPEN ON' }}</small><time :datetime="capsule.unlock_date">{{ formatDate(capsule.unlock_date, true) }}</time></div><button v-if="capsule.can_open" type="button" :disabled="!!openingId" :aria-busy="openingId === capsule.id" @click="openCapsule(capsule)">{{ openingId === capsule.id ? 'Opening…' : 'Break the seal' }} <span aria-hidden="true">↗</span></button><span v-else class="capsule-countdown"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>{{ daysUntil(capsule.unlock_date) }}</span></div>
              </article>
            </div>
          </template>
          <div class="collection-footnote"><span aria-hidden="true">✧</span><p v-if="nextOpening">Your next little reunion: <strong>{{ formatDate(nextOpening.unlock_date) }}</strong>.</p><p v-else>Some memories get even sweeter with time.</p></div>
        </section>
      </div>
      <footer class="capsules-footer"><span></span>KEEP A MOMENT. MEET IT AGAIN.<span></span></footer>
    </div>

    <dialog ref="readingDialog" class="reading-dialog" aria-labelledby="reading-title" @close="opened = null">
      <article v-if="opened" class="opened-letter">
        <div class="reading-topline"><span>A MOMENT, RETURNED TO YOU</span><button type="button" aria-label="Close capsule" @click="readingDialog?.close()">×</button></div>
        <span class="opened-seal" aria-hidden="true">C</span><p class="eyebrow">FROM YOUR PAST SELF, WITH LOVE</p><h2 id="reading-title">{{ opened.title }}</h2><p class="reading-date">Kept for {{ formatDate(opened.date) }}</p><div class="opened-message">{{ opened.message }}</div><p class="reading-signature">A little of who you were. Always a part of who you are.</p><button type="button" class="reading-close" @click="readingDialog?.close()">Keep it close <span aria-hidden="true">♡</span></button>
      </article>
    </dialog>
  </section>
</template>

<style scoped>
.time-capsules {
  --wine: #79283e;
  --wine-dark: #612033;
  --ink: #40372c;
  --muted: #807563;
  --line: #ded2bd;
  --paper: #fdfaf3;
  min-height: calc(100dvh - 64px);
  background: radial-gradient(ellipse at 90% 8%, #e6dcc433, transparent 45%), #f6f0e4;
  color: var(--ink);
}
.capsules-container { max-width: 1200px; margin: 0 auto; padding: 46px 36px 30px; }
.capsules-hero { display: grid; grid-template-columns: 1.35fr 1fr; align-items: center; gap: 30px; padding-bottom: 32px; border-bottom: 1px solid var(--line); }
.eyebrow { margin: 0; color: #8f7657; font: 500 10px/1.6 'Inter', sans-serif; letter-spacing: .17em; }
.hero-copy > .eyebrow { display: flex; align-items: center; gap: 9px; }
.hero-copy > .eyebrow span { color: var(--wine); font-size: 16px; }
.hero-copy h1 { margin: 17px 0 15px; color: var(--wine); font: 400 clamp(44px, 4.3vw, 60px)/1.1 'Playfair Display', Georgia, serif; letter-spacing: -.04em; }
.hero-copy h1 em { font-weight: 400; }
.hero-description { margin: 0; color: #7d715e; font: 18px/1.7 'Crimson Text', Georgia, serif; }
.hero-promise { display: flex; align-items: center; gap: 7px; margin: 19px 0 0; color: #8b7d68; font-size: 11px; }
.hero-promise svg, .seal-button svg, .date-control svg, .capsule-countdown svg { width: 16px; height: 16px; flex-shrink: 0; fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }
.hero-illustration { align-self: stretch; display: flex; flex-direction: column; justify-content: center; }
.hero-illustration > svg { display: block; width: 100%; height: auto; max-height: 232px; }
.illustration-caption { margin: 2px 0 0; text-align: center; font-size: 8px; color: #a18b68; letter-spacing: .21em; }
.capsule-notice { display: flex; gap: 11px; align-items: center; margin: 22px 0 -6px; padding: 13px 16px; border: 1px solid #c7d0ba; border-radius: 3px; background: #edf0e6; color: #506446; }
.capsule-notice p { flex: 1; margin: 0; font-size: 12px; line-height: 1.6; }
.capsule-notice > span { display: grid; place-items: center; width: 24px; height: 24px; flex-shrink: 0; border: 1px solid #becab1; border-radius: 50%; font-size: 12px; }
.capsule-notice button { min-width: 36px; min-height: 36px; font-size: 23px; cursor: pointer; }
.capsules-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, .96fr); align-items: start; gap: 44px; margin-top: 35px; }
.writing-desk { min-width: 0; }
.stationery { position: relative; padding: 24px 29px 22px; border: 1px solid #ddd0b7; border-radius: 3px; background: linear-gradient(105deg, #fffdf7, #fcf8ee); box-shadow: 0 3px 4px #5c44220a, 0 14px 30px #5c442207; }
.stationery::before { position: absolute; top: -5px; right: 6px; left: 6px; height: 4px; border: 1px solid #e3d8c6; border-bottom: 0; border-radius: 3px 3px 0 0; background: #f9f4e9; content: ''; }
.stationery-masthead { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 15px; border-bottom: 1px solid var(--line); color: #9d8a6d; font-size: 8px; letter-spacing: .18em; }
.stationery-masthead > span:first-child { font-family: 'Playfair Display', Georgia, serif; font-size: 11px; letter-spacing: .14em; }
.writing-heading { margin: 22px 0 23px; }
.writing-heading .eyebrow { font-size: 9px; }
.writing-heading h2 { margin: 6px 0 8px; color: var(--wine); font: 400 30px/1.3 'Playfair Display', Georgia, serif; letter-spacing: -.03em; }
.writing-heading > p:last-child { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.7; }
.capsule-fields { min-width: 0; margin: 0; padding: 0; border: 0; }
.field-label { display: flex; align-items: center; gap: 8px; color: #5e503d; font-size: 12px; font-weight: 500; }
.step-number { display: grid; place-items: center; width: 21px; height: 21px; flex-shrink: 0; border: 1px solid #dbcfba; border-radius: 50%; color: #a08663; font: 10px Georgia, serif; }
.title-input { width: 100%; min-height: 45px; margin: 9px 0 23px; padding: 11px 13px; border: 1px solid #dfd4c1; border-radius: 2px; background: #fffdf8; color: var(--ink); font: 16px 'Crimson Text', Georgia, serif; }
.title-input::placeholder { color: #ad9e87; font-style: italic; }
.message-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 9px; }
.message-heading > span { color: #a99473; font-size: 16px; }
.message-paper { padding: 15px 15px 0; border: 1px solid #e2d8c5; border-radius: 2px; background: #fcf9f0; }
.salutation { display: block; margin-bottom: 7px; color: #94795c; font: 23px/1.4 'Caveat', cursive; }
.message-paper textarea { display: block; width: 100%; min-height: 174px; padding: 0; border: 0; border-radius: 0; outline: 0; resize: vertical; background: repeating-linear-gradient(transparent, transparent 28px, #e8dfcd 28px, #e8dfcd 29px); color: #594c3d; font: 16px/29px 'Crimson Text', Georgia, serif; }
.message-paper textarea::placeholder { color: #ad9e87; }
.message-paper:focus-within { outline: 2px solid #9d617550; outline-offset: 2px; }
.message-footer { display: flex; justify-content: space-between; gap: 9px; padding: 11px 0; color: #9c8c73; font-size: 9px; line-height: 1.5; }
.message-footer > span:last-child { white-space: nowrap; }
.date-label { margin: 23px 0 9px; }
.date-control { display: flex; align-items: center; gap: 9px; min-height: 45px; padding: 0 13px; border: 1px solid #dfd4c1; border-radius: 2px; background: #fffdf8; color: #967c59; }
.date-control input { width: 100%; min-width: 0; min-height: 43px; padding: 8px 0; border: 0; background: transparent; color: #6e604e; font-family: 'Inter', sans-serif; font-size: 12px; color-scheme: light; }
.date-control:focus-within { outline: 2px solid #9d617550; outline-offset: 2px; }
.date-control input:focus { outline: 0; }
.date-shortcuts { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; margin-top: 8px; font-size: 10px; color: #9b886b; }
.date-shortcuts button { min-height: 32px; padding: 5px 9px; border: 1px solid #e2d7c3; border-radius: 3px; background: #f7f1e5; color: #8c7759; font-size: 10px; cursor: pointer; transition: border-color .2s, background .2s; }
.date-shortcuts button:hover { border-color: #b5a081; background: #efe5d3; }
.date-hint { margin: 6px 0 0; color: #9c8c73; font-size: 10px; line-height: 1.6; }
.seal-button { display: flex; align-items: center; justify-content: center; gap: 9px; width: 100%; min-height: 47px; margin-top: 22px; padding: 12px 15px; border: 1px solid #6c2237; border-radius: 3px; background: var(--wine); color: #fcf5e8; font: 500 12px 'Inter', sans-serif; cursor: pointer; box-shadow: inset 0 1px #ffffff16, 0 2px 3px #61203312; transition: background .2s, transform .2s; }
.seal-button:hover:not(:disabled) { background: var(--wine-dark); transform: translateY(-1px); }
.seal-button > span { margin-left: auto; }
.seal-button svg { margin-right: auto; }
.seal-button:disabled { opacity: .65; cursor: wait; }
.sealing-note { margin: 10px 0 0; color: #9d8a6e; font-size: 9px; line-height: 1.7; text-align: center; }
.inline-error { margin: 15px 0 0; padding: 10px 12px; border-left: 2px solid var(--wine); background: #f6e8e3; color: #8b3745; font-size: 12px; line-height: 1.6; }
.desk-caption { display: flex; justify-content: center; align-items: center; gap: 8px; margin: 15px 0 0; color: #9b8461; font: italic 14px 'Crimson Text', Georgia, serif; }
.desk-caption span { font-size: 10px; }
.capsule-collection { min-width: 0; padding-top: 3px; }
.collection-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.collection-heading .eyebrow { font-size: 9px; }
.collection-heading h2 { margin: 7px 0 0; color: var(--wine); font: 400 27px/1.35 'Playfair Display', Georgia, serif; letter-spacing: -.03em; }
.collection-total { min-width: 35px; color: #bfa98a; font: italic 38px 'Crimson Text', Georgia, serif; }
.collection-description { margin: 10px 0 18px; color: #968366; font-size: 12px; }
.collection-filters { display: flex; gap: 3px; padding: 5px; border: 1px solid #e1d6c3; border-radius: 4px; background: #eee6d7; }
.collection-filters button { display: flex; justify-content: center; align-items: center; gap: 6px; flex: 1; min-height: 36px; padding: 7px 5px; border: 1px solid transparent; border-radius: 2px; color: #8b7b63; font-size: 11px; white-space: nowrap; cursor: pointer; transition: color .2s, background .2s; }
.collection-filters button[aria-pressed='true'] { border-color: #ddd0b9; background: #fdfaf3; color: var(--wine); box-shadow: 0 1px 3px #5d462315; }
.collection-filters button > span { min-width: 17px; padding: 2px 3px; border-radius: 50%; background: #dfd3bd60; color: #8b7b63; font-size: 9px; }
.capsule-list { display: grid; gap: 15px; margin-top: 17px; }
.keepsake-card { position: relative; overflow: hidden; padding: 18px 19px 0; border: 1px solid #d8c9ad; border-radius: 3px; background: linear-gradient(140deg, #f6eedf, #eee2cc); box-shadow: 0 3px 6px #6a502207; }
.keepsake-card::before { position: absolute; left: 0; right: 0; top: -1px; height: 5px; background: repeating-linear-gradient(90deg, #c5b394 0 7px, transparent 7px 12px); opacity: .35; content: ''; }
.keepsake-card.is-ready { border-color: #bac3a8; background: linear-gradient(140deg, #f3f3e8, #e7ebda); }
.keepsake-card.is-ready::before { background: repeating-linear-gradient(90deg, #85956f 0 7px, transparent 7px 12px); }
.keepsake-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.capsule-category { color: #9a815b; font-size: 8px; letter-spacing: .12em; }
.capsule-badge { display: flex; align-items: center; gap: 4px; flex-shrink: 0; padding: 4px 7px; border: 1px solid #cdbb9a; border-radius: 2px; color: #8b7350; font-size: 9px; }
.is-ready .capsule-badge { border-color: #bdc5a9; color: #6e7c54; }
.keepsake-content { display: flex; gap: 15px; align-items: center; justify-content: space-between; padding: 18px 0 20px; }
.keepsake-content > div { min-width: 0; }
.keepsake-content h3 { margin: 0; overflow-wrap: anywhere; color: #6e442c; font: 400 23px/1.35 'Crimson Text', Georgia, serif; }
.keepsake-content p { margin: 7px 0 0; color: #99815d; font: italic 14px 'Crimson Text', Georgia, serif; }
.is-ready .keepsake-content h3 { color: #5c674b; }
.mini-seal { display: grid; place-items: center; flex-shrink: 0; width: 35px; height: 35px; border: 3px double #b78280; border-radius: 46% 51% 44% 52%; background: #854255; color: #e1b5a6; font: italic 19px Georgia, serif; box-shadow: 1px 2px 2px #76502820; transform: rotate(-9deg); }
.is-ready .mini-seal { border-color: #b7c2a3; background: #778365; color: #e6e8d3; }
.keepsake-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 60px; border-top: 1px dashed #cfbe9c; }
.keepsake-footer > div { display: grid; gap: 4px; padding: 12px 0; }
.keepsake-footer small { color: #9a805b; font-size: 8px; letter-spacing: .13em; }
.keepsake-footer time { color: #7d6b50; font-size: 11px; }
.keepsake-footer button { display: flex; align-items: center; gap: 9px; min-height: 44px; color: #5e6c48; font-size: 11px; font-weight: 600; cursor: pointer; }
.keepsake-footer button:disabled { opacity: .6; cursor: wait; }
.capsule-countdown { display: flex; align-items: center; gap: 6px; color: #9b815c; font-size: 10px; }
.capsule-countdown svg { width: 13px; height: 13px; }
.collection-empty { display: flex; flex-direction: column; align-items: center; padding: 48px 15px 38px; margin-top: 17px; border: 1px dashed #d9ccb3; border-radius: 3px; background: #f8f3e980; text-align: center; }
.empty-envelope { position: relative; overflow: hidden; width: 131px; height: 86px; margin: 5px 0 27px; border: 1px solid #cbbb9c; border-radius: 3px; background: #eee2ca; transform: rotate(-5deg); box-shadow: 5px 6px 0 -1px #f6f0e4, 5px 6px 0 0 #dacdb5; }
.empty-envelope::before, .empty-envelope::after { position: absolute; top: 43px; left: -13px; width: 99px; height: 70px; border-top: 1px solid #d2c2a1; content: ''; transform: rotate(-35deg); }
.empty-envelope::after { left: auto; right: -13px; transform: rotate(35deg); }
.envelope-fold { position: absolute; top: -49px; left: 17px; width: 96px; height: 85px; border-right: 1px solid #cbbb9c; border-bottom: 1px solid #cbbb9c; border-radius: 0 0 8px; background: #f6eddb; transform: rotate(45deg); }
.envelope-seal { position: absolute; z-index: 1; top: 29px; left: 52px; display: grid; place-items: center; width: 26px; height: 26px; border: 3px double #b5837d; border-radius: 48% 45% 48% 42%; background: #854255; color: #e7bca9; font: italic 14px Georgia, serif; }
.empty-kicker { color: #a58c67; font-size: 8px; letter-spacing: .12em; }
.collection-empty h3 { margin: 9px 0 10px; color: #7e6545; font: 400 24px 'Playfair Display', Georgia, serif; letter-spacing: -.03em; }
.collection-empty > p:not(.empty-kicker) { margin: 0; color: #9d8868; font: 16px/1.8 'Crimson Text', Georgia, serif; }
.collection-empty > button { display: flex; align-items: center; gap: 12px; min-height: 44px; margin-top: 14px; color: var(--wine); font-size: 11px; cursor: pointer; }
.filtered-empty { padding: 45px 25px; text-align: center; }
.filtered-empty > span { color: #b19b76; font: 33px Georgia, serif; }
.filtered-empty h3 { margin: 12px 0; color: #8b7151; font: 400 20px 'Playfair Display', Georgia, serif; }
.filtered-empty p { color: #998b74; font-size: 12px; line-height: 1.6; }
.filtered-empty button { min-height: 44px; color: var(--wine); font-size: 11px; cursor: pointer; }
.collection-footnote { display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: 17px; color: #a28e6f; }
.collection-footnote > span { font-size: 15px; }
.collection-footnote p { margin: 0; color: #9d8461; font: italic 14px/1.6 'Crimson Text', Georgia, serif; text-align: center; }
.collection-footnote strong { font-weight: 400; }
.collection-error { margin-top: 16px; padding: 13px 14px; border: 1px solid #dfbeb7; border-radius: 3px; background: #f7ece5; color: #8c4b49; }
.collection-error p { margin: 0; font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
.collection-error button { min-height: 40px; margin-top: 5px; font-size: 11px; cursor: pointer; }
.collection-loading { padding-top: 17px; }
.collection-loading > p { color: #9e8c6f; font-size: 11px; text-align: center; }
.capsule-skeleton { display: grid; gap: 15px; margin-bottom: 15px; padding: 24px; border: 1px solid #e1d7c6; border-radius: 3px; background: #f0e7d8; }
.capsule-skeleton span { width: 72%; height: 9px; border-radius: 2px; background: #e2d6c0; animation: capsule-breathe 1.5s ease-in-out infinite alternate; }
.capsule-skeleton span:nth-child(2) { width: 90%; height: 17px; }
.capsule-skeleton span:nth-child(3) { width: 45%; }
.capsules-footer { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 45px; color: #a58c66; font-size: 8px; letter-spacing: .18em; text-align: center; }
.capsules-footer > span { width: 48px; height: 1px; background: #ded2bd; }
.time-capsules button:focus-visible, .title-input:focus-visible { outline: 2px solid #986579; outline-offset: 3px; }
.reading-dialog { position: fixed; inset: 0; width: min(580px, calc(100% - 28px)); max-height: calc(100dvh - 48px); margin: auto; padding: 0; overflow-y: auto; border: 1px solid #c8b793; border-radius: 4px; background: var(--paper); color: var(--ink); box-shadow: 0 20px 90px #23160e50; }
.reading-dialog::backdrop { background: #32271f80; backdrop-filter: blur(4px); }
.opened-letter { padding: 22px 34px 28px; text-align: center; background: radial-gradient(ellipse at 10% 2%, #f1e6ce80, transparent 60%); }
.reading-topline { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-bottom: 13px; border-bottom: 1px solid var(--line); color: #aa9470; font-size: 9px; letter-spacing: .15em; text-align: left; }
.reading-topline button { display: grid; place-items: center; width: 40px; height: 40px; color: #967b5e; font-size: 26px; cursor: pointer; }
.opened-seal { display: grid; place-items: center; width: 47px; height: 47px; margin: 25px auto 18px; border: 4px double #b3807f; border-radius: 48% 45% 49% 44%; background: #854255; color: #e8bca9; font: italic 26px Georgia, serif; transform: rotate(-9deg); }
.opened-letter h2 { margin: 11px 0 9px; overflow-wrap: anywhere; color: var(--wine); font: 400 31px/1.3 'Playfair Display', Georgia, serif; }
.reading-date { color: #9d896c; font-size: 11px; }
.opened-message { margin: 24px 0; padding-block: 22px; border-block: 1px solid var(--line); white-space: pre-wrap; overflow-wrap: anywhere; color: #64513c; font: 18px/1.9 'Crimson Text', Georgia, serif; text-align: left; }
.reading-signature { color: #a18a69; font: italic 15px/1.7 'Crimson Text', Georgia, serif; }
.reading-close { display: inline-flex; justify-content: center; align-items: center; gap: 22px; min-height: 44px; margin-top: 14px; padding: 11px 23px; border: 1px solid #c9b796; border-radius: 2px; color: var(--wine); font-size: 12px; cursor: pointer; }
@keyframes capsule-breathe { from { opacity: .45; } to { opacity: 1; } }
.capsule-overview { display: grid; grid-template-columns: 1fr auto auto; align-items: center; margin-top: 24px; border: 1px solid var(--line); background: #fbf7ed; border-radius: 5px; }
.overview-intro { display: flex; align-items: center; gap: 14px; padding: 18px 22px; }
.overview-mark { display: grid; place-items: center; width: 39px; height: 39px; border: 1px solid #c6b797; border-radius: 50%; color: var(--wine); font: italic 24px Georgia, serif; }
.overview-intro p { margin: 0 0 4px; color: #675139; font: 20px 'Crimson Text', Georgia, serif; }
.overview-intro div > span { color: #7b705f; font-size: 12px; }
.capsule-overview > button { display: flex; align-items: center; gap: 14px; align-self: stretch; min-height: 76px; padding: 16px 25px; border-left: 1px solid var(--line); color: #705c40; text-align: left; cursor: pointer; }
.capsule-overview > button:hover { background: #efe6d6; }
.capsule-overview strong { font: 30px 'Crimson Text', Georgia, serif; }
.capsule-overview > button > span { font-size: 12px; line-height: 1.5; }
.capsule-overview > .ready-overview { color: #506144; background: #e9eddf; }
#collection-title { scroll-margin-top: 90px; }
.hero-description { color: #695e4e; }
.field-label, .writing-heading > p:last-child { font-size: 14px; }
.message-footer, .date-hint, .sealing-note { color: #796b55; font-size: 11px; }
.date-shortcuts { color: #796b55; font-size: 11px; }
.date-shortcuts button { min-height: 44px; font-size: 12px; color: #715d41; }
.seal-button { min-height: 50px; font-size: 14px; }
.collection-filters button { min-height: 44px; }
.keepsake-footer time, .keepsake-footer button, .capsule-countdown { font-size: 12px; }
.keepsake-content p { color: #7c684b; font-size: 16px; }
.capsule-badge { font-size: 11px; }
.reading-topline button, .capsule-notice button { min-width: 44px; min-height: 44px; }
@media (min-width: 1400px) { .capsules-container { padding-top: 55px; } .capsules-hero { padding-bottom: 38px; } }
@media (max-width: 1000px) { .capsules-container { padding: 35px 25px 25px; } .capsules-layout { gap: 25px; } .stationery { padding: 22px; } .collection-heading h2 { font-size: 24px; } .hero-copy h1 { font-size: 48px; } .hero-description { font-size: 17px; } .desktop-break { display: none; } .collection-filters button { gap: 4px; font-size: 10px; } }
@media (max-width: 760px) {
  .capsules-container { max-width: 580px; padding: 26px 20px; }
  .capsules-hero { grid-template-columns: 1fr; gap: 5px; padding-bottom: 23px; }
  .hero-copy > .eyebrow { font-size: 9px; }
  .hero-copy h1 { font-size: 46px; }
  .hero-description { max-width: 390px; font-size: 18px; }
  .hero-illustration { width: 260px; max-width: 90%; margin: 0 auto; }
  .hero-illustration > svg { max-height: 155px; }
  .illustration-caption { font-size: 7px; }
  .hero-promise { margin-top: 13px; }
  .capsules-layout { grid-template-columns: 1fr; gap: 35px; margin-top: 29px; }
  .stationery { padding: 21px; }
  .collection-heading h2 { font-size: 26px; }
  .date-control input { font-size: 16px; }
  .date-shortcuts { gap: 8px; }
  .date-shortcuts button { min-height: 36px; }
  .collection-filters button { min-height: 40px; font-size: 11px; }
  .collection-empty { padding-block: 41px 30px; }
  .message-footer { font-size: 8px; }
}
@media (max-width: 370px) { .capsules-container { padding-inline: 13px; } .stationery { padding: 18px; } .collection-filters button { gap: 3px; font-size: 10px; } .keepsake-card { padding-inline: 14px; } .collection-heading h2 { font-size: 23px; } .capsule-category { font-size: 7px; } .opened-letter { padding-inline: 22px; } }
@media (max-width: 760px) {
  .capsule-overview { grid-template-columns: 1fr 1fr; margin-top: 20px; }
  .overview-intro { grid-column: 1 / -1; padding: 16px; border-bottom: 1px solid var(--line); }
  .capsule-overview > button { min-height: 70px; padding: 12px 16px; gap: 10px; }
  .capsule-overview > button:first-of-type { border-left: 0; }
  .title-input, .message-paper textarea { font-size: 18px; }
  .date-shortcuts button, .collection-filters button { min-height: 44px; }
  .message-footer { font-size: 10px; }
  .keepsake-top { flex-wrap: wrap; }
  .keepsake-footer { flex-wrap: wrap; gap: 4px 12px; }
  .capsule-category { font-size: 9px; }
  .collection-empty > button, .filtered-empty button { font-size: 14px; }
}
@media (prefers-reduced-motion: reduce) { .capsule-skeleton span { animation: none; } .seal-button { transition: none; } }
</style>
