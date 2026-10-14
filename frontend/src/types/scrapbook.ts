export type PhotoFrame = 'plain' | 'polaroid' | 'paper' | 'washi'
export interface ScrapbookElement {
  id: string
  type: 'sticker' | 'photo'
  assetId: string
  x: number
  y: number
  width: number
  aspectRatio: number
  rotation: number
  zIndex: number
  frame: PhotoFrame
}
export interface ScrapbookLayout {
  version: 1
  pages: { id: string; elements: ScrapbookElement[] }[]
}
export const emptyLayout = (): ScrapbookLayout => ({ version: 1, pages: [
  { id: 'page-left', elements: [] }, { id: 'page-right', elements: [] },
] })
export function validateScrapbook(layout: ScrapbookLayout) {
  if (layout.version !== 1 || !Array.isArray(layout.pages) || layout.pages.length !== 2) throw new Error('Invalid notebook pages.')
  const ids = new Set<string>()
  layout.pages.forEach((page, index) => {
    if (page.id !== ['page-left', 'page-right'][index] || !Array.isArray(page.elements) || page.elements.length > 100) throw new Error('Invalid notebook page.')
    for (const e of page.elements) {
      if (!e.id || ids.has(e.id) || !['sticker', 'photo'].includes(e.type) || !e.assetId || /^(blob:|https?:|pending:|data:)/.test(e.assetId)) throw new Error('An element is invalid or still uploading.')
      ids.add(e.id)
      if (![e.x,e.y,e.width,e.aspectRatio,e.rotation,e.zIndex].every(Number.isFinite) || e.x < 0 || e.x > 1 || e.y < 0 || e.y > 1 || e.width < .06 || e.width > .8 || e.aspectRatio < .1 || e.aspectRatio > 10 || Math.abs(e.rotation) > 180 || !Number.isInteger(e.zIndex) || Math.abs(e.zIndex) > 10000 || !['plain','polaroid','paper','washi'].includes(e.frame)) throw new Error('Invalid element geometry.')
    }
  })
  return layout
}
// Coordinates describe the element centre on a 600 × 800 sheet. Keep rotated corners on paper.
export function constrainElement(e: ScrapbookElement): ScrapbookElement {
  const angle = e.rotation * Math.PI / 180
  const w = Math.max(.06, Math.min(.8, e.width))
  const h = w / e.aspectRatio * .75
  const rx = (Math.abs(Math.cos(angle)) * w + Math.abs(Math.sin(angle)) * h / .75) / 2
  const ry = (Math.abs(Math.sin(angle)) * w * .75 + Math.abs(Math.cos(angle)) * h) / 2
  const shrink = Math.min(1, .48 / rx, .48 / ry)
  return { ...e, width: w * shrink, x: Math.max(rx * shrink, Math.min(1 - rx * shrink, e.x)), y: Math.max(ry * shrink, Math.min(1 - ry * shrink, e.y)) }
}
