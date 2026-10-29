<script setup lang="ts">
import {computed} from 'vue'
import {RouterLink} from 'vue-router'
import {useAuthStore} from '@/stores/auth'
import AppNavbar from '@/components/public/PublicNavbar.vue'
import AppFooter from '@/components/public/PublicFooter.vue'
const auth=useAuthStore()
const isAuthenticated=computed(()=>auth.isAuthenticated)
const features=[
 {mark:'✎',name:'A journal of your own',text:'A place for your thoughts, photographs, and the little details you want to keep.'},
 {mark:'☾',name:'Your everyday rhythms',text:'Notice your habits, restful nights, and small rituals on pages you can make your own.'},
 {mark:'⌁',name:'Journeys, near and far',text:'Gather places, shape your itinerary, and keep the story of each trip together.'},
 {mark:'▧',name:'A home for your memories',text:'Collect photographs and moments in a personal archive to return to whenever you like.'},
 {mark:'✉',name:'Something for the future',text:'Write a letter or seal a time capsule. Leave a little of today for another day.'},
 {mark:'↺',name:'A reason to look back',text:'Revisit your timeline and rediscover the moments you kept on this day in years gone by.'},
]
</script>
<template>
 <div class="landing-page">
  <AppNavbar/>
  <main>
   <section class="landing-hero">
    <div class="hero-copy">
     <p class="archive-label"><span aria-hidden="true">✦</span> A PERSONAL ARCHIVE, MADE FOR YOU</p>
     <h1>Your journeys,<br/><em>written in time.</em></h1>
     <p class="hero-description">For the places you’ve been, the days that shaped you, and the little things you thought you’d never forget.</p>
     <p class="hero-handwriting">A life is made of moments. Keep yours close.</p>
     <div class="landing-actions">
      <template v-if="!isAuthenticated"><RouterLink :to="{name:'register'}" class="landing-primary">Start Writing <span aria-hidden="true">↗</span></RouterLink><RouterLink :to="{name:'login'}" class="landing-secondary">Sign In</RouterLink></template>
      <RouterLink v-else :to="{name:'home'}" class="landing-primary">Open your journal <span aria-hidden="true">↗</span></RouterLink>
     </div>
     <p class="hero-footnote">Your journal. Your memories. Your own little corner of time.</p>
    </div>
    <div class="notebook-scene" aria-hidden="true">
     <div class="book-back"></div>
     <div class="sample-page">
      <div class="sample-topline"><span>CRONEVIA FIELD NOTES</span><span>No. 01</span></div>
      <p class="sample-heading">The little things.</p>
      <div class="memory-photo"><span class="paper-tape"></span><svg viewBox="0 0 400 235" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="235" fill="#c8b99a"/><circle cx="300" cy="62" r="29" fill="#eddbb2"/><path d="M0 163 112 62 227 174 311 105 400 161V235H0Z" fill="#8a8d70"/><path d="M0 190 100 147 201 190 298 163 400 185V235H0Z" fill="#686f57"/><path d="M0 205Q110 182 210 210T400 201V235H0Z" fill="#aa9a78"/><path d="M31 217H108M142 223H207M253 218H350" stroke="#e7dbc1" stroke-width="2"/></svg><span>somewhere worth remembering.</span></div>
      <p class="sample-note">A slow morning.<br/>A new place. A familiar feeling.</p>
      <div class="sample-lines"><span></span><span></span></div>
      <div class="sample-bottom"><span>one day, one page.</span><span class="ink-seal">C</span></div>
     </div>
     <span class="scene-caption">a few pages from a life well noticed.</span>
    </div>
   </section>
   <div class="landing-divider" aria-hidden="true"><span></span><i>✧</i><span></span></div>
   <section id="features" class="landing-features">
    <header><p class="archive-label">THERE’S A PAGE FOR THAT.</p><h2>Everything your memories deserve</h2><p>From an ordinary Tuesday to a once-in-a-lifetime journey.<br class="desktop-break"/> Make room for all the things that make a life.</p></header>
    <div class="feature-pages"><article v-for="(feature,index) in features" :key="feature.name"><div class="feature-top"><span class="feature-mark" aria-hidden="true">{{feature.mark}}</span><span class="feature-number">0{{index+1}}</span></div><h3>{{feature.name}}</h3><p>{{feature.text}}</p></article></div>
   </section>
   <section class="landing-invitation"><div><p class="archive-label">THE NEXT PAGE IS YOURS.</p><h2>Every journey deserves<br/><em>to be remembered.</em></h2><p>Start with a thought, a photograph, or something small about today.</p><RouterLink :to="{name:isAuthenticated?'home':'register'}" class="landing-primary">{{isAuthenticated?'Continue your story':'Create Free Account'}} <span aria-hidden="true">↗</span></RouterLink><span class="invitation-handwriting">Someday, you’ll be glad you kept it.</span></div><span class="invitation-flourish" aria-hidden="true">✧</span></section>
  </main>
  <AppFooter/>
 </div>
