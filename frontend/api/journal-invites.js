import { createHash, randomBytes } from 'node:crypto'

const digest=value=>createHash('sha256').update(value).digest('hex')
const windows=new Map()
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// A small instance-local abuse brake complements PostgreSQL's shared invitation/account quotas.
function limited(req){
 const key=digest(String(req.headers['x-real-ip']||req.socket?.remoteAddress||'unknown')),now=Date.now()
 if(windows.size>4096)for(const [k,v] of windows)if(v.until<now)windows.delete(k)
 if(windows.size>8192)return true
 const value=windows.get(key)||{until:now+60000,n:0}
 if(value.until<now){value.until=now+60000;value.n=0}
 value.n++;windows.set(key,value);return value.n>40
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer')
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Vary','Origin')
 const finish=(status,value)=>res.status(status).json(value)
 if(req.method!=='POST'){res.setHeader('Allow','POST');return finish(405,{error:'POST required'})}
 const origins=new Set([process.env.APP_ORIGIN||'https://cronevia.vercel.app',...(process.env.VERCEL_URL?['https://'+process.env.VERCEL_URL]:[])])
 // Require an exact Origin, including for anonymous exchange. Cookies alone never accept invitations.
 if(typeof req.headers.origin!=='string'||!origins.has(req.headers.origin))return finish(403,{error:'This request must come from Cronevia.'})
 if(!String(req.headers['content-type']||'').startsWith('application/json'))return finish(415,{error:'JSON required'})
 if(limited(req)){res.setHeader('Retry-After','60');return finish(429,{error:'Please wait a minute before trying again.'})}
 if(Number(req.headers['content-length']||0)>1024)return finish(413,{error:'Request too large'})
 let body=req.body
 try{
  if(body===undefined){let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>1024)return finish(413,{error:'Request too large'})}body=JSON.parse(raw)}
  else if(typeof body==='string')body=JSON.parse(body)
 }catch{return finish(400,{error:'Invalid request'})}
 if(!body||typeof body!=='object'||Array.isArray(body)||Buffer.byteLength(JSON.stringify(body))>1024)return finish(400,{error:'Invalid request'})
 const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY
 if(!url||!key)return finish(503,{error:'Journal invitations are not configured yet.'})
 const secure=new URL(req.headers.origin).protocol==='https:',cookieName=secure?'__Host-cronevia-invite':'cronevia-invite-local'
 const authorization=req.headers.authorization
 if(authorization!==undefined&&(typeof authorization!=='string'||authorization.length>8192||!/^Bearer [A-Za-z0-9._-]+$/.test(authorization)))return finish(401,{error:'Please sign in again.'})
 const rpc=async(name,args)=>{
  const response=await fetch(new URL('/rest/v1/rpc/'+name,url),{method:'POST',headers:{apikey:key,Authorization:authorization||'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(8000)})
  if(!response.ok){const error=await response.json().catch(()=>({}));const status=response.status===401?401:response.status===403?403:error.code==='P0001'?429:503;throw Object.assign(new Error('Invitation request failed'),{status})}
  return response.json()
 }
 try{
  if(body.action==='exchange'){
   if(typeof body.token!=='string'||!/^([0-9a-f]{96})$/.test(body.token))return finish(400,{error:'This invitation link is invalid.'})
   if(body.expected_invitation!==undefined&&!uuid.test(body.expected_invitation))return finish(400,{error:'This invitation link is invalid.'})
   const handle=randomBytes(32).toString('hex')
   const result=await rpc('exchange_journal_invite',{invite_digest:digest(body.token),claim_digest:digest(handle)})
   if(result.status==='limited')return finish(429,{error:'Please wait before opening this invitation again.'})
   if(result.status!=='exchanged')return finish(400,{error:'This invitation link is invalid.'})
   if(body.expected_invitation&&body.expected_invitation!==result.invitation_id)return finish(400,{error:'This invitation link is invalid.'})
   // Session cookie: no token, no persistence API, no cross-site cookie, no JavaScript access.
   res.setHeader('Set-Cookie',`${cookieName}=${handle}; Path=/; HttpOnly; SameSite=Lax${secure?'; Secure':''}`)
   return finish(200,{status:'exchanged'})
  }
  const cookies=String(req.headers.cookie||'').split(';').map(part=>part.trim().split('='))
  const handle=cookies.find(([name])=>name===cookieName)?.[1]
  if(!handle||!/^[0-9a-f]{64}$/.test(handle))return finish(200,{status:'invalid'})
  if(body.action==='context')return finish(200,await rpc('journal_invite_context',{claim_digest:digest(handle)}))
  if(body.action==='accept'){
   if(!authorization)return finish(401,{error:'Sign in before accepting this invitation.'})
   if(typeof body.invitation_id!=='string'||!uuid.test(body.invitation_id))return finish(400,{error:'Reopen the invitation before accepting.'})
   return finish(200,await rpc('accept_journal_invite',{claim_digest:digest(handle),expected_invitation:body.invitation_id}))
  }
  return finish(400,{error:'Invalid invitation action'})
 }catch(error){return finish(error.status||503,{error:error.status===403?'Account verification or access is required.':error.status===429?'Please wait a minute before trying again.':'The invitation could not be checked. Please try again.'})}
}
