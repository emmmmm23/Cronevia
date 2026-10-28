<script setup lang="ts">
import {ref} from 'vue'
import {useAuthStore} from '@/stores/auth'
import UserAvatar from '@/components/shared/UserAvatar.vue'
import AvatarEditor from '@/components/AvatarEditor.vue'
import type {AvatarRecord} from '@/services/avatars'
const auth=useAuthStore(),editing=ref(false),message=ref('')
function saved(profile:AvatarRecord,cleanupPending:boolean){auth.acceptAvatarProfile(profile);editing.value=false;message.value=cleanupPending?'Photo and frame saved. An older upload may take longer to clean up.':'Photo and frame saved.'}
</script>
<template><div class="profile-portrait"><UserAvatar :profile="auth.profile" :size="108"/><button type="button" :disabled="!auth.profile" @click="editing=true;message=''">Edit photo &amp; frame</button><span v-if="message" role="status">{{message}}</span><AvatarEditor v-if="editing&&auth.profile" :profile="auth.profile" @close="editing=false" @saved="saved"/></div></template>
<style scoped>.profile-portrait{display:flex;flex-direction:column;align-items:center;gap:8px;flex:none;max-width:100%}.profile-portrait>button{min-height:44px;padding:8px 10px;border:1px solid #cdbd9f;border-radius:4px;background:#fcfaf5;color:#74283c;font-size:12px;cursor:pointer}.profile-portrait>button:focus-visible{outline:2px solid #74283c;outline-offset:3px}.profile-portrait>span{max-width:180px;font-size:11px;text-align:center;color:#476044;line-height:1.5}</style>
