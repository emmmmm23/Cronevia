import { emptyLayout, constrainElement, validateScrapbook, type ScrapbookLayout } from '@/types/scrapbook'
import { fetchPlacements } from './sticker.service'

/** Read legacy placements without deleting or rewriting them. Conversion persists only on Save. */
export async function journalLayout(id: string, saved?: ScrapbookLayout | null): Promise<ScrapbookLayout> {
  if (saved) return validateScrapbook(saved)
  const layout = emptyLayout()
  const placements = await fetchPlacements(id)
  layout.pages[0].elements = placements.map(p => constrainElement({ id:p.id,type:'sticker',assetId:p.sticker_asset_id,x:p.x+p.width/2,y:p.y+p.width/(p.asset_aspect_ratio || 1)*.75/2,width:p.width,rotation:((p.rotation+540)%360)-180,zIndex:p.z_index,aspectRatio:p.asset_aspect_ratio || 1,frame:'plain' }))
  return layout
}
