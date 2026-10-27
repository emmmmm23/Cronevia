import { afterEach, beforeEach, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'fixture-google-key')
  vi.stubEnv('VITE_MAPBOX_ACCESS_TOKEN', 'fixture-mapbox-key')
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
const success = () => new Response(JSON.stringify({ session:'session-fixture',expiry:String(Math.floor(Date.now()/1000)+86400),tileWidth:256 }), { status:200 })

it('uses Google ahead of Mapbox and shares concurrent session creation', async () => {
  const fetcher = vi.fn().mockImplementation(async () => success())
  vi.stubGlobal('fetch', fetcher)
  const { mapStyle, usesGoogleMaps, usesMapbox } = await import('./map-style')
  const styles = await Promise.all([mapStyle(),mapStyle()])
  expect(usesGoogleMaps).toBe(true); expect(usesMapbox).toBe(false)
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(styles[0]).toEqual(styles[1])
  expect(JSON.stringify(styles[0])).toContain('tile.googleapis.com/v1/2dtiles')
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({mapType:'roadmap',region:'PH'})
})

it('does not silently fall back after Google rejects the key, and permits retry', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response('{}',{status:403})).mockImplementation(async () => success())
  vi.stubGlobal('fetch', fetcher)
  const { mapStyle, mapSetupMessage } = await import('./map-style')
  await expect(mapStyle()).rejects.toThrow('Map Tiles API')
  await expect(mapStyle()).resolves.toHaveProperty('version',8)
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(mapSetupMessage(new Error('key in provider response'),'Map unavailable')).toBe('Map unavailable')
})

it('renews an expired session before returning tile URLs', async () => {
  let now = Date.now()
  vi.spyOn(Date,'now').mockImplementation(() => now)
  const fetcher = vi.fn().mockImplementation(async () => success())
  vi.stubGlobal('fetch', fetcher)
  const { mapStyle } = await import('./map-style')
  await mapStyle()
  now += 86400000
  await mapStyle()
  expect(fetcher).toHaveBeenCalledTimes(2)
  vi.restoreAllMocks()
})
