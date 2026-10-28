<script setup lang="ts">
import {RouterLink} from 'vue-router'
const year=new Date().getFullYear()
</script>
<template><footer class="public-footer"><RouterLink :to="{name:'landing'}">Cronevia</RouterLink><p>© {{year}} Cronevia. Your memories, beautifully kept.</p><span>Plan it. Live it. Remember it.</span></footer></template>
<style scoped>.public-footer{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;padding:30px max(24px,calc((100vw - 1152px)/2));border-top:1px solid #3d2614;background:#2b1a10;color:#e5d4bb;font-size:12px}.public-footer a{display:inline-flex;align-items:center;min-height:44px;font:700 25px 'Playfair Display',Georgia,serif;color:#fdfaf5}.public-footer span{font-size:10px;text-transform:uppercase;letter-spacing:.12em}.public-footer a:focus-visible{outline:2px solid #fdfaf5;outline-offset:3px}@media(max-width:560px){.public-footer{flex-direction:column;text-align:center;gap:10px}}</style>
