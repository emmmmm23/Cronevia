import {onMounted,onBeforeUnmount} from 'vue'
/** The keyboard changes visualViewport on mobile without changing saved page geometry. */
export function useEditingViewport(){
 const sync=()=>{
  const viewport=window.visualViewport
  document.documentElement.style.setProperty('--visual-height',(viewport?.height||window.innerHeight)+'px')
  document.documentElement.style.setProperty('--keyboard-inset',Math.max(0,window.innerHeight-(viewport?.height||window.innerHeight)-(viewport?.offsetTop||0))+'px')
  const field=document.activeElement as HTMLElement
  if(field?.matches('input,textarea') && viewport && viewport.height<window.innerHeight*.8) field.scrollIntoView({block:'nearest',behavior:'instant'})
 }
 onMounted(()=>{sync();window.visualViewport?.addEventListener('resize',sync)})
 onBeforeUnmount(()=>window.visualViewport?.removeEventListener('resize',sync))
}
