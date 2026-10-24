// Vercel Node endpoint. Keep GEOAPIFY_API_KEY server-side (never VITE_*).
const recent = new Map()
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET required' })
  const key = process.env.GEOAPIFY_API_KEY
  if (!key) return res.status(503).json({ error: 'Place lookup is not configured' })
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return res.status(503).json({ error: 'Authentication is not configured' })
  const authorization = req.headers.authorization
  if (!authorization?.startsWith('Bearer ')) return res.status(401).json({ error: 'Sign in to search places' })
  try {
    const auth = await fetch(new URL('/auth/v1/user', supabaseUrl), {headers:{Authorization:authorization,apikey:anonKey},signal:AbortSignal.timeout(5000)})
    if (!auth.ok) return res.status(401).json({ error: 'Sign in to search places' })
    const user = await auth.json(), now = Date.now()
    if (!user.id) return res.status(401).json({ error: 'Sign in to search places' })
    if (now - (recent.get(user.id) || 0) < 1000) return res.status(429).json({error:'Please wait before searching again'})
    if (recent.size > 1000) recent.clear()
    recent.set(user.id, now)
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
    const data = await response.json()
    const rows=nearby?(data.features||[]).map(f=>f.properties):data.results||[]
    const normalized=rows.filter(p=>!nearby||p.name).filter(p=>!q&&!nearby||p.country_code?.toLowerCase()==='ph').map(p=>({
      name:nearby?p.name:p.formatted, address:p.formatted||p.address_line2||'',latitude:p.lat,longitude:p.lon,countryCode:p.country_code,
      provider:'geoapify',providerId:p.place_id,categories:p.categories||[],
      category:(p.categories||[]).some(c=>c.startsWith('catering'))?'food':(p.categories||[]).some(c=>c.startsWith('natural')||c.startsWith('leisure.park'))?'nature':(p.categories||[]).some(c=>c.includes('museum')||c.includes('memorial')||c.includes('place_of_worship'))?'culture':'attractions',
      ...(typeof p.datasource?.raw?.opening_hours==='string'?{openingHours:p.datasource.raw.opening_hours}:{}),
      ...(['yes','no','limited'].includes(p.datasource?.raw?.wheelchair)?{accessibility:p.datasource.raw.wheelchair}:{})
    }))
    const seen=new Set()
    return res.status(200).json(normalized.filter(p=>{const id=p.providerId||`${p.name}:${p.latitude}:${p.longitude}`;if(seen.has(id))return false;seen.add(id);return true}))
  } catch { return res.status(503).json({ error: 'Place provider unavailable' }) }
}
