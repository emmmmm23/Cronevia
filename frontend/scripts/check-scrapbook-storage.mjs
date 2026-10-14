import { loadEnv } from 'vite'
import { readFile } from 'node:fs/promises'
const env=loadEnv('development',process.cwd(),'')
const base=env.VITE_SUPABASE_URL
console.log('Frontend project:',new URL(base).hostname)
const key=env.VITE_SUPABASE_ANON_KEY
const claims=key.startsWith('eyJ') ? JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()) : null
console.log('Browser credential:',claims?.role || (key.startsWith('sb_publishable_')?'publishable':'unrecognized'),'project claim matches:',claims?.ref ? new URL(base).hostname.startsWith(claims.ref+'.') : 'not applicable')
console.log('Configured admin connection:',Boolean(env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_DB_URL || env.DATABASE_URL))
try {
 const backend=await readFile(new URL('../../backend/.env',import.meta.url),'utf8')
 const backendUrl=backend.match(/^SUPABASE_URL=["']?([^\s"']+)/m)?.[1]
 if(backendUrl) console.log('Backend project:',new URL(backendUrl).hostname,'matches:',new URL(backendUrl).hostname===new URL(base).hostname)
} catch {}
const headers={apikey:env.VITE_SUPABASE_ANON_KEY,Authorization:`Bearer ${env.VITE_SUPABASE_ANON_KEY}`}
for(const table of ['sticker_assets','journal_sticker_placements']) {
 const response=await fetch(`${base}/rest/v1/${table}?select=id&limit=0`,{headers})
 const body=await response.json();console.log(table,response.status,body.code||'OK',body.message||'')
}
for(const bucket of ['stickers-custom','cronevia-media']) {
 const response=await fetch(`${base}/storage/v1/bucket/${bucket}`,{headers})
 const body=await response.json();console.log('Bucket metadata',bucket,response.status,body.message||body.error||body.name||'')
}
console.log('Anonymous metadata results cannot prove absence of a private bucket. Verify storage.buckets and migration history in the authorized SQL editor. No writes performed.')
