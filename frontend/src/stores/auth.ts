import {safeReturnPath} from '@/services/account-security'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase, clearBrowserSession } from '@/lib/supabase'
import { accountError } from '@/services/account-security'
import { loadAccountTheme, clearAccountTheme } from '@/services/theme'
import { clearAvatarUrls } from '@/services/avatars'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { useJournalStore } from './journal'
import { useTripsStore } from './trips'
import { useMemoriesStore } from './memories'
import { useDashboardStore } from './dashboard'
import type { User } from '@/types'
import type { Database } from '@/types/database.types'
type Profile = Database['public']['Tables']['profiles']['Row']
export const useAuthStore = defineStore('auth', () => {
  const supabaseUser = ref<SupabaseUser | null>(null), profile = ref<Profile | null>(null)
  const initialized = ref(false), loading = ref(false), securityChecked = ref(false), mfaRequired = ref(false)
  const recoverySession = ref(false)
  const inlineReauth=ref(false)
  const isAuthenticated = computed(() => supabaseUser.value !== null)
  const user = computed<User | null>(() => {
    if (!supabaseUser.value || !profile.value) return null
    
    return {
      id: supabaseUser.value.id,
      email: supabaseUser.value.email!,
      profile: {
        full_name: profile.value.full_name,
        username: profile.value.username,
        avatar_url: profile.value.avatar_url,
        bio: profile.value.bio,
        timezone: profile.value.timezone ?? 'UTC',
        locale: profile.value.locale ?? 'en',
        role: profile.value.role,
        account_status: profile.value.account_status,
      },
      // Legacy compatibility
      name: profile.value.full_name,
      avatar_path: profile.value.avatar_url,
      timezone: profile.value.timezone ?? 'UTC',
      locale: profile.value.locale ?? 'en',
      created_at: profile.value.created_at,
    }
  })

  const isSuperAdmin = computed(() => profile.value?.role === 'super_admin')
  const isAccountActive = computed(() => profile.value?.account_status === 'active')
  let generation = 0
  function clearFeatureState() {
    clearAvatarUrls()
    useJournalStore().clearEntries(); useTripsStore().clearTrips()
    useMemoriesStore().clearMemories(); useDashboardStore().resetDashboardData()
  }
  async function fetchProfile() {
    if (!supabaseUser.value || !securityChecked.value || mfaRequired.value) { profile.value = null; return }
    const id = supabaseUser.value.id
    const {data,error} = await supabase.from('profiles').select('*').eq('user_id',id).single()
    if (supabaseUser.value?.id !== id) return
    profile.value = error ? null : data
    if (data && !error && data.account_status === 'active') await loadAccountTheme(id)
  }
  // A missing/failed MFA check never grants access. Auth and database checks are independent.
  let securityQueue:Promise<void>=Promise.resolve()
  function refreshSecurity(){
    const task=securityQueue.then(checkSecurity,checkSecurity)
    securityQueue=task.catch(()=>{})
    return task
  }
  async function checkSecurity() {
    const current = ++generation
    try {
      const result = await supabase.auth.getUser()
      if (current !== generation) return
      if (result.error || !result.data.user) { supabaseUser.value=null; profile.value=null; clearFeatureState(); return }
      if (supabaseUser.value?.id !== result.data.user.id) { profile.value=null; clearFeatureState() }
      supabaseUser.value=result.data.user
      const level = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (current !== generation) return
      if (level.error || !level.data?.currentLevel) throw new Error('Security verification unavailable')
      // getUser() supplies the live factor list; old JWTs cannot hide a newly enabled factor.
      const hasFactor = result.data.user.factors?.some(f=>f.status==='verified') || level.data.nextLevel==='aal2'
      mfaRequired.value=!!hasFactor && level.data.currentLevel!=='aal2'
      securityChecked.value=true
      if (mfaRequired.value) { profile.value=null; clearFeatureState() }
      else await fetchProfile()
    } catch { if(current===generation){securityChecked.value=false;profile.value=null;clearFeatureState()} }
  }
  async function initialize() {
    if(initialized.value)return
    loading.value=true
    try {
      supabase.auth.onAuthStateChange((event,session)=>{
        if(event==='PASSWORD_RECOVERY')recoverySession.value=true
        const changed=supabaseUser.value?.id!==session?.user.id
        supabaseUser.value=session?.user||null
        if(changed){profile.value=null;securityChecked.value=false;clearFeatureState()}
        if(!session){generation++;mfaRequired.value=false;recoverySession.value=false;clearAccountTheme()}
        else if(!loading.value && event!=='INITIAL_SESSION')setTimeout(()=>{void refreshSecurity()},0)
      })
      const {data,error}=await supabase.auth.getSession()
      if(!error && data.session?.user){supabaseUser.value=data.session.user;await refreshSecurity()}
    }catch{securityChecked.value=false;profile.value=null}
    finally{initialized.value=true;loading.value=false}
  }
  async function register(fullName:string,email:string,password:string,returnPath='/home') {
    loading.value=true
    try {
      const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:fullName},emailRedirectTo:new URL(safeReturnPath(returnPath,'/home'),window.location.origin).href}})
      if(error)return {success:false,error:accountError(error,'Your account could not be created. Please check your details and try again.')}
      if(data.session){supabaseUser.value=data.user;await refreshSecurity()}
      return {success:true}
    }catch{return {success:false,error:'Your account could not be created. Please try again.'}}
    finally{loading.value=false}
  }
  async function login(email:string,password:string) {
    loading.value=true
    try {
      const {data,error}=await supabase.auth.signInWithPassword({email,password})
      if(error||!data.user)return {success:false,error:accountError(error,'Unable to sign in with those details. Check your email and password.')}
      supabaseUser.value=data.user
      await refreshSecurity()
      if(!securityChecked.value)return {success:false,error:'Security verification is temporarily unavailable. Please retry signing in.'}
      if(!mfaRequired.value && (!profile.value || !isAccountActive.value)){
        await logout();return {success:false,error:'This account is unavailable. Please contact support if this continues.'}
      }
      return {success:true}
    }catch{return {success:false,error:'Sign-in is temporarily unavailable. Please try again.'}}
    finally{loading.value=false}
  }
  async function logout() {
    loading.value=true
    try {
      const {error}=await supabase.auth.signOut()
      if(error)await supabase.auth.signOut({scope:'local'})
      return !error
    }catch{return false
    }finally{
      clearBrowserSession()
      generation++;supabaseUser.value=null;profile.value=null;securityChecked.value=false;mfaRequired.value=false;recoverySession.value=false
      clearFeatureState();clearAccountTheme();loading.value=false
    }
  }
  async function updateProfile(updates:{full_name?:string;username?:string;bio?:string;avatar_url?:string;timezone?:string;locale?:string}) {
    if(!supabaseUser.value || !securityChecked.value || mfaRequired.value)return {success:false,error:'Please finish signing in.'}
    loading.value=true
    try {
      const {error}=await supabase.from('profiles').update(updates).eq('user_id',supabaseUser.value.id)
      if(error)return {success:false,error:'Your profile could not be saved. Please try again.'}
      await fetchProfile();return {success:true}
    }catch{return {success:false,error:'Your profile could not be saved. Please try again.'}}
    finally{loading.value=false}
  }
  // Password recovery relies on the server-verified recovery session. Account changes
  // use changeAccountPassword(), including current-password and fresh MFA verification.
  async function changePassword(newPassword:string) {
    if(!recoverySession.value)return {success:false,error:'Open a fresh password reset link from your email to continue.'}
    if(newPassword.length<12||newPassword.length>128)return {success:false,error:'Use a password between 12 and 128 characters.'}
    try {
      const {error}=await supabase.auth.updateUser({password:newPassword})
      if(error)return {success:false,error:accountError(error,'Your password could not be updated. Request a fresh reset link and try again.')}
      await logout();return {success:true}
    }catch{return {success:false,error:'Your password could not be updated. Please try again.'}}
  }
  async function requestPasswordReset(email:string) {
    try {
      const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/reset-password'})
      // Identical success copy prevents account enumeration. A genuine rate limit can be retried.
      if(error && error.status===429)return {success:false,error:accountError(error)}
      return {success:true}
    }catch{return {success:false,error:'The request could not be completed. Please try again.'}}
  }
  async function fetchCurrentUser(){await refreshSecurity()}
  function acceptAvatarProfile(saved:Profile){if(saved.user_id===supabaseUser.value?.id&&securityChecked.value&&!mfaRequired.value)profile.value=saved}
  return {user,supabaseUser,profile,initialized,loading,isAuthenticated,isSuperAdmin,isAccountActive,securityChecked,mfaRequired,recoverySession,inlineReauth,
    initialize,register,login,logout,updateProfile,changePassword,requestPasswordReset,fetchCurrentUser,fetchProfile,refreshSecurity,acceptAvatarProfile}
})
