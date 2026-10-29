import assert from 'node:assert/strict'
import {createHash,randomBytes} from 'node:crypto'
import handler from '../api/journal-invites.js'
Object.assign(process.env,{SUPABASE_URL:'https://auth.example.test',SUPABASE_ANON_KEY:'public-fixture-only',APP_ORIGIN:'https://cronevia.vercel.app'})
const original=globalThis.fetch,token=randomBytes(48).toString('hex'),invite='11111111-1111-4111-8111-111111111111'
let sequence=0
async function request({method='POST',origin='https://cronevia.vercel.app',body={action:'context'},cookie,authorization,headers={},status=200,result={status:'pending'}}={}){
 const calls=[]
 globalThis.fetch=async(url,options)=>{calls.push({url:String(url),...options});return new Response(JSON.stringify(result),{status})}
 const response={headers:{},statusCode:200,body:null,setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(value){this.body=value;return this}}
 await handler({method,url:'/api/journal-invites',body,socket:{remoteAddress:'fixture-'+sequence++},headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{}),...(authorization?{authorization}:{}),...headers}},response)
 return {...response,calls}
}
try{
 for(const origin of [undefined,'https://untrusted.example','null'])assert.equal((await request({origin,headers:origin===undefined?{origin:undefined}:{}})).statusCode,403)
 assert.equal((await request({method:'GET'})).statusCode,405)
 assert.equal((await request({headers:{'content-type':'text/plain'}})).statusCode,415)
 assert.equal((await request({headers:{'content-length':'2048'}})).statusCode,413)
 assert.equal((await request({body:{action:'exchange',token:'invalid'}})).statusCode,400)
 const exchange=await request({body:{action:'exchange',token},result:{status:'exchanged',invitation_id:invite}})
 assert.equal(exchange.statusCode,200);assert.equal(exchange.headers['Cache-Control'],'no-store');assert.equal(exchange.headers['Referrer-Policy'],'no-referrer')
 assert.match(exchange.headers['Set-Cookie'],/^__Host-cronevia-invite=[a-f0-9]{64}; Path=\/; HttpOnly; SameSite=Lax; Secure$/)
 assert.ok(!/Expires|Max-Age/i.test(exchange.headers['Set-Cookie']))
 assert.equal(exchange.calls.length,1);assert.ok(!JSON.stringify(exchange.calls).includes(token));assert.ok(!JSON.stringify(exchange.body).includes(token))
 const sent=JSON.parse(exchange.calls[0].body);assert.equal(sent.invite_digest,createHash('sha256').update(token).digest('hex'));assert.match(sent.claim_digest,/^[a-f0-9]{64}$/)
 const cookie=exchange.headers['Set-Cookie'].split(';')[0]
 const context=await request({cookie});assert.ok(context.calls[0].url.endsWith('/rpc/journal_invite_context'));assert.equal(context.calls[0].headers.Authorization,'Bearer public-fixture-only')
 assert.equal((await request({cookie,body:{action:'accept',invitation_id:invite}})).statusCode,401)
 assert.equal((await request({cookie,authorization:'Bearer valid.fixture.jwt',body:{action:'accept',invitation_id:'bad'}})).statusCode,400)
 const accepted=await request({cookie,authorization:'Bearer valid.fixture.jwt',body:{action:'accept',invitation_id:invite,role:'owner'},result:{status:'accepted',journal_id:invite,role:'viewer'}})
 assert.equal(accepted.statusCode,200);assert.ok(accepted.calls[0].url.endsWith('/rpc/accept_journal_invite'));assert.deepEqual(Object.keys(JSON.parse(accepted.calls[0].body)).sort(),['claim_digest','expected_invitation']);assert.equal(accepted.body.role,'viewer')
 for(const status of [401,403,500]){const result=await request({cookie,status,result:{message:'private SQL details',code:'XX000'}});assert.equal(result.statusCode,status===500?503:status);assert.ok(!JSON.stringify(result.body).includes('private SQL'))}
 assert.equal((await request({cookie,status:400,result:{code:'P0001'}})).statusCode,429)
 const mismatch=await request({body:{action:'exchange',token,expected_invitation:'22222222-2222-4222-8222-222222222222'},result:{status:'exchanged',invitation_id:invite}})
 assert.equal(mismatch.statusCode,400);assert.equal(mismatch.headers['Set-Cookie'],undefined)
 let refused=0
 for(let n=0;n<45;n++){const result=await request({cookie,headers:{'x-real-ip':'same-rate-test-ip'}});if(result.statusCode===429)refused++}
 assert.ok(refused>0)
 console.log('PASS: invitation endpoint exact-origin/CSRF, POST/JSON/size checks, HttpOnly session cookie, token hashing, explicit authenticated acceptance, immutable role contract, quotas and sanitized failures.')
}finally{globalThis.fetch=original}
