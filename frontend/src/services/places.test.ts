import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { locateOnce } from './places'
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('isSecureContext', true) })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
function gps(fn: unknown) { Object.defineProperty(navigator,'geolocation',{ configurable:true,value:{getCurrentPosition:fn} }) }
it('requests one position on demand and preserves accuracy', async () => {
  const fn=vi.fn((success:PositionCallback,_error?:PositionErrorCallback,_options?:PositionOptions)=>success({coords:{latitude:14,longitude:120,accuracy:30}} as GeolocationPosition)); gps(fn)
  expect(fn).not.toHaveBeenCalled()
  await expect(locateOnce(new AbortController().signal)).resolves.toMatchObject({coords:{accuracy:30}})
  expect(fn).toHaveBeenCalledTimes(1); expect(fn.mock.calls[0][2]).toMatchObject({timeout:10000,maximumAge:0})
})
it.each([[1,'denied'],[2,'unavailable'],[3,'timed out']])('explains GPS failure %s', async (code,message) => {
  gps((_success:unknown,error:(e:unknown)=>void)=>error({code}))
  await expect(locateOnce(new AbortController().signal)).rejects.toThrow(message as string)
})
it('times out a browser that never calls back', async () => {
  gps(vi.fn()); const result=expect(locateOnce(new AbortController().signal)).rejects.toThrow('timed out')
  await vi.advanceTimersByTimeAsync(12000); await result
})
it('ignores a callback after cancellation', async () => {
  let success:any; gps((callback:any)=>{success=callback}); const controller=new AbortController()
  const result=expect(locateOnce(controller.signal)).rejects.toMatchObject({name:'AbortError'})
  controller.abort(); success({coords:{latitude:1,longitude:2}}); await result
})
it('handles unsupported and insecure browsers', async () => {
  Object.defineProperty(navigator,'geolocation',{ configurable:true,value:undefined })
  await expect(locateOnce(new AbortController().signal)).rejects.toThrow('does not support')
  vi.stubGlobal('isSecureContext',false)
  await expect(locateOnce(new AbortController().signal)).rejects.toThrow('HTTPS')
})
