import assert from 'node:assert/strict'
import handler from '../api/places.js'
import {validatePublicEnv} from './public-env.mjs'
Object.assign(process.env,{GEOAPIFY_API_KEY:'server-fixture-only',SUPABASE_URL:'https://auth.example.test',SUPABASE_ANON_KEY:'public-fixture-only',APP_ORIGIN:'https://cronevia.vercel.app'})
const original=globalThis.fetch
async function request({method='GET',url='/api/places?q=Manila',origin,token=true,quota=true,quotaStatus=200,authStatus=200,providerStatus=200,rows}={}){
 const calls=[]
 globalThis.fetch=async(input)=>{
  const url=String(input);calls.push(url)
  if(url.includes('/auth/v1/user'))return new Response(JSON.stringify({id:'fixture-user'}),{status:authStatus})
  if(url.includes('/rpc/consume_place_request'))return new Response(JSON.stringify(quota),{status:quotaStatus})
  assert.ok(url.startsWith('https://api.geoapify.com/'))
  return new Response(JSON.stringify({results:rows??[{formatted:'Manila',lat:14.6,lon:120.98,country_code:'ph',categories:['tourism.sights']}]}),{status:providerStatus})
 }
 const response={headers:{},statusCode:200,body:null,setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(value){this.body=value;return this}}
 await handler({method,url,headers:{...(token?{authorization:'Bearer fixture-only'}:{}),...(origin?{origin}:{})}},response)
 return {...response,calls}
}
try{
 validatePublicEnv({VITE_SUPABASE_ANON_KEY:'sb_publishable_fixture',VITE_GOOGLE_MAPS_API_KEY:'public-browser-fixture'})
 assert.throws(()=>validatePublicEnv({VITE_SUPABASE_ANON_KEY:'sb_secret_fixture'}))
 const serviceJwt='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.fixture'
 assert.throws(()=>validatePublicEnv({VITE_SUPABASE_ANON_KEY:serviceJwt}))
 assert.throws(()=>validatePublicEnv({VITE_GEOAPIFY_API_KEY:'fixture-server-key'}))
 assert.equal((await request({method:'POST'})).statusCode,405)
 assert.equal((await request({token:false})).statusCode,401)
 assert.equal((await request({origin:'https://untrusted.example'})).statusCode,403)
 for(const quotaStatus of [401,403]){const r=await request({quotaStatus});assert.equal(r.statusCode,403);assert.equal(r.calls.length,2)}
 assert.equal((await request({quotaStatus:500})).statusCode,503)
 const limited=await request({quota:false});assert.equal(limited.statusCode,429);assert.equal(limited.headers['Retry-After'],'2');assert.equal(limited.calls.length,2)
 for(const url of ['/api/places?lat=91&lon=1','/api/places?q='+('x'.repeat(256)),'/api/places?mode=nearby&lat=14&lon=120&radius=1','/api/places?q='+('x'.repeat(2100))])assert.equal((await request({url})).statusCode,400)
 const result=await request();assert.equal(result.statusCode,200);assert.equal(result.headers['Cache-Control'],'no-store');assert.equal(result.body[0].name,'Manila');assert.equal(JSON.stringify(result.body).includes('server-fixture-only'),false)
 const malformed=await request({rows:[null,{formatted:'Invalid',lat:999,lon:1,country_code:'ph'},{formatted:'Valid',lat:1,lon:120,country_code:'ph',categories:[{},'food']}]});assert.equal(malformed.body.length,1)
 const provider=await request({providerStatus:500});assert.equal(provider.statusCode,503);assert.deepEqual(provider.body,{error:'Place provider unavailable'})
 console.log('PASS: places API methods, origins, auth/MFA/account quota denial, cross-instance quota contract, validation, normalization and safe failures.')
}finally{globalThis.fetch=original}