</template>
<style scoped>
.landing-page{min-height:100dvh;background:#f5ebdd;color:#2b1a10;background-image:radial-gradient(#785b3310 .65px,transparent .65px);background-size:5px 5px}
.landing-hero{max-width:1180px;margin:auto;padding:48px 22px 34px;display:grid;gap:44px;align-items:center}
.archive-label{display:flex;align-items:center;gap:10px;font:600 10px/1.7 Inter,sans-serif;letter-spacing:.15em;color:#806447;margin:0 0 18px}.archive-label>span{font-size:20px;color:#7b0323}
.hero-copy h1{font:400 clamp(42px,9vw,69px)/1.12 'Playfair Display',Georgia,serif;letter-spacing:-.045em;color:#2b1a10;margin:0 0 24px}.hero-copy h1 em{font-weight:400;color:#7b0323}
.hero-description{max-width:480px;font:18px/1.85 'Crimson Text',Georgia,serif;color:#6b4423;margin:0}
.hero-handwriting{font:23px/1.4 Caveat,cursive;color:#8a6947;margin:18px 0 28px}
.landing-actions{display:flex;flex-wrap:wrap;gap:12px}.landing-primary,.landing-secondary{display:inline-flex;justify-content:center;align-items:center;gap:28px;min-height:48px;padding:13px 24px;border:1px solid #5a0019;border-radius:3px;font:600 14px/1.5 Inter,sans-serif;text-decoration:none}.landing-primary{background:#7b0323;color:#fdfaf5;box-shadow:0 3px 0 #38251115}.landing-primary:hover{background:#5a0019}.landing-secondary{background:#fdfaf5;color:#7b0323;border-color:#c4ad94}.landing-secondary:hover{background:#fdf2f3}.hero-footnote{font:11px/1.8 Inter,sans-serif;color:#81694c;margin:18px 0 0;max-width:330px}
.notebook-scene{position:relative;isolation:isolate;width:min(calc(100% - 32px),400px);margin:12px auto 30px;padding:10px 10px 24px;color-scheme:light;--theme-light-surface:initial}
.book-back{position:absolute;inset:20px -2px 18px 15px;border:1px solid #493020;background:#65432b;border-radius:3px 7px 7px 3px;transform:rotate(5deg);box-shadow:8px 15px 25px #3b291b18}
.book-back::before{content:'';position:absolute;inset:9px;border:1px solid #c0a07355;border-radius:2px}
.sample-page{position:relative;padding:22px 22px 18px;background:#f7edd7;border:1px solid #c4b18e;transform:rotate(-3deg);box-shadow:-3px 0 0 #dfceb0,-5px 1px 0 #f2e5cc,3px 5px 12px #3b291b1a;background-image:linear-gradient(#b5a17f15 1px,transparent 1px);background-size:100% 27px}
.sample-topline{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #cbb995;padding-bottom:13px;font:7px/1.5 Inter,sans-serif;letter-spacing:.13em;color:#7b6347}.sample-heading{font:31px/1.2 Caveat,cursive;color:#68452b;text-align:center;margin:19px 0 23px}
.memory-photo{position:relative;padding:8px 8px 10px;background:#fff8e7;border:1px solid #d3c1a1;box-shadow:2px 4px 5px #3b291b12;transform:rotate(3deg)}.memory-photo svg{display:block;width:100%;height:auto}.memory-photo>span:last-child{display:block;text-align:center;font:18px/1.4 Caveat,cursive;color:#71573d;margin-top:7px}
.paper-tape{position:absolute;z-index:1;top:-13px;left:calc(50% - 40px);width:80px;height:25px;background:#c9b58e99;transform:rotate(-6deg);clip-path:polygon(3% 0,100% 5%,97% 100%,0 94%)}
.sample-note{font:23px/1.35 Caveat,cursive;color:#6d553b;margin:23px 0 12px}.sample-lines{display:grid;gap:23px;margin:0 0 12px}.sample-lines span{border-bottom:1px solid #c4b59480}.sample-bottom{display:flex;justify-content:space-between;align-items:center;gap:16px}.sample-bottom>span:first-child{font:18px Caveat,cursive;color:#8c704b}.ink-seal{display:grid;place-items:center;width:40px;height:40px;border:3px double #8e6f47;border-radius:50%;font:italic 24px Georgia,serif;color:#805e38;transform:rotate(12deg)}.scene-caption{position:absolute;right:4px;bottom:-14px;font:21px Caveat,cursive;color:#8a6947;transform:rotate(2deg)}
.landing-divider{display:flex;align-items:center;gap:17px;width:min(100% - 44px,1128px);margin:16px auto 0;color:#a08760}.landing-divider span{flex:1;border-top:1px solid #c4ad94}.landing-divider i{font:24px Georgia,serif;font-style:normal}
.landing-features{max-width:1180px;margin:auto;padding:48px 22px 64px}.landing-features>header{max-width:650px;margin:0 auto 32px;text-align:center}.landing-features .archive-label{justify-content:center}.landing-features h2{font:400 clamp(30px,6vw,42px)/1.2 'Playfair Display',Georgia,serif;letter-spacing:-.03em;margin:0 0 18px}.landing-features header>p:last-child{font:18px/1.7 'Crimson Text',Georgia,serif;color:#6b4423;margin:0}
.feature-pages{display:grid;gap:14px}.feature-pages article{min-width:0;position:relative;padding:22px;background:#fdfaf5;border:1px solid #d7c7b3;border-radius:2px;box-shadow:0 3px 0 -1px #d0bd9d45}.feature-top{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:14px}.feature-mark{font:29px/1 Caveat,cursive;color:#7b0323}.feature-number{font:italic 14px Georgia,serif;color:#a18763}.feature-pages h3{font:400 23px/1.25 'Crimson Text',Georgia,serif;color:#68452b;margin:0 0 10px}.feature-pages article>p{font:14px/1.8 Inter,sans-serif;color:#715b43;margin:0}
.landing-invitation{position:relative;overflow:hidden;padding:45px 22px 52px;border-top:1px solid #d7c7b3;background:#eee1ca;text-align:center}.landing-invitation>div{position:relative;z-index:1;max-width:650px;margin:auto}.landing-invitation .archive-label{justify-content:center}.landing-invitation h2{font:400 clamp(32px,6vw,46px)/1.25 'Playfair Display',Georgia,serif;letter-spacing:-.03em;color:#493020;margin:0 0 18px}.landing-invitation h2 em{font-weight:400}.landing-invitation p:not(.archive-label){font:18px/1.7 'Crimson Text',Georgia,serif;color:#6b4423;margin:0 0 26px}.invitation-handwriting{display:block;font:23px/1.5 Caveat,cursive;color:#8a6947;margin-top:24px}.invitation-flourish{position:absolute;right:5%;top:12%;font:100px Georgia,serif;color:#a88e6350;transform:rotate(12deg)}
.landing-page a:focus-visible{outline:2px solid #806443;outline-offset:4px}.desktop-break{display:none}
@media(min-width:600px){.landing-hero{padding:65px 32px 50px}.feature-pages{grid-template-columns:repeat(2,minmax(0,1fr))}.landing-features{padding:60px 32px 76px}.landing-divider{width:min(100% - 64px,1116px)}.desktop-break{display:inline}}
@media(min-width:960px){.landing-hero{grid-template-columns:1.1fr 1fr;gap:65px;min-height:650px;padding-block:75px}.hero-copy h1{font-size:clamp(53px,5vw,69px)}.notebook-scene{width:390px}.feature-pages{grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.feature-pages article{padding:26px}.landing-invitation{padding-block:65px}}
@media(max-width:359px){.landing-hero,.landing-features{padding-inline:18px}.hero-copy h1{font-size:39px}.landing-actions>a{width:100%}.sample-page{padding:19px 16px}.sample-note{font-size:21px}.scene-caption{font-size:18px}.hero-handwriting{font-size:22px}}
</style>
