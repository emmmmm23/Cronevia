import {beforeEach,it,expect,vi,afterEach} from 'vitest'
const mocks=vi.hoisted(()=>({session:vi.fn(),sign:vi.fn()}))
vi.mock('@/lib/supabase',()=>({supabase:{auth:{getSession:mocks.session},storage:{from:()=>({createSignedUrl:mocks.sign})}}}))
import {avatarUrl,clearAvatarUrls} from './avatars'
const path='11111111-1111-4111-8111-111111111111/avatars/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/avatar.webp'
beforeEach(()=>{clearAvatarUrls();vi.resetAllMocks();mocks.session.mockResolvedValue({data:{session:{user:{id:'owner'}}}});mocks.sign.mockImplementation(async()=>({data:{signedUrl:'https://storage.test/portrait?token='+mocks.sign.mock.calls.length},error:null}))})
afterEach(()=>vi.useRealTimers())
it('shares concurrent signing across profile, navigation and preset thumbnails',async()=>{
 const urls=await Promise.all(Array.from({length:15},()=>avatarUrl(path)))
 expect(new Set(urls).size).toBe(1);expect(mocks.sign).toHaveBeenCalledTimes(1)
 expect(await avatarUrl(path)).toBe(urls[0]);expect(mocks.sign).toHaveBeenCalledTimes(1)
})
it('refreshes before expiry and can force a retry for an expired or broken URL',async()=>{
 vi.useFakeTimers();const first=await avatarUrl(path);vi.advanceTimersByTime(41*60*1000);expect(await avatarUrl(path)).not.toBe(first)
 await avatarUrl(path,true);expect(mocks.sign).toHaveBeenCalledTimes(3)
})
it('does not share signed URLs with another account or after sign-out',async()=>{
 await avatarUrl(path);mocks.session.mockResolvedValue({data:{session:{user:{id:'another-owner'}}}});await avatarUrl(path);expect(mocks.sign).toHaveBeenCalledTimes(2)
 clearAvatarUrls();await avatarUrl(path);expect(mocks.sign).toHaveBeenCalledTimes(3)
 mocks.session.mockResolvedValue({data:{session:null}});await expect(avatarUrl(path)).rejects.toThrow('sign in')
})
it('rejects external references and does not cache failed signing responses',async()=>{
 await expect(avatarUrl('https://evil.test/photo')).rejects.toThrow('Invalid photo')
 mocks.sign.mockResolvedValueOnce({data:null,error:new Error('private diagnostic')});await expect(avatarUrl(path)).rejects.toThrow('temporarily unavailable')
 await expect(avatarUrl(path)).resolves.toContain('storage.test');expect(mocks.sign).toHaveBeenCalledTimes(2)
})
