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
  const q = query.get('q')?.trim(), lat = query.get('lat'), lon = query.get('lon')
  if (q ? q.length > 255 : lat === null || lon === null || !lat.trim() || !lon.trim() || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon)) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lon)) > 180) return res.status(400).json({ error: 'Invalid location query' })
  const url = new URL('https://api.geoapify.com/v1/geocode/' + (q ? 'search' : 'reverse'))
  url.search = new URLSearchParams({ apiKey: key, format: 'json', limit: '6', ...(q ? { text: q } : { lat, lon }) }).toString()
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(9000) })
    if (!response.ok) return res.status(response.status === 429 ? 429 : 503).json({ error: 'Place provider unavailable' })
    const data = await response.json()
    return res.status(200).json((data.results || []).map(p => ({ name: p.formatted, latitude: p.lat, longitude: p.lon })))
  } catch { return res.status(503).json({ error: 'Place provider unavailable' }) }
}
