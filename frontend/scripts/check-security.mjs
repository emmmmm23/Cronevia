import {readFile,readdir,stat} from 'node:fs/promises'
import {execFileSync} from 'node:child_process'
import {resolve,relative} from 'node:path'
const root=resolve(import.meta.dirname,'../..'),dist=resolve(root,'frontend/dist')
const rules={
 'private-key':/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
 'supabase-secret':/sb_secret_[A-Za-z0-9_-]{20,}/,
 'github-token':/gh[pousr]_[A-Za-z0-9]{30,}/,
 'aws-access-key':/AKIA[A-Z0-9]{16}/,
}
const findings=[]
function scan(text,file){
 for(const [kind,pattern]of Object.entries(rules))if(pattern.test(text))findings.push({file,kind})
 for(const m of text.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)){
  try{if(JSON.parse(Buffer.from(m[1],'base64url')).role==='service_role')findings.push({file,kind:'service-role-jwt'})}catch{}
 }
}
const tracked=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean)
for(const file of tracked){try{if((await stat(resolve(root,file))).size<3000000)scan(await readFile(resolve(root,file),'utf8'),file)}catch{}}
if(process.argv.includes('--history')){
 const history=execFileSync('git',['log','--all','--format=commit %H','-p','--', '.', ':!frontend/package-lock.json', ':!backend/package-lock.json', ':!backend/composer.lock'],{cwd:root,encoding:'utf8',maxBuffer:100000000})
 scan(history,'Git history (inspect locally; values are deliberately redacted)')
}
let files=0
async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){const name=resolve(path,entry.name);if(entry.isDirectory())await walk(name);else{
 files++;if(/\.map$|^\.env|^\.git$|\.pem$|\.key$/.test(entry.name))findings.push({file:relative(root,name),kind:'sensitive-build-artifact'})
 if((await stat(name)).size<4000000)scan(await readFile(name,'utf8'),relative(root,name))
}}}
await walk(dist)
for(const path of ['vercel.json','frontend/vercel.json']){
 const config=JSON.parse(await readFile(resolve(root,path),'utf8')),headers=config.headers.find(h=>h.source==='/(.*)').headers
 for(const key of ['X-Content-Type-Options','X-Frame-Options','Strict-Transport-Security','Content-Security-Policy','Content-Security-Policy-Report-Only','Referrer-Policy','Permissions-Policy'])if(!headers.some(h=>h.key===key))findings.push({file:path,kind:'missing-'+key})
}
if(findings.length){console.error(JSON.stringify(findings,null,2));process.exitCode=1}
else console.log(`PASS: ${tracked.length} tracked files and ${files} build artifacts scanned; no high-confidence private credentials, source maps or sensitive files found. Security headers configured.`)
