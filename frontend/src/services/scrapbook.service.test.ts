import { describe,it,expect,vi } from 'vitest'
import { journalLayout } from './scrapbook.service'
import { fetchPlacements } from './sticker.service'
import { emptyLayout } from '@/types/scrapbook'
vi.mock('./sticker.service',()=>({fetchPlacements:vi.fn()}))
describe('Legacy scrapbook loading',()=>{
  it('converts top-left anchors to centers without rewriting legacy rows',async()=>{
    vi.mocked(fetchPlacements).mockResolvedValue([{id:'old',journal_entry_id:'entry',sticker_asset_id:'builtin-flower-01.svg',x:.2,y:.3,width:.2,rotation:-5,z_index:2,created_at:'',asset_aspect_ratio:2}])
    const result=await journalLayout('entry')
    expect(result.pages[0].elements[0]).toMatchObject({width:.2,aspectRatio:2,rotation:-5})
    expect(result.pages[0].elements[0].x).toBeCloseTo(.3)
    expect(result.pages[0].elements[0].y).toBeCloseTo(.3375)
  })
  it('never falls back to an empty layout when the legacy load fails',async()=>{
    vi.mocked(fetchPlacements).mockRejectedValueOnce(new Error('missing table'))
    await expect(journalLayout('entry')).rejects.toThrow('missing table')
  })
  it('uses the saved shared layout without loading old rows again',async()=>{
    const saved=emptyLayout();vi.mocked(fetchPlacements).mockClear()
    expect(await journalLayout('entry',saved)).toBe(saved)
    expect(fetchPlacements).not.toHaveBeenCalled()
  })
})
