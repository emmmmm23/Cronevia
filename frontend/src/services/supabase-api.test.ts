// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), storage: vi.fn(), rpc: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getUser: mocks.getUser }, from: mocks.from, rpc:mocks.rpc, storage: {from:mocks.storage} } }))
import api, { preparePayload } from './supabase-api'
import { deleteAsset, savePlacements } from './sticker.service'
beforeEach(() => vi.clearAllMocks())
describe('Supabase data boundary', () => {
  it('persists complete pins and clears text-only destinations', () => {
    const pin = {destination:'Manila',destination_latitude:14.6,destination_longitude:120.98,destination_source:'search'}
    expect(preparePayload('trips',pin)).toEqual(pin)
    expect(preparePayload('trips',{destination:'Somewhere'})).toEqual({destination:'Somewhere',destination_latitude:null,destination_longitude:null,destination_source:null})
    for(const invalid of [{destination_latitude:14}, {...pin,destination_longitude:181}, {...pin,destination_latitude:NaN}, {...pin,destination_source:'other'}, {...pin,destination_longitude:null}]) expect(()=>preparePayload('trips',invalid)).toThrow()
    expect(preparePayload('trips',{title:'Unrelated edit'})).toEqual({title:'Unrelated edit'})
  })
  it('rejects unauthenticated writes before any database call', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
    await expect(api.post('/journal', { title: 'Private', content: 'Entry' })).rejects.toMatchObject({ response: { status: 401 } })
    expect(mocks.from).not.toHaveBeenCalled()
  })
  it('does not accept caller ownership or server timestamps', () => {
    expect(preparePayload('journal_entries', { id: 'forged', user_id: 'another-user', created_at: '1999-01-01', deleted_at: '2000-01-01', title: 'My entry', mood_label: 'Happy', tags: ['travel'] })).toEqual({ title: 'My entry', mood_name: 'Happy', tags: ['travel'] })
  })
  it('turns network failures into visible service errors', async () => {
    mocks.getUser.mockRejectedValue(new Error('Connection unavailable'))
    await expect(api.get('/trips')).rejects.toMatchObject({ response: { status: 503, data: { message: 'Connection unavailable' } } })
  })
})

describe('Reusable scrapbook asset deletion',()=> {
  function result(data: unknown,error: unknown=null) {
    const query: any={}
    for(const method of ['select','eq','single','limit','delete']) query[method]=()=>query
    query.then=(resolve: (value:unknown)=>unknown)=>Promise.resolve({data,error}).then(resolve)
    return query
  }
  it('keeps the photo object when a saved layout blocks media deletion',async()=>{
    mocks.getUser.mockResolvedValue({data:{user:{id:'owner'}},error:null})
    mocks.from.mockReturnValueOnce(result({id:'entry'})).mockReturnValueOnce(result({id:'photo',storage_path:'owner/photo.png'})).mockReturnValueOnce(result(null,{message:'Remove saved scrapbook placements before deleting this asset'}))
    await expect(api.delete('/journal/entry/media/photo')).rejects.toThrow('Remove saved scrapbook placements')
    expect(mocks.storage).not.toHaveBeenCalled()
  })
  it('keeps the custom sticker object when a saved layout blocks asset deletion',async()=>{
    mocks.getUser.mockResolvedValue({data:{user:{id:'owner'}},error:null})
    mocks.from.mockReturnValueOnce(result({id:'sticker',storage_path:'owner/sticker.png'})).mockReturnValueOnce(result([])).mockReturnValueOnce(result(null,{message:'Remove saved scrapbook placements before deleting this asset'}))
    await expect(deleteAsset('sticker')).rejects.toThrow('Remove saved scrapbook placements')
    expect(mocks.storage).not.toHaveBeenCalled()
  })
})

describe('Atomic placement replacement',()=>{
  it('sends one RPC and never performs a client delete before insert',async()=>{
    mocks.getUser.mockResolvedValue({data:{user:{id:'owner'}},error:null})
    mocks.rpc.mockResolvedValue({data:null,error:null})
    await savePlacements('entry',[])
    expect(mocks.rpc).toHaveBeenCalledOnce()
    expect(mocks.rpc).toHaveBeenCalledWith('replace_journal_stickers',{target_entry_id:'entry',placements:[]})
    expect(mocks.from).not.toHaveBeenCalled()
  })
  it('propagates a rejected transaction so the draft can retry',async()=>{
    mocks.getUser.mockResolvedValue({data:{user:{id:'owner'}},error:null})
    mocks.rpc.mockResolvedValue({data:null,error:{message:'Transaction rejected'}})
    await expect(savePlacements('entry',[])).rejects.toThrow('Transaction rejected')
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
