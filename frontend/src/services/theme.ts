import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
export type Theme = 'vintage' | 'light' | 'dark'
export const appearance = ref<Theme>('vintage')
const key = 'cronevia:appearance'
let owner = '', generation = 0
export function applyTheme(value: unknown) {
  appearance.value = value === 'dark' || value === 'light' ? value : 'vintage'
  document.documentElement.dataset.theme = appearance.value
  document.documentElement.style.colorScheme = appearance.value === 'dark' ? 'dark' : 'light'
  try { localStorage.setItem(key, appearance.value) } catch { /* Storage may be unavailable. */ }
}
export function initializeTheme() {
  try { applyTheme(localStorage.getItem(key)) } catch { applyTheme('vintage') }
}
export async function loadAccountTheme(userId: string) {
  if (owner === userId) return
  owner = userId
  const current = ++generation
  const result = await supabase.from('user_settings').select('theme').eq('user_id', userId).maybeSingle()
  if (current !== generation) return
  if (!result.error) applyTheme(result.data?.theme)
  else owner = '' // Retry a failed load on the next profile refresh.
}
export function clearAccountTheme() { owner = ''; generation++; applyTheme('vintage') }
