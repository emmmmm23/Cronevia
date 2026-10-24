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
  return {ok:true,json:async()=>String(url).includes('/auth/')?{id:'user-'+requests.length}:{results:[{formatted:'Manila, Philippines',lat:14.6,lon:120.98,country_code:'ph'}]}}
 }
 let res=response();await handler({method:'GET',url:'/api/places?q=Manila',headers:{}},res);assert.equal(res.code,401);assert.equal(requests.length,0)
 res=response();await handler({method:'GET',url:'/api/places?lat=91&lon=120',headers:{authorization:'Bearer fixture'}},res);assert.equal(res.code,400)
 res=response();await handler({method:'GET',url:'/api/places?q=Manila',headers:{authorization:'Bearer fixture'}},res)
 assert.equal(res.code,200);assert.equal(res.body[0].name,'Manila, Philippines');assert.equal(res.body[0].countryCode,'ph');assert.ok(!JSON.stringify(res.body).includes('server-test-key'))
 assert.ok(requests.at(-1)[0].startsWith('https://api.geoapify.com/v1/geocode/search?'))
 assert.equal(requests.at(-1)[1].headers,undefined)
 assert.equal(new URL(requests.at(-1)[0]).searchParams.get('filter'),'countrycode:ph')
})

test('nearby requests stay in-country, deduplicate and do not invent evidence',async()=>{
 let serial=100,providerUrl
 globalThis.fetch=async url=>{if(String(url).includes('/auth/'))return {ok:true,json:async()=>({id:'user-'+serial++})};providerUrl=new URL(url);const p={name:'Fixture museum',formatted:'Manila',lat:14.6,lon:120.98,country_code:'ph',place_id:'museum-1',categories:['entertainment.museum']};return {ok:true,json:async()=>({features:[{properties:p},{properties:p},{properties:{...p,place_id:'foreign',country_code:'my'}}]})}}
 let res=response();await handler({method:'GET',url:'/api/places?mode=nearby&lat=14.6&lon=120.98&radius=5000',headers:{authorization:'Bearer fixture'}},res)
 assert.equal(res.code,200);assert.equal(res.body.length,1);assert.equal(res.body[0].category,'culture');assert.equal(res.body[0].openingHours,undefined);assert.equal(res.body[0].price,undefined);assert.equal(res.body[0].accessibility,undefined);assert.equal(providerUrl.searchParams.get('filter'),'circle:120.98,14.6,5000|countrycode:ph');assert.equal(providerUrl.searchParams.get('bias'),'proximity:120.98,14.6')
 res=response();await handler({method:'GET',url:'/api/places?mode=nearby&q=x',headers:{authorization:'Bearer fixture'}},res);assert.equal(res.code,400)
 res=response();await handler({method:'GET',url:'/api/places?mode=nearby&lat=14&lon=120&radius=999999',headers:{authorization:'Bearer fixture'}},res);assert.equal(res.code,400)
})

test('reverse geocoding preserves a foreign country instead of snapping it into the Philippines',async()=>{
 let providerUrl
 globalThis.fetch=async url=>String(url).includes('/auth/')?{ok:true,json:async()=>({id:'reverse-user'})}:(providerUrl=new URL(url),{ok:true,json:async()=>({results:[{formatted:'Taiwan',country_code:'tw',lat:22.6,lon:120.3}]})})
 const res=response();await handler({method:'GET',url:'/api/places?lat=22.6&lon=120.3',headers:{authorization:'Bearer fixture'}},res);assert.equal(res.body[0].countryCode,'tw');assert.equal(providerUrl.searchParams.has('filter'),false)
})
