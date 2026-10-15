import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/places.js'
process.env.GEOAPIFY_API_KEY='server-test-key'
process.env.SUPABASE_URL='https://auth.example.test'
process.env.SUPABASE_ANON_KEY='public-test-key'
const response=()=>({code:200,body:null,setHeader(){},status(code){this.code=code;return this},json(body){this.body=body;return this}})
test('proxy authenticates, validates coordinates, normalizes provider data and hides its key',async()=>{
 let requests=[]
 globalThis.fetch=async(url,options)=>{
  requests.push([String(url),options])
  return {ok:true,json:async()=>String(url).includes('/auth/')?{id:'user-'+requests.length}:{results:[{formatted:'Manila, Philippines',lat:14.6,lon:120.98}]}}
 }
 let res=response();await handler({method:'GET',url:'/api/places?q=Manila',headers:{}},res);assert.equal(res.code,401);assert.equal(requests.length,0)
 res=response();await handler({method:'GET',url:'/api/places?lat=91&lon=120',headers:{authorization:'Bearer fixture'}},res);assert.equal(res.code,400)
 res=response();await handler({method:'GET',url:'/api/places?q=Manila',headers:{authorization:'Bearer fixture'}},res)
 assert.equal(res.code,200);assert.deepEqual(res.body,[{name:'Manila, Philippines',latitude:14.6,longitude:120.98}]);assert.ok(!JSON.stringify(res.body).includes('server-test-key'))
 assert.ok(requests.at(-1)[0].startsWith('https://api.geoapify.com/v1/geocode/search?'))
 assert.equal(requests.at(-1)[1].headers,undefined)
})
