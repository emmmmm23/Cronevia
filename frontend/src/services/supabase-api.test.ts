// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), storage: vi.fn(), rpc: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getUser: mocks.getUser }, from: mocks.from, rpc:mocks.rpc, storage: {from:mocks.storage} } }))
import api, { preparePayload } from './supabase-api'
import { deleteAsset, savePlacements } from './sticker.service'
beforeEach(() => vi.clearAllMocks())
describe('Supabase data boundary', () => {
  it('returns a confirmed trip ID without an optional media lookup',async()=>{
    mocks.getUser.mockResolvedValue({data:{user:{id:'owner'}},error:null})
    mocks.rpc.mockResolvedValue({data:{id:'stable-id',title:'Name only',user_id:'owner'},error:null,status:200})
    mocks.from.mockImplementation(()=>{throw new Error('Media unavailable')})
    const result=await api.post('/trips',{title:'Name only',draft_key:'stable-id'})
    expect(result.data).toEqual({data:{id:'stable-id',title:'Name only',user_id:'owner'}})
    expect(mocks.rpc).toHaveBeenCalledWith('create_trip_draft',expect.objectContaining({draft_id:'stable-id',details:expect.objectContaining({title:'Name only'})}))
    expect(mocks.from).not.toHaveBeenCalled()
  })
  it('preserves the failing HTTP status and database code',async()=>{
    mocks.getUser.mockResolvedValue({data:{user:{id:'owner'}},error:null})
    mocks.rpc.mockResolvedValue({data:null,error:{message:'Could not find create_trip_draft in the schema cache',code:'PGRST202'},status:404})
    await expect(api.post('/trips',{title:'Name only',draft_key:'stable-id'})).rejects.toMatchObject({status:404,code:'PGRST202',response:{status:404}})
  })
  it('does not mistake an auth-service outage for an expired session',async()=>{
    mocks.getUser.mockResolvedValue({data:{user:null},error:{status:503,message:'Unavailable'}})
    await expect(api.get('/trips')).rejects.toMatchObject({response:{status:503}})
    expect(mocks.from).not.toHaveBeenCalled()
  })
  it('classifies rejected credentials as requiring sign-in',async()=>{
    mocks.getUser.mockResolvedValue({data:{user:null},error:{status:401,code:'bad_jwt',message:'JWT invalid'}})
    await expect(api.post('/trips',{title:'Name only'})).rejects.toMatchObject({status:401,code:'bad_jwt'})
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
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
    mocks.rpc.mockResolvedValue({data:true,error:null,status:200})
    mocks.from.mockReturnValueOnce(result({id:'entry',user_id:'owner'})).mockReturnValueOnce(result({id:'photo',storage_path:'owner/photo.png'})).mockReturnValueOnce(result(null,{message:'Remove saved scrapbook placements before deleting this asset'}))
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
