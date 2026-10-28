// Vercel Node endpoint. Keep GEOAPIFY_API_KEY server-side (never VITE_*).
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options','nosniff')
  res.setHeader('Vary','Origin')
  if (req.method !== 'GET') {res.setHeader('Allow','GET');return res.status(405).json({error:'GET required'})}
  if(typeof req.url!=='string'||req.url.length>2048)return res.status(400).json({error:'Invalid location query'})
  const origins=new Set([process.env.APP_ORIGIN||'https://cronevia.vercel.app',...(process.env.VERCEL_URL?['https://'+process.env.VERCEL_URL]:[])])
  if(req.headers.origin&&!origins.has(req.headers.origin))return res.status(403).json({error:'Origin is not allowed'})
  const key = process.env.GEOAPIFY_API_KEY
  if (!key) return res.status(503).json({ error: 'Place lookup is not configured' })
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return res.status(503).json({ error: 'Authentication is not configured' })
  const authorization = req.headers.authorization
  if (typeof authorization!=='string'||authorization.length>8192||!authorization.startsWith('Bearer ')) return res.status(401).json({ error: 'Sign in to search places' })
  try {
    const auth = await fetch(new URL('/auth/v1/user', supabaseUrl), {headers:{Authorization:authorization,apikey:anonKey},signal:AbortSignal.timeout(5000)})
    if (!auth.ok) return res.status(401).json({ error: 'Sign in to search places' })
    const user = await auth.json()
    if (!user.id) return res.status(401).json({ error: 'Sign in to search places' })
    // The RPC checks live account status and verified MFA factors and atomically
    // applies the same per-account quota across every serverless instance.
    const quota=await fetch(new URL('/rest/v1/rpc/consume_place_request',supabaseUrl),{method:'POST',headers:{Authorization:authorization,apikey:anonKey,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)})
    if(!quota.ok)return res.status(quota.status===401||quota.status===403?403:503).json({error:'Account verification is required or temporarily unavailable'})
    if(await quota.json()!==true){res.setHeader('Retry-After','2');return res.status(429).json({error:'Please wait before searching again'})}
  } catch { return res.status(503).json({error:'Authentication temporarily unavailable'}) }
  const query = new URL(req.url, 'https://local.invalid').searchParams
  const q = query.get('q')?.trim(), lat = query.get('lat'), lon = query.get('lon'), nearby=query.get('mode')==='nearby'
  if (q&&!nearby ? q.length > 255 : lat === null || lon === null || !lat.trim() || !lon.trim() || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon)) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lon)) > 180) return res.status(400).json({ error: 'Invalid location query' })
  const categoryMap={all:'tourism.sights,catering.restaurant,catering.cafe,leisure.park,natural,entertainment.museum,commercial.shopping_mall',attractions:'tourism.sights,commercial.shopping_mall',food:'catering.restaurant,catering.cafe',nature:'natural,leisure.park',culture:'entertainment.museum,tourism.sights'}
  const category=query.get('category')||'all',radius=Number(query.get('radius')||5000)
  if(nearby&&(!Object.hasOwn(categoryMap,category)||![5000,15000,30000].includes(radius)))return res.status(400).json({error:'Invalid discovery query'})
  const url = new URL(nearby?'https://api.geoapify.com/v2/places':'https://api.geoapify.com/v1/geocode/' + (q ? 'search' : 'reverse'))
  // Never country-filter reverse lookup: that could snap a foreign GPS fix to a Philippine address.
  url.search = new URLSearchParams({ apiKey: key, ...(nearby?{categories:categoryMap[category],filter:`circle:${lon},${lat},${radius}|countrycode:ph`,bias:`proximity:${lon},${lat}`,limit:'48',lang:'en'}:{format:'json',limit:'6', ...(q ? { text: q,filter:'countrycode:ph',bias:'countrycode:ph' } : { lat, lon })}) }).toString()
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(9000) })
    if (!response.ok) return res.status(response.status === 429 ? 429 : 503).json({ error: 'Place provider unavailable' })
    const text=await response.text()
    if(text.length>1000000)throw new Error('Provider response too large')
    const data=JSON.parse(text)
    const rows=nearby?(Array.isArray(data.features)?data.features:[]).slice(0,48).map(f=>f?.properties):(Array.isArray(data.results)?data.results:[]).slice(0,6)
    const normalized=rows.filter(p=>p&&typeof p==='object'&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180).filter(p=>!nearby||typeof p.name==='string').filter(p=>!q&&!nearby||typeof p.country_code==='string'&&p.country_code.toLowerCase()==='ph').map(p=>({
      name:String(nearby?p.name:p.formatted||'Place').slice(0,255), address:String(p.formatted||p.address_line2||'').slice(0,500),latitude:p.lat,longitude:p.lon,countryCode:typeof p.country_code==='string'?p.country_code.slice(0,2):'',
      provider:'geoapify',providerId:typeof p.place_id==='string'?p.place_id.slice(0,2048):'',categories:Array.isArray(p.categories)?p.categories.filter(c=>typeof c==='string').slice(0,30):[],
      category:(Array.isArray(p.categories)?p.categories:[]).filter(c=>typeof c==='string').some(c=>c.startsWith('catering'))?'food':(Array.isArray(p.categories)?p.categories:[]).filter(c=>typeof c==='string').some(c=>c.startsWith('natural')||c.startsWith('leisure.park'))?'nature':(Array.isArray(p.categories)?p.categories:[]).filter(c=>typeof c==='string').some(c=>c.includes('museum')||c.includes('memorial')||c.includes('place_of_worship'))?'culture':'attractions',
      ...(typeof p.datasource?.raw?.opening_hours==='string'?{openingHours:p.datasource.raw.opening_hours.slice(0,500)}:{}),
      ...(['yes','no','limited'].includes(p.datasource?.raw?.wheelchair)?{accessibility:p.datasource.raw.wheelchair}:{})
    }))
    const seen=new Set()
    return res.status(200).json(normalized.filter(p=>{const id=p.providerId||`${p.name}:${p.latitude}:${p.longitude}`;if(seen.has(id))return false;seen.add(id);return true}))
  } catch { return res.status(503).json({ error: 'Place provider unavailable' }) }
}
